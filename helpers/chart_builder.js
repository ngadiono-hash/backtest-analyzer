// ~/helpers/chart_renderer.js
import { $, $$, create } from "../helpers/template.js";
import * as FM from "../helpers/converter.js";

window._charts = {};
const overView = $("#overview");
const c = create("div", { className: "chart-wrapper", id: "equity-chart-container" },
    create("canvas", { id: `equity-chart` }),
    create("div", { className: "resizer"}));
const d = create("div", { className: "chart-container" },
    create("canvas", { id: `pairs-chart` }));
overView.append(c, d);

const ctrT = create("label", {textContent: "Tooltip"},
  create("input", { type: "checkbox", id: "toggleTooltip" }));
const ctrZ = create("label", {textContent: "Zoom"},
  create("input", { type: "checkbox", id: "toggleZoom" }));

const equityContainer = $('#equity-chart-container');
equityContainer.append(ctrT, ctrZ);
const equityCanvas    = $('#equity-chart').getContext('2d');
const pairsCanvas     = $('#pairs-chart').getContext('2d');
const handleResizer   = equityContainer.querySelector('.resizer');

const initChart = (key, canvas, config) => {
  if (window._charts[key]) window._charts[key].destroy();
  if (config._height) {
    canvas.canvas.height = config._height;
  }
  window._charts[key] = new Chart(canvas, config);
  return window._charts[key];
};

const DEFAULT_OPTIONS = { tooltip: false, zoom: false };

export function renderEquityChart(data, userOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...userOptions };

  // ── DATA PREPARATION ─────────────────────────────────────
  const labels = data.p.map((_, i) => i + 1);
  const pips   = data.p.map(p  => p.equity);
  const vpips  = data.v.map(v => v.equity);

  // ── CHART CONFIG ─────────────────────────────────────────
  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "pips",
          data: pips,
          yAxisID: "y",
          borderWidth: 1.5,
          pointRadius: 0,
          hoverRadius: 6,
          tension: 0.25,
        },
        {
          label: "value pips",
          data: vpips,
          yAxisID: "y",
          borderWidth: 1.5,
          pointRadius: 0.1,
          hoverRadius: 6,
          tension: 0.25,          
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false }
        },
        y: {
          position: "right",
          beginAtZero: true,
          grid: {
            color: "rgba(255,255,255,0.08)",
            drawOnChartArea: false,
            drawTicks: true
          },
          ticks: {
            display: true,
            color: "#aaa",
            callback: value => FM.num(value, 0)
          }
        }
      },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          enabled: opts.tooltip,
          intersect: false,
          callbacks: {
            title: (items) => {
              const i = items?.[0]?.dataIndex ?? 0;
              return `#${i + 1} | ${FM.dateLocal(data.p[i].date)}`;
            },
            label: (ctx) => {
              const i = ctx.dataIndex;
              const src = ctx.datasetIndex === 0 ? data.p[i] : data.v[i];
              return `${FM.num(src.value)} | ${FM.num(src.equity)}`;
            },
            footer: (items) => {
              const i = items[0].dataIndex;
              const p = data.p[i];
              return `${p.pair} | ${p.isLong ? "Long" : "Short"} | ${p.value >= 0 ? "🟢" : "🔴"}`;
            }
          }
        },
        zoom: {
          pan: {
            enabled: opts.zoom,
            mode: "x",
            threshold: 10
          },
          zoom: {
            wheel:   { enabled: opts.zoom, speed: 0.05 },
            pinch:   { enabled: opts.zoom },
            mode: "x"
          }
        }
      }
    }
  }

  // ── CREATE / UPDATE CHART ───────────────────────────────
  const chart = initChart("equity", equityCanvas, config);

  // ── EXTERNAL CONTROLS (tombol / checkbox di luar) ───────
  const bindControl = (selector, callback) => {
    const el = $(selector);
    if (el) el.addEventListener("change", callback);
  };
  $("#reset")?.addEventListener("click", () => {
    chart.resetZoom("active");
    DEFAULT_OPTIONS.tooltip = false;
    DEFAULT_OPTIONS.zoom = false;
  });
  bindControl("#toggleTooltip", e => {
    chart.options.plugins.tooltip.enabled = e.target.checked;
    chart.update("none");
  });
  bindControl("#toggleZoom", e => {
    const enabled = e.target.checked;
    chart.options.plugins.zoom.pan.enabled = enabled;
    chart.options.plugins.zoom.zoom.wheel.enabled = enabled;
    chart.options.plugins.zoom.zoom.pinch.enabled = enabled;
    chart.update("none");
  });

  // ── CLEANUP PREVIOUS OBSERVERS ──────────────────────────
  window._charts.equityObserver?.disconnect();
  window._charts.equityResizeCleanup?.();

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

  resizeObserver.observe(equityContainer);
  window._charts.equityObserver = resizeObserver;
  window._charts.equityResizeCleanup = enableResize(equityContainer, handleResizer, chart);

  return chart;
}

export function renderPairsChart(data, sortBy = "vpips") {
  if (sortBy === "pips") {
    data = [...data].sort((a, b) => b.pips - a.pips);
  } else if (sortBy === "vpips") {
    data = [...data].sort((a, b) => b.vpips - a.vpips);
  }

  const labels = data.map(d => d.pair);

  const config = {
    _height: data.length * 60,
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Pips",  data: data.map(d => d.pips) },
        { label: "VPips", data: data.map(d => d.vpips) }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, grid: { display: false } },
        y: { grid: { display: false } }
      },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${FM.num(ctx.raw)}`
          }
        }
      }
    }
  };

  return initChart("pairs", pairsCanvas, config);
}






/* =======================================================
   R E S I Z E R   (Drag to Resize Chart Container)
   ======================================================= */
// --- GANTI fungsi enableResize agar mengembalikan cleanup function ---
function enableResize(container, handle, chart) {
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