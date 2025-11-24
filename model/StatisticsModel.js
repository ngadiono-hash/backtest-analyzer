// /model/StatisticsModel.js
import * as HM from '../helpers/metrics.js';
import * as MT from '../helpers/time.js';

export class StatisticsModel {

  constructor() {
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    window.addEventListener('tradedata-updated', e => {
      if (e.detail.stats.total >= 50 && e.detail.stats.invalid === 0) {
        this.data = e.detail.trades;
        this.stats = this.build();
        //console.log(this.stats.ddown.pips)
        return;
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
    const ddown   = this._aggDrawdown(equity);
    const single  = this._aggSingle(rows, monthly); 
    const double  = this._aggDouble(rows); 
    const triple  = this._aggTriple(rows);


    return {
      symbols,
      monthly,
      equity,
      ddown,
      single,
      double,
      triple
    };
  }
  // ------------------------------
  // Utility math helper
  // ------------------------------
  sum(arr) { return arr.reduce((a,b) => a + b, 0); }
  avg(arr) { return arr.length ? this.sum(arr) / arr.length : 0; }
  min(arr) { return Math.min(...arr); }
  max(arr) { return Math.max(...arr); }

  std(arr) {
    if (!arr.length) return 0;
    const mean = this.avg(arr);
    const variance = this.avg(arr.map(v => (v - mean) ** 2));
    return Math.sqrt(variance);
  }

  countUnique(arr) {
    return new Set(arr).size;
  }

  // ============================================================================
  // 1. SUPER NORMALIZER
  // ============================================================================
  _normalizeTrade(t) {
    const { pair, type, result, dateEN, dateEX, priceEN, priceTP, priceSL } = t;
    const [dEN, dEX] = [MT.dateISO(dateEN), MT.dateISO(dateEX)];
    const { pips, vpips } = HM.computePips(t, pair);
    const absPips = Math.abs(pips), absVPips = Math.abs(vpips);
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
      absPips,
      absVPips,
      netPips: isWin ? absPips : -absPips,
      netVPips: isWin ? absVPips : -absVPips,
      barsHeld: MT.estimateBarsHeld(dEN, dEX),
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
      map[r.pair].pips  += r.netPips;
      map[r.pair].vpips += r.netVPips;
    }

    return Object.values(map);
  }

  _aggMonthly(trades) {
    const monthly = {}, yearly = {}, total = { pips: 0, vpips: 0 };
  
    trades.forEach(({ month, netPips, netVPips }) => {
      const year = month.split("-")[0]; // ambil tahun dari month
  
      // Bulanan
      if (!monthly[month]) monthly[month] = { pips: 0, vpips: 0 };
      monthly[month].pips  += netPips;
      monthly[month].vpips += netVPips;
  
      // Tahunan
      if (!yearly[year]) yearly[year] = { pips: 0, vpips: 0 };
      yearly[year].pips  += netPips;
      yearly[year].vpips += netVPips;
  
      // Total keseluruhan
      total.pips  += netPips;
      total.vpips += netVPips;
    });
  
    return { monthly, yearly, total };
  }

  _aggEquity(rows) {
    let cumP = 0, cumV = 0;
    const pips = [];
    const vpips = [];
  
    for (const { pair, isLong, dateEX, netPips, netVPips } of rows) {
  
      cumP += netPips;
      cumV += netVPips;
  
      pips.push({
        isLong,
        pair,
        graph: cumP,
        date: dateEX,
        value: netPips
      });
  
      vpips.push({
        isLong,
        pair,
        graph: cumV,
        date: dateEX,
        value: netVPips
      });
    }
  
    return { pips, vpips };
  }

  _aggDrawdown(curve) {
    console.log(curve)
    return {
      pips: HM.computeDrawdown(curve.pips),
      vpips: HM.computeDrawdown(curve.vips)
    };
  }

  _aggSingle(rows, monthly) {
    const start = rows[0].dateEN;
    const end = rows.at(-1).dateEN;
    const monthCount = this.countUnique(rows.map(r => r.month));
  
    // Winrate
    const wins = rows.filter(r => r.isWin).length;
  
    // Stability (bulan positif)
    const monthsArr = Object.values(monthly);
    const stableMonths = monthsArr.filter(m => m.pips > 0).length;
    const stability = monthsArr.length ? (stableMonths / monthsArr.length) * 100 : 0;
    // Streak
    const streaks = HM.computeStreaks(rows);
    // Bars held
    const allBars = rows.map(r => r.barsHeld);
  
    return {
      period: { start, end, monthCount },
      stability,
      streaks,
      winrate: wins / rows.length * 100,
      avgHoldBar: this.avg(allBars),
      maxHoldBar: this.max(allBars)
    };
  }

  _aggDouble(rows) {
    const out = {
      highestNet: [],
      lowestNet: [],
      stdDev: [],
    };

    const modes = {
      pips:  rows.map(r => r.netPips),
      vpips: rows.map(r => r.netVPips)
    };

    for (const key of ["pips", "vpips"]) {
      const arr = modes[key];

      out.highestNet.push(this.max(arr));
      out.lowestNet.push(this.min(arr));
      out.stdDev.push(this.std(arr));
    }

    return out;
  }

  _aggTriple(rows) {
    const groups = {
      a: rows,
      l: rows.filter(r => r.isLong),
      s: rows.filter(r => !r.isLong)
    };

    const result = {
      trades: { a:[], l:[], s:[] },
      avgTrades: { a:[], l:[], s:[] },
      winTrades: { a:[], l:[], s:[] },
      lossTrades: { a:[], l:[], s:[] },
      net: { a:[], l:[], s:[] },
      avgNet: { a:[], l:[], s:[] },
      grossProfit: { a:[], l:[], s:[] },
      grossLoss: { a:[], l:[], s:[] },
      avgProfit: { a:[], l:[], s:[] },
      avgLoss: { a:[], l:[], s:[] },
      avgRR: { a:[], l:[], s:[] },
      profitFactor: { a:[], l:[], s:[] },
      expectancy: { a:[], l:[], s:[] }
    };

  }
  
  _dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('statistics-updated', {
      detail: { stats: this.stats }
    }));
  }
}