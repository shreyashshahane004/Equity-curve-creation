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
  const { data: trades, error } = await supabase
    .from('trades')
    .select('id, day_of_week, trade_date, equity_curve_id');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Total trades in DB: ${trades.length}`);
  const withDay = trades.filter(t => t.day_of_week !== null);
  const withoutDay = trades.filter(t => t.day_of_week === null);
  console.log(`Trades with day_of_week: ${withDay.length}`);
  console.log(`Trades without day_of_week (null): ${withoutDay.length}`);

  // Let's print some sample trades without day_of_week
  if (withoutDay.length > 0) {
    console.log('\nSample trades without day_of_week:');
    withoutDay.slice(0, 10).forEach(t => console.log(t));
  }
}

run();
