import React, { useMemo } from 'react';
import '../styles/months-performance.css';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── helpers ────────────────────────────────────────────────────────────

const emptyStats = () => ({ trades: 0, wins: 0, losses: 0, totalR: 0 });

const addTrade = (stats, r) => {
  if (r === 0) return; // Ignore "no trade" days
  stats.trades++;
  stats.totalR += r;
  stats.totalR = Math.round(stats.totalR * 100) / 100;
  if (r > 0) stats.wins++;
  else if (r < 0) stats.losses++;
};

const winRate = (s) =>
  s.trades > 0 ? ((s.wins / s.trades) * 100).toFixed(1) : null;

const fmtR = (r) =>
  `${r > 0 ? '+' : ''}${parseFloat(r.toFixed(2))}R`;

// ── mini stat pill ─────────────────────────────────────────────────────
const Pill = ({ label, value, color }) => (
  <div className="mp-pill">
    <span className="mp-pill-label">{label}</span>
    <span className="mp-pill-value" style={{ color }}>{value}</span>
  </div>
);

// ── single year block for a given calendar month ───────────────────────
const YearBlock = ({ year, stats, isCombined }) => {
  const wr = winRate(stats);
  const wrNum = wr ? parseFloat(wr) : null;
  const netColor = stats.totalR >= 0 ? '#4ECDC4' : '#FF6B6B';
  const wrColor = wrNum === null ? '#9ca3af' : wrNum >= 50 ? '#4ECDC4' : '#FF6B6B';
  const noData = stats.trades === 0;

  return (
    <div className={`mp-year-block ${isCombined ? 'mp-combined' : ''} ${noData ? 'mp-no-data' : ''}`}>
      <div className="mp-year-header">
        <span className="mp-year-label">{isCombined ? 'Combined' : year}</span>
        {isCombined && <span className="mp-combined-badge">All Years</span>}
      </div>

      {noData ? (
        <div className="mp-empty-msg">No data</div>
      ) : (
        <>
          <div className="mp-net-r" style={{ color: netColor }}>{fmtR(stats.totalR)}</div>

          <div className="mp-pills-grid">
            <Pill
              label="WR"
              value={wr ? `${wr}%` : '—'}
              color={wrColor}
            />
            <Pill
              label="Trades"
              value={stats.trades}
              color="var(--text-dark)"
            />
            <Pill
              label="Wins"
              value={stats.wins}
              color="#4ECDC4"
            />
            <Pill
              label="Losses"
              value={stats.losses}
              color="#FF6B6B"
            />
          </div>
        </>
      )}
    </div>
  );
};

// ── horizontal row for one calendar month ─────────────────────────────
const MonthRow = ({ monthName, monthIndex, yearStats }) => {
  // Build combined stats across all years
  const combined = emptyStats();
  Object.values(yearStats).forEach(s => {
    combined.trades += s.trades;
    combined.wins += s.wins;
    combined.losses += s.losses;
    combined.totalR += s.totalR;
  });

  const years = Object.keys(yearStats).sort();
  const hasAnyData = combined.trades > 0;

  return (
    <div className={`mp-month-row ${!hasAnyData ? 'mp-month-row--empty' : ''}`}>
      {/* Month label pill */}
      <div className="mp-month-label-col">
        <div className="mp-month-badge">
          <span className="mp-month-name">{SHORT_MONTHS[monthIndex]}</span>
          <span className="mp-month-full">{monthName}</span>
        </div>
      </div>

      {/* Year blocks */}
      <div className="mp-blocks-row">
        {years.map(year => (
          <YearBlock key={year} year={year} stats={yearStats[year]} isCombined={false} />
        ))}
        {/* 4th block: combined */}
        <YearBlock year="combined" stats={combined} isCombined={true} />
      </div>
    </div>
  );
};

// ── main component ─────────────────────────────────────────────────────
const MonthsPerformanceView = ({ tradesData }) => {
  // Build a map: monthIndex -> { year -> stats (excl FOMC) }
  const monthYearMap = useMemo(() => {
    const map = {}; // map[monthIndex][year] = stats

    (tradesData || []).forEach(trade => {
      // Exclude FOMC days
      if (trade.is_fomc) return;

      const monthIndex = MONTHS.indexOf(trade.month_name);
      if (monthIndex === -1) return;
      const year = String(trade.year_value);

      if (!map[monthIndex]) map[monthIndex] = {};
      if (!map[monthIndex][year]) map[monthIndex][year] = emptyStats();

      const r = trade.r_value || 0;
      addTrade(map[monthIndex][year], r);
    });

    return map;
  }, [tradesData]);

  // Collect all unique years present in the data
  const allYears = useMemo(() => {
    const ySet = new Set();
    (tradesData || []).forEach(t => ySet.add(String(t.year_value)));
    return [...ySet].sort();
  }, [tradesData]);

  if (!tradesData || tradesData.length === 0) {
    return (
      <div className="mp-empty-state">
        <span style={{ fontSize: '3rem' }}>📅</span>
        <p>No month data recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="mp-wrapper">
      {/* Header */}
      <div className="mp-page-header">
        <div>
          <h1 className="mp-page-title">Months Performance</h1>
          <p className="mp-page-sub">
            Per-calendar-month breakdown · FOMC days excluded · {allYears.join(', ')}
          </p>
        </div>
        <div className="mp-legend">
          <span className="mp-legend-dot" style={{ background: '#4ECDC4' }} /> Positive
          <span className="mp-legend-dot" style={{ background: '#FF6B6B', marginLeft: 12 }} /> Negative
          <span className="mp-legend-dot mp-legend-combined" style={{ marginLeft: 12 }} /> Combined
        </div>
      </div>

      {/* Column headers */}
      <div className="mp-col-headers">
        <div className="mp-col-header-month">Month</div>
        <div className="mp-col-header-blocks">
          {allYears.map(y => <span key={y}>{y}</span>)}
          <span className="mp-col-combined">Combined</span>
        </div>
      </div>

      {/* One row per calendar month */}
      <div className="mp-rows">
        {MONTHS.map((month, idx) => {
          // Build yearStats – ensure every year has an entry (even if empty)
          const yearStats = {};
          allYears.forEach(y => {
            yearStats[y] = (monthYearMap[idx] && monthYearMap[idx][y]) || emptyStats();
          });
          return (
            <MonthRow
              key={month}
              monthName={month}
              monthIndex={idx}
              yearStats={yearStats}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MonthsPerformanceView;
