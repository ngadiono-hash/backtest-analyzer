// src/models/ModelAnalytic.js
import * as FM from "util/formatter.js";
import * as MT from "component/metric_tools.js";

const RANGE = { "3 months": 90, "6 months": 180, "1 year": 365 };
const DAY = 864e5;

export class ModelAnalytic {

  build(trades, filter) {
    const src  = trades.map(this._finalize).sort((a,b)=>a.dateEX-b.dateEX);
    const slice = this._filter(src, filter);
    const core  = this._core(slice);
    return {
      meta: this._meta(trades),
      data: {
        curve: this.buildCurve(core),
        general: this._general(core.trades),
        period: this._period(core),
        monthly: this._monthlyDetail(src),
        yearly: this._yearlyDetail(src),
      }
    };
  }

  _meta(trades) {
    const pairs = {};
    for (const { pair } of trades) pairs[pair] = (pairs[pair]||0)+1;
    return {
      pairs: Object.entries(pairs).map(([pair,count])=>({ pair, count })),
      ranges: Object.keys(RANGE)
    };
  }

  _filter(trades, { pairs, range }) {
    let out = trades;

    if (pairs?.length) {
      const s = new Set(pairs);
      out = out.filter(t => s.has(t.pair));
    }

    if (RANGE[range]) {
      const last = out.at(-1)?.dateEX;
      if (last) out = out.filter(t => t.dateEX >= last - RANGE[range]*DAY);
    }

    return out;
  }

  _finalize(t) {
    const isWin = t.isWin;
    return {
      ...t,
      pResult: isWin ? t.pTP : t.pSL,
      vResult: isWin ? t.vTP : t.vSL,
      bars: FM.estimateBarsHeld(t.dateEN, t.dateEX)
    };
  }

  _core(trades) {
    let pEq=0, vEq=0;

    const core = {
      trades,
      curve: [],
      byPair: {},
      byMonth: {},
      byYear: {},
      streak: []
    };

    for (const t of trades) {
      pEq += t.pResult;
      vEq += t.vResult;

      core.curve.push({
        time: t.dateEX,
        pips: t.pResult,
        value: t.vResult,
        pEquity: FM.round(pEq),
        vEquity: FM.round(vEq),
        pair: t.pair,
      });

      (core.byPair[t.pair]  ??= []).push(t);
      (core.byMonth[t.month]??= []).push(t);
      (core.byYear[new Date(t.dateEX).getFullYear()] ??= []).push(t);

      core.streak.push(t.isWin);
    }

    return core;
  }
  
  /* ---------- main method ---------- */
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
  
  _buildCurve(trades) {
    let cumP = 0, cumV = 0;
    const p = [];
    const v = [];
  
    for (const { pair, dateEX, pResult, vResult } of trades) {
  
      cumP += pResult;
      cumV += vResult;
  
      p.push({
        pair,
        equity: cumP,
        time: dateEX,
        result: pResult
      });
  
      v.push({
        pair,
        equity: cumV,
        time: dateEX,
        result: vResult
      });
    }
  
    return { p, v };
  }
  
  _general(trades) {

    const acc = () => ({
      w:0,l:0, swp:0, slp:0, swv:0, slv:0,
      sp:0, sv:0, sqp:0, sqv:0,
      maxWp:-1e9, maxWv:-1e9, maxLp:1e9, maxLv:1e9,
      hs:0, hm:0
    });

    const A={ a:acc(), l:acc(), s:acc() };

    for (const t of trades) {
      const gs=[A.a, t.isLong?A.l:A.s];
      for (const g of gs) {
        const { pResult:p, vResult:v, bars } = t;

        g.sp+=p; g.sv+=v; g.sqp+=p*p; g.sqv+=v*v;
        g.hs+=bars; g.hm=Math.max(g.hm,bars);

        if (t.isWin) {
          g.w++; g.swp+=p; g.swv+=v;
          g.maxWp=Math.max(g.maxWp,p);
          g.maxWv=Math.max(g.maxWv,v);
        } else {
          g.l++; g.slp+=p; g.slv+=v;
          g.maxLp=Math.min(g.maxLp,p);
          g.maxLv=Math.min(g.maxLv,v);
        }
      }
    }

    const build = g => {
      const n=g.w+g.l||1;
      const avgP=g.sp/n, avgV=g.sv/n;
      const sdP=Math.sqrt(g.sqp/n-avgP*avgP)||0;
      const sdV=Math.sqrt(g.sqv/n-avgV*avgV)||0;

      const awp=g.w?g.swp/g.w:0, alp=g.l?g.slp/g.l:0;
      const awv=g.w?g.swv/g.w:0, alv=g.l?g.slv/g.l:0;

      return {
        totalTrade:{p:n,v:n,t:"int"},
        winTrade:{p:g.w,v:g.w,t:"int"},
        lossTrade:{p:g.l,v:g.l,t:"int"},
        winrate:{p:g.w/n*100,v:g.w/n*100,t:"%"},
        grossProfit:{p:g.swp,v:g.swv,t:""},
        grossLoss:{p:Math.abs(g.slp),v:Math.abs(g.slv),t:""},
        netReturn:{p:g.sp,v:g.sv,t:"R"},
        avgReturn:{p:avgP,v:avgV,t:"R"},
        // medianReturn:{p:0,v:0,t:"R"},
        stdDeviation:{p:sdP,v:sdV,t:"R"},
        avgProfit:{p:awp,v:awv,t:""},
        avgLoss:{p:alp,v:alv,t:""},
        maxProfit:{p:g.maxWp<0?0:g.maxWp,v:g.maxWv<0?0:g.maxWv,t:""},
        maxLoss:{p:g.maxLp>0?0:g.maxLp,v:g.maxLv>0?0:g.maxLv,t:""},
        profitFactor:{
          p:g.swp/Math.abs(g.slp||1),
          v:g.swv/Math.abs(g.slv||1),
          t:""
        },
        avgRiskReward:{
          p:awp/Math.abs(alp||1),
          v:awv/Math.abs(alv||1),
          t:"1:"
        },
        avgHold:{p:g.hs/n,v:g.hs/n,t:"time"},
        maxHold:{p:g.hm,v:g.hm,t:"time"}
      };
    };

    return { a:build(A.a), l:build(A.l), s:build(A.s) };
  }
  
  _period(core) {
    const monthly = {};
    const yearly  = {};
    const total   = { p: 0, v: 0 };
  
    /* ---------- monthly ---------- */
  
    for (const [month, list] of Object.entries(core.byMonth)) {
      let p = 0, v = 0;
  
      for (const t of list) {
        p += t.pResult;
        v += t.vResult;
      }
  
      monthly[month] = { p, v };
      total.p += p;
      total.v += v;
    }
  
    /* ---------- yearly ---------- */
  
    for (const [year, list] of Object.entries(core.byYear)) {
      let p = 0, v = 0;
  
      for (const t of list) {
        p += t.pResult;
        v += t.vResult;
      }
  
      yearly[year] = { p, v };
    }
  
    /* ---------- derived arrays ---------- */
  
    const monthlyArr = Object.keys(monthly)
      .sort() // YYYY-MM asc
      .map(k => ({ key: k, ...monthly[k] }));
  
    const yearlyArr = Object.keys(yearly)
      .sort()
      .map(k => ({ key: k, ...yearly[k] }));
  
    /* ---------- props ---------- */
  
    const first = core.trades[0].dateEN;
    const last  = core.trades.at(-1).dateEX;
  
    const start = new Date(first).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    });
  
    const end = new Date(last).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    });
  
    const countM   = monthlyArr.length;
    const countY   = countM / 12;
    const avgTrade = core.trades.length / countM;
  
    return {
      accum: { monthly, yearly, total },
      prop: {
        period: `${start} - ${end}`,
        months: `${countM} months`,
        years:  `${countY.toFixed(1)} years`,
        monthly: MT.callMonthlyFunc(monthlyArr, avgTrade),
        yearly:  MT.callYearlyFunc(yearlyArr)
      }
    };
  }
  
  _yearlyDetail(trades) {
    const yearMap = {};
  
    for (const t of trades) {
      const year = t.month.slice(0, 4);
  
      (yearMap[year] ??= []).push(t);
    }
  
    const result = {};
  
    for (const y in yearMap) {
      const list = yearMap[y];
  
      let netP = 0;
      let netV = 0;
  
      for (const t of list) {
        netP += t.pResult;
        netV += t.vResult;
      }
  
      const totalTrades = list.length;
  
      result[y] = {
        count: totalTrades,
        netP: FM.round(netP),
        netV: FM.round(netV),
        avgP: FM.round(netP/totalTrades),
        avgV: FM.round(netV/totalTrades)
      };
    }
    return result;
  }
  
  _monthlyDetail(trades) {
    const result = {};
  
    const monthMap = {};
    for (const t of trades) {
      if (!monthMap[t.month]) monthMap[t.month] = [];
      monthMap[t.month].push(t);
    }
  
    for (const month in monthMap) {
      const list = monthMap[month];
  
      const equity = this._buildCurve(list);
  
      const pairMap = {};
      for (const t of list) {
        if (!pairMap[t.pair]) pairMap[t.pair] = [];
        pairMap[t.pair].push(t);
      }
  
      const byPair = {};
      for (const p in pairMap) {
        byPair[p] = this._buildCurve(pairMap[p]);
      }
  
      let totalTrades = list.length;
      let netP = 0;
      let netV = 0;
  
      for (const t of list) {
        netP += t.pResult;
        netV += t.vResult;
      }
  
  
      result[month] = {
        equity,
        pairs: Object.keys(pairMap),
        byPair,
  
        summary: {
          count: totalTrades,
          netP: FM.round(netP),
          netV: FM.round(netV),
          avgP: FM.round(netP/totalTrades),
          avgV: FM.round(netV/totalTrades)
        }
      };
    }
    return result;
  }

  
}