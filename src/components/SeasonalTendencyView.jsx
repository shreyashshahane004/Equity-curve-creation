import React, { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar } from 'lucide-react';
import '../styles/seasonal-tendency.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtR = (r) => `${r > 0 ? '+' : ''}${parseFloat(r.toFixed(2))}R`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const net = payload[0].value;
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 800, marginBottom: 4, color: '#292F36' }}>{label}</p>
      <p style={{ color: net >= 0 ? '#4ECDC4' : '#FF6B6B', fontWeight: 800 }}>Net: {fmtR(net)}</p>
    </div>
  );
};

const SeasonalTendencyView = ({ monthsData }) => {
  const chartData = useMemo(() => {
    return MONTHS.map((monthName, idx) => {
      const entries = monthsData.filter(m => m.month === monthName);
      let totalR = 0;
      entries.forEach(entry => {
         const rValues = entry.data ? entry.data.map(d => d.cumulativeR) : [];
         const endR = rValues.length > 0 ? rValues[rValues.length - 1] : 0;
         totalR += endR;
      });
      return {
        month: SHORT_MONTHS[idx],
        fullMonth: monthName,
        netR: parseFloat(totalR.toFixed(2)),
        count: entries.length
      };
    });
  }, [monthsData]);

  if (!monthsData || monthsData.length === 0) {
    return (
      <div className="st-empty-state">
        <span style={{ fontSize: '3rem' }}>📊</span>
        <p>No month data recorded yet.</p>
      </div>
    );
  }

  const validData = chartData.filter(d => d.count > 0);
  const bestMonth = validData.length > 0
    ? validData.reduce((best, d) => d.netR > best.netR ? d : best, validData[0])
    : null;

  return (
    <div className="st-wrapper">
      <div className="st-page-header">
        <div>
          <h1 style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.5rem' }}>Seasonal Tendency</h1>
          <p style={{ color: 'var(--text-light)', marginTop: 4 }}>
            Aggregated Net R for each month across all years
          </p>
        </div>
      </div>

      <div className="st-chart-card">
        <div className="st-chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} style={{ color: '#8b5cf6' }} />
            <span className="st-chart-title" style={{ color: '#8b5cf6' }}>MONTHLY TENDENCIES</span>
          </div>
          {bestMonth && (
            <span className="st-best-month">
              Best Month: <strong style={{ color: '#4ECDC4' }}>{bestMonth.fullMonth} ({fmtR(bestMonth.netR)})</strong>
            </span>
          )}
        </div>
        
        <div style={{ flex: 1, minHeight: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 10 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 700, fontSize: 13 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 700, fontSize: 13 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={2} />
              <Bar dataKey="netR" radius={[6, 6, 6, 6]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.netR >= 0 ? '#4ECDC4' : '#FF6B6B'} opacity={entry.count === 0 ? 0.3 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="st-net-labels">
          {chartData.map(d => (
            <div key={d.month} className="st-net-label" style={{ opacity: d.count === 0 ? 0.4 : 1 }}>
              <span className={d.netR > 0 ? 'win' : d.netR < 0 ? 'loss' : 'zero'}>
                {fmtR(d.netR)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeasonalTendencyView;
