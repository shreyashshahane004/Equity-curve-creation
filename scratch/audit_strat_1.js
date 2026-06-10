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
  const { data: s1Curves } = await supabase
    .from('equity_curves')
    .select('id, month, year')
    .eq('strategy', 'strat_1');

  const ids = s1Curves.map(c => c.id);

  console.log(`Total Strategy 1 (strat_1) curves: ${s1Curves.length}`);

  // Fetch all trades for strat_1
  const { data: allTrades } = await supabase
    .from('trades')
    .select('*')
    .in('equity_curve_id', ids);

  console.log(`Total trades in DB for strat_1: ${allTrades.length}`);

  // Find trades with r_value = 0 or null
  const zeroTrades = allTrades.filter(t => t.r_value === 0 || t.r_value === null);
  console.log(`\n=== strat_1 trades with r_value = 0 or null: ${zeroTrades.length} ===`);
  zeroTrades.forEach(t => {
    const curve = s1Curves.find(c => c.id === t.equity_curve_id);
    console.log(`  ${curve?.month} ${curve?.year} | id=${t.id} | r_value=${t.r_value} | text="${t.original_text}" | date=${t.trade_date}`);
  });

  // Find trades with null trade_date
  const nullDateTrades = allTrades.filter(t => t.trade_date === null);
  console.log(`\n=== strat_1 trades with NULL trade_date: ${nullDateTrades.length} ===`);
  nullDateTrades.forEach(t => {
    const curve = s1Curves.find(c => c.id === t.equity_curve_id);
    console.log(`  ${curve?.month} ${curve?.year} | id=${t.id} | r_value=${t.r_value} | text="${t.original_text}"`);
  });
}

run().catch(console.error);
