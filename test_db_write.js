import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envStr = fs.readFileSync('.env', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: rows, error: fetchErr } = await supabase.from('equity_curves').select('id, data').limit(1);
  if (fetchErr || !rows || rows.length === 0) return console.error("Fetch failed", fetchErr);
  
  let row = rows[0];
  let arr = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || []);
  
  if (arr.length > 0) {
      if (!arr[0].customFields) arr[0].customFields = {};
      arr[0].customFields['TEST_COLUMN'] = 'IT_WORKS_' + Date.now();
  }
  
  console.log("Updating payload type:", typeof arr);
  const { error: updateErr } = await supabase.from('equity_curves').update({ data: arr }).eq('id', row.id);
  if (updateErr) return console.error("Update failed", updateErr);
  
  const { data: fetchBack } = await supabase.from('equity_curves').select('id, data').eq('id', row.id);
  const arrBack = typeof fetchBack[0].data === 'string' ? JSON.parse(fetchBack[0].data) : (fetchBack[0].data || []);
  
  console.log("Fetch back custom fields:", arrBack[0].customFields);
}

run();
