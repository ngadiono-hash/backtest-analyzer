// /view/TableStat.js
import { $, $$, _on, _ready } from "../helpers/shortcut.js";
import * as CR from '../helpers/chart_renderer.js';
import * as FM from "../helpers/formatter.js";
export class ViewStatistics {
	constructor() {
		this.generalContainer = $('#general-container');
		this.monthlyContainer = $('#monthly-container');
		this._setupEventListener();
	}
	
	_setupEventListener() {
		window.addEventListener('statistics-updated', (e) => {
			const { stats } = e.detail;
      this.renderGeneralTable(stats.general);
			this.renderMonthlyTable(stats.monthly); //ok
			CR.renderPairsChart(stats.symbols); //ok
			CR.renderEquityChart(stats.equity); //ok
			
		});
	}
	toggle(table){
	  const toggleBtn = document.createElement("div");
    toggleBtn.className = "toggle-wrapper";
    const toggleSwitch = document.createElement("label");
    toggleSwitch.className = "switch";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "toggle-pips-vpips";
    const slider = document.createElement("span");
    slider.className = "slider";
    toggleSwitch.appendChild(checkbox);
    toggleSwitch.appendChild(slider);
    toggleBtn.appendChild(toggleSwitch);
    
    checkbox.addEventListener("change", () => {
      const valsMode = $$(".value", table);
      const dualMode = $$(".pivot", table);
      dualMode.forEach(e => {
        e.classList.toggle("pips-mode");
        e.classList.toggle("vpips-mode");
      });
      valsMode.forEach(e => {
        e.classList.toggle("hidden");
      });
    });
    return toggleBtn;
	}
	//========== TABLE STATS  
  renderGeneralTable(result) {
    const frag = document.createDocumentFragment();
    const table = document.createElement("table");
    table.id = "general-table";
  
    // ===========================
    // HEADER
    // ===========================
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Metric</th>
        <th>All</th>
        <th>Long</th>
        <th>Short</th>
      </tr>
    `;
    table.appendChild(thead);
  
    const tbody = document.createElement("tbody");
  
    // ==========================================
    //  DEFINISI METRIK & LABEL + TIPE FORMAT
    // ==========================================
    const metrics = [
      ["trades", "Total Trades", "int"],
      ["winTrades", "Win Trades", "int"],
      ["lossTrades", "Loss Trades", "int"],
      ["winrate", "Win Rate", "percent"],
      ["avgProfit", "Avg Profit"],
      ["avgLoss", "Avg Loss"],
      ["profitMedian", "Median Profit"],
      ["lossMedian", "Median Loss"],
      ["grossProfit", "Gross Profit"],
      ["grossLoss", "Gross Loss"],
      ["netTotal", "Net Total"],
      ["expectancy", "Expectancy"],
      ["profitStd", "Profit StdDev"],
      ["lossStd", "Loss StdDev"],
      ["maxProfit", "Max Profit"],
      ["maxLoss", "Max Loss"],
      ["minProfit", "Min Profit"],
      ["minLoss", "Min Loss"],
      ["avgRR", "Average R/R", "rr"],
      ["holdAvg", "Average Hold", "hold"],
      ["holdMax", "Max Hold", "hold"],
    ];
  
    // ==========================================
    // COLOR RULES (hanya metrik finansial!)
    // ==========================================
    const colorRules = {
      avgProfit: "profit",
      avgLoss: "loss",
      profitMedian: "profit",
      lossMedian: "loss",
      grossProfit: "profit",
      grossLoss: "loss",
      maxProfit: "profit",
      maxLoss: "loss",
      minProfit: "profit",
      minLoss: "loss",
  
      netTotal: "dynamic",
      avgNet: "dynamic",
      expectancy: "dynamic",
  
      // netral:
      trades: "none",
      winTrades: "none",
      lossTrades: "none",
      winrate: "none",
      profitStd: "none",
      lossStd: "none",
      avgRR: "none",
      holdAvg: "none",
      holdMax: "none",
    };
  
  // =====================================================
  // HELPER: tentukan kelas positif/negatif
  // =====================================================
  const classify = (metricKey, value) => {
    if (value === 0) return ""; 
  
    // return-based metrics → izinkan warna
    const returnMetrics = ["avgRR", "expectancy", "netTotal"];
  
    // profit → pos, loss → neg
    if (metricKey.includes("Profit")) return "pos";
    if (metricKey.includes("Loss"))  return "neg";
  
    // if metric is not a return metric → always neutral
    if (!returnMetrics.includes(metricKey)) return "";
  
    return value > 0 ? "pos" : "neg";
  };
  
  // =====================================================
  // HELPER: FORMAT VALUE + PREFIX UNTUK POS/NEG
  // =====================================================
  const formatValue = (metricKey, value, cls) => {
    // HIDE prefix for neutral
    if (!cls) return FM.num(value);
  
    // avoid prefix for zero
    if (value === 0) return FM.num(value);
  
    const sign = cls === "pos" ? "+" : "-";
    return sign + FM.num(Math.abs(value));
  };
  
  // =====================================================
  // HELPER: membuat 1 sel p/v OR special hold metric
  // =====================================================
  const makePV = (metricKey, obj) => {
    const wrap = document.createElement("td");
  
    // --- SPECIAL CASE: holdAvg / holdMax ---
    if (metricKey === "holdAvg" || metricKey === "holdMax") {
      wrap.textContent = FM.barsToTime(obj.p);  // obj.p dan obj.v sama
      return wrap;
    }
  
    // --- NORMAL METRICS (pips + vpips) ---
    const pCls = classify(metricKey, obj.p);
    const vCls = classify(metricKey, obj.v);
  
    const pVal = formatValue(metricKey, obj.p, pCls);
    const vVal = formatValue(metricKey, obj.v, vCls);
  
    wrap.innerHTML = `
      <span class="pips ${pCls}">${pVal}</span>
      <span class="vpips hidden ${vCls}">${vVal}</span>
    `;
    return wrap;
  };
  
    // ==========================================
    // RENDER ROWS
    // ==========================================
    for (const [key, label, type] of metrics) {
      const row = document.createElement("tr");
  
      const tdLabel = document.createElement("td");
      tdLabel.textContent = label;
      tdLabel.className = "label";
      row.appendChild(tdLabel);
  
      const mA = result.a[key];
      const mL = result.l[key];
      const mS = result.s[key];
  
      if (!mA || !mL || !mS) {
        row.appendChild(document.createElement("td"));
        row.appendChild(document.createElement("td"));
        row.appendChild(document.createElement("td"));
        tbody.appendChild(row);
        continue;
      }
  
      row.appendChild(makePV(key, mA, type));
      row.appendChild(makePV(key, mL, type));
      row.appendChild(makePV(key, mS, type));
  
      tbody.appendChild(row);
    }
  
    table.appendChild(tbody);
    frag.appendChild(table);
    this.generalContainer.append(frag);
  }
	//========== TABLE MONTHLY
  renderMonthlyTable(stats) {
    const container = this.monthlyContainer;
    container.innerHTML = "";
  
    if (!stats || !stats.monthly || Object.keys(stats.monthly).length === 0) {
      container.innerHTML = `
        <table id="monthly-table">
          <tbody>
            <tr><td style="padding:20px; text-align:center;">Nothing to show</td></tr>
          </tbody>
        </table>`;
      return;
    }
  
    const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  
    // =====================================================
    // 1. GLOBAL TOGGLE SWITCH
    // =====================================================

  
    // =====================================================
    // 3. TABLE
    // =====================================================
    const table = document.createElement("table");
    table.id = "monthly-table";
    //table.classList.add("pips-mode"); // default
  
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
  
    // ------------------ HEADER ------------------ //
    const pivotRow = document.createElement("tr");
  
    const pivotXY = document.createElement("th");
    pivotXY.className = "pivot pivot-xy pips-mode";
    pivotXY.appendChild(this.toggle(table));
    pivotRow.appendChild(pivotXY);
  
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      .forEach(text => {
        const th = document.createElement("th");
        th.className = "pivot pivot-x pips-mode";
        th.textContent = text;
        pivotRow.appendChild(th);
      });
  
    const thYtd = document.createElement("th");
    thYtd.className = "pivot pivot-x pips-mode";
    thYtd.textContent = "Total";
    pivotRow.appendChild(thYtd);
  
    thead.appendChild(pivotRow);
  
  
    // ------------------ BODY ------------------ //
    const years = [...new Set(Object.keys(stats.monthly).map(k => k.split("-")[0]))].sort();
  
    let grandPips = 0;
    let grandVPips = 0;
  
    years.forEach(year => {
      const row = document.createElement("tr");
  
      const yearCell = document.createElement("td");
      yearCell.className = "pivot pivot-y pips-mode";
      yearCell.textContent = year;
      row.appendChild(yearCell);
  
      let yP = 0, yV = 0;
  
      MONTHS.forEach(m => {
        const key = `${year}-${m}`;
        const entry = stats.monthly[key];
  
        const td = document.createElement("td");
  
        const spanP = document.createElement("span");
        spanP.className = "value";
  
        const spanV = document.createElement("span");
        spanV.className = "value hidden";
  
        if (entry) {
          const p = entry.pips ?? 0;
          const v = entry.vpips ?? 0;
  
          yP += p;  
          yV += v;
  
          grandPips += p;
          grandVPips += v;
  
          td.classList.add(p > 0 ? "positive" : p < 0 ? "negative" : "zero");
  
          spanP.textContent = FM.num(p, 1);
          spanV.textContent = FM.num(v, 1);
  
        } else {
          td.classList.add("pips-null");
          spanP.textContent = "—";
          spanV.textContent = "—";
        }
  
        td.appendChild(spanP);
        td.appendChild(spanV);
        row.appendChild(td);
      });
  
      // ---- TOTAL/YTD ---- //
      const ytd = document.createElement("td");
      ytd.className = yP > 0 ? "positive" : yP < 0 ? "negative" : "zero";
  
      const ypSpan = document.createElement("span");
      ypSpan.className = "value";
      ypSpan.textContent = FM.num(yP, 1);
  
      const yvSpan = document.createElement("span");
      yvSpan.className = "value hidden";
      yvSpan.textContent = FM.num(yV, 1);
  
      ytd.appendChild(ypSpan);
      ytd.appendChild(yvSpan);
      row.appendChild(ytd);
  
      tbody.appendChild(row);
    });
  
    // ------------------ GRAND TOTAL ------------------ //
    const totalRow = document.createElement("tr");
    totalRow.className = "grand-total-row";
  
    const label = document.createElement("td");
    label.colSpan = 13; // 12 months + year
    label.textContent = "Grand Total";
  
    const cell = document.createElement("td");
    cell.className = grandPips > 0 ? "positive" : grandPips < 0 ? "negative" : "zero";
  
    const gpSpan = document.createElement("span");
    gpSpan.className = "value";
    gpSpan.textContent = FM.num(grandPips, 1);
  
    const gvSpan = document.createElement("span");
    gvSpan.className = "value hidden";
    gvSpan.textContent = FM.num(grandVPips, 1);
  
    cell.appendChild(gpSpan);
    cell.appendChild(gvSpan);
  
    totalRow.appendChild(label);
    totalRow.appendChild(cell);
    tbody.appendChild(totalRow);
  
    // Final assembly
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
  
    // =====================================================
    // 4. TOGGLE LISTENER (GLOBAL)
    // =====================================================
    
  }
	
	
}

new ViewStatistics();