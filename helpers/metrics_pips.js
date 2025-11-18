// /helpers/metrics_pips.js

export function computePips(trade = {}, pair = '') {
  const en = parseFloat(trade.priceEN);
  const tp = parseFloat(trade.priceTP);
  const sl = parseFloat(trade.priceSL);
  let diff = 0;
  if (trade.result === 'TP') {
    if (trade.type === 'Buy') diff = tp - en;
    else diff = en - tp;
  } else {
    if (trade.type === 'Buy') diff = sl - en;
    else diff = en - sl;
  }

  if (/JPY$/.test(String(pair))) return diff * 100;
  if (/XAUUSD$/.test(String(pair))) return diff * 10;
  return diff * 10000;
}