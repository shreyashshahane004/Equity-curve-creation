import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import { supabase } from './supabaseClient';

function App() {
  const [monthsData, setMonthsData] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
            data: item.data
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
        onSelect={setCurrentSelection} 
        onDelete={handleDeleteData}
      />
      <MainArea 
        currentSelection={currentSelection} 
        onAddData={handleAddData} 
        onNewInput={() => setCurrentSelection(null)}
      />
    </div>
  );
}

export default App;
