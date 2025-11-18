// /helpers/metrics_equity.js
import { dateDMY } from './metrics_time.js';
// Build equity curve, calculate drawdown, and recovery metrics.

export function buildEquityCurve(trades = []) {
  let equity = 0;
  let barIndex = 0;
  return trades.map(t => {
    equity += Number(t.pips) || 0;
    return { equity, pair: t.pair, type: t.type, pips: t.pips, date: dateDMY(t.dateEX), barIndex: barIndex++ };
  });
}

export function calculateMaxDrawdown(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return { absolute: 0, percent: 0 };
  }

  let peak = values[0];
  let maxDD = 0;
  let maxDDPercent = 0;

  for (const raw of values) {
    const v = Number(raw) || 0;
    if (v > peak) peak = v;

    const dd = peak - v;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPercent = peak !== 0 ?
        Math.abs((dd / peak) * 100) :
        0;
    }
  }

  return {
    absolute: Number(maxDD.toFixed(2)),
    percent: Number(maxDDPercent.toFixed(2)),
  };
}

export function calculateRecovery(curve = []) {
  if (!curve.length) return { max: 0, avg: 0 };

  const recoveries = [];
  let peakEquity = curve[0].equity;
  let peakIndex = curve[0].barIndex;
  let inDrawdown = false;

  for (let i = 1; i < curve.length; i++) {
    const { equity, barIndex } = curve[i];

    // New peak → end previous drawdown (if any)
    if (equity >= peakEquity) {
      if (inDrawdown) {
        // recovery completed
        recoveries.push(barIndex - peakIndex);
        inDrawdown = false;
      }
      // update peak
      peakEquity = equity;
      peakIndex = barIndex;
      continue;
    }

    // below peak → drawdown active
    if (equity < peakEquity) {
      inDrawdown = true;
    }
  }

  if (!recoveries.length) return { max: 0, avg: 0 };

  const sum = recoveries.reduce((a, b) => a + b, 0);

  return {
    max: Math.max(...recoveries),
    avg: sum / recoveries.length
  };
}