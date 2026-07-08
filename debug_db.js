import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// read from .env
const envStr = fs.readFileSync('.env', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('equity_curves').select('id, data');
  if (error) {
     console.error("Error", error);
     return;
  }
  
  if (data && data.length > 0) {
      let foundCustom = false;
      for (const row of data) {
          const arr = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || []);
          const hasCustom = arr.some(t => t.customFields && Object.keys(t.customFields).length > 0);
          if (hasCustom) {
              console.log("Found row with custom fields:", row.id);
              console.log(JSON.stringify(arr.find(t => t.customFields && Object.keys(t.customFields).length > 0), null, 2));
              foundCustom = true;
              break;
          }
      }
      if (!foundCustom) {
          console.log("NO CUSTOM FIELDS FOUND IN ENTIRE DB!");
      }
  } else {
      console.log("No data");
  }
}

run();
