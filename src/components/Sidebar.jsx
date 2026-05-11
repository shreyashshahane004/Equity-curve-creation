import React from 'react';
import { Trash2, Plus } from 'lucide-react';

const Sidebar = ({ monthsData, currentSelection, onSelect, onDelete }) => {
  return (
    <div className="sidebar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--primary)', fontWeight: 800 }}>Monthly Gallery</h2>
        <button 
          onClick={() => onSelect(null)}
          style={{ background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
          title="Create New Entry"
        >
          <Plus size={16} strokeWidth={3} /> New
        </button>
      </div>
      {monthsData.length === 0 ? (
        <p style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: '20px' }}>No months recorded yet.</p>
      ) : (
        monthsData.map((data, idx) => {
          const isActive = currentSelection && currentSelection.id === data.id;
          const finalR = data.data && data.data.length > 0 ? data.data[data.data.length - 1].cumulativeR : 0;
          return (
            <div 
              key={data.id || idx} 
              className={`month-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(data)}
            >
              <div className="month-card-header">
                <span>{data.month} {data.year}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: finalR >= 0 ? 'var(--secondary)' : 'var(--primary)' }}>
                    {finalR > 0 ? '+' : ''}{finalR}R
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(data.id);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6b6b', display: 'flex', padding: '2px' }}
                    title="Delete Month"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="month-card-stats">
                Trades: {data.data ? data.data.length : 0}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default Sidebar;
