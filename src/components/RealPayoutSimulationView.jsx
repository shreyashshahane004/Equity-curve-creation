import React, { useMemo, useState } from 'react';
import { Zap, AlertTriangle, Target, Activity, Settings, TrendingUp, RefreshCcw, Calendar, Clock, LayoutList } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import '../styles/payout-simulation.css';
import CasesPanelView from './CasesPanelView';

const RealPayoutSimulationView = ({ tradesData }) => {
  const [targetR, setTargetR] = useState(4);
  const [maxDrawdownR, setMaxDrawdownR] = useState(-10);
  const [excludeFOMC, setExcludeFOMC] = useState(true);
  const [excludeFridays, setExcludeFridays] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState(null);
  const [showCasesPanel, setShowCasesPanel] = useState(false);

  const stats = useMemo(() => {
    if (!tradesData || tradesData.length === 0) return null;

    let allTrades = tradesData;

    // 3. Filter FOMC and Fridays
    let tradesToUse = allTrades;
    if (excludeFOMC) {
      tradesToUse = tradesToUse.filter(t => !t.is_fomc);
    }
    if (excludeFridays) {
      tradesToUse = tradesToUse.filter(t => t.day_of_week !== 5); // 5 is Friday
    }

    // 4. Run continuous sequential simulation
    let successes = 0;
    let failures = 0;
    let pending = 0;
    let totalTradesTakenInSuccesses = 0;
    let totalTradesTakenInFailures = 0;
    let minTradesWin = Infinity;
    let maxTradesWin = 0;
    let runDetails = [];

    let currentStartIndex = 0;
    let scenarioCount = 0;

    while (currentStartIndex < tradesToUse.length) {
      let cumulative = 0;
      let resolved = false;
      let tradesTaken = 0;
      let path = [];
      let outcome = 'pending';
      const startDateStr = tradesToUse[currentStartIndex].trade_date || `${tradesToUse[currentStartIndex].year_value}-${tradesToUse[currentStartIndex].month_name}-unknown`;

      let j = currentStartIndex;
      for (; j < tradesToUse.length; j++) {
        if (tradesToUse[j].r_value !== 0) tradesTaken++;
        cumulative += (tradesToUse[j].r_value || 0);
        cumulative = Math.round(cumulative * 100) / 100; // Fix floating point errors
        path.push({
          tradeNo: tradesTaken,
          dateStr: tradesToUse[j].trade_date || `${tradesToUse[j].year_value}-${tradesToUse[j].month_name}-unknown`,
          originalText: tradesToUse[j].original_text,
          rValue: tradesToUse[j].r_value || 0,
          cumulative
        });
        
        if (cumulative >= targetR) {
          successes++;
          totalTradesTakenInSuccesses += tradesTaken;
          minTradesWin = Math.min(minTradesWin, tradesTaken);
          maxTradesWin = Math.max(maxTradesWin, tradesTaken);
          resolved = true;
          outcome = 'success';
          break;
        }
        
        if (cumulative <= maxDrawdownR) {
          failures++;
          totalTradesTakenInFailures += tradesTaken;
          resolved = true;
          outcome = 'failure';
          break;
        }
      }

      if (!resolved) {
        pending++;
      }

      runDetails.push({
        id: `scenario-${scenarioCount}`,
        startDateStr,
        outcome,
        tradesTaken,
        finalR: cumulative,
        path
      });
      scenarioCount++;

      if (resolved) {
        // Move to the next day of reaching the target/drawdown
        const resolutionDateStr = tradesToUse[j].trade_date || `${tradesToUse[j].year_value}-${tradesToUse[j].month_name}-unknown`;
        let nextDayIndex = j + 1;
        while (nextDayIndex < tradesToUse.length) {
          const nextDateStr = tradesToUse[nextDayIndex].trade_date || `${tradesToUse[nextDayIndex].year_value}-${tradesToUse[nextDayIndex].month_name}-unknown`;
          if (nextDateStr === resolutionDateStr) {
            nextDayIndex++;
          } else {
            break;
          }
        }
        currentStartIndex = nextDayIndex;
      } else {
        break;
      }
    }

    const totalResolved = successes + failures;
    const hitRate = totalResolved > 0 ? (successes / totalResolved) * 100 : 0;
    const avgTradesToSuccess = successes > 0 ? totalTradesTakenInSuccesses / successes : 0;
    const avgTradesToFailure = failures > 0 ? totalTradesTakenInFailures / failures : 0;

    const getMedian = (arr) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const getMode = (arr) => {
      if (arr.length === 0) return { value: 0, count: 0 };
      const freq = {};
      let maxFreq = 0;
      let modes = [];
      arr.forEach(num => {
        freq[num] = (freq[num] || 0) + 1;
        if (freq[num] > maxFreq) {
          maxFreq = freq[num];
          modes = [num];
        } else if (freq[num] === maxFreq) {
          if (!modes.includes(num)) modes.push(num);
        }
      });
      return { value: Math.min(...modes), count: maxFreq };
    };
    
    let successTradeCounts = [];
    let failureTradeCounts = [];

    const weekStats = {
      'Week 1 (1-7)': { failures: 0, successes: 0, total: 0, successTrades: [], avgSpeed: 0 },
      'Week 2 (8-14)': { failures: 0, successes: 0, total: 0, successTrades: [], avgSpeed: 0 },
      'Week 3 (15-21)': { failures: 0, successes: 0, total: 0, successTrades: [], avgSpeed: 0 },
      'Week 4 (22+)': { failures: 0, successes: 0, total: 0, successTrades: [], avgSpeed: 0 },
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearStats = {};
    yearStats['All Time'] = {};
    monthNames.forEach(m => yearStats['All Time'][m] = { success: 0, failure: 0 });

    runDetails.forEach(run => {
      const parts = run.startDateStr.split('-');
      if (parts.length === 3) {
        const yyyy = parts[0];
        const mm = parseInt(parts[1], 10);
        const dayOfMonth = parseInt(parts[2], 10);
        
        if (!isNaN(dayOfMonth)) {
          // Week Analysis
          let weekGroup = '';
          if (dayOfMonth <= 7) weekGroup = 'Week 1 (1-7)';
          else if (dayOfMonth <= 14) weekGroup = 'Week 2 (8-14)';
          else if (dayOfMonth <= 21) weekGroup = 'Week 3 (15-21)';
          else weekGroup = 'Week 4 (22+)';
          
          weekStats[weekGroup].total++;
          if (run.outcome === 'failure') {
            weekStats[weekGroup].failures++;
          } else if (run.outcome === 'success') {
            weekStats[weekGroup].successes++;
            weekStats[weekGroup].successTrades.push(run.tradesTaken);
          }
        }

        // Year/Month Analysis for Histograms
        if (run.outcome === 'success') successTradeCounts.push(run.tradesTaken);
        else if (run.outcome === 'failure') failureTradeCounts.push(run.tradesTaken);

        if (run.outcome === 'success' || run.outcome === 'failure') {
          const monthName = monthNames[mm - 1];
          if (monthName) {
            if (!yearStats[yyyy]) {
              yearStats[yyyy] = {};
              monthNames.forEach(m => yearStats[yyyy][m] = { success: 0, failure: 0 });
            }
            yearStats[yyyy][monthName][run.outcome]++;
            yearStats['All Time'][monthName][run.outcome]++;
          }
        }
      }
    });

    Object.keys(weekStats).forEach(wk => {
      const w = weekStats[wk];
      w.avgSpeed = w.successTrades.length > 0 ? w.successTrades.reduce((a,b)=>a+b,0)/w.successTrades.length : 0;
    });

    const medianTradesToSuccess = getMedian(successTradeCounts);
    const modeTradesToSuccess = getMode(successTradeCounts);

    const binDefinitions = [
      { label: '1-5', min: 1, max: 5 },
      { label: '6-10', min: 6, max: 10 },
      { label: '11-15', min: 11, max: 15 },
      { label: '16-20', min: 16, max: 20 },
      { label: '21-30', min: 21, max: 30 },
      { label: '31-50', min: 31, max: 50 },
      { label: '51+', min: 51, max: 999999 }
    ];

    const successBlocks = binDefinitions.map(b => ({ name: b.label, count: 0 }));
    const failureBlocks = binDefinitions.map(b => ({ name: b.label, count: 0 }));

    successTradeCounts.forEach(t => {
      const bin = binDefinitions.findIndex(b => t >= b.min && t <= b.max);
      if (bin !== -1) successBlocks[bin].count++;
    });

    failureTradeCounts.forEach(t => {
      const bin = binDefinitions.findIndex(b => t >= b.min && t <= b.max);
      if (bin !== -1) failureBlocks[bin].count++;
    });

    // Format histogram data
    const sortedYears = Object.keys(yearStats).filter(y => y !== 'All Time').sort();
    const histograms = [...sortedYears, 'All Time'].map(year => {
      return {
        year,
        data: monthNames.map(m => ({
          month: m,
          Success: yearStats[year][m].success,
          Failure: yearStats[year][m].failure
        }))
      };
    });

    return {
      totalStarts: scenarioCount,
      successes,
      failures,
      pending,
      hitRate,
      avgTradesToSuccess,
      avgTradesToFailure,
      minTradesWin: minTradesWin === Infinity ? 0 : minTradesWin,
      maxTradesWin,
      medianTradesToSuccess,
      modeTradesToSuccess,
      successBlocks,
      failureBlocks,
      weekStats,
      histograms,
      runDetails
    };

  }, [tradesData, targetR, maxDrawdownR, excludeFOMC, excludeFridays]);

  if (!tradesData || tradesData.length === 0) {
    return (
      <div className="ps-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <RefreshCcw size={64} style={{ color: 'var(--secondary)' }} />
        <p style={{ color: 'var(--text-light)', fontWeight: 800, marginTop: '16px' }}>No data to simulate yet.</p>
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'Success (Reached Target)', value: stats.successes, color: '#4ECDC4' },
    { name: 'Failed (Hit Drawdown)', value: stats.failures, color: '#FF6B6B' }
  ] : [];

  return (
    <div className="ps-wrapper">
      {/* Cases Panel Overlay */}
      {showCasesPanel && stats && (
        <CasesPanelView
          runDetails={stats.runDetails}
          targetR={targetR}
          maxDrawdownR={maxDrawdownR}
          onClose={() => setShowCasesPanel(false)}
        />
      )}

      <div className="ps-header">
        <div>
          <h1 className="ps-title">Real Probability of Payout</h1>
          <p className="ps-sub">Sequential simulation tracking successive payout targets starting from 1st Jan 2023.</p>
        </div>
        {stats && (
          <button
            onClick={() => setShowCasesPanel(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(99,102,241,0.35)', flexShrink: 0 }}
          >
            <LayoutList size={16} />
            View All {stats.runDetails?.length} Cases
          </button>
        )}
      </div>

      <div className="ps-content">
        <div className="ps-controls-card">
          <h2 className="ps-card-title">
            <Settings size={18} />
            SIMULATION PARAMETERS
          </h2>
          
          <div className="ps-control-group">
            <label className="ps-label">
              Profit Target (+R)
              <span className="ps-val" style={{ color: '#4ECDC4' }}>+{targetR}R</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              step="1" 
              value={targetR} 
              onChange={(e) => setTargetR(Number(e.target.value))}
              className="ps-slider success-slider"
            />
          </div>

          <div className="ps-control-group">
            <label className="ps-label">
              Max Drawdown (-R)
              <span className="ps-val" style={{ color: '#FF6B6B' }}>{maxDrawdownR}R</span>
            </label>
            <input 
              type="range" 
              min="-20" 
              max="-1" 
              step="1" 
              value={maxDrawdownR} 
              onChange={(e) => setMaxDrawdownR(Number(e.target.value))}
              className="ps-slider danger-slider"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
            <div className="ps-toggle-group" style={{ marginTop: 0 }} onClick={() => setExcludeFOMC(!excludeFOMC)}>
              <div className={`ps-toggle ${excludeFOMC ? 'active' : ''}`}>
                <div className="ps-toggle-knob"></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>Exclude FOMC Days</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Remove volatile event days from the dataset</span>
              </div>
            </div>

            <div className="ps-toggle-group" style={{ marginTop: 0 }} onClick={() => setExcludeFridays(!excludeFridays)}>
              <div className={`ps-toggle ${excludeFridays ? 'active' : ''}`}>
                <div className="ps-toggle-knob"></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>Exclude Friday Trades</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Remove all trades executed on a Friday</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ps-results-card">
          <h2 className="ps-card-title">
            <Activity size={18} />
            SIMULATION RESULTS
          </h2>

          <div className="ps-main-stat">
            <div className="ps-stat-circle" style={{ borderColor: stats.hitRate >= 50 ? '#4ECDC4' : '#FF6B6B' }}>
              <span className="ps-stat-large" style={{ color: stats.hitRate >= 50 ? '#4ECDC4' : '#FF6B6B' }}>
                {stats.hitRate.toFixed(1)}%
              </span>
              <span className="ps-stat-label">Probability of Success</span>
            </div>
          </div>

          <div className="ps-stats-grid">
            <div className="ps-stat-box">
              <span className="ps-box-title">Total Start Scenarios</span>
              <span className="ps-box-val">{stats.totalStarts} days</span>
            </div>
            <div className="ps-stat-box">
              <span className="ps-box-title">Successful Runs</span>
              <span className="ps-box-val" style={{ color: '#4ECDC4' }}>{stats.successes}</span>
            </div>
            <div className="ps-stat-box">
              <span className="ps-box-title">Failed Runs</span>
              <span className="ps-box-val" style={{ color: '#FF6B6B' }}>{stats.failures}</span>
            </div>
            <div className="ps-stat-box">
              <span className="ps-box-title">Pending (Unresolved)</span>
              <span className="ps-box-val" style={{ color: '#F5B041' }}>{stats.pending}</span>
            </div>
          </div>

          {stats.successes > 0 && (
            <div className="ps-insight-box">
              <Zap size={20} style={{ color: '#F5B041', flexShrink: 0, marginTop: '4px' }} />
              <div style={{ width: '100%' }}>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Average Speed to Payout:</strong> When successful, it takes an average of <strong style={{ color: '#4ECDC4' }}>{stats.avgTradesToSuccess.toFixed(1)} trades</strong> to reach the {targetR}R target.
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.6)', padding: '12px', borderRadius: '6px' }}>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Fastest Win</span>
                    <strong>{stats.minTradesWin} trades</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Longest Win</span>
                    <strong>{stats.maxTradesWin} trades</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Avg Win Duration</span>
                    <strong style={{ color: '#4ECDC4' }}>{stats.avgTradesToSuccess.toFixed(1)} trades</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Avg Loss Duration</span>
                    <strong style={{ color: '#FF6B6B' }}>{stats.avgTradesToFailure.toFixed(1)} trades</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Median Win</span>
                    <strong style={{ color: '#4ECDC4' }}>{stats.medianTradesToSuccess} trades</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Mode Win</span>
                    <strong style={{ color: '#4ECDC4' }}>{stats.modeTradesToSuccess.value} trades</strong>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: '4px' }}>(happened {stats.modeTradesToSuccess.count} times)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ width: '100%', height: 200, marginTop: '20px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 800 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="ps-insights-grid">
        <div className="ps-insight-card">
          <div className="ps-insight-header">
            <Target size={18} style={{ color: '#4ECDC4' }} />
            <h3>Winning Cases Pattern</h3>
          </div>
          <p className="ps-insight-desc">Which part of the month do the successful accounts usually start on?</p>
          <div className="ps-week-stats">
            {Object.keys(stats.weekStats).map(week => {
              const data = stats.weekStats[week];
              const winRate = data.total > 0 ? (data.successes / data.total) * 100 : 0;
              return (
                <div key={`win-${week}`} className="ps-week-row">
                  <div className="ps-week-label">{week}</div>
                  <div className="ps-week-bar-container">
                    <div className="ps-week-bar" style={{ width: `${Math.max(winRate, 2)}%`, background: '#4ECDC4' }}></div>
                  </div>
                  <div className="ps-week-val" style={{ color: '#4ECDC4' }}>
                    <strong>{data.successes}</strong> 
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}> wins</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ps-insight-card">
          <div className="ps-insight-header">
            <AlertTriangle size={18} style={{ color: '#FF6B6B' }} />
            <h3>Losing Cases Pattern</h3>
          </div>
          <p className="ps-insight-desc">Which part of the month do the failed accounts usually start on?</p>
          <div className="ps-week-stats">
            {Object.keys(stats.weekStats).map(week => {
              const data = stats.weekStats[week];
              const failRate = data.total > 0 ? (data.failures / data.total) * 100 : 0;
              return (
                <div key={`loss-${week}`} className="ps-week-row">
                  <div className="ps-week-label">{week}</div>
                  <div className="ps-week-bar-container">
                    <div className="ps-week-bar" style={{ width: `${Math.max(failRate, 2)}%`, background: '#FF6B6B' }}></div>
                  </div>
                  <div className="ps-week-val">
                    <strong>{data.failures}</strong> 
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}> fails</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ps-insight-card">
          <div className="ps-insight-header">
            <Clock size={18} style={{ color: '#4ECDC4' }} />
            <h3>Speed to Target by Start Date</h3>
          </div>
          <p className="ps-insight-desc">How fast do you reach the target based on the starting week?</p>
          <div className="ps-week-stats">
            {Object.keys(stats.weekStats).map(week => {
              const data = stats.weekStats[week];
              const maxSpeed = Math.max(...Object.values(stats.weekStats).map(w => w.avgSpeed));
              const speedRatio = data.avgSpeed > 0 ? (data.avgSpeed / maxSpeed) * 100 : 0;
              return (
                <div key={`speed-${week}`} className="ps-week-row">
                  <div className="ps-week-label">{week}</div>
                  <div className="ps-week-bar-container">
                    <div className="ps-week-bar" style={{ width: `${Math.max(speedRatio, 2)}%`, background: '#4ECDC4' }}></div>
                  </div>
                  <div className="ps-week-val" style={{ color: '#4ECDC4', width: '90px' }}>
                    <strong>{data.avgSpeed.toFixed(1)}</strong> 
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}> trades</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ps-insight-card">
          <div className="ps-insight-header">
            <Target size={18} style={{ color: '#4ECDC4' }} />
            <h3>Payout Probabilities</h3>
          </div>
          <p className="ps-insight-desc">What is the chance of payout if starting in this week?</p>
          <div className="ps-week-stats">
            {Object.keys(stats.weekStats).map(week => {
              const data = stats.weekStats[week];
              const resolved = data.successes + data.failures;
              const prob = resolved > 0 ? (data.successes / resolved) * 100 : 0;
              return (
                <div key={`prob-${week}`} className="ps-week-row">
                  <div className="ps-week-label">{week}</div>
                  <div className="ps-week-bar-container">
                    <div className="ps-week-bar" style={{ width: `${Math.max(prob, 2)}%`, background: prob >= 50 ? '#4ECDC4' : '#FF6B6B' }}></div>
                  </div>
                  <div className="ps-week-val" style={{ color: prob >= 50 ? '#4ECDC4' : '#FF6B6B', width: '60px' }}>
                    <strong>{prob.toFixed(1)}%</strong> 
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trade Blocks Distribution */}
      <div className="ps-histograms-section">
        <h2 className="ps-card-title" style={{ marginTop: '32px', marginBottom: '16px' }}>
          <Activity size={18} />
          TRADE DURATION BLOCKS
        </h2>
        <div className="ps-histograms-grid">
          <div className="ps-histogram-card">
            <div className="ps-histogram-header">
              <h3>Successful Payouts</h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Number of successes grouped by trades taken</p>
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={stats.successBlocks} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 800 }}
                  />
                  <Bar dataKey="count" name="Successes" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="ps-histogram-card">
            <div className="ps-histogram-header">
              <h3>Failed Accounts (Drawdown)</h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Number of failures grouped by trades taken</p>
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={stats.failureBlocks} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 800 }}
                  />
                  <Bar dataKey="count" name="Failures" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Histograms Section */}
      <div className="ps-histograms-section">
        <h2 className="ps-card-title" style={{ marginTop: '32px', marginBottom: '16px' }}>
          <Calendar size={18} />
          MONTHLY PERFORMANCE DISTRIBUTION
        </h2>
        
        <div className="ps-histograms-grid">
          {stats.histograms.map((hist, idx) => (
            <div key={hist.year} className="ps-histogram-card">
              <div className="ps-histogram-header">
                <h3>{hist.year}</h3>
              </div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={hist.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontWeight: 800 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                    <Bar dataKey="Success" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Failure" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RealPayoutSimulationView;
