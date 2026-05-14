import React from 'react';
import { Plus, ArrowUp, ArrowDown } from 'lucide-react';

const DataTable = ({ extractedData, handleEditRValue, handleEditOriginalText, handleAddRow, handleMoveRow }) => {
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Detected Line</th>
            <th>R Value</th>
            <th>Cumulative R</th>
            <th style={{ width: '60px' }}></th>
          </tr>
        </thead>
        <tbody>
          {extractedData.map((row, index) => (
            <tr key={row.id}>
              <td>{index + 1}</td>
              <td>
                <input 
                  type="text" 
                  value={row.originalText || ''}
                  onChange={(e) => handleEditOriginalText(row.id, e.target.value)}
                  style={{ 
                    width: '100px', 
                    padding: '4px 8px', 
                    border: '1px solid transparent', 
                    borderRadius: '6px',
                    color: 'var(--text-dark)',
                    background: 'transparent',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    cursor: 'text'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#e5e7eb'}
                  onBlur={(e) => e.target.style.borderColor = 'transparent'}
                />
              </td>
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
              <td>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => handleMoveRow(index, 'up')}
                    disabled={index === 0}
                    style={{ background: 'transparent', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, color: '#9ca3af', padding: '4px' }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    onClick={() => handleMoveRow(index, 'down')}
                    disabled={index === extractedData.length - 1}
                    style={{ background: 'transparent', border: 'none', cursor: index === extractedData.length - 1 ? 'default' : 'pointer', opacity: index === extractedData.length - 1 ? 0.3 : 1, color: '#9ca3af', padding: '4px' }}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', marginBottom: '8px' }}>
        <button 
          onClick={handleAddRow}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(78, 205, 196, 0.1)',
            color: 'var(--secondary)',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 16px',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(78, 205, 196, 0.2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(78, 205, 196, 0.1)'}
        >
          <Plus size={16} />
          Add New Row
        </button>
      </div>
    </div>
  );
};

export default DataTable;
