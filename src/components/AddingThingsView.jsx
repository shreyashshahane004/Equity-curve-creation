import React, { useState, useEffect, useMemo } from 'react';
import { Database, Plus, Trash2, Save, CheckCircle2, TableProperties } from 'lucide-react';
import '../styles/adding-things.css';

const AddingThingsView = ({ monthsData, strategies, activeStrategy, setActiveStrategy, onUpdateData }) => {
  // Extract all unique custom column names across the dataset.
  const globalCustomColumns = useMemo(() => {
    const cols = new Set();
    monthsData.forEach(m => {
       m.data?.forEach(t => {
          if (t.customFields) {
             Object.keys(t.customFields).forEach(k => cols.add(k));
          }
       });
    });
    return Array.from(cols).sort();
  }, [monthsData]);
  
  // Local state for columns
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    // Merge new global columns with existing local ones, avoiding duplicates
    setColumns(prev => {
      const merged = new Set([...prev, ...globalCustomColumns]);
      return Array.from(merged);
    });
  }, [globalCustomColumns]);

  // Selections
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  // Filter for single strategies only (Combined cannot be directly edited)
  const availableMonths = useMemo(() => {
    return monthsData.filter(m => (m.strategy || 'strat_1') === activeStrategy && m.strategy !== 'combined');
  }, [monthsData, activeStrategy]);

  const uniqueYears = Array.from(new Set(availableMonths.map(m => m.year))).sort((a,b) => b.localeCompare(a));
  
  // Auto-select first year/month if nothing selected
  useEffect(() => {
    if (uniqueYears.length > 0 && !selectedYear) {
      setSelectedYear(uniqueYears[0]);
    }
  }, [uniqueYears, selectedYear]);

  const monthsForYear = useMemo(() => {
    return availableMonths.filter(m => m.year === selectedYear).map(m => m.month);
  }, [availableMonths, selectedYear]);

  useEffect(() => {
    if (monthsForYear.length > 0 && (!selectedMonth || !monthsForYear.includes(selectedMonth))) {
      setSelectedMonth(monthsForYear[0]);
    }
  }, [monthsForYear, selectedMonth]);

  // The active month entry being edited
  const currentEntry = availableMonths.find(m => m.year === selectedYear && m.month === selectedMonth);

  // Table Data state
  const [tableData, setTableData] = useState([]);
  
  // Load data when selection changes
  useEffect(() => {
    if (currentEntry) {
      // deep copy
      setTableData(JSON.parse(JSON.stringify(currentEntry.data || [])));
    } else {
      setTableData([]);
    }
  }, [currentEntry]);

  const [showPopup, setShowPopup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate summary stats dynamically from tableData
  const summaryStats = useMemo(() => {
    let maxR = -Infinity;
    let endR = 0;
    
    if (tableData.length === 0) {
       return { maxR: 0, endR: 0 };
    }

    let cumR = 0;
    tableData.forEach(row => {
      cumR += (row.rValue || 0);
      cumR = Math.round(cumR * 100) / 100;
      if (cumR > maxR) {
        maxR = cumR;
      }
    });
    
    endR = cumR;
    if (maxR === -Infinity) maxR = 0;

    return { maxR, endR };
  }, [tableData]);

  const handleAddColumn = () => {
    const colName = prompt("Enter new column name (e.g., 'Max RR', 'Weekend Hold'):");
    if (colName && colName.trim()) {
      const name = colName.trim();
      if (!columns.includes(name)) {
        setColumns([...columns, name]);
      }
    }
  };

  const handleCellChange = (rowIndex, field, value) => {
    const newData = [...tableData];
    newData[rowIndex][field] = value;
    
    // If rValueStr is edited, parse it to rValue
    if (field === 'rValueStr') {
      const parsed = parseFloat(value);
      newData[rowIndex].rValue = isNaN(parsed) ? 0 : parsed;
    }
    
    setTableData(newData);
  };

  const handleCustomCellChange = (rowIndex, colName, value) => {
    const newData = [...tableData];
    if (!newData[rowIndex].customFields) newData[rowIndex].customFields = {};
    newData[rowIndex].customFields[colName] = value;
    setTableData(newData);
  };

  const handleAddRow = () => {
    const newId = tableData.length > 0 ? Math.max(...tableData.map(r => r.id)) + 1 : 1;
    setTableData([...tableData, {
      id: newId,
      originalText: 'New Date',
      rValueStr: '0',
      rValue: 0,
      cumulativeR: 0,
      customFields: {}
    }]);
  };

  const handleDeleteRow = (index) => {
    const newData = tableData.filter((_, i) => i !== index);
    setTableData(newData);
  };

  const handleSave = async () => {
    if (!currentEntry) return;
    setIsSaving(true);
    
    // Recalculate cumulativeR to ensure data integrity
    let cumulativeR = 0;
    const finalData = tableData.map(row => {
      cumulativeR += row.rValue;
      cumulativeR = Math.round(cumulativeR * 100) / 100;
      return { ...row, cumulativeR };
    });

    const updatedEntry = { ...currentEntry, data: finalData };
    
    const error = await onUpdateData(currentEntry.id, updatedEntry);
    
    setIsSaving(false);
    if (error) {
      alert("Error saving: " + error);
    } else {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 3000);
      setTableData(finalData);
    }
  };

  return (
    <div className="at-wrapper">
      {/* Success Popup */}
      <div className={`at-toast ${showPopup ? 'show' : ''}`}>
        <CheckCircle2 size={24} />
        <div>
          <h4>Saved Successfully!</h4>
          <p>Your dataset changes have been securely stored.</p>
        </div>
      </div>

      <div className="at-header">
        <div>
          <h1 className="at-title"><TableProperties size={28}/> Data Enrichment</h1>
          <p className="at-sub">Add custom columns and modify dataset entries directly</p>
        </div>
        
        <div className="at-filters">
          <div className="at-filter-group">
            <label>Strategy</label>
            <select 
              value={activeStrategy} 
              onChange={(e) => setActiveStrategy(e.target.value)}
              disabled={activeStrategy === 'combined'} // Should switch back via sidebar if combined
            >
              {strategies.filter(s => s.id !== 'combined').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div className="at-filter-group">
            <label>Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="at-filter-group">
            <label>Month</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {monthsForYear.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {activeStrategy === 'combined' && (
        <div className="at-warning-banner">
          <AlertCircle size={20}/>
          Please select a specific strategy from the sidebar. You cannot edit the combined view.
        </div>
      )}

      {activeStrategy !== 'combined' && currentEntry && (
        <div className="at-card">
          <div className="at-card-header">
            <div>
              <h2 className="at-card-title">
                {currentEntry.month} {currentEntry.year} Dataset
              </h2>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.85rem', fontWeight: 800, color: '#6b7280' }}>
                <span>Max R Reached: <span style={{ color: summaryStats.maxR > 0 ? '#4ECDC4' : 'inherit' }}>{summaryStats.maxR > 0 ? '+' : ''}{summaryStats.maxR}R</span></span>
                <span>Month End R: <span style={{ color: summaryStats.endR > 0 ? '#4ECDC4' : (summaryStats.endR < 0 ? '#FF6B6B' : 'inherit') }}>{summaryStats.endR > 0 ? '+' : ''}{summaryStats.endR}R</span></span>
              </div>
            </div>
            <div className="at-actions">
              <button className="at-btn at-btn-secondary" onClick={handleAddColumn}>
                <Plus size={16}/> New Custom Column
              </button>
              <button className="at-btn at-btn-primary" onClick={handleSave} disabled={isSaving}>
                <Save size={16}/> {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="at-table-container">
            <table className="at-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Date / Label</th>
                  <th style={{ width: '120px' }}>Result (R)</th>
                  {columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                  <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 3} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                      No trades recorded for this month.
                    </td>
                  </tr>
                ) : (
                  tableData.map((row, idx) => (
                    <tr key={row.id}>
                      <td>
                        <input 
                          className="at-input" 
                          value={row.originalText || ''} 
                          onChange={(e) => handleCellChange(idx, 'originalText', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          className="at-input" 
                          value={row.rValueStr || ''} 
                          onChange={(e) => handleCellChange(idx, 'rValueStr', e.target.value)}
                          style={{ color: row.rValue > 0 ? '#4ECDC4' : (row.rValue < 0 ? '#FF6B6B' : 'inherit'), fontWeight: 800 }}
                        />
                      </td>
                      {columns.map(col => (
                        <td key={col}>
                          <input 
                            className="at-input" 
                            value={(row.customFields && row.customFields[col]) || ''} 
                            onChange={(e) => handleCustomCellChange(idx, col, e.target.value)}
                            placeholder="..."
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center' }}>
                        <button className="at-icon-btn at-btn-danger" onClick={() => handleDeleteRow(idx)} title="Delete Row">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="at-card-footer">
             <button className="at-btn at-btn-outline" onClick={handleAddRow}>
               <Plus size={16}/> Add Trade Row
             </button>
          </div>
        </div>
      )}
      
      {activeStrategy !== 'combined' && !currentEntry && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
          No data available for the selected time period.
        </div>
      )}
    </div>
  );
};

export default AddingThingsView;
