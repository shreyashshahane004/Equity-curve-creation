import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = (match[2] || '').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Check for curves with null/empty strategy
  const { data: nullCurves, error } = await supabase
    .from('equity_curves')
    .select('id, month, year, strategy, created_at')
    .is('strategy', null);

  if (error) { console.error('Error:', error); return; }

  console.log(`\n=== Curves with NULL strategy: ${nullCurves.length} ===`);
  nullCurves.forEach(c => {
    console.log(`  ID: ${c.id.substring(0,20)}... | ${c.month} ${c.year} | strategy: ${JSON.stringify(c.strategy)} | created: ${c.created_at}`);
  });

  // Check total count breakdown
  const { data: allCurves } = await supabase
    .from('equity_curves')
    .select('strategy');

  const breakdown = {};
  (allCurves || []).forEach(c => {
    const key = c.strategy || 'NULL';
    breakdown[key] = (breakdown[key] || 0) + 1;
  });
  console.log('\n=== Strategy breakdown ===');
  Object.entries(breakdown).forEach(([k, v]) => console.log(`  ${k}: ${v} curves`));

  // Show most recently created curves
  const { data: recent } = await supabase
    .from('equity_curves')
    .select('id, month, year, strategy, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n=== 10 most recently created curves ===');
  (recent || []).forEach(c => {
    const tradeCount = 'unknown';
    console.log(`  ${c.month} ${c.year} | strategy: ${JSON.stringify(c.strategy)} | created: ${c.created_at}`);
  });

  // Count trades per strategy via join
  const { data: s2Curves } = await supabase
    .from('equity_curves')
    .select('id')
    .eq('strategy', 'strat_2');
  
  if (s2Curves && s2Curves.length > 0) {
    const ids = s2Curves.map(c => c.id);
    const { count } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .in('equity_curve_id', ids);
    console.log(`\n=== strat_2 has ${s2Curves.length} curves, ${count} total trades ===`);
  }
}

run().catch(console.error);
