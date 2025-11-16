// /view/TableStat.js
import { num } from '../helpers/metrics_utils.js';
import { renderChart } from '../helpers/chart_renderer.js'

export class TableStat {
  constructor() {
    this.container = document.getElementById('statsTableContainer') ||
      this._createContainer();

    this._setupEventListener();
    this._renderSkeleton();
  }

  _createContainer() {
    const div = document.createElement('div');
    div.id = 'statsTableContainer';
    document.body.appendChild(div);
    return div;
  }
  _setupEventListener() {
    window.addEventListener('tradestat-updated', (e) => {
      const { stats, balance, lotSize } = e.detail;
      this.render(stats);
      const equityCurve = stats.total.all.equityCurve;
      if (equityCurve && equityCurve.length) renderChart(equityCurve);
      
    });
  }

  _renderSkeleton() {
    this.container.innerHTML = `
      <table class="stats-table" id="statsTable">
        <tbody id="tableBody">
          <tr><td colspan="4" class="period">Loading statistics...</td></tr>
        </tbody>
      </table>
    `;
  }

  // ============================================================
  // FORMATTER
  // ============================================================
  fmt = {
    num: num,

    sign(val, suffix = "") {
      if (val === 0) return `0${suffix}`;

      const sign = val > 0 ? "+" : "-";
      const abs = num(Math.abs(val));

      return `<span class="${val > 0 ? "positive" : "negative"}">
        ${sign}${abs}${suffix}
      </span>`;
    },

    pips(val) {
      return this.sign(val, " pips");
    },

    dollar(val) {
      return this.sign(val, " USD");
    },

    percent(val) {
      return this.sign(val, "%");
    },

    raw(val, suffix = '') {
      return (suffix == '') ? num(val) : num(val) + ' ' + suffix;
    }
  };

  // Row builders
  Row = {
    header() {
      return `
        <tr class="header-row">
          <th class="label">Metric</th>
          <th>All</th>
          <th>Long</th>
          <th>Short</th>
        </tr>`;
    },

    period(text) {
      return `
        <tr>
          <td colspan="4" class="period">${text}</td>
        </tr>`;
    },

    metric(label, a, l, s) {
      return `
        <tr>
          <td class="label">${label}</td>
          <td>${a}</td>
          <td>${l}</td>
          <td>${s}</td>
        </tr>`;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  render(stats) {
    const { period, total } = stats;
    const { long: L, short: S, all: A } = total;

    const r = []; // rows accumulator
    const R = this.Row;
    const f = this.fmt;

    // ------------------------------------------------------------
    // PERIOD
    // ------------------------------------------------------------
    r.push(R.period(`${period.start} → ${period.end} (${period.months} bulan)`));
    r.push(R.header());

    // Helper builder
    const M = (label, a, l, s) => r.push(R.metric(label, a, l, s));

    // ------------------------------------------------------------
    // TRADES
    // ------------------------------------------------------------
    M("Total Trades", A.trades, L.trades, S.trades);
    M("Win Trades", A.wintrades, L.wintrades, S.wintrades);
    M("Loss Trades", A.losstrades, L.losstrades, S.losstrades);
    M("Winrate", f.percent(A.winrate), f.percent(L.winrate), f.percent(S.winrate));
    // ------------------------------------------------------------
    // NET
    // ------------------------------------------------------------
    M("Net Profit", f.dollar(A.netDollar), f.dollar(L.netDollar), f.dollar(S.netDollar));
    M("Net Profit", f.percent((A.netDollar / 10000) * 100), f.percent((L.netDollar / 10000) * 100), f.percent((S.netDollar / 10000) * 100));
    M("Net Profit", f.pips(A.netPips), f.pips(L.netPips), f.pips(S.netPips));
    // ------------------------------------------------------------
    // GROSS
    // ------------------------------------------------------------
    M("Gross Profit", f.raw(A.grossProfitDollar, 'USD'), f.raw(L.grossProfitDollar, 'USD'), f.raw(S.grossProfitDollar, 'USD'));
    M("Gross Profit", f.raw(A.grossProfitPips, 'pips'), f.raw(L.grossProfitPips, 'pips'), f.raw(S.grossProfitPips, 'pips'));
    M("Gross Loss", f.raw(A.grossLossDollar, 'USD'), f.raw(L.grossLossDollar, 'USD'), f.raw(S.grossLossDollar, 'USD'));
    M("Gross Loss", f.raw(A.grossLossPips, 'pips'), f.raw(L.grossLossPips, 'pips'), f.raw(S.grossLossPips, 'pips'));

    // ------------------------------------------------------------
    // PROFIT FACTOR
    // ------------------------------------------------------------
    M("Profit Factor", f.raw(A.profitFactor), f.raw(L.profitFactor), f.raw(S.profitFactor));
    // ------------------------------------------------------------
    // AVERAGES
    // ------------------------------------------------------------
    M("Avg Profit", f.raw(A.avgProfitDollar, 'USD'), f.raw(L.avgProfitDollar, 'USD'), f.raw(S.avgProfitDollar, 'USD'));
    M("Avg Profit", f.raw(A.avgProfitPips, "pips"), f.raw(L.avgProfitPips, "pips"), f.raw(S.avgProfitPips, "pips"));
    M("Avg Loss", f.raw(A.avgLossDollar, "USD"), f.raw(L.avgLossDollar, "USD"), f.raw(S.avgLossDollar, "USD"));
    M("Avg Loss", f.raw(A.avgLossPips, "pips"), f.raw(L.avgLossPips, "pips"), f.raw(S.avgLossPips, "pips"));

    // ------------------------------------------------------------
    // STREAKS
    // ------------------------------------------------------------
    M("Consecutive Profit", A.maxWinStreak, "—", "—");
    M("Consecutive Loss", A.maxLossStreak, "—", "—");

    // ------------------------------------------------------------
    // MONTHLY
    // ------------------------------------------------------------
    M("Monthly Net Min", f.pips(A.monthly.minNetPips), "—", "—");
    M("Monthly Net Max", f.pips(A.monthly.maxNetPips), "—", "—");
    M("Average RiskReward", A.riskReward, "—", "—");
    M("Stability", f.percent(A.monthly.stability), "—", "—");

    // ------------------------------------------------------------
    // DRAWDOWN
    // ------------------------------------------------------------
    M("Max Drawdown", f.raw(A.maxDrawdownDollar, "USD"), "—", "—");
    M("Max Drawdown", f.raw(A.maxDrawdownPips, "pips"), "—", "—");
    M("Max Drawdown", `${A.maxDrawdownPercent}%`, "—", "—");

    //M("AverageDrawdown", "—", "—", "—");

    // ------------------------------------------------------------
    // PER MONTH / TRADE
    // ------------------------------------------------------------
    M("Avg Trade / month", num(A.avgTradePerMonth, 1), "—", "—");
    M("Avg Net / month", f.pips(A.profitPerMonthPips), "—", "—");
    M("Avg Net / month", f.dollar(A.profitPerMonthDollar), "—", "—");
    M("Profit per trade", f.dollar(A.profitPerTradeDollar), f.dollar(L.profitPerTradeDollar), f.dollar(S.profitPerTradeDollar));
    M("Profit per trade", f.pips(A.profitPerTradePips), f.pips(L.profitPerTradePips), f.pips(S.profitPerTradePips));

    // ------------------------------------------------------------
    // RECOVERY
    // ------------------------------------------------------------
    M("RecoveryFactor", num(A.recoveryFactor), "", "");
    M("MaxRecoveryTime", A.maxRecoveryTime, "", "");
    M("AvgRecoveryTime", A.avgRecoveryTime, "", "");

    // ------------------------------------------------------------
    // HOLD TIME
    // ------------------------------------------------------------
    M("AvgTradeHold", A.avgTradeHoldTime, L.avgTradeHoldTime, S.avgTradeHoldTime);
    M("MaxTradeHold", A.maxTradeHoldTime, L.maxTradeHoldTime, S.maxTradeHoldTime);

    // === FINAL RENDER ===
    document.getElementById('tableBody').innerHTML = r.join('');
  }
}

new TableStat();