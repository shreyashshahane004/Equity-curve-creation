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

const MainArea = ({ currentSelection, onAddData, onNewInput }) => {
  const [pastedImage, setPastedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const [month, setMonth] = useState('January');
  const [year, setYear] = useState('2026');
  const [winLoss, setWinLoss] = useState('Win');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentSelection) {
      setExtractedData(currentSelection.data || []);
      setPastedImage(currentSelection.imageUrl);
      setMonth(currentSelection.month);
      setYear(currentSelection.year);
    }
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
    
    onAddData({
      month,
      year,
      imageUrl: pastedImage,
      data: extractedData
    });
  };

  const maxR = extractedData.length > 0 ? Math.max(...extractedData.map(d => d.cumulativeR)) : 0;
  const minR = extractedData.length > 0 ? Math.min(...extractedData.map(d => d.cumulativeR)) : 0;
  const endR = extractedData.length > 0 ? extractedData[extractedData.length - 1].cumulativeR : 0;

  return (
    <div className="main-area" onPaste={handlePaste} tabIndex={0} style={{ outline: 'none' }}>
      {isProcessing && (
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
            
            {extractedData.length > 0 && (
              <div className="chart-container">
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingRight: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#6b7280' }}>EQUITY CURVE</span>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ background: 'rgba(74, 144, 226, 0.1)', padding: '8px 16px', borderRadius: '12px', color: '#4a90e2', fontWeight: 800, fontSize: '15px' }}>
                      High: {maxR > 0 ? '+' : ''}{maxR}R
                    </div>
                    <div style={{ background: 'rgba(255, 107, 107, 0.1)', padding: '8px 16px', borderRadius: '12px', color: '#ff6b6b', fontWeight: 800, fontSize: '15px' }}>
                      Low: {minR > 0 ? '+' : ''}{minR}R
                    </div>
                    <div style={{ background: endR >= 0 ? 'rgba(74, 144, 226, 0.1)' : 'rgba(255, 107, 107, 0.1)', padding: '8px 16px', borderRadius: '12px', color: endR >= 0 ? '#4a90e2' : '#ff6b6b', fontWeight: 800, fontSize: '15px' }}>
                      End: {endR > 0 ? '+' : ''}{endR}R
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={extractedData} margin={{ top: 30, right: 40, left: 10, bottom: 40 }}>
                    <defs>
                      <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4a90e2" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4a90e2" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="id" axisLine={false} tickLine={false} tick={false} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }} 
                      tickMargin={10}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#4a90e2', fontWeight: 600 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulativeR" 
                      stroke="#4a90e2" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorR)"
                      activeDot={{ r: 6, fill: '#4a90e2', stroke: 'white', strokeWidth: 2 }}
                      dot={{ r: 3, fill: 'white', stroke: '#4a90e2', strokeWidth: 2 }}
                      label={<CustomLabel data={extractedData} />}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {extractedData.length > 0 && (
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
                          {!currentSelection ? (
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
                          ) : (
                            <span style={{ color: row.rValue >= 0 ? 'var(--secondary)' : 'var(--primary)' }}>
                              {row.rValue > 0 ? '+' : ''}{row.rValue}R
                            </span>
                          )}
                        </td>
                        <td>{row.cumulativeR}R</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {!currentSelection && (
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
            title="Send to Sidebar"
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
