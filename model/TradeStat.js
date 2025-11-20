// /model/TradeStat.js
import * as MB from '../helpers/metrics_basic.js';
import * as MP from '../helpers/metrics_pips.js';
import * as MT from '../helpers/metrics_time.js';
import * as ME from '../helpers/metrics_equity.js';
import * as MM from '../helpers/metrics_monthly.js';
import { log } from "../helpers/shortcut.js";

export class TradeStat {
  constructor() {
    this._setupEventListeners();
    this.stats = {};
  }
  
  _setupEventListeners() {
    window.addEventListener('tradedata-updated', e => {
      if (e.detail.stats.total >= 50 && e.detail.stats.invalid === 0) {
        this.data = e.detail.trades;
        this._runAnalysis();
      }
    });
  }
  
  _runAnalysis() {
    this.sorted = this.data.sort((a, b) => MT.dateISO(a.dateEX) - MT.dateISO(b.dateEX));
    this.normalized = this.sorted.map(t => this._normalizeTrade(t)).filter(Boolean);
    // TABLE MONTHLY
    this.monthlyAgg = MM.aggregateByMonth(this.normalized);
    this.monthlyStats = MM.computeMonthlyStats(this.monthlyAgg, 300);
    this.pairsAgg = MM.aggregateByPair(this.normalized);
    this.curve = ME.buildEquityCurve(this.normalized);
    this.drawdown = ME.computeDrawdown(this.curve.pips, 300);
    this.stats = this._calculateAllStats()
    this._dispatchUpdate();
  }
  
  _normalizeTrade(t) {
    const p = MP.computePips(t, t.pair);
    return {
      pair: t.pair,
      type: t.type,
      dateEN: MT.dateISO(t.dateEN),
      dateEX: MT.dateISO(t.dateEX),
      priceEN: Number(t.priceEN),
      priceTP: Number(t.priceTP),
      priceSL: Number(t.priceSL),
      pips: Number(p.pips.toFixed(2)),
      vpips: Number(p.vpips.toFixed(2)),
      isWin: t.result === 'TP',
      barsHeld: MT.estimateBarsHeld(t.dateEN, t.dateEX)
    };
  }

  _calculateAllStats() {
    
    const long = this.normalized.filter(t => t.type === 'Buy');
    const short = this.normalized.filter(t => t.type === 'Sell');
    return {
      monthlyAgg: this.monthlyAgg,
      monthlyStats: this.monthlyStats,
      pairAgg: this.pairsAgg,
      total: {
        //long: this._computeCategoryStats(long, period.months),
        //short: this._computeCategoryStats(short, period.months),
        //all: this._computeCategoryStats(all, period.months)
      }
    };
  }
  
  
  _computeCategoryStats(trades, months) {
    const basic = MB.calculateBasicStats(trades);
    const streaks = MB.calculateStreaks(trades);
    const rr = MB.calculateRiskReward(trades);
    const wins = trades.filter(t => t.isWin);
    const losses = trades.filter(t => !t.isWin);
    const grossProfitPips = wins.reduce((s, t) => s + Math.abs(t.pips), 0);
    const grossLossPips = losses.reduce((s, t) => s + Math.abs(t.pips), 0);
    const avgProfitPips = grossProfitPips / wins.length;
    const avgLossPips = Math.abs(grossLossPips) / losses.length;
    const recoveryFactor = maxDD === 0 ? Infinity : netPips / maxDD;
    
    return {
      equityCurve: equityCurve ?? [],
      trades: trades.length ?? 0,
      wintrades: wins.length ?? 0,
      losstrades: losses.length ?? 0,
      winrate: basic?.winrate ?? 0,
      profitFactor: basic?.profitFactor ?? 0,
      netPips: netPips ?? 0,
      grossProfitPips: grossProfitPips ?? 0,
      grossLossPips: grossLossPips ?? 0,
      avgProfitPips: avgProfitPips ?? 0,
      avgLossPips: avgLossPips ?? 0,
      maxWinStreak: streaks?.maxWinStreak ?? 0,
      maxLossStreak: streaks?.maxLossStreak ?? 0,
      monthly: {
        minNetPips: monthly?.minPips ?? 0,
        maxNetPips: monthly?.maxPips ?? 0,
        avgNetPips: monthly?.avgPips ?? 0,
        stability: monthly?.stability ?? 0,
      },
      riskReward: rr ?? "—",
      maxDrawdownPips: dd?.absolute ?? 0,
      maxDrawdownPercent: dd?.percent ?? 0,
      recoveryFactor: recoveryFactor ?? 0,
      maxRecoveryBars: recovery?.max ?? 0,
      maxRecoveryTime: MT.barsToTime(recovery?.max ?? 0),
      //avgRecoveryBars: Math.round(recovery?.avg ?? 0),
      avgRecoveryTime: MT.barsToTime(Math.round(recovery?.avg ?? 0)),
      //avgTradeHoldBars: Math.round(avgHoldBars ?? 0),
      avgTradeHoldTime: MT.barsToTime(Math.round(avgHoldBars ?? 0)),
      //maxTradeHoldBars: Math.max(...(holdBars.length ? holdBars : [0])),
      maxTradeHoldTime: MT.barsToTime(Math.max(...(holdBars.length ? holdBars : [0]))),
      avgTradePerMonth: months ? (trades.length / months) : 0,
      profitPerMonthPips: months ? (netPips / months) : 0,
      profitPerTradePips: trades.length ? (netPips / trades.length) : 0,
    };
  }

  _dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('tradestat-updated', {
      detail: { stats: this.stats }
    }));
  }
}

// ~!@#$%^&*()_+
// `1234567890-=
// {}[]\|/;:'"
// <>?,.±