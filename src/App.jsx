import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Paper,
  Container,
} from "@mui/material";
import SimulationSettings from "./SimulationSettings";
import AlphaTable from "./AlphaTable";
import QueueTable from "./QueueTable";
import { api_address } from "../passwords";

const API_BASE = `http://${api_address}/api`;

const DEFAULT_SETTINGS = {
  region: "USA",
  pasteurization: "ON",
  nanHandling: "ON",
  universe: "TOP3000",
  neutralization: "INDUSTRY",
  decay: 0,
  truncation: 0.08,
  delay: 1,
};

export default function App() {
  const [alphaInput, setAlphaInput] = useState("");
  const [randomize, setRandomize] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [status, setStatus] = useState({
    isRunning: false,
    isHalting: false,
    activeWorkersCount: 0,
    remainingAlphasCount: 0,
    results: [],
    alphas: [],
    logs: [],
    activeWorkers: [],
    currentAlpha: 0
  });

  useEffect(() => {
    const fetchServerState = async () => {
      try {
        const statusRes = await fetch(`${API_BASE}/status`, { method: "POST" });
        if (statusRes.ok) setStatus(await statusRes.json());
      } catch (err) {
        console.error("Failed to connect to backend engine:", err);
      }
    };

    fetchServerState();
    const interval = setInterval(fetchServerState, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const preparePayload = () => {
    let alphas = alphaInput
      .split("\n")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    
    if (randomize) {
      for (let i = alphas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [alphas[i], alphas[j]] = [alphas[j], alphas[i]];
      }
    }
    return alphas.map((alphaCode) => ({
      alphaCode,
      settings: { ...settings },
    }));
  };

  const handleStartQueue = async () => {
    const payload = preparePayload();
    if (payload.length === 0) return alert("No alphas to submit.");
    await fetch(`${API_BASE}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alphas: payload }),
    });
    setAlphaInput("");
  };

  const handleClearQueue = async () => {
    await fetch(`${API_BASE}/clearQueue`, { method: "POST" });
  }

  const handleHaltQueue = async () => {
    await fetch(`${API_BASE}/halt`, { method: "POST" });
  };

  const handleAppendToQueue = async () => {
    const payload = preparePayload();
    if (payload.length === 0) return alert("No alphas to append.");
    await fetch(`${API_BASE}/appendQueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alphas: payload }),
    });
    setAlphaInput("");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "text.primary" }}
          >
            AlphaCannon Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Multi-Account Simulation Engine
          </Typography>
        </Box>

        {/* Controls Panel */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <SimulationSettings
            settings={settings}
            onSettingChange={handleSettingChange}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Alpha Input Queue
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={randomize}
                  onChange={(e) => setRandomize(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Randomize execution order
                </Typography>
              }
            />
          </Box>

          <TextField
            multiline
            rows={6}
            fullWidth
            value={alphaInput}
            onChange={(e) => setAlphaInput(e.target.value)}
            placeholder="Paste alpha formulas here (one per line)..."
            sx={{ mb: 2, fontFamily: "monospace", bgcolor: "background.paper" }}
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            {status.isRunning ? (
              <Button
                variant="contained"
                color={status.isHalting ? "warning" : "error"}
                disabled={status.isHalting}
                onClick={handleHaltQueue}
                sx={{ flex: 2, fontWeight: "bold" }}
              >
                {status.isHalting ? "Draining Queue..." : "Halt Queue"}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartQueue}
                sx={{ flex: 2, fontWeight: "bold" }}
              >
                Start Execution
              </Button>
            )}
            <Button
              variant="contained"
              color="warning"
              onClick={handleClearQueue}
              sx={{ flex: 1, fontWeight: "bold" }}
            >
              Clear queue
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleAppendToQueue}
              sx={{ flex: 1, fontWeight: "bold" }}
            >
              Append to Queue
            </Button>
          </Box>
        </Paper>

        {/* Middle Section: Side-by-side Logs and Execution Queue */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3, mb: 3 }}>
          
          {/* Logs Panel */}
          <Paper
            sx={{
              flex: { xs: "1 1 auto", lg: "1 1 48%" },
              height: 410, // Fix height on mobile, stretch to match queue on desktop
              bgcolor: "grey.900",
              color: "success.light",
              p: 2,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {status.logs.length === 0 ? (
              <Typography variant="caption" sx={{ color: "grey.500", mt: 1 }}>
                Awaiting engine initialization...
              </Typography>
            ) : (
              status.logs.map((log, i) => <div key={i} style={{ marginBottom: '4px' }}>{log}</div>)
            )}
          </Paper>

          {/* Queue Sliding Window Table (75% width on large screens) */}
          <Box sx={{ flex: { xs: "1 1 auto", lg: "1 1 52%" }, minWidth: 0 }}>
            <QueueTable 
              alphas={status.alphas || []} 
              currentAlpha={status.currentAlpha || 0} 
              activeWorkers={status.activeWorkers || []} 
            />
          </Box>
        </Box>

        {/* Bottom Section: Results Table Component */}
        <Box>
          <AlphaTable alphas={status.results} />
        </Box>
        
      </Container>
    </Box>
  );
}
