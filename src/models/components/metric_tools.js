// src/models/components/metric_tools.js
import * as FM from 'util/formatter.js';

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

export function computeStreaks(data, MIN_STREAK = 2) {

  // Raw storage (internal)
  const exactProfit = {};
  const exactLoss = {};

  const detailProfit = [];
  const detailLoss  = [];

  let currentLength = 0;
  let currentType   = null; // "win" atau "loss"

  // Akhiri streak
  const endStreak = (endIndex) => {
    if (currentLength < MIN_STREAK) return;

    const isWin = currentType === "win";
    const exact = isWin ? exactProfit : exactLoss;
    const dList = isWin ? detailProfit : detailLoss;

    // Tambahkan ke exact count
    exact[currentLength] = (exact[currentLength] || 0) + 1;

    // Catat detail
    const startIndex = endIndex - currentLength + 1;
    const trades = data.slice(startIndex, endIndex + 1);

    const totalPips = trades.reduce((sum, t) => sum + (t.pips || 0), 0);
    const totalVPips = trades.reduce((sum, t) => sum + (t.vpips || 0), 0);

    dList.push({
      length: currentLength,
      totalPips,
      totalVPips,
      trades
    });
  };

  // Loop utama
  for (let i = 0; i < data.length; i++) {
    const t = data[i];
    const isWin = t.isWin;

    if (currentLength === 0) {
      currentType = isWin ? "win" : "loss";
      currentLength = 1;
    } else if ((currentType === "win" && isWin) ||
               (currentType === "loss" && !isWin)) {
      currentLength++;
    } else {
      // streak putus
      endStreak(i - 1);

      currentType = isWin ? "win" : "loss";
      currentLength = 1;
    }
  }

  // Akhiri streak terakhir
  endStreak(data.length - 1);

  // --- Return versi sederhana & sinkron untuk view ---
  return {
    win: {
      exact:   exactProfit,   // Example: {2:4, 3:2, 6:1}
      details: detailProfit   // Semua detail streak profit
    },
    lose: {
      exact:   exactLoss,
      details: detailLoss
    }
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
      endIndex: curve.length - 1,
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

export function callMonthlyFunc(monthlyArr, avgTrade, targetThreshold = 0) {
  const pArr = monthlyArr.map(m => m.p);
  const vArr = monthlyArr.map(m => m.v);
  //log(monthlyArr)
  return {
    averageTradePerMonth: { p: avgTrade, v: avgTrade, t: "float" },
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