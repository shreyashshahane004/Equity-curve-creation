import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const emptyStats = () => ({ trades: 0, wins: 0, losses: 0, totalR: 0 });

const addTrade = (stats, r) => {
  if (r === 0) return; // Ignore "no trade" days
  stats.trades++;
  stats.totalR += r;
  stats.totalR = Math.round(stats.totalR * 100) / 100;
  if (r > 0) stats.wins++;
  else if (r < 0) stats.losses++;
};

const winRate = (s) => s.trades > 0 ? ((s.wins / s.trades) * 100).toFixed(1) : '0.0';
const fmtR = (r) => `${r > 0 ? '+' : ''}${parseFloat(r.toFixed(2))}R`;

const aggregateData = (tradesData) => {
  const overall = emptyStats();
  const fomc = emptyStats();
  const nonFomc = emptyStats();
  const cpi = emptyStats();
  const nonCpi = emptyStats();
  const nfp = emptyStats();
  const nonNfp = emptyStats();
  const dayStats = Array(7).fill(null).map(() => ({ winR: 0, lossR: 0, count: 0 }));

  (tradesData || []).forEach(trade => {
    const r = trade.r_value || 0;

    addTrade(overall, r);

    if (trade.trade_date) {
      if (trade.is_fomc) addTrade(fomc, r);
      else addTrade(nonFomc, r);
      
      if (trade.is_cpi) addTrade(cpi, r);
      else addTrade(nonCpi, r);
      
      if (trade.is_nfp) addTrade(nfp, r);
      else addTrade(nonNfp, r);
      
      const dayOfWeek = trade.day_of_week;
      if (dayOfWeek >= 0 && dayOfWeek <= 6) {
        const ds = dayStats[dayOfWeek];
        ds.count++;
        if (r > 0) ds.winR = Math.round((ds.winR + r) * 100) / 100;
        else ds.lossR = Math.round((ds.lossR + Math.abs(r)) * 100) / 100;
      }
    } else {
      // If date is unparseable, it goes into the non-event buckets to keep totals mathematically sound
      addTrade(nonFomc, r);
      addTrade(nonCpi, r);
      addTrade(nonNfp, r);
    }
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
const AnalyticsView = ({ tradesData }) => {
  const { overall, fomc, nonFomc, cpi, nonCpi, nfp, nonNfp, chartData, bestDay } = aggregateData(tradesData);

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
