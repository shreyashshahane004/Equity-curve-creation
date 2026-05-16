import React, { useMemo } from 'react';
import '../styles/months-performance.css';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// FOMC dates – same set as in AnalyticsView
const FOMC_DATES = new Set([
  '2023-02-01','2023-03-22','2023-05-03','2023-06-14',
  '2023-07-26','2023-09-20','2023-11-01','2023-12-13',
  '2024-01-31','2024-03-20','2024-05-01','2024-06-12',
  '2024-07-31','2024-09-18','2024-11-07','2024-12-18',
  '2025-01-29','2025-03-19','2025-05-07','2025-06-18',
  '2025-07-30','2025-09-17','2025-10-29','2025-12-10',
]);

// ── helpers ────────────────────────────────────────────────────────────
const parseDateStr = (originalText, month, year) => {
  const monthIndex = MONTHS.indexOf(month);
  if (monthIndex === -1) return null;
  const match = (originalText || '').match(/(\d{1,2})[-/\s]([A-Za-z]{3})/);
  if (!match) return null;
  if (match[2].toLowerCase() !== SHORT_MONTHS[monthIndex].toLowerCase()) return null;
  const day = parseInt(match[1]);
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

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
const MonthsPerformanceView = ({ monthsData }) => {
  // Build a map: monthIndex -> { year -> stats (excl FOMC) }
  const monthYearMap = useMemo(() => {
    const map = {}; // map[monthIndex][year] = stats

    monthsData.forEach(entry => {
      const monthIndex = MONTHS.indexOf(entry.month);
      if (monthIndex === -1) return;
      const year = String(entry.year);

      if (!map[monthIndex]) map[monthIndex] = {};
      if (!map[monthIndex][year]) map[monthIndex][year] = emptyStats();

      (entry.data || []).forEach(trade => {
        const dateStr = parseDateStr(trade.originalText, entry.month, entry.year);
        // Exclude FOMC days
        if (dateStr && FOMC_DATES.has(dateStr)) return;
        const r = trade.rValue || 0;
        addTrade(map[monthIndex][year], r);
      });
    });

    return map;
  }, [monthsData]);

  // Collect all unique years present in the data
  const allYears = useMemo(() => {
    const ySet = new Set();
    monthsData.forEach(e => ySet.add(String(e.year)));
    return [...ySet].sort();
  }, [monthsData]);

  if (!monthsData || monthsData.length === 0) {
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
