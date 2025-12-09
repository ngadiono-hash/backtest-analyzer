// ~/helpers/chart_renderer.js
import { $, $$, create } from "../helpers/template.js";
import * as FM           from "../helpers/converter.js";
import { plugins }       from "../helpers/chart_plugins.js";


Chart.register(...plugins);

export const initChart = (key, canvas, config) => {
  window.charts ??= {};
  if (window.charts[key]) window.charts[key].destroy();
  if (config._height) {
    canvas.canvas.height = config._height;
  }
  window.charts[key] = new Chart(canvas, config);
  return window.charts[key];
};

export function lineChartControl(container) {
  const opt = { tooltip: true, zoom: false };
  const wrap = create("div", { class: "chart-options" });
  wrap.append(
    create("label", {}, 
      "Tooltip ",
      create("input", { type: "checkbox", checked: true, class: "toggleTooltip" })
    ),
    create("label", {}, 
      "Zoom ",
      create("input", { type: "checkbox", class: "toggleZoom" })
    ),
    create("button", { class: "reset" }, "Reset")
  );
  container.prepend(wrap);
  return opt;
}

export function bindChartControl(container, chart) {
  container.addEventListener("change", (e) => {
    
    if (e.target.matches(".toggleTooltip")) {
      const enabled = e.target.checked;
      chart.options.plugins.tooltip.enabled = enabled;
      chart.options.crosshair.enabled = enabled;
      chart.update("none");
    }

    if (e.target.matches(".toggleZoom")) {
      const enabled = e.target.checked;
      const zoom = chart.options.plugins.zoom;
      zoom.pan.enabled = enabled;
      zoom.zoom.wheel.enabled = enabled;
      zoom.zoom.pinch.enabled = enabled;
      chart.update("none");
    }
  });

  $(".reset", container)?.addEventListener("click", () => {
    chart.resetZoom("active");

    // reset chart config
    chart.options.plugins.tooltip.enabled = false;
    chart.options.plugins.zoom.pan.enabled = false;
    chart.options.plugins.zoom.zoom.wheel.enabled = false;
    chart.options.plugins.zoom.zoom.pinch.enabled = false;
    chart.options.crosshair.enabled = false;

    // reset UI
    $(".toggleTooltip", container).checked = true;
    $(".toggleZoom", container).checked   = false;

    chart.update("none");
  });
}

/* === R E S I Z E R */
export function resizeConfig(container, chart) {
  container.append(create("div", { class: "resizer"}));
  const handle = container.querySelector('.resizer');
  
  window.charts.equityObserver?.disconnect();
  window.charts.equityResizeCleanup?.();
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
  window.charts.equityResizeCleanup = _enableResize(container, handle, chart);
}
function _enableResize(container, handle, chart) {
  let startY = 0, startHeight = 0;
  const minHeight = 150;
  const getY = (e) => (e.touches ? e.touches[0].clientY : e.clientY);

  function dragStart(e) {
    e.preventDefault();
    startY = getY(e);
    startHeight = container.offsetHeight;

    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", dragStop);
    document.addEventListener("touchmove", dragMove, { passive: false });
    document.addEventListener("touchend", dragStop);
  }

  function dragMove(e) {
    e.preventDefault();
    // guard: jika chart atau canvas sudah tidak valid, stop dan cleanup
    if (!chart || !chart.canvas || !chart.canvas.ownerDocument) {
      dragStop();
      return;
    }

    const newHeight = Math.max(minHeight, startHeight + (getY(e) - startY));
    container.style.height = newHeight + "px";
    // guard sebelum resize
    if (typeof chart.resize === 'function') chart.resize();
  }

  function dragStop() {
    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", dragStop);
    document.removeEventListener("touchmove", dragMove);
    document.removeEventListener("touchend", dragStop);
  }

  handle.addEventListener("mousedown", dragStart);
  handle.addEventListener("touchstart", dragStart, { passive: false });

  // kembalikan fungsi cleanup supaya pemanggil bisa memutus listener jika perlu
  return () => {
    try {
      handle.removeEventListener("mousedown", dragStart);
      handle.removeEventListener("touchstart", dragStart);
    } catch (e) {}
    dragStop();
  };
}

// === LINE CHART BUILDER

export function lineChartConfig(src, opt = { tooltip: true, zoom: false }) {
  const labels = src.p.map((_, i) => i + 1);

  // Transform data menjadi object lengkap per titik
  const pips = src.p.map((p, i) => ({
    x: i + 1,
    y: p.equity,
    date: p.date,
    pair: p.pair,
    value: p.value
  }));

  const vpips = src.v.map((v, i) => ({
    x: i + 1,
    y: v.equity,
    date: v.date,
    pair: v.pair,
    value: v.value
  }));
  // Default properties yang sama untuk semua dataset
  const datasetDefaults = {
    tension: 0,
    pointRadius: 0,
    hoverRadius: 0,
    borderWidth: 1,
    fill: false,
    backgroundColor: undefined
  };

  const A1 = "#089981", B1 = "#f23645";
  const A2 = "#36A2EB", B2 = "#FFB60C";

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "pips",
          data: pips,
          segmentColor: { enabled: true, above: A1, below: B1 },
          ...datasetDefaults
        },
        {
          label: "value",
          data: vpips,
          segmentColor: { enabled: true, above: A2, below: B2 },
          ...datasetDefaults
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      crosshair: { enabled: opt.tooltip },

      layout: { padding: { right: 5 } },

      interaction: {
        mode: "index",
        intersect: false
      },

      scales: {

        x: {
          grid: { display: false },
          ticks: {
            display: true,
            autoSkip: true,
            maxTicksLimit: 10,
            callback: (v) => (v === 0 ? "0" : v)
          }
        },

        y: {
          beginAtZero: true,
          grid: { display: false },
          ticks: {
            display: true,
            callback: (v) => FM.num(v, 1)
          }
        }
      },

      plugins: {
        title: {
          display: true,
          text: "Pips vs Value",
          position: "top"
        },

        legend: {
          display: true,
          position: "bottom",
          labels: {
            generateLabels: (chart) => {
              return chart.data.datasets.map((ds, i) => {
                const color = ds.segmentColor?.enabled
                  ? ds.segmentColor.above
                  : ds.borderColor;

                return {
                  text: ds.label,
                  fillStyle: color + "40",
                  strokeStyle: color,
                  lineWidth: ds.borderWidth ?? 1,
                  hidden: !!ds.hidden,
                  datasetIndex: i
                };
              });
            }
          },
          onClick: (evt, item, legend) => {
            const i = item.datasetIndex;
            const chart = legend.chart;
            chart.data.datasets[i].hidden = !chart.data.datasets[i].hidden;
            chart.update();
          }
        },

        // --- Tooltip reading data from dataset ---
        tooltip: {
          enabled: opt.tooltip,
          cornerRadius: 0,
          titleFont: { size: 10 },
          bodyFont: { size: 10 },
          intersect: false,
        
          callbacks: {
            title: (ctx) => {
              const d = ctx[0].raw;
        
              // Jika tidak punya properti data asli → itu inject
              if (!d || d.injected || d.date === undefined) {
                return "#0 | Start";
              }
        
              return `#${ctx[0].dataIndex} | ${d.date} | ${d.pair}`;
            },
        
            label: (ctx) => {
              const d = ctx.raw;
        
              if (!d || d.injected || d.pair === undefined) {
                return "Initial State (0)";
              }
        
              return `${FM.num(d.value)} | ${FM.num(d.y)}`;
            },
        
            labelColor: (ctx) => {
              const d = ctx.raw;
              const ds = ctx.dataset;
        
              // Inject OR missing props → netral
              if (!d || d.injected || d.value === undefined) {
                return {
                  borderColor: "#999",
                  backgroundColor: "#999",
                };
              }
        
              const color = d.value >= 0 ? ds.segmentColor.above : ds.segmentColor.below;
        
              return {
                borderColor: color,
                backgroundColor: color,
              };
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
              borderDash: [5, 5]
            }
          }
        },

        zoom: {
          pan: { enabled: opt.zoom, mode: "x", threshold: 10 },
          zoom: {
            wheel: { enabled: opt.zoom, speed: 0.05 },
            pinch: { enabled: opt.zoom },
            mode: "x"
          }
        }
      }
    }
  };
}

export function lineChartAllPairs(controls, data, chart) {
  controls.addEventListener("click", (e) => {
    
    const btn = e.target.closest(".pair-btn");
    if (!btn) return;

    const pair = btn.dataset.pair;
    const btnAll = controls.querySelector('[data-pair="ALL"]');

    if (pair === "ALL") {
      [...controls.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    } else {
      btn.classList.toggle("active");
      btnAll.classList.remove("active");

      if (_getActivePairs(controls)[0] === "ALL") {
        [...controls.children].forEach(b => b.classList.remove("active"));
        btnAll.classList.add("active");
      }
    }
    const selected  = _getActivePairs(controls);
    const filtered  = _filterStatsByPair(data, selected);
    
    _updateLineChart(chart, filtered);
  });
}

function _getActivePairs(controls) {
  const active = [...$$(".pair-btn.active", controls)]
    .map(b => b.dataset.pair)
    .filter(p => p !== "ALL");
  return active.length ? active : ["ALL"];
}

function _filterStatsByPair(data, selected) {
  // jika ALL dipilih, kita masih kembalikan array penuh,
  // tapi pastikan setiap row punya equity_recalc = row.equity (global)
  if (selected.includes("ALL")) {
    return {
      p: data.p.map(row => ({ ...row, equity_recalc: row.equity })),
      v: data.v.map(row => ({ ...row, equity_recalc: row.equity }))
    };
  }

  // Filter rows by selected pairs (keep original global order)
  const rowsP = data.p.filter(row => selected.includes(row.pair));
  const rowsV = data.v.filter(row => selected.includes(row.pair));

  // Recalculate equity for p (cumulative sum of value)
  let eqP = 0;
  const recalcP = rowsP.map(row => {
    eqP += row.value;
    return {
      ...row,
      equity_recalc: eqP
    };
  });

  // Recalculate equity for v
  let eqV = 0;
  const recalcV = rowsV.map(row => {
    eqV += row.value;
    return {
      ...row,
      equity_recalc: eqV
    };
  });

  return { p: recalcP, v: recalcV };
}
function _updateLineChart(chart, filtered) {
  // jika tidak ada data (filtered.p kosong), isi satu titik baseline saja
  if (!filtered || (!filtered.p?.length && !filtered.v?.length)) {
    chart.data.labels = ["0"];
    chart.data.datasets[0].data = [{ x: 0, y: 0 }];
    chart.data.datasets[1].data = [{ x: 0, y: 0 }];
    chart.update();
    return;
  }

  // Kita pakai index berdasarkan urutan filtered arrays (1..N)
  const labels = filtered.p.map((_, i) => i + 1);
  chart.data.labels = ["0", ...labels];

  const injectPoint = { x: 0, y: 0, injected: true };

  chart.data.datasets[0].data = [
    injectPoint,
    ...filtered.p.map((p, i) => ({
      x: i + 1,
      y: typeof p.equity_recalc === "number" ? p.equity_recalc : null,
      date: p.date,
      pair: p.pair,
      value: p.value
    }))
  ];

  chart.data.datasets[1].data = [
    injectPoint,
    ...filtered.v.map((v, i) => ({
      x: i + 1,
      y: typeof v.equity_recalc === "number" ? v.equity_recalc : null,
      date: v.date,
      pair: v.pair,
      value: v.value
    }))
  ];

  chart.update();
}

export function createHeaderYear(year, monthKeys, stats) {
  let totalTrades = 0, totalNetP = 0, totalNetV = 0;

  monthKeys.forEach(mKey => {
    const s = stats[mKey].summary;
    totalTrades += s.totalTrades;
    totalNetP += s.netPips;
    totalNetV += s.netVPips;
  });

  const avgP = FM.metricFormat(totalNetP / monthKeys.length, "R");
  const avgV = FM.metricFormat(totalNetV / monthKeys.length, "R");
  const netP = FM.metricFormat(totalNetP, "R");
  const netV = FM.metricFormat(totalNetV, "R");

  const section = create("div", { class: "accordion acc-year" },
    create("input", { type: "checkbox", id: `${year}`, class: "accordion-input" }),
    create("label", { for: `${year}`, class: "accordion-label"},
      create("div", { class: "row" },
        create("div", { class: "cell" }, `Year ${year}`,
          create("br"),
          create("small", `${totalTrades} trades`)
        ),
        create("div", { class: "cell txt-r" },
          create("span", { class: `p-mode ${netP.css}` }, "" + netP.txt,
            create("br"),
            create("small", { class: ``}, avgP.txt)
          )
        ),
        create("div", { class: "cell txt-r" },
          create("span", { class: `v-mode ${netV.css}` }, "" + netV.txt,
            create("br"),
            create("small", {class: ``}, avgV.txt)
          )
        ),
        create("div", { class: "cell blank" }, ``)
      )
    )
  );
  return section;
}

export function createHeaderMonth(monthKey, data) {
  const [y, m] = monthKey.split("-");
  const name = FM.getMonthName(monthKey, true);
  const s = data.summary;
  const avgP = FM.metricFormat(s.avgPips, "R");
  const avgV = FM.metricFormat(s.avgVPips, "R");
  const netP = FM.metricFormat(s.netPips, "R");
  const netV = FM.metricFormat(s.netVPips, "R");
  
  const section = create("div", { class: "accordion acc-month" },
    create("input", { type: "checkbox", id: `${name}-${y}`, class: "accordion-input" }),
    create("label", { for: `${name}-${y}`, class: "accordion-label"},
      create("div", { class: "row" },
        create("div", { class: "cell" }, `${name} ${y}`,
          create("br"),
          create("small", `${s.totalTrades} trades`)
        ),
        create("div", { class: "cell txt-r" },
          create("span", { class: `p-mode ${netP.css}` }, netP.txt,
            create("br"),
            create("small", { class: ``}, avgP.txt)
          )
        ),
        create("div", { class: "cell txt-r" },
          create("span", { class: `v-mode ${netV.css}` }, netV.txt,
            create("br"),
            create("small", { class: `` }, avgV.txt)
          )
        ),
        create("div", { class: "cell blank" }, ``)
      )
    )
  );
  
  return section;
}