import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env
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
  const { data: curves, error } = await supabase
    .from('equity_curves')
    .select('id, month, year, strategy');

  if (error) {
    console.error('Error fetching curves:', error);
    return;
  }

  // Group months by strategy
  const byStrategy = {};
  curves.forEach(c => {
    const strategyId = c.strategy || 'strat_1';
    if (!byStrategy[strategyId]) {
      byStrategy[strategyId] = new Set();
    }
    byStrategy[strategyId].add(`${c.year}-${c.month}`);
  });

  const strategies = Object.keys(byStrategy);
  console.log('Found strategies:', strategies);
  strategies.forEach(sid => {
    console.log(`  Strategy "${sid}" has ${byStrategy[sid].size} unique months.`);
  });

  if (strategies.length < 2) {
    console.log('Fewer than 2 strategies found. No overlap possible.');
    return;
  }

  // Intersect
  const [firstStrat, ...restStrats] = strategies;
  let commonMonths = new Set(byStrategy[firstStrat]);
  
  restStrats.forEach(sid => {
    commonMonths = new Set([...commonMonths].filter(m => byStrategy[sid].has(m)));
  });

  console.log(`\n=== Total Common Months: ${commonMonths.size} ===`);
  const sortedCommon = [...commonMonths].sort((a, b) => {
    const [aY, aM] = a.split('-');
    const [bY, bM] = b.split('-');
    if (aY !== bY) return Number(aY) - Number(bY);
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months.indexOf(aM) - months.indexOf(bM);
  });

  sortedCommon.forEach(m => console.log(`  - ${m}`));
}

run();
