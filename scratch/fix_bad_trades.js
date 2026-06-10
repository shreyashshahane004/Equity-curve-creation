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
  console.log('=== Fixing OCR-corrupted trades in strat_2 ===\n');

  // --- FIX 1: "28-Nov. -10" → r_value=-1, original_text="28-Nov -1" ---
  // This trade has r_value=0 because OCR read "-1" as "-10", breaking the value
  const { data: fix1Matches, error: f1err } = await supabase
    .from('trades')
    .select('id, original_text, r_value, trade_date')
    .eq('original_text', '28-Nov. -10');

  if (f1err) { console.error('Error finding fix1:', f1err); }
  else if (fix1Matches.length === 0) {
    console.log('FIX 1: Trade "28-Nov. -10" not found (may already be fixed)');
  } else {
    for (const t of fix1Matches) {
      const { error } = await supabase
        .from('trades')
        .update({
          r_value: -1,
          original_text: '28-Nov -1'
        })
        .eq('id', t.id);
      if (error) console.error('Fix 1 error:', error);
      else console.log(`✅ FIX 1: Updated trade ${t.id} | "28-Nov. -10" → r_value=-1, text="28-Nov -1"`);
    }
  }

  // --- FIX 2: "22-5ep -1" → set correct trade_date=2025-09-22, day_of_week=1 (Mon) ---
  // OCR misread "Sep" as "5ep", so date couldn't be parsed → trade_date=null
  const { data: fix2Matches, error: f2err } = await supabase
    .from('trades')
    .select('id, original_text, r_value, trade_date')
    .eq('original_text', '22-5ep -1');

  if (f2err) { console.error('Error finding fix2:', f2err); }
  else if (fix2Matches.length === 0) {
    console.log('FIX 2: Trade "22-5ep -1" not found (may already be fixed)');
  } else {
    for (const t of fix2Matches) {
      const { error } = await supabase
        .from('trades')
        .update({
          trade_date: '2025-09-22',
          day_of_week: 1,
          day_name: 'Mon',
          original_text: '22-Sep -1',
          is_fomc: false,
          is_cpi: false,
          is_nfp: false
        })
        .eq('id', t.id);
      if (error) console.error('Fix 2 error:', error);
      else console.log(`✅ FIX 2: Updated trade ${t.id} | "22-5ep -1" → trade_date=2025-09-22 (Monday), text="22-Sep -1"`);
    }
  }

  // --- Verify fixes ---
  console.log('\n=== Verification ===');

  const { data: verify1 } = await supabase
    .from('trades')
    .select('original_text, r_value, trade_date')
    .eq('trade_date', '2025-11-28');
  console.log('Nov 28 2025 trades:', verify1?.map(t => `"${t.original_text}" r=${t.r_value}`).join(', ') || 'none');

  const { data: verify2 } = await supabase
    .from('trades')
    .select('original_text, r_value, trade_date, day_name')
    .eq('trade_date', '2025-09-22');
  console.log('Sep 22 2025 trades:', verify2?.map(t => `"${t.original_text}" r=${t.r_value} day=${t.day_name}`).join(', ') || 'none');

  // Recount
  const { data: s2Curves } = await supabase.from('equity_curves').select('id').eq('strategy', 'strat_2');
  const ids = s2Curves.map(c => c.id);
  const { data: zeroCheck } = await supabase.from('trades').select('id, original_text, r_value').in('equity_curve_id', ids).or('r_value.is.null,r_value.eq.0');
  console.log(`\nRemaining strat_2 trades with r_value=0 or null: ${zeroCheck?.length || 0}`);
  const { data: nullDateCheck } = await supabase.from('trades').select('id, original_text').in('equity_curve_id', ids).is('trade_date', null);
  console.log(`Remaining strat_2 trades with null trade_date: ${nullDateCheck?.length || 0}`);
}

run().catch(console.error);
