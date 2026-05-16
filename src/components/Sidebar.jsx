import React, { useState } from 'react';
import { BarChart2, LayoutGrid, Trash2, CalendarDays, TrendingUp, Activity, PieChart, LineChart, SplitSquareHorizontal, Target, Folder, ChevronDown } from 'lucide-react';

const Sidebar = ({ monthsData, onSelect, onDelete, onNavigate, currentSelection, currentView }) => {
  const [isSavedMonthsOpen, setIsSavedMonthsOpen] = useState(false);
  return (
    <div className="sidebar">
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.4rem', marginBottom: '5px' }}>Equity Tracker</h2>
        <div style={{ 
          display: 'inline-block', 
          background: 'rgba(78, 205, 196, 0.1)', 
          color: 'var(--secondary)', 
          padding: '4px 12px', 
          borderRadius: '20px', 
          fontSize: '0.85rem', 
          fontWeight: 800 
        }}>
          {monthsData.length} Cases Recorded
        </div>
      </div>
      
      <div className="sidebar-menu">
        <button 
          className={`menu-item ${currentView === 'monthly' && !currentSelection ? 'active' : ''}`}
          onClick={() => onNavigate('monthly')}
        >
          <BarChart2 size={20} />
          Months EQ Curve
        </button>
        <button 
          className={`menu-item ${currentView === 'gallery' ? 'active' : ''}`}
          onClick={() => onNavigate('gallery')}
        >
          <LayoutGrid size={20} />
          Images of Curves
        </button>
        <button 
          className={`menu-item ${currentView === 'calendar' ? 'active' : ''}`}
          onClick={() => onNavigate('calendar')}
        >
          <CalendarDays size={20} />
          Calendar View
        </button>
        <button 
          className={`menu-item ${currentView === 'analytics' ? 'active' : ''}`}
          onClick={() => onNavigate('analytics')}
        >
          <TrendingUp size={20} />
          Analytics
        </button>
        <button 
          className={`menu-item ${currentView === 'months-performance' ? 'active' : ''}`}
          onClick={() => onNavigate('months-performance')}
        >
          <Activity size={20} />
          Months Performance
        </button>
        <button 
          className={`menu-item ${currentView === 'seasonal-tendency' ? 'active' : ''}`}
          onClick={() => onNavigate('seasonal-tendency')}
        >
          <PieChart size={20} />
          Seasonal Tendency
        </button>
        <button 
          className={`menu-item ${currentView === 'all-time-curve' ? 'active' : ''}`}
          onClick={() => onNavigate('all-time-curve')}
        >
          <LineChart size={20} />
          All-Time Curve
        </button>
        <button 
          className={`menu-item ${currentView === 'half-month-edge' ? 'active' : ''}`}
          onClick={() => onNavigate('half-month-edge')}
        >
          <SplitSquareHorizontal size={20} />
          Half-Month Edge
        </button>
        <button 
          className={`menu-item ${currentView === 'profit-target' ? 'active' : ''}`}
          onClick={() => onNavigate('profit-target')}
        >
          <Target size={20} />
          Target Probabilities
        </button>
        <button 
          className={`menu-item ${currentView === 'payout-simulation' ? 'active' : ''}`}
          onClick={() => onNavigate('payout-simulation')}
        >
          <Target size={20} />
          Payout Simulator
        </button>
        <button 
          className={`menu-item ${currentView === 'real-payout-simulation' ? 'active' : ''}`}
          onClick={() => onNavigate('real-payout-simulation')}
        >
          <Target size={20} />
          Real Payout Prob
        </button>

        <button 
          className="menu-item"
          onClick={() => setIsSavedMonthsOpen(!isSavedMonthsOpen)}
          style={{ justifyContent: 'space-between', paddingRight: '12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Folder size={20} />
            Saved Months
          </div>
          <ChevronDown 
            size={16} 
            style={{ 
              transform: isSavedMonthsOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease'
            }} 
          />
        </button>
      </div>

      {isSavedMonthsOpen && (
        <div className="sidebar-list">
          {monthsData.length === 0 ? (
            <p style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>No months recorded yet.</p>
          ) : (
          [...monthsData].sort((a, b) => {
            const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const yearDiff = Number(a.year) - Number(b.year);
            if (yearDiff !== 0) return yearDiff;
            return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
          }).map((data, idx) => {
            const isActive = currentSelection && currentSelection.id === data.id && currentView === 'monthly';
            const rValues = data.data ? data.data.map(d => d.cumulativeR) : [];
            const endR = rValues.length > 0 ? rValues[rValues.length - 1] : 0;

            return (
              <div 
                key={data.id} 
                className={`month-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(data)}
              >
                <div className="month-card-header">
                  <span>{data.month} {data.year}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(data.id);
                    }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: isActive ? 'white' : '#ff6b6b',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  marginTop: '5px', 
                  color: isActive ? 'rgba(255,255,255,0.9)' : (endR >= 0 ? 'var(--secondary)' : 'var(--primary)'),
                  fontWeight: 700 
                }}>
                  Final: {endR > 0 ? '+' : ''}{endR}R
                </div>
              </div>
            );
          })
        )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
