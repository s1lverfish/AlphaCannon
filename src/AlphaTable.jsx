import React, { useState, useMemo } from 'react';
import fieldsData from './wq_fields.json';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, TableSortLabel 
} from '@mui/material';

// Map display headers to their structural path key inside the JSON objects
const HEADERS_CONFIG = [
  { label: 'Universe', id: 'universe', path: (row) => row.settings?.universe },
  { label: 'Delay', id: 'delay', path: (row) => row.settings?.delay },
  { label: 'Decay', id: 'decay', path: (row) => row.settings?.decay },
  { label: 'Neutralization', id: 'neutralization', path: (row) => row.settings?.neutralization },
  { label: 'Truncation', id: 'truncation', path: (row) => row.settings?.truncation },
  { label: 'Sharpe', id: 'sharpe', path: (row) => row.is?.sharpe },
  { label: 'Fitness', id: 'fitness', path: (row) => row.is?.fitness },
  { label: 'Returns', id: 'returns', path: (row) => row.is?.returns },
  { label: 'Turnover', id: 'turnover', path: (row) => row.is?.turnover },
  { label: 'Score Diff', id: 'scoreDiff', path: (row) => row.scoreDiff },
  { label: 'Code', id: 'code', path: (row) => row.code || row.regular?.code || '' },
  { label: 'Fields (Usage Count)', id: 'fields', sortable: false }
];

export default function AlphaTable({ alphas, title = "Compiled Results" }) {
  const count = alphas.length;
  const [orderBy, setOrderBy] = useState('sharpe');
  const [order, setOrder] = useState('desc');

  const fieldInfoMap = useMemo(() => {
    const map = new Map();
    if (!fieldsData) return map;
    fieldsData.forEach((item) => {
      if (item.Type !== 'GROUP') map.set(item.Field, item.Alphas);
    });
    return map;
  }, []);
  
  const extractFieldsFromCode = (code) => {
    if (!code) return [];
    const words = code.match(/[a-zA-Z_]\w*/g) || [];
    const matchedFields = words.filter((word) => fieldInfoMap.has(word));
    return [...new Set(matchedFields)];
  };

  const handleSortRequest = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Process data sorting inside memoization bounds to preserve CPU cycles
  const sortedAlphas = useMemo(() => {
    if (!alphas) return [];
    const config = HEADERS_CONFIG.find(h => h.id === orderBy);
    if (!config || !config.path) return alphas;

    return [...alphas].sort((a, b) => {
      let valA = config.path(a);
      let valB = config.path(b);

      // Explicit type protection handles "N/A" strings or missing keys cleanly
      if (valA === "N/A" || valA === undefined || valA === null) valA = -Infinity;
      if (valB === "N/A" || valB === undefined || valB === null) valB = -Infinity;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return order === 'asc' ? valA - valB : valB - valA;
    });
  }, [alphas, order, orderBy]);

  const handleExport = () => {
    if (!alphas || alphas.length === 0) return alert("No alphas to export.");
    
    let maxFields = 0;
    const processedData = alphas.map((res) => {
      const code = res.code || res.regular?.code || '';
      const fields = extractFieldsFromCode(code);
      if (fields.length > maxFields) maxFields = fields.length;
      return { res, code, fields };
    });

    const baseHeaders = ['Universe', 'Delay', 'Decay', 'Neutralization', 'Truncation', 'Sharpe', 'Fitness', 'Returns', 'Turnover', 'Score Diff', 'Code'];
    const dynamicHeaders = [];
    for (let i = 1; i <= maxFields; i++) {
      dynamicHeaders.push(`Field ${i}`, `Count ${i}`);
    }
    
    const headers = [...baseHeaders, ...dynamicHeaders];
    const csvRows = [headers.join(',')];

    processedData.forEach(({ res, code, fields }) => {
      const escapedCode = `"${code.replace(/"/g, '""')}"`;
      const baseRow = [
        res.settings?.universe || '', res.settings?.delay ?? '', res.settings?.decay ?? '',
        res.settings?.neutralization || '', res.settings?.truncation ?? '', res.is?.sharpe ?? '',
        res.is?.fitness ?? '', res.is?.returns ?? '', res.is?.turnover ?? '', res.scoreDiff ?? '', escapedCode
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
    link.setAttribute('download', 'alphas_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 300 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', color: 'text.primary', fontWeight: 600 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip label={`Count: ${count}`} size="small" sx={{ fontWeight: 600 }} />
          <Button variant="contained" color="success" size="small" onClick={handleExport} sx={{ fontWeight: 600 }}>
            Export CSV
          </Button>
        </Box>
      </Box>
      
      <TableContainer sx={{ maxHeight: 'max(800px, calc(100vh - 220px))' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {HEADERS_CONFIG.map((col) => (
                <TableCell 
                  key={col.id} 
                  sortDirection={orderBy === col.id ? order : false}
                  sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap', bgcolor: 'background.paper' }}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSortRequest(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedAlphas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                  No alphas compiled yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedAlphas.map((res, idx) => {
                const code = res.code || res.regular?.code || '';
                const matchedFields = extractFieldsFromCode(code);

                return (
                  <TableRow key={idx} hover>
                    <TableCell>{res.settings?.universe}</TableCell>
                    <TableCell>{res.settings?.delay}</TableCell>
                    <TableCell>{res.settings?.decay}</TableCell>
                    <TableCell>{res.settings?.neutralization}</TableCell>
                    <TableCell>{res.settings?.truncation}</TableCell>
                    <TableCell>{res.is?.sharpe ?? "N/A"}</TableCell>
                    <TableCell>{res.is?.fitness ?? "N/A"}</TableCell>
                    <TableCell>{res.is?.returns ? (res.is.returns * 100).toFixed(2) + '%' : "N/A"}</TableCell>
                    <TableCell>{res.is?.turnover ? (res.is.turnover * 100).toFixed(2) + '%' : "N/A"}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: res.scoreDiff > 0 ? 'success.main' : res.scoreDiff < 0 ? 'error.main' : 'text.secondary' }}>
                      {res.scoreDiff ?? "N/A"}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem', minWidth: 200 }}>
                      {code}
                    </TableCell>
                    <TableCell>
                      {matchedFields.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {matchedFields.map(field => (
                            <Box key={field} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.100', p: 0.5, borderRadius: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 500, mr: 1 }}>{field}</Typography>
                              <Chip label={fieldInfoMap.get(field) ?? 0} size="small" sx={{ height: 16, fontSize: '0.65rem' }} color="default" />
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">None detected</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
