// /view/TableStat.js
import { $, $$, _on, _create, _ready } from "../helpers/shortcut.js";
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

  toggle(table) {
    const checkbox = _create("input", {
      type: "checkbox",
      id: "toggle-pips-vpips"
    });
  
    checkbox.addEventListener("change", () => {
      $$(".pivot", table).forEach(e => {
        e.classList.toggle("pips-mode");
        e.classList.toggle("vpips-mode");
      });
      $$(".value", table).forEach(e => e.classList.toggle("hidden"));
    });
  
    return _create(
      "div",
      { className: "toggle-wrapper" },
      _create(
        "label",
        { className: "switch" },
        checkbox,
        _create("span", { className: "slider" })
      )
    );
  }
  
	//========== TABLE STATS 
  enderGeneralTable(stats) {
    const container = this.generalContainer;
    container.innerHTML = "";
    const metrics = [
      ["trade",     "Total Trades",     "int"],
      ["win",       "Win Trades",       "int"],
      ["loss",      "Loss Trades",      "int"],
      ["winrate",   "Win Rate",         "float"],
      ["gProfit",   "Gross Profit",     "float"],
      ["gLoss",     "Gross Loss",       "float"],
      ["netReturn", "Net Return",       "float"],
      ["medReturn", "Median Return",    "float"],
      ["avgReturn", "Average Return",   "float"],
      ["stdReturn", "StDev Return",     "float"],
      ["avgProfit", "Average Profit",   "float"],
      ["avgLoss",   "Average Loss",     "float"],
      ["maxProfit", "Max Profit",       "float"],
      ["maxLoss",   "Max Loss",         "float"],
      ["pFactor",   "Profit Factor",    "float"],
      ["avgRR",     "Avg Risk:Reward",  "float"],
      ["avgHold",   "Average Hold",     "int"],
      ["maxHold",   "Max Hold",         "int"]
    ];
  
    const pivots = ["All", "Long", "Short"];
    const mapStats = (k) => stats[k]; // stats.a / stats.l / stats.s
  
    const table = _create("table", { id: "monthly-table" });
    const thead = _create("thead");
    const trHead = _create("tr");
  
    // pivot XY
    trHead.append(
      _create("th", {
        className: "pivot pivot-xy pips-mode"
      }, this.toggle(table))
    );
  
    // pivot X (All / Long / Short)
    pivots.forEach(label =>
      trHead.append(
        _create("th", {
          className: "pivot pivot-x pips-mode",
          textContent: label
        })
      )
    );
  
    thead.append(trHead);
    table.append(thead);
  
    // ====================== TBODY ==========================
    const tbody = _create("tbody");
    const renderCol = (key, type, obj) => {
      const p = obj?.p ?? 0;
      const v = obj?.v ?? 0;
  
      const { txt: txtP, css: cssP } = FM.metricsFormat(key, type, p);
      const { txt: txtV, css: cssV } = FM.metricsFormat(key, type, v);
  
      return _create("td",
        _create("span", { className: `value ${cssP}`, textContent: txtP }),
        _create("span", { className: `value hidden ${cssV}`, textContent: txtV })
      );
    };
  
    metrics.forEach(([key, label, type]) => {
      const tr = _create("tr");
      tr.append(_create("td", {
        className: "pivot pivot-y pips-mode",
        textContent: label
      }));

      ["a", "l", "s"].forEach(pivotKey =>
        tr.append(renderCol(key, type, stats[pivotKey][key]))
      );
      tbody.append(tr);
    });
    table.append(tbody);
    container.append(table);
  }	
renderGeneralTable(stats) {
  const container = this.generalContainer;
  container.innerHTML = "";

  const metrics = [
    ["trade","Total Trades","int"],
    ["win","Win Trades","int"],
    ["loss","Loss Trades","int"],
    ["winrate","Win Rate","float"],
    ["gProfit","Gross Profit","float"],
    ["gLoss","Gross Loss","float"],
    ["netReturn","Net Return","float"],
    ["medReturn","Median Return","float"],
    ["avgReturn","Average Return","float"],
    ["stdReturn","StDev Return","float"],
    ["avgProfit","Average Profit","float"],
    ["avgLoss","Average Loss","float"],
    ["maxProfit","Max Profit","float"],
    ["maxLoss","Max Loss","float"],
    ["pFactor","Profit Factor","float"],
    ["avgRR","Avg Risk:Reward","float"],
    ["avgHold","Average Hold","int"],
    ["maxHold","Max Hold","int"]
  ];

  const table = _create("table", { id: "general-table" });

  // HEADER (note: always pass props object)
  const thead = _create("thead", {},
    _create("tr", {},
      _create("th", { className: "pivot pivot-xy pips-mode" }, this.toggle(table)),
      _create("th", { className: "pivot pivot-x pips-mode", textContent: "All" }),
      _create("th", { className: "pivot pivot-x pips-mode", textContent: "Long" }),
      _create("th", { className: "pivot pivot-x pips-mode", textContent: "Short" })
    )
  );
  table.append(thead);

  // BODY
  const tbody = _create("tbody", {});

  const renderCol = (key, type, dataObj) => {
    const p = dataObj?.p ?? 0;
    const v = dataObj?.v ?? 0;

    const { txt: txtP, css: cssP } = FM.metricsFormat(key, type, p);
    const { txt: txtV, css: cssV } = FM.metricsFormat(key, type, v);

    return _create("td", {},
      _create("span", { className: `value ${cssP}`.trim(), textContent: txtP }),
      _create("span", { className: `value hidden ${cssV}`.trim(), textContent: txtV })
    );
  };

  metrics.forEach(([key, label, type]) => {
    tbody.append(
      _create("tr", {},
        _create("td", { className: "pivot pivot-y pips-mode", textContent: label }),
        renderCol(key, type, stats.a[key]),
        renderCol(key, type, stats.l[key]),
        renderCol(key, type, stats.s[key])
      )
    );
  });

  table.append(tbody);
  container.append(table);
}	
  //========== TABLE MONTHLY
  renderMonthlyTable(stats) {
    const container = this.monthlyContainer;
    container.innerHTML = "";
  
    const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const HEADER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Total"];
    const years = [...new Set(Object.keys(stats.monthly).map(k => k.split("-")[0]))].sort();
    let grandP = 0;
    let grandV = 0;
    const table = _create("table", { id: "monthly-table" })

    const headerRow = _create("tr", {},
      // pivot-xy
      _create("th", { className: "pivot pivot-xy pips-mode" },
        this.toggle(table)
      ),

      ...HEADER.map(text =>
        _create("th", { className: "pivot pivot-x pips-mode", textContent: text })
      )
    );

    const bodyRows = years.map(year => {
      let yP = 0, yV = 0;
  
      const monthCells = MONTHS.map(m => {
        const key = `${year}-${m}`;
        const entry = stats.monthly[key];
        if (!entry) {
          return _create("td", {},
            _create("span", { className: "value null", textContent: "—" }),
            _create("span", { className: "value hidden null", textContent: "—" })
          );
        }
      
        const p = entry.pips ?? 0;
        const v = entry.vpips ?? 0;
        yP += p;
        yV += v;
        grandP += p;
        grandV += v;
      
        const clsP = p > 0 ? "pos" : p < 0 ? "neg" : "zero";
        const clsV = v > 0 ? "pos" : v < 0 ? "neg" : "zero";
        return _create("td", {},
          _create("span", {
            className: `value ${clsP}`,
            textContent: FM.num(p, 1)
          }),
          _create("span", {
            className: `value hidden ${clsV}`,
            textContent: FM.num(v, 1)
          })
        );
      });
  
      // ---- TOTAL/YTD ----
      const clsPTotal = yP > 0 ? "pos" : yP < 0 ? "neg" : "zero";
      const clsVTotal = yV > 0 ? "pos" : yV < 0 ? "neg" : "zero";
      const totalCell = _create("td",
        _create("span", { className: `value ${clsPTotal}`, textContent: FM.num(yP, 1) }),
        _create("span", { className: `value hidden ${clsVTotal}`, textContent: FM.num(yV, 1) })
      );
  
      return _create("tr", {},
        _create("td", {
          className: "pivot pivot-y pips-mode",
          textContent: year
        }),
        ...monthCells,
        totalCell
      );
    });

    const clsPGrand = grandP > 0 ? "pos" : grandP < 0 ? "neg" : "zero";
    const clsVGrand = grandV > 0 ? "pos" : grandV < 0 ? "neg" : "zero";
  
    const grandRow = _create("tr", { className: "grand-total-row" },
      _create("td", { colSpan: 13, textContent: "Grand Total" }),
  
      _create("td",
        _create("span", { className: `value ${clsPGrand}`, textContent: FM.num(grandP, 1) }),
        _create("span", { className: `value hidden ${clsVGrand}`, textContent: FM.num(grandV, 1) })
      )
    );
  
    // ----------------------
    // ASSEMBLE TABLE
    // ----------------------
    const thead = _create("thead", {}, headerRow);
    const tbody = _create("tbody", {}, ...bodyRows, grandRow);
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
}
	
	
}

new ViewStatistics();