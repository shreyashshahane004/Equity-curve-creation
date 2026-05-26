import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Check, X, RefreshCw,
  Newspaper, ChevronUp, ChevronDown, Search, ChevronRight,
} from 'lucide-react';
import {
  addNewsEvent, updateNewsEvent, deleteNewsEvent, syncFromFinnhub,
} from '../supabase/newsEventsService';

// ─── Constants ────────────────────────────────────────────────────────────────
const IMPACT_LABELS = {
  red:    { emoji: '🔴', label: 'Red (High)',    cls: 'red'    },
  orange: { emoji: '🟠', label: 'Orange (Med)',  cls: 'orange' },
  yellow: { emoji: '🟡', label: 'Yellow (Low)',  cls: 'yellow' },
};

const EMPTY_FORM = { date: '', event_name: '', notes: '' };

// ─── Utility ──────────────────────────────────────────────────────────────────
function tradeStats(datesSet, tradesData) {
  if (!tradesData?.length || !datesSet) return null;
  const onDay  = tradesData.filter(t => datesSet.has(t.trade_date));
  if (!onDay.length) return null;
  const wins = onDay.filter(t => (t.r_value || 0) > 0).length;
  const totalR = onDay.reduce((s, t) => s + (t.r_value || 0), 0);
  const avg  = totalR / onDay.length;
  return {
    count: onDay.length,
    winPct: Math.round((wins / onDay.length) * 100),
    avgR: avg.toFixed(2),
    totalR: totalR.toFixed(2),
  };
}

// Helper to show a helpful message if an error is due to Supabase RLS policies
function handleSupabaseError(err, action) {
  const isRls = err.message?.toLowerCase().includes('row-level security') || 
                err.message?.toLowerCase().includes('policy');
  if (isRls) {
    alert(`${action} failed: ${err.message}\n\n💡 TIP: Row-Level Security (RLS) is likely enabled on your "news_events" table in Supabase. You can disable it or add public policies by running this SQL in the Supabase Dashboard SQL Editor:\n\nALTER TABLE public.news_events DISABLE ROW LEVEL SECURITY;`);
  } else {
    alert(`${action} failed: ${err.message}`);
  }
}

// ─── Finnhub Sync Modal ───────────────────────────────────────────────────────
function SyncModal({ onClose, onDone }) {
  const STORED_KEY = localStorage.getItem('finnhub_api_key') || 'd897lk1r01qla01mf5q0d897lk1r01qla01mf5qg';
  const [apiKey,   setApiKey]   = useState(STORED_KEY);
  const [fromDate, setFromDate] = useState('2023-01-01');
  const [toDate,   setToDate]   = useState(new Date().toISOString().slice(0, 10));
  const [syncing,  setSyncing]  = useState(false);
  const [log,      setLog]      = useState([]);
  const [isError,  setIsError]  = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setLog([]);
    setIsError(false);
    localStorage.setItem('finnhub_api_key', apiKey);
    try {
      const result = await syncFromFinnhub(apiKey, fromDate, toDate, msg =>
        setLog(prev => [...prev, msg])
      );
      setLog(prev => [...prev, `✅ Done! Added ${result.added}, skipped ${result.skipped} duplicates.`]);
      onDone();
    } catch (err) {
      const isRls = err.message?.toLowerCase().includes('row-level security') || 
                    err.message?.toLowerCase().includes('policy');
      if (isRls) {
        setLog(prev => [
          ...prev, 
          `❌ Error: ${err.message}`, 
          `💡 TIP: Row-Level Security (RLS) is active on your "news_events" table in Supabase. Run this SQL in your Supabase SQL Editor to disable it:`,
          `ALTER TABLE public.news_events DISABLE ROW LEVEL SECURITY;`
        ]);
      } else {
        setLog(prev => [...prev, `❌ Error: ${err.message}`]);
      }
      setIsError(true);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="nev-modal-overlay" onClick={onClose}>
      <div className="nev-modal" onClick={e => e.stopPropagation()}>
        <h3><RefreshCw size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Sync from Finnhub
        </h3>
        <label>Finnhub API Key</label>
        <input
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Your Finnhub API key"
          type="password"
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
          Get a free key at <strong>finnhub.io</strong>. Only US events will be imported.
          Impact is automatically determined based on event type.
        </p>

        {log.length > 0 && (
          <div className={`nev-progress${isError ? ' error' : ''}`}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        <div className="nev-modal-actions">
          <button className="nev-btn danger" onClick={onClose}>Cancel</button>
          <button
            className="nev-btn sync"
            onClick={handleSync}
            disabled={syncing || !apiKey}
          >
            {syncing
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Syncing…</>
              : <><RefreshCw size={14} /> Start Sync</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Group Header Row ─────────────────────────────────────────────────────────
function GroupHeader({ groupName, count, impact, totalR, winPct, collapsed, onToggle }) {
  const imp = IMPACT_LABELS[impact] || IMPACT_LABELS.yellow;
  return (
    <tr className="nev-group-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
      <td colSpan={5}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: 4,
            background: 'rgba(255,255,255,0.08)', transition: 'transform 0.2s',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
          }}>
            <ChevronDown size={12} />
          </span>
          <span className={`impact-badge ${imp.cls}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
            {imp.emoji} {imp.label}
          </span>
          <strong style={{ fontSize: '0.9rem' }}>{groupName}</strong>
          <span className="nev-group-count">{count} event{count !== 1 ? 's' : ''}</span>
          {totalR !== null && (
            <span style={{
              marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700,
              color: Number(totalR) >= 0 ? '#10b981' : '#ef4444'
            }}>
              {Number(totalR) > 0 ? '+' : ''}{totalR}R · {winPct}% win
            </span>
          )}
        </div>
      </td>
      <td />
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewsEventsView({ newsEvents, tradesData, onRefresh }) {
  const [filter,     setFilter]     = useState('all'); // 'all' | 'red' | 'orange' | 'yellow'
  const [search,     setSearch]     = useState('');
  const [sortKey,    setSortKey]    = useState('date');
  const [sortAsc,    setSortAsc]    = useState(true);
  const [editId,     setEditId]     = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [addForm,    setAddForm]    = useState(null); // null = hidden
  const [showSync,   setShowSync]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [collapsed,  setCollapsed]  = useState({}); // { [groupName]: bool }
  const [groupBy,    setGroupBy]    = useState(true); // toggle grouping on/off

  const byImpact = useMemo(() => ({
    red:    newsEvents.filter(e => e.impact === 'red'),
    orange: newsEvents.filter(e => e.impact === 'orange'),
    yellow: newsEvents.filter(e => e.impact === 'yellow'),
  }), [newsEvents]);

  // Group dates exclusively by highest impact present on each date
  const exclusiveDates = useMemo(() => {
    const dateMap = {};
    newsEvents.forEach(e => {
      if (!dateMap[e.date]) dateMap[e.date] = new Set();
      dateMap[e.date].add(e.impact);
    });

    const red = new Set();
    const orange = new Set();
    const yellow = new Set();

    Object.entries(dateMap).forEach(([date, impacts]) => {
      if (impacts.has('red')) {
        red.add(date);
      } else if (impacts.has('orange')) {
        orange.add(date);
      } else if (impacts.has('yellow')) {
        yellow.add(date);
      }
    });

    return { red, orange, yellow };
  }, [newsEvents]);

  const statsRed    = useMemo(() => tradeStats(exclusiveDates.red,    tradesData), [exclusiveDates.red,    tradesData]);
  const statsOrange = useMemo(() => tradeStats(exclusiveDates.orange, tradesData), [exclusiveDates.orange, tradesData]);
  const statsYellow = useMemo(() => tradeStats(exclusiveDates.yellow, tradesData), [exclusiveDates.yellow, tradesData]);

  // ── Filtered + sorted flat list ───────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = newsEvents;
    if (filter !== 'all') list = list.filter(e => e.impact === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.event_name.toLowerCase().includes(q) ||
        e.date.includes(q) ||
        (e.notes || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let va = a[sortKey] || '', vb = b[sortKey] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ?  1 : -1;
      return 0;
    });
    return list;
  }, [newsEvents, filter, search, sortKey, sortAsc]);

  // ── Grouped structure ─────────────────────────────────────────────────────
  // Groups events by event_name; each group sorted by date asc
  const groups = useMemo(() => {
    const map = {};
    displayed.forEach(ev => {
      const key = ev.event_name;
      if (!map[key]) map[key] = { name: key, impact: ev.impact, events: [] };
      // escalate group impact level (red > orange > yellow)
      const order = { red: 3, orange: 2, yellow: 1 };
      if ((order[ev.impact] || 0) > (order[map[key].impact] || 0)) {
        map[key].impact = ev.impact;
      }
      map[key].events.push(ev);
    });
    // Sort each group's events by date asc
    Object.values(map).forEach(g => {
      g.events.sort((a, b) => a.date.localeCompare(b.date));
    });
    // Sort groups by impact (red first) then name
    const impOrder = { red: 0, orange: 1, yellow: 2 };
    return Object.values(map).sort((a, b) => {
      const iA = impOrder[a.impact] ?? 3;
      const iB = impOrder[b.impact] ?? 3;
      if (iA !== iB) return iA - iB;
      return a.name.localeCompare(b.name);
    });
  }, [displayed]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }) => sortKey !== k ? null :
    sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const startEdit = (e) => { setEditId(e.id); setEditForm({ ...e }); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateNewsEvent(editId, {
        date: editForm.date,
        event_name: editForm.event_name,
        notes: editForm.notes || '',
        // impact is auto-determined by the service on event_name
      });
      setEditId(null);
      onRefresh();
    } catch (err) { handleSupabaseError(err, 'Save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteNewsEvent(id);
      onRefresh();
    } catch (err) { handleSupabaseError(err, 'Delete'); }
  };

  // ── Add handlers ──────────────────────────────────────────────────────────
  const startAdd = () => setAddForm({ ...EMPTY_FORM });
  const cancelAdd = () => setAddForm(null);

  const saveAdd = async () => {
    if (!addForm.date || !addForm.event_name) {
      alert('Date and event name are required.');
      return;
    }
    setSaving(true);
    try {
      await addNewsEvent({ ...addForm, country: 'US' });
      setAddForm(null);
      onRefresh();
    } catch (err) { handleSupabaseError(err, 'Add'); }
    finally { setSaving(false); }
  };

  // ── Trade stats per group ─────────────────────────────────────────────────
  const groupStats = useCallback((groupEvents) => {
    const dates = new Set(groupEvents.map(e => e.date));
    return tradeStats(dates, tradesData);
  }, [tradesData]);

  // ── Trade stats on a given event for the trade count column ───────────────
  const tradeDateSet = useMemo(() =>
    new Set((tradesData || []).map(t => t.trade_date)), [tradesData]);

  const toggleCollapse = (name) =>
    setCollapsed(c => ({ ...c, [name]: !c[name] }));

  return (
    <div className="nev-page">
      {/* Header */}
      <div className="nev-header">
        <h1><Newspaper size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          News Events Impact
        </h1>
        <p>Track US economic events and analyse their effect on your trading results.</p>
      </div>

      {/* Summary Cards */}
      <div className="nev-cards">
        <div className="nev-card total">
          <span className="card-label">Total Events</span>
          <span className="card-count">{newsEvents.length}</span>
          <span className="card-stats">
            {exclusiveDates.red.size + exclusiveDates.orange.size + exclusiveDates.yellow.size} unique days · {tradesData?.length ?? 0} trades
          </span>
        </div>
        {[
          { key: 'red',    label: 'Red (High Impact)',   stats: statsRed,    cls: 'red',    days: exclusiveDates.red.size },
          { key: 'orange', label: 'Orange (Mid Impact)', stats: statsOrange, cls: 'orange', days: exclusiveDates.orange.size },
          { key: 'yellow', label: 'Yellow (Low Impact)', stats: statsYellow, cls: 'yellow', days: exclusiveDates.yellow.size },
        ].map(({ key, label, stats, cls, days }) => (
          <div key={key} className={`nev-card ${cls}`} style={{ cursor: 'pointer' }}
            onClick={() => setFilter(f => f === key ? 'all' : key)}>
            <span className="card-label">{IMPACT_LABELS[key].emoji} {label}</span>
            <span className="card-count">{days} days</span>
            {stats
              ? <span className="card-stats">
                  {stats.count} trades · {stats.winPct}% win · <strong>{Number(stats.totalR) > 0 ? '+' : ''}{stats.totalR}R total</strong> (avg {Number(stats.avgR) > 0 ? '+' : ''}{stats.avgR}R)
                </span>
              : <span className="card-stats">No trades on these days</span>
            }
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="nev-toolbar">
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="nev-search"
            style={{ paddingLeft: 30 }}
            placeholder="Search events…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Impact filters */}
        {['all', 'red', 'orange', 'yellow'].map(f => (
          <button
            key={f}
            className={`nev-filter-btn ${filter === f ? `active-${f}` : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '📋 All' : `${IMPACT_LABELS[f].emoji} ${IMPACT_LABELS[f].label}`}
          </button>
        ))}

        {/* Group toggle */}
        <button
          className={`nev-filter-btn ${groupBy ? 'active-all' : ''}`}
          onClick={() => setGroupBy(g => !g)}
          title="Toggle grouping by event name"
        >
          {groupBy ? '📂 Grouped' : '📄 Flat'}
        </button>

        <span className="nev-row-count">
          {displayed.length} row{displayed.length !== 1 ? 's' : ''}
          {groupBy && ` · ${groups.length} group${groups.length !== 1 ? 's' : ''}`}
        </span>

        <button className="nev-btn primary" onClick={startAdd}>
          <Plus size={14} /> Add Event
        </button>
        <button className="nev-btn sync" onClick={() => setShowSync(true)}>
          <RefreshCw size={14} /> Finnhub Sync
        </button>
      </div>

      {/* Table */}
      <div className="nev-table-wrap">
        <table className="nev-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('date')}>Date <SortIcon k="date" /></th>
              <th onClick={() => toggleSort('event_name')}>Event Name <SortIcon k="event_name" /></th>
              <th onClick={() => toggleSort('impact')}>Impact <SortIcon k="impact" /></th>
              <th>Trades on Day</th>
              <th>Notes</th>
              <th style={{ width: 90 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Add row */}
            {addForm && (
              <tr className="nev-add-row">
                <td>
                  <input className="nev-edit-input" type="date"
                    value={addForm.date}
                    onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} />
                </td>
                <td>
                  <input className="nev-edit-input" type="text" placeholder="Event name (auto-impacts)"
                    value={addForm.event_name}
                    onChange={e => setAddForm(f => ({ ...f, event_name: e.target.value }))} />
                </td>
                <td>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>
                    Auto-determined
                  </span>
                </td>
                <td>—</td>
                <td>
                  <input className="nev-edit-input" type="text" placeholder="Notes (optional)"
                    value={addForm.notes}
                    onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="nev-btn primary" style={{ padding: '4px 8px' }} onClick={saveAdd} disabled={saving}>
                      <Check size={13} />
                    </button>
                    <button className="nev-btn danger" style={{ padding: '4px 8px' }} onClick={cancelAdd}>
                      <X size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {displayed.length === 0 && (
              <tr><td colSpan={6} className="nev-empty">
                No events found. Try adjusting filters or add events manually.
              </td></tr>
            )}

            {groupBy ? (
              // ── GROUPED VIEW ──────────────────────────────────────────────
              groups.map(group => {
                const isCollapsed = collapsed[group.name];
                const stats = groupStats(group.events);
                return (
                  <React.Fragment key={group.name}>
                    <GroupHeader
                      groupName={group.name}
                      count={group.events.length}
                      impact={group.impact}
                      totalR={stats?.totalR ?? null}
                      winPct={stats?.winPct ?? null}
                      collapsed={isCollapsed}
                      onToggle={() => toggleCollapse(group.name)}
                    />
                    {!isCollapsed && group.events.map(ev => {
                      const hasTrades = tradeDateSet.has(ev.date);
                      const dayTrades = (tradesData || []).filter(t => t.trade_date === ev.date);
                      const dayR = dayTrades.reduce((s, t) => s + (t.r_value || 0), 0);
                      const isEditing = editId === ev.id;

                      return (
                        <tr key={ev.id} className="nev-grouped-row">
                          {isEditing ? (
                            <>
                              <td>
                                <input className="nev-edit-input" type="date"
                                  value={editForm.date}
                                  onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                              </td>
                              <td>
                                <input className="nev-edit-input" type="text"
                                  value={editForm.event_name}
                                  onChange={e => setEditForm(f => ({ ...f, event_name: e.target.value }))} />
                              </td>
                              <td>
                                <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                  Auto-determined
                                </span>
                              </td>
                              <td>—</td>
                              <td>
                                <input className="nev-edit-input" type="text"
                                  value={editForm.notes || ''}
                                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="nev-btn primary" style={{ padding: '4px 8px' }} onClick={saveEdit} disabled={saving}>
                                    <Check size={13} />
                                  </button>
                                  <button className="nev-btn danger" style={{ padding: '4px 8px' }} onClick={cancelEdit}>
                                    <X size={13} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', paddingLeft: 32 }}>{ev.date}</td>
                              <td style={{ color: '#94a3b8' }}>{ev.event_name}</td>
                              <td>
                                <span className={`impact-badge ${IMPACT_LABELS[ev.impact]?.cls || 'yellow'}`}>
                                  {IMPACT_LABELS[ev.impact]?.emoji} {IMPACT_LABELS[ev.impact]?.label}
                                </span>
                              </td>
                              <td>
                                {hasTrades
                                  ? <span style={{ fontWeight: 700, color: dayR >= 0 ? '#10b981' : '#ef4444' }}>
                                      {dayTrades.length} trade{dayTrades.length > 1 ? 's' : ''} · {dayR > 0 ? '+' : ''}{dayR.toFixed(2)}R
                                    </span>
                                  : <span style={{ color: '#cbd5e1' }}>—</span>
                                }
                              </td>
                              <td style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{ev.notes || '—'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="nev-btn primary" style={{ padding: '4px 8px' }} onClick={() => startEdit(ev)} title="Edit">
                                    <Edit2 size={13} />
                                  </button>
                                  <button className="nev-btn danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(ev.id)} title="Delete">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            ) : (
              // ── FLAT VIEW ─────────────────────────────────────────────────
              displayed.map(ev => {
                const hasTrades = tradeDateSet.has(ev.date);
                const dayTrades = (tradesData || []).filter(t => t.trade_date === ev.date);
                const dayR = dayTrades.reduce((s, t) => s + (t.r_value || 0), 0);
                const isEditing = editId === ev.id;

                return (
                  <tr key={ev.id}>
                    {isEditing ? (
                      <>
                        <td>
                          <input className="nev-edit-input" type="date"
                            value={editForm.date}
                            onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                        </td>
                        <td>
                          <input className="nev-edit-input" type="text"
                            value={editForm.event_name}
                            onChange={e => setEditForm(f => ({ ...f, event_name: e.target.value }))} />
                        </td>
                        <td>
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>
                            Auto-determined
                          </span>
                        </td>
                        <td>—</td>
                        <td>
                          <input className="nev-edit-input" type="text"
                            value={editForm.notes || ''}
                            onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="nev-btn primary" style={{ padding: '4px 8px' }} onClick={saveEdit} disabled={saving}>
                              <Check size={13} />
                            </button>
                            <button className="nev-btn danger" style={{ padding: '4px 8px' }} onClick={cancelEdit}>
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{ev.date}</td>
                        <td>{ev.event_name}</td>
                        <td>
                          <span className={`impact-badge ${IMPACT_LABELS[ev.impact]?.cls || 'yellow'}`}>
                            {IMPACT_LABELS[ev.impact]?.emoji} {IMPACT_LABELS[ev.impact]?.label}
                          </span>
                        </td>
                        <td>
                          {hasTrades
                            ? <span style={{ fontWeight: 700, color: dayR >= 0 ? '#10b981' : '#ef4444' }}>
                                {dayTrades.length} trade{dayTrades.length > 1 ? 's' : ''} · {dayR > 0 ? '+' : ''}{dayR.toFixed(2)}R
                              </span>
                            : <span style={{ color: '#cbd5e1' }}>—</span>
                          }
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{ev.notes || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="nev-btn primary" style={{ padding: '4px 8px' }} onClick={() => startEdit(ev)} title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button className="nev-btn danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(ev.id)} title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sync Modal */}
      {showSync && (
        <SyncModal
          onClose={() => setShowSync(false)}
          onDone={() => { setShowSync(false); onRefresh(); }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
