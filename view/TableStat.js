// /view/TableStat.js
import { num } from '../helpers/metrics_utils.js';
import { renderChart } from '../helpers/chart_renderer.js'

export class TableStat {
  constructor() {
    this.container = document.getElementById('stats-table-container');
    this._setupEventListener();
    this._renderSkeleton();
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
      <table id="stats-table">
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

    const R = this.Row;
    const f = this.fmt;

    // --- Buffer HTML langsung ---
    const html = [];

    // ============================
    // PERIOD
    // ============================
    html.push(R.period(`${period.start} → ${period.end} (${period.months} months)`));
    html.push(R.header());

    // ============================
    // STEP 1 — Kumpulkan semua metric rows (tanpa HTML)
    // ============================
    const rows = [];
    const add = (label, a, l, s) => rows.push({ label, a, l, s });

    // TRADES
    add("Total Trades", A.trades, L.trades, S.trades);
    add("Win Trades", A.wintrades, L.wintrades, S.wintrades);
    add("Loss Trades", A.losstrades, L.losstrades, S.losstrades);
    add("Winrate", f.percent(A.winrate), f.percent(L.winrate), f.percent(S.winrate));

    // NET
    add("Net Profit", f.dollar(A.netDollar), f.dollar(L.netDollar), f.dollar(S.netDollar));
    add("Net Profit", f.percent((A.netDollar / 10000) * 100), f.percent((L.netDollar / 10000) * 100), f.percent((S.netDollar / 10000) * 100));
    add("Net Profit", f.pips(A.netPips), f.pips(L.netPips), f.pips(S.netPips));

    // GROSS
    add("Gross Profit", f.raw(A.grossProfitDollar, 'USD'), f.raw(L.grossProfitDollar, 'USD'), f.raw(S.grossProfitDollar, 'USD'));
    add("Gross Profit", f.raw(A.grossProfitPips, 'pips'), f.raw(L.grossProfitPips, 'pips'), f.raw(S.grossProfitPips, 'pips'));
    add("Gross Loss", f.raw(A.grossLossDollar, 'USD'), f.raw(L.grossLossDollar, 'USD'), f.raw(S.grossLossDollar, 'USD'));
    add("Gross Loss", f.raw(A.grossLossPips, 'pips'), f.raw(L.grossLossPips, 'pips'), f.raw(S.grossLossPips, 'pips'));

    // PROFIT FACTOR
    add("Profit Factor", f.raw(A.profitFactor), f.raw(L.profitFactor), f.raw(S.profitFactor));

    // AVERAGES
    add("Avg Profit", f.raw(A.avgProfitDollar, 'USD'), f.raw(L.avgProfitDollar, 'USD'), f.raw(S.avgProfitDollar, 'USD'));
    add("Avg Profit", f.raw(A.avgProfitPips, 'pips'), f.raw(L.avgProfitPips, 'pips'), f.raw(S.avgProfitPips, 'pips'));
    add("Avg Loss", f.raw(A.avgLossDollar, 'USD'), f.raw(L.avgLossDollar, 'USD'), f.raw(S.avgLossDollar, 'USD'));
    add("Avg Loss", f.raw(A.avgLossPips, 'pips'), f.raw(L.avgLossPips, 'pips'), f.raw(S.avgLossPips, 'pips'));

    // STREAKS
    add("Consecutive Profit", A.maxWinStreak, "—", "—");
    add("Consecutive Loss", A.maxLossStreak, "—", "—");

    // MONTHLY
    add("Monthly Net Min", f.pips(A.monthly.minNetPips), "—", "—");
    add("Monthly Net Max", f.pips(A.monthly.maxNetPips), "—", "—");
    add("Avg RiskReward", A.riskReward, "—", "—");
    add("Stability", f.percent(A.monthly.stability), "—", "—");

    // DRAWDOWN
    add("Max Drawdown", f.raw(A.maxDrawdownDollar, "USD"), "—", "—");
    add("Max Drawdown", f.raw(A.maxDrawdownPips, "pips"), "—", "—");
    add("Max Drawdown", `${A.maxDrawdownPercent}%`, "—", "—");

    // PER MONTH / TRADE
    add("Avg Trade / month", num(A.avgTradePerMonth, 1), "—", "—");
    add("Avg Net / month", f.pips(A.profitPerMonthPips), "—", "—");
    add("Avg Net / month", f.dollar(A.profitPerMonthDollar), "—", "—");
    add("Profit per trade", f.dollar(A.profitPerTradeDollar), f.dollar(L.profitPerTradeDollar), f.dollar(S.profitPerTradeDollar));
    add("Profit per trade", f.pips(A.profitPerTradePips), f.pips(L.profitPerTradePips), f.pips(S.profitPerTradePips));

    // RECOVERY
    add("RecoveryFactor", num(A.recoveryFactor), "", "");
    add("MaxRecoveryTime", A.maxRecoveryTime, "", "");
    add("AvgRecoveryTime", A.avgRecoveryTime, "", "");

    // HOLD TIME
    add("AvgTradeHold", A.avgTradeHoldTime, L.avgTradeHoldTime, S.avgTradeHoldTime);
    add("MaxTradeHold", A.maxTradeHoldTime, L.maxTradeHoldTime, S.maxTradeHoldTime);

    // =====================================================
    // STEP 2 — AUTO ROWSPAN GENERATOR
    // =====================================================
    let i = 0;
    while (i < rows.length) {
      const start = i;
      const label = rows[i].label;

      // hitung berapa baris berurutan dgn label sama
      let count = 1;
      while (i + count < rows.length && rows[i + count].label === label) {
        count++;
      }

      // row pertama dengan rowspan
      const first = rows[start];
      html.push(`
      <tr>
        <td rowspan="${count}" class="metric-label">${label}</td>
        <td>${first.a}</td>
        <td>${first.l}</td>
        <td>${first.s}</td>
      </tr>
    `);

      // baris berikutnya tanpa label
      for (let k = 1; k < count; k++) {
        const r = rows[start + k];
        html.push(`
        <tr>
          <td>${r.a}</td>
          <td>${r.l}</td>
          <td>${r.s}</td>
        </tr>
      `);
      }

      i += count; // loncat ke data label berikutnya
    }

    // ============================
    // FINAL RENDER
    // ============================
    document.getElementById('tableBody').innerHTML = html.join('');
  }
}

new TableStat();