import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceArea, ReferenceLine 
} from 'recharts';
import { TrendingUp, Activity, AlertTriangle, ArrowDownRight } from 'lucide-react';
import '../styles/all-time-curve.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const parseTradeDate = (text) => {
  if (!text) return '';
  const match = text.match(/^\s*([0-9]{1,2}[-/\s][A-Za-z]{3})/i);
  if (match) return match[1];
  return '';
};

const fmtR = (r) => `${r > 0 ? '+' : ''}${parseFloat(r.toFixed(2))}R`;

const CustomTooltip = ({ active, payload, label, chartData }) => {
  if (!active || !payload || !payload.length) return null;
  const point = chartData[label];
  if (!point) return null;
  
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 800, marginBottom: 6, color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {point.label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p style={{ color: '#292F36', fontWeight: 800, fontSize: '1.1rem' }}>
          Eq: <span style={{ color: point.cumulativeR >= 0 ? '#4ECDC4' : '#FF6B6B' }}>{fmtR(point.cumulativeR)}</span>
        </p>
        {point.rValue !== 0 && (
          <p style={{ color: '#6b7280', fontWeight: 700, fontSize: '0.85rem' }}>
            Trade: <span style={{ color: point.rValue >= 0 ? '#4ECDC4' : '#FF6B6B' }}>{fmtR(point.rValue)}</span>
          </p>
        )}
        {point.drawdown < 0 && (
          <p style={{ color: '#FF6B6B', fontWeight: 700, fontSize: '0.85rem', marginTop: '4px', borderTop: '1px solid #f3f4f6', paddingTop: '4px' }}>
            Drawdown: {parseFloat(point.drawdown.toFixed(2))}R
          </p>
        )}
      </div>
    </div>
  );
};

const StatBox = ({ title, value, sub, icon: Icon, color }) => (
  <div className="atc-stat-box">
    <div className="atc-stat-header">
      <span className="atc-stat-title">{title}</span>
      {Icon && <Icon size={16} style={{ color }} />}
    </div>
    <div className="atc-stat-value" style={{ color }}>{value}</div>
    {sub && <div className="atc-stat-sub">{sub}</div>}
  </div>
);

const AllTimeCurveView = ({ monthsData }) => {
  const { chartData, stats } = useMemo(() => {
    if (!monthsData || monthsData.length === 0) return { chartData: [], stats: null };

    // Sort chronologically
    const sorted = [...monthsData].sort((a, b) => {
      const yearDiff = Number(a.year) - Number(b.year);
      if (yearDiff !== 0) return yearDiff;
      return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
    });

    const data = [];
    let allTimeR = 0;
    
    // Add start point
    data.push({
      index: 0,
      label: 'Start',
      rValue: 0,
      cumulativeR: 0,
      drawdown: 0
    });

    sorted.forEach(entry => {
      const yearShort = entry.year.toString().slice(-2);
      (entry.data || []).forEach(trade => {
        allTimeR += trade.rValue;
        
        const datePrefix = parseTradeDate(trade.originalText);
        const label = datePrefix ? `${datePrefix} '${yearShort}` : `${entry.month.substring(0,3)} '${yearShort}`;
        
        data.push({
          index: data.length,
          label,
          rValue: trade.rValue,
          cumulativeR: parseFloat(allTimeR.toFixed(2)),
          drawdown: 0 // Will calculate properly below
        });
      });
    });

    // Calculate drawdowns and find max drawdown
    let currentPeakR = 0;
    let currentPeakIndex = 0;
    
    let maxDrawdown = 0;
    let troughIndex = 0;
    let troughPeakIndex = 0;

    data.forEach((point, idx) => {
      if (point.cumulativeR > currentPeakR) {
        currentPeakR = point.cumulativeR;
        currentPeakIndex = idx;
      }
      
      const dd = point.cumulativeR - currentPeakR;
      point.drawdown = dd;
      
      if (dd < maxDrawdown) {
        maxDrawdown = dd;
        troughIndex = idx;
        troughPeakIndex = currentPeakIndex;
      }
    });

    // Peak overall
    const maxR = data.reduce((max, p) => p.cumulativeR > max ? p.cumulativeR : max, 0);
    const minR = data.reduce((min, p) => p.cumulativeR < min ? p.cumulativeR : min, 0);

    return {
      chartData: data,
      stats: {
        totalTrades: data.length - 1,
        netR: allTimeR,
        maxDrawdown,
        maxR,
        troughPeakIndex,
        troughIndex
      }
    };
  }, [monthsData]);

  if (!chartData || chartData.length <= 1) {
    return (
      <div className="atc-empty-state">
        <TrendingUp size={64} style={{ color: 'var(--secondary)' }} />
        <p>No trades recorded yet. Start adding data to see your all-time curve!</p>
      </div>
    );
  }

  const { totalTrades, netR, maxDrawdown, maxR, troughPeakIndex, troughIndex } = stats;

  return (
    <div className="atc-wrapper">
      <div className="atc-page-header">
        <div>
          <h1 className="atc-page-title">All-Time Equity Curve</h1>
          <p className="atc-page-sub">Master chronological view of all your trading history</p>
        </div>
      </div>

      <div className="atc-stats-grid">
        <StatBox 
          title="TOTAL TRADES" 
          value={totalTrades} 
          sub="All time executions"
          icon={Activity}
          color="#6b7280"
        />
        <StatBox 
          title="ALL-TIME NET R" 
          value={fmtR(netR)} 
          sub="Final account standing"
          icon={TrendingUp}
          color={netR >= 0 ? '#4ECDC4' : '#FF6B6B'}
        />
        <StatBox 
          title="PEAK EQUITY" 
          value={fmtR(maxR)} 
          sub="Highest account value"
          icon={TrendingUp}
          color="#4a90e2"
        />
        <StatBox 
          title="MAX DRAWDOWN" 
          value={`${parseFloat(maxDrawdown.toFixed(2))}R`} 
          sub="Largest peak-to-trough drop"
          icon={ArrowDownRight}
          color="#FF6B6B"
        />
      </div>

      <div className="atc-chart-card">
        <div className="atc-chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--primary)' }} />
            <span className="atc-chart-title" style={{ color: 'var(--primary)' }}>CUMULATIVE PERFORMANCE</span>
          </div>
          {maxDrawdown < 0 && (
            <div className="atc-dd-legend">
              <span className="atc-dd-box"></span>
              Max Drawdown Zone ({parseFloat(maxDrawdown.toFixed(2))}R)
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 500, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="colorNetR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={netR >= 0 ? "#4ECDC4" : "#FF6B6B"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={netR >= 0 ? "#4ECDC4" : "#FF6B6B"} stopOpacity={0}/>
                </linearGradient>
                <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="#FF6B6B" fillOpacity="0.15" />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#FF6B6B" strokeWidth="2" strokeOpacity="0.6" />
                </pattern>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="index" 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(tick) => {
                  const label = chartData[tick]?.label;
                  // Only show tick if it's the start of a new month roughly
                  return tick % Math.max(1, Math.floor(chartData.length / 10)) === 0 ? label : '';
                }}
                tick={{ fill: '#9ca3af', fontWeight: 700, fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontWeight: 800, fontSize: 13 }} 
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip chartData={chartData} />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={2} />
              
              <Area 
                type="monotone" 
                dataKey="cumulativeR" 
                stroke={netR >= 0 ? "#4ECDC4" : "#FF6B6B"} 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorNetR)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: netR >= 0 ? "#4ECDC4" : "#FF6B6B" }}
              />

              {/* Highlight the Max Drawdown Zone (rendered after Area so it appears on top) */}
              {maxDrawdown < 0 && troughPeakIndex !== troughIndex && (
                <ReferenceArea 
                  x1={troughPeakIndex} 
                  x2={troughIndex} 
                  fill="url(#diagonalHatch)" 
                  strokeOpacity={0} 
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AllTimeCurveView;
