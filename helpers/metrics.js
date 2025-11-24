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
  if (curve.length === 0) {
    return { maxDD: 0, maxDDPercent: 0, avgDD: 0, avgDDPercent: 0, events: [] };
  }

  const getTs = (e) => (e && (e.dateEX ?? e.date ?? e.__ts)) ?? null;
  const getEquity = (e) =>
    typeof e === 'number' ? e : (e?.equity ?? e?.cumPips ?? e?.cumVPips ?? 0);

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

    // update peak if not in drawdown and new high
    if (!inDD && v > peakValue) {
      peakIndex = i;
      peakValue = v;
      peakTs = ts;
      continue;
    }

    const thresholdValue = peakValue * thresholdFactor;

    if (!inDD) {
      // start drawdown when crossing threshold
      if (v <= thresholdValue) {
        inDD = true;
        troughIndex = i;
        troughValue = v;
        troughTs = ts;
      }
    } else {
      // update trough while in DD
      if (v < troughValue) {
        troughValue = v;
        troughIndex = i;
        troughTs = ts;
      }

      // recovery: equity goes above prior peak
      if (v > peakValue) {
        const ddAbs = peakValue - troughValue;                 // POSITIVE
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

        // reset for next sequence
        inDD = false;
        peakIndex = i;
        peakValue = v;
        peakTs = ts;
        troughIndex = null;
        troughValue = null;
        troughTs = null;
      }
    }
  }

  // close last unrecovered drawdown
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

  // if no events
  if (events.length === 0) {
    return { maxDD: 0, maxDDPercent: 0, avgDD: 0, avgDDPercent: 0, events: [] };
  }

  // build arrays and compute aggregates consistently from same positive lists
  const ddAbsList = events.map(e => e.ddAbs);
  const ddPctList = events.map(e => e.ddPct);

  const maxDD = Math.max(...ddAbsList);           // largest absolute drop
  const maxDDPercent = Math.max(...ddPctList);   // largest percent drop

  const avgDD = ddAbsList.reduce((s, x) => s + x, 0) / ddAbsList.length;
  const avgDDPercent = ddPctList.reduce((s, x) => s + x, 0) / ddPctList.length;

  return {
    maxDD,
    maxDDPercent,
    avgDD,
    avgDDPercent,
    events
  };
}

export function Drawdown(curve = [], threshold = 200) {
  if (!curve.length) {
    return {
      maxDD: 0,
      maxDDPercent: 0,
      avgDD: 0,
      avgDDPercent: 0,
      count: 0,
      events: [],
      avgRecoveryHours: 0,
      avgRecoveryBars: 0,
    };
  }

  const getTs = (e) => e.date ?? e.__ts;

  let peak = { value: curve[0].equity, index: 0, ts: getTs(curve[0]) };
  let trough = { ...peak };
  let inDD = false;

  const events = [];
  let maxDD = 0, maxDDPercent = 0, totalDD = 0;

  const pushEvent = (peak, trough, recoveryIdx = null, recoveryTs = null) => {
    const ddAbs = peak.value - trough.value;
    if (ddAbs < threshold) return;

    const ddPct = peak.value ? (ddAbs / peak.value) * 100 : 0;

    const durationMs = recoveryTs ? (recoveryTs - trough.ts) : null;
    const durationHours = durationMs ? durationMs / 3_600_000 : null;
    const durationBars  = durationHours ? durationHours / 4 : null;

    events.push({
      peak,
      trough,
      recoveryIndex: recoveryIdx,
      recoveryTimestamp: recoveryTs,
      ddAbs,
      ddPct,
      durationMs,
      durationHours,
      durationBars,
      durationStr: recoveryTs ? null : "Unrecovered",
    });

    maxDD = Math.max(maxDD, ddAbs);
    maxDDPercent = Math.max(maxDDPercent, ddPct);
    totalDD += ddAbs;
  };

  // --- LOOP CURVE ---
  for (let i = 1; i < curve.length; i++) {
    const equity = curve[i].equity;
    const ts = getTs(curve[i]);

    const newPoint = { value: equity, index: i, ts };

    if (equity >= peak.value) {
      if (inDD) pushEvent(peak, trough, i, ts);
      peak = newPoint;
      trough = newPoint;
      inDD = false;
    } else {
      inDD = true;
      if (equity < trough.value) trough = newPoint;
    }
  }

  // --- UNRECOVERED DD ---
  if (inDD) pushEvent(peak, trough);

  const count = events.length;
  const avgDD = count ? totalDD / count : 0;
  const avgDDPercent = count ? events.reduce((s, e) => s + e.ddPct, 0) / count : 0;

  const recovered = events.filter(e => e.recoveryIndex !== null);
  const avgRecoveryHours = recovered.length
    ? recovered.reduce((s, e) => s + e.durationHours, 0) / recovered.length
    : 0;

  const avgRecoveryBars = recovered.length
    ? recovered.reduce((s, e) => s + e.durationBars, 0) / recovered.length
    : 0;

  return {
    maxDD,
    maxDDPercent,
    avgDD,
    avgDDPercent,
    count,
    events,
    avgRecoveryHours,
    avgRecoveryBars,
  };
}