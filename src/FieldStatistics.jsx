import React, { useMemo } from 'react';
import fieldsData from './wq_fields.json'; // Adjust the path if necessary

const FieldsPage = () => {
  // 1. Filter the data for only MATRIX and VECTOR types
  const filteredFields = useMemo(() => {
    return fieldsData.filter(
      (item) => item.Type === 'MATRIX' || item.Type === 'VECTOR'
    );
  }, []);

  // 2. Export logic
  const handleExport = () => {
    const headers = [
      'Dataset', 'Field', 'Description', 'Type', 
      'Coverage', 'Date Coverage', 'Alphas', 'Date added'
    ];
    
    const csvRows = [headers.join(',')];

    filteredFields.forEach((item) => {
      // Escape strings containing commas or quotes to prevent CSV formatting issues
      const escapedDataset = `"${(item.Dataset || '').replace(/"/g, '""')}"`;
      const escapedDesc = `"${(item.Description || '').replace(/"/g, '""')}"`;

      const row = [
        escapedDataset,
        item.Field || '',
        escapedDesc,
        item.Type || '',
        item.Coverage || '',
        item['Date Coverage'] || '',
        item.Alphas ?? 0,
        item['Date added'] || ''
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'matrix_vector_fields.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!filteredFields || filteredFields.length === 0) {
    return <div>No MATRIX or VECTOR fields found in data.</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '10px' }}>Matrix & Vector Fields</h1>
      <p style={{ marginBottom: '20px', color: '#555' }}>
        A detailed view of all available data fields for alpha generation.
      </p>

      <button 
        onClick={handleExport}
        style={{ marginBottom: '15px', padding: '10px 15px', cursor: 'pointer', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px' }}
      >
        Export to CSV (Excel Compatible)
      </button>
      
      <div style={{ overflowX: 'auto', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={thStyle}>Dataset</th>
              <th style={thStyle}>Field</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Coverage</th>
              <th style={thStyle}>Date Coverage</th>
              <th style={thStyle}>Alphas</th>
              <th style={thStyle}>Date added</th>
            </tr>
          </thead>
          <tbody>
            {filteredFields.map((item) => (
              <tr key={item.Field} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={tdStyle}>{item.Dataset}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 'bold' }}>{item.Field}</td>
                <td style={{ ...tdStyle, maxWidth: '350px', whiteSpace: 'normal', lineHeight: '1.4' }}>{item.Description}</td>
                <td style={tdStyle}>
                  <span style={{ 
                    backgroundColor: item.Type === 'MATRIX' ? '#e0ebfd' : '#e2f5e9', 
                    color: item.Type === 'MATRIX' ? '#0d6efd' : '#198754',
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {item.Type}
                  </span>
                </td>
                <td style={tdStyle}>{item.Coverage}</td>
                <td style={tdStyle}>{item['Date Coverage']}</td>
                <td style={tdStyle}>{item.Alphas}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{item['Date added']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle = { padding: '12px', fontWeight: 'bold' };
const tdStyle = { padding: '12px', verticalAlign: 'top' };

export default FieldsPage;
