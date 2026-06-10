import React, { useState } from 'react';
import { BarChart2, LayoutGrid, Trash2, CalendarDays, TrendingUp, Activity, PieChart, LineChart, SplitSquareHorizontal, Target, Folder, ChevronDown, CalendarCheck, PenTool, Newspaper, Settings, Plus, X } from 'lucide-react';

const Sidebar = ({ 
  monthsData, 
  onSelect, 
  onDelete, 
  onNavigate, 
  currentSelection, 
  currentView,
  strategies,
  setStrategies,
  activeStrategy,
  setActiveStrategy
}) => {
  const [isSavedMonthsOpen, setIsSavedMonthsOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleAddStrategy = () => {
    if (!newStrategyName.trim()) return;
    const newId = 'strat_' + Date.now().toString();
    const updated = [...strategies, { id: newId, name: newStrategyName.trim() }];
    setStrategies(updated);
    setNewStrategyName('');
    setActiveStrategy(newId);
  };

  const handleRenameStrategy = (id) => {
    if (!editingName.trim()) return;
    const updated = strategies.map(s => s.id === id ? { ...s, name: editingName.trim() } : s);
    setStrategies(updated);
    setEditingId(null);
  };

  const handleDeleteStrategy = (id) => {
    if (strategies.length <= 1) return;
    if (confirm("Are you sure you want to delete this strategy? Files associated with it will still exist but default back to Strategy 1.")) {
      const updated = strategies.filter(s => s.id !== id);
      setStrategies(updated);
      if (activeStrategy === id) {
        setActiveStrategy(updated[0].id);
      }
    }
  };

  return (
    <div className="sidebar">
      <div style={{ marginBottom: '15px', textAlign: 'center' }}>
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

      {/* Strategy Switcher */}
      <div style={{
        marginBottom: '15px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Strategy</span>
          <button 
            onClick={() => setIsManageModalOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
              borderRadius: '6px', transition: 'all 0.2s'
            }}
            title="Manage Strategies"
          >
            <Settings size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <select
            value={activeStrategy}
            onChange={(e) => setActiveStrategy(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.1)',
              backgroundColor: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'var(--primary)',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            {strategies.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="combined" style={{ fontWeight: 800, color: 'var(--secondary)' }}>All Strategies (Combined)</option>
          </select>
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
          className={`menu-item ${currentView === 'monthly-payout-plan' ? 'active' : ''}`}
          onClick={() => onNavigate('monthly-payout-plan')}
        >
          <CalendarCheck size={20} />
          Monthly Payout Plan
        </button>
        <button 
          className={`menu-item ${currentView === 'whiteboard' ? 'active' : ''}`}
          onClick={() => onNavigate('whiteboard')}
        >
          <PenTool size={20} />
          Whiteboard
        </button>
        <button 
          className={`menu-item ${currentView === 'news-events' ? 'active' : ''}`}
          onClick={() => onNavigate('news-events')}
        >
          <Newspaper size={20} />
          News Events
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
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{data.month} {data.year}</span>
                    {activeStrategy === 'combined' && (
                      <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 700, color: isActive ? 'white' : 'var(--secondary)', marginTop: '2px' }}>
                        {data.strategyName}
                      </span>
                    )}
                  </span>
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

      {/* Strategy Management Modal */}
      {isManageModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }} onClick={() => { setIsManageModalOpen(false); setEditingId(null); }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            width: '400px',
            maxWidth: '95%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800, fontSize: '1.2rem' }}>Manage Strategies</h3>
              <button 
                onClick={() => { setIsManageModalOpen(false); setEditingId(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* List of Strategies */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
              {strategies.map(s => (
                <div key={s.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: '#f9fafb', borderRadius: '12px',
                  border: '1px solid #f3f4f6'
                }}>
                  {editingId === s.id ? (
                    <input 
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      style={{
                        flex: 1, padding: '4px 8px', borderRadius: '6px',
                        border: '1px solid var(--secondary)', outline: 'none', fontWeight: 700, fontSize: '0.85rem'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameStrategy(s.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{s.name}</span>
                  )}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {editingId === s.id ? (
                      <>
                        <button 
                          onClick={() => handleRenameStrategy(s.id)}
                          style={{ background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          style={{ background: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => { setEditingId(s.id); setEditingName(s.name); }}
                          style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Rename
                        </button>
                        {strategies.length > 1 && (
                          <button 
                            onClick={() => handleDeleteStrategy(s.id)}
                            style={{ background: 'none', border: 'none', color: '#ff6b6b', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Strategy */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <input 
                type="text" 
                placeholder="New Strategy Name..."
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '10px',
                  border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.85rem'
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddStrategy(); }}
              />
              <button 
                onClick={handleAddStrategy}
                style={{
                  background: 'var(--secondary)', color: 'white', border: 'none',
                  borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '4px',
                  fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
