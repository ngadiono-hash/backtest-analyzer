// /model/TradeStat.js

// --- General Stats (Basic) ---
import { calculateRiskReward, calculateBasicStats, calculateStreaks } from '../helpers/metrics_basic.js';
// --- Pips & Pip Value ---
import { computePips, getPipValue } from '../helpers/metrics_pips.js';
// --- Time / Bars ---
import { parseDate, estimateBarsHeld, barsToTime } from '../helpers/metrics_time.js';
// --- Equity & Curve Analytics ---
import { buildEquityCurve, calculateMaxDrawdown, calculateRecovery } from '../helpers/metrics_equity.js';
// --- Stats Monthly ---
import { groupByMonth, calculateMonthlyStats } from '../helpers/metrics_monthly.js';
// --- Utilities ---
import { num } from '../helpers/metrics_utils.js';

export class TradeStat {
  constructor() {
    this.lotSize = 0.1;
    this.balance = 10000;
    this.trades = [];
    this.normalized = [];
    this.stats = {};
    this._setupEventListeners();
  }

  /* ============================
   * EVENT HANDLERS
   * ============================ */
  _setupEventListeners() {
    window.addEventListener('tradedata-updated', (e) => {
      this.trades = e.detail.trades;
      this._loadConfig();
      this._runAnalysis();
    });

    window.addEventListener('config-updated', () => {
      this._loadConfig();
      if (this.trades.length) this._runAnalysis();
    });
  }

  _loadConfig() {
    const lot = parseFloat(document.getElementById('lot-input')?.value);
    const bal = parseFloat(document.getElementById('balance-input')?.value);

    this.lotSize = isNaN(lot) ? 0.1 : lot;
    this.balance = isNaN(bal) ? 10000 : bal;
  }

  /* ============================
   * MAIN ANALYSIS PROCESS
   * ============================ */
  _runAnalysis() {
    if (!this.trades.length) {
      this.stats = this._getEmptyStats();
      return this._dispatchUpdate();
    }

    const sorted = this._sortTrades(this.trades);
    this.normalized = sorted.map(t => this._normalizeTrade(t)).filter(Boolean);

    if (!this.normalized.length) {
      this.stats = this._getEmptyStats();
      return this._dispatchUpdate();
    }

    this.stats = this._calculateAllStats();
    this._dispatchUpdate();
  }

  /* ============================
   * HELPERS
   * ============================ */
  _sortTrades(trades) {
    return [...trades].sort((a, b) =>
      parseDate(a.dateEX) - parseDate(b.dateEX)
    );
  }

  _normalizeTrade(raw) {
    const pips = computePips(raw, raw.pair);
    const pipValue = getPipValue(raw.pair, this.lotSize);

    return {
      ...raw,
      pair: raw.pair,
      dateEN: parseDate(raw.dateEN),
      dateEX: parseDate(raw.dateEX),
      pips: Math.abs(pips),
      pipsSigned: pips,
      profitDollar: Math.abs(pips * pipValue),
      profitDollarSigned: pips * pipValue,
      isWin: raw.result === 'TP',
      barsHeld: estimateBarsHeld(raw.dateEN, raw.dateEX)
    };
  }

  /* ============================
   * CALCULATE ALL STATS
   * ============================ */
  _calculateAllStats() {
    const all = this.normalized;
    const long = all.filter(t => t.type === 'Buy');
    const short = all.filter(t => t.type === 'Sell');

    const period = this._computePeriod(all);

    return {
      period,
      total: {
        long: this._computeCategoryStats(long, period.months),
        short: this._computeCategoryStats(short, period.months),
        all: this._computeCategoryStats(all, period.months)
      }
      
    };
  }

  /* ----------------------
   * PERIOD CALCULATION
   * ---------------------- */
  _computePeriod(trades) {
    const start = trades.reduce((a, b) => (a.dateEN < b.dateEN ? a : b)).dateEN;
    const end = trades.reduce((a, b) => (a.dateEN > b.dateEN ? a : b)).dateEN;

    const months =
      Math.max(
        1,
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1
      );

    return {
      start: this._formatDate(start),
      end: this._formatDate(end),
      months
    };
  }

  /* ----------------------
   * CATEGORY STATS
   * ---------------------- */
  _computeCategoryStats(trades, months) {
    if (!trades.length) return this._emptyCategoryStats();

    const pair = trades[0].pair;
    const pipValue = getPipValue(pair, this.lotSize);

    const equityCurve = buildEquityCurve(trades);
    const dd = calculateMaxDrawdown(equityCurve.map(p => p.equity));
    const recovery = calculateRecovery(equityCurve);

    const basic = calculateBasicStats(trades);
    const streaks = calculateStreaks(trades);
    const monthly = calculateMonthlyStats(groupByMonth(trades));
    const rr = calculateRiskReward(trades);

    const netPips = trades.reduce((s, t) => s + t.pipsSigned, 0);
    const netDollar = netPips * pipValue;

    const wins = trades.filter(t => t.isWin);
    const losses = trades.filter(t => !t.isWin);

    const grossProfitPips = wins.reduce((s, t) => s + t.pips, 0);
    const grossLossPips = losses.reduce((s, t) => s + t.pips, 0);
    const grossProfitDollar = grossProfitPips * pipValue;
    const grossLossDollar = Math.abs(grossLossPips * pipValue);

    const avgProfitPips = wins.length ? grossProfitPips / wins.length : 0;
    const avgLossPips = losses.length ? Math.abs(grossLossPips) / losses.length : 0;
    const avgProfitDollar = avgProfitPips * pipValue;
    const avgLossDollar = avgLossPips * pipValue;

    const holdBars = trades.map(t => t.barsHeld);
    const avgHoldBars = holdBars.reduce((a, b) => a + b, 0) / holdBars.length;

    const maxDD = dd.absolute;
    const recoveryFactor = maxDD === 0 ? Infinity : netPips / maxDD;

    return {
      // === BASIC ===
      equityCurve,
      trades: trades.length,
      wintrades: wins.length,
      losstrades: losses.length,
      winrate: basic.winrate, // number: 66.06
      profitFactor: basic.profitFactor, // number atau Infinity

      // === NET ===
      netPips: netPips, // number
      netDollar: netDollar, // number

      // === GROSS ===
      grossProfitPips: grossProfitPips, // number
      grossProfitDollar: grossProfitDollar, // number
      grossLossPips: grossLossPips, // number (negatif)
      grossLossDollar: grossLossDollar, // number (positif)

      // === AVERAGE ===
      avgProfitPips: avgProfitPips, // number
      avgProfitDollar: avgProfitDollar, // number
      avgLossPips: avgLossPips, // number
      avgLossDollar: avgLossDollar, // number

      // === STREAKS ===
      maxWinStreak: streaks.maxWinStreak, // number
      maxLossStreak: streaks.maxLossStreak, // number

      // === MONTHLY ===
      monthly: {
        minNetPips: monthly.minPips,
        maxNetPips: monthly.maxPips,
        avgNetPips: monthly.avgPips,
        minNetDollar: monthly.minDollar,
        maxNetDollar: monthly.maxDollar,
        avgNetDollar: monthly.avgDollar,
        stability: monthly.stability // number: 85.5
      },

      // === RISK & REWARD ===
      riskReward: rr, // string: "1:2.5"

      // === DRAWDOWN ===
      maxDrawdownPips: dd.absolute, // number
      maxDrawdownDollar: dd.absolute * pipValue, // number
      maxDrawdownPercent: dd.percent, // number: 22.67

      // === RECOVERY ===
      recoveryFactor: recoveryFactor, // number atau Infinity
      maxRecoveryBars: recovery.max, // number
      maxRecoveryTime: barsToTime(recovery.max), // string
      avgRecoveryBars: Math.round(recovery.avg), // number
      avgRecoveryTime: barsToTime(Math.round(recovery.avg)), // string

      // === HOLD TIME ===
      avgTradeHoldBars: Math.round(avgHoldBars), // number
      avgTradeHoldTime: barsToTime(Math.round(avgHoldBars)), // string
      maxTradeHoldBars: Math.max(...holdBars), // number
      maxTradeHoldTime: barsToTime(Math.max(...holdBars)), // string

      // === PER TRADE / MONTH ===
      avgTradePerMonth: trades.length / months, // number
      profitPerMonthPips: netPips / months, // number
      profitPerMonthDollar: netDollar / months, // number
      profitPerTradePips: netPips / trades.length, // number
      profitPerTradeDollar: netDollar / trades.length // number
    };
  }

  /* ============================
   * FORMATTERS & DISPATCH
   * ============================ */
  _formatDate(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(2);
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    return `${d}-${m}-${y}`;
  }

  _dispatchUpdate() {
    window.dispatchEvent(
      new CustomEvent('tradestat-updated', {
        detail: { stats: this.stats, lotSize: this.lotSize, balance: this.balance }
      })
    );
  }

  /* ============================
   * EMPTY TEMPLATE
   * ============================ */
  _emptyCategoryStats() {
    return {
      trades: 0,
      winrate: '0.00',
      profitFactor: '0.00',
      netPips: '0.00',
      netDollar: '0.00',

      grossProfitPips: '0.00',
      grossLossPips: '0.00',
      grossProfitDollar: '0.00',
      grossLossDollar: '0.00',

      avgProfitPips: '0.00',
      avgLossPips: '0.00',

      maxWinStreak: 0,
      maxLossStreak: 0,

      monthly: {
        minNetPips: '0.00',
        maxNetPips: '0.00',
        avgNetPips: '0.00',
        minNetDollar: '0.00',
        maxNetDollar: '0.00',
        avgNetDollar: '0.00',
        stability: '0.00'
      },

      riskReward: '1:0',

      maxDrawdownPips: '0.00',
      maxDrawdownPercent: 0,
      maxDrawdownDollar: '0.00',

      recoveryFactor: '0.00',
      maxRecoveryBars: 0,
      maxRecoveryTime: '0 hours',
      avgRecoveryBars: 0,
      avgRecoveryTime: '0 hours',

      avgTradeHoldBars: 0,
      avgTradeHoldTime: '0 hours',
      maxTradeHoldBars: 0,
      maxTradeHoldTime: '0 hours',

      avgTradePerMonth: '0.00',
      profitPerMonthPips: '0.00',
      profitPerMonthDollar: '0.00',
      profitPerTradePips: '0.00',
      profitPerTradeDollar: '0.00'
    };
  }

  _getEmptyStats() {
    return {
      period: { start: '-', end: '-', months: 0 },
      total: {
        long: this._emptyCategoryStats(),
        short: this._emptyCategoryStats(),
        all: this._emptyCategoryStats()
      }
    };
  }
}