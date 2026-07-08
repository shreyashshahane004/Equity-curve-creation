const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://coynwnoerukkgniretfn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveW53bm9lcnVra2duaXJldGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzI1MTIsImV4cCI6MjA5NDA0ODUxMn0.J8jRcsiZEgNYaZ0g6kMlBytO2KQHlvlHsPGTyfhDdIk');

async function run() {
  const { data: curves, error: curvesError } = await supabase.from('equity_curves').select('id, strategy');
  if (curvesError) throw curvesError;

  const strat1Curves = new Set(
    curves
      .filter(c => (c.strategy === 'strat_1' || !c.strategy))
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

  const strat1Trades = allTrades.filter(trade => strat1Curves.has(trade.equity_curve_id));

  const months = {};
  for (const trade of strat1Trades) {
    const monthKey = trade.trade_date.substring(0, 7);
    if (!months[monthKey]) {
      months[monthKey] = [];
    }
    months[monthKey].push(trade);
  }

  let totalMonths = 0;
  let secondTradeWin = 0;
  let firstAndSecondTradeWin = 0;

  for (const [monthKey, trades] of Object.entries(months)) {
    trades.sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date));
    
    if (trades.length > 1) {
      totalMonths++;
      const firstTrade = trades[0];
      const secondTrade = trades[1];
      
      const isFirstWin = firstTrade.r_value > 0;
      const isSecondWin = secondTrade.r_value > 0;

      if (isSecondWin) {
        secondTradeWin++;
      }
      
      if (isFirstWin && isSecondWin) {
        firstAndSecondTradeWin++;
      }
    }
  }

  console.log(`Months where the 2nd trade is a winner: ${secondTradeWin}`);
  console.log(`Months where both the 1st AND 2nd trades are winners: ${firstAndSecondTradeWin}`);
}

run().catch(console.error);
