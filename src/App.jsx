import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import MonthsPerformanceView from './components/MonthsPerformanceView';
import SeasonalTendencyView from './components/SeasonalTendencyView';
import AllTimeCurveView from './components/AllTimeCurveView';
import HalfMonthEdgeView from './components/HalfMonthEdgeView';
import ProfitTargetView from './components/ProfitTargetView';
import PayoutSimulationView from './components/PayoutSimulationView';
import RealPayoutSimulationView from './components/RealPayoutSimulationView';
import MonthlyPayoutPlanView from './components/MonthlyPayoutPlanView';
import WhiteboardView from './components/WhiteboardView';
import NewsEventsView from './components/NewsEventsView';
import { supabase } from './supabaseClient';
import { fetchNewsEvents, seedIfEmpty, alignNewsImpacts } from './supabase/newsEventsService';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FOMC_DATES = new Set(['2023-02-01','2023-03-22','2023-05-03','2023-06-14','2023-07-26','2023-09-20','2023-11-01','2023-12-13','2024-01-31','2024-03-20','2024-05-01','2024-06-12','2024-07-31','2024-09-18','2024-11-07','2024-12-18','2025-01-29','2025-03-19','2025-05-07','2025-06-18','2025-07-30','2025-09-17','2025-10-29','2025-12-10']);
const CPI_DATES = new Set(['2023-01-12','2023-02-14','2023-03-14','2023-04-12','2023-05-10','2023-06-13','2023-07-12','2023-08-10','2023-09-13','2023-10-12','2023-11-14','2023-12-12','2024-01-11','2024-02-13','2024-03-12','2024-04-10','2024-05-15','2024-06-12','2024-07-11','2024-08-14','2024-09-11','2024-10-10','2024-11-13','2024-12-11','2025-01-15','2025-02-12','2025-03-12','2025-04-10','2025-05-13','2025-06-11','2025-07-15','2025-08-12','2025-09-11','2025-10-24','2025-12-18']);
const NFP_DATES = new Set(['2023-01-06','2023-02-03','2023-03-10','2023-04-07','2023-05-05','2023-06-02','2023-07-07','2023-08-04','2023-09-01','2023-10-06','2023-11-03','2023-12-08','2024-01-05','2024-02-02','2024-03-08','2024-04-05','2024-05-03','2024-06-07','2024-07-05','2024-08-02','2024-09-06','2024-10-04','2024-11-01','2024-12-06','2025-01-10','2025-02-07','2025-03-07','2025-04-04','2025-05-02','2025-06-06','2025-07-03','2025-08-01','2025-09-05']);

function App() {
  const [monthsData, setMonthsData] = useState([]);
  const [tradesData, setTradesData] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('monthly');
  const [selectedCaseForModal, setSelectedCaseForModal] = useState(null);
  // Global filter toggles (affect all analytics views)
  const [excludeFOMC, setExcludeFOMC] = useState(false);
  const [excludeFridays, setExcludeFridays] = useState(false);
  const [excludeRed,    setExcludeRed]    = useState(false);
  const [excludeOrange, setExcludeOrange] = useState(false);
  const [excludeYellow, setExcludeYellow] = useState(false);

  // News events state
  const [newsEvents, setNewsEvents] = useState([]);

  // Views where the global filter bar should appear
  const FILTER_VIEWS = new Set(['gallery','calendar','analytics','months-performance','seasonal-tendency','all-time-curve','half-month-edge','profit-target']);
  const showFilterBar = FILTER_VIEWS.has(view);

  // ── Build impact date sets from newsEvents (Hierarchical & Exclusive Classification) ──
  const newsDates = React.useMemo(() => {
    const dateMap = {};
    newsEvents.forEach(e => {
      if (!dateMap[e.date]) dateMap[e.date] = new Set();
      dateMap[e.date].add(e.impact);
    });

    const red = new Set();
    const orange = new Set();
    const yellow = new Set();

    Object.entries(dateMap).forEach(([date, impacts]) => {
      if (impacts.has('red')) {
        red.add(date);
      } else if (impacts.has('orange')) {
        orange.add(date);
      } else if (impacts.has('yellow')) {
        yellow.add(date);
      }
    });

    return { red, orange, yellow };
  }, [newsEvents]);

  // ── Load news events (with auto-seed & standard alignment) ────────────────
  useEffect(() => {
    async function loadNews() {
      try {
        await seedIfEmpty();
        await alignNewsImpacts(); // Auto-align existing event impacts to match red folders
      } catch (err) {
        console.warn('News events seeding or alignment skipped/failed (check Supabase RLS policies):', err.message);
      }
      try {
        const data = await fetchNewsEvents();
        setNewsEvents(data);
      } catch (err) {
        console.error('Fetching news events failed:', err.message);
      }
    }
    loadNews();
  }, []);

  const refreshNewsEvents = async () => {
    try {
      const data = await fetchNewsEvents();
      setNewsEvents(data);
    } catch (err) { console.error(err); }
  };

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both tables in parallel
        const [curvesResult, tradesResult] = await Promise.all([
          supabase.from('equity_curves').select('*').order('created_at', { ascending: true }),
          supabase.from('trades').select('*').order('trade_date', { ascending: true })
        ]);
        
        if (curvesResult.error) throw curvesResult.error;
        if (tradesResult.error) throw tradesResult.error;

        if (tradesResult.data) {
          setTradesData(tradesResult.data);
        }

        if (curvesResult.data) {
          const formattedData = curvesResult.data.map(item => ({
            id: item.id,
            month: item.month,
            year: item.year,
            imageUrl: item.image_url,
            // We NO LONGER use the JSON data from equity_curves. 
            // We will derive it dynamically from tradesResult.data below.
          }));
          setMonthsData(formattedData);
        }
      } catch (error) {
        console.error('Error fetching data from Supabase:', error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Compute enrichedMonthsData which injects tradesData into monthsData
  const enrichedMonthsData = React.useMemo(() => {
    return monthsData.map(monthEntry => {
      const monthTrades = tradesData.filter(t => t.equity_curve_id === monthEntry.id);
      
      monthTrades.sort((a, b) => {
        if (a.trade_date && b.trade_date) return new Date(a.trade_date) - new Date(b.trade_date);
        return 0;
      });

      let cumulativeR = 0;
      const dataForUI = monthTrades.map((t, idx) => {
        cumulativeR += (t.r_value || 0);
        cumulativeR = Math.round(cumulativeR * 100) / 100;
        return {
          id: idx + 1,
          originalText: t.original_text,
          rValueStr: String(t.r_value || 0),
          rValue: t.r_value || 0,
          cumulativeR: cumulativeR
        };
      });

      return {
        ...monthEntry,
        data: dataForUI
      };
    });
  }, [monthsData, tradesData]);

  // Filtered trades (respects all global toggles)
  const filteredTradesData = React.useMemo(() => {
    let result = tradesData;
    if (excludeFOMC)    result = result.filter(t => !t.is_fomc);
    if (excludeFridays) result = result.filter(t => t.day_of_week !== 5);
    if (excludeRed)    result = result.filter(t => !newsDates.red.has(t.trade_date));
    if (excludeOrange) result = result.filter(t => !newsDates.orange.has(t.trade_date));
    if (excludeYellow) result = result.filter(t => !newsDates.yellow.has(t.trade_date));
    return result;
  }, [tradesData, excludeFOMC, excludeFridays, excludeRed, excludeOrange, excludeYellow, newsDates]);

  // Build filtered enriched months from filteredTradesData
  const buildEnrichedMonths = (sourceTrades) => monthsData.map(monthEntry => {
    const monthTrades = sourceTrades.filter(t => t.equity_curve_id === monthEntry.id);
    monthTrades.sort((a, b) => {
      if (a.trade_date && b.trade_date) return new Date(a.trade_date) - new Date(b.trade_date);
      return 0;
    });
    let cumulativeR = 0;
    const dataForUI = monthTrades.map((t, idx) => {
      cumulativeR += (t.r_value || 0);
      cumulativeR = Math.round(cumulativeR * 100) / 100;
      return { id: idx + 1, originalText: t.original_text, rValueStr: String(t.r_value || 0), rValue: t.r_value || 0, cumulativeR };
    });
    return { ...monthEntry, data: dataForUI };
  });

  const filteredEnrichedMonthsData = React.useMemo(
    () => buildEnrichedMonths(filteredTradesData),
    [monthsData, filteredTradesData]
  );

  // Sync to local storage as a backup
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('equityData', JSON.stringify(enrichedMonthsData));
    }
  }, [enrichedMonthsData, isLoading]);

  const syncTradesToDB = async (equityCurveId, month, year, data) => {
    // 1. Delete existing trades for this equity curve
    await supabase.from('trades').delete().eq('equity_curve_id', equityCurveId);
    
    // 2. Prepare new rows
    if (!data || data.length === 0) return [];
    
    const newTrades = data.map((t, idx) => {
      let dateStr = null;
      let dayOfWeek = null;
      
      const match = (t.originalText || '').match(/(\d{1,2})[-/\s]([A-Za-z]{3})/);
      if (match) {
        const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(month);
        const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        if (monthIndex !== -1 && match[2].toLowerCase() === shortMonths[monthIndex].toLowerCase()) {
          const day = parseInt(match[1]);
          const mm = String(monthIndex + 1).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          dateStr = `${year}-${mm}-${dd}`;
          dayOfWeek = new Date(parseInt(year), monthIndex, day).getDay();
        }
      }
      
      return {
        id: crypto.randomUUID ? crypto.randomUUID() : (Date.now() + Math.random() + idx).toString(),
        equity_curve_id: equityCurveId,
        month_name: month,
        year_value: String(year),
        original_text: t.originalText,
        r_value: t.rValue,
        trade_date: dateStr,
        day_of_week: dayOfWeek,
        day_name: dayOfWeek !== null ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek] : null,
        is_fomc: dateStr ? FOMC_DATES.has(dateStr) : false,
        is_cpi: dateStr ? CPI_DATES.has(dateStr) : false,
        is_nfp: dateStr ? NFP_DATES.has(dateStr) : false
      };
    });

    // 3. Insert new rows
    if (newTrades.length > 0) {
      await supabase.from('trades').insert(newTrades);
    }
    
    return newTrades;
  };

  const handleAddData = async (newData) => {
    const entry = { ...newData, id: Date.now().toString() + Math.random().toString() };
    
    // 1. Instantly update UI (Optimistic update)
    setMonthsData((prev) => [...prev, entry]);
    setCurrentSelection(entry);

    // 2. Save to Supabase behind the scenes
    try {
      const { error } = await supabase
        .from('equity_curves')
        .insert([{
          id: entry.id,
          month: entry.month,
          year: entry.year,
          image_url: entry.imageUrl, // The base64 image string is saved perfectly here!
          data: entry.data
        }]);
        
      if (error) throw error;
      
      const parsedTrades = await syncTradesToDB(entry.id, entry.month, entry.year, entry.data);
      setTradesData((prev) => [...prev, ...parsedTrades]);
    } catch (error) {
      console.error('Error saving to Supabase:', error.message);
      alert('Note: Failed to save to Supabase Database (is the table created?), but it is saved locally!');
    }
  };

  const handleUpdateData = async (id, updatedData) => {
    // 1. Instantly update UI (Optimistic Update)
    setMonthsData((prev) => prev.map(m => m.id === id ? { ...m, ...updatedData } : m));
    if (currentSelection && currentSelection.id === id) {
      setCurrentSelection({ ...currentSelection, ...updatedData });
    }

    // 2. Save to Supabase
    try {
      const { error } = await supabase
        .from('equity_curves')
        .update({
          month: updatedData.month,
          year: updatedData.year,
          image_url: updatedData.imageUrl,
          data: updatedData.data
        })
        .eq('id', id);
        
      if (error) return error.message;
      
      const parsedTrades = await syncTradesToDB(id, updatedData.month, updatedData.year, updatedData.data);
      setTradesData((prev) => {
        const filtered = prev.filter(t => t.equity_curve_id !== id);
        return [...filtered, ...parsedTrades];
      });
      
      return null;
    } catch (error) {
      console.error('Error updating Supabase:', error.message);
      return error.message;
    }
  };

  const handleNavigate = (newView) => {
    setView(newView);
    if (newView === 'monthly') setCurrentSelection(null);
  };

  const handleNextCase = () => {
    if (!selectedCaseForModal) return;
    const currentIndex = monthsData.findIndex(m => m.id === selectedCaseForModal.id);
    const nextIndex = (currentIndex + 1) % monthsData.length;
    setSelectedCaseForModal(monthsData[nextIndex]);
  };

  const handlePrevCase = () => {
    if (!selectedCaseForModal) return;
    const currentIndex = monthsData.findIndex(m => m.id === selectedCaseForModal.id);
    const prevIndex = (currentIndex - 1 + monthsData.length) % monthsData.length;
    setSelectedCaseForModal(monthsData[prevIndex]);
  };

  const handleDeleteData = async (id) => {
    // 1. Instantly remove from UI
    setMonthsData((prev) => prev.filter(m => m.id !== id));
    if (currentSelection && currentSelection.id === id) {
      setCurrentSelection(null);
    }

    // 2. Delete from Supabase
    try {
      // First delete from trades table (or rely on CASCADE if setup)
      await supabase.from('trades').delete().eq('equity_curve_id', id);
      setTradesData(prev => prev.filter(t => t.equity_curve_id !== id));

      const { error } = await supabase
        .from('equity_curves')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting from Supabase:', error.message);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontWeight: 800, color: 'var(--primary)', fontSize: '1.5rem' }}>Loading Gallery...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar 
        monthsData={enrichedMonthsData} 
        currentSelection={currentSelection} 
        onSelect={(data) => { setView('monthly'); setCurrentSelection(data); }} 
        onDelete={handleDeleteData}
        currentView={view}
        onNavigate={handleNavigate}
      />
      
      <div className="main-content">

        {/* ── Global Filter Bar ── */}
        {showFilterBar && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 20px', background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            flexShrink: 0, flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Filters:</span>
            {/* FOMC Toggle */}
            <button
              onClick={() => setExcludeFOMC(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 14px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                transition: 'all 0.2s',
                background: excludeFOMC ? '#f59e0b' : '#f3f4f6',
                color: excludeFOMC ? '#fff' : '#6b7280',
                boxShadow: excludeFOMC ? '0 2px 8px rgba(245,158,11,0.35)' : 'none'
              }}
            >
              <span style={{ fontSize: '0.95em' }}>📅</span>
              FOMC Days {excludeFOMC ? 'Excluded' : 'Included'}
            </button>
            {/* Friday Toggle */}
            <button
              onClick={() => setExcludeFridays(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 14px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                transition: 'all 0.2s',
                background: excludeFridays ? '#8b5cf6' : '#f3f4f6',
                color: excludeFridays ? '#fff' : '#6b7280',
                boxShadow: excludeFridays ? '0 2px 8px rgba(139,92,246,0.35)' : 'none'
              }}
            >
              <span style={{ fontSize: '0.95em' }}>🗓️</span>
              Fridays {excludeFridays ? 'Excluded' : 'Included'}
            </button>
            {/* Red News Toggle */}
            <button
              onClick={() => setExcludeRed(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 14px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                transition: 'all 0.2s',
                background: excludeRed ? '#ef4444' : '#f3f4f6',
                color: excludeRed ? '#fff' : '#6b7280',
                boxShadow: excludeRed ? '0 2px 8px rgba(239,68,68,0.35)' : 'none'
              }}
            >
              🔴 Red News {excludeRed ? 'Excluded' : 'Included'}
            </button>
            {/* Orange News Toggle */}
            <button
              onClick={() => setExcludeOrange(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 14px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                transition: 'all 0.2s',
                background: excludeOrange ? '#f97316' : '#f3f4f6',
                color: excludeOrange ? '#fff' : '#6b7280',
                boxShadow: excludeOrange ? '0 2px 8px rgba(249,115,22,0.35)' : 'none'
              }}
            >
              🟠 Orange News {excludeOrange ? 'Excluded' : 'Included'}
            </button>
            {/* Yellow News Toggle */}
            <button
              onClick={() => setExcludeYellow(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 14px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                transition: 'all 0.2s',
                background: excludeYellow ? '#eab308' : '#f3f4f6',
                color: excludeYellow ? '#fff' : '#6b7280',
                boxShadow: excludeYellow ? '0 2px 8px rgba(234,179,8,0.35)' : 'none'
              }}
            >
              🟡 Yellow News {excludeYellow ? 'Excluded' : 'Included'}
            </button>
            {(excludeFOMC || excludeFridays || excludeRed || excludeOrange || excludeYellow) && (
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 4 }}>
                {[
                  excludeFOMC && 'FOMC',
                  excludeFridays && 'Fridays',
                  excludeRed && 'Red News',
                  excludeOrange && 'Orange News',
                  excludeYellow && 'Yellow News'
                ].filter(Boolean).join(' + ')} removed from stats
              </span>
            )}
          </div>
        )}

        {view === 'monthly' && (
          <MainArea 
            key={currentSelection?.id || 'new'}
            currentSelection={enrichedMonthsData.find(m => m.id === currentSelection?.id) || currentSelection} 
            onAddData={handleAddData} 
            onUpdateData={handleUpdateData}
            onNewInput={() => setCurrentSelection(null)}
          />
        )}

        {view === 'gallery' && (
          <div className="gallery-container">
             <div className="gallery-header">
                <h1 style={{ color: 'var(--primary)', fontWeight: 800 }}>Equity Curve Gallery</h1>
                <p style={{ color: 'var(--text-light)' }}>Visual overview of all your trading months</p>
             </div>
             <div className="gallery-grid">
                {filteredEnrichedMonthsData.map(data => (
                  <div key={data.id} className="gallery-card" onClick={() => setSelectedCaseForModal(data)}>
                    <div className="gallery-card-chart">
                      <MainArea key={data.id} currentSelection={data} isPreview={true} />
                    </div>
                    <div className="gallery-card-info">
                      <h3>{data.month} {data.year}</h3>
                      <span className={`r-badge ${data.data && data.data.length > 0 && data.data[data.data.length-1].cumulativeR >= 0 ? 'positive' : 'negative'}`}>
                        {data.data && data.data.length > 0 ? (data.data[data.data.length-1].cumulativeR > 0 ? '+' : '') + data.data[data.data.length-1].cumulativeR : 0}R
                      </span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {view === 'calendar' && (
          <CalendarView monthsData={filteredEnrichedMonthsData} />
        )}

        {view === 'analytics' && (
          <AnalyticsView tradesData={filteredTradesData} />
        )}

        {view === 'months-performance' && (
          <MonthsPerformanceView tradesData={filteredTradesData} />
        )}

        {view === 'seasonal-tendency' && (
          <SeasonalTendencyView monthsData={filteredEnrichedMonthsData} />
        )}

        {view === 'all-time-curve' && (
          <AllTimeCurveView monthsData={filteredEnrichedMonthsData} />
        )}

        {view === 'half-month-edge' && (
          <HalfMonthEdgeView monthsData={filteredEnrichedMonthsData} />
        )}

        {view === 'profit-target' && (
          <ProfitTargetView monthsData={filteredEnrichedMonthsData} />
        )}

        {view === 'payout-simulation' && (
          <PayoutSimulationView tradesData={tradesData} />
        )}

        {view === 'real-payout-simulation' && (
          <RealPayoutSimulationView tradesData={tradesData} />
        )}

        {view === 'monthly-payout-plan' && (
          <MonthlyPayoutPlanView tradesData={tradesData} />
        )}

        {view === 'whiteboard' && (
          <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <WhiteboardView />
          </div>
        )}

        {view === 'news-events' && (
          <NewsEventsView
            newsEvents={newsEvents}
            tradesData={tradesData}
            onRefresh={refreshNewsEvents}
          />
        )}
      </div>

      {/* Image Modal Lightbox */}
      {selectedCaseForModal && (
        <div className="modal-overlay" onClick={() => setSelectedCaseForModal(null)}>
          <button 
            className="modal-nav-btn prev" 
            onClick={(e) => { e.stopPropagation(); handlePrevCase(); }}
            title="Previous Curve"
          >
            <ChevronLeft size={32} />
          </button>
          
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCaseForModal(null)}>&times;</button>
            <div className="modal-header">
              <h2>{selectedCaseForModal.month} {selectedCaseForModal.year} - Equity Curve</h2>
            </div>
            <div className="modal-body">
              <MainArea key={selectedCaseForModal.id} currentSelection={selectedCaseForModal} isPreview={true} isExpanded={true} />
            </div>
          </div>

          <button 
            className="modal-nav-btn next" 
            onClick={(e) => { e.stopPropagation(); handleNextCase(); }}
            title="Next Curve"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
