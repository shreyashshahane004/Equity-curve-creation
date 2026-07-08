const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://coynwnoerukkgniretfn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveW53bm9lcnVra2duaXJldGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzI1MTIsImV4cCI6MjA5NDA0ODUxMn0.J8jRcsiZEgNYaZ0g6kMlBytO2KQHlvlHsPGTyfhDdIk');

async function run() {
  // Fetch all curves to determine strategy
  const { data: curves, error: curvesError } = await supabase.from('equity_curves').select('id, strategy');
  if (curvesError) throw curvesError;

  // Build a set of curve IDs that belong to Strategy 1
  const strat1Curves = new Set(
    curves
      .filter(c => (c.strategy === 'strat_1' || !c.strategy)) // Assuming empty means strat_1 based on App.jsx
      .map(c => c.id)
  );

  let allTrades = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('trade_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allTrades = [...allTrades, ...data];
      from += PAGE_SIZE;
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  // Filter trades to only Strategy 1
  const strat1Trades = allTrades.filter(trade => strat1Curves.has(trade.equity_curve_id));

  // Group by month
  const months = {};
  for (const trade of strat1Trades) {
    // trade_date format: 'YYYY-MM-DD'
    const monthKey = trade.trade_date.substring(0, 7); // 'YYYY-MM'
    if (!months[monthKey]) {
      months[monthKey] = [];
    }
    months[monthKey].push(trade);
  }

  let totalMonths = 0;
  let firstTradeWin = 0;

  for (const [monthKey, trades] of Object.entries(months)) {
    // Trades are already sorted by trade_date from Supabase, but we can sort again to be safe
    trades.sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date));
    
    if (trades.length > 0) {
      totalMonths++;
      const firstTrade = trades[0];
      if (firstTrade.r_value > 0) {
        firstTradeWin++;
      }
    }
  }

  console.log(`Total Strategy 1 months with trades: ${totalMonths}`);
  console.log(`Strategy 1 Months where the first trade is a winner: ${firstTradeWin}`);
}

run().catch(console.error);
