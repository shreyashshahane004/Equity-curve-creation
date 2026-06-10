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
  // Check count in trades table
  const { count, error } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true });

  console.log(`Total trades count in DB: ${count}`);

  // Fetch with default select
  const { data: fetched, error: fetchError } = await supabase
    .from('trades')
    .select('*');

  console.log(`Default fetched trades length: ${fetched.length}`);
}

run().catch(console.error);
