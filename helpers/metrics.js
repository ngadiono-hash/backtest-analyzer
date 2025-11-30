// /helpers/metrics.js
const pairsMap = {
  XAUUSD: { mul: 0.5, max: 500, min: 360 },
  GBPJPY: { mul: 1.0, max: 400, min: 180 },
  EURNZD: { mul: 1.0, max: 400, min: 180 },
  EURJPY: { mul: 1.0, max: 400, min: 180 },
  USDJPY: { mul: 1.0, max: 400, min: 180 },
  CHFJPY: { mul: 1.0, max: 400, min: 180 },
  AUDJPY: { mul: 1.5, max: 300, min: 120 },
  CADJPY: { mul: 1.5, max: 300, min: 120 },
  NZDJPY: { mul: 1.5, max: 300, min: 120 },
  GBPUSD: { mul: 1.5, max: 300, min: 120 },
  EURUSD: { mul: 1.5, max: 300, min: 120 },
  USDCAD: { mul: 1.5, max: 300, min: 120 },
  USDCHF: { mul: 2.0, max: 200, min: 90 },
  AUDUSD: { mul: 2.0, max: 200, min: 90 },
  NZDUSD: { mul: 2.0, max: 200, min: 90 },
  EURGBP: { mul: 2.0, max: 200, min: 90 },
};

export function sum(arr) { return arr.reduce((a,b) => a + b, 0); }
export function avg(arr) { return arr.length ? sum(arr) / arr.length : 0; }
export function min(arr) { return Math.min(...arr); }
export function max(arr) { return Math.max(...arr); }
export function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
export function stDev(arr) {
  if (!arr.length) return 0;
  const mean = avg(arr);
  const variance = avg(arr.map(v => (v - mean) ** 2));
  return Math.sqrt(variance);
}

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
  
  return {
    pips,
    vpips: pips * pairsMap[pair].mul
  };
}

export function computeStreaks(trades, MIN_STREAK = 2) {

  const consProfit = {}, consLoss = {}, exactProfit = {}, exactLoss = {}, details = [];
  let currentLength = 0, currentType = null

  const endStreak = (endIndex) => {
    if (currentLength < MIN_STREAK) return;

    const isWin = currentType === 'win';
    const cons = isWin ? consProfit : consLoss;
    const exact = isWin ? exactProfit : exactLoss;

    for (let len = MIN_STREAK; len <= currentLength; len++) {
      cons[len] = (cons[len] || 0) + 1;
    }

    // Exact: hanya yang benar-benar berhenti di panjang ini
    exact[currentLength] = (exact[currentLength] || 0) + 1;

    const startIndex = endIndex - currentLength + 1;
    details.push({
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
  if (currentLength >= MIN_STREAK) endStreak(trades.length - 1);

  const longestWin = Math.max(0, ...Object.keys(consProfit).map(Number));
  const longestLoss = Math.max(0, ...Object.keys(consLoss).map(Number));

  return {
    consProfit,
    consLoss,
    exactProfit,
    exactLoss,
    details,
    longestWin,
    longestLoss
  };
}

export function computeDrawdown(curve = [], thresholdStart = 500, thresholdDD = 300) {
  // thresholdStart  : nilai minimal equity untuk mulai tracking peak
  // thresholdDD     : drawdown absolute dari peak untuk memicu DD mode

  const getTs = (e) => {
    if (!e?.date) throw new Error("Missing `date` in " + JSON.stringify(e));
    return new Date(e.date);
  };

  const getVal = (e) => {
    if (typeof e === "number") return e;
    if (typeof e?.equity === "number") return e.equity;
    throw new Error("Missing numeric field in " + JSON.stringify(e));
  };

  const events = [];

  let peakEquity = null, peakIndex = null, peakDate = null;
  let isDrawdown = false;

  let troughEquity = null, troughIndex = null, troughDate = null;

  for (let i = 0; i < curve.length; i++) {
    const currEquity = getVal(curve[i]);
    const currDate = getTs(curve[i]);

    // INIT PEAK — hanya mulai track jika sudah melewati thresholdStart
    if (peakEquity === null) {
      if (currEquity >= thresholdStart) {
        peakEquity = currEquity;
        peakDate = currDate;
        peakIndex = i;
      }
      continue;
    }

    // Update peak bila belum DD
    if (!isDrawdown && currEquity > peakEquity) {
      peakEquity = currEquity;
      peakDate = currDate;
      continue;
    }

    const ddTriggerValue = peakEquity - thresholdDD;

    // Trigger DD bila equity turun sejauh thresholdDD dari peak
    if (!isDrawdown && currEquity <= ddTriggerValue) {
      isDrawdown = true;
      troughEquity = currEquity;
      troughDate = currDate;
      troughIndex = i;
      continue;
    }

    // Update trough selama DD
    if (isDrawdown && currEquity < troughEquity) {
      troughEquity = currEquity;
      troughDate = currDate;
      troughIndex = i;
      continue;
    }

    // Recovery bila equity melewati peak
    if (isDrawdown && currEquity > peakEquity) {
      const absoluteDD = peakEquity - troughEquity;

      events.push({
        startIndex: peakIndex,
        endIndex: i,
        peakDate,
        peakEquity,
        troughDate,
        troughEquity,
        recoveryDate: currDate,
        recoveryEquity: currEquity,
        absoluteDD,
        recoveryDuration: currDate - peakDate,
      });

      // Reset state
      isDrawdown = false;
      peakEquity = currEquity;
      peakDate = currDate;
      troughEquity = troughDate = null;
      continue;
    }
  }

  // Jika DD belum recover di akhir
  if (isDrawdown) {
    const absoluteDD = peakEquity - troughEquity;

    events.push({
      startIndex: peakIndex,
      endIndex: curve.lenght - 1,
      peakDate,
      peakEquity,
      troughDate,
      troughEquity,
      recoveryDate: null,
      recoveryEquity: null,
      absoluteDD,
      recoveryDuration: null
    });
  }

  if (events.length === 0) {
    return {
      maxDrawdown: 0,
      avgDrawdown: 0,
      maxRecoveryDuration: 0,
      avgRecoveryDuration: 0,
      events: []
    };
  }

  const abs = events.map(e => e.absoluteDD);
  const rcv = events.map(e => e.recoveryDuration ?? 0);

  return {
    maxDrawdown: Math.max(...abs),
    avgDrawdown: abs.reduce((a,b)=>a+b,0) / abs.length,
    maxRecoveryDuration: Math.max(...rcv),
    avgRecoveryDuration: rcv.reduce((a,b)=>a+b,0) / rcv.length,
    events
  };
}

export function callMonthlyFunc(monthlyArr, targetThreshold = 0) {
  const pArr = monthlyArr.map(m => m.p);
  const vArr = monthlyArr.map(m => m.v);

  return {
    percentagePassTarget: {
      p: pArr.filter(x => x >= 600).length / pArr.length * 100,
      v: vArr.filter(x => x >= 300).length / vArr.length * 100,
      t: "%"
    },
    percentagePositive: {
      p: pArr.filter(x => x > 0).length / pArr.length * 100,
      v: vArr.filter(x => x > 0).length / vArr.length * 100,
      t: "%"
    },
    averageReturn: { p: avg(pArr), v: avg(vArr), t: "R" },
    averagePositive: { p: avg(pArr.filter(x => x > 0)), v: avg(vArr.filter(x => x > 0)), t: "" },
    averageNegative: { p: avg(pArr.filter(x => x < 0)), v: avg(vArr.filter(x => x < 0)), t: "" },
    medianReturn: { p: median(pArr), v: median(vArr), t: "R" },
    deviationReturn: { p: stDev(pArr), v: stDev(vArr), t: "R" },
    bestMonth: { p: max(pArr), v: max(vArr), t: "" },
    worstMonth: { p: min(pArr), v: min(vArr), t: "" },
  };
}

export function callYearlyFunc(yearlyArr) {
  const pArr = yearlyArr.map(y => y.p);
  const vArr = yearlyArr.map(y => y.v);
  const bestYearIndex = pArr.indexOf(max(pArr));
  const worstYearIndex = pArr.indexOf(min(pArr));

  return {
    averageReturn: {
      p: avg(pArr),
      v: avg(vArr),
      t: ""
    },
    bestYear: {
      //key: yearlyArr[bestYearIndex].key,
      p: yearlyArr[bestYearIndex].p,
      v: yearlyArr[bestYearIndex].v,
      t: ""
    },
    worstYear: {
      //key: yearlyArr[worstYearIndex].key,
      p: yearlyArr[worstYearIndex].p,
      v: yearlyArr[worstYearIndex].v,
      t: ""
    },
  };
}