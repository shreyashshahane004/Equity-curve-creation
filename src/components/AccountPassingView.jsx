import React, { useState, useMemo } from 'react';
import { Award, ShieldCheck, Target, Activity, AlertCircle, TrendingUp } from 'lucide-react';
import '../styles/account-passing.css';

const AccountPassingView = ({ monthsData }) => {
  const [target1, setTarget1] = useState(4);
  const [isStrictMonth, setIsStrictMonth] = useState(false);
  const target2 = 2.5; // Phase 2 target is fixed at +2.5R as per requirements
  const lossLimit = -5; // Loss limit is fixed at -5R absolute from 0

  const results = useMemo(() => {
    if (!monthsData || monthsData.length === 0) return [];

    // Flatten all trades chronologically across all months
    const allTrades = [];
    monthsData.forEach(month => {
      if (month.data) {
        allTrades.push(...month.data);
      }
    });

    return monthsData.map(monthEntry => {
      let p1Status = 'ongoing'; // 'ongoing', 'passed', 'failed'
      let p2Status = null; // null (not reached), 'ongoing', 'passed', 'failed'
      
      let p1Trades = [];
      let p2Trades = [];
      
      let currentCum = 0;
      let p1EndCum = 0;
      let p2EndCum = 0;

      if (!monthEntry.data || monthEntry.data.length === 0) {
        return { ...monthEntry, p1Status: 'failed', p2Status: null, p1Trades: [], p2Trades: [] };
      }

      const firstTradeOfThisMonth = monthEntry.data[0];
      const startIndex = allTrades.findIndex(t => t === firstTradeOfThisMonth);
      
      const maxTrades = isStrictMonth ? monthEntry.data.length : (allTrades.length - startIndex);

      for (let i = 0; i < maxTrades; i++) {
        const trade = allTrades[startIndex + i];
        const rVal = parseFloat(trade.rValue || 0);
        
        if (p1Status === 'ongoing') {
          currentCum += rVal;
          currentCum = Math.round(currentCum * 100) / 100;
          p1Trades.push({ ...trade, cumAtStep: currentCum });
          
          if (currentCum <= lossLimit) {
            p1Status = 'failed';
            p1EndCum = currentCum;
            break;
          } else if (currentCum >= target1) {
            p1Status = 'passed';
            p1EndCum = currentCum;
            // Phase 1 passed, reset for Phase 2
            p2Status = 'ongoing';
            currentCum = 0;
          }
        } else if (p2Status === 'ongoing') {
          currentCum += rVal;
          currentCum = Math.round(currentCum * 100) / 100;
          p2Trades.push({ ...trade, cumAtStep: currentCum });
          
          if (currentCum <= lossLimit) {
            p2Status = 'failed';
            p2EndCum = currentCum;
            break;
          } else if (currentCum >= target2) {
            p2Status = 'passed';
            p2EndCum = currentCum;
            break;
          }
        } else {
            break; // Challenge complete
        }
      }

      // If month ends and we are still ongoing
      if (p1Status === 'ongoing') p1EndCum = currentCum;
      if (p2Status === 'ongoing') p2EndCum = currentCum;

      return {
        ...monthEntry,
        monthLabel: `${monthEntry.month} ${monthEntry.year}`,
        p1Status,
        p2Status,
        p1Trades,
        p2Trades,
        p1EndCum,
        p2EndCum
      };
    });
  }, [monthsData, target1, isStrictMonth]);

  const stats = useMemo(() => {
    let total = 0;
    let singlePassed = 0;
    let combinedPassed = 0;
    
    let singleTradesSum = 0;
    let combinedTradesSum = 0;

    results.forEach(res => {
      if (res.data && res.data.length > 0) {
        total++;
        if (res.p1Status === 'passed') {
          singlePassed++;
          singleTradesSum += res.p1Trades.length;
        }
        if (res.p2Status === 'passed') {
          combinedPassed++;
          combinedTradesSum += (res.p1Trades.length + res.p2Trades.length);
        }
      }
    });

    return {
      total,
      singlePassed,
      combinedPassed,
      singleRate: total > 0 ? ((singlePassed / total) * 100).toFixed(1) : 0,
      combinedRate: total > 0 ? ((combinedPassed / total) * 100).toFixed(1) : 0,
      avgSingleTrades: singlePassed > 0 ? (singleTradesSum / singlePassed).toFixed(1) : 0,
      avgCombinedTrades: combinedPassed > 0 ? (combinedTradesSum / combinedPassed).toFixed(1) : 0,
    };
  }, [results]);

  if (!monthsData || monthsData.length === 0) {
    return (
      <div className="apv-wrapper">
        <div className="apv-empty-state">
          <Award size={64} style={{ color: 'var(--secondary)' }} />
          <p>No months recorded yet.</p>
        </div>
      </div>
    );
  }

  const renderTradePill = (trade, idx) => {
    const rVal = parseFloat(trade.rValue || 0);
    let type = 'neutral';
    if (rVal > 0) type = 'win';
    else if (rVal < 0) type = 'loss';

    return (
      <div key={idx} className={`apv-trade-pill ${type}`} title={trade.originalText}>
        {rVal > 0 ? '+' : ''}{rVal}R
        <span className="apv-cum-balance" style={{ color: 'var(--text-dark)' }}>
          ({trade.cumAtStep > 0 ? '+' : ''}{trade.cumAtStep}R)
        </span>
      </div>
    );
  };

  const getStatusBadge = (status, phaseLabel) => {
    if (status === 'passed') return <span className="apv-badge passed"><ShieldCheck size={14}/> {phaseLabel} Passed</span>;
    if (status === 'failed') return <span className="apv-badge failed"><AlertCircle size={14}/> {phaseLabel} Failed</span>;
    if (status === 'ongoing') return <span className="apv-badge ongoing"><Activity size={14}/> {phaseLabel} Ongoing</span>;
    return null;
  };

  return (
    <div className="apv-wrapper">
      <div className="apv-header">
        <div>
          <h1 className="apv-title">Account Passing Simulator</h1>
          <p className="apv-sub">Simulate prop firm challenges starting fresh each month</p>
        </div>
        
        <div className="apv-settings">
          <button 
            onClick={() => setIsStrictMonth(v => !v)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1.5px solid ${isStrictMonth ? 'var(--primary)' : '#e5e7eb'}`,
              background: isStrictMonth ? 'rgba(67,198,172,0.1)' : 'white',
              color: isStrictMonth ? 'var(--primary)' : '#6b7280',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginRight: '10px'
            }}
          >
            {isStrictMonth ? 'Strict Month End' : 'Continuous Mode'}
          </button>
          <Target size={18} style={{ color: 'var(--primary)' }} />
          <label>Target 1 (Phase 1):</label>
          <input 
            type="number" 
            value={target1} 
            onChange={(e) => setTarget1(Number(e.target.value))}
            min="1"
            step="0.5"
          />
          <span style={{ fontWeight: 800, color: 'var(--text-light)', marginLeft: '-8px' }}>R</span>
        </div>
      </div>

      <div className="apv-summary-grid">
        <div className="apv-summary-card total">
          <div className="apv-card-title"><Activity size={16}/> Total Valid Months</div>
          <div className="apv-card-value">{stats.total}</div>
          <div className="apv-card-rate neutral">Evaluated for challenges</div>
        </div>
        <div className="apv-summary-card single">
          <div className="apv-card-title"><Award size={16}/> Single Target Passed</div>
          <div className="apv-card-value">{stats.singlePassed}</div>
          <div className="apv-card-rate success">{stats.singleRate}% Success Rate</div>
          {stats.singlePassed > 0 && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', marginTop: '6px' }}>
               Avg {stats.avgSingleTrades} trades to pass
            </div>
          )}
        </div>
        <div className="apv-summary-card combined">
          <div className="apv-card-title"><ShieldCheck size={16}/> Combined Passed</div>
          <div className="apv-card-value">{stats.combinedPassed}</div>
          <div className="apv-card-rate purple">{stats.combinedRate}% Success Rate</div>
          {stats.combinedPassed > 0 && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', marginTop: '6px' }}>
               Avg {stats.avgCombinedTrades} trades to pass
            </div>
          )}
        </div>
      </div>

      <div className="apv-list">
        {results.filter(r => r.data && r.data.length > 0).map((res) => (
          <div key={res.id} className="apv-month-row">
            <div className="apv-month-header">
              <div className="apv-month-title">
                {res.monthLabel}
                {res.strategyName && res.strategy === 'combined' && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#f3f4f6', borderRadius: '10px', color: '#6b7280' }}>{res.strategyName}</span>
                )}
              </div>
              <div className="apv-badges">
                {getStatusBadge(res.p1Status, 'Phase 1')}
                {res.p2Status && getStatusBadge(res.p2Status, 'Phase 2')}
              </div>
            </div>

            <div className="apv-trades-breakdown">
              <div className="apv-phase">
                <div className="apv-phase-title">
                  Phase 1 (Target: +{target1}R, Limit: {lossLimit}R) 
                  <span style={{ marginLeft: 'auto', color: res.p1EndCum >= 0 ? '#4ECDC4' : '#FF6B6B' }}>
                    End Balance: {res.p1EndCum > 0 ? '+' : ''}{res.p1EndCum}R
                  </span>
                </div>
                {res.p1Trades.length > 0 ? (
                  <div className="apv-trades-list">
                    {res.p1Trades.map((t, idx) => renderTradePill(t, idx))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>No trades taken</div>
                )}
              </div>

              {res.p2Status && (
                <div className="apv-phase" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e5e7eb' }}>
                  <div className="apv-phase-title">
                    Phase 2 (Target: +{target2}R, Limit: {lossLimit}R)
                    <span style={{ marginLeft: 'auto', color: res.p2EndCum >= 0 ? '#4ECDC4' : '#FF6B6B' }}>
                      End Balance: {res.p2EndCum > 0 ? '+' : ''}{res.p2EndCum}R
                    </span>
                  </div>
                  {res.p2Trades.length > 0 ? (
                    <div className="apv-trades-list">
                      {res.p2Trades.map((t, idx) => renderTradePill(t, idx))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>No trades taken</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountPassingView;
