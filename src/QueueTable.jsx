import React, { useState } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip,
  Collapse, IconButton
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Sub-component to manage the open/close state for each individual row
function QueueTableRow({ alpha, status, progress, type, getStatusColor }) {
  const [open, setOpen] = useState(false);
  
  const getRowBgColor = (type, status) => {
    if (type === 'completed') return '#f6fbf6'; // Very light green
    if (type === 'pending') return 'inherit';   // Default white
    if (status === 'ERROR') return '#fef2f2';   // Light red
    return '#f0f9ff';                           // Light blue for active processing
  };
  const bgColor = getRowBgColor(type, status);

  return (
    <>
      <TableRow 
        onClick={() => setOpen(!open)}
        sx={{ 
          backgroundColor: bgColor, 
          transition: 'background-color 0.3s',
          cursor: 'pointer',
          '& > *': { borderBottom: 'unset' }
        }}
      >
        <TableCell width="40px">
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation(); // Prevents double-toggling if they specifically click the icon
            setOpen(!open);
          }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Chip 
            label={status.replace(/_/g, ' ') + (status === "RUNNING" && progress ? ` ${progress * 100}%` : "")} 
            color={getStatusColor(status)} 
            size="small" 
            sx={{ fontSize: '0.65rem', height: 20, fontWeight: 600 }} 
          />
        </TableCell>
        <TableCell>{alpha.settings?.universe}</TableCell>
        <TableCell>{alpha.settings?.neutralization}</TableCell>
        <TableCell>{alpha.settings?.decay}</TableCell>
        <TableCell>{alpha.settings?.delay}</TableCell>
        <TableCell>{alpha.settings?.truncation}</TableCell>
      </TableRow>

      {/* Collapsible detail row containing the full code */}
      <TableRow sx={{ backgroundColor: bgColor, transition: 'background-color 0.3s' }}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 'none' }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'grey.300', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
              <Typography sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                {alpha.alphaCode}
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function QueueTable({ alphas = [], currentAlpha = 0, activeWorkers = [] }) {
  // Evaluates the exact state of a row based on your backend logic
  const getRowState = (alpha, index) => {
    // Check if the alpha is currently inside the active pool
    const activeWorker = activeWorkers.find(w => w.alphaCode === alpha.alphaCode);
    if (activeWorker) {
      return { status: activeWorker.status, type: 'active', progress: activeWorker?.progress };
    }
    // If it's behind the current engine pointer, it's done processing
    if (index < currentAlpha) {
      return { status: 'COMPLETED', type: 'completed' };
    }
    // Otherwise, it's waiting in the queue
    return { status: 'PENDING', type: 'pending' };
  };

  // Maps the text status to a Material-UI Chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'default';
      case 'ERROR': return 'error';
      case 'RUNNING': return 'info';
      case 'WAITING_FOR_SUBMISSION': return 'warning';
      case 'WAITING_FOR_RESULTS':
      case 'WAITING_FOR_SCOREDIFF': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', color: 'text.primary', fontWeight: 600 }}>
          Execution Queue
        </Typography>
        <Chip label={`Total Alphas: ${alphas.length}`} size="small" sx={{ fontWeight: 600 }} />
      </Box>

      <TableContainer sx={{ height: 350, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell width="40px" sx={{ bgcolor: 'grey.50' }} />
              {['Status', 'Universe', 'Neut', 'Decay', 'Delay', 'Trunc'].map(header => (
                <TableCell key={header} sx={{ fontWeight: 600, color: 'text.secondary', bgcolor: 'grey.50' }}>
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {alphas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                  Queue is empty.
                </TableCell>
              </TableRow>
            ) : (
              alphas.map((alpha, index) => {
                const { status, type, progress } = getRowState(alpha, index);
                
                return (
                  <QueueTableRow 
                    key={index}
                    alpha={alpha}
                    status={status}
                    progress={progress}
                    type={type}
                    getStatusColor={getStatusColor}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
