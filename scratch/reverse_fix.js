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
  console.log('=== Reverting 28-Nov trade back to 0R ===\n');

  const { data: trades, error } = await supabase
    .from('trades')
    .select('id, original_text, r_value')
    .eq('original_text', '28-Nov -1');

  if (error) {
    console.error('Error finding trade:', error);
    return;
  }

  if (trades.length === 0) {
    console.log('No trades with text "28-Nov -1" found.');
    return;
  }

  for (const t of trades) {
    const { error: updateError } = await supabase
      .from('trades')
      .update({
        r_value: 0,
        original_text: '28-Nov. -10'
      })
      .eq('id', t.id);

    if (updateError) {
      console.error(`Error updating trade ${t.id}:`, updateError);
    } else {
      console.log(`Successfully reverted trade ${t.id} back to 0R / "28-Nov. -10"`);
    }
  }
}

run().catch(console.error);
