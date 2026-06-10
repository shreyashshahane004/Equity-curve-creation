import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env variables from .env file
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Fetch equity curves for strat_2
  const { data: curves, error: curvesError } = await supabase
    .from('equity_curves')
    .select('*')
    .eq('strategy', 'strat_2');

  if (curvesError) {
    console.error('Error fetching curves:', curvesError);
    return;
  }

  console.log(`Found ${curves.length} curves for strat_2:`);
  curves.forEach(c => console.log(`- Curve ID: ${c.id}, Month: ${c.month}, Year: ${c.year}, Strategy: ${c.strategy}`));

  if (curves.length === 0) return;

  const curveIds = curves.map(c => c.id);

  // 2. Fetch trades for those curves
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .in('equity_curve_id', curveIds);

  if (tradesError) {
    console.error('Error fetching trades:', tradesError);
    return;
  }

  console.log(`\nFound ${trades.length} trades for strat_2:`);
  trades.forEach(t => {
    console.log(`- Trade ID: ${t.id}, Curve ID: ${t.equity_curve_id}, Date: ${t.trade_date}, Day: ${t.day_name} (${t.day_of_week}), R: ${t.r_value}, Text: "${t.original_text}"`);
  });
}

run();
