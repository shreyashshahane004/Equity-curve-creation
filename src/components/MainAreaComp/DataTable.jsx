import React from 'react';

const DataTable = ({ extractedData, handleEditRValue }) => {
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Detected Line</th>
            <th>R Value</th>
            <th>Cumulative R</th>
          </tr>
        </thead>
        <tbody>
          {extractedData.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.originalText}</td>
              <td style={{ fontWeight: 'bold' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <input 
                    type="text" 
                    value={row.rValueStr !== undefined ? row.rValueStr : row.rValue}
                    onChange={(e) => handleEditRValue(row.id, e.target.value)}
                    style={{ 
                      width: '50px', 
                      padding: '4px', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '6px',
                      color: row.rValue >= 0 ? 'var(--secondary)' : 'var(--primary)',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <span style={{ color: row.rValue >= 0 ? 'var(--secondary)' : 'var(--primary)' }}>R</span>
                </div>
              </td>
              <td>{row.cumulativeR}R</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
