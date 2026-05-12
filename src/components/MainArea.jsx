import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ImagePlus, Send, BarChart2, Loader2, X } from 'lucide-react';

const CustomLabel = (props) => {
  const { x, y, value, index, data } = props;
  if (!data) return null;
  
  const yVal = Array.isArray(value) ? value[1] : value;
  
  let isMinima = false;
  let isMaxima = false;

  if (index === 0) {
    if (data.length > 1) {
      isMaxima = yVal > data[1].cumulativeR;
      isMinima = yVal < data[1].cumulativeR;
    }
  } else if (index === data.length - 1) {
    if (data.length > 1) {
      isMaxima = yVal > data[index - 1].cumulativeR;
      isMinima = yVal < data[index - 1].cumulativeR;
    }
  } else {
    const prev = data[index - 1].cumulativeR;
    const next = data[index + 1].cumulativeR;
    isMaxima = (yVal > prev && yVal > next);
    isMinima = (yVal < prev && yVal < next);
  }

  // Only show at local extrema, or first/last point
  if (!isMaxima && !isMinima && index !== 0 && index !== data.length - 1) {
    return null;
  }

  // Default placement for flat first/last points
  if (index === 0 && !isMaxima && !isMinima) isMinima = true;
  if (index === data.length - 1 && !isMaxima && !isMinima) isMaxima = true;

  // Place minima below the dot, maxima above the dot
  const positionY = isMinima && !isMaxima ? y + 20 : y - 12;
  const isPositive = yVal >= 0;

  return (
    <text 
      x={x} 
      y={positionY} 
      fill={isPositive ? '#4a90e2' : '#ff6b6b'} 
      fontSize={12} 
      textAnchor="middle"
      fontWeight="800"
    >
      {yVal > 0 ? '+' : ''}{yVal}R
    </text>
  );
};

const MainArea = ({ currentSelection, onAddData, onUpdateData, onNewInput, isPreview = false, isExpanded = false }) => {
  const [pastedImage, setPastedImage] = useState(currentSelection?.imageUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(currentSelection?.data || []);
  const [month, setMonth] = useState(currentSelection?.month || 'January');
  const [year, setYear] = useState(currentSelection?.year || '2026');
  const [winLoss, setWinLoss] = useState('Win');
  const fileInputRef = useRef(null);

  // Sync state when currentSelection changes (fixes persistence/loading bugs)
  useEffect(() => {
    setPastedImage(currentSelection?.imageUrl || null);
    setExtractedData(currentSelection?.data || []);
    setMonth(currentSelection?.month || 'January');
    setYear(currentSelection?.year || '2026');
  }, [currentSelection]);

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          setPastedImage(event.target.result);
          setExtractedData([]);
          if (onNewInput) onNewInput();
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPastedImage(event.target.result);
        setExtractedData([]);
        if (onNewInput) onNewInput();
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const processImage = async () => {
    if (!pastedImage) return;
    setIsProcessing(true);
    try {
      const result = await Tesseract.recognize(pastedImage, 'eng', {
        logger: m => console.log(m)
      });
      
      const lines = result.data.text.split('\n');
      const parsedData = [];
      let cumulativeR = 0;

      lines.forEach((line) => {
        // Tesseract sometimes misreads "-1" in Excel as "El", "E1", etc. We clean this up first.
        let trimmed = line.trim().replace(/(?:El|E1|el|-l|-I|-i|E l)$/i, '-1');
        if (!trimmed) return;
        
        // Strict requirement: the line MUST contain a date pattern like "03-Jan" to filter out totals or random numbers
        if (!trimmed.match(/\d{1,2}[-/\s][A-Za-z]{3}/)) return;
        
        // Require space or start of line to avoid matching dates like "Jan-23" as -23
        const match = trimmed.match(/(?:^|\s+)((-?\d+(?:\.\d+)?)|(no\s*trade))$/i);
        if (match) {
          let rVal = 0;
          if (match[2]) {
            rVal = parseFloat(match[2]);
          } else if (match[3]) {
            rVal = 0;
          }
          
          cumulativeR += rVal;
          parsedData.push({
            id: parsedData.length + 1,
            originalText: trimmed,
            rValueStr: rVal.toString(),
            rValue: rVal,
            cumulativeR: cumulativeR
          });
        }
      });
      
      setExtractedData(parsedData);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to extract data from image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditRValue = (id, newValueStr) => {
    const parsed = parseFloat(newValueStr);
    const newValue = isNaN(parsed) ? 0 : parsed;
    
    setExtractedData(prevData => {
      const idx = prevData.findIndex(r => r.id === id);
      if (idx === -1) return prevData;
      
      const newData = [...prevData];
      newData[idx] = { ...newData[idx], rValueStr: newValueStr, rValue: newValue };
      
      let cumulative = idx > 0 ? newData[idx - 1].cumulativeR : 0;
      for (let i = idx; i < newData.length; i++) {
        cumulative += newData[i].rValue;
        newData[i] = { ...newData[i], cumulativeR: parseFloat(cumulative.toFixed(2)) };
      }
      return newData;
    });
  };

  const handleSend = () => {
    if (!pastedImage) {
      alert("Please paste an image first!");
      return;
    }
    
    if (currentSelection) {
      onUpdateData(currentSelection.id, {
        month,
        year,
        imageUrl: pastedImage,
        data: extractedData
      });
      alert("Changes saved successfully!");
    } else {
      onAddData({
        month,
        year,
        imageUrl: pastedImage,
        data: extractedData
      });
    }
  };

  const handleSave = async () => {
    if (onUpdateData && currentSelection) {
      try {
        const error = await onUpdateData(currentSelection.id, {
          month,
          year,
          imageUrl: pastedImage,
          data: extractedData
        });
        
        if (error) {
          alert("Error saving changes: " + error);
        } else {
          alert("Changes saved successfully!");
        }
      } catch (err) {
        alert("Unexpected error: " + err.message);
      }
    }
  };

  const rValues = extractedData.map(d => typeof d.cumulativeR === 'number' ? d.cumulativeR : 0);
  const maxR = rValues.length > 0 ? Math.max(...rValues) : 0;
  const minR = rValues.length > 0 ? Math.min(...rValues) : 0;
  const endR = rValues.length > 0 ? rValues[rValues.length - 1] : 0;

  return (
    <div className="main-area" onPaste={handlePaste} tabIndex={0} style={{ outline: 'none' }}>
      {isProcessing && !isPreview && (
        <div className="loading-overlay">
          <Loader2 size={48} className="spinner" />
          <h2>Extracting Trading Data...</h2>
          <p style={{ marginTop: '10px', color: 'var(--text-light)' }}>Please wait, processing image with OCR...</p>
        </div>
      )}

      <div className="content-viewer">
        {!pastedImage && !currentSelection ? (
          <div className="empty-state">
            <BarChart2 size={64} style={{ color: 'var(--secondary)', margin: '0 auto 20px auto', display: 'block' }} />
            <p>No trades found for this filter.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Press Ctrl+V to paste a screenshot here.</p>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            
            {extractedData.length > 0 ? (
              <>
                {(!isPreview || isExpanded) && (
                  <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingRight: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#6b7280' }}>EQUITY CURVE</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>{month} {year}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ background: 'rgba(74, 144, 226, 0.1)', padding: '6px 12px', borderRadius: '10px', color: '#4a90e2', fontWeight: 800, fontSize: '13px' }}>
                          H: {maxR > 0 ? '+' : ''}{maxR}R
                        </div>
                        <div style={{ background: 'rgba(255, 107, 107, 0.1)', padding: '6px 12px', borderRadius: '10px', color: '#ff6b6b', fontWeight: 800, fontSize: '13px' }}>
                          L: {minR > 0 ? '+' : ''}{minR}R
                        </div>
                        <div style={{ background: endR >= 0 ? 'rgba(74, 144, 226, 0.1)' : 'rgba(255, 107, 107, 0.1)', padding: '6px 12px', borderRadius: '10px', color: endR >= 0 ? '#4a90e2' : '#ff6b6b', fontWeight: 800, fontSize: '13px' }}>
                          E: {endR > 0 ? '+' : ''}{endR}R
                        </div>
                      </div>
                      
                      {currentSelection && !isPreview && (
                        <button 
                          onClick={handleSave}
                          style={{ background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(78, 205, 196, 0.3)' }}
                        >
                          Save Changes
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className={`chart-container ${isPreview ? 'preview' : ''} ${isExpanded ? 'expanded' : ''}`}>

                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={extractedData} margin={(isPreview && !isExpanded) ? { top: 10, right: 10, left: 10, bottom: 10 } : { top: 30, right: 40, left: 10, bottom: 40 }}>
                      <defs>
                        <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4a90e2" stopOpacity={(isPreview && !isExpanded) ? 0.6 : 0.4}/>
                          <stop offset="95%" stopColor="#4a90e2" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="id" axisLine={false} tickLine={false} tick={false} hide={isPreview && !isExpanded} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={(isPreview && !isExpanded) ? false : { fill: '#9ca3af', fontSize: 12, fontWeight: 500 }} 
                        tickMargin={10}
                        hide={isPreview && !isExpanded}
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={(isPreview && !isExpanded) ? "#f3f4f6" : "#e5e7eb"} />
                      {(!isPreview || isExpanded) && (
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                          itemStyle={{ color: '#4a90e2', fontWeight: 600 }}
                        />
                      )}
                      <Area 
                        type="monotone" 
                        dataKey="cumulativeR" 
                        stroke="#4a90e2" 
                        strokeWidth={(isPreview && !isExpanded) ? 4 : 3} 
                        fillOpacity={1} 
                        fill="url(#colorR)"
                        activeDot={(isPreview && !isExpanded) ? false : { r: 6, fill: '#4a90e2', stroke: 'white', strokeWidth: 2 }}
                        dot={(isPreview && !isExpanded) ? false : { r: 3, fill: 'white', stroke: '#4a90e2', strokeWidth: 2 }}
                        label={(isPreview && !isExpanded) ? null : <CustomLabel data={extractedData} />}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {!isPreview && (
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
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '100px' }}>
                <BarChart2 size={48} style={{ color: '#e5e7eb', marginBottom: '15px' }} />
                <h3 style={{ color: 'var(--text-light)' }}>No trades extracted yet</h3>
                {pastedImage && !isProcessing && (
                  <p style={{ color: '#9ca3af', marginTop: '10px' }}>
                    {currentSelection ? "This saved entry contains no trade data." : "Click 'Make Chart' to extract trades from your pasted image."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!isPreview && (
        <div className="bottom-bar">
          <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleFileChange}
        />
        <button className="icon-btn" onClick={() => fileInputRef.current.click()}>
          <ImagePlus size={20} />
        </button>
        
        <div className="input-container">
          {pastedImage && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <img src={pastedImage} alt="Preview" className="chat-image-preview" />
              <button 
                onClick={(e) => { e.stopPropagation(); setPastedImage(null); setExtractedData([]); }}
                style={{ 
                  position: 'absolute', top: -5, right: -5, 
                  background: 'var(--primary)', color: 'white', 
                  borderRadius: '50%', width: 16, height: 16, 
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', zIndex: 10
                }}
                title="Remove Image"
              >
                <X size={10} strokeWidth={3} />
              </button>
            </div>
          )}
          <input 
            type="text" 
            className="chat-input" 
            placeholder={pastedImage ? "Image attached." : "Paste the image here or upload using + icon..."}
            readOnly
          />
        </div>

        <div className="controls">
          <select 
            className="select-input" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
          >
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select 
            className="select-input" 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
          >
            {['2023', '2024', '2025', '2026'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select 
            className="select-input" 
            value={winLoss} 
            onChange={(e) => setWinLoss(e.target.value)}
          >
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
          </select>

          <button 
            className="action-btn" 
            onClick={processImage}
            disabled={!pastedImage || isProcessing}
            title="Make Chart"
          >
            <BarChart2 size={18} /> Make Chart
          </button>

          <button 
            className="icon-btn" 
            style={{ backgroundColor: 'var(--secondary)', color: 'white' }}
            onClick={handleSend}
            title={currentSelection ? "Update Entry" : "Send to Sidebar"}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

export default MainArea;
