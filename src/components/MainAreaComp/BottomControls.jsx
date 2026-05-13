import React from 'react';
import { ImagePlus, BarChart2, Send, X } from 'lucide-react';

const BottomControls = ({ 
  fileInputRef, 
  handleFileChange, 
  pastedImage, 
  setPastedImage, 
  setExtractedData, 
  month, 
  setMonth, 
  year, 
  setYear, 
  winLoss, 
  setWinLoss, 
  processImage, 
  isProcessing, 
  handleSend, 
  currentSelection 
}) => {
  return (
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
  );
};

export default BottomControls;
