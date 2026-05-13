import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { BarChart2, Loader2 } from 'lucide-react';

// Sub-components
import EquityChart from './MainAreaComp/EquityChart';
import DataTable from './MainAreaComp/DataTable';
import BottomControls from './MainAreaComp/BottomControls';

const MainArea = ({ currentSelection, onAddData, onUpdateData, onNewInput, isPreview = false, isExpanded = false }) => {
  const [pastedImage, setPastedImage] = useState(currentSelection?.imageUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(currentSelection?.data || []);
  const [month, setMonth] = useState(currentSelection?.month || 'January');
  const [year, setYear] = useState(currentSelection?.year || '2026');
  const [winLoss, setWinLoss] = useState('Win');
  const fileInputRef = useRef(null);

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
      const result = await Tesseract.recognize(pastedImage, 'eng', { logger: m => console.log(m) });
      const lines = result.data.text.split('\n');
      const parsedData = [];
      let cumulativeR = 0;

      lines.forEach((line) => {
        let trimmed = line.trim().replace(/(?:El|E1|el|-l|-I|-i|E l)$/i, '-1');
        if (!trimmed || !trimmed.match(/\d{1,2}[-/\s][A-Za-z]{3}/)) return;
        
        const match = trimmed.match(/(?:^|\s+)((-?\d+(?:\.\d+)?)|(no\s*trade))$/i);
        if (match) {
          let rVal = match[2] ? parseFloat(match[2]) : 0;
          cumulativeR += rVal;
          parsedData.push({
            id: parsedData.length + 1,
            originalText: trimmed,
            rValueStr: rVal.toString(),
            rValue: rVal,
            cumulativeR: parseFloat(cumulativeR.toFixed(2))
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
    if (!pastedImage) return alert("Please paste an image first!");
    const data = { month, year, imageUrl: pastedImage, data: extractedData };
    if (currentSelection) {
      onUpdateData(currentSelection.id, data);
      alert("Changes saved successfully!");
    } else {
      onAddData(data);
    }
  };

  const handleSave = async () => {
    if (onUpdateData && currentSelection) {
      try {
        const error = await onUpdateData(currentSelection.id, { month, year, imageUrl: pastedImage, data: extractedData });
        alert(error ? "Error saving changes: " + error : "Changes saved successfully!");
      } catch (err) { alert("Unexpected error: " + err.message); }
    }
  };

  const rValues = extractedData.map(d => d.cumulativeR);
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
                        <div style={{ background: 'rgba(74, 144, 226, 0.1)', padding: '6px 12px', borderRadius: '10px', color: '#4a90e2', fontWeight: 800, fontSize: '13px' }}>H: {maxR > 0 ? '+' : ''}{maxR}R</div>
                        <div style={{ background: 'rgba(255, 107, 107, 0.1)', padding: '6px 12px', borderRadius: '10px', color: '#ff6b6b', fontWeight: 800, fontSize: '13px' }}>L: {minR > 0 ? '+' : ''}{minR}R</div>
                        <div style={{ background: endR >= 0 ? 'rgba(74, 144, 226, 0.1)' : 'rgba(255, 107, 107, 0.1)', padding: '6px 12px', borderRadius: '10px', color: endR >= 0 ? '#4a90e2' : '#ff6b6b', fontWeight: 800, fontSize: '13px' }}>E: {endR > 0 ? '+' : ''}{endR}R</div>
                      </div>
                      {currentSelection && !isPreview && <button onClick={handleSave} style={{ background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(78, 205, 196, 0.3)' }}>Save Changes</button>}
                    </div>
                  </div>
                )}
                <div className={`chart-container ${isPreview ? 'preview' : ''} ${isExpanded ? 'expanded' : ''}`}>
                  <EquityChart extractedData={extractedData} isPreview={isPreview} isExpanded={isExpanded} />
                </div>
                {!isPreview && <DataTable extractedData={extractedData} handleEditRValue={handleEditRValue} />}
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '100px' }}>
                <BarChart2 size={48} style={{ color: '#e5e7eb', marginBottom: '15px' }} />
                <h3 style={{ color: 'var(--text-light)' }}>No trades extracted yet</h3>
                {pastedImage && !isProcessing && <p style={{ color: '#9ca3af', marginTop: '10px' }}>{currentSelection ? "This saved entry contains no trade data." : "Click 'Make Chart' to extract trades from your pasted image."}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {!isPreview && (
        <BottomControls 
          fileInputRef={fileInputRef} handleFileChange={handleFileChange}
          pastedImage={pastedImage} setPastedImage={setPastedImage} setExtractedData={setExtractedData}
          month={month} setMonth={setMonth} year={year} setYear={setYear}
          winLoss={winLoss} setWinLoss={setWinLoss} processImage={processImage}
          isProcessing={isProcessing} handleSend={handleSend} currentSelection={currentSelection}
        />
      )}
    </div>
  );
};

export default MainArea;
