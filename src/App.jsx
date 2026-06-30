import React, { useState, useEffect, useMemo } from "react";
import fieldsData from './wq_fields.json';
import { api_address } from "../passwords";

const API_BASE = `http://${api_address}/api`;

const DEFAULT_SETTINGS = {
  region: "USA",
  universe: "TOP3000",
  decay: 0,
  neutralization: "INDUSTRY",
  truncation: 0.08,
  pasteurization: "ON",
  nanHandling: "ON",
  delay: 1,
};

const UNIVERSE_OPTIONS = ["TOP3000", "TOP2000", "TOP1000", "TOP500", "TOPSP500", "TOP200"];
const NEUTRALIZATION_OPTIONS = ["NONE", "MARKET", "SECTOR", "INDUSTRY", "SUBINDUSTRY"];

const thStyle = { padding: '10px 8px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 8px', verticalAlign: 'top', color: '#4b5563' };

export default function App() {
  const [alphaInput, setAlphaInput] = useState("");
  const [randomize, setRandomize] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  
  const [status, setStatus] = useState({ isRunning: false, isHalting: false, activeWorkersCount: 0, remainingAlphasCount: 0, resultsCount: 0 });
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchServerState = async () => {
      try {
        const [statusRes, logsRes, resultsRes] = await Promise.all([
          fetch(`${API_BASE}/status`, { method: "POST" }),
          fetch(`${API_BASE}/getLogs`, { method: "POST" }),
          fetch(`${API_BASE}/getResults`, { method: "POST" })
        ]);

        if (statusRes.ok) setStatus(await statusRes.json());
        if (logsRes.ok) setLogs((await logsRes.json()).logs);
        if (resultsRes.ok) setResults((await resultsRes.json()).results);
      } catch (err) {
        console.error("Failed to connect to backend engine:", err);
      }
    };

    fetchServerState();
    const interval = setInterval(fetchServerState, 2000);
    return () => clearInterval(interval);
  }, []);

  const fieldInfoMap = useMemo(() => {
    const map = new Map();
    if (!fieldsData) return map;
    fieldsData.forEach((item) => {
      if (item.Type !== 'GROUP') {
        map.set(item.Field, item.Alphas);
      }
    });
    return map;
  }, []);

  const extractFieldsFromCode = (code) => {
    if (!code) return [];
    const words = code.match(/[a-zA-Z_]\w*/g) || [];
    const matchedFields = words.filter((word) => fieldInfoMap.has(word));
    return [...new Set(matchedFields)];
  };

  const handleExport = () => {
    if (!results || results.length === 0) return alert("No results to export.");
    
    let maxFields = 0;
    const processedData = results.map((res) => {
      const code = res.code || res.regular?.code || '';
      const fields = extractFieldsFromCode(code);
      if (fields.length > maxFields) {
        maxFields = fields.length;
      }
      return { res, code, fields };
    });

    const baseHeaders = [
      'Universe', 'Delay', 'Decay', 'Neutralization', 'Truncation',
      'Sharpe', 'Fitness', 'Returns', 'Turnover', 'Score Diff', 'Code'
    ];
    
    const dynamicHeaders = [];
    for (let i = 1; i <= maxFields; i++) {
      dynamicHeaders.push(`Field ${i}`, `Count ${i}`);
    }
    
    const headers = [...baseHeaders, ...dynamicHeaders];
    const csvRows = [headers.join(',')];

    processedData.forEach(({ res, code, fields }) => {
      const escapedCode = `"${code.replace(/"/g, '""')}"`;

      const baseRow = [
        res.settings?.universe || '',
        res.settings?.delay ?? '',
        res.settings?.decay ?? '',
        res.settings?.neutralization || '',
        res.settings?.truncation ?? '',
        res.is?.sharpe ?? '',
        res.is?.fitness ?? '',
        res.is?.returns ?? '',
        res.is?.turnover ?? '',
        res.scoreDiff ?? '',
        escapedCode
      ];

      const dynamicCols = [];
      for (let i = 0; i < maxFields; i++) {
        if (i < fields.length) {
          const fieldName = fields[i];
          const count = fieldInfoMap.get(fieldName) ?? 0;
          dynamicCols.push(`"${fieldName}"`, count);
        } else {
          dynamicCols.push('', '');
        }
      }

      csvRows.push([...baseRow, ...dynamicCols].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'engine_results_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const preparePayload = () => {
    let alphas = alphaInput.split("\n").map(a => a.trim()).filter(a => a.length > 0);
    if (randomize) {
      for (let i = alphas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [alphas[i], alphas[j]] = [alphas[j], alphas[i]];
      }
    }
    return alphas.map(alphaCode => ({
      alphaCode,
      settings: { ...settings }
    }));
  };

  const handleStartQueue = async () => {
    const payload = preparePayload();
    if (payload.length === 0) return alert("No alphas to submit.");
    await fetch(`${API_BASE}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alphas: payload })
    });
    setAlphaInput("");
  };

  const handleHaltQueue = async () => {
    await fetch(`${API_BASE}/halt`, { method: "POST" });
  };

  const handleAppendToQueue = async () => {
    const payload = preparePayload();
    if (payload.length === 0) return alert("No alphas to append.");
    await fetch(`${API_BASE}/appendQueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alphas: payload })
    });
    setAlphaInput("");
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f3f4f6", minHeight: "100vh", padding: "20px", color: "#1f2937", boxSizing: "border-box" }}>
      
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>AlphaCannon Dashboard</h1>
        <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>Multi-Account Simulation Engine</p>
      </header>
      
      <div style={{ background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
        
        <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#374151" }}>Simulation Settings</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
            {Object.entries(settings).map(([key, val]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "capitalize" }}>{key}</label>
                
                {key === "region" ? (
                  <input
                    type="text"
                    value={val}
                    disabled
                    style={{ padding: "6px", fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "4px", backgroundColor: "#e5e7eb", color: "#6b7280", cursor: "not-allowed" }}
                  />
                ) : key === "universe" ? (
                  <select
                    value={val}
                    onChange={(e) => handleSettingChange(key, e.target.value)}
                    style={{ padding: "6px", fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "4px", backgroundColor: "white", cursor: "pointer" }}
                  >
                    {UNIVERSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : key === "neutralization" ? (
                  <select
                    value={val}
                    onChange={(e) => handleSettingChange(key, e.target.value)}
                    style={{ padding: "6px", fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "4px", backgroundColor: "white", cursor: "pointer" }}
                  >
                    {NEUTRALIZATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={typeof val === "number" ? "number" : "text"}
                    value={val}
                    step={typeof val === "number" ? "0.01" : undefined}
                    onChange={(e) => handleSettingChange(key, typeof val === "number" ? Number(e.target.value) : e.target.value)}
                    style={{ padding: "6px", fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "4px" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Alpha Input Queue</label>
          <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#4b5563" }}>
            <input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} />
            Randomize execution order
          </label>
        </div>

        <textarea 
          value={alphaInput}
          onChange={(e) => setAlphaInput(e.target.value)}
          placeholder="Paste alpha formulas here (one per line)..."
          style={{ width: "100%", height: "160px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "12px", fontSize: "13px", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s", backgroundColor: (status.isRunning && !status.isHalting) ? "#f3f4f6" : "white" }}
        />

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          {status.isRunning ? (
            <button 
              onClick={handleHaltQueue} 
              disabled={status.isHalting} 
              style={{ flex: 2, backgroundColor: status.isHalting ? "#f87171" : "#ef4444", color: "white", border: "none", borderRadius: "6px", padding: "12px", cursor: status.isHalting ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "14px", transition: "background-color 0.2s" }}
            >
              {status.isHalting ? "Draining Queue..." : "Halt Queue"}
            </button>
          ) : (
            <button 
              onClick={handleStartQueue} 
              style={{ flex: 2, backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", padding: "12px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "background-color 0.2s" }}
            >
              Start Execution
            </button>
          )}
          <button 
            onClick={handleAppendToQueue} 
            style={{ flex: 1, backgroundColor: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", padding: "12px", cursor: "pointer", fontWeight: "500", fontSize: "14px" }}
          >
            Append to Queue
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", flexDirection: "column" }}>
        <div style={{ 
            height: "200px", 
            backgroundColor: "#111827", 
            color: "#a7f3d0", 
            borderRadius: "6px", 
            padding: "12px", 
            overflowY: "auto", 
            fontFamily: "monospace", 
            fontSize: "12px", 
            display: "flex", 
            flexDirection: "column",
            lineHeight: "1.4" 
        }}>
          {logs.length === 0 ? (
            <span style={{ color: "#6b7280" }}>Awaiting engine initialization...</span>
          ) : (
            logs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>

        <div style={{ background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", flex: 1, minHeight: "300px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", color: "#374151" }}>Compiled Results</h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", background: "#e5e7eb", padding: "4px 10px", borderRadius: "12px", fontWeight: "600", color: "#4b5563" }}>
                Count: {status.resultsCount}
              </span>
              <button 
                onClick={handleExport}
                style={{ padding: "6px 12px", cursor: "pointer", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}
              >
                Export CSV
              </button>
            </div>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left", minWidth: "1200px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={thStyle}>Universe</th>
                  <th style={thStyle}>Delay</th>
                  <th style={thStyle}>Decay</th>
                  <th style={thStyle}>Neutralization</th>
                  <th style={thStyle}>Truncation</th>
                  <th style={thStyle}>Sharpe</th>
                  <th style={thStyle}>Fitness</th>
                  <th style={thStyle}>Returns</th>
                  <th style={thStyle}>Turnover</th>
                  <th style={thStyle}>Score Diff</th>
                  <th style={{ ...thStyle, width: '250px' }}>Code</th>
                  <th style={{ ...thStyle, width: '250px' }}>Fields (Usage Count)</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>No results compiled yet.</td>
                  </tr>
                ) : (
                  results.map((res, idx) => {
                    const code = res.code || res.regular?.code || '';
                    const matchedFields = extractFieldsFromCode(code);

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}>{res.settings?.universe}</td>
                        <td style={tdStyle}>{res.settings?.delay}</td>
                        <td style={tdStyle}>{res.settings?.decay}</td>
                        <td style={tdStyle}>{res.settings?.neutralization}</td>
                        <td style={tdStyle}>{res.settings?.truncation}</td>
                        <td style={tdStyle}>{res.is?.sharpe ?? "N/A"}</td>
                        <td style={tdStyle}>{res.is?.fitness ?? "N/A"}</td>
                        <td style={tdStyle}>{res.is?.returns ? (res.is.returns * 100).toFixed(2) + '%' : "N/A"}</td>
                        <td style={tdStyle}>{res.is?.turnover ? (res.is.turnover * 100).toFixed(2) + '%' : "N/A"}</td>
                        <td style={{ ...tdStyle, fontWeight: "600", color: res.scoreDiff > 0 ? "#059669" : res.scoreDiff < 0 ? "#dc2626" : "#4b5563" }}>
                          {res.scoreDiff ?? "N/A"}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "12px", color: "#111827" }}>
                          {code}
                        </td>
                        <td style={tdStyle}>
                          {matchedFields.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {matchedFields.map(field => (
                                <div key={field} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                  <span style={{ fontWeight: '500', marginRight: '8px' }}>{field}</span>
                                  <span style={{ backgroundColor: '#6b7280', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' }}>
                                    {fieldInfoMap.get(field) ?? 0}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>None detected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
