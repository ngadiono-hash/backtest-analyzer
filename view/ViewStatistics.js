import { $, $$, create } from "../helpers/template.js";
import * as FM           from "../helpers/converter.js";
import * as CR           from "../helpers/chart_builder.js";
// import { TB.Tables, TB.Cells, TB.Toggler } from "../helpers/table_builder.js";
import * as TB from "../helpers/table_builder.js";

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
      //log(data.streak);

      CR.renderPairsChart(data.symbols);
      CR.renderEquityChart(data.equity);
    });
  }

  renderGeneral(stats) {
    const container = $("#general-container");
    const b = new TB.Tables(container).setId("general-table");

    const header = [
      create("th", { className:"pivot pivot-xy pips-mode", textContent: "Metrics" }),
      TB.Cells.headCell("All", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("Long", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("Short", "pivot pivot-x pips-mode"),
    ];

    const rows = Object.keys(stats.a).map(m => ([
      TB.Cells.textCell(FM.toTitle(m), "pivot pivot-y pips-mode"),
      TB.Cells.pvCell(stats.a[m]),
      TB.Cells.pvCell(stats.l[m]),
      TB.Cells.pvCell(stats.s[m])
    ]));

    b.header(header).rows(rows).build();
    container.prepend(TB.Toggler(container));
  }

  renderMonthly(stats) {
    const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const HEADER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Total"];

    const years = [...new Set(Object.keys(stats.monthly).map(k => k.split("-")[0]))].sort();
    const container = $("#monthly-container");
    const b = new TB.Tables(container).setId("monthly-table");

    const header = [
      create("th", { className:"pivot pivot-xy pips-mode", textContent: "Y/M" }),
      ...HEADER.map(m => TB.Cells.headCell(m, "pivot pivot-x pips-mode"))
    ];

    const rows = years.map(year => {
      const monthCells = MONTHS.map(m => {
        const e = stats.monthly[`${year}-${m}`];
        return TB.Cells.pvCell(e, "N");
      });

      return [
        TB.Cells.textCell(year, "pivot pivot-y pips-mode"),
        ...monthCells,
        TB.Cells.pvCell(stats.yearly[year], "N")
      ];
    });

    rows.push([
      create("td", { colSpan: 13 }, "Grand Total"),
      TB.Cells.pvCell(stats.total, "N")
    ]);

    b.header(header).rows(rows).build();
    container.prepend(TB.Toggler(container));
  }

  renderProps(stats) {
    const container = $("#prop-container");
    const b = new TB.Tables(container).setId("props-table");

    const header = [
      TB.Cells.headCell("Period", "pivot pivot-x pips-mode"),
      TB.Cells.headCell(stats.period, "pivot pivot-x pips-mode")
    ];

    const rows = [];
    rows.push([ create("td", { colSpan:2, className:"pivot sprt pips-mode" }, 
      `Summary Performance of ${stats.months}`) ]);

    for (const [k,v] of Object.entries(stats.monthly)) {
      rows.push([
        TB.Cells.textCell(FM.toTitle(k), "pivot pivot-y pips-mode"),
        TB.Cells.pvCell(v)
      ]);
    }
    rows.push([ create("td", { colSpan:2, className:"pivot sprt pips-mode" }, 
      `Summary Performance of ${stats.years}`) ]);

    for (const [k,v] of Object.entries(stats.yearly)) {
      rows.push([
        TB.Cells.textCell(FM.toTitle(k), "pivot pivot-y pips-mode"),
        TB.Cells.pvCell(v)
      ]);
    }

    b.header(header).rows(rows).build();
    container.prepend(TB.Toggler(container));
  }

  renderDD(stats) {
    const container = $("#drawdown-container");
    container.innerHTML = "";
  
    // --- SUMMARY TABLE ---
    const summ = new TB.Tables(container).setId("dd-summary");
    const rowSum = Object.keys(stats)
      .filter(key => key !== "events")
      .map(prop => ([
        TB.Cells.textCell(FM.toTitle(prop), "pivot pivot-y pips-mode"),
        TB.Cells.pvCell(stats[prop]),
      ]));
    summ.rows(rowSum).build();
  
    // --- EVENTS TABLE ---
    const wrap = create("div", { className: "dd-events-group" });
    container.append(wrap);
    const evTable = new TB.Tables(wrap).setId("dd-events");
    const headerEvents = [
      TB.Cells.headCell("#", "pivot pivot-xy pips-mode"),
      TB.Cells.headCell("Start", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("Peak", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("Trough", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("End", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("DD", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("Duration", "pivot pivot-x pips-mode"),
    ];
    const rowEvents = stats.events.map((e, i) => ([
      TB.Cells.textCell(String(i + 1), "pivot pivot-y pips-mode"),
      TB.Cells.pvCell(e.peakDate),
      TB.Cells.pvCell(e.peakEquity),
      TB.Cells.pvCell(e.troughEquity),
      TB.Cells.pvCell(e.recoveryDate),
      TB.Cells.pvCell(e.absoluteDD),
      TB.Cells.pvCell(e.recoveryDuration),
    ]));
  
    evTable.header(headerEvents).rows(rowEvents).build();
    container.prepend(TB.Toggler(container));
  }
  
renderStreak(stats) {
  const container = $("#streak-container");
  container.innerHTML = "";

  // Buat kontainer utama cards + detail sheet
  const wrapper = create("div", { className: "streak-wrapper" });

  // Build 2 cards
  const profitCard = TB.buildCard("win", stats.win, "profit-card");
  const lossCard   = TB.buildCard("lose", stats.lose, "loss-card");

  // Build detail sheet container (kosong dulu)
  const detailSheet = create("div", { className: `streak-detail-sheet hide` });

  wrapper.append(profitCard, lossCard);
  container.append(wrapper, detailSheet);

  // Event listener tombol detail
  wrapper.querySelectorAll(".streak-card button").forEach(btn => {
    btn.addEventListener("click", () => {
      const side = btn.dataset.side; // "profit" atau "loss"
      TB.showDetailSheet(side, stats[side], detailSheet);
    });
  });
}

}