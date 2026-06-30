import React from 'react';
import { Box, Typography, Grid, TextField, MenuItem } from '@mui/material';

const UNIVERSE_OPTIONS = ["TOP3000", "TOP2000", "TOP1000", "TOP500", "TOPSP500", "TOP200"];
const NEUTRALIZATION_OPTIONS = ["NONE", "MARKET", "SECTOR", "INDUSTRY", "SUBINDUSTRY"];

export default function SimulationSettings({ settings, onSettingChange }) {
  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.primary', fontWeight: 600 }}>
        Simulation Settings
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(settings).map(([key, val]) => {
          const isNumber = typeof val === "number";
          
          if (key === "universe") {
            return (
              <Grid xs={12} sm={6} md={3} lg={2} key={key}>
                <TextField fullWidth select size="small" label={key} value={val} onChange={(e) => onSettingChange(key, e.target.value)} sx={{ textTransform: 'capitalize' }}>
                  {UNIVERSE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </TextField>
              </Grid>
            );
          }

          if (key === "neutralization") {
            return (
              <Grid xs={12} sm={6} md={3} lg={2} key={key}>
                <TextField fullWidth select size="small" label={key} value={val} onChange={(e) => onSettingChange(key, e.target.value)} sx={{ textTransform: 'capitalize', minWidth: 150 }}>
                  {NEUTRALIZATION_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </TextField>
              </Grid>
            );
          }
          
          if (key === "delay") {
            return (
              <Grid xs={12} sm={6} md={3} lg={2} key={key}>
                <TextField fullWidth select size="small" label={key} value={val} onChange={(e) => onSettingChange(key, e.target.value)} sx={{ textTransform: 'capitalize', width: 60}}>
                  {[0,1].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </TextField>
              </Grid>
            );
          }

          return (
            <Grid xs={12} sm={6} md={3} lg={2} key={key}>
              <TextField 
                fullWidth 
                size="small" 
                label={key} 
                type={isNumber ? "number" : "text"}
                slotProps={{
                  htmlInput: isNumber ? { step: key === "truncation" ? 0.01 : 1 } : {}
                }}
                value={val} 
                onChange={(e) => onSettingChange(key, isNumber ? Number(e.target.value) : e.target.value)} 
                sx={{ textTransform: 'capitalize', width: key === "decay" || key === "region" ? 70 : 110}} 
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
