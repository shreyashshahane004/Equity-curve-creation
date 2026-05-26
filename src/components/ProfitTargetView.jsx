import React, { useMemo } from 'react';
import { Target, TrendingUp, BarChart2, Activity, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import '../styles/profit-target.css';

const TARGETS = [2, 4, 5, 6, 7, 10];

const CustomBarLabel = (props) => {
  const { x, y, width, height, value } = props;
  return (
    <text x={x + width / 2} y={y - 10} fill="#6b7280" textAnchor="middle" fontWeight="800" fontSize="13">
      {value.toFixed(0)}%
    </text>
  );
};

const ProfitTargetView = ({ monthsData }) => {
  const stats = useMemo(() => {
    if (!monthsData || monthsData.length === 0) return [];

    return TARGETS.map(t => {
      let hitCount = 0;
      let sumTradesToHit = 0;
      let successfulMonths = [];
      let failedMonths = [];
      
      monthsData.forEach(entry => {
        let cumulative = 0;
        let hit = false;
        let tradesCount = 0;
        const monthLabel = `${entry.month.substring(0,3)} '${entry.year.toString().slice(-2)}`;
        
        for (let trade of (entry.data || [])) {
          if (parseFloat(trade.rValue || 0) !== 0) tradesCount++;
          cumulative += trade.rValue;
          cumulative = Math.round(cumulative * 100) / 100;
          if (cumulative >= t) {
            hit = true;
            break;
          }
        }
        
        if (hit) {
          hitCount++;
          sumTradesToHit += tradesCount;
          successfulMonths.push(monthLabel);
        } else {
          failedMonths.push(monthLabel);
        }
      });
      
      const hitRate = monthsData.length > 0 ? (hitCount / monthsData.length) * 100 : 0;
      
      return {
        target: t,
        targetLabel: `${t}R`,
        hitCount,
        totalMonths: monthsData.length,
        hitRate,
        avgTradesToHit: hitCount > 0 ? sumTradesToHit / hitCount : 0,
        successfulMonths,
        failedMonths
      };
    });
  }, [monthsData]);

  if (!monthsData || monthsData.length === 0) {
    return (
      <div className="ptv-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Target size={64} style={{ color: 'var(--secondary)' }} />
        <p style={{ color: 'var(--text-light)', fontWeight: 800, marginTop: '16px' }}>No months recorded yet.</p>
      </div>
    );
  }

  // Color mapping based on hit rate
  const getColor = (rate) => {
    if (rate >= 80) return '#4ECDC4';
    if (rate >= 50) return '#FFD166';
    return '#FF6B6B';
  };

  return (
    <div className="ptv-wrapper">
      <div className="ptv-header">
        <div>
          <h1 className="ptv-title">Profit Target Probabilities</h1>
          <p className="ptv-sub">How often you reach specific R multiples before the month ends</p>
        </div>
      </div>

      <div className="ptv-chart-card">
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#6b7280', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={18} />
          PROBABILITY CURVE
        </h2>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={stats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="targetLabel" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 800 }} dy={10} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow)', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>Target: {data.target}R</div>
                        <div style={{ fontWeight: 700, color: getColor(data.hitRate) }}>Hit Rate: {data.hitRate.toFixed(1)}%</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="hitRate" radius={[6, 6, 0, 0]} barSize={40} label={<CustomBarLabel />}>
                {stats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.hitRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ptv-grid">
        {stats.map(stat => (
          <div key={stat.target} className="ptv-card">
            <div className="ptv-card-header">
              <div className="ptv-target-badge" style={{ background: `${getColor(stat.hitRate)}20`, color: getColor(stat.hitRate) }}>
                <Target size={16} />
                {stat.target}R Target
              </div>
            </div>
            
            <div className="ptv-rate" style={{ color: getColor(stat.hitRate) }}>
              {stat.hitRate.toFixed(1)}%
            </div>
            
            <div className="ptv-ratio">
              Reached in <strong>{stat.hitCount}</strong> out of <strong>{stat.totalMonths}</strong> months
            </div>

            <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', marginBottom: '20px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stat.hitRate}%`, background: getColor(stat.hitRate), borderRadius: '3px', transition: 'width 1s ease-out' }}></div>
            </div>

            {stat.hitCount > 0 && (
              <div className="ptv-avg-trades">
                <Zap size={16} style={{ color: '#F5B041' }} />
                <span>Avg <strong>{stat.avgTradesToHit.toFixed(1)}</strong> trades to hit target</span>
              </div>
            )}

            <div className="ptv-months-list">
              {stat.successfulMonths.map(m => (
                <span key={m} className="ptv-month-pill success" style={{ background: `${getColor(stat.hitRate)}15`, color: getColor(stat.hitRate) }}>{m}</span>
              ))}
              {stat.failedMonths.map(m => (
                <span key={m} className="ptv-month-pill failed">{m}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfitTargetView;
