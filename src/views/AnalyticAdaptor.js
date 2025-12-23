export class AnalyticAdaptor {
  constructor(rows) {
    this.src = rows;
    this.filter = { range: null, pairs: null };

    this.base = this._buildBase();
    this.view = this.base;
  }

  /* ---------- base ---------- */

  _buildBase() {
    return {
      meta: this._buildMeta(),
      curve: this._buildCurve(this.src),
      general: this._buildGeneral(this.src)
    };
  }

  _buildMeta() {
    return {
      pairs: this._buildPairOptions(),
      ranges: this._buildRangeOptions()
    };
  }

  _buildPairOptions() {
    return [...new Set(this.src.map(t => t.pair))].sort();
  }

  _buildRangeOptions() {
    return [
      { id: "3m", label: "3M", days: 90 },
      { id: "6m", label: "6M", days: 180 },
      { id: "1y", label: "1Y", days: 365 }
    ];
  }

  /* ---------- filtering ---------- */

  updateFilter(patch) {
    this.filter = { ...this.filter, ...patch };
    this.view = this._buildView();
    return this.view;
  }

  _buildView() {
    const filtered = this._applyFilter(this.src, this.filter);

    return {
      meta: this.base.meta,        // ⚠️ meta HARUS ikut
      curve: this._buildCurve(filtered),
      general: this._buildGeneral(filtered)
    };
  }

  _applyFilter(trades, filter) {
    let out = trades;

    // range by preset
    if (filter.range) {
      const opt = this.base.meta.ranges.find(r => r.id === filter.range);
      if (opt) {
        const max = Math.max(...out.map(t => t.dateEX));
        const from = max - opt.days * 864e5;
        out = out.filter(t => t.dateEX >= from);
      }
    }

    // pair filter
    if (filter.pairs?.length) {
      out = out.filter(t => filter.pairs.includes(t.pair));
    }

    return out;
  }


  /* ======================
   * CURVE (REUSABLE)
   * ====================== */

  _buildCurve(trades) {
    let cumP = 0, cumV = 0;
    const p = [];
    const v = [];

    for (const { pair, dateEX, pResult, vResult } of trades) {
      cumP += pResult;
      cumV += vResult;

      p.push({
        pair,
        time: dateEX,
        equity: cumP,
        result: pResult
      });

      v.push({
        pair,
        time: dateEX,
        equity: cumV,
        result: vResult
      });
    }

    return { p, v };
  }

  /* ======================
   * GENERAL (SUMMARY)
   * ====================== */

  _buildGeneral(trades) {

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

}