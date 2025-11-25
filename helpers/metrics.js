// /helpers/metrics.js
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

export function computeStreaks(trades, MIN_STREAK = 2) {
  if (!trades || trades.length === 0) {
    return {
      consProfit: {}, consLoss: {},
      exactProfit: {}, exactLoss: {},
      streakDetails: [],
      longestWin: 0,
      longestLoss: 0
    };
  }

  const consProfit = {};
  const consLoss = {};
  const exactProfit = {};
  const exactLoss = {};
  const streakDetails = [];

  let currentLength = 0;
  let currentType = null; // 'win' atau 'loss'

  const endStreak = (endIndex) => {
    if (currentLength < MIN_STREAK) return;

    const isWin = currentType === 'win';
    const cons = isWin ? consProfit : consLoss;
    const exact = isWin ? exactProfit : exactLoss;

    // Cumulative: semua dari MIN_STREAK sampai currentLength
    for (let len = MIN_STREAK; len <= currentLength; len++) {
      cons[len] = (cons[len] || 0) + 1;
    }

    // Exact: hanya yang benar-benar berhenti di panjang ini
    exact[currentLength] = (exact[currentLength] || 0) + 1;

    const startIndex = endIndex - currentLength + 1;
    streakDetails.push({
      type: isWin ? 'Profit' : 'Loss',
      length: currentLength,
      startIndex,
      endIndex,
      trades: trades.slice(startIndex, endIndex + 1)
    });
  };

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    const isWin = t.isWin;

    if (currentLength === 0) {
      // Mulai streak baru
      currentType = isWin ? 'win' : 'loss';
      currentLength = 1;
    } else if (
      (currentType === 'win' && isWin) ||
      (currentType === 'loss' && !isWin)
    ) {
      // Lanjutkan streak yang sama
      currentLength++;
    } else {
      // Streak putus → akhiri yang lama
      endStreak(i - 1);
      // Mulai streak baru dari trade ini
      currentType = isWin ? 'win' : 'loss';
      currentLength = 1;
    }
  }

  // Akhiri streak terakhir (running streak)
  if (currentLength >= MIN_STREAK) {
    endStreak(trades.length - 1);
  }

  // Hitung longest
  const longestWin = Math.max(0, ...Object.keys(consProfit).map(Number));
  const longestLoss = Math.max(0, ...Object.keys(consLoss).map(Number));

  return {
    consProfit,
    consLoss,
    exactProfit,
    exactLoss,
    streakDetails,
    longestWin,
    longestLoss
  };
}

export function computeDrawdown(curve = [], thresholdPct = 5) {

  // === Strict Getters (no silent fallback) =====================
  const getTs = (e) => {
    if (!e || !e.date) {
      throw new Error("Missing field `date` in item: " + JSON.stringify(e));
    }
    return e.date;
  };

  const getEquity = (e) => {
    if (typeof e === "number") return e;

    if (typeof e.value === "number") return e.value;
    if (typeof e.graph === "number") return e.graph;

    throw new Error("Missing numeric field `value` or `graph` in item: " + JSON.stringify(e));
  };
  // =============================================================

  if (!Array.isArray(curve) || curve.length === 0) {
    return { maxDD: 0, maxDDPercent: 0, avgDD: 0, avgDDPercent: 0, events: [] };
  }

  const events = [];

  let peakIndex = 0;
  let peakValue = getEquity(curve[0]);
  let peakTs = getTs(curve[0]);

  let inDD = false;
  let troughIndex = null;
  let troughValue = null;
  let troughTs = null;

  const thresholdFactor = (100 - thresholdPct) / 100;

  for (let i = 1; i < curve.length; i++) {
    const item = curve[i];
    const v = getEquity(item);
    const ts = getTs(item);

    // update peak
    if (!inDD && v > peakValue) {
      peakIndex = i;
      peakValue = v;
      peakTs = ts;
      continue;
    }

    const thresholdValue = peakValue * thresholdFactor;

    if (!inDD) {
      // start drawdown
      if (v <= thresholdValue) {
        inDD = true;
        troughIndex = i;
        troughValue = v;
        troughTs = ts;
      }
    } else {
      // update trough
      if (v < troughValue) {
        troughValue = v;
        troughIndex = i;
        troughTs = ts;
      }

      // recovery
      if (v > peakValue) {
        const ddAbs = peakValue - troughValue;
        const ddPct = peakValue ? (ddAbs / peakValue) * 100 : 0;

        events.push({
          peakIndex,
          peakTs,
          peakValue,
          troughIndex,
          troughTs,
          troughValue,
          recoverIndex: i,
          recoverTs: ts,
          ddAbs,
          ddPct,
          durationBars: troughIndex - peakIndex,
          recoveryBars: i - troughIndex,
        });

        // reset
        inDD = false;
        peakIndex = i;
        peakValue = v;
        peakTs = ts;
        troughIndex = troughValue = troughTs = null;
      }
    }
  }

  // last unrecovered
  if (inDD && troughIndex !== null) {
    const ddAbs = peakValue - troughValue;
    const ddPct = peakValue ? (ddAbs / peakValue) * 100 : 0;

    events.push({
      peakIndex,
      peakTs,
      peakValue,
      troughIndex,
      troughTs,
      troughValue,
      recoverIndex: null,
      recoverTs: null,
      ddAbs,
      ddPct,
      durationBars: troughIndex - peakIndex,
      recoveryBars: null,
    });
  }

  if (events.length === 0) {
    return { maxDD: 0, maxDDPercent: 0, avgDD: 0, avgDDPercent: 0, events: [] };
  }

  const ddAbsList = events.map(e => e.ddAbs);
  const ddPctList = events.map(e => e.ddPct);

  const maxDD = Math.max(...ddAbsList);
  const maxDDPercent = Math.max(...ddPctList);

  const avgDD = ddAbsList.reduce((s, x) => s + x, 0) / ddAbsList.length;
  const avgDDPercent = ddPctList.reduce((s, x) => s + x, 0) / ddPctList.length;

  return { maxDD, maxDDPercent, avgDD, avgDDPercent, events };
}

