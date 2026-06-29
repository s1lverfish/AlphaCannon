import React, { useMemo } from 'react';
import alphasData from './submitted-alphas.json';
import fieldsData from './wq_fields.json';

const AlphaGrid = () => {
  // Create a Map for O(1) lookup performance, filtering out Grouping fields
  const fieldInfoMap = useMemo(() => {
    const map = new Map();
    
    fieldsData.forEach((item) => {
      // 1. Check if the type is explicitly marked as a grouping field
      // 2. Check if the field name is one of the standard groupings
      const isGrouping = item.Type === 'GROUP';
      
      if (!isGrouping) {
        map.set(item.Field, item.Alphas);
      }
    });
    return map;
  }, []);

  // Helper function to extract fields from a given code string
  const extractFieldsFromCode = (code) => {
    if (!code) return [];
    // Match any word characters (letters, numbers, underscores)
    const words = code.match(/[a-zA-Z_]\w*/g) || [];
    // Filter against the valid fields map and remove duplicates
    const matchedFields = words.filter((word) => fieldInfoMap.has(word));
    return [...new Set(matchedFields)];
  };

  const handleExport = () => {
    // 1. Pre-process the data to find the maximum number of fields any alpha has
    let maxFields = 0;
    const processedData = alphasData.map((alpha) => {
      const code = alpha.regular?.code || '';
      const fields = extractFieldsFromCode(code);
      if (fields.length > maxFields) {
        maxFields = fields.length;
      }
      return { alpha, code, fields };
    });

    // 2. Build the dynamic headers
    const baseHeaders = [
      'Universe', 'Delay', 'Decay', 'Neutralization', 'Truncation',
      'Sharpe', 'Fitness', 'Returns', 'Turnover', 'Code'
    ];
    
    const dynamicHeaders = [];
    for (let i = 1; i <= maxFields; i++) {
      dynamicHeaders.push(`Field ${i}`, `Count ${i}`);
    }
    
    const headers = [...baseHeaders, ...dynamicHeaders];
    const csvRows = [headers.join(',')];

    // 3. Build the rows
    processedData.forEach(({ alpha, code, fields }) => {
      // Escape quotes in code to prevent CSV breaking, and wrap in quotes
      const escapedCode = `"${code.replace(/"/g, '""')}"`;

      const baseRow = [
        alpha.settings?.universe || '',
        alpha.settings?.delay ?? '',
        alpha.settings?.decay ?? '',
        alpha.settings?.neutralization || '',
        alpha.settings?.truncation ?? '',
        alpha.is?.sharpe ?? '',
        alpha.is?.fitness ?? '',
        alpha.is?.returns ?? '',
        alpha.is?.turnover ?? '',
        escapedCode
      ];

      // Dynamically add field name and count to separate columns
      const dynamicCols = [];
      for (let i = 0; i < maxFields; i++) {
        if (i < fields.length) {
          const fieldName = fields[i];
          const count = fieldInfoMap.get(fieldName) ?? 0;
          dynamicCols.push(`"${fieldName}"`, count);
        } else {
          // Pad with empty strings if this alpha has fewer fields than the max
          dynamicCols.push('', '');
        }
      }

      csvRows.push([...baseRow, ...dynamicCols].join(','));
    });

    // Generate and download the CSV
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'alphas_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!alphasData || alphasData.length === 0) return <div>No data available</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <button 
        onClick={handleExport}
        style={{ marginBottom: '15px', padding: '10px 15px', cursor: 'pointer', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
      >
        Export to CSV (Excel Compatible)
      </button>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={thStyle}>Universe</th>
              <th style={thStyle}>Delay</th>
              <th style={thStyle}>Decay</th>
              <th style={thStyle}>Neutralization</th>
              <th style={thStyle}>Truncation</th>
              <th style={thStyle}>Sharpe</th>
              <th style={thStyle}>Fitness</th>
              <th style={thStyle}>Returns</th>
              <th style={thStyle}>Turnover</th>
              <th style={{ ...thStyle, width: '300px' }}>Code</th>
              <th style={{ ...thStyle, width: '250px' }}>Fields (Usage Count)</th>
            </tr>
          </thead>
          <tbody>
            {alphasData.map((alpha) => {
              const code = alpha.regular?.code || '';
              const matchedFields = extractFieldsFromCode(code);

              return (
                <tr key={alpha.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={tdStyle}>{alpha.settings?.universe}</td>
                  <td style={tdStyle}>{alpha.settings?.delay}</td>
                  <td style={tdStyle}>{alpha.settings?.decay}</td>
                  <td style={tdStyle}>{alpha.settings?.neutralization}</td>
                  <td style={tdStyle}>{alpha.settings?.truncation}</td>
                  <td style={tdStyle}>{alpha.is?.sharpe}</td>
                  <td style={tdStyle}>{alpha.is?.fitness}</td>
                  <td style={tdStyle}>{alpha.is?.returns ? (alpha.is.returns * 100).toFixed(2) + '%' : ''}</td>
                  <td style={tdStyle}>{alpha.is?.turnover ? (alpha.is.turnover * 100).toFixed(2) + '%' : ''}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
                    {code}
                  </td>
                  <td style={tdStyle}>
                    {matchedFields.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {matchedFields.map(field => (
                          <div key={field} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                            <span style={{ fontWeight: '500', marginRight: '8px' }}>{field}</span>
                            <span style={{ backgroundColor: '#6c757d', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' }}>
                              {fieldInfoMap.get(field) ?? 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#6c757d', fontSize: '12px' }}>None detected</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle = { padding: '12px', fontWeight: 'bold' };
const tdStyle = { padding: '12px', verticalAlign: 'top' };

export default AlphaGrid;
