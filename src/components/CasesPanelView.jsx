import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine } from 'recharts';

const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CasesPanelView = ({ runDetails, targetR, maxDrawdownR, onClose }) => {
  const [expandedCase, setExpandedCase] = useState(null);
  const [collapsedYears, setCollapsedYears] = useState({});
  const [collapsedMonths, setCollapsedMonths] = useState({});

  // Group by year → month
  const grouped = useMemo(() => {
    const yearMap = {};
    (runDetails || []).forEach(run => {
      if (!run.startDateStr) return;
      const parts = run.startDateStr.split('-');
      if (parts.length < 2) return;
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const month = MONTH_ORDER[monthIdx] || 'Unknown';
      if (!yearMap[year]) yearMap[year] = { wins: 0, losses: 0, pending: 0, months: {} };
      if (!yearMap[year].months[month]) yearMap[year].months[month] = { wins: 0, losses: 0, pending: 0, cases: [], monthIdx };
      if (run.outcome === 'success') { yearMap[year].wins++; yearMap[year].months[month].wins++; }
      else if (run.outcome === 'failure') { yearMap[year].losses++; yearMap[year].months[month].losses++; }
      else { yearMap[year].pending++; yearMap[year].months[month].pending++; }
      yearMap[year].months[month].cases.push(run);
    });
    return yearMap;
  }, [runDetails]);

  const sortedYears = Object.keys(grouped).sort();

  const toggleYear = y => setCollapsedYears(p => ({ ...p, [y]: !p[y] }));
  const toggleMonth = k => setCollapsedMonths(p => ({ ...p, [k]: !p[k] }));

  const totalW = (runDetails || []).filter(r => r.outcome === 'success').length;
  const totalL = (runDetails || []).filter(r => r.outcome === 'failure').length;
  const totalHitRate = (totalW + totalL) > 0 ? ((totalW / (totalW + totalL)) * 100).toFixed(1) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background: '#fff', padding: '14px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e293b', marginBottom: 2 }}>
              All Simulation Cases
            </h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{(runDetails || []).length} total scenarios</span>
              <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>✓ {totalW} Wins</span>
              <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>✗ {totalL} Losses</span>
              <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800 }}>{totalHitRate}% Hit Rate</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Target: +{targetR}R · DD: {maxDrawdownR}R · Click a case to expand
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#64748b', flexShrink: 0 }}>✕</button>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {sortedYears.map(year => {
            const yData = grouped[year];
            const isYearCollapsed = collapsedYears[year];
            const yTotal = yData.wins + yData.losses;
            const yRate = yTotal > 0 ? ((yData.wins / yTotal) * 100).toFixed(0) : 0;

            return (
              <div key={year} style={{ marginBottom: 20 }}>
                {/* Year Header */}
                <div
                  onClick={() => toggleYear(year)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', background: 'linear-gradient(135deg, #1e293b, #334155)', borderRadius: 12, cursor: 'pointer', marginBottom: isYearCollapsed ? 0 : 10, userSelect: 'none' }}
                >
                  {isYearCollapsed ? <ChevronRight size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                  <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.05rem' }}>{year}</span>
                  <span style={{ background: '#4ECDC4', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>✓ {yData.wins} W</span>
                  <span style={{ background: '#FF6B6B', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>✗ {yData.losses} L</span>
                  {yData.pending > 0 && <span style={{ background: '#94a3b8', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>⏳ {yData.pending}</span>}
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem', marginLeft: 'auto' }}>{yRate}% hit rate</span>
                </div>

                {!isYearCollapsed && Object.entries(yData.months)
                  .sort((a, b) => a[1].monthIdx - b[1].monthIdx)
                  .map(([month, mData]) => {
                    const mKey = `${year}-${month}`;
                    const isMonthCollapsed = collapsedMonths[mKey];
                    const mTotal = mData.wins + mData.losses;
                    const mRate = mTotal > 0 ? ((mData.wins / mTotal) * 100).toFixed(0) : 0;

                    return (
                      <div key={mKey} style={{ marginLeft: 16, marginBottom: 8 }}>
                        {/* Month Header */}
                        <div
                          onClick={() => toggleMonth(mKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', borderRadius: 8, cursor: 'pointer', border: '1.5px solid #e2e8f0', marginBottom: isMonthCollapsed ? 0 : 8, userSelect: 'none' }}
                        >
                          {isMonthCollapsed ? <ChevronRight size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                          <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem', minWidth: 32 }}>{month}</span>
                          <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>✓ {mData.wins}</span>
                          <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>✗ {mData.losses}</span>
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', marginLeft: 'auto' }}>{mData.cases.length} cases · {mRate}% success</span>
                        </div>

                        {!isMonthCollapsed && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 12 }}>
                            {mData.cases.map(run => {
                              const isExp = expandedCase === run.id;
                              const ok = run.outcome === 'success';
                              const bad = run.outcome === 'failure';
                              const borderColor = ok ? '#4ECDC4' : bad ? '#FF6B6B' : '#e5e7eb';

                              return (
                                <div key={run.id} style={{ background: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                  {/* Case row */}
                                  <div
                                    onClick={() => setExpandedCase(isExp ? null : run.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', background: isExp ? '#f8fafc' : '#fff' }}
                                  >
                                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, background: ok ? '#4ECDC4' : bad ? '#FF6B6B' : '#f3f4f6', color: (ok || bad) ? '#fff' : '#6b7280', flexShrink: 0 }}>
                                      {ok ? '✓ WIN' : bad ? '✗ LOSS' : '⏳ OPEN'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>📅 {run.startDateStr}</span>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{run.tradesTaken} trades</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: run.finalR >= 0 ? '#4ECDC4' : '#FF6B6B', marginLeft: 'auto' }}>
                                      {run.finalR > 0 ? '+' : ''}{run.finalR}R
                                    </span>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{isExp ? '▲' : '▼'}</span>
                                  </div>

                                  {/* Expanded: chart + table */}
                                  {isExp && (
                                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' }}>
                                      {/* Mini equity curve */}
                                      <div style={{ height: 130, marginTop: 10, marginBottom: 12 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={run.path} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
                                            <ReferenceLine y={targetR} stroke="#4ECDC4" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: `+${targetR}R`, position: 'right', fontSize: 10, fill: '#4ECDC4' }} />
                                            <ReferenceLine y={maxDrawdownR} stroke="#FF6B6B" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: `${maxDrawdownR}R`, position: 'right', fontSize: 10, fill: '#FF6B6B' }} />
                                            <Line type="monotone" dataKey="cumulative" stroke={ok ? '#4ECDC4' : bad ? '#FF6B6B' : '#94a3b8'} dot={false} strokeWidth={2.5} />
                                          </LineChart>
                                        </ResponsiveContainer>
                                      </div>
                                      {/* Trades table */}
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                                        <thead>
                                          <tr style={{ background: '#f8fafc' }}>
                                            {['#','Date','Trade','R','Cumulative'].map(h => (
                                              <th key={h} style={{ padding: '5px 8px', textAlign: h === 'R' || h === 'Cumulative' ? 'right' : 'left', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {run.path.map((p, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                              <td style={{ padding: '4px 8px', color: '#94a3b8' }}>{i + 1}</td>
                                              <td style={{ padding: '4px 8px', color: '#334155', fontWeight: 600 }}>{p.dateStr}</td>
                                              <td style={{ padding: '4px 8px', color: '#64748b' }}>{p.originalText}</td>
                                              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: p.rValue > 0 ? '#4ECDC4' : p.rValue < 0 ? '#FF6B6B' : '#94a3b8' }}>
                                                {p.rValue > 0 ? '+' : ''}{p.rValue}R
                                              </td>
                                              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: p.cumulative >= 0 ? '#4ECDC4' : '#FF6B6B' }}>
                                                {p.cumulative > 0 ? '+' : ''}{p.cumulative}R
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CasesPanelView;
