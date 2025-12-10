// ~/model/StatisticsModel.js
import * as FM from 'utils/converter.js';
import * as HM from 'components/metrics.js';

export class StatisticsModel {
  constructor() {
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    window.addEventListener('data-updated', e => {
      if (e.detail.stats.total >= 50 && e.detail.stats.invalid === 0) {
        this.data = e.detail.trades;
        this.stats = this.build();
        //log(this.stats.monthly)
        this._dispatchUpdate();
      }
    });
  }

  build() {
    const trades = this._scanTrades(this.data);
    const curve = this.getDataCurve(trades);
    return {
      curve,
      symbols: this.getDataSymbols(trades),
      period: this.getDataPeriod(trades),
      general: this.getDataGeneral(trades),
      ddown: this.getDataDrawdown(curve),
      monthly: this.getDataMonthly(trades),
      yearly: this.getDataYearly(trades),
      streak: HM.computeStreaks(trades)
    };
  }

  _normalizeTrade(t) {
    const { pair, type, result, dateEN, dateEX, priceEN, priceTP, priceSL } = t;
  
    const dEN = FM.dateISO(dateEN);
    const dEX = FM.dateISO(dateEX);
  
    const { pTP, pSL, vTP, vSL } = HM.computePips(t, pair);
  
    const isWin = result === 'TP';
    const isLong = type === 'Buy';
  
    // --- realized results ---
    const pips  = isWin ? pTP : pSL;
    const vpips = isWin ? vTP : vSL;
  
    return {
      pair,
      isWin,
      isLong,
  
      dateEN: dEN,
      dateEX: dEX,
      month: `${dEX.getFullYear()}-${String(dEX.getMonth() + 1).padStart(2, '0')}`,
  
      priceEN: +priceEN,
      priceTP: +priceTP,
      priceSL: +priceSL,
      
      pTP,
      pSL,
      vTP,
      vSL,
      pips,
      vpips,
  
      bars: FM.estimateBarsHeld(dEN, dEX),
    };
  }

  _scanTrades(rows) {
    return rows
      .map(t => this._normalizeTrade(t))
      .sort((a, b) => a.dateEX - b.dateEX);
  }

  getDataSymbols(trades) {
    const map = {};

    for (const r of trades) {
      if (!map[r.pair]) {
        map[r.pair] = { pair: r.pair, pips: 0, vpips: 0 };
      }
      map[r.pair].pips  += r.pips;
      map[r.pair].vpips += r.vpips;
    }

    return Object.values(map);
  }

  getDataPeriod(trades) {
    const monthly = {};
    const yearly = {};
    const total = { p: 0, v: 0 };
  
    trades.forEach(({ month, pips, vpips }) => {
      const year = month.split("-")[0];
  
      if (!monthly[month]) monthly[month] = { p: 0, v: 0 };
      monthly[month].p += pips;
      monthly[month].v += vpips;
  
      if (!yearly[year]) yearly[year] = { p: 0, v: 0 };
      yearly[year].p += pips;
      yearly[year].v += vpips;
  
      total.p += pips;
      total.v += vpips;
    });
  
    const monthlyArr = Object.keys(monthly)
      .sort() // YYYY-MM ascending
      .map(key => ({ key, p: monthly[key].p, v: monthly[key].v })
      );
  
    const yearlyArr = Object.keys(yearly)
      .sort()
      .map(key => ({ key, p: yearly[key].p, v: yearly[key].v })
      );
    const start = trades[0].dateEN.toLocaleDateString('id-ID', {day: 'numeric',month: 'short',year: 'numeric'})
    const end   = trades.at(-1).dateEX.toLocaleDateString('id-ID', {day: 'numeric',month: 'short',year: 'numeric'})
    const countM = Object.keys(monthly).length;
    const countY = countM / 12
    const avgTrade = trades.length / countM;
    return {
      accum: { monthly, yearly, total },
      prop: {
        period: `${start} - ${end}`,
        months: `${countM} months`,
        years: `${countY.toFixed(1)} years`,
        monthly: HM.callMonthlyFunc(monthlyArr, avgTrade),
        yearly: HM.callYearlyFunc(yearlyArr),
      }
    };
  }

  getDataCurve(trades) {
    let cumP = 0, cumV = 0;
    const p = [];
    const v = [];
  
    for (const { pair, dateEX, pips, vpips } of trades) {
  
      cumP += pips;
      cumV += vpips;
  
      p.push({
        pair,
        equity: cumP,
        date: FM.dateDMY(dateEX),
        value: pips
      });
  
      v.push({
        pair,
        equity: cumV,
        date: FM.dateDMY(dateEX),
        value: vpips
      });
    }
  
    return { p, v };
  }

  getDataDrawdown(curve) {
    const pips  = HM.computeDrawdown(curve.p);
    const vpips = HM.computeDrawdown(curve.v);
    const merged = {};
  
    const DRAW_TYPES = {
      maxDrawdown: "float",
      avgDrawdown: "float",
      maxRecoveryDuration: "ms",
      avgRecoveryDuration: "ms",
  
      // dimensi events
      peakDate: "date",
      peakEquity: "float",
      troughDate: "date",
      troughEquity: "float",
      recoveryDate: "date",
      recoveryEquity: "float",
      absoluteDD: "float",
      recoveryDuration: "ms"
    };
  
    for (const key of Object.keys(pips)) {
      // === CASE: events array ===
      if (key === "events") {
        const pEvents = pips.events ?? [];
        const vEvents = vpips.events ?? [];
      
        merged.events = pEvents.map((ev, i) => {
          const out = {};
      
          // pastikan vEvent selalu object aman
          const vEvent = vEvents[i] ?? {};
      
          for (const k of Object.keys(ev)) {
            const t = DRAW_TYPES[k] ?? "";
      
            out[k] = {
              p: ev[k],
              v: (k in vEvent ? vEvent[k] : null),  // aman untuk formatter
              t
            };
          }
      
          return out;
        });
      
        continue;
      }
  
      // === CASE: single value ===
      const type = DRAW_TYPES[key] ?? "";
      merged[key] = {
        p: pips[key],
        v: vpips[key],
        t: type
      };
    }
  
    return merged;
  }

  getDataGeneral(trades) {
    const cats = {
      a: { winP: [], winV: [], lossP: [], lossV: [], hold: [] },
      l: { winP: [], winV: [], lossP: [], lossV: [], hold: [] },
      s: { winP: [], winV: [], lossP: [], lossV: [], hold: [] }
    };
    
    for (const r of trades) {
      const target = r.isLong ? cats.l : cats.s;
      const groups = [cats.a, target];
  
      for (const g of groups) {
        g.hold.push(r.bars);
  
        if (r.isWin) {
          g.winP.push(r.pips);
          g.winV.push(r.vpips);
        } else {
          g.lossP.push(r.pips);
          g.lossV.push(r.vpips);
        }
      }
    }
    
    const build = (g) => {
    
      // --- BASIC COUNTS ---
      const winCount = g.winP.length;
      const lossCount = g.lossP.length;
      const tradeCount = winCount + lossCount;
    
      // --- SUMS (loss should already be negative) ---
      const sumWinP = HM.sum(g.winP);
      const sumLossP = HM.sum(g.lossP);    // <== loss negative
      const sumWinV = HM.sum(g.winV);
      const sumLossV = HM.sum(g.lossV);
    
      // --- AVGs ---
      const avgWinP = HM.avg(g.winP);
      const avgLossP = HM.avg(g.lossP);    // negative
      const avgWinV = HM.avg(g.winV);
      const avgLossV = HM.avg(g.lossV);
    
      // --- RR / EXPECTED R ---
      const avgRRP = avgWinP / Math.abs(avgLossP || 1);
      const avgRRV = avgWinV / Math.abs(avgLossV || 1);
    
      return {
        totalTrade: { p: tradeCount, v: tradeCount, t: "int" },
        winTrade: { p: winCount, v: winCount, t: "int" },
        lossTrade: { p: lossCount, v: lossCount, t: "int" },
        winrate: { p: winCount / tradeCount * 100, v: winCount / tradeCount * 100, t: "%" },
        grossProfit: { p: sumWinP, v: sumWinV, t: "" },
        grossLoss: { p: Math.abs(sumLossP), v: Math.abs(sumLossV), t: "" },
        netReturn: { p: sumWinP + sumLossP, v: sumWinV + sumLossV, t: "R" },
        avgReturn: { p: HM.avg([...g.winP, ...g.lossP]), v: HM.avg([...g.winV, ...g.lossV]), t: "R" },
        medianReturn: { p: HM.median([...g.winP, ...g.lossP]), v: HM.median([...g.winV, ...g.lossV]), t: "R" },
        stdDeviation: { p: HM.stDev([...g.winP, ...g.lossP]), v: HM.stDev([...g.winV, ...g.lossV]), t: "R"},
        avgProfit: { p: avgWinP, v: avgWinV, t: "" },
        avgLoss:   { p: avgLossP, v: avgLossV, t: ""},
        maxProfit: { p: HM.max(g.winP), v: HM.max(g.winV), t: "" },
        maxLoss:   { p: HM.min(g.lossP), v: HM.min(g.lossV), t: ""},
        profitFactor: { p: sumWinP / Math.abs(sumLossP), v: sumWinV / Math.abs(sumLossV), t: ""},
        avgRiskReward: { p: avgWinP / Math.abs(avgLossP || 1), v: avgWinV / Math.abs(avgLossV || 1), t: "1:"},
        avgHold: { p: HM.avg(g.hold), v: HM.avg(g.hold), t: "time" },
        maxHold: { p: HM.max(g.hold), v: HM.max(g.hold), t: "time" },
      };
  };
  
    return {
      a: build(cats.a),
      l: build(cats.l),
      s: build(cats.s)
    };
  }

getDataYearly(trades) {
  const yearMap = {};

  for (const t of trades) {
    if (!yearMap[t.year]) yearMap[t.year] = [];
    yearMap[t.year].push(t);
  }

  const result = {};

  for (const y in yearMap) {
    const list = yearMap[y];

    let totalTrades = list.length;
    let netPips = 0;
    let netVPips = 0;

    for (const t of list) {
      netPips += t.pips;
      netVPips += t.vpips;
    }

    result[y] = {
      totalTrades,
      netPips,
      netVPips,
      avgPips: totalTrades ? (netPips / totalTrades) : 0,
      avgVPips: totalTrades ? (netVPips / totalTrades) : 0
    };
  }

  return result;
}

getDataMonthly(trades) {
  const result = {};

  const monthMap = {};
  for (const t of trades) {
    if (!monthMap[t.month]) monthMap[t.month] = [];
    monthMap[t.month].push(t);
  }

  for (const month in monthMap) {
    const list = monthMap[month];

    const equity = this.getDataCurve(list);

    const pairMap = {};
    for (const t of list) {
      if (!pairMap[t.pair]) pairMap[t.pair] = [];
      pairMap[t.pair].push(t);
    }

    const byPair = {};
    for (const p in pairMap) {
      byPair[p] = this.getDataCurve(pairMap[p]);
    }

    let totalTrades = list.length;
    let wins = 0;
    let netPips = 0;
    let netVPips = 0;

    let bestPair = null, worstPair = null;
    let bestVal = -Infinity, worstVal = Infinity;

    for (const t of list) {
      if (t.isWin) wins++;
      netPips += t.pips;
      netVPips += t.vpips;
    }

    for (const pair in byPair) {
      const eq = byPair[pair].p.at(-1)?.equity ?? 0;

      if (eq > bestVal) {
        bestVal = eq;
        bestPair = pair;
      }
      if (eq < worstVal) {
        worstVal = eq;
        worstPair = pair;
      }
    }

    result[month] = {
      equity,
      pairs: Object.keys(pairMap),
      byPair,

      summary: {
        totalTrades,
        winRate: totalTrades ? (wins / totalTrades * 100).toFixed(1) : 0,
        netPips,
        netVPips,
        avgPips: totalTrades ? netPips / totalTrades : 0,
        avgVPips: totalTrades ? netVPips / totalTrades : 0,
        bestPair,
        worstPair,
      }
    };
  }

  return result;
}

  _dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('statistics-updated', {
      detail: { data: this.stats }
    }));
  }
}