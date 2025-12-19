// src/models/ModelAnalytic.js
import * as MT from "component/metric_tools.js";
import * as FM from "util/formatter.js";

const RANGE_OPTIONS = {
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

export class ModelAnalytic {

  /* ---------- public ---------- */

  build(trades, filter = { range: null, pairs: null }) {
    const rows  = this.prepareTrades(trades);
    const slice = this.applyFilter(rows, filter);
    const core  = this.buildCore(slice);

    return {
      meta: this.buildMeta(slice),
      data: this.buildData(core),
    };
  }

  /* ---------- meta ---------- */

  buildMeta(trades) {
    const pairMap = Object.create(null);

    for (const { pair } of trades) {
      pairMap[pair] = (pairMap[pair] ?? 0) + 1;
    }

    return {
      pairs: Object.entries(pairMap).map(
        ([pair, count]) => ({ pair, count })
      ),
      ranges: Object.keys(RANGE_OPTIONS),
    };
  }

  /* ---------- data domain ---------- */

  buildData(core) {
    return {
      curve: this.buildCurve(core),
      general: this.buildGeneral(core.trades),
      byPair: core.byPair,
      byMonth: core.byMonth,
      byYear: core.byYear,
      streak: core.streak,
    };
  }

  /* ---------- filtering ---------- */

  applyFilter(trades, { pairs = null, range = null }) {
    let out = trades;

    if (pairs?.length) {
      const set = new Set(pairs);
      out = out.filter(t => set.has(t.pair));
    }

    if (range && RANGE_OPTIONS[range]) {
      const last = out.at(-1)?.dateEX;
      if (!last) return out;

      const from = last - RANGE_OPTIONS[range] * 864e5;
      out = out.filter(t => t.dateEX >= from);
    }

    return out;
  }

  /* ---------- preparation ---------- */

  prepareTrades(trades) {
    return trades
      .map(t => this.finalizeTrade(t))
      .sort((a, b) => a.dateEX - b.dateEX);
  }

  finalizeTrade(t) {
    return {
      ...t,
      pResult: t.isWin ? t.pTP : t.pSL,
      vResult: t.isWin ? t.vTP : t.vSL,
      bars: FM.estimateBarsHeld(t.dateEN, t.dateEX),
    };
  }

  /* ---------- core ---------- */

  buildCore(trades) {
    let pEquity = 0;
    let vEquity = 0;

    const core = {
      trades,
      curve: [],
      byPair: Object.create(null),
      byMonth: Object.create(null),
      byYear: Object.create(null),
      streak: [],
    };

    for (const t of trades) {
      pEquity += t.pResult;
      vEquity += t.vResult;

      core.curve.push({
        time: t.dateEX,
        pips: t.pResult,
        value: t.vResult,
        pEquity: FM.round(pEquity),
        vEquity: FM.round(vEquity),
        pair: t.pair,
      });

      (core.byPair[t.pair] ??= []).push(t);
      (core.byMonth[t.month] ??= []).push(t);

      const y = new Date(t.dateEX).getFullYear();
      (core.byYear[y] ??= []).push(t);

      core.streak.push(t.isWin);
    }

    return core;
  }


  buildCurve(core) {
    return {
      p: core.curve.map(c => ({
        time: c.time,
        equity: c.pEquity,
        result: c.pips,
        pair: c.pair,
      })),
  
      v: core.curve.map(c => ({
        time: c.time,
        equity: c.vEquity,
        result: c.value,
        pair: c.pair,
      })),
    };
  }
  
  buildGeneral(trades) {
  
    const makeAcc = () => ({
      win: 0,
      loss: 0,
  
      sumWinP: 0,
      sumLossP: 0,
      sumWinV: 0,
      sumLossV: 0,
  
      sumP: 0,
      sumV: 0,
  
      sumSqP: 0,
      sumSqV: 0,
  
      maxWinP: -Infinity,
      maxWinV: -Infinity,
      maxLossP: Infinity,
      maxLossV: Infinity,
  
      holdSum: 0,
      holdMax: 0,
    });
  
    const acc = {
      a: makeAcc(), // all
      l: makeAcc(), // long
      s: makeAcc(), // short
    };
  
    // -----------------------------
    // 1 PASS ACCUMULATION
    // -----------------------------
    for (const t of trades) {
      const targets = [
        acc.a,
        t.isLong ? acc.l : acc.s
      ];
  
      for (const g of targets) {
        const p = t.pResult;
        const v = t.vResult;
  
        g.sumP += p;
        g.sumV += v;
        g.sumSqP += p * p;
        g.sumSqV += v * v;
  
        g.holdSum += t.bars;
        g.holdMax = Math.max(g.holdMax, t.bars);
  
        if (t.isWin) {
          g.win++;
          g.sumWinP += p;
          g.sumWinV += v;
          g.maxWinP = Math.max(g.maxWinP, p);
          g.maxWinV = Math.max(g.maxWinV, v);
        } else {
          g.loss++;
          g.sumLossP += p;
          g.sumLossV += v;
          g.maxLossP = Math.min(g.maxLossP, p);
          g.maxLossV = Math.min(g.maxLossV, v);
        }
      }
    }
  
    // -----------------------------
    // BUILDER
    // -----------------------------
    const build = g => {
      const tradeCount = g.win + g.loss;
  
      const avgP = tradeCount ? g.sumP / tradeCount : 0;
      const avgV = tradeCount ? g.sumV / tradeCount : 0;
  
      const stdevP = tradeCount
        ? Math.sqrt(g.sumSqP / tradeCount - avgP * avgP)
        : 0;
  
      const stdevV = tradeCount
        ? Math.sqrt(g.sumSqV / tradeCount - avgV * avgV)
        : 0;
  
      const avgWinP = g.win ? g.sumWinP / g.win : 0;
      const avgLossP = g.loss ? g.sumLossP / g.loss : 0;
      const avgWinV = g.win ? g.sumWinV / g.win : 0;
      const avgLossV = g.loss ? g.sumLossV / g.loss : 0;
  
      return {
        totalTrade: { p: tradeCount, v: tradeCount, t: "int" },
        winTrade:   { p: g.win, v: g.win, t: "int" },
        lossTrade:  { p: g.loss, v: g.loss, t: "int" },
  
        winrate: {
          p: tradeCount ? g.win / tradeCount * 100 : 0,
          v: tradeCount ? g.win / tradeCount * 100 : 0,
          t: "%"
        },
  
        grossProfit: { p: g.sumWinP, v: g.sumWinV, t: "" },
        grossLoss:   { p: Math.abs(g.sumLossP), v: Math.abs(g.sumLossV), t: "" },
  
        netReturn: {
          p: g.sumP,
          v: g.sumV,
          t: "R"
        },
  
        avgReturn: {
          p: avgP,
          v: avgV,
          t: "R"
        },
  
        medianReturn: {
          p: 0, // intentionally omitted (needs sorted list)
          v: 0,
          t: "R"
        },
  
        stdDeviation: {
          p: stdevP,
          v: stdevV,
          t: "R"
        },
  
        avgProfit: {
          p: avgWinP,
          v: avgWinV,
          t: ""
        },
  
        avgLoss: {
          p: avgLossP,
          v: avgLossV,
          t: ""
        },
  
        maxProfit: {
          p: g.maxWinP === -Infinity ? 0 : g.maxWinP,
          v: g.maxWinV === -Infinity ? 0 : g.maxWinV,
          t: ""
        },
  
        maxLoss: {
          p: g.maxLossP === Infinity ? 0 : g.maxLossP,
          v: g.maxLossV === Infinity ? 0 : g.maxLossV,
          t: ""
        },
  
        profitFactor: {
          p: g.sumWinP / Math.abs(g.sumLossP || 1),
          v: g.sumWinV / Math.abs(g.sumLossV || 1),
          t: ""
        },
  
        avgRiskReward: {
          p: avgWinP / Math.abs(avgLossP || 1),
          v: avgWinV / Math.abs(avgLossV || 1),
          t: "1:"
        },
  
        avgHold: {
          p: tradeCount ? g.holdSum / tradeCount : 0,
          v: tradeCount ? g.holdSum / tradeCount : 0,
          t: "time"
        },
  
        maxHold: {
          p: g.holdMax,
          v: g.holdMax,
          t: "time"
        }
      };
    };
  
    // -----------------------------
    // FINAL OUTPUT
    // -----------------------------
    return {
      a: build(acc.a),
      l: build(acc.l),
      s: build(acc.s),
    };
  }

  
}
