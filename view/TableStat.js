// /view/TableStat.js
import { $, $$, _on, _ready } from "../helpers/shortcut.js";

import { num } from '../helpers/metrics_utils.js';
import { renderChart } from '../helpers/chart_renderer.js';

export class TableStat {
  constructor() {
    this.statsContainer = $('#stats-table-container');
    this.monthlyContainer = $('#monthly-table-container');
    this._setupEventListener();
    this._renderStatsSkeleton();
    this._renderMonthlySkeleton(); 
  }
  
  _setupEventListener() {
    window.addEventListener('tradestat-updated', (e) => {
      const { stats } = e.detail;
      this.renderStatsTable(stats);
      const equityCurve = stats.total.all.equityCurve;
      if (equityCurve && equityCurve.length) renderChart(equityCurve);
      this._renderMonthlyTable(stats.monthly);
    });
  }
//========== TABLE STATS  
  _renderStatsSkeleton() {
    this.statsContainer.innerHTML = `
      <table id="stats-table">
        <tbody id="stats-table-body">
          <tr><td colspan="4" class="period">Loading statistics...</td></tr>
        </tbody>
      </table>
    `;
  }
  
  fmt = {
    sign(val, suffix = "") {
      if (val === 0) return `0${suffix}`;
      const sign = val > 0 ? "+" : "-";
      const abs = num(Math.abs(val));
      return `<span class="${val > 0 ? "positive" : "negative"}">${sign}${abs}${suffix}</span>`;
    },
    
    pips(val) {
      return this.sign(val, " pips");
    },
    
    percent(val) {
      return this.sign(val, "%");
    },
    
    raw(val, suffix = '') {
      return (suffix == '') ? num(val) : num(val) + ' ' + suffix;
    }
  };
  
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
  
  renderStatsTable(stats) {
    const { period, total } = stats;
    const { long: L, short: S, all: A } = total;
    
    const r = [];
    const R = this.Row;
    const f = this.fmt;
    r.push(R.period(`${period.start} → ${period.end} (${period.months} months)`));
    r.push(R.header());
    const M = (label, a, l, s) => r.push(R.metric(label, a, l, s));
    M("Total Trades", A.trades, L.trades, S.trades);
    M("Win Trades", A.wintrades, L.wintrades, S.wintrades);
    M("Loss Trades", A.losstrades, L.losstrades, S.losstrades);
    M("Winrate", f.percent(A.winrate), f.percent(L.winrate), f.percent(S.winrate));
    M("Net Profit", f.pips(A.netPips), f.pips(L.netPips), f.pips(S.netPips));
    M("Gross Profit", f.raw(A.grossProfitPips, 'pips'), f.raw(L.grossProfitPips, 'pips'), f.raw(S.grossProfitPips, 'pips'));
    M("Gross Loss", f.raw(A.grossLossPips, 'pips'), f.raw(L.grossLossPips, 'pips'), f.raw(S.grossLossPips, 'pips'));
    M("Profit Factor", f.raw(A.profitFactor), f.raw(L.profitFactor), f.raw(S.profitFactor));
    M("Consecutive Profit", A.maxWinStreak, "—", "—");
    M("Consecutive Loss", A.maxLossStreak, "—", "—");
    M("Min Monthly Net", f.pips(A.monthly.minNetPips), "—", "—");
    M("Max Monthly Net", f.pips(A.monthly.maxNetPips), "—", "—");
    M("Stability", f.percent(A.monthly.stability), "—", "—");

    M("Avg Profit", f.raw(A.avgProfitPips, "pips"), f.raw(L.avgProfitPips, "pips"), f.raw(S.avgProfitPips, "pips"));
    M("Avg Loss", f.raw(A.avgLossPips, "pips"), f.raw(L.avgLossPips, "pips"), f.raw(S.avgLossPips, "pips"));
    M("Avg RiskReward", A.riskReward, "—", "—");
    M("Avg Trade / Month", num(A.avgTradePerMonth, 1), "—", "—");
    M("Avg Net / Month", f.pips(A.profitPerMonthPips), "—", "—");
    M("Avg Profit / Trade", f.pips(A.profitPerTradePips), f.pips(L.profitPerTradePips), f.pips(S.profitPerTradePips));
    
    M("Max Drawdown", f.raw(A.maxDrawdownPips, "pips"), "—", "—");
    M("Max Drawdown", `${A.maxDrawdownPercent}%`, "—", "—");
    M("RecoveryFactor", num(A.recoveryFactor), "", "");
    //M("AverageDrawdown", "—", "—", "—");
    M("Max Recovery Time", A.maxRecoveryTime, "", "");
    M("Avg Recovery Time", A.avgRecoveryTime, "", "");
    M("Avg Trade Hold", A.avgTradeHoldTime, L.avgTradeHoldTime, S.avgTradeHoldTime);
    M("Max Trade Hold", A.maxTradeHoldTime, L.maxTradeHoldTime, S.maxTradeHoldTime);
    
    // === FINAL RENDER ===
    $('#stats-table-body').innerHTML = r.join('');
  }

//========== TABLE MONTHLY
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
  
  _renderMonthlyTable(monthlyData) {
    const table = document.getElementById('monthly-table');
    if (!table) return;
    
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let html = '';
    let grandTotalPips = 0;
    
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