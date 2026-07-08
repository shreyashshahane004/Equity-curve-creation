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
      arr = JSON.parse(JSON.stringify(arr)); // DEEP COPY
      if (!arr[0].customFields) arr[0].customFields = {};
      arr[0].customFields['TEST_COLUMN'] = 'IT_WORKS_' + Date.now();
  }
  
  // STRINFIGY PAYLOAD MANUALLY
  const payloadStr = JSON.stringify(arr);
  console.log("SENDING STRINGIFIED:", payloadStr.substring(0, 150));
  
  const { error: updateErr } = await supabase.from('equity_curves').update({ data: payloadStr }).eq('id', row.id);
  
  const { data: fetchBack } = await supabase.from('equity_curves').select('id, data').eq('id', row.id);
  console.log("FETCHED RAW TYPE:", typeof fetchBack[0].data);
  console.log("FETCHED RAW PREVIEW:", String(fetchBack[0].data).substring(0, 150));
  
  const arrBack = typeof fetchBack[0].data === 'string' ? JSON.parse(fetchBack[0].data) : fetchBack[0].data;
  console.log("Fetch back custom fields:", arrBack[0].customFields);
}

run();
