// ============================================================================
// TradeStat — Final Complete Class
// ============================================================================
export class TradeStat {

  constructor(trades) {
    this.raw = trades;
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

  // ------------------------------
  // Drawdown computation
  // ------------------------------
  computeDrawdown(equityList) {
    let peak = equityList[0];
    let ddList = [];

    for (const v of equityList) {
      if (v > peak) peak = v;
      const dd = peak - v;
      ddList.push(dd);
    }

    return {
      maxDD: this.max(ddList),
      avgDD: this.avg(ddList)
    };
  }

  // ------------------------------
  // Recovery factor computation
  // ------------------------------
  computeRecovery(equityList) {
    const { maxDD } = this.computeDrawdown(equityList);
    const finalGain = equityList.at(-1);

    return {
      rf: maxDD ? finalGain / maxDD : 0,
      avgRecovery: finalGain ? finalGain / equityList.length : 0
    };
  }

  // ============================================================================
  // 1. SUPER NORMALIZER
  // ============================================================================
  _normalizeTrade(t) {
    const dateEN = MT.dateISO(t.dateEN);
    const dateEX = MT.dateISO(t.dateEX);

    const p = MP.computePips(t, t.pair);
    const pips = +p.pips.toFixed(2);
    const vpips = +p.vpips.toFixed(2);

    const isWin  = t.result === 'TP';
    const isLong = t.type === 'Buy';

    return {
      pair: t.pair,
      isWin,
      isLong,

      dateEN,
      dateEX,
      month: `${dateEN.getFullYear()}-${String(dateEN.getMonth()+1).padStart(2,'0')}`,

      priceEN: +t.priceEN,
      priceTP: +t.priceTP,
      priceSL: +t.priceSL,

      pips,
      vpips,
      absPips: Math.abs(pips),
      absVPips: Math.abs(vpips),
      netPips: isWin ? Math.abs(pips) : -Math.abs(pips),
      netVPips: isWin ? Math.abs(vpips) : -Math.abs(vpips),

      barsHeld: MT.estimateBarsHeld(dateEN, dateEX),
    };
  }

  _scanTrades(rows) {
    return rows.map(t => this._normalizeTrade(t));
  }

  // ============================================================================
  // 2. AGGREGATORS
  // ============================================================================

  // -------- symbols: performance per pair --------
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

  // -------- monthly accumulations --------
  _aggMonthly(rows) {
    const map = {};

    for (const r of rows) {
      if (!map[r.month]) {
        map[r.month] = { pips: 0, vpips: 0 };
      }
      map[r.month].pips  += r.netPips;
      map[r.month].vpips += r.netVPips;
    }

    return map;
  }

  // -------- equity curve --------
  _aggEquity(rows) {
    const eqP = [];
    const eqV = [];

    let cumP = 0;
    let cumV = 0;

    for (const r of rows) {
      cumP += r.netPips;
      cumV += r.netVPips;

      eqP.push(cumP);
      eqV.push(cumV);
    }

    return { pips: eqP, vpips: eqV };
  }

  // -------- single stats (1-dim) --------
  _aggSingle(rows, monthly) {
    // period
    const start = rows[0].dateEN;
    const end = rows.at(-1).dateEN;
    const monthCount = this.countUnique(rows.map(r => r.month));

    // winrate
    const wins = rows.filter(r => r.isWin).length;

    // stability
    const months = Object.values(monthly);
    const stableMonths = months.filter(m => m.pips > 0).length;

    // streaks
    let consW = [], consL = [];
    let curW = 0, curL = 0;

    for (const r of rows) {
      if (r.isWin) {
        curW++;
        if (curL > 0) consL.push(curL);
        curL = 0;
      } else {
        curL++;
        if (curW > 0) consW.push(curW);
        curW = 0;
      }
    }

    if (curW > 0) consW.push(curW);
    if (curL > 0) consL.push(curL);

    // bars
    const allBars = rows.map(r => r.barsHeld);

    return {
      period: { start, end, monthCount },
      stability: months.length ? (stableMonths / months.length) * 100 : 0,

      winrate: { total: wins, percent: wins / rows.length },

      consProfit: consW,
      consLoss: consL,

      avgHoldBar: this.avg(allBars),
      maxHoldBar: this.max(allBars)
    };
  }

  // -------- double stats (dual mode: pips/vpips) --------
  _aggDouble(rows) {
    const out = {
      highestNet: [],
      lowestNet: [],
      stdDev: [],
      maxDD: [],
      avgDD: [],
      recoveryFactor: [],
      avgRecovery: []
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

      const dd = this.computeDrawdown(arr);
      out.maxDD.push(dd.maxDD);
      out.avgDD.push(dd.avgDD);

      const rc = this.computeRecovery(arr);
      out.recoveryFactor.push(rc.rf);
      out.avgRecovery.push(rc.avgRecovery);
    }

    return out;
  }

  // -------- triple stats (A/L/S breakdown) --------
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

    for (const k of ['a','l','s']) {
      const g = groups[k];

      for (const mode of ['netPips','netVPips']) {
        const arr = g.map(r => r[mode]);

        result.net[k].push(this.sum(arr));
        result.avgNet[k].push(this.avg(arr));

        const wins  = arr.filter(v => v > 0);
        const losses = arr.filter(v => v < 0);

        const gp = this.sum(wins);
        const gl = this.sum(losses);

        result.grossProfit[k].push(gp);
        result.grossLoss[k].push(gl);

        result.avgProfit[k].push(this.avg(wins));
        result.avgLoss[k].push(this.avg(losses));

        const pf = gl ? gp / Math.abs(gl) : 0;
        result.profitFactor[k].push(pf);

        const N = arr.length;
        const wr = wins.length / N;
        const lr = losses.length / N;

        const ex = wr * this.avg(wins) + lr * this.avg(losses);
        result.expectancy[k].push(ex);
      }
    }

    return result;
  }

  // ============================================================================
  // FINAL OUTPUT
  // ============================================================================
  build() {
    const rows = this._scanTrades(this.raw);

    const symbols = this._aggSymbols(rows);
    const monthly = this._aggMonthly(rows);
    const equity  = this._aggEquity(rows);
    const single  = this._aggSingle(rows, monthly);
    const double  = this._aggDouble(rows);
    const triple  = this._aggTriple(rows);

    return {
      symbols,
      accumulations: monthly,
      equity,
      single,
      double,
      triple
    };
  }
}