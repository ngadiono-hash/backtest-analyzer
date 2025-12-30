import * as MT from "helper/metrics.js";

export class Adaptor {
  constructor() {
    this.source = [];
    this.filter = { range:"ALL", pairs:new Set() };
    this.view = null;
  }

  setSource(rows=[]) {
    this.source = rows;
    this.filter.pairs.clear();
    this.years = this._getYears(rows);
    return this.view = this._build();
  }
  
  getView = () => this.view ?? this._build();

  applyFilter(p={}) {
    "range" in p && (this.filter.range=p.range, this.filter.pairs.clear());
    "pair"  in p && (p.on ? this.filter.pairs.add(p.pair) : this.filter.pairs.delete(p.pair));
    return this.view = this._build();
  }

  /* ---------- build ---------- */

  _build() {
    const ranged = this._applyRange(this.source,this.filter.range),
      pairStats = this._pairStats(ranged),
      filtered = this.filter.pairs.size ? ranged.filter(r => this.filter.pairs.has(r.pair)) : ranged;

    return {
      filter:{
        range:this.filter.range,
        pairs:[...this.filter.pairs],
        years:this.years
      },
      pairStats,
      data:{
        curve:this._computeCurve(filtered),
        general:this._computeGeneral(filtered),
        monthly:this._computeYearMonth(this.source),
        streak:this._computeStreak(filtered),
        drawdown:{},
        summaries:this._computePeriod(filtered)
      }
    };
  }

  /* ---------- helpers ---------- */

  _applyRange(rows, range) {
    if (range === "ALL") return rows;
  
    // year filter
    if (+range) return rows.filter(r => +r.month.slice(0,4) === +range);
  
    // rolling window
    const DAY=864e5,
          days={ "3M":90,"6M":180,"1Y":365 }[range] ?? 1e9,
          max=Math.max(...rows.map(r=>r.dateEX));
  
    return rows.filter(r => r.dateEX >= max - days*DAY);
  }

  _pairStats = rows =>
    rows.reduce((o,{pair}) => (o[pair]=(o[pair]||0)+1,o),{});
    
  _getYears = rows =>
    [...new Set(rows.map(r=>r.month&&+r.month.slice(0,4)).filter(Boolean))].sort((a,b)=>b-a);

  /* ---------- main method ---------- */

  _computeCurve(trades) {
    let p=0,v=0; const P=[],V=[];
    trades.forEach(({pair,dateEX:time,pResult, vResult})=>{
      P.push({pair,time,result:pResult,equity:p+=pResult});
      V.push({pair,time,result:vResult,equity:v+=vResult});
    });
    return { p:P, v:V };
  }

  _computeGeneral(trades) {
    const acc=()=>({
      w:0,l:0,swp:0,slp:0,swv:0,slv:0,
      sp:0,sv:0,sqp:0,sqv:0,
      maxWp:-1e9,maxWv:-1e9,maxLp:1e9,maxLv:1e9,
      hs:0,hm:0
    });

    const A={a:acc(),l:acc(),s:acc()};

    trades.forEach(t=>{
      [A.a, t.isLong?A.l:A.s].forEach(g=>{
        const {pResult:p,vResult:v,bars}=t;
        g.sp+=p; g.sv+=v; g.sqp+=p*p; g.sqv+=v*v;
        g.hs+=bars; g.hm=Math.max(g.hm,bars);
        t.isWin
          ? (g.w++,g.swp+=p,g.swv+=v,g.maxWp=Math.max(g.maxWp,p),g.maxWv=Math.max(g.maxWv,v))
          : (g.l++,g.slp+=p,g.slv+=v,g.maxLp=Math.min(g.maxLp,p),g.maxLv=Math.min(g.maxLv,v));
      });
    });

    const build=g=>{
      const n=g.w+g.l||1,
            avgP=g.sp/n, avgV=g.sv/n,
            sdP=Math.sqrt(g.sqp/n-avgP*avgP)||0,
            sdV=Math.sqrt(g.sqv/n-avgV*avgV)||0,
            awp=g.w?g.swp/g.w:0, alp=g.l?g.slp/g.l:0,
            awv=g.w?g.swv/g.w:0, alv=g.l?g.slv/g.l:0;

      return {
        totalTrade:{p:n,v:n,t:"int"},
        winTrade:{p:g.w,v:g.w,t:"int"},
        lossTrade:{p:g.l,v:g.l,t:"int"},
        winrate:{p:g.w/n*100,v:g.w/n*100,t:"%"},
        grossProfit:{p:g.swp,v:g.swv,t:""},
        grossLoss:{p:Math.abs(g.slp),v:Math.abs(g.slv),t:""},
        netReturn:{p:g.sp,v:g.sv,t:"R"},
        avgReturn:{p:avgP,v:avgV,t:"R"},
        stdDeviation:{p:sdP,v:sdV,t:"R"},
        avgProfit:{p:awp,v:awv,t:""},
        avgLoss:{p:alp,v:alv,t:""},
        maxProfit:{p:Math.max(0,g.maxWp),v:Math.max(0,g.maxWv),t:""},
        maxLoss:{p:Math.min(0,g.maxLp),v:Math.min(0,g.maxLv),t:""},
        profitFactor:{p:g.swp/Math.abs(g.slp||1),v:g.swv/Math.abs(g.slv||1),t:""},
        avgRiskReward:{p:awp/Math.abs(alp||1),v:awv/Math.abs(alv||1),t:"1:"},
        avgHold:{p:g.hs/n,v:g.hs/n,t:"time"},
        maxHold:{p:g.hm,v:g.hm,t:"time"}
      };
    };

    return { a:build(A.a), l:build(A.l), s:build(A.s) };
  }

  _computeYearMonth(trades) {
    const Y={}, M={}, R={};
    trades.forEach(t=>{
      const y=t.month.slice(0,4);
      (Y[y]??=[]).push(t);
      (M[t.month]??=[]).push(t);
    });

    Object.keys(Y).forEach(y=>R[y]={months:{},summary:null});
    Object.entries(M).forEach(([m,list])=>{
      const y=m.slice(0,4);
      R[y].months[m]={ equity:this._computeCurve(list), summary:this._aggregateMonthly(list) };
    });
    Object.keys(R).forEach(y=>R[y].summary=this._aggregateYearly(R[y].months));
    return R;
  }

  _aggregateMonthly(trades) {
    let netP=0,netV=0,win=0; const pairNet={};
    trades.forEach(t=>{
      netP+=t.pResult; netV+=t.vResult;
      t.vResult>0&&win++;
      pairNet[t.pair]=(pairNet[t.pair]||0)+t.vResult;
    });
    const pairs=Object.entries(pairNet).sort((a,b)=>b[1]-a[1]);
    return {
      tCount:trades.length,
      netP,netV,
      avgP:netP/(trades.length||1),
      avgV:netV/(trades.length||1),
      winRate:win/(trades.length||1)*100,
      best:pairs[0]?.[0]??null,
      worst:pairs.at(-1)?.[0]??null
    };
  }

  _aggregateYearly(months) {
    const list=Object.values(months), m=list.length||1;
    let netP=0,netV=0,tCount=0;
    list.forEach(o=>(
      tCount+=o.summary.tCount,
      netP+=o.summary.netP,
      netV+=o.summary.netV
    ));
    return { tCount, mCount:m, netP, netV, avgP:netP/m, avgV:netV/m };
  }

  _computePeriod(trades) {
    const M={},Y={},T={p:0,v:0};
    trades.forEach(({month,pResult,vResult})=>{
      const y=month.split("-")[0];
      (M[month]??={p:0,v:0}).p+=pResult;
      M[month].v+=vResult;
      (Y[y]??={p:0,v:0}).p+=pResult;
      Y[y].v+=vResult;
      T.p+=pResult; T.v+=vResult;
    });

    const mArr=Object.keys(M).sort().map(k=>({key:k,...M[k]})),
          yArr=Object.keys(Y).sort().map(k=>({key:k,...Y[k]})),
          start=trades[0]?.dateEN,
          end=trades.at(-1)?.dateEX,
          cM=mArr.length,
          avg=trades.length/(cM||1);

    return {
      accumulate:{ monthly:M, yearly:Y, total:T },
      summary:{
        countM:`${cM} months`,
        countY:`${(cM/12).toFixed(1)} years`,
        summaryM:MT.callMonthlyFunc(mArr,avg),
        summaryY: { start, end, ...MT.callYearlyFunc(yArr) }
      }
    };
  }
  
  _computeStreak(data, MIN = 2) {
    const exact = { win: {}, loss: {} };
    const details = { win: [], loss: [] };
  
    let len = 0, type = null;
  
    const flush = end => {
      if (len < MIN) return;
  
      const bucket = exact[type];
      bucket[len] = (bucket[len] || 0) + 1;
  
      const start = end - len + 1;
      const trades = data.slice(start, end + 1);
  
      details[type].push({
        length: len,
        totalP: trades.reduce((s, t) => s + (t.pResult || 0), 0),
        totalV: trades.reduce((s, t) => s + (t.vResult || 0), 0),
        trades
      });
    };
  
    data.forEach((t, i) => {
      const cur = t.isWin ? "win" : "loss";
  
      if (!len || cur === type) {
        type = cur;
        len++;
        return;
      }
  
      flush(i - 1);
      type = cur;
      len = 1;
    });
  
    flush(data.length - 1);
  
    // --- HITUNG PERSENTASE BERDASARKAN TOTAL STREAK EVENTS ---
    const withPct = side => {
      const counts = exact[side];
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  
      const pct = {};
      for (const len in counts) {
        pct[len] = counts[len] / total * 100;
      }
  
      return {
        exact: counts,
        pct,        // <-- INI PROPERTY BARU
        total,      // <-- opsional tapi sangat berguna
        details: details[side]
      };
    };
  
    return {
      win:  withPct("win"),
      lose: withPct("loss")
    };
  } 
  
}