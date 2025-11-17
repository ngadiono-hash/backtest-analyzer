// /model/TradeStat.js
import * as MB from '../helpers/metrics_basic.js';
import * as MP from '../helpers/metrics_pips.js';
import * as MT from '../helpers/metrics_time.js';
import * as ME from '../helpers/metrics_equity.js';
import * as MM from '../helpers/metrics_monthly.js';

export class TradeStat {
  constructor() {
    this.data = [];
    this.normalized = [];
    this.stats = {};
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    window.addEventListener('tradedata-updated', e => {
      if (e.detail.stats.invalid === 0) {
        this.data = e.detail.trades;
        this._runAnalysis();
      }
      return;
    });
  }
  
  _runAnalysis() {
    const sorted = this._sortTrades(this.data);
    this.normalized = sorted.map(t => this._normalizeTrade(t)).filter(Boolean);
    this.stats = this._calculateAllStats();
    this._dispatchUpdate();
  }
  
  _sortTrades(trades) {
    return [...trades].sort((a, b) => MT.dateHours(a.dateEX) - MT.dateHours(b.dateEX));
  }
  
  _normalizeTrade(t) {
    const p = MP.computePips(t, t.pair);
    return {
      ...t,
      dateEN: MT.dateHours(t.dateEN),
      dateEX: MT.dateHours(t.dateEX),
      pips: Math.abs(p),
      pipsSigned: p,
      isWin: t.result === 'TP',
      barsHeld: MT.estimateBarsHeld(t.dateEN, t.dateEX)
    };
  }
  
  _calculateAllStats() {
    const all = this.normalized;
    const long = all.filter(t => t.type === 'Buy');
    const short = all.filter(t => t.type === 'Sell');
    const period = this._computePeriod(all);
    return {
      period,
      monthly: MM.aggregateMonthlyPips(all),
      total: {
        long: this._computeCategoryStats(long, period.months),
        short: this._computeCategoryStats(short, period.months),
        all: this._computeCategoryStats(all, period.months)
      }
    };
  }
  
  _computePeriod(trades) {
    const dates = trades.map(t => t.dateEN).sort((a, b) => a - b);
    const [start, end] = [dates[0], dates.at(-1)];
    
    const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1);
    return { start: MT.dateDMY(start), end: MT.dateDMY(end), months };
  }
  
  _computeCategoryStats(trades, months) {
    const equityCurve = ME.buildEquityCurve(trades);
    const dd = ME.calculateMaxDrawdown(equityCurve.map(p => p.equity));
    const recovery = ME.calculateRecovery(equityCurve);
    const basic = MB.calculateBasicStats(trades);
    const streaks = MB.calculateStreaks(trades);
    const monthly = MM.calculateMonthlyStats(this.monthlyNet);
    const rr = MB.calculateRiskReward(trades);
    const netPips = trades.reduce((s, t) => s + t.pipsSigned, 0);
    const wins = trades.filter(t => t.isWin);
    const losses = trades.filter(t => !t.isWin);
    const grossProfitPips = wins.reduce((s, t) => s + t.pips, 0);
    const grossLossPips = losses.reduce((s, t) => s + t.pips, 0);
    const avgProfitPips = grossProfitPips / wins.length;
    const avgLossPips = Math.abs(grossLossPips) / losses.length;
    const holdBars = trades.map(t => t.barsHeld);
    const avgHoldBars = holdBars.reduce((a, b) => a + b, 0) / holdBars.length;
    const maxDD = dd.absolute;
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
      avgRecoveryBars: Math.round(recovery?.avg ?? 0),
      avgRecoveryTime: MT.barsToTime(Math.round(recovery?.avg ?? 0)),
      avgTradeHoldBars: Math.round(avgHoldBars ?? 0),
      avgTradeHoldTime: MT.barsToTime(Math.round(avgHoldBars ?? 0)),
      maxTradeHoldBars: Math.max(...(holdBars.length ? holdBars : [0])),
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