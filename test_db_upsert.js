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
  const { data: rows, error: fetchErr } = await supabase.from('equity_curves').select('*').limit(1);
  let row = rows[0];
  let arr = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || []);
  
  if (arr.length > 0) {
      arr = JSON.parse(JSON.stringify(arr));
      if (!arr[0].customFields) arr[0].customFields = {};
      arr[0].customFields['TEST_UPSERT'] = 'UPSERT_WORKS_' + Date.now();
  }
  
  const payload = {
     ...row,
     data: arr
  };
  
  const { data: upsertData, error: upsertErr } = await supabase.from('equity_curves').upsert(payload).select();
  
  if (upsertErr) {
      console.log("Upsert Error:", upsertErr);
  } else {
      console.log("Upsert Returns:", JSON.stringify(upsertData).substring(0, 200));
  }
}

run();
