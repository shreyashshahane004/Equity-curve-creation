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
import { supabase } from './supabaseClient';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function App() {
  const [monthsData, setMonthsData] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('monthly'); // 'monthly', 'gallery', or 'calendar'
  const [selectedCaseForModal, setSelectedCaseForModal] = useState(null);

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('equity_curves')
          .select('*')
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        // Map snake_case from DB back to camelCase for our app
        if (data) {
          const formattedData = data.map(item => ({
            id: item.id,
            month: item.month,
            year: item.year,
            imageUrl: item.image_url,
            data: typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || [])
          }));
          setMonthsData(formattedData);
        }
      } catch (error) {
        console.error('Error fetching data from Supabase:', error.message);
        // Fallback to local storage if Supabase fails or isn't set up yet
        const saved = localStorage.getItem('equityData');
        if (saved) setMonthsData(JSON.parse(saved));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Sync to local storage as a backup
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('equityData', JSON.stringify(monthsData));
    }
  }, [monthsData, isLoading]);

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
        monthsData={monthsData} 
        currentSelection={currentSelection} 
        onSelect={(data) => { setView('monthly'); setCurrentSelection(data); }} 
        onDelete={handleDeleteData}
        currentView={view}
        onNavigate={handleNavigate}
      />
      
      <div className="main-content">
        {view === 'monthly' && (
          <MainArea 
            key={currentSelection?.id || 'new'}
            currentSelection={currentSelection} 
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
                {monthsData.map(data => (
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
          <CalendarView monthsData={monthsData} />
        )}

        {view === 'analytics' && (
          <AnalyticsView monthsData={monthsData} />
        )}

        {view === 'months-performance' && (
          <MonthsPerformanceView monthsData={monthsData} />
        )}

        {view === 'seasonal-tendency' && (
          <SeasonalTendencyView monthsData={monthsData} />
        )}

        {view === 'all-time-curve' && (
          <AllTimeCurveView monthsData={monthsData} />
        )}

        {view === 'half-month-edge' && (
          <HalfMonthEdgeView monthsData={monthsData} />
        )}

        {view === 'profit-target' && (
          <ProfitTargetView monthsData={monthsData} />
        )}

        {view === 'payout-simulation' && (
          <PayoutSimulationView monthsData={monthsData} />
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
