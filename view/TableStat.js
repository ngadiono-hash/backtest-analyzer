// /view/TableStat.js
import { num } from '../helpers/metrics_utils.js';
import { renderChart } from '../helpers/chart_renderer.js';

export class TableStat {
  constructor() {
    this.statsContainer = document.getElementById('stats-table-container');
    this.monthlyContainer = document.getElementById('monthly-table-container'); // Container baru
    this._setupEventListener();
    this._renderSkeleton();
    this._renderMonthlySkeleton(); // Skeleton untuk tabel bulanan
  }
  
  _setupEventListener() {
    window.addEventListener('tradestat-updated', (e) => {
      const { stats } = e.detail;
      this.render(stats);
      const equityCurve = stats.total.all.equityCurve;
      if (equityCurve && equityCurve.length) renderChart(equityCurve);
      this._renderMonthlyTable(stats.monthly);
    });
  }
  
  _renderSkeleton() {
    this.statsContainer.innerHTML = `
      <table id="stats-table">
        <tbody id="stats-table-tbody">
          <tr><td colspan="4" class="period">Loading statistics...</td></tr>
        </tbody>
      </table>
    `;
  }
  
  _renderMonthlySkeleton() {
    this.monthlyContainer.innerHTML = `
      <div style="overflow-x: auto;">
        <table id="monthly-table" style="width: 100%; min-width: 800px; border-collapse: collapse; font-family: monospace;">
          <tbody>
            <tr><td style="text-align:center; padding:20px; color:#999;">Loading monthly data...</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }
  
  render(stats) {
    const { period, total } = stats;
    const { long: L, short: S, all: A } = total;
    
    const R = {
      header() {
        return `
        <tr>
          <th class="label">Metric</th><th>All</th><th>Long</th><th>Short</th>
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
          <td class="label">${label}</td><td>${a}</td><td>${l}</td><td>${s}</td>
        </tr>`;
      }
    };
    
    const f = {
      sign(val, suffix = "") {
        if (val === 0) return `0${suffix}`;
        const sign = val > 0 ? "+" : "-";
        const abs = num(Math.abs(val));
        return `<span class="${val > 0 ? "positive" : "negative"}">
          ${sign}${abs}${suffix}</span>`;
      },
      pips(val) { return this.sign(val, " pips"); },
      dollar(val) { return this.sign(val, " USD"); },
      percent(val) { return this.sign(val, "%"); },
      raw(val, suffix = '') {
        return (suffix == '') ? num(val) : num(val) + ' ' + suffix;
      }
    };
    
    const html = [];
    html.push(R.period(`${period.start} → ${period.end} (${period.months} months)`));
    html.push(R.header());
    
    const rows = [];
    const add = (label, a, l, s) => rows.push({ label, a, l, s });
    
    // TRADES
    add("Total Trades", A.trades, L.trades, S.trades);
    add("Win Trades", A.wintrades, L.wintrades, S.wintrades);
    add("Loss Trades", A.losstrades, L.losstrades, S.losstrades);
    add("Winrate", f.percent(A.winrate), f.percent(L.winrate), f.percent(S.winrate));
    // NET
    add("Net Profit", f.pips(A.netPips), f.pips(L.netPips), f.pips(S.netPips));
    // GROSS
    add("Gross Profit", f.raw(A.grossProfitPips, 'pips'), f.raw(L.grossProfitPips, 'pips'), f.raw(S.grossProfitPips, 'pips'));
    add("Gross Loss", f.raw(A.grossLossPips, 'pips'), f.raw(L.grossLossPips, 'pips'), f.raw(S.grossLossPips, 'pips'));
    // PROFIT FACTOR
    add("Profit Factor", f.raw(A.profitFactor), f.raw(L.profitFactor), f.raw(S.profitFactor));
    // AVERAGES
    add("Avg Profit", f.raw(A.avgProfitPips, 'pips'), f.raw(L.avgProfitPips, 'pips'), f.raw(S.avgProfitPips, 'pips'));
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
    add("Max Drawdown", f.raw(A.maxDrawdownPips, "pips"), "—", "—");
    add("Max Drawdown", `${A.maxDrawdownPercent}%`, "—", "—");
    // PER MONTH / TRADE
    add("Avg Trade / month", num(A.avgTradePerMonth, 1), "—", "—");
    add("Avg Net / month", f.pips(A.profitPerMonthPips), "—", "—");
    add("Profit per trade", f.pips(A.profitPerTradePips), f.pips(L.profitPerTradePips), f.pips(S.profitPerTradePips));
    // RECOVERY
    add("RecoveryFactor", num(A.recoveryFactor), "", "");
    add("MaxRecoveryTime", A.maxRecoveryTime, "", "");
    add("AvgRecoveryTime", A.avgRecoveryTime, "", "");
    // HOLD TIME
    add("AvgTradeHold", A.avgTradeHoldTime, L.avgTradeHoldTime, S.avgTradeHoldTime);
    add("MaxTradeHold", A.maxTradeHoldTime, L.maxTradeHoldTime, S.maxTradeHoldTime);
    
    let i = 0;
    while (i < rows.length) {
      const start = i;
      const label = rows[i].label;
      let count = 1;
      while (i + count < rows.length && rows[i + count].label === label) {
        count++;
      }
      
      const first = rows[start];
      html.push(`
      <tr>
        <td rowspan="${count}" class="metric-label">${label}</td>
        <td>${first.a}</td>
        <td>${first.l}</td>
        <td>${first.s}</td>
      </tr>
    `);
      
      for (let k = 1; k < count; k++) {
        const r = rows[start + k];
        html.push(`
        <tr>
          <td>${r.a}</td><td>${r.l}</td><td>${r.s}</td>
        </tr>
      `);
      }
      
      i += count;
    }
    
    document.getElementById('stats-table-tbody').innerHTML = html.join('');
  }
  
  // === TABEL BULANAN ===
  _renderMonthlyTable(monthlyData) {
    const table = document.getElementById('monthly-table');
    if (!table) return;
    
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let html = '';
    let grandTotalPips = 0; // Hitung total semua pips
    
    if (!monthlyData || Object.keys(monthlyData).length === 0) {
      html = `<tr><td colspan="14" class="no-data">Tidak ada data trade</td></tr>`;
    } else {
      // Header
      html += `<thead><tr class="header-row">
      <th class="sticky-year header-cell">Tahun</th>`;
      MONTHS.forEach(m => html += `<th class="header-cell">${m}</th>`);
      html += `<th class="header-cell ytd-header">Total</th></tr></thead><tbody>`;
      
      // Body – urut tahun ascending
      const years = Object.keys(monthlyData).sort((a, b) => a - b);
      years.forEach(year => {
        const data = monthlyData[year];
        html += `<tr>
        <td class="sticky-year year-cell">${year}</td>`;
        
        MONTHS.forEach(month => {
          const val = data[month];
          if (val !== null && val !== undefined) {
            const numVal = parseFloat(val);
            grandTotalPips += numVal; // akumulasi grand total
            
            const formatted = numVal % 1 === 0 ? numVal : numVal.toFixed(1);
            const cls = numVal > 0 ? 'pips-positive' : numVal < 0 ? 'pips-negative' : 'pips-zero';
            html += `<td class="${cls}">${formatted}</td>`;
          } else {
            html += `<td class="pips-null">—</td>`;
          }
        });
        
        const ytd = data.YTD || 0;
        const ytdFormatted = ytd % 1 === 0 ? ytd : ytd.toFixed(1);
        const ytdCls = ytd > 0 ? 'pips-positive' : ytd < 0 ? 'pips-negative' : 'pips-zero';
        html += `<td class="${ytdCls} ytd-cell">${ytdFormatted}</td></tr>`;
      });
      
      // Baris grand total (hanya satu cell di kolom terakhir)
      const grandFormatted = grandTotalPips % 1 === 0 ? grandTotalPips : grandTotalPips.toFixed(1);
      const grandCls = grandTotalPips > 0 ? 'pips-positive' : grandTotalPips < 0 ? 'pips-negative' : 'pips-zero';
      html += `<tr class="grand-total-row">
      <td colspan="${MONTHS.length + 1}" class="grand-total-label">Grand Total</td>
      <td class="${grandCls} ytd-cell grand-total-cell">${grandFormatted}</td>
    </tr>`;
      
      html += `</tbody>`;
    }
    
    table.innerHTML = html;
  }
}

new TableStat();