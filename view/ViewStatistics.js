import { $, $$, create } from "../helpers/template.js";
import * as FM           from "../helpers/converter.js";
import * as CB           from "../helpers/chart_builder.js";
import * as TB           from "../helpers/table_builder.js";

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
  
  chartGlobalEquity(data) {
    const overview  = this.overView;
    overview.innerHTML = "";
    overview.append(create("div", { class: "chart-wrapper", id: "equity-chart-container" },
        create("canvas", { id: `equity-chart` }),
        create("div", { class: "resizer"}))
    );
    const container = $('#equity-chart-container');
    const equityCanvas    = $('#equity-chart').getContext('2d');
    const handleResizer   = container.querySelector('.resizer');
    const opt = CB.chartControl(container);
    
    const labels = data.p.map((_, i) => i + 1);
    const pips   = data.p.map(p => p.equity);
    const vpips  = data.v.map(v => v.equity);

    // ── CHART CONFIG ─────────────────────────────────────────
    
    const overviewCfg = buildChartConfig(opt)

    function buildChartConfig(opt) {
      const A1 = "#089981", B1 = "#f23645", A2 = "#36A2EB", B2 = "#FF4263";
    
      return {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "pips",
              data: pips,
              segmentColor: { enabled: true },
              tension: 0,
              pointRadius: 0,  
              borderWidth: 1,
              hoverRadius: 1.5,
              fill: false,
              backgroundColor: undefined,
              // segment: {
              //   borderColor: ctx => ctx.p0.parsed.y >= 0 ? A1 : B1
              // }
            },
            {
              label: "value",
              data: vpips,
              segmentColor: { enabled: true, above: A2, below: B2 },
              tension: 0,
              pointRadius: 0,  
              borderWidth: 1,
              hoverRadius: 1.5,
              fill: false,
              backgroundColor: undefined,
              // segment: {
              //   borderColor: ctx => ctx.p0.parsed.y >= 0 ? A2 : B2
              // }
            }
          ]
        },
        options: {
          
          responsive: true,
          maintainAspectRatio: false,
          crosshair: { enabled: opt.tooltip },
          interaction: {
            mode: "nearest",
            intersect: false
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { display: false }
            },
            y: {
              beginAtZero: true,
              grid: { display: false },
              ticks: { 
                display: true,
                callback: (v) => {
                  return FM.num(v, 1)
                }
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: "Net Pips vs Value",
              position: "top"
            },
            legend: { display: true, position: "bottom" },
            tooltip: {
              enabled: opt.tooltip,
              cornerRadius: 0,
              titleFont: { size: 10 },
              bodyFont: { size: 10 },
              intersect: false,
              callbacks: {
                title: (ctx) => {
                  const i = ctx[0].dataIndex;
                  const a = data.p[i]
                  return `#${i} | ${a.date} | ${a.value >= 0 ? "🟢" : "🔴"}`;
                },
                label: (ctx) => {
                  const i = ctx.dataIndex;
                  const src = ctx.datasetIndex === 0 ? data.p[i] : data.v[i];
                  return `${src.pair} | ${FM.num(src.value)}`;
                }
              }
            },
            annotation: {
              annotations: {
                zeroLine: {
                  type: 'line',
                  yMin: 0,
                  yMax: 0,
                  borderColor: 'gray',
                  borderWidth: 1,
                  borderDash: [5, 5],
                }
              }
            },
            zoom: {
              pan: {
                enabled: opt.zoom,
                mode: "x",
                threshold: 10
              },
              zoom: {
                wheel:   { enabled: opt.zoom, speed: 0.05 },
                pinch:   { enabled: opt.zoom },
                mode: "x"
              }
            }
          },
        }
      }
    }
  
    // ── CREATE / UPDATE CHART ───────────────────────────────
    const chart = CB.initChart("globalEquity", equityCanvas, overviewCfg);
    CB.bindChartControl(container, chart);
    // ── CLEANUP PREVIOUS OBSERVERS ──────────────────────────
    window.charts.equityObserver?.disconnect();
    window.charts.equityResizeCleanup?.();
  
    // ── RESIZE HANDLING (throttled ───────────────────────
    let raf = null;
    const resizeObserver = new ResizeObserver(() => {
      if (!chart?.canvas) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        chart.resize();
        raf = null;
      });
    });
  
    resizeObserver.observe(container);
    window.charts.equityObserver = resizeObserver;
    window.charts.equityResizeCleanup = CB.enableResize(container, handleResizer, chart);
  
    return chart;
  }

  chartGlobalPairs(data, sortBy = "vpips") {
    const d = create("div", { class: "chart-wrapper" },
        create("canvas", { id: `pairs-chart` }));
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
  
    return CB.initChart("globalPairs", pairsCanvas, pairsCfg);
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
  
    // ===== GRAND TOTAL ROW (1 merged cell, NO label) =====
    const totalCell = TB.Cells.pvCell(stats.total, "N");
    
    // bungkus ulang agar bisa memakai colSpan
    const mergedCell = create("td", { 
      colspan: years.length + 1,
      class: "grand-total-row"
    });
    
    // ambil isi pvCell (hanya anak-anaknya)
    mergedCell.append(...totalCell.childNodes);
    
    // tambahkan baris grand total
    rows.push([ mergedCell ]);
  
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
      container.prepend(TB.Toggler(container));
    }
  }

_buildYearSection(year, monthKeys, stats) {
  let totalTrades = 0, totalNetP = 0, totalNetV = 0;

  monthKeys.forEach(mKey => {
    const s = stats[mKey].summary;
    totalTrades += s.totalTrades;
    totalNetP += s.netPips;
    totalNetV += s.netVPips;
  });

  const avgP = FM.metricFormat(totalNetP / monthKeys.length, "R");
  const avgV = FM.metricFormat(totalNetV / monthKeys.length, "R");
  const netP = FM.metricFormat(totalNetP ?? 0, "R");
  const netV = FM.metricFormat(totalNetV ?? 0, "R");

  const header = create("div", { class: "accordion" },
    create("input", { type: "checkbox", id: `${year}`, class: "accordion-input" }),
    create("label", { for: `${year}`, class: "accordion-label"},
      create("div", { class: "row" },
        create("div", { class: "cell" }, `Year ${year}`,
          create("br"),
          create("small", `${totalTrades} trades`)
        ),
        create("div", { class: "cell" },
          create("span", { class: `value right` }, netP.txt,
            create("br"),
            create("small", { class: ``}, avgP.txt)
          ),
          create("span", { class: `value hidden right` }, netV.txt,
            create("br"),
            create("small", {class: ``}, avgV.txt)
          )
        )
      )
    )
  );
  
  const body = create("div", { class: "accordion-content" });
  monthKeys.sort().forEach(mk => body.append(this._buildMonthSection(mk, stats[mk])));
  header.append(body);
  return header;
}

_buildMonthSection(monthKey, data) {
  const [y, m] = monthKey.split("-");
  const name = FM.getMonthName(monthKey, true);
  const s = data.summary;
  const avgP = FM.metricFormat(s.avgPips ?? 0, "R");
  const avgV = FM.metricFormat(s.avgVPips ?? 0, "R");
  const netP = FM.metricFormat(s.netPips ?? 0, "R");
  const netV = FM.metricFormat(s.netVPips ?? 0, "R");
  
  const header = create("div", { class: "accordion" },
    create("input", { type: "checkbox", id: `${name}-${y}`, class: "accordion-input" }),
    create("label", { for: `${name}-${y}`, class: "accordion-label"},
      create("div", { class: "row" },
        create("div", { class: "cell" }, `${name} ${y}`,
          create("br"),
          create("small", `${s.totalTrades} trades`)
        ),
        create("div", { class: "cell" },
          create("span", { class: `value right ${netP.css}` }, netP.txt,
            create("br"),
            create("small", { class: ``}, avgP.txt)
          ),
          create("span", { class: `value right hidden ${netV.css}` }, netV.txt,
            create("br"),
            create("small", { class: `` }, avgV.txt)
          )
        )
      )
    )
  );
  const body = create("div", { class: "accordion-content pivot pips-mode" });
  const box = create("div", { class: "month-box" });
  const chartAllContainer = create("div", { class: "month-chart" },
    create("canvas", { id: `chart_${monthKey}` })
  );

  const pairBtns = this._buildPairButtons(monthKey, data);

  box.append(chartAllContainer, pairBtns);

  setTimeout(() => this._renderMonthlyChart(monthKey, data.equity), 0);

  body.append(box);
  header.append(body);

  return header;
}

_buildMonthSummary(s) {
  return create("div", { className: "month-summary" },

    // Winrate
    create("div", { className: "sum-line" },
      `Winrate: ${s.winRate}%`
    ),

    // Best Pair
    create("div", { className: "sum-line" },
      `Best Pair: ${s.bestPair ?? "-"}`
    ),

    // Worst Pair
    create("div", { className: "sum-line" },
      `Worst Pair: ${s.worstPair ?? "-"}`
    )
  );
}

_buildPairButtons(monthKey, data) {
  //log(data)
  const wrap = create("div", { class: "pair-filter", dataset: { month: monthKey } });

  // Global caches
  window._monthlyActivePairs ??= {};
  window._monthlyData ??= {};

  // Cache raw month data for merging later
  window._monthlyData[monthKey] = data;

  // Ensure active set exists
  if (!window._monthlyActivePairs[monthKey]) {
    window._monthlyActivePairs[monthKey] = new Set(["ALL"]);
  }

  const activeSet = window._monthlyActivePairs[monthKey];

  // ALL button
  const btnAll = create("button", {
    className: `pair-btn${activeSet.has("ALL") ? " active" : ""}`,
    dataset: { pair: "ALL", month: monthKey }
  }, "ALL");
  wrap.append(btnAll);

  // Pair buttons
  data.pairs.forEach(pair => {
    const b = create("button", {
      className: `pair-btn${activeSet.has(pair) ? " active" : ""}`,
      dataset: { pair, month: monthKey }
    }, pair);
    wrap.append(b);
  });

  // Click handler
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".pair-btn");
    if (!btn) return;

    const pair = btn.dataset.pair;
    const month = btn.dataset.month;

    // Update global active-set + rebuild chart
    this._switchMonthlyDataset(month, pair);

    const active = window._monthlyActivePairs[month];

    // Update UI
    if (active.has("ALL")) {
      wrap.querySelectorAll(".pair-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.pair === "ALL")
      );
    } else {
      wrap.querySelectorAll(".pair-btn").forEach(b => {
        b.classList.toggle("active", active.has(b.dataset.pair));
      });
    }
  });

  return wrap;
}

_renderMonthlyChart(monthKey, data) {
  const canvas = $(`#chart_${monthKey}`);
  if (!canvas) return;
  window._monthlyData ??= {};
  window._monthlyData[monthKey] = window._monthlyData[monthKey] || {};
  window._monthlyData[monthKey].allCurve = data;
  window._monthlyActivePairs ??= {};
  window._monthlyActivePairs[monthKey] ??= new Set(["ALL"]);

  const A1 = "#089981";
  const B1 = "#f23645";
  const realData = data.p.map(x => x.equity);
  const zeroData = [0, ...realData];
  const labels = zeroData.map((_, i) => i);
  const monthlyCfg = {
    type: "line",
    data: {
      labels,
      // datasets: [
      //     {
      //       label: "pips",
      //       data: pips,
      //       borderWidth: 1,
      //       pointRadius: 0,
      //       hoverRadius: 1,
      //       tension: 0,
      //     },
      //     {
      //       label: "value",
      //       data: vpips,
      //       borderWidth: 1,
      //       pointRadius: 0,
      //       hoverRadius: 1,
      //       tension: 0,
      //     }
      //   ],
      datasets: [{
        label: "ALL",
        data: zeroData,
        // segment: {
        //   borderColor: ctx => (ctx.p0.parsed.y >= 0 ? A1 : B1)
        // },
        fill: false,
        backgroundColor: undefined,
        borderWidth: 1,
        tension: 0,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      crosshair: { enabled: true },
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        tooltip: {
          enabled: true,
          cornerRadius: 0,
          titleFont: { size: 10 },
          bodyFont: { size: 10 },
          displayColors: false,
          intersect: false,
          callbacks: {
            title: (ctx) => {
              const i = ctx[0].dataIndex;
              if (i === 0) return "Begin at 0";
              const realIndex = i - 1;
              const a = data.p[realIndex]
              return `#${realIndex + 1} | ${a.date} | ${a.value >= 0 ? "🟢" : "🔴"}`;
            },
            label: (ctx) => {
              const i = ctx.dataIndex;
              if (i === 0) return "";
              const realIndex = i - 1;
              const a = data.p[realIndex];
              return `${a.pair} | ${FM.num(a.value)}`;
            }
          }
        },
  
        legend: { display: false },
  
        annotation: {
          annotations: {
            zeroLine: {
              type: 'line',
              yMin: 0,
              yMax: 0,
              borderColor: 'gray',
              borderWidth: 1,
              borderDash: [5, 5],
            }
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          grid: { display: false },
          ticks: { display: true },
        },
        y: {
          grid: { display: false },
          ticks: { display: true },
          beginAtZero: true
        }
      },
      segmentColor: { enabled: true, above: A1, below: B1 },
      
    }
  };

  window._monthlyCharts ??= {};
  window._monthlyCharts[monthKey] = new Chart(canvas, monthlyCfg);
}

_switchMonthlyDataset(monthKey, pair) {
  const chart = window._monthlyCharts?.[monthKey];
  const monthCache = window._monthlyData?.[monthKey];
  if (!chart || !monthCache) return;

  window._monthlyActivePairs ??= {};
  const activeSet = window._monthlyActivePairs[monthKey] ?? new Set(["ALL"]);

  if (pair === "ALL") {
    window._monthlyActivePairs[monthKey] = new Set(["ALL"]);
  } else {
    // ensure set exists and remove ALL fallback
    if (!window._monthlyActivePairs[monthKey] || window._monthlyActivePairs[monthKey].has("ALL")) {
      window._monthlyActivePairs[monthKey] = new Set();
    }

    const set = window._monthlyActivePairs[monthKey];
    if (set.has(pair)) set.delete(pair);
    else set.add(pair);

    if (set.size === 0) {
      window._monthlyActivePairs[monthKey] = new Set(["ALL"]);
    } else {
      // optimization: if selected equals all available pairs -> collapse to ALL
      const available = (monthCache.pairs ?? []).slice().sort();
      const selected = [...window._monthlyActivePairs[monthKey]].slice().sort();
      if (selected.length === available.length && selected.every((v,i) => v === available[i])) {
        window._monthlyActivePairs[monthKey] = new Set(["ALL"]);
      }
    }
  }

  const newSet = window._monthlyActivePairs[monthKey];

  let finalCurve;
  if (newSet.has("ALL")) {
    finalCurve = monthCache.allCurve; // { p:[], v:[] }
  } else {
    // build merged curve from selected pairs using byPair curves
    finalCurve = this._buildMergedCurveFromPairs(monthCache, [...newSet]);
  }
  
  // write single dataset to chart
  const label = newSet.has("ALL") ? "ALL" : [...newSet].join(" + ");
  const labels = finalCurve.p.map((_, i) => i);
  const realData = finalCurve.p.map(x => x.equity);
  const zeroData = [0, ...realData];
  chart.data.labels = labels;
  chart.data.datasets = [{
    labels,
    data: zeroData,
    borderWidth: 1,
    pointRadius: 0,
    tension: 0
  }];

  chart.update();
}

_buildMergedCurveFromPairs(monthCache, selectedPairs) {
  const pairCurves = selectedPairs
    .map(p => monthCache.byPair?.[p])
    .filter(Boolean);

  if (!pairCurves.length) return monthCache.allCurve;
  
  const maxLen = Math.max(...pairCurves.map(c => c.p.length));

  let cum = 0;
  const p = [];
  const v = [];

  for (let i = 0; i < maxLen; i++) {
    let sumIncP = 0;
    let sumIncV = 0;
    let dateAtIndex = null;

    for (const c of pairCurves) {
      const curP = c.p[i];
      const prevP = c.p[i - 1];
      if (curP) {
        const inc = curP.equity - (prevP ? prevP.equity : 0);
        sumIncP += inc;
        if (!dateAtIndex && curP.date) dateAtIndex = curP.date;
      }

      const curV = c.v[i];
      const prevV = c.v[i - 1];
      if (curV) {
        const incV = curV.equity - (prevV ? prevV.equity : 0);
        sumIncV += incV;
      }
    }

    cum += sumIncP;

    p.push({
      equity: cum,
      date: dateAtIndex,
      value: sumIncP
    });

    v.push({
      equity: cum, // keep same equity for v axis if you want, or compute separately
      date: dateAtIndex,
      value: sumIncV
    });
  }

  return { p, v };
}

}