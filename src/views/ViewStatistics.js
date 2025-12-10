import { $, $$, create } from "utils/template.js";
import * as FM           from "utils/converter.js";
import * as CB           from "builders/chart_builder.js";
import * as TB           from "builders/table_builder.js";

export class ViewStatistics {
  constructor() {
    this._setupEvent();
    this.overView = $("#overview");
  }

  _setupEvent() {
    window.addEventListener("statistics-updated", e => {
      const { data } = e.detail;

      this.chartGlobalEquity(data.curve);
      this.tableGeneral(data.general);
      this.tableAccumulation(data.period.accum);
      this.tableSummaries(data.period.prop);
      this.tableDrawdown(data.ddown);
      this.tableStreak(data.streak);
      this.monthlyPerformance(data.yearly, data.monthly);
      this.chartGlobalPairs(data.symbols);
    });
  }
  
  chartGlobalEquity(stats) {
    const overview = this.overView;
    overview.innerHTML = "";
  
    // 1. Layout
    const { wrapper, canvas, controls } = this._buildChartLayout(stats);
    overview.append(wrapper);
    overview.append(controls);
  
    // 2. Chart
    const userOpt = CB.lineChartControl(wrapper);
    const config  = CB.lineChartConfig(stats, userOpt);
    const chart   = CB.initChart("equity-global", canvas, config);
  
    CB.bindChartControl(wrapper, chart);
    CB.resizeConfig(wrapper, chart);
  
    // 3. Event
    CB.lineChartAllPairs(controls, stats, chart)

    return chart;
  }

  chartGlobalPairs(data, sortBy = "vpips") {
    const d = create("div", { class: "chart-wrapper" },
        create("canvas", { id: `pairs-chart`, class: "canvas" }));
    this.overView.append(d);
    const pairsCanvas = $('#pairs-chart').getContext('2d');
  
    if (sortBy === "pips") {
      data = [...data].sort((a, b) => b.pips - a.pips);
    } else if (sortBy === "vpips") {
      data = [...data].sort((a, b) => b.vpips - a.vpips);
    }
  
    const labels = data.map(d => d.pair);
  
    const pairsCfg = {
      _height: data.length * 60,
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "pips",  data: data.map(d => d.pips) },
          { label: "value", data: data.map(d => d.vpips) }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { grid: { display: false } }
        },
        crosshair: { enabled: false },
        plugins: {
          legend: { position: "bottom" },
          title: {
            display: true,
            text: "Net by Pair",
            position: "top"
          },
          tooltip: {
            cornerRadius: 0,
            titleFont: { size: 10 },
            bodyFont: { size: 10 },
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${FM.num(ctx.raw)}`
            }
          },
          
        }
      }
    };
  
    return CB.initChart("pairs-global", pairsCanvas, pairsCfg);
  }

  tableGeneral(stats) {
    const container = $("#general");
    const b = new TB.Tables(container).setId("general-table");

    const header = [
      create("th", { class:"pivot pivot-xy pips-mode" }, "Metrics"),
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

  tableAccumulation(stats) {
    const container = $("#accumulate");
    const b = new TB.Tables(container).setId("monthly-table");
  
    // ===== HEADER: Y-axis = Month/Total, X-axis = Years =====
    const years = [...new Set(
      Object.keys(stats.monthly).map(k => k.split("-")[0])
    )].sort();
  
    const header = [
      create("th", { className: "pivot pivot-xy pips-mode", textContent: "Month" }),
      ...years.map(y => TB.Cells.headCell(y, "pivot pivot-x pips-mode"))
    ];
  
    // ===== ROWS: Each row = 1 month OR Total =====
    const rows = FM.MONTH_NAMES.map(monthName => {
      const idx = FM.MONTHS[monthName];
      const mm = String(idx + 1).padStart(2, "0");
  
      const cells = years.map(year => {
        const entry = stats.monthly[`${year}-${mm}`];
        return TB.Cells.pvCell(entry, "N");
      });
  
      return [
        TB.Cells.textCell(monthName, "pivot pivot-y pips-mode"),
        ...cells
      ];
    });
  
    // ===== TOTAL row per year =====
    const totalRow = [
      TB.Cells.textCell("Total", "pivot pivot-y pips-mode"),
      ...years.map(y => TB.Cells.pvCell(stats.yearly[y], "N"))
    ];
    rows.push(totalRow);
  
    // ===== GRAND TOTAL ROW (1 merged cell) =====
    const totalValueCell = TB.Cells.pvCell(stats.total, "N");
    const pivotGrand = TB.Cells.textCell("Grand", "pivot pivot-y pips-mode");
    // Value cell with colspan across all year columns
    const mergedValueCell = create("td", { 
      colspan: years.length,
      class: "grand-total-row"
    });
    
    // copy childNodes dari pvCell
    mergedValueCell.append(...totalValueCell.childNodes);
    
    // push ke rows
    rows.push([ pivotGrand, mergedValueCell ]);
  
    // ===== BUILD =====
    b.header(header).rows(rows).build();
    container.prepend(TB.Toggler(container));
  }
  
  tableSummaries(stats) {
    const container = $("#summary");
    const b = new TB.Tables(container).setId("props-table");

    const header = [
      TB.Cells.headCell("Period", "pivot pivot-x pips-mode"),
      TB.Cells.headCell(stats.period, "pivot pivot-x pips-mode")
    ];

    const rows = [];
    rows.push([ create("td", { colspan:2, class:"pivot sprt pips-mode" }, 
      `Summary Performance of ${stats.months}`) ]);

    for (const [k,v] of Object.entries(stats.monthly)) {
      rows.push([
        TB.Cells.textCell(FM.toTitle(k), "pivot pivot-y pips-mode"),
        TB.Cells.pvCell(v)
      ]);
    }
    rows.push([ create("td", { colspan:2, class:"pivot sprt pips-mode" }, 
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

  tableDrawdown(stats) {
    const container = $("#drawdown");
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
  
  tableStreak(stats) {
    const container = $("#streak");
    container.innerHTML = "";
    const wrapper = create("div", { className: "streak-wrapper" });
    const winCard = TB.buildCard("win", stats.win, "win-card");
    const loseCard = TB.buildCard("lose", stats.lose, "lose-card");
  
    const detailSheet = create("div", { className: `streak-detail-sheet hide` });
  
    wrapper.append(winCard, loseCard);
    container.append(wrapper, detailSheet);
    wrapper.querySelectorAll(".streak-card").forEach(btn => {
      btn.addEventListener("click", () => {
        const side = btn.dataset.side; // win or lose
        TB.showDetailSheet(side, stats[side], detailSheet);
        $('input[type="checkbox"]', container).checked = false;
      });
    });
    container.prepend(TB.Toggler(container));
  }

  monthlyPerformance(yearly, monthly) {
    const container = $("#monthly");
    container.innerHTML = "";
    if (!monthly || !Object.keys(monthly).length) {
      container.textContent = "No monthly data available.";
      return;
    }
  
    // --- Group months by year ----------
    const yearMap = {};
    for (const monthKey in monthly) {
      const [y] = monthKey.split("-");
      if (!yearMap[y]) yearMap[y] = [];
      yearMap[y].push(monthKey);
    }
  
    // --- Build Accordion for each YEAR ---
    for (const year in yearMap) {
      const yearSection = this._buildYearSection(
        year,
        yearMap[year],
        monthly,
        yearly[year] ?? null   // ← tambahkan yearly summary agar bisa dipakai di header
      );
      container.append(yearSection);
    }
  }

  _buildYearSection(year, monthKeys, stats) {
    const header = CB.createHeaderYear(year, monthKeys, stats);
    const body = create("div", { class: "accordion-content" });
    monthKeys.sort().forEach(mk => body.append(this._buildMonthSection(mk, stats[mk])));
    header.append(body);
    return header;
  }

  _buildMonthSection(monthKey, datas) {
    const data = datas.equity
    const header = CB.createHeaderMonth(monthKey, datas);
    const body = create("div", { class: "accordion-content" });
    const { wrapper, canvas, controls } = this._buildChartLayout(data);
    body.append(wrapper);
    body.append(controls);
    const config  = CB.lineChartConfig(data);
    $('input[type="checkbox"]', header).addEventListener("change", (e) => {
      if (e.target.checked) {
        const chart = CB.initChart(`equity-${monthKey}`, canvas, config);
        CB.lineChartAllPairs(controls, data, chart);
      }
    });
    header.append(body);
    return header;
  }

  _buildChartLayout(data) {
    const canvas  = create("canvas", { class: "canvas" });
    const wrapper = create("div", { class: "chart-wrapper" }, canvas);
  
    const controls = create("div", { class: "pair-filter" });
    const pairs = ["ALL", ...FM.getUniquePairs(data)];
    const counts = data.p.reduce((acc, t) => {
      acc[t.pair] = (acc[t.pair] || 0) + 1;
      return acc;
    }, {});
    pairs.forEach(pair => {
      const count = pair === "ALL" ? data.p.length : (counts[pair] ?? 0);
      const btn = create("button", { 
        class: `pair-btn ${pair === "ALL" ? "active" : ""}`, 
        "data-pair": pair 
      });
      btn.append(document.createTextNode(pair + " "));
      const badge = create("small", { class: "pair-count" }, count);
      btn.append(badge);
      controls.append(btn);
    });
  
    return { wrapper, canvas, controls };
  }

}