import React, { useMemo } from 'react';
import { SplitSquareHorizontal, CalendarDays, Activity } from 'lucide-react';
import '../styles/half-month-edge.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const parseDay = (text) => {
  if (!text) return null;
  const match = text.match(/^\s*([0-9]{1,2})[-/\s][A-Za-z0-9]{3}/i);
  if (match) return parseInt(match[1], 10);
  return null;
};

const processGroup = (trades) => {
  let h1Net = 0, h1Wins = 0, h1Trades = 0;
  let h2Net = 0, h2Wins = 0, h2Trades = 0;

  trades.forEach(t => {
    const day = parseDay(t.originalText);
    if (!day) return; 
    
    if (day <= 15) {
      h1Trades++;
      h1Net += t.rValue;
      if (t.rValue > 0) h1Wins++;
    } else {
      h2Trades++;
      h2Net += t.rValue;
      if (t.rValue > 0) h2Wins++;
    }
  });

  return {
    h1: { trades: h1Trades, net: h1Net, wr: h1Trades > 0 ? (h1Wins/h1Trades)*100 : 0 },
    h2: { trades: h2Trades, net: h2Net, wr: h2Trades > 0 ? (h2Wins/h2Trades)*100 : 0 },
    valid: h1Trades > 0 || h2Trades > 0
  };
};

const EdgeCard = ({ title, data, isLarge }) => {
  if (!data || !data.valid) return null;

  const h1Net = data.h1.net;
  const h2Net = data.h2.net;
  const h1Winner = h1Net > h2Net;
  const h2Winner = h2Net > h1Net;

  return (
    <div className={`hme-card ${isLarge ? 'hme-large' : ''}`}>
      <div className="hme-card-title">{title}</div>
      <div className="hme-card-split">
        <div className={`hme-side ${h1Winner ? 'hme-winner' : ''}`}>
          <div className="hme-side-header">1st - 15th</div>
          <div className="hme-net" style={{ color: h1Net > 0 ? '#4ECDC4' : (h1Net < 0 ? '#FF6B6B' : '#9ca3af') }}>
            {h1Net > 0 ? '+' : ''}{parseFloat(h1Net.toFixed(2))}R
          </div>
          <div className="hme-stats">
            <span>{data.h1.trades} Trades</span> • <span>{data.h1.wr.toFixed(0)}% WR</span>
          </div>
        </div>
        
        <div className="hme-divider">VS</div>
        
        <div className={`hme-side ${h2Winner ? 'hme-winner' : ''}`}>
          <div className="hme-side-header">16th - 31st</div>
          <div className="hme-net" style={{ color: h2Net > 0 ? '#4ECDC4' : (h2Net < 0 ? '#FF6B6B' : '#9ca3af') }}>
            {h2Net > 0 ? '+' : ''}{parseFloat(h2Net.toFixed(2))}R
          </div>
          <div className="hme-stats">
            <span>{data.h2.trades} Trades</span> • <span>{data.h2.wr.toFixed(0)}% WR</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const HalfMonthEdgeView = ({ monthsData }) => {
  const stats = useMemo(() => {
    const allTimeTrades = [];
    const yearlyMap = {};
    const seasonalMap = {};
    const individualMap = {};

    monthsData.forEach(entry => {
      const year = entry.year.toString();
      const month = entry.month;
      const keyIndiv = `${month} ${year}`;
      
      if (!yearlyMap[year]) yearlyMap[year] = [];
      if (!seasonalMap[month]) seasonalMap[month] = [];
      if (!individualMap[keyIndiv]) individualMap[keyIndiv] = [];

      (entry.data || []).forEach(t => {
        allTimeTrades.push(t);
        yearlyMap[year].push(t);
        seasonalMap[month].push(t);
        individualMap[keyIndiv].push(t);
      });
    });

    const yearlyData = {};
    Object.keys(yearlyMap).sort().forEach(y => yearlyData[y] = processGroup(yearlyMap[y]));

    const seasonalData = {};
    MONTHS.forEach(m => {
      if (seasonalMap[m] && seasonalMap[m].length > 0) seasonalData[m] = processGroup(seasonalMap[m]);
    });

    const individualData = {};
    const sortedEntries = [...monthsData].sort((a, b) => {
      if (a.year !== b.year) return Number(a.year) - Number(b.year);
      return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
    });
    
    sortedEntries.forEach(entry => {
      const k = `${entry.month} ${entry.year}`;
      individualData[k] = processGroup(individualMap[k]);
    });

    return {
      allTime: processGroup(allTimeTrades),
      yearly: yearlyData,
      seasonal: seasonalData,
      individual: individualData,
      sortedKeys: sortedEntries.map(e => `${e.month} ${e.year}`)
    };
  }, [monthsData]);

  if (!stats.allTime.valid) {
    return (
      <div className="hme-empty-state">
        <SplitSquareHorizontal size={64} style={{ color: 'var(--secondary)' }} />
        <p>No valid dates found to calculate edge.</p>
      </div>
    );
  }

  return (
    <div className="hme-wrapper">
      <div className="hme-page-header">
        <div>
          <h1 className="hme-page-title">Half-Month Edge</h1>
          <p className="hme-page-sub">Analyzing performance: 1st-15th vs 16th-31st of the month</p>
        </div>
      </div>

      <div className="hme-section hme-alltime-section">
        <div className="hme-section-header">
          <Activity size={20} />
          <h2>All-Time Master Edge</h2>
        </div>
        <EdgeCard title="COMBINED ALL YEARS" data={stats.allTime} isLarge={true} />
      </div>

      <div className="hme-section">
        <div className="hme-section-header">
          <CalendarDays size={20} />
          <h2>Yearly Breakdown</h2>
        </div>
        <div className="hme-grid">
          {Object.keys(stats.yearly).map(y => (
            <EdgeCard key={y} title={`YEAR ${y}`} data={stats.yearly[y]} />
          ))}
        </div>
      </div>

      <div className="hme-section">
        <div className="hme-section-header">
          <SplitSquareHorizontal size={20} />
          <h2>Seasonal Combined (All Years)</h2>
        </div>
        <div className="hme-grid">
          {MONTHS.map(m => stats.seasonal[m] && (
            <EdgeCard key={m} title={`ALL ${m.toUpperCase()}S`} data={stats.seasonal[m]} />
          ))}
        </div>
      </div>

      <div className="hme-section">
        <div className="hme-section-header">
          <CalendarDays size={20} />
          <h2>Individual Months</h2>
        </div>
        <div className="hme-grid">
          {stats.sortedKeys.map(k => (
            <EdgeCard key={k} title={k.toUpperCase()} data={stats.individual[k]} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HalfMonthEdgeView;
