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
    .select('day_of_week, trade_date');

  if (error) {
    console.error(error);
    return;
  }

  const days = {};
  trades.forEach(t => {
    days[t.day_of_week] = (days[t.day_of_week] || 0) + 1;
  });

  console.log('Unique day_of_week values in DB:', days);
}

run();
