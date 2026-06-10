import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = (match[2] || '').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[key] = value;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: s2Curves } = await supabase
    .from('equity_curves')
    .select('id, month, year')
    .eq('strategy', 'strat_2');

  const ids = s2Curves.map(c => c.id);

  // Find trades with r_value = 0 or null
  const { data: zeroTrades } = await supabase
    .from('trades')
    .select('*')
    .in('equity_curve_id', ids)
    .or('r_value.is.null,r_value.eq.0');

  console.log(`=== strat_2 trades with r_value = 0 or null: ${zeroTrades.length} ===`);
  zeroTrades.forEach(t => {
    const curve = s2Curves.find(c => c.id === t.equity_curve_id);
    console.log(`  ${curve?.month} ${curve?.year} | r_value=${t.r_value} | text="${t.original_text}" | date=${t.trade_date}`);
  });

  // Also find trades with null trade_date
  const { data: nullDateTrades } = await supabase
    .from('trades')
    .select('*')
    .in('equity_curve_id', ids)
    .is('trade_date', null);

  console.log(`\n=== strat_2 trades with NULL trade_date: ${nullDateTrades.length} ===`);
  nullDateTrades.forEach(t => {
    const curve = s2Curves.find(c => c.id === t.equity_curve_id);
    console.log(`  ${curve?.month} ${curve?.year} | r_value=${t.r_value} | text="${t.original_text}"`);
  });

  // Show total trades per curve sorted by date
  const curveSorted = [...s2Curves].sort((a, b) => {
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const yearDiff = Number(a.year) - Number(b.year);
    if (yearDiff !== 0) return yearDiff;
    return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
  });

  const { data: allTrades } = await supabase
    .from('trades')
    .select('equity_curve_id, r_value')
    .in('equity_curve_id', ids);

  console.log('\n=== Trade count per strat_2 curve ===');
  curveSorted.forEach(c => {
    const trades = allTrades.filter(t => t.equity_curve_id === c.id);
    const nonZero = trades.filter(t => t.r_value !== 0 && t.r_value !== null);
    console.log(`  ${c.month} ${c.year}: ${trades.length} total, ${nonZero.length} counted in analytics`);
  });
}

run().catch(console.error);
