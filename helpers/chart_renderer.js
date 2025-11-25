// ~/helpers/chart_renderer.js
import { $, $$, _on, _ready } from "../helpers/shortcut.js";
import * as FM from "../helpers/formatter.js";

window._charts = {};

// DOM refs
const equityContainer = $('#equity-chart-container');
const equityCanvas    = $('#equity-chart').getContext('2d');
const pairsCanvas     = $('#pairs-chart').getContext('2d');
const handleResizer   = equityContainer.querySelector('.resizer');

// -------------------------------------------------------
// Utility — safely (re)create chart
// -------------------------------------------------------
const initChart = (key, canvas, config) => {
  if (window._charts[key]) window._charts[key].destroy();
  if (config._height) {
    canvas.canvas.height = config._height;
  }
  window._charts[key] = new Chart(canvas, config);
  return window._charts[key];
};

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
      scales: {
        x: { beginAtZero: true, grid: { display: false } },
        y: { grid: { display: false } }
      },
      plugins: {
        //title: { display: true, text: "Net by Symbols" },
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

export function renderEquityChart(data) {

  const labels      = data.pips.map((_, i) => i + 1);
  const equityPips  = data.pips.map(v  => v.graph);
  const equityVPips = data.vpips.map(v => v.graph);

  const config = {
    _height: 400,
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Pips",  data: equityPips,  pointRadius: 0, borderWidth: 1, tension: 0.25, hoverRadius: 5 },
        { label: "VPips", data: equityVPips, pointRadius: 0, borderWidth: 1, tension: 0.25, hoverRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
    
      scales: {
        x: { grid: { display: false }, ticks: { display: false } },
        y: { grid: { display: false }, ticks: { display: true }, beginAtZero: true }
      },
    
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: "xy"   // pan hanya horizontal
          },
          zoom: {
            wheel: {
              enabled: true, // zoom pakai scroll
            },
            pinch: {
              enabled: true  // zoom pakai pinch di layar sentuh
            },
            mode: "xy"       // zoom hanya horizontal
          }
        },
    
        tooltip: {
          intersect: false,
          callbacks: {
            title: (items) => {
              const i = items?.[0]?.dataIndex ?? 0;
              return `#${i + 1} | ${FM.dateLocal(data.pips[i].date)}`;
            },
            label: (ctx) => {
              const i = ctx.dataIndex;
              const src = ctx.datasetIndex === 0 ? data.pips[i] : data.vpips[i];
              return `${ctx.dataset.label[0]}: ${FM.num(src.value)} | ${FM.num(src.graph)}`;
            },
            footer: (items) => {
              const i = items[0].dataIndex;
              const p = data.pips[i];
              return `${p.pair} | ${p.isLong ? "Long" : "Short"} | ${p.value >= 0 ? "🟢" : "🔴"}`;
            }
          }
        }
      }
    }
  }

  const chart = initChart("equity", equityCanvas, config);

  // cleanup observer / resize
  if (window._charts.equityObserver) {
    window._charts.equityObserver.disconnect();
    delete window._charts.equityObserver;
  }
  if (window._charts.equityResizeCleanup) {
    window._charts.equityResizeCleanup();
    delete window._charts.equityResizeCleanup;
  }

  // observer baru
  const observer = new ResizeObserver(() => {
    if (!chart?.canvas?.ownerDocument) return;
    chart.resize();
  });
  observer.observe(equityContainer);
  window._charts.equityObserver = observer;

  window._charts.equityResizeCleanup = enableResize(equityContainer, handleResizer, chart);

  return chart;
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