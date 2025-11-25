// ~/model/StatisticsModel.js
import * as HM from '../helpers/metrics.js';
import * as HT from '../helpers/time.js';

export class StatisticsModel {

  constructor() {
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    window.addEventListener('tradedata-updated', e => {
      if (e.detail.stats.total >= 50 && e.detail.stats.invalid === 0) {
        this.data = e.detail.trades;
        this.stats = this.build();
        console.log(this.stats.general)
        this._dispatchUpdate();
      }
    });
  }
  // ============================================================================
  // FINAL OUTPUT
  // ============================================================================
  
  build() {
    const rows = this._scanTrades(this.data);
    const symbols = this._aggSymbols(rows); // ok
    const monthly = this._aggMonthly(rows); // ok
    const equity  = this._aggEquity(rows); // ok
    const general  = this._aggGeneral(rows);
    const ddown   = this._aggDrawdown(equity);
    const single  = this._aggSingle(rows, monthly); 
    const double  = this._aggDouble(rows); 


    return {
      symbols,
      monthly,
      equity,
      general,
      ddown,
      single,
      double,
    };
  }

  // ============================================================================
  // 1. SUPER NORMALIZER
  // ============================================================================
  _normalizeTrade(t) {
    const { pair, type, result, dateEN, dateEX, priceEN, priceTP, priceSL } = t;
    const [dEN, dEX] = [HT.dateISO(dateEN), HT.dateISO(dateEX)];
    const { pips, vpips } = HM.computePips(t, pair);
    const absP = Math.abs(pips), absV = Math.abs(vpips);
    const isWin = result === 'TP';
  
    return {
      pair,
      isWin,
      isLong: type === 'Buy',
      dateEN: dEN,
      dateEX: dEX,
      month: `${dEN.getFullYear()}-${String(dEN.getMonth()+1).padStart(2,'0')}`,
      priceEN: +priceEN,
      priceTP: +priceTP,
      priceSL: +priceSL,
      pips: +pips,
      vpips: +vpips,
      absP,
      absV,
      netP: isWin ? absP : -absP,
      netV: isWin ? absV : -absV,
      bars: HT.estimateBarsHeld(dEN, dEX),
    };
  }

  _scanTrades(rows) {
    return rows
      .map(t => this._normalizeTrade(t))        // 1. Normalisasi dulu
      .sort((a, b) => a.dateEX - b.dateEX);     // 2. Sort ascending berdasarkan dateEX
  }
  // ============================================================================
  // 2. AGGREGATORS
  // ============================================================================
  _aggSymbols(rows) {
    const map = {};

    for (const r of rows) {
      if (!map[r.pair]) {
        map[r.pair] = { pair: r.pair, pips: 0, vpips: 0 };
      }
      map[r.pair].pips  += r.netP;
      map[r.pair].vpips += r.netV;
    }

    return Object.values(map);
  }

  _aggMonthly(trades) {
    const monthly = {}, yearly = {}, total = { pips: 0, vpips: 0 };
  
    trades.forEach(({ month, netP, netV }) => {
      const year = month.split("-")[0]; // ambil tahun dari month
  
      // Bulanan
      if (!monthly[month]) monthly[month] = { pips: 0, vpips: 0 };
      monthly[month].pips  += netP;
      monthly[month].vpips += netV;
  
      // Tahunan
      if (!yearly[year]) yearly[year] = { pips: 0, vpips: 0 };
      yearly[year].pips  += netP;
      yearly[year].vpips += netV;
  
      // Total keseluruhan
      total.pips  += netP;
      total.vpips += netV;
    });
  
    return { monthly, yearly, total };
  }

  _aggEquity(rows) {
    let cumP = 0, cumV = 0;
    const pips = [];
    const vpips = [];
  
    for (const { pair, isLong, dateEX, netP, netV } of rows) {
  
      cumP += netP;
      cumV += netV;
  
      pips.push({
        isLong,
        pair,
        graph: cumP,
        date: dateEX,
        value: netP
      });
  
      vpips.push({
        isLong,
        pair,
        graph: cumV,
        date: dateEX,
        value: netV
      });
    }
  
    return { pips, vpips };
  }

  _aggDrawdown(curve) {
    return {
      pips: HM.computeDrawdown(curve.pips),
      vpips: HM.computeDrawdown(curve.vips)
    };
  }

  _aggSingle(rows, monthly) {
    const start = rows[0].dateEN;
    const end = rows.at(-1).dateEN;
    const monthCount = HM.countUnique(rows.map(r => r.month));
  
    // Stability (bulan positif)
    const monthsArr = Object.values(monthly);
    const stableMonths = monthsArr.filter(m => m.pips > 0).length;
    const stability = monthsArr.length ? (stableMonths / monthsArr.length) * 100 : 0;
    // Streak
    const streaks = HM.computeStreaks(rows);
  
    return {
      period: { start, end, monthCount },
      stability,
      streaks
    };
  }

  _aggDouble(rows) {
    const out = {
      highestNet: [],
      lowestNet: [],
      stdDev: [],
    };

    const modes = {
      pips:  rows.map(r => r.netP),
      vpips: rows.map(r => r.netV)
    };

    for (const key of ["pips", "vpips"]) {
      const arr = modes[key];

      out.highestNet.push(HM.max(arr));
      out.lowestNet.push(HM.min(arr));
      out.stdDev.push(HM.std(arr));
    }

    return out;
  }

  _aggGeneral(rows) {
    // siapkan struktur kategori
    const cats = {
      a: { winP: [], winV: [], lossP: [], lossV: [], hold: [] },
      l: { winP: [], winV: [], lossP: [], lossV: [], hold: [] },
      s: { winP: [], winV: [], lossP: [], lossV: [], hold: [] }
    };
  
    // --- SINGLE LOOP ---
    for (const r of rows) {
      const target = r.isLong ? cats.l : cats.s;
      const groups = [cats.a, target];
  
      for (const g of groups) {
        g.hold.push(r.bars);
  
        if (r.isWin) {
          g.winP.push(r.pips);
          g.winV.push(r.vpips);
        } else {
          g.lossP.push(Math.abs(r.pips));
          g.lossV.push(Math.abs(r.vpips));
        }
      }
    }
  
    // helper p/v object builder
    const build = (g) => {
      const winCount = g.winP.length;
      const lossCount = g.lossP.length;
      const totalTrades = winCount + lossCount || 1;
  
      const sumWinP = HM.sum(g.winP);
      const sumLossP = HM.sum(g.lossP);
      const sumWinV = HM.sum(g.winV);
      const sumLossV = HM.sum(g.lossV);
  
      return {
        trades: {
          p: winCount + lossCount,
          v: winCount + lossCount
        },
  
        winTrades: { p: winCount, v: winCount },
        lossTrades: { p: lossCount, v: lossCount },
  
        avgProfit: { p: HM.avg(g.winP), v: HM.avg(g.winV) },
        avgLoss:   { p: HM.avg(g.lossP), v: HM.avg(g.lossV) },
  
        grossProfit: { p: sumWinP, v: sumWinV },
        grossLoss:   { p: sumLossP, v: sumLossV },
  
        profitFactor: {
          p: sumLossP ? sumWinP / sumLossP : 0,
          v: sumLossV ? sumWinV / sumLossV : 0
        },
  
        winrate: {
          p: winCount / totalTrades * 100,
          v: winCount / totalTrades * 100
        },
  
        expectancy: {
          p: HM.avg(g.winP) * (winCount / totalTrades)
           - HM.avg(g.lossP) * (lossCount / totalTrades),
  
          v: HM.avg(g.winV) * (winCount / totalTrades)
           - HM.avg(g.lossV) * (lossCount / totalTrades),
        },
  
        holdAvg: { p: HM.avg(g.hold), v: HM.avg(g.hold) },
        holdMax: { p: HM.max(g.hold), v: HM.max(g.hold) },
  
        // -------------------------
        // ❗ Tambahan metrik di bawah ini
        // -------------------------
  
        // 1. MEDIAN PROFIT & LOSS
        profitMedian: { p: HM.median(g.winP), v: HM.median(g.winV) },
        lossMedian:   { p: HM.median(g.lossP), v: HM.median(g.lossV) },
  
        // 2. STANDARD DEVIATION
        profitStd: { p: HM.std(g.winP), v: HM.std(g.winV) },
        lossStd:   { p: HM.std(g.lossP), v: HM.std(g.lossV) },
  
        // 3. MAX PROFIT / LOSS
        maxProfit: { p: HM.max(g.winP), v: HM.max(g.winV) },
        maxLoss:   { p: HM.max(g.lossP), v: HM.max(g.lossV) },
  
        // 4. MIN PROFIT / LOSS
        minProfit: { p: HM.min(g.winP), v: HM.min(g.winV) },
        minLoss:   { p: HM.min(g.lossP), v: HM.min(g.lossV) },
  
        // 5. AVERAGE RISK-REWARD
        avgRR: {
          p: HM.avg(g.winP.map((w, i) => w / (g.lossP[i] || w))),
          v: HM.avg(g.winV.map((w, i) => w / (g.lossV[i] || w)))
        },
  
        // 7. NET TOTAL (PROFIT - LOSS)
        netTotal: {
          p: sumWinP - sumLossP,
          v: sumWinV - sumLossV
        },
      };
    };
  
    return {
      a: build(cats.a),
      l: build(cats.l),
      s: build(cats.s)
    };
  }
  
  _dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('statistics-updated', {
      detail: { stats: this.stats }
    }));
  }
}