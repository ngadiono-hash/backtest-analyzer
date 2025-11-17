// /helpers/metrics_pips.js
// Compute pips for a trade and determine pip value for given pair & lotSize.

export function computePips(trade = {}, pair = '') {
  // returns signed pips (positive for profitable TP or negative for SL)
  // trade fields expected: priceEN, priceTP, priceSL, result ('TP'|'SL'), type ('Buy'|'Sell')
  const en = parseFloat(trade.priceEN);
  const tp = parseFloat(trade.priceTP);
  const sl = parseFloat(trade.priceSL);

  if (Number.isNaN(en)) return 0;

  let diff = 0;

  if (trade.result === 'TP') {
    if (trade.type === 'Buy') diff = tp - en;
    else diff = en - tp;
  } else if (trade.result === 'SL') {
    if (trade.type === 'Buy') diff = sl - en;
    else diff = en - sl;
  } else {
    // if neither TP nor SL (e.g., manual close), attempt to use priceEX if present
    const ex = parseFloat(trade.priceEX) || en;
    if (trade.type === 'Buy') diff = ex - en;
    else diff = en - ex;
  }

  // multiplier depending on instrument
  if (/JPY$/.test(String(pair))) return diff * 100; // JPY pairs: pip = 0.01 -> *100
  if (/XAUUSD$/.test(String(pair))) return diff * 10; // Gold: treat 0.1 increments -> *10
  return diff * 10000; // Majors: pip = 0.0001 -> *10000
}