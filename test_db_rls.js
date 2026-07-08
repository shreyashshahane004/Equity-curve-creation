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
  let row = rows[0];
  let arr = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || []);
  
  if (arr.length > 0) {
      arr = JSON.parse(JSON.stringify(arr));
      if (!arr[0].customFields) arr[0].customFields = {};
      arr[0].customFields['TEST_COLUMN'] = 'IT_WORKS_' + Date.now();
  }
  
  // NOTE: using .select() at the end of update to get the updated row back immediately
  const { data: updateData, error: updateErr } = await supabase.from('equity_curves').update({ data: arr }).eq('id', row.id).select();
  
  console.log("Update Data Returns:", JSON.stringify(updateData).substring(0, 200));
  if (updateData && updateData.length === 0) {
      console.log("RLS OR UPDATE ISSUE: No rows were returned by update!");
  }
}

run();
