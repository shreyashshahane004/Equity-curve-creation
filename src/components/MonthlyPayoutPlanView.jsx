import React, { useMemo, useState } from 'react';
import { Calendar, TrendingUp, RefreshCcw, ChevronDown, ChevronRight, Zap, AlertTriangle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import '../styles/payout-simulation.css';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MonthlyPayoutPlanView = ({ tradesData }) => {
  const [targetR, setTargetR] = useState(4);
  const [maxDrawdownR, setMaxDrawdownR] = useState(-10);
  const [excludeFOMC, setExcludeFOMC] = useState(true);
  const [excludeFridays, setExcludeFridays] = useState(false);
  const [mode, setMode] = useState('fresh'); // 'fresh' | 'carryover' | 'continuous'
  const [expandedMonth, setExpandedMonth] = useState(null);

  const stats = useMemo(() => {
    if (!tradesData || tradesData.length === 0) return null;

    // Apply filters
    let trades = tradesData;
    if (excludeFOMC) trades = trades.filter(t => !t.is_fomc);
    if (excludeFridays) trades = trades.filter(t => t.day_of_week !== 5);

    // Find starting index for each month
    const monthStartIndices = [];
    let lastMonthKey = null;
    trades.forEach((t, i) => {
      if (!t.trade_date) return;
      const parts = t.trade_date.split('-');
      const key = `${parts[0]}-${parts[1]}`;
      if (key !== lastMonthKey) {
        monthStartIndices.push({ key, index: i, year: parseInt(parts[0]), monthIdx: parseInt(parts[1]) - 1 });
        lastMonthKey = key;
      }
    });

    // Run simulation
    const cases = [];
    let carryover = 0; // only used in carryover mode

    monthStartIndices.forEach(({ key, index, year, monthIdx }) => {
      const startR = mode === 'carryover' ? carryover : 0;
      let cumulative = startR;
      let tradesTaken = 0;
      let resolved = false;
      let outcome = mode === 'continuous' ? 'pending' : 'miss';
      const path = [{ tradeNo: 0, dateStr: key, rValue: 0, cumulative: startR }];

      for (let i = index; i < trades.length; i++) {
        const t = trades[i];
        
        // In fresh/carryover mode, stop if we enter a new month
        if (mode !== 'continuous') {
          const parts = t.trade_date.split('-');
          const tKey = `${parts[0]}-${parts[1]}`;
          if (tKey !== key) break;
        }

        if (t.r_value !== 0) tradesTaken++;
        cumulative += (t.r_value || 0);
        cumulative = Math.round(cumulative * 100) / 100;
        path.push({
          tradeNo: tradesTaken,
          dateStr: t.trade_date,
          originalText: t.original_text,
          rValue: t.r_value || 0,
          cumulative
        });

        if (cumulative >= targetR) {
          outcome = 'success';
          resolved = true;
          break;
        }
        
        if (mode === 'continuous' && cumulative <= maxDrawdownR) {
          outcome = 'failure';
          resolved = true;
          break;
        }
      }

      // Update carryover for next month
      if (mode === 'carryover') {
        carryover = resolved ? 0 : cumulative; // reset on payout, carry on miss
      }

      cases.push({
        key,
        year,
        monthIdx,
        monthName: MONTH_SHORT[monthIdx],
        fullMonthName: MONTH_NAMES[monthIdx],
        outcome, // 'success' | 'miss' | 'failure' | 'pending'
        tradesTaken,
        startR,
        finalR: cumulative,
        neededMore: resolved ? 0 : Math.round((targetR - cumulative) * 100) / 100,
        path
      });
    });

    const wins = cases.filter(c => c.outcome === 'success').length;
    const losses = cases.filter(c => c.outcome === 'miss' || c.outcome === 'failure').length;
    const hitRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
    const avgTrades = wins > 0
      ? cases.filter(c => c.outcome === 'success').reduce((s, c) => s + c.tradesTaken, 0) / wins
      : 0;

    // Group by year for display
    const byYear = {};
    cases.forEach(c => {
      if (!byYear[c.year]) byYear[c.year] = { wins: 0, losses: 0, months: [] };
      byYear[c.year].months.push(c);
      if (c.outcome === 'success') byYear[c.year].wins++;
      else byYear[c.year].losses++;
    });

    return { cases, wins, losses, hitRate, avgTrades, byYear, totalMonths: cases.length };
  }, [tradesData, targetR, excludeFOMC, excludeFridays, mode]);

  if (!tradesData || tradesData.length === 0) {
    return (
      <div className="ps-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <RefreshCcw size={64} style={{ color: 'var(--secondary)' }} />
        <p style={{ color: 'var(--text-light)', fontWeight: 800, marginTop: 16 }}>No data to simulate yet.</p>
      </div>
    );
  }

  return (
    <div className="ps-wrapper">

      {/* ── Header ── */}
      <div className="ps-header">
        <div>
          <h1 className="ps-title">Monthly Payout Plan</h1>
          <p className="ps-sub">
            Start fresh each month, trade until +{targetR}R target is hit, then stop for the month.
          </p>
        </div>
      </div>

      {/* ── Mode Toggle + Filters Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {/* Mode Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, gap: 4 }}>
          <button
            onClick={() => setMode('fresh')}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
              background: mode === 'fresh' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
              color: mode === 'fresh' ? '#fff' : '#64748b',
              boxShadow: mode === 'fresh' ? '0 2px 8px rgba(99,102,241,0.35)' : 'none'
            }}
          >
            🔄 Fresh Start
          </button>
          <button
            onClick={() => setMode('carryover')}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
              background: mode === 'carryover' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'transparent',
              color: mode === 'carryover' ? '#fff' : '#64748b',
              boxShadow: mode === 'carryover' ? '0 2px 8px rgba(245,158,11,0.35)' : 'none'
            }}
          >
            ↗️ With Carryover
          </button>
          <button
            onClick={() => setMode('continuous')}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
              background: mode === 'continuous' ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'transparent',
              color: mode === 'continuous' ? '#fff' : '#64748b',
              boxShadow: mode === 'continuous' ? '0 2px 8px rgba(16,185,129,0.35)' : 'none'
            }}
          >
            ♾️ No Boundary
          </button>
        </div>

        {/* Target R slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 10, padding: '6px 14px', border: '1.5px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Target:</span>
          <input type="range" min="1" max="20" step="1" value={targetR}
            onChange={e => setTargetR(Number(e.target.value))}
            className="ps-slider success-slider" style={{ width: 80 }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#4ECDC4', minWidth: 36 }}>+{targetR}R</span>
        </div>

        {/* DD slider (Only continuous) */}
        {mode === 'continuous' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 10, padding: '6px 14px', border: '1.5px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>DD:</span>
            <input type="range" min="-20" max="-1" step="1" value={maxDrawdownR}
              onChange={e => setMaxDrawdownR(Number(e.target.value))}
              className="ps-slider danger-slider" style={{ width: 80 }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FF6B6B', minWidth: 36 }}>{maxDrawdownR}R</span>
          </div>
        )}

        {/* FOMC toggle */}
        <button
          onClick={() => setExcludeFOMC(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s',
            background: excludeFOMC ? '#f59e0b' : '#f3f4f6',
            color: excludeFOMC ? '#fff' : '#6b7280',
            boxShadow: excludeFOMC ? '0 2px 8px rgba(245,158,11,0.35)' : 'none'
          }}
        >
          📅 FOMC {excludeFOMC ? 'Excluded' : 'Included'}
        </button>

        {/* Friday toggle */}
        <button
          onClick={() => setExcludeFridays(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s',
            background: excludeFridays ? '#8b5cf6' : '#f3f4f6',
            color: excludeFridays ? '#fff' : '#6b7280',
            boxShadow: excludeFridays ? '0 2px 8px rgba(139,92,246,0.35)' : 'none'
          }}
        >
          🗓️ Fridays {excludeFridays ? 'Excluded' : 'Included'}
        </button>
      </div>

      {stats && (
        <>
          {/* ── Summary Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Total Months', value: stats.totalMonths, color: '#6366f1' },
              { label: 'Payout Months', value: `${stats.wins} ✓`, color: '#4ECDC4' },
              { label: mode === 'continuous' ? 'Failed Starts' : 'Missed Months', value: `${stats.losses} ✗`, color: '#FF6B6B' },
              { label: 'Hit Rate', value: `${stats.hitRate.toFixed(1)}%`, color: stats.hitRate >= 50 ? '#4ECDC4' : '#FF6B6B' },
              { label: 'Avg Trades to Payout', value: stats.avgTrades > 0 ? `${stats.avgTrades.toFixed(1)}` : '—', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1.5px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Mode Description ── */}
          <div style={{
            background: mode === 'continuous' ? 'rgba(16,185,129,0.08)' : mode === 'fresh' ? 'rgba(99,102,241,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1.5px solid ${mode === 'continuous' ? 'rgba(16,185,129,0.2)' : mode === 'fresh' ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)'}`,
            borderRadius: 12, padding: '12px 18px', marginBottom: 24,
            fontSize: '0.83rem', color: '#334155', fontWeight: 600
          }}>
            {mode === 'fresh'
              ? `🔄 Fresh Start Mode: Each month begins at 0R independently. If a month doesn't reach +${targetR}R, it's counted as a miss and next month starts fresh at 0R again.`
              : mode === 'carryover' 
                ? `↗️ Carryover Mode: If a month ends without reaching +${targetR}R, the remaining R carries forward to the next month. A payout is counted when cumulative R crosses +${targetR}R, then resets to 0.`
                : `♾️ No Boundary Mode: Each month's 1st day starts a new case at 0R. The case continues trading endlessly until it reaches +${targetR}R (Payout) or hits ${maxDrawdownR}R (Drawdown). Next month's case will still start independently on its own 1st day.`
            }
          </div>

          {/* ── Monthly Grid by Year ── */}
          {Object.entries(stats.byYear).sort(([a], [b]) => a - b).map(([year, yData]) => (
            <div key={year} style={{ marginBottom: 32 }}>
              {/* Year Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
                paddingBottom: 10, borderBottom: '2px solid #e2e8f0'
              }}>
                <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#1e293b' }}>{year}</span>
                <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 12px', fontSize: '0.72rem', fontWeight: 800 }}>✓ {yData.wins} payouts</span>
                <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 20, padding: '2px 12px', fontSize: '0.72rem', fontWeight: 800 }}>✗ {yData.losses} misses</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                  {yData.wins + yData.losses > 0 ? ((yData.wins / (yData.wins + yData.losses)) * 100).toFixed(0) : 0}% success
                </span>
              </div>

              {/* Month Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {yData.months.map(c => {
                  const isExpanded = expandedMonth === c.key;
                  const ok = c.outcome === 'success';
                  const pending = c.outcome === 'pending';
                  const progressPct = Math.min(100, Math.max(0, (c.finalR / targetR) * 100));

                  return (
                    <div
                      key={c.key}
                      style={{
                        background: '#fff',
                        border: `2px solid ${ok ? '#4ECDC4' : pending ? '#f59e0b' : '#FF6B6B'}`,
                        borderRadius: 14, overflow: 'hidden',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        transition: 'box-shadow 0.2s'
                      }}
                    >
                      {/* Card Header */}
                      <div
                        onClick={() => setExpandedMonth(isExpanded ? null : c.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 16px', cursor: 'pointer',
                          background: ok
                            ? 'linear-gradient(135deg, rgba(78,205,196,0.08), rgba(78,205,196,0.02))'
                            : pending ? '#fff'
                            : 'linear-gradient(135deg, rgba(255,107,107,0.08), rgba(255,107,107,0.02))'
                        }}
                      >
                        {/* Outcome badge */}
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 900,
                          background: ok ? '#4ECDC4' : pending ? '#f59e0b' : '#FF6B6B', color: '#fff', flexShrink: 0
                        }}>
                          {ok ? '✓ PAYOUT' : pending ? '⏳ OPEN' : mode === 'continuous' ? '✗ FAILED' : '✗ MISS'}
                        </span>

                        {/* Month name */}
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', flex: 1 }}>
                          {c.fullMonthName}
                        </span>

                        {/* Carryover start indicator */}
                        {mode === 'carryover' && c.startR !== 0 && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '2px 7px' }}>
                            carry: {c.startR > 0 ? '+' : ''}{c.startR}R
                          </span>
                        )}

                        {/* Final R */}
                        <span style={{
                          fontWeight: 900, fontSize: '1rem',
                          color: c.finalR >= targetR ? '#4ECDC4' : c.finalR > 0 ? '#f59e0b' : '#FF6B6B'
                        }}>
                          {c.finalR > 0 ? '+' : ''}{c.finalR}R
                        </span>

                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ padding: '0 16px 6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>
                          <span>{c.tradesTaken} trades taken</span>
                          <span>{ok ? `Payout hit!` : pending ? `${c.neededMore}R more needed` : mode === 'continuous' ? `Drawdown hit` : `${c.neededMore}R more needed`}</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${progressPct}%`,
                            background: ok ? '#4ECDC4' : `linear-gradient(90deg, #FF6B6B, #f59e0b)`,
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 16px' }}>
                          {/* Mini equity curve */}
                          <div style={{ height: 120, marginBottom: 12 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={c.path} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <XAxis dataKey="tradeNo" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                <RechartsTooltip
                                  contentStyle={{ fontSize: '0.75rem', borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                  formatter={(v) => [`${v > 0 ? '+' : ''}${v}R`, 'Cumulative']}
                                />
                                <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
                                <ReferenceLine y={targetR} stroke="#4ECDC4" strokeDasharray="4 3" strokeWidth={1.5}
                                  label={{ value: `+${targetR}R`, position: 'right', fontSize: 9, fill: '#4ECDC4' }} />
                                {mode === 'continuous' && (
                                  <ReferenceLine y={maxDrawdownR} stroke="#FF6B6B" strokeDasharray="4 3" strokeWidth={1.5}
                                    label={{ value: `${maxDrawdownR}R`, position: 'right', fontSize: 9, fill: '#FF6B6B' }} />
                                )}
                                {mode === 'carryover' && c.startR !== 0 && (
                                  <ReferenceLine y={c.startR} stroke="#f59e0b" strokeDasharray="3 2" strokeWidth={1}
                                    label={{ value: `carry`, position: 'left', fontSize: 9, fill: '#f59e0b' }} />
                                )}
                                <Line type="monotone" dataKey="cumulative" stroke={ok ? '#4ECDC4' : pending ? '#f59e0b' : '#FF6B6B'}
                                  dot={false} strokeWidth={2.5} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Trade table */}
                          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                  {['#', 'Date', 'Trade', 'R', 'Running'].map(h => (
                                    <th key={h} style={{ padding: '4px 8px', textAlign: h === 'R' || h === 'Running' ? 'right' : 'left', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {c.path.slice(1).map((p, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc', background: p.cumulative >= targetR ? 'rgba(78,205,196,0.06)' : 'transparent' }}>
                                    <td style={{ padding: '3px 8px', color: '#94a3b8' }}>{i + 1}</td>
                                    <td style={{ padding: '3px 8px', color: '#334155', fontWeight: 600 }}>{p.dateStr}</td>
                                    <td style={{ padding: '3px 8px', color: '#64748b' }}>{p.originalText}</td>
                                    <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: p.rValue > 0 ? '#4ECDC4' : p.rValue < 0 ? '#FF6B6B' : '#94a3b8' }}>
                                      {p.rValue > 0 ? '+' : ''}{p.rValue}R
                                    </td>
                                    <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: p.cumulative >= targetR ? '#4ECDC4' : p.cumulative > 0 ? '#f59e0b' : '#FF6B6B' }}>
                                      {p.cumulative > 0 ? '+' : ''}{p.cumulative}R
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default MonthlyPayoutPlanView;
