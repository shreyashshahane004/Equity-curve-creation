import { supabase } from '../supabaseClient';
import seededEvents from '../data/seededNewsEvents';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// Keywords that designate high impact (Red Folder) events on Forex Factory
// This list is intentionally broad to catch all Forex Factory red-folder events.
const HIGH_IMPACT_KEYWORDS = [
  // FOMC / Fed
  'fomc', 'interest rate', 'fed chair', 'powell', 'bowman', 'waller', 'federal funds rate',
  'federal reserve', 'fed minutes', 'fomc minutes', 'beige book',
  'fed press conference', 'testimony',

  // Inflation / Prices
  'cpi', 'consumer price index', 'core cpi', 'pce', 'core pce', 'personal consumption',
  'ppi', 'producer price index', 'inflation',

  // Employment
  'non-farm payrolls', 'nfp', 'employment change', 'adp non-farm', 'adp employment',
  'unemployment claims', 'initial jobless claims', 'jobless claims', 'unemployment rate',
  'jolts', 'job openings', 'labor market', 'payrolls',

  // PMI / ISM
  'ism manufacturing', 'ism services', 'ism non-manufacturing', 'ism pmi',
  'manufacturing pmi', 'services pmi', 'composite pmi',

  // GDP
  'gdp', 'gross domestic product',

  // Retail / Consumer
  'retail sales', 'consumer confidence', 'consumer sentiment', 'michigan',

  // Trade / Durable Goods
  'durable goods', 'trade balance', 'current account',

  // Housing
  'housing starts', 'building permits', 'existing home sales', 'new home sales',
];

// Helper to auto-upgrade well-known major events to 'red' impact
export function autoDetermineImpact(name = '', originalImpact = 'yellow') {
  const cleanName = (name || '').toLowerCase();
  const isHighImpact = HIGH_IMPACT_KEYWORDS.some(kw => cleanName.includes(kw));
  if (isHighImpact) {
    return 'red';
  }
  return originalImpact;
}

// ─── Fetch all news events from Supabase ──────────────────────────────────────
export async function fetchNewsEvents() {
  const { data, error } = await supabase
    .from('news_events')
    .select('*')
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ─── Add a single event ───────────────────────────────────────────────────────
export async function addNewsEvent(event) {
  // Apply auto-determine logic during manual adds as well
  const finalImpact = autoDetermineImpact(event.event_name, event.impact);
  const eventToInsert = { ...event, impact: finalImpact };

  const { data, error } = await supabase
    .from('news_events')
    .insert([eventToInsert])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Update an event ──────────────────────────────────────────────────────────
export async function updateNewsEvent(id, changes) {
  // Force correct impact if name changes
  if (changes.event_name) {
    changes.impact = autoDetermineImpact(changes.event_name, changes.impact);
  }

  const { data, error } = await supabase
    .from('news_events')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Delete an event ──────────────────────────────────────────────────────────
export async function deleteNewsEvent(id) {
  const { error } = await supabase
    .from('news_events')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Seed DB with pre-built events if table is empty ─────────────────────────
export async function seedIfEmpty() {
  const { count, error } = await supabase
    .from('news_events')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  if (count > 0) return { seeded: false, count };

  // Auto-upgrade seeded events to match Forex Factory red impact standard
  const processedEvents = seededEvents.map(e => ({
    ...e,
    impact: autoDetermineImpact(e.event_name, e.impact)
  }));

  // Insert in batches of 100
  const batches = [];
  for (let i = 0; i < processedEvents.length; i += 100) {
    batches.push(processedEvents.slice(i, i + 100));
  }
  for (const batch of batches) {
    const { error: insertErr } = await supabase.from('news_events').insert(batch);
    if (insertErr) throw insertErr;
  }
  return { seeded: true, count: seededEvents.length };
}

// ─── Auto-Align Existing Database Events to standard Red impacts ────────────────
export async function alignNewsImpacts() {
  const { data: events, error } = await supabase
    .from('news_events')
    .select('id, event_name, impact');
  if (error) throw error;

  const toUpdate = [];
  events.forEach(e => {
    const correctImpact = autoDetermineImpact(e.event_name, e.impact);
    if (correctImpact !== e.impact) {
      toUpdate.push({ id: e.id, impact: correctImpact });
    }
  });

  if (toUpdate.length === 0) return { updatedCount: 0 };

  // Update in batches of 50 to prevent network timeouts
  for (let i = 0; i < toUpdate.length; i += 50) {
    const batch = toUpdate.slice(i, i + 50);
    const promises = batch.map(item =>
      supabase
        .from('news_events')
        .update({ impact: item.impact })
        .eq('id', item.id)
    );
    await Promise.all(promises);
  }

  return { updatedCount: toUpdate.length };
}

// ─── Finnhub sync ─────────────────────────────────────────────────────────────

/**
 * Whitelist of Forex Factory events to import from Finnhub.
 * Each entry: { patterns: [...substrings to match in Finnhub event name],
 *               name: canonical display name, impact: 'red'|'orange'|'yellow' }
 *
 * Only events whose Finnhub name contains at least one of the `patterns` are imported.
 * The `name` is stored in the DB (instead of Finnhub's raw name) for consistency.
 */
const FINNHUB_WHITELIST = [
  // ── 🔴 RED – High Impact ──────────────────────────────────────────────────
  { patterns: ['nonfarm payroll', 'non-farm payroll', 'nfp'],
    name: 'Non-Farm Payrolls (NFP)', impact: 'red' },

  { patterns: ['cpi', 'consumer price index'],
    name: 'CPI (Consumer Price Index)', impact: 'red' },

  { patterns: ['interest rate decision', 'fed funds', 'fomc rate', 'federal funds rate'],
    name: 'FOMC Interest Rate Decision', impact: 'red' },

  { patterns: ['fomc statement', 'fomc minutes', 'fomc press conference',
               'fed press conference', 'federal open market'],
    name: 'FOMC Statement / Minutes', impact: 'red' },

  { patterns: ['ism manufacturing', 'ism mfg'],
    name: 'ISM Manufacturing PMI', impact: 'red' },

  { patterns: ['ism services', 'ism non-manufacturing', 'ism non-mfg'],
    name: 'ISM Services PMI', impact: 'red' },

  { patterns: ['gdp', 'gross domestic product'],
    name: 'GDP (Advance Estimate)', impact: 'red' },

  { patterns: ['unemployment rate'],
    name: 'Unemployment Rate', impact: 'red' },

  { patterns: ['powell', 'fed chair', 'federal reserve chair', 'yellen', 'waller',
               'bowman', 'fed governor', 'fed testimony', 'humphrey-hawkins'],
    name: 'Fed Chair Speech / Testimony', impact: 'red' },

  { patterns: ['average hourly earnings'],
    name: 'Average Hourly Earnings', impact: 'red' },

  // ── 🟠 ORANGE – Medium Impact ─────────────────────────────────────────────
  { patterns: ['ppi', 'producer price index'],
    name: 'PPI (Producer Price Index)', impact: 'orange' },

  { patterns: ['core pce', 'pce price index', 'personal consumption expenditure'],
    name: 'Core PCE Price Index', impact: 'orange' },

  { patterns: ['retail sales'],
    name: 'Retail Sales (m/m)', impact: 'orange' },

  { patterns: ['adp employment', 'adp non-farm', 'adp nonfarm'],
    name: 'ADP Employment Change', impact: 'orange' },

  { patterns: ['jolts', 'job openings and labor turnover'],
    name: 'JOLTS Job Openings', impact: 'orange' },

  { patterns: ['consumer confidence'],
    name: 'Consumer Confidence', impact: 'orange' },

  { patterns: ['initial jobless claims', 'initial claims', 'jobless claims'],
    name: 'Initial Jobless Claims', impact: 'orange' },

  { patterns: ['existing home sales'],
    name: 'Existing Home Sales', impact: 'orange' },

  { patterns: ['new home sales'],
    name: 'New Home Sales', impact: 'orange' },

  { patterns: ['durable goods'],
    name: 'Durable Goods Orders', impact: 'orange' },

  { patterns: ['trade balance'],
    name: 'Trade Balance', impact: 'orange' },

  // ── 🟡 YELLOW – Low/Med Impact ────────────────────────────────────────────
  { patterns: ['michigan consumer sentiment', 'umich sentiment', 'university of michigan'],
    name: 'Michigan Consumer Sentiment', impact: 'yellow' },

  { patterns: ['housing starts', 'building permits'],
    name: 'Housing Starts & Building Permits', impact: 'yellow' },

  { patterns: ['philly fed', 'philadelphia fed'],
    name: 'Philadelphia Fed Manufacturing Index', impact: 'yellow' },

  { patterns: ['empire state manufacturing', 'ny empire'],
    name: 'Empire State Manufacturing Index', impact: 'yellow' },

  { patterns: ['chicago pmi', 'chicago business barometer'],
    name: 'Chicago PMI', impact: 'yellow' },

  { patterns: ['cb consumer confidence', 'conference board consumer'],
    name: 'CB Consumer Confidence', impact: 'yellow' },

  { patterns: ['industrial production'],
    name: 'Industrial Production (m/m)', impact: 'yellow' },

  { patterns: ['capacity utilization'],
    name: 'Capacity Utilization Rate', impact: 'yellow' },

  { patterns: ['personal income'],
    name: 'Personal Income (m/m)', impact: 'yellow' },

  { patterns: ['personal spending', 'personal consumption expenditures m/m'],
    name: 'Personal Spending (m/m)', impact: 'yellow' },
];

/**
 * Try to match a raw Finnhub event name against our whitelist.
 * Returns the matched whitelist entry, or null if not whitelisted.
 */
function matchWhitelist(rawName = '') {
  const lower = rawName.toLowerCase();
  return FINNHUB_WHITELIST.find(entry =>
    entry.patterns.some(pat => lower.includes(pat.toLowerCase()))
  ) || null;
}

export async function syncFromFinnhub(apiKey, fromDate, toDate, onProgress) {
  if (!apiKey) throw new Error('Finnhub API key is required');

  const url = `${FINNHUB_BASE}/calendar/economic?from=${fromDate}&to=${toDate}&token=${apiKey}`;
  onProgress?.('Fetching from Finnhub…');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub error: ${res.status} ${res.statusText}`);
  const json = await res.json();

  const rawEvents = json.economicCalendar || [];
  onProgress?.(`Received ${rawEvents.length} events from Finnhub`);

  // Filter to US events, extract and validate date, then match against whitelist
  const usEvents = [];
  for (const e of rawEvents) {
    if (e.country !== 'US') continue;

    // Extract date — prefer e.time (YYYY-MM-DD HH:MM:SS) then e.date
    const rawDate = (e.time || e.date || '').trim();
    const dateOnly = rawDate.split(' ')[0] || rawDate;

    // Strict date validation: must be YYYY-MM-DD format with valid values
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) continue;

    // Only import events on our whitelist
    const matched = matchWhitelist(e.event || '');
    if (!matched) continue;

    usEvents.push({
      date:       dateOnly,
      event_name: matched.name,
      impact:     matched.impact,
      country:    'US',
      notes:      `Source: Finnhub | Raw: ${(e.event || '').trim()}`,
    });
  }

  onProgress?.(`${usEvents.length} matching US events to import`);

  if (usEvents.length === 0) return { added: 0, skipped: 0 };

  // Fetch existing (date + name) pairs to avoid duplicates
  const { data: existing } = await supabase
    .from('news_events')
    .select('date, event_name');
  const existingSet = new Set((existing || []).map(e => `${e.date}|${e.event_name}`));

  const toInsert = usEvents.filter(e => !existingSet.has(`${e.date}|${e.event_name}`));
  const skipped  = usEvents.length - toInsert.length;

  onProgress?.(`Inserting ${toInsert.length} new events (${skipped} already exist)…`);

  // Insert in batches of 100
  let added = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const { error } = await supabase.from('news_events').insert(batch);
    if (error) throw error;
    added += batch.length;
  }

  return { added, skipped };
}
