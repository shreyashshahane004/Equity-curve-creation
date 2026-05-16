import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const parseDayFromText = (originalText, month) => {
  const monthIndex = MONTHS.indexOf(month);
  if (monthIndex === -1) return null;
  const match = (originalText || '').match(/(\d{1,2})[-/\s]([A-Za-z]{3})/);
  if (!match) return null;
  if (match[2].toLowerCase() !== SHORT_MONTHS[monthIndex].toLowerCase()) return null;
  return parseInt(match[1]);
};

const buildDayMap = (data, month) => {
  const map = {};
  (data || []).forEach(trade => {
    const day = parseDayFromText(trade.originalText || '', month);
    if (day) {
      map[day] = (map[day] || 0) + (trade.rValue || 0);
      map[day] = Math.round(map[day] * 100) / 100;
    }
  });
  return map;
};

const buildCalendarWeeks = (monthIndex, year) => {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weeks = [];
  let week = Array(7).fill(null);
  let dayNum = 1;
  for (let i = firstDay; i < 7 && dayNum <= daysInMonth; i++) week[i] = dayNum++;
  weeks.push([...week]);
  while (dayNum <= daysInMonth) {
    week = Array(7).fill(null);
    for (let i = 0; i < 7 && dayNum <= daysInMonth; i++) week[i] = dayNum++;
    weeks.push([...week]);
  }
  return weeks;
};

const fmt = (val) => (val > 0 ? `+${parseFloat(val.toFixed(2))}R` : `${parseFloat(val.toFixed(2))}R`);

// ── Month Grid Card ──────────────────────────────────────────────────
const MonthCard = ({ entry, onClick }) => {
  const rValues = (entry.data || []).map(d => d.cumulativeR);
  const endR = rValues.length > 0 ? rValues[rValues.length - 1] : 0;
  const totalTrades = (entry.data || []).length;
  const isWin = endR >= 0;
  return (
    <div className="cal-month-card" onClick={onClick}>
      <div className="cal-month-card-header">
        <Calendar size={18} style={{ color: 'var(--secondary)' }} />
        <span>{entry.month} {entry.year}</span>
      </div>
      <div className={`cal-month-card-r ${isWin ? 'win' : 'loss'}`}>{endR > 0 ? '+' : ''}{endR}R</div>
      <div className="cal-month-card-trades">{totalTrades} trades recorded</div>
    </div>
  );
};

// ── Calendar Detail ──────────────────────────────────────────────────
const CalendarDetail = ({ sorted, index, onBack, onPrev, onNext }) => {
  const current = sorted[index];
  const monthIndex = MONTHS.indexOf(current.month);
  const year = parseInt(current.year);
  const dayMap = buildDayMap(current.data, current.month);
  const weeks = buildCalendarWeeks(monthIndex, year);
  const weeklyNets = weeks.map(wk => {
    let sum = wk.reduce((s, day) => (day && dayMap[day] !== undefined ? s + dayMap[day] : s), 0);
    return Math.round(sum * 100) / 100;
  });

  // Compute stats from day map
  const tradedDays = Object.values(dayMap);
  const wins = tradedDays.filter(r => r > 0).length;
  const losses = tradedDays.filter(r => r < 0).length;
  const totalR = Math.round(tradedDays.reduce((sum, r) => sum + r, 0) * 100) / 100;

  return (
    <div className="cal-wrapper">
      {/* Header */}
      <div className="cal-header">
        <div className="cal-nav">
          <button className="cal-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> All Months
          </button>
          <button className="cal-nav-btn" onClick={onPrev} disabled={index === 0}>
            <ChevronLeft size={20} />
          </button>
          <h2 className="cal-title">{current.month} {current.year}</h2>
          <button className="cal-nav-btn" onClick={onNext} disabled={index === sorted.length - 1}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Stats + Legend */}
        <div className="cal-header-right">
          <div className="cal-stat-pill win">
            <span className="cal-stat-label">Wins</span>
            <span className="cal-stat-val">{wins}</span>
          </div>
          <div className="cal-stat-pill loss">
            <span className="cal-stat-label">Losses</span>
            <span className="cal-stat-val">{losses}</span>
          </div>
          <div className="cal-stat-pill neutral">
            <span className="cal-stat-label">Total R</span>
            <span className={`cal-stat-val ${totalR >= 0 ? 'win' : 'loss'}`}>{fmt(totalR)}</span>
          </div>
          <div className="cal-legend">
            <span className="cal-legend-dot win" /> Win
            <span className="cal-legend-dot loss" /> Loss
          </div>
        </div>
      </div>

      {/* Grid + Weekly Net */}
      <div className="cal-body">
        <div className="cal-grid-wrap">
          <div className="cal-day-headers">
            {DAY_HEADERS.map(d => <div key={d} className="cal-day-hdr">{d}</div>)}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="cal-week-row">
              {week.map((day, di) => {
                const hasR = day && dayMap[day] !== undefined;
                const r = hasR ? dayMap[day] : null;
                const isWin = r !== null && r >= 0;
                return (
                  <div key={di} className={`cal-day-cell ${day ? 'active' : 'empty'} ${hasR ? (isWin ? 'win' : 'loss') : ''}`}>
                    {day && (
                      <>
                        <span className="cal-day-num">{day}</span>
                        {hasR && (
                          <>
                            <span className={`cal-r-val ${isWin ? 'win' : 'loss'}`}>{fmt(r)}</span>
                            <span className="cal-trade-count">1 trade</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Weekly Net column */}
        <div className="cal-weekly-net">
          <div className="cal-weekly-hdr">WEEKLY NET</div>
          {weeklyNets.map((net, wi) => {
            const isWin = net >= 0;
            return (
              <div key={wi} className={`cal-week-net-card ${isWin ? 'win' : 'loss'}`}>
                <span className="cal-week-label">WEEK {wi + 1}</span>
                <span className={`cal-week-net-val ${isWin ? 'win' : 'loss'}`}>{fmt(net)}</span>
                <span className="cal-week-active">
                  {weeks[wi].filter(d => d && dayMap[d] !== undefined).length} days active
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Main CalendarView ─────────────────────────────────────────────────
const CalendarView = ({ monthsData }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (!monthsData || monthsData.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '16px', background: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow)' }}>
        <Calendar size={64} style={{ color: 'var(--secondary)' }} />
        <p style={{ color: 'var(--text-light)', fontWeight: 700 }}>No months recorded yet.</p>
      </div>
    );
  }

  const sorted = [...monthsData].sort((a, b) => {
    const yearDiff = Number(a.year) - Number(b.year);
    return yearDiff !== 0 ? yearDiff : MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
  });

  // Show calendar detail for a specific month
  if (selectedIndex !== null) {
    return (
      <CalendarDetail
        sorted={sorted}
        index={selectedIndex}
        onBack={() => setSelectedIndex(null)}
        onPrev={() => setSelectedIndex(i => Math.max(0, i - 1))}
        onNext={() => setSelectedIndex(i => Math.min(sorted.length - 1, i + 1))}
      />
    );
  }

  // Show month selection grid
  return (
    <div className="cal-select-container">
      <div className="cal-select-header">
        <h1 style={{ color: 'var(--primary)', fontWeight: 800 }}>Calendar View</h1>
        <p style={{ color: 'var(--text-light)' }}>Select a month to view its trading calendar</p>
      </div>
      <div className="cal-month-grid">
        {sorted.map((entry, idx) => (
          <MonthCard key={entry.id} entry={entry} onClick={() => setSelectedIndex(idx)} />
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
