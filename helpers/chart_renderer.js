// =======================================================
// ELEMENT & CONTEXT
// =======================================================
const container = document.getElementById('chart-container');
const ctx = document.getElementById('chart-equity').getContext('2d');
const handle = container.querySelector('.resizer');


// =======================================================
// CUSTOM TOOLTIP (TradingView Style)
// =======================================================
function customTooltip(context) {
  const { chart, tooltip } = context;
  const canvas = chart.canvas;

  // Create tooltip element if not exist
  let tooltipEl = document.getElementById("chartjs-tooltip");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-tooltip";

    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0,0,0,0.85)",
      color: "white",
      padding: "8px 10px",
      borderRadius: "6px",
      pointerEvents: "none",
      fontSize: "12px",
      opacity: 0,
      transition: "opacity 0.1s ease-out",
      whiteSpace: "nowrap",
      zIndex: 1000,
    });

    document.body.appendChild(tooltipEl);
  }

  // Hide when invisible
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  // Tooltip content
  const point = tooltip.dataPoints[0];
  const label = point.label;
  const val = point.formattedValue;

  tooltipEl.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:11px; opacity:0.8">Trade ${label}</div>
      <div style="margin-top:2px;">
        <span style="color:#10a37f;">●</span> <b>${val}%</b>
      </div>
    </div>
  `;

  // Base position
  const rect = canvas.getBoundingClientRect();
  const tooltipWidth = tooltipEl.offsetWidth;
  const tooltipHeight = tooltipEl.offsetHeight;

  let left = rect.left + window.pageXOffset + tooltip.caretX + 15;
  let top = rect.top + window.pageYOffset + tooltip.caretY - 20;

  // ========= SMART RESPONSIVE AUTO-FLIP =========

  // 1. Right overflow → flip to left
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = rect.left + window.pageXOffset + tooltip.caretX - tooltipWidth - 15;
  }

  // 2. Left overflow → clamp
  if (left < 10) {
    left = 10;
  }

  // 3. Top overflow → place under cursor
  if (top < 10) {
    top = rect.top + window.pageYOffset + tooltip.caretY + 20;
  }

  // 4. Bottom overflow → clamp to screen bottom
  if (top + tooltipHeight > window.innerHeight - 10) {
    top = window.innerHeight - tooltipHeight - 10;
  }

  // Apply final position
  tooltipEl.style.left = left + "px";
  tooltipEl.style.top = top + "px";
  tooltipEl.style.opacity = 1;
}


// =======================================================
// RENDER CHART
// =======================================================
export function renderChart(curve) {
  // Destroy chart if exists
  if (!window._charts) window._charts = {};
  if (window._charts.equity) window._charts.equity.destroy();

  const labels = curve.map(p => p.barIndex);
  const equity = curve.map(p => p.equity);

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Equity Curve",
        data: equity,
        borderColor: "#10a37f",
        fill: true,
        backgroundColor: "#F4FBFA",
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.25,
        hoverRadius: 5,
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false,
      },

      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: customTooltip,
        }
      },

      scales: {
        x: { ticks: { display: false }, grid: { display: false } },
        y: { ticks: { display: false }, grid: { display: false } }
      }
    }
  };

  const _chart = new Chart(ctx, config);
  window._charts.equity = _chart;

  // Observer → selalu resize saat container berubah
  const observer = new ResizeObserver(() => _chart.resize());
  observer.observe(container);

  // Aktifkan drag-to-resize
  enableResize(container, handle, _chart);
}


// =======================================================
// DRAG RESIZER — REFAC (Mobile + Desktop)
// =======================================================
function enableResize(container, handle, chartInstance) {
  let startY = 0;
  let startHeight = 0;

  const minHeight = 150;

  const getY = (e) => (e.touches ? e.touches[0].clientY : e.clientY);

  function start(e) {
    e.preventDefault();
    startY = getY(e);
    startHeight = container.offsetHeight;

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);

    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", stop);
  }

  function move(e) {
    e.preventDefault();
    const currentY = getY(e);

    let newHeight = startHeight + (currentY - startY);
    if (newHeight < minHeight) newHeight = minHeight;

    container.style.height = newHeight + "px";

    chartInstance.resize();
  }

  function stop() {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", stop);

    document.removeEventListener("touchmove", move);
    document.removeEventListener("touchend", stop);
  }

  handle.addEventListener("mousedown", start);
  handle.addEventListener("touchstart", start, { passive: false });
}