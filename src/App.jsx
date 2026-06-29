import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8080/api";

export default function App() {
  const [alphaInput, setAlphaInput] = useState("");
  const [randomize, setRandomize] = useState(false);
  
  // Server State
  const [status, setStatus] = useState({ isRunning: false, isHalting: false, activeWorkersCount: 0, remainingAlphasCount: 0, resultsCount: 0 });
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState([]);

  // Polling loop
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

  const handleStartQueue = async () => {
    let alphas = alphaInput.split("\n").map(a => a.trim()).filter(a => a.length > 0);
    
    if (randomize) {
      for (let i = alphas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [alphas[i], alphas[j]] = [alphas[j], alphas[i]];
      }
    }

    if (alphas.length === 0) return alert("No alphas to submit.");

    await fetch(`${API_BASE}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alphas })
    });
    
    setAlphaInput("");
  };

  const handleHaltQueue = async () => {
    await fetch(`${API_BASE}/halt`, { method: "POST" });
  };

  const handleAppendToQueue = () => {
    alert("Append endpoint not yet implemented on the server.");
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#f3f4f6", minHeight: "100vh", padding: "20px", color: "#1f2937", boxSizing: "border-box" }}>
      
      {/* Header */}
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>AlphaCannon Dashboard</h1>
        <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>Multi-Account Simulation Engine</p>
      </header>
      {/* Controls Card */}
      <div style={{ background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        
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
          disabled={status.isRunning && !status.isHalting}
          style={{ width: "100%", height: "160px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "12px", fontSize: "13px", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
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

      {/* Logs Card */}
      <div style={{ 
          height: "300px", 
          backgroundColor: "#111827", 
          color: "#a7f3d0", 
          borderRadius: "6px", 
          padding: "12px", 
          overflowY: "auto", 
          fontFamily: "monospace", 
          fontSize: "12px", 
          display: "flex", 
          flexDirection: "column", // Changed from column-reverse
          lineHeight: "1.4" 
      }}>
        {logs.length === 0 ? (
          <span style={{ color: "#6b7280" }}>Awaiting engine initialization...</span>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>

      {/* Results Card */}
      <div style={{ background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", flex: 1, minHeight: "300px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", color: "#374151" }}>Compiled Results</h3>
          <span style={{ fontSize: "12px", background: "#e5e7eb", padding: "2px 8px", borderRadius: "12px", fontWeight: "600", color: "#4b5563" }}>
            Count: {status.resultsCount}
          </span>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px 8px", color: "#6b7280", fontWeight: "600" }}>Alpha Code</th>
                <th style={{ padding: "10px 8px", color: "#6b7280", fontWeight: "600" }}>Sharpe</th>
                <th style={{ padding: "10px 8px", color: "#6b7280", fontWeight: "600" }}>Fitness</th>
                <th style={{ padding: "10px 8px", color: "#6b7280", fontWeight: "600" }}>Score Diff</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>No results compiled yet.</td>
                </tr>
              ) : (
                results.map((res, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 8px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", color: "#111827" }}>{res.code}</td>
                    <td style={{ padding: "10px 8px", color: "#4b5563" }}>{res?.is?.sharpe ?? "N/A"}</td>
                    <td style={{ padding: "10px 8px", color: "#4b5563" }}>{res?.is?.fitness ?? "N/A"}</td>
                    <td style={{ padding: "10px 8px", fontWeight: "600", color: res.scoreDiff > 0 ? "#059669" : res.scoreDiff < 0 ? "#dc2626" : "#4b5563" }}>
                      {res.scoreDiff}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
