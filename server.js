import express from 'express';
import cors from 'cors';
import { andris, mate, bence, levi } from "./passwords.js"; 

const app = express();
app.use(cors());
app.use(express.json());

const WAITING_FOR_SUBMISSION = "WAITING_FOR_SUBMISSION";
const RUNNING = "RUNNING";
const WAITING_FOR_RESULTS= "WAITING_FOR_RESULTS";
const WAITING_FOR_SCOREDIFF = "WAITING_FOR_SCOREDIFF";
const COMPLETED = "COMPLETED";
const ERROR = "ERROR";

let isRunning = false;
let isHalting = false;
let alphaList = [];
let alphaIdx = 0;

let users = [
  { id: "andris", email: "vandras2003@gmail.com", password: andris },
  { id: "mate", email: "kepes.mate.robert@gmail.com", password: mate},
  { id: "bence", email: "kaltenecker.bence04@gmail.com", password: bence},
  { id: "levi", email: "lraikovich@gmail.com", password: levi },
];

let results = [];
let serverLog = [];
let activeWorkers = [];
let globalApiQueue = Promise.resolve();

const sessionStore = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); 

const addLog = (message) => {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;
  
  console.log(logEntry); 
  serverLog.push(logEntry); 
  
  if (serverLog.length > 1000) {
    serverLog.shift();
  }
};

// 1. Endpoints
app.post('/api/start', (req, res) => {
  const { alphas } = req.body;
  
  // Expects frontend to send [{ alphaCode: "...", settings: {...} }]
  alphaList = alphas;
  
  alphaIdx = 0;
  isRunning = true;
  addLog(`[Engine] Starting execution queue with ${alphaList.length} alphas.`);
  engineTick(); 
  res.status(200).json({ success: true });
});

app.post('/api/appendQueue', (req, res) => {
  const { alphas } = req.body;
  
  alphaList.push(...alphas);
  
  res.status(200).json({ success: true });
});

app.post('/api/halt', (req, res) => {
  if (!isRunning) {
    return res.status(200).json({ success: true, message: "Engine is not running." });
  }
  isHalting = true;
  addLog("[Engine] Halt requested. Draining active workers...");
  res.status(200).json({ success: true, message: "Halting initiated. Finishing active tasks." });
});

app.post('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    isRunning: isRunning,
    isHalting: isHalting,
    activeWorkersCount: activeWorkers.length,
    remainingAlphasCount: alphaList.length - alphaIdx,
    resultsCount: results.length
  });
});

app.post('/api/getRemainingAlphas', (req, res) => {
  const remaining = alphaList.slice(alphaIdx).map(a => a.alphaCode);
  res.status(200).json({ 
    success: true, 
    count: remaining.length, 
    remainingAlphas: remaining 
  });
});

app.post('/api/getResults', (req, res) => {
  res.status(200).json({ success: true, results });
});

app.post('/api/getLogs', (req, res) => {
  res.status(200).json({ success: true, logs: serverLog });
});

const wqAuth = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.email || !user.password) {
        addLog(`[Auth Error] Missing credentials in memory for user ${userId}`);
        return false;
    }

    const token = btoa(unescape(encodeURIComponent(`${user.email.trim()}:${user.password}`)));

    try {
        const wqRes = await fetch('https://api.worldquantbrain.com/authentication', {
            method: 'POST',
            headers: { 
                'Authorization': `Basic ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({})
        });

        if (wqRes.status !== 201) {
            addLog(`[Auth Error] Request failed for ${userId} with status ${wqRes.status}`);
            return false;
        }

        const cookies = wqRes.headers.getSetCookie();
        if (cookies && cookies.length > 0) {
            sessionStore.set(userId, cookies[0]);
            addLog(`[Auth] Successfully authenticated ${userId}`);
            return true;
        } else {
            addLog(`[Auth Error] No cookies returned for ${userId}`);
            return false;
        }
    } catch (err) {
        addLog(`[Auth Error] Network exception for ${userId}: ${err.message}`);
        return false;
    }
};

const executeWqQuery = async ({ cookie, method, path, payload }) => {
    const options = {
        method,
        headers: { 'Cookie': cookie }
    };

    if (payload) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(payload);
    }

    const wqRes = await fetch(`https://api.worldquantbrain.com${path}`, options);
    const exposedHeaders = {};
    if (wqRes.headers.has('Location')) {
        exposedHeaders.Location = wqRes.headers.get('Location');
    }

    const text = await wqRes.text();
    
    if (wqRes.status >= 400) {
        addLog(`[API Response] HTTP ${wqRes.status} on ${path}. Body: ${text.substring(0, 150)}`);
    }

    let data = text;
    try { data = JSON.parse(text); } catch (e) { /* leave as text */ }

    return {
        status: wqRes.status,
        headers: exposedHeaders,
        data: data
    };
};

const wqQuery = (params) => {
    return new Promise((resolve, reject) => {
        globalApiQueue = globalApiQueue.then(async () => {
            await sleep(2000);
            try {
                const res = await executeWqQuery(params);
                resolve(res);
            } catch (err) {
                addLog(`[Queue Error] Request failed entirely: ${err.message}`);
                reject(err);
            }
        });
    });
};

const handleResponseErrors = (workerState, status) => {
  if (status === 202) {
    return;
  } else if (status === 429) {
    addLog(`[Rate Limit] User ${workerState.userId} hit 429.`);
  } else if (status === 401 || status === 403) {
    sessionStore.delete(workerState.userId);
    addLog(`[Auth issue] User ${workerState.userId} hit ${status}. Session deleted.`);
  } else {
    addLog(`[Worker Error] User ${workerState.userId} failed on alpha: ${workerState.alphaCode} - Status ${status}`);
    workerState.status = ERROR;
  }
};

const submitAlpha = async (workerState, cookie) => {
  addLog(`[${workerState.userId}] Submitting alpha: ${workerState.alphaCode}`);

  const simRes = await wqQuery({
    cookie,
    method: "POST",
    path: "/simulations",
    payload: {
      type: "REGULAR",
      settings: { 
          ...workerState.settings, // Injects the specific settings for this alpha
          language: "FASTEXPR", 
          unitHandling: "VERIFY", 
          visualization: false, 
          instrumentType: "EQUITY" 
      },
      regular: workerState.alphaCode, 
    }
  });

  if (simRes.status === 201) {
    const locationHeader = simRes.headers.Location;
    workerState.simId = locationHeader.split("/").pop();
    workerState.status = RUNNING; 
  } else {
    handleResponseErrors(workerState, simRes.status);
  }
};

const queryAlphaStatus = async (workerState, cookie) => {
  const { userId, simId } = workerState;
  if (!workerState.counter) {
    workerState.counter = 0;
  }

  const pollRes = await wqQuery({
    cookie,
    method: "GET",
    path: `/simulations/${simId}`
  });

  if (pollRes.status === 200) {
    const pollData = pollRes.data; 
    
    if (pollData.alpha) {
      workerState.alphaLink = pollData.alpha;
      workerState.status = WAITING_FOR_RESULTS; 
      addLog(`[${userId}] ID ${simId} Processing completed, waiting for results.`);
    } else if (pollData.status === "ERROR" || pollData.error) {
      addLog(`[${userId}] ID ${simId} Alpha computation returned an internal ERROR state.`);
      workerState.status = ERROR;
    } else {
      (workerState.counter %5 === 0) && addLog(`[${userId}] ID ${simId} Progress: ${Math.round((pollData.progress || 0) * 100)}%`);
      workerState.counter++;
    }
  } else {
    handleResponseErrors(workerState, pollRes.status);
  }
};

const getAlphaResults = async (workerState, cookie) => {
  const { alphaLink } = workerState;
  
  const alphaRes = await wqQuery({
    cookie,
    method: "GET",
    path: `/alphas/${alphaLink}`
  });

  if (alphaRes.status === 200) {
    const alphaData = alphaRes.data;
    const currentSharpe = alphaData.is?.sharpe;
    const currentFitness = alphaData.is?.fitness;

    if (false && currentSharpe !== undefined && (Math.abs(currentSharpe) >= 0.9 || Math.abs(currentFitness) >= 0.9)) {
      workerState.alphaData = alphaData;
      workerState.status = WAITING_FOR_SCOREDIFF;
    } else {
      results.push({ ...alphaData, code: workerState.alphaCode, scoreDiff: "N/A" });
      workerState.status = COMPLETED;
      addLog(`[${workerState.userId}] Alpha compiled. Sharpe: ${currentSharpe || "N/A"}`);
    }
  } else {
    handleResponseErrors(workerState, alphaRes.status);
  }
};

const getAlphaScoreDiff = async (workerState, cookie) => {
  const { alphaLink } = workerState;
  
  const perfRes = await wqQuery({
    cookie,
    method: "GET",
    path: `/competitions/IQC2026S2/alphas/${alphaLink}/before-and-after-performance`
  });

  if (perfRes.status === 200) {
    const perfData = perfRes.data;

    if (perfData && typeof perfData === 'object' && perfData.score) {
      const scoreDiff = perfData.score.after - perfData.score.before;
      results.push({ 
        ...workerState.alphaData,
        scoreDiff,
        code: workerState.alphaCode, 
      });
      workerState.status = COMPLETED;
    }
  } else {
    handleResponseErrors(workerState, perfRes.status);
  }
};

const advanceWorkerState = async (workerState) => {
    const cookie = sessionStore.get(workerState.userId);
    if (!cookie) {
      addLog(`[State] Missing cookie for ${workerState.userId}. Triggering wqAuth...`);
      
      const authSuccess = await wqAuth(workerState.userId);
      if (!authSuccess) {
          workerState.status = ERROR; 
      }
      return; 
    }
    
    try {
        switch (workerState.status) {
            case WAITING_FOR_SUBMISSION:
                await submitAlpha(workerState, cookie);
                break;
            case RUNNING:
                await queryAlphaStatus(workerState, cookie);
                break;
            case WAITING_FOR_RESULTS:
                await getAlphaResults(workerState, cookie);
                break;
            case WAITING_FOR_SCOREDIFF:
                await getAlphaScoreDiff(workerState, cookie);
                break;
        }
    } catch (err) {
        addLog(`[Network Error] Worker ${workerState.userId} encountered a connection error: ${err.message}`);
    }
};

const engineTick = async () => {
    while (isRunning) {
        try { 
            // 1. Clean up finished workers
            activeWorkers = activeWorkers.filter(w => w.status !== "COMPLETED" && w.status !== "ERROR");

            // 2. Fill empty slots ONLY if we are not halting
            if (!isHalting) {
                users.forEach(user => {
                    const userWorkers = activeWorkers.filter(w => w.userId === user.id);
                    
                    while (userWorkers.length < 3 && alphaIdx < alphaList.length) {
                        const newAlpha = alphaList[alphaIdx++];
                        
                        const newWorkerState = {
                            userId: user.id,
                            alphaCode: newAlpha.alphaCode,
                            settings: newAlpha.settings, // Store the settings config with the worker
                            status: WAITING_FOR_SUBMISSION
                        };
                        
                        activeWorkers.push(newWorkerState);
                        userWorkers.push(newWorkerState);
                    }
                });
            }

            // 3. Advance state
            for (let worker of activeWorkers) {
                await advanceWorkerState(worker);
            }
            
            if (activeWorkers.length === 0) await sleep(2000); 

            // 4. Halt Condition
            if (activeWorkers.length === 0 && (alphaIdx >= alphaList.length || isHalting)) {
                isRunning = false;
                isHalting = false; 
                addLog("[Engine] All tasks drained. Engine fully halted.");
            }
        } catch (fatalError) {
            addLog(`[Fatal Error] Engine tick loop crashed: ${fatalError.message}`);
            isRunning = false;
        }
    }
};

const PORT = 8080;
app.listen(PORT, () => console.log(`[Engine] Headless Client running on http://localhost:${PORT}`));
