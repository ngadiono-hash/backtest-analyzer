// /helpers/metrics_pips.js
const pairsMap = {
  XAUUSD: { mul: 0.5, max: 500, min: 360 },
  GBPJPY: { mul: 1, max: 400, min: 180 },
  EURNZD: { mul: 1, max: 400, min: 180 },
  EURJPY: { mul: 1, max: 400, min: 180 },
  USDJPY: { mul: 1, max: 400, min: 180 },
  CHFJPY: { mul: 1, max: 400, min: 180 },
  AUDJPY: { mul: 1.5, max: 300, min: 120 },
  CADJPY: { mul: 1.5, max: 300, min: 120 },
  NZDJPY: { mul: 1.5, max: 300, min: 120 },
  GBPUSD: { mul: 1.5, max: 300, min: 120 },
  EURUSD: { mul: 1.5, max: 300, min: 120 },
  USDCAD: { mul: 1.5, max: 300, min: 120 },
  USDCHF: { mul: 2, max: 200, min: 90 },
  AUDUSD: { mul: 2, max: 200, min: 90 },
  NZDUSD: { mul: 2, max: 200, min: 90 },
  EURGBP: { mul: 2, max: 200, min: 90 },
};

export function computePips(trade = {}, pair = '') {
  const { priceEN, priceTP, priceSL, result, type } = trade;
  
  const en = +priceEN;
  const tp = +priceTP;
  const sl = +priceSL;
  
  const diff =
    result === 'TP' ?
    (type === 'Buy' ? tp - en : en - tp) :
    (type === 'Buy' ? sl - en : en - sl);
  
  const factor = pair.endsWith('JPY') ? 100 : pair === 'XAUUSD' ? 10 :10000;
  const pips = diff * factor;
  
  const mul = pairsMap[pair]?.mul ?? 1;
  return {
    pips,
    vpips: pips * mul
  };
}