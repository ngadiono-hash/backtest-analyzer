// ~/helpers/metrics_basic.js

export function calculateRiskReward(trades = []) {
  const wins = trades.filter(t => t.isWin);
  const losses = trades.filter(t => !t.isWin);
  
  // gunakan absolute pips untuk perhitungan rata-rata
  const avgLoss = losses.length
  ? losses.reduce((s, t) => s + Math.abs(Number(t.pips) || 0), 0) / losses.length
  : 0;
  
  const avgProfit = wins.length
  ? wins.reduce((s, t) => s + Math.abs(Number(t.pips) || 0), 0) / wins.length
  : 0;
  
  if (avgLoss === 0 && avgProfit === 0) return '1:0';
  if (avgLoss === 0) return '1:Infinity';
  
  const rr = avgProfit / avgLoss;
  return `1:${rr.toFixed(2)}`;
}


export function calculateBasicStats(trades = []) {
  const wins = trades.filter(t => t.isWin);
  const losses = trades.filter(t => !t.isWin);
  
  // pips diproses dalam absolute supaya totalProfit & totalLoss konsisten
  const totalProfit = wins.reduce((s, t) => s + Math.abs(Number(t.pips) || 0), 0);
  const totalLoss = losses.reduce((s, t) => s + Math.abs(Number(t.pips) || 0), 0);
  
  const tradesCount = trades.length;
  const winCount = wins.length;
  const lossCount = losses.length;
  
  const winrate = tradesCount ? (winCount / tradesCount) * 100 : 0;
  
  const profitFactor = totalLoss === 0 ? Infinity : totalProfit / totalLoss;
  
  const avgProfit = winCount ? totalProfit / winCount : 0;
  const avgLoss = lossCount ? totalLoss / lossCount : 0;
  
  return {
    trades: tradesCount,
    wins: winCount,
    winrate,
    profitFactor,
    avgProfit,
    avgLoss
  };
}


export function calculateStreaks(trades = []) {
  let maxWin = 0, maxLoss = 0, currWin = 0, currLoss = 0;
  
  for (const t of trades) {
    if (t.isWin) {
      currWin++;
      currLoss = 0;
      if (currWin > maxWin) maxWin = currWin;
    } else {
      currLoss++;
      currWin = 0;
      if (currLoss > maxLoss) maxLoss = currLoss;
    }
  }
  
  return { maxWinStreak: maxWin, maxLossStreak: maxLoss };
}