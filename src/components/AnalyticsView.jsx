import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// All FOMC dates as YYYY-MM-DD strings
const FOMC_DATES = new Set([
  // 2023
  '2023-02-01','2023-03-22','2023-05-03','2023-06-14',
  '2023-07-26','2023-09-20','2023-11-01','2023-12-13',
  // 2024
  '2024-01-31','2024-03-20','2024-05-01','2024-06-12',
  '2024-07-31','2024-09-18','2024-11-07','2024-12-18',
  // 2025
  '2025-01-29','2025-03-19','2025-05-07','2025-06-18',
  '2025-07-30','2025-09-17','2025-10-29','2025-12-10',
]);

// All CPI dates as YYYY-MM-DD strings
const CPI_DATES = new Set([
  // 2023
  '2023-01-12','2023-02-14','2023-03-14','2023-04-12',
  '2023-05-10','2023-06-13','2023-07-12','2023-08-10',
  '2023-09-13','2023-10-12','2023-11-14','2023-12-12',
  // 2024
  '2024-01-11','2024-02-13','2024-03-12','2024-04-10',
  '2024-05-15','2024-06-12','2024-07-11','2024-08-14',
  '2024-09-11','2024-10-10','2024-11-13','2024-12-11',
  // 2025
  '2025-01-15','2025-02-12','2025-03-12','2025-04-10',
  '2025-05-13','2025-06-11','2025-07-15','2025-08-12',
  '2025-09-11','2025-10-24','2025-12-18',
]);

// All NFP dates as YYYY-MM-DD strings
const NFP_DATES = new Set([
  // 2023
  '2023-01-06','2023-02-03','2023-03-10','2023-04-07',
  '2023-05-05','2023-06-02','2023-07-07','2023-08-04',
  '2023-09-01','2023-10-06','2023-11-03','2023-12-08',
  // 2024
  '2024-01-05','2024-02-02','2024-03-08','2024-04-05',
  '2024-05-03','2024-06-07','2024-07-05','2024-08-02',
  '2024-09-06','2024-10-04','2024-11-01','2024-12-06',
  // 2025
  '2025-01-10','2025-02-07','2025-03-07','2025-04-04',
  '2025-05-02','2025-06-06','2025-07-03','2025-08-01',
  '2025-09-05',
]);

const parseTradeDateStr = (originalText, month, year) => {
  const monthIndex = MONTHS.indexOf(month);
  if (monthIndex === -1) return null;
  const match = (originalText || '').match(/(\d{1,2})[-/\s]([A-Za-z]{3})/);
  if (!match) return null;
  if (match[2].toLowerCase() !== SHORT_MONTHS[monthIndex].toLowerCase()) return null;
  const day = parseInt(match[1]);
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return { dateStr: `${year}-${mm}-${dd}`, dayOfWeek: new Date(parseInt(year), monthIndex, day).getDay() };
};

const emptyStats = () => ({ trades: 0, wins: 0, losses: 0, totalR: 0 });

const addTrade = (stats, r) => {
  stats.trades++;
  stats.totalR += r;
  if (r > 0) stats.wins++;
  else if (r < 0) stats.losses++;
};

const winRate = (s) => s.trades > 0 ? ((s.wins / s.trades) * 100).toFixed(1) : '0.0';
const fmtR = (r) => `${r > 0 ? '+' : ''}${parseFloat(r.toFixed(2))}R`;

const aggregateData = (monthsData) => {
  const overall = emptyStats();
  const fomc = emptyStats();
  const nonFomc = emptyStats();
  const cpi = emptyStats();
  const nonCpi = emptyStats();
  const nfp = emptyStats();
  const nonNfp = emptyStats();
  const dayStats = Array(7).fill(null).map(() => ({ winR: 0, lossR: 0, count: 0 }));

  monthsData.forEach(entry => {
    (entry.data || []).forEach(trade => {
      const parsed = parseTradeDateStr(trade.originalText, entry.month, entry.year);
      const r = trade.rValue || 0;

      addTrade(overall, r);

      if (parsed) {
        const { dateStr, dayOfWeek } = parsed;
        if (FOMC_DATES.has(dateStr)) addTrade(fomc, r);
        else addTrade(nonFomc, r);
        if (CPI_DATES.has(dateStr)) addTrade(cpi, r);
        else addTrade(nonCpi, r);
        if (NFP_DATES.has(dateStr)) addTrade(nfp, r);
        else addTrade(nonNfp, r);
        const ds = dayStats[dayOfWeek];
        ds.count++;
        if (r > 0) ds.winR += r;
        else ds.lossR += Math.abs(r);
      }
    });
  });

  const chartData = DAY_NAMES.map((name, idx) => ({
    day: name,
    winR: parseFloat(dayStats[idx].winR.toFixed(2)),
    lossR: parseFloat(dayStats[idx].lossR.toFixed(2)),
    netR: parseFloat((dayStats[idx].winR - dayStats[idx].lossR).toFixed(2)),
    count: dayStats[idx].count,
  })).filter(d => d.count > 0);

  const bestDay = chartData.length > 0
    ? chartData.reduce((best, d) => d.netR > best.netR ? d : best, chartData[0]).day
    : null;

  return { overall, fomc, nonFomc, cpi, nonCpi, nfp, nonNfp, chartData, bestDay };
};

// ── Sub-components ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const winR = payload.find(p => p.dataKey === 'winR')?.value || 0;
  const lossR = payload.find(p => p.dataKey === 'lossR')?.value || 0;
  const net = winR - lossR;
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 800, marginBottom: 4, color: '#292F36' }}>{label}</p>
      <p style={{ color: '#4ECDC4', fontWeight: 700, fontSize: '0.85rem' }}>Win R: +{winR}R</p>
      <p style={{ color: '#FF6B6B', fontWeight: 700, fontSize: '0.85rem' }}>Loss R: -{lossR}R</p>
      <p style={{ color: net >= 0 ? '#4ECDC4' : '#FF6B6B', fontWeight: 800, marginTop: 4 }}>Net: {fmtR(net)}</p>
    </div>
  );
};

const StatBox = ({ label, value, sub, valueColor }) => (
  <div className="anl-stat-box">
    <span className="anl-stat-label">{label}</span>
    <span className="anl-stat-value" style={{ color: valueColor }}>{value}</span>
    {sub && <span className="anl-stat-sub">{sub}</span>}
  </div>
);

const StatsRow = ({ stats, label, color }) => (
  <div className="anl-fomc-group">
    <div className="anl-fomc-group-title" style={{ borderColor: color }}>
      <span style={{ color }}>{label}</span>
      <span className="anl-fomc-trades-badge" style={{ background: `${color}18`, color }}>{stats.trades} trades</span>
    </div>
    <div className="anl-fomc-stats">
      <div className="anl-fomc-stat">
        <span className="anl-stat-label">NET R</span>
        <span className="anl-stat-value" style={{ color: stats.totalR >= 0 ? '#4ECDC4' : '#FF6B6B', fontSize: '1.3rem' }}>
          {fmtR(stats.totalR)}
        </span>
      </div>
      <div className="anl-fomc-stat">
        <span className="anl-stat-label">WIN RATE</span>
        <span className="anl-stat-value" style={{ color: parseFloat(winRate(stats)) >= 50 ? '#4ECDC4' : '#FF6B6B', fontSize: '1.3rem' }}>
          {winRate(stats)}%
        </span>
        <span className="anl-stat-sub">{stats.wins}W / {stats.losses}L</span>
      </div>
      <div className="anl-fomc-stat">
        <span className="anl-stat-label">WINS</span>
        <span className="anl-stat-value" style={{ color: '#4ECDC4', fontSize: '1.3rem' }}>{stats.wins}</span>
      </div>
      <div className="anl-fomc-stat">
        <span className="anl-stat-label">LOSSES</span>
        <span className="anl-stat-value" style={{ color: '#FF6B6B', fontSize: '1.3rem' }}>{stats.losses}</span>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────
const AnalyticsView = ({ monthsData }) => {
  if (!monthsData || monthsData.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 16, background: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow)' }}>
        <TrendingUp size={64} style={{ color: 'var(--secondary)' }} />
        <p style={{ color: 'var(--text-light)', fontWeight: 700 }}>No data to analyse yet.</p>
      </div>
    );
  }

  const { overall, fomc, nonFomc, cpi, nonCpi, nfp, nonNfp, chartData, bestDay } = aggregateData(monthsData);

  return (
    <div className="anl-wrapper">
      <div className="anl-page-header">
        <div>
          <h1 style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.5rem' }}>Analytics</h1>
          <p style={{ color: 'var(--text-light)', marginTop: 4 }}>Performance breakdown across all recorded months</p>
        </div>
      </div>

      {/* Overall Stat Boxes */}
      <div className="anl-stats-row">
        <StatBox label="TOTAL TRADES" value={overall.trades} sub="all time" />
        <StatBox label="NET R" value={fmtR(overall.totalR)} sub="across all months" valueColor={overall.totalR >= 0 ? '#4ECDC4' : '#FF6B6B'} />
        <StatBox label="WIN RATE" value={`${winRate(overall)}%`} sub={`${overall.wins}W / ${overall.losses}L`} valueColor={parseFloat(winRate(overall)) >= 50 ? '#4ECDC4' : '#FF6B6B'} />
        <StatBox label="WINS" value={overall.wins} sub="profitable days" valueColor="#4ECDC4" />
        <StatBox label="LOSSES" value={overall.losses} sub="losing days" valueColor="#FF6B6B" />
      </div>

      {/* FOMC Analysis Card */}
      <div className="anl-chart-card">
        <div className="anl-chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
            <span className="anl-chart-title" style={{ color: '#f59e0b' }}>FOMC DAY IMPACT</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600 }}>
            {fomc.trades} of {overall.trades} trades on FOMC days
          </span>
        </div>
        <div className="anl-fomc-row">
          <StatsRow stats={fomc} label="On FOMC Days" color="#f59e0b" />
          <div className="anl-fomc-divider" />
          <StatsRow stats={nonFomc} label="Excluding FOMC Days" color="#4ECDC4" />
        </div>
      </div>

      {/* CPI Analysis Card */}
      <div className="anl-chart-card">
        <div className="anl-chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} style={{ color: '#8b5cf6' }} />
            <span className="anl-chart-title" style={{ color: '#8b5cf6' }}>CPI DAY IMPACT</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600 }}>
            {cpi.trades} of {overall.trades} trades on CPI days
          </span>
        </div>
        <div className="anl-fomc-row">
          <StatsRow stats={cpi} label="On CPI Days" color="#8b5cf6" />
          <div className="anl-fomc-divider" />
          <StatsRow stats={nonCpi} label="Excluding CPI Days" color="#4ECDC4" />
        </div>
      </div>

      {/* NFP Analysis Card */}
      <div className="anl-chart-card">
        <div className="anl-chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} style={{ color: '#10b981' }} />
            <span className="anl-chart-title" style={{ color: '#10b981' }}>NFP DAY IMPACT</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600 }}>
            {nfp.trades} of {overall.trades} trades on NFP days
          </span>
        </div>
        <div className="anl-fomc-row">
          <StatsRow stats={nfp} label="On NFP Days" color="#10b981" />
          <div className="anl-fomc-divider" />
          <StatsRow stats={nonNfp} label="Excluding NFP Days" color="#4ECDC4" />
        </div>
      </div>

      {/* Day of Week Performance */}
      <div className="anl-chart-card">
        <div className="anl-chart-header">
          <span className="anl-chart-title">TRADING DAY PERFORMANCE</span>
          {bestDay && <span className="anl-best-day">Best Day: <strong style={{ color: '#4ECDC4' }}>{bestDay}</strong></span>}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 700, fontSize: 13 }} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="winR" name="Win R" fill="#4ECDC4" radius={[6, 6, 0, 0]} maxBarSize={44} />
            <Bar dataKey="lossR" name="Loss R" fill="#FF6B6B" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
        <div className="anl-net-labels">
          {chartData.map(d => (
            <div key={d.day} className="anl-net-label">
              <span className={d.netR >= 0 ? 'win' : 'loss'}>{fmtR(d.netR)}</span>
              <span className="anl-net-day">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
