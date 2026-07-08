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
import AccountPassingView from './components/AccountPassingView';
import AddingThingsView from './components/AddingThingsView';
import WhiteboardView from './components/WhiteboardView';
import NewsEventsView from './components/NewsEventsView';
import { supabase } from './supabaseClient';
import calendarData from './data/calendar_export_1781767459304.json';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';

// Weekday options configuration
const WEEKDAY_OPTIONS = [
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
];

const GlobalFilterPanel = ({
  open,
  onClose,
  commonMonthsOnly,
  setCommonMonthsOnly,
  activeDays,
  setActiveDays,
  hasMultipleStrategies,
  anchorRef,
}) => {
  const panelRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const toggleDay = (idx) => {
    setActiveDays(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const allDaysOn = WEEKDAY_OPTIONS.every(d => activeDays.has(d.index));
  const toggleAllDays = () => {
    if (allDaysOn) {
      setActiveDays(new Set([1])); // keep Monday minimum
    } else {
      setActiveDays(new Set([1, 2, 3, 4, 5]));
    }
  };

  const activeFilterCount = (commonMonthsOnly ? 1 : 0) + (allDaysOn ? 0 : 1);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: '100%',
        right: 20,
        marginTop: 8,
        width: 320,
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07)',
        border: '1px solid #f0f0f4',
        padding: '20px 20px 18px',
        zIndex: 999,
        animation: 'global-panel-in 0.18s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlidersHorizontal size={15} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#292F36', letterSpacing: '0.02em' }}>
            Advanced Filters
          </span>
          {activeFilterCount > 0 && (
            <span style={{
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '50%',
              width: 18, height: 18,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.68rem', fontWeight: 800
            }}>{activeFilterCount}</span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, display: 'flex', alignItems: 'center' }}
        >
          <X size={15} />
        </button>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Strategy Overlap
        </div>
        <button
          onClick={() => setCommonMonthsOnly(v => !v)}
          disabled={!hasMultipleStrategies}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 12,
            border: `1.5px solid ${commonMonthsOnly ? 'var(--primary)' : '#e5e7eb'}`,
            cursor: hasMultipleStrategies ? 'pointer' : 'not-allowed',
            background: commonMonthsOnly ? 'rgba(67,198,172,0.07)' : '#fafafa',
            transition: 'all 0.2s',
            textAlign: 'left',
            opacity: hasMultipleStrategies ? 1 : 0.45,
          }}
        >
          <div style={{
            width: 38, height: 22,
            background: commonMonthsOnly ? 'var(--primary)' : '#d1d5db',
            borderRadius: 11,
            position: 'relative',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute',
              top: 3, left: commonMonthsOnly ? 19 : 3,
              width: 16, height: 16,
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              transition: 'left 0.18s',
            }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#292F36' }}>
              Common Months Only
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>
              Only months present in all strategies
            </div>
          </div>
        </button>
      </div>

      <div style={{ height: 1, background: '#f3f4f6', marginBottom: 18 }} />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Days of Week
          </span>
          <button
            onClick={toggleAllDays}
            style={{
              fontSize: '0.7rem', fontWeight: 700,
              color: allDaysOn ? '#9ca3af' : 'var(--primary)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
            }}
          >
            {allDaysOn ? 'Clear All' : 'Select All'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {WEEKDAY_OPTIONS.map(({ index, label }) => {
            const isOn = activeDays.has(index);
            return (
              <button
                key={index}
                onClick={() => toggleDay(index)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: 10,
                  border: `1.5px solid ${isOn ? 'var(--primary)' : '#e5e7eb'}`,
                  background: isOn ? 'rgba(67,198,172,0.09)' : '#fafafa',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  color: isOn ? 'var(--primary)' : '#9ca3af',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{label}</span>
                <div style={{
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: isOn ? 'var(--primary)' : '#e5e7eb',
                  transition: 'background 0.15s',
                }} />
              </button>
            );
          })}
        </div>

        {!allDaysOn && (
          <div style={{
            marginTop: 10,
            padding: '7px 12px',
            background: 'rgba(67,198,172,0.07)',
            borderRadius: 8,
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--primary)',
          }}>
            Showing: {WEEKDAY_OPTIONS.filter(d => activeDays.has(d.index)).map(d => d.label).join(', ')} trades only
          </div>
        )}
      </div>
    </div>
  );
};

const HamburgerBtn = ({ onClick, hasActiveFilters, btnRef }) => (
  <button
    ref={btnRef}
    onClick={onClick}
    title="Advanced Filters"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '8px 10px',
      borderRadius: 10,
      border: `1.5px solid ${hasActiveFilters ? 'var(--primary)' : '#e5e7eb'}`,
      background: hasActiveFilters ? 'rgba(67,198,172,0.08)' : 'white',
      cursor: 'pointer',
      position: 'relative',
      transition: 'all 0.18s',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto',
    }}
  >
    {[0, 1, 2].map(i => (
      <span
        key={i}
        style={{
          display: 'block',
          width: i === 1 ? 14 : 18,
          height: 2,
          borderRadius: 2,
          background: hasActiveFilters ? 'var(--primary)' : '#9ca3af',
          transition: 'all 0.18s',
        }}
      />
    ))}
    {hasActiveFilters && (
      <span style={{
        position: 'absolute',
        top: -4, right: -4,
        width: 10, height: 10,
        background: 'var(--primary)',
        borderRadius: '50%',
        border: '2px solid white',
      }} />
    )}
  </button>
);

const FOMC_DATES = new Set(['2023-02-01','2023-03-22','2023-05-03','2023-06-14','2023-07-26','2023-09-20','2023-11-01','2023-12-13','2024-01-31','2024-03-20','2024-05-01','2024-06-12','2024-07-31','2024-09-18','2024-11-07','2024-12-18','2025-01-29','2025-03-19','2025-05-07','2025-06-18','2025-07-30','2025-09-17','2025-10-29','2025-12-10']);
const CPI_DATES = new Set(['2023-01-12','2023-02-14','2023-03-14','2023-04-12','2023-05-10','2023-06-13','2023-07-12','2023-08-10','2023-09-13','2023-10-12','2023-11-14','2023-12-12','2024-01-11','2024-02-13','2024-03-12','2024-04-10','2024-05-15','2024-06-12','2024-07-11','2024-08-14','2024-09-11','2024-10-10','2024-11-13','2024-12-11','2025-01-15','2025-02-12','2025-03-12','2025-04-10','2025-05-13','2025-06-11','2025-07-15','2025-08-12','2025-09-11','2025-10-24','2025-12-18']);
const NFP_DATES = new Set(['2023-01-06','2023-02-03','2023-03-10','2023-04-07','2023-05-05','2023-06-02','2023-07-07','2023-08-04','2023-09-01','2023-10-06','2023-11-03','2023-12-08','2024-01-05','2024-02-02','2024-03-08','2024-04-05','2024-05-03','2024-06-07','2024-07-05','2024-08-02','2024-09-06','2024-10-04','2024-11-01','2024-12-06','2025-01-10','2025-02-07','2025-03-07','2025-04-04','2025-05-02','2025-06-06','2025-07-03','2025-08-01','2025-09-05']);

function App() {
  const [strategies, setStrategies] = useState(() => {
    const saved = localStorage.getItem('trading_strategies');
    return saved ? JSON.parse(saved) : [
      { id: 'strat_1', name: 'Strategy 1' },
      { id: 'strat_2', name: 'Strategy 2' }
    ];
  });
  const [activeStrategy, setActiveStrategy] = useState('strat_1');
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
  const [selectedNewsEventName, setSelectedNewsEventName] = useState('');

  // Global custom advanced filters (Common Months & Days of Week)
  const [commonMonthsOnly, setCommonMonthsOnly] = useState(false);
  const [activeDays, setActiveDays] = useState(new Set([1, 2, 3, 4, 5])); // Mon-Fri on by default
  const [globalFilterOpen, setGlobalFilterOpen] = useState(false);
  const filterBtnRef = React.useRef(null);

  // News events state
  const [newsEvents, setNewsEvents] = useState([]);

  // Views where the global filter bar should appear
  const FILTER_VIEWS = new Set(['gallery','calendar','analytics','months-performance','seasonal-tendency','all-time-curve','half-month-edge','profit-target','monthly-payout-plan','account-passing','adding-things']);
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

  // ── Load news events from JSON ──────────────────────────────────────────────
  useEffect(() => {
    const formattedEvents = calendarData.map(e => ({
      id: e.sr_no,
      date: e.news_date,
      time: e.news_time,
      currency: e.currency,
      impact: (e.folder_color || 'gray').toLowerCase(),
      name: e.news_name,
      event_name: e.news_name, // For compatibility with NewsEventsView
      notes: ''
    }));
    setNewsEvents(formattedEvents);
  }, []);

  const refreshNewsEvents = () => {
    // Static JSON doesn't need refresh
  };

  // Extract unique news event names for the dropdown
  const uniqueNewsEventNames = React.useMemo(() => {
    const names = new Set(newsEvents.map(e => e.name).filter(Boolean));
    return Array.from(names).sort();
  }, [newsEvents]);

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchCurves = async () => {
          const { data, error } = await supabase
            .from('equity_curves')
            .select('*')
            .order('created_at', { ascending: true });
          if (error) throw error;
          return data;
        };

        const fetchTrades = async () => {
          let allTrades = [];
          let from = 0;
          const PAGE_SIZE = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from('trades')
              .select('*')
              .order('trade_date', { ascending: true })
              .range(from, from + PAGE_SIZE - 1);

            if (error) throw error;
            if (data && data.length > 0) {
              allTrades = [...allTrades, ...data];
              from += PAGE_SIZE;
              if (data.length < PAGE_SIZE) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
          return allTrades;
        };

        const [curvesData, tradesDataResult] = await Promise.all([
          fetchCurves(),
          fetchTrades()
        ]);

        if (tradesDataResult) {
          setTradesData(tradesDataResult);
        }

        if (curvesData) {
          const formattedData = curvesData.map(item => {
            let parsedData = [];
            try {
               parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || []);
            } catch (e) {
               console.error("Failed to parse JSON for item:", item.id);
            }
            
            // LOGGING FOR DEBUG
            const hasCustom = parsedData.some(t => t.customFields && Object.keys(t.customFields).length > 0);
            if (hasCustom) {
               console.log("FETCHED DATA HAS CUSTOM FIELDS FOR:", item.id, parsedData.find(t => t.customFields && Object.keys(t.customFields).length > 0).customFields);
            }

            return {
              id: item.id,
              month: item.month,
              year: item.year,
              imageUrl: item.image_url,
              strategy: item.strategy || 'strat_1',
              data: parsedData,
            };
          });
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

  // Sync strategies list to localStorage
  useEffect(() => {
    localStorage.setItem('trading_strategies', JSON.stringify(strategies));
  }, [strategies]);

  // Filter raw months by strategy
  const strategyMonthsData = React.useMemo(() => {
    return monthsData.filter(m => {
      if (activeStrategy === 'combined') return true;
      return (m.strategy || 'strat_1') === activeStrategy;
    });
  }, [monthsData, activeStrategy]);

  // Filter raw trades by strategy
  const strategyTradesData = React.useMemo(() => {
    const activeCurveIds = new Set(strategyMonthsData.map(m => m.id));
    return tradesData.filter(t => activeCurveIds.has(t.equity_curve_id));
  }, [tradesData, strategyMonthsData]);

  // Build enriched months from a given set of trades
  const buildEnrichedMonths = React.useCallback((sourceTrades) => {
    if (activeStrategy === 'combined') {
      const grouped = {};
      strategyMonthsData.forEach(monthEntry => {
        const key = `${monthEntry.year}-${monthEntry.month}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: `combined_${key}`,
            month: monthEntry.month,
            year: monthEntry.year,
            strategyName: 'Combined',
            strategy: 'combined',
            curves: [monthEntry.id],
            imageUrl: monthEntry.imageUrl
          };
        } else {
          grouped[key].curves.push(monthEntry.id);
        }
      });

      return Object.values(grouped).map(group => {
        const monthTrades = sourceTrades.filter(t => group.curves.includes(t.equity_curve_id));
        monthTrades.sort((a, b) => {
          if (a.trade_date && b.trade_date) return new Date(a.trade_date) - new Date(b.trade_date);
          return 0;
        });

        let cumulativeR = 0;
        const dataForUI = monthTrades.map((t, idx) => {
          cumulativeR += (t.r_value || 0);
          cumulativeR = Math.round(cumulativeR * 100) / 100;
          
          let customFields = {};
          group.curves.forEach(curveId => {
             const curve = strategyMonthsData.find(c => c.id === curveId);
             if (curve && curve.data) {
                const match = curve.data.find(orig => orig.originalText === t.original_text);
                if (match && match.customFields) customFields = { ...customFields, ...match.customFields };
             }
          });

          return { 
            id: idx + 1, 
            originalText: t.original_text, 
            rValueStr: String(t.r_value || 0), 
            rValue: t.r_value || 0, 
            cumulativeR,
            customFields
          };
        });

        return { ...group, data: dataForUI };
      });
    }

    return strategyMonthsData.map(monthEntry => {
      const monthTrades = sourceTrades.filter(t => t.equity_curve_id === monthEntry.id);
      monthTrades.sort((a, b) => {
        if (a.trade_date && b.trade_date) return new Date(a.trade_date) - new Date(b.trade_date);
        return 0;
      });
      let cumulativeR = 0;
      const jsonTrades = monthEntry.data || [];
      // Keep track of matched indices to handle duplicate exact matches
      const usedIndices = new Set();

      const dataForUI = monthTrades.map((t, idx) => {
        cumulativeR += (t.r_value || 0);
        cumulativeR = Math.round(cumulativeR * 100) / 100;
        
        let originalTrade = null;
        
        // 1. Try to find the exact trade (originalText + rValue) that hasn't been used yet
        const matchIndex = jsonTrades.findIndex((orig, i) => {
           return !usedIndices.has(i) && 
                  orig.originalText === t.original_text && 
                  Number(orig.rValue || 0) === Number(t.r_value || 0);
        });

        if (matchIndex !== -1) {
           originalTrade = jsonTrades[matchIndex];
           usedIndices.add(matchIndex);
        } else {
           // Fallback to purely index-based mapping
           originalTrade = jsonTrades[idx];
           usedIndices.add(idx);
        }
        
        const customFields = originalTrade ? (originalTrade.customFields || {}) : {};

        return { 
          id: idx + 1, 
          originalText: t.original_text, 
          rValueStr: String(t.r_value || 0), 
          rValue: t.r_value || 0, 
          cumulativeR,
          customFields
        };
      });
      const stratObj = strategies.find(s => s.id === monthEntry.strategy);
      const strategyName = stratObj ? stratObj.name : 'Strategy 1';

      return { ...monthEntry, strategyName, data: dataForUI };
    });
  }, [strategyMonthsData, strategies, activeStrategy]);

  // Compute enrichedMonthsData which injects tradesData into monthsData
  const enrichedMonthsData = React.useMemo(() => {
    return buildEnrichedMonths(strategyTradesData);
  }, [buildEnrichedMonths, strategyTradesData]);

  // Compute the set of months (year-month keys) that exist in BOTH strategies
  const commonMonthKeys = React.useMemo(() => {
    const byStrategy = {};
    monthsData.forEach(m => {
      const sid = m.strategy || 'strat_1';
      if (!byStrategy[sid]) byStrategy[sid] = new Set();
      byStrategy[sid].add(`${m.year}-${m.month}`);
    });
    const stratIds = Object.keys(byStrategy);
    if (stratIds.length < 2) return null; // Not enough strategies to intersect
    const [first, ...rest] = stratIds;
    let common = byStrategy[first];
    rest.forEach(sid => {
      common = new Set([...common].filter(k => byStrategy[sid].has(k)));
    });
    return common;
  }, [monthsData]);

  // Filtered trades (respects all global toggles including common months + day filters)
  const filteredTradesData = React.useMemo(() => {
    let result = strategyTradesData;
    if (excludeFOMC)    result = result.filter(t => !t.is_fomc);
    if (excludeFridays) result = result.filter(t => t.day_of_week !== 5);
    if (excludeRed)    result = result.filter(t => !newsDates.red.has(t.trade_date));
    if (excludeOrange) result = result.filter(t => !newsDates.orange.has(t.trade_date));
    if (excludeYellow) result = result.filter(t => !newsDates.yellow.has(t.trade_date));

    // Specific News Event Filter
    if (selectedNewsEventName) {
      const eventDates = new Set(
        newsEvents.filter(e => e.name === selectedNewsEventName).map(e => e.date)
      );
      result = result.filter(t => eventDates.has(t.trade_date));
    }

    // Filter to common months across all strategies
    if (commonMonthsOnly && commonMonthKeys) {
      result = result.filter(t => {
        const curve = monthsData.find(m => m.id === t.equity_curve_id);
        if (!curve) return false;
        return commonMonthKeys.has(`${curve.year}-${curve.month}`);
      });
    }

    // Day of week filter (only keep trades whose day_of_week is in activeDays)
    if (activeDays.size < 7) {
      result = result.filter(t => t.day_of_week !== null && activeDays.has(t.day_of_week));
    }

    return result;
  }, [strategyTradesData, excludeFOMC, excludeFridays, excludeRed, excludeOrange, excludeYellow, newsDates, commonMonthsOnly, commonMonthKeys, activeDays, monthsData]);

  // buildEnrichedMonths is now defined earlier and reused

  const filteredEnrichedMonthsData = React.useMemo(() => {
    let result = buildEnrichedMonths(filteredTradesData);
    if (commonMonthsOnly && commonMonthKeys) {
      result = result.filter(m => commonMonthKeys.has(`${m.year}-${m.month}`));
    }
    return result;
  }, [buildEnrichedMonths, filteredTradesData, commonMonthsOnly, commonMonthKeys]);

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
          data: entry.data,
          strategy: entry.strategy || 'strat_1'
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
      console.log("UPDATING DB. DATA PAYLOAD:", JSON.stringify(updatedData.data).substring(0, 500));
      const { error } = await supabase
        .from('equity_curves')
        .update({
          month: updatedData.month,
          year: updatedData.year,
          image_url: updatedData.imageUrl,
          data: updatedData.data,
          strategy: updatedData.strategy || 'strat_1'
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
    const currentIndex = filteredEnrichedMonthsData.findIndex(m => m.id === selectedCaseForModal.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % filteredEnrichedMonthsData.length;
    setSelectedCaseForModal(filteredEnrichedMonthsData[nextIndex]);
  };

  const handlePrevCase = () => {
    if (!selectedCaseForModal) return;
    const currentIndex = filteredEnrichedMonthsData.findIndex(m => m.id === selectedCaseForModal.id);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + filteredEnrichedMonthsData.length) % filteredEnrichedMonthsData.length;
    setSelectedCaseForModal(filteredEnrichedMonthsData[prevIndex]);
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
        strategies={strategies}
        setStrategies={setStrategies}
        activeStrategy={activeStrategy}
        setActiveStrategy={setActiveStrategy}
      />
      
      <div className="main-content">

        {/* ── Global Filter Bar ── */}
        {showFilterBar && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 20px', background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            flexShrink: 0, flexWrap: 'wrap',
            position: 'relative'
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
            {/* Specific Event Filter Dropdown */}
            <select
              value={selectedNewsEventName}
              onChange={(e) => setSelectedNewsEventName(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '20px',
                border: '1px solid #e5e7eb',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: selectedNewsEventName ? '#fff' : '#6b7280',
                backgroundColor: selectedNewsEventName ? 'var(--primary)' : '#f3f4f6',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: selectedNewsEventName ? '0 2px 8px rgba(67,198,172,0.35)' : 'none',
                maxWidth: '220px'
              }}
            >
              <option value="">📰 All Events</option>
              {uniqueNewsEventNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {(excludeFOMC || excludeFridays || excludeRed || excludeOrange || excludeYellow || selectedNewsEventName) && (
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 4 }}>
                {[
                  excludeFOMC && 'FOMC',
                  excludeFridays && 'Fridays',
                  excludeRed && 'Red News',
                  excludeOrange && 'Orange News',
                  excludeYellow && 'Yellow News'
                ].filter(Boolean).join(' + ')}
                {((excludeFOMC || excludeFridays || excludeRed || excludeOrange || excludeYellow) ? ' removed' : '')}
                {selectedNewsEventName && ` (Only showing: ${selectedNewsEventName})`}
              </span>
            )}

            {/* Global hamburger dropdown trigger */}
            <HamburgerBtn
              btnRef={filterBtnRef}
              hasActiveFilters={commonMonthsOnly || activeDays.size < 5}
              onClick={() => setGlobalFilterOpen(v => !v)}
            />
            <GlobalFilterPanel
              open={globalFilterOpen}
              onClose={() => setGlobalFilterOpen(false)}
              commonMonthsOnly={commonMonthsOnly}
              setCommonMonthsOnly={setCommonMonthsOnly}
              activeDays={activeDays}
              setActiveDays={setActiveDays}
              hasMultipleStrategies={(commonMonthKeys?.size ?? 0) > 0 || strategies.length > 1}
              anchorRef={filterBtnRef}
            />
          </div>
        )}

        {view === 'monthly' && (
          <MainArea 
            key={currentSelection?.id || 'new'}
            currentSelection={enrichedMonthsData.find(m => m.id === currentSelection?.id) || currentSelection} 
            onAddData={handleAddData} 
            onUpdateData={handleUpdateData}
            onNewInput={() => setCurrentSelection(null)}
            strategies={strategies}
            activeStrategy={activeStrategy}
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
          <PayoutSimulationView tradesData={strategyTradesData} />
        )}

        {view === 'real-payout-simulation' && (
          <RealPayoutSimulationView tradesData={strategyTradesData} />
        )}

        {view === 'monthly-payout-plan' && (
          <MonthlyPayoutPlanView tradesData={filteredTradesData} />
        )}

        {view === 'account-passing' && (
          <AccountPassingView monthsData={filteredEnrichedMonthsData} />
        )}

        {view === 'adding-things' && (
          <AddingThingsView 
            monthsData={enrichedMonthsData} 
            strategies={strategies}
            activeStrategy={activeStrategy}
            setActiveStrategy={setActiveStrategy}
            onUpdateData={handleUpdateData}
          />
        )}

        {view === 'whiteboard' && (
          <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <WhiteboardView />
          </div>
        )}

        {view === 'news-events' && (
          <NewsEventsView
            newsEvents={newsEvents}
            tradesData={strategyTradesData}
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
