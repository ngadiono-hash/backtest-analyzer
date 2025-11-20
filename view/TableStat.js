// /view/TableStat.js
import { $, $$, _on, _ready, log, } from "../helpers/shortcut.js";
import * as CR from '../helpers/chart_renderer.js';
import * as FM from "../helpers/formatter.js";
export class TableStat {
	constructor() {
		this.statsContainer = $('#stats-table-container');
		this.monthlyContainer = $('#monthly-table-container');
		this._setupEventListener();
		//this._renderStatsSkeleton();
		this._renderMonthlySkeleton();
	}
	
	_setupEventListener() {
		window.addEventListener('tradestat-updated', (e) => {
			const { stats } = e.detail;
			//this.renderStatsTable(stats);
			//log(stats.monthlyAgg)
			this.renderMonthlyTable(stats.monthlyAgg);
			//CR.renderPairsChart(stats.pairStats);
			//CR.renderEquityChart(stats.total.all.equityCurve);
			
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
			const abs = FM.num(Math.abs(val));
			return `<span class="${val > 0 ? "positive" : "negative"}">${sign}${abs}${suffix}</span>`;
		},
		
		pips(val) {
			return this.sign(val, " pips");
		},
		
		percent(val) {
			return this.sign(val, "%");
		},
		
		raw(val, suffix = '') {
			return (suffix == '') ? FM.num(val) : FM.num(val) + ' ' + suffix;
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
		M("Net Profit Pips", f.pips(A.netPips), f.pips(L.netPips), f.pips(S.netPips));
		M("", f.raw(A.netVPips, 'VP'), f.raw(L.netVPips, 'VP'), f.raw(S.netVPips, 'VP'));
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
		M("Avg Trade / Month", FM.num(A.avgTradePerMonth, 1), "—", "—");
		M("Avg Net / Month", f.pips(A.profitPerMonthPips), "—", "—");
		M("Avg Profit / Trade", f.pips(A.profitPerTradePips), f.pips(L.profitPerTradePips), f.pips(S.profitPerTradePips));
		
		M("Max Drawdown", f.raw(A.maxDrawdownPips, "pips"), "—", "—");
		M("Max Drawdown", `${A.maxDrawdownPercent}%`, "—", "—");
		M("RecoveryFactor", FM.num(A.recoveryFactor), "", "");
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
        <table id="monthly-table">
          <tbody>
            <tr><td style="text-align:center; padding:20px; color:#999;">Loading monthly data...</td></tr>
          </tbody>
        </table>
    `;
	}
	
	renderMonthlyTable(monthlyData) {
		const table = $('#monthly-table');
		if (!table) return;
		
		const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		
		let html = '';
		
		if (!monthlyData || Object.keys(monthlyData).length === 0) {
			table.innerHTML = `<tr><td colspan="14" class="no-data">Tidak ada data trade</td></tr>`;
			return;
		}
		
		// HEADER
		html += `<thead><tr class="header-row">
    <th class="sticky-year header-cell">Year</th>`;
		MONTHS.forEach(m => html += `<th class="header-cell">${m}</th>`);
		html += `<th class="header-cell ytd-header">Total</th></tr></thead><tbody>`;
		
		// BODY
		const years = Object.keys(monthlyData).sort((a, b) => a - b);
		
		let grandPips = 0;
		let grandVPips = 0;
		
		years.forEach(year => {
			const data = monthlyData[year];
			
			html += `<tr><td class="sticky-year year-cell">${year}</td>`;
			
			MONTHS.forEach(month => {
				const entry = data[month];
				
				if (entry) {
					const p = entry.pips || 0;
					const v = entry.vpips || 0;
					
					grandPips += p;
					grandVPips += v;
					
					const clsP = p > 0 ? 'pips-positive' : p < 0 ? 'pips-negative' : 'pips-zero';
					
					html += `
          <td class="month-cell ${clsP}">
            <span class="pips-value">${FM.num(p,1)}</span>
            <span class="vpips-value hidden">${FM.num(v,1)}</span>
          </td>
        `;
				} else {
					html += `
          <td class="month-cell pips-null">
            <span class="pips-value">—</span>
            <span class="vpips-value hidden">—</span>
          </td>
        `;
				}
			});
			
			// YTD
			const Y = data.YTD_pips || 0;
			const VY = data.YTD_vpips || 0;
			
			const clsY = Y > 0 ? 'pips-positive' : Y < 0 ? 'pips-negative' : 'pips-zero';
			
			html += `
      <td class="ytd-cell ${clsY}">
        <span class="pips-value">${FM.num(Y,1)}</span>
        <span class="vpips-value hidden">${FM.num(VY,1)}</span>
      </td>
    </tr>`;
		});
		
		// GRAND TOTAL
		const clsG = grandPips > 0 ? 'pips-positive' : grandPips < 0 ? 'pips-negative' : 'pips-zero';
		
		html += `
    <tr class="grand-total-row">
      <td colspan="${MONTHS.length + 1}" class="grand-total-label">Grand Total</td>
      <td class="ytd-cell grand-total-cell ${clsG}">
        <span class="pips-value">${FM.num(grandPips,1)}</span>
        <span class="vpips-value hidden">${FM.num(grandVPips,1)}</span>
      </td>
    </tr>
  `;
		
		html += `</tbody>`;
		table.innerHTML = html;
	}
	
	
}

new TableStat();