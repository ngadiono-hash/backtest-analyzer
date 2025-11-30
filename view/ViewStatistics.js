import { $, $$, create } from "../helpers/template.js";
import * as FM           from "../helpers/converter.js";
import * as CR           from "../helpers/chart_builder.js";
import { Tables, Cells, Toggler } from "../helpers/table_builder.js";

export class ViewStatistics {
  constructor() {
    this._setupEvent();
  }

  _setupEvent() {
    window.addEventListener("statistics-updated", e => {
      const { data } = e.detail;

      this.renderGeneral(data.general);
      this.renderMonthly(data.period.accum);
      this.renderProps(data.period.prop);
      this.renderDD(data.ddown);
      this.renderStreak(data.streak);
      logJson(data.streak);

      CR.renderPairsChart(data.symbols);
      CR.renderEquityChart(data.equity);
    });
  }

  renderGeneral(stats) {
    const container = $("#general-container");
    const b = new Tables(container).setId("general-table");

    const header = [
      create("th", { className:"pivot pivot-xy pips-mode", textContent: "Metrics" }),
      Cells.headCell("All", "pivot pivot-x pips-mode"),
      Cells.headCell("Long", "pivot pivot-x pips-mode"),
      Cells.headCell("Short", "pivot pivot-x pips-mode"),
    ];

    const rows = Object.keys(stats.a).map(m => ([
      Cells.textCell(FM.toTitle(m), "pivot pivot-y pips-mode"),
      Cells.pvCell(stats.a[m]),
      Cells.pvCell(stats.l[m]),
      Cells.pvCell(stats.s[m])
    ]));

    b.header(header).rows(rows).build();
    container.prepend(Toggler(container));
  }

  renderMonthly(stats) {
    const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const HEADER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Total"];

    const years = [...new Set(Object.keys(stats.monthly).map(k => k.split("-")[0]))].sort();
    const container = $("#monthly-container");
    const b = new Tables(container).setId("monthly-table");

    const header = [
      create("th", { className:"pivot pivot-xy pips-mode", textContent: "Y/M" }),
      ...HEADER.map(m => Cells.headCell(m, "pivot pivot-x pips-mode"))
    ];

    const rows = years.map(year => {
      const monthCells = MONTHS.map(m => {
        const e = stats.monthly[`${year}-${m}`];
        return Cells.pvCell(e, "N");
      });

      return [
        Cells.textCell(year, "pivot pivot-y pips-mode"),
        ...monthCells,
        Cells.pvCell(stats.yearly[year], "N")
      ];
    });

    rows.push([
      create("td", { colSpan: 13 }, "Grand Total"),
      Cells.pvCell(stats.total, "N")
    ]);

    b.header(header).rows(rows).build();
    container.prepend(Toggler(container));
  }

  renderProps(stats) {
    const container = $("#prop-container");
    const b = new Tables(container).setId("props-table");

    const header = [
      Cells.headCell("Period", "pivot pivot-x pips-mode"),
      Cells.headCell(stats.period, "pivot pivot-x pips-mode")
    ];

    const rows = [];
    rows.push([ create("td", { colSpan:2, className:"pivot sprt pips-mode" }, 
      `Summary Performance of ${stats.months}`) ]);

    for (const [k,v] of Object.entries(stats.monthly)) {
      rows.push([
        Cells.textCell(FM.toTitle(k), "pivot pivot-y pips-mode"),
        Cells.pvCell(v)
      ]);
    }
    rows.push([ create("td", { colSpan:2, className:"pivot sprt pips-mode" }, 
      `Summary Performance of ${stats.years}`) ]);

    for (const [k,v] of Object.entries(stats.yearly)) {
      rows.push([
        Cells.textCell(FM.toTitle(k), "pivot pivot-y pips-mode"),
        Cells.pvCell(v)
      ]);
    }

    b.header(header).rows(rows).build();
    container.prepend(Toggler(container));
  }

  renderDD(stats) {
    const container = $("#drawdown-container");
    container.innerHTML = "";
  
    // --- SUMMARY TABLE ---
    const summ = new Tables(container).setId("dd-summary");
    const rowSum = Object.keys(stats)
      .filter(key => key !== "events")
      .map(prop => ([
        Cells.textCell(FM.toTitle(prop), "pivot pivot-y pips-mode"),
        Cells.pvCell(stats[prop]),
      ]));
    summ.rows(rowSum).build();
  
    // --- EVENTS TABLE ---
    const wrap = create("div", { className: "dd-events-group" });
    container.append(wrap);
    const evTable = new Tables(wrap).setId("dd-events");
    const headerEvents = [
      Cells.headCell("#", "pivot pivot-xy pips-mode"),
      Cells.headCell("Start", "pivot pivot-x pips-mode"),
      Cells.headCell("Peak", "pivot pivot-x pips-mode"),
      Cells.headCell("Trough", "pivot pivot-x pips-mode"),
      Cells.headCell("End", "pivot pivot-x pips-mode"),
      Cells.headCell("DD", "pivot pivot-x pips-mode"),
      Cells.headCell("Duration", "pivot pivot-x pips-mode"),
    ];
    const rowEvents = stats.events.map((e, i) => ([
      Cells.textCell(String(i + 1), "pivot pivot-y pips-mode"),
      Cells.pvCell(e.peakDate),
      Cells.pvCell(e.peakEquity),
      Cells.pvCell(e.troughEquity),
      Cells.pvCell(e.recoveryDate),
      Cells.pvCell(e.absoluteDD),
      Cells.pvCell(e.recoveryDuration),
    ]));
  
    evTable.header(headerEvents).rows(rowEvents).build();
    container.prepend(Toggler(container));
  }
  
  renderStreak(stats) {
    
  }
  

}

new ViewStatistics();