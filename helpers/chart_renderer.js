import { $, $$, _on, _ready, num } from "../helpers/shortcut.js";
window._charts = {};
const equityContainer = $('#equity-chart-container');
const equityCanvas = $('#equity-chart').getContext('2d');
const handleResizer = equityContainer.querySelector('.resizer');
const pairsCanvas = $('#pairs-chart').getContext('2d');

export function renderPairsChart(stats) {
  if (window._charts.pairs) window._charts.pairs.destroy();
  //const labels = list.map( d => `${d.pair} (${d.deals} Deals): ${d.value.toLocaleString()}`);
  const labels = stats.map(d => `${d.pair}`);
  
  const values = stats.map(d => d.value);
  const colors = values.map(v => (v >= 0 ? '#1d4ed8' : '#dc2626'));
  
  const pairsChart = new Chart(pairsCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 0,
        // borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: { ticks: { display: true }, grid: { display: false } },
        y: { ticks: { display: true }, grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    }
  });
  window._charts.pairs = pairsChart;
}

// =======================================================
// RENDER CHART
// =======================================================
export function renderEquityChart(curve) {
  if (window._charts.equity) window._charts.equity.destroy();
  
  const labels = curve.map(p => p.barIndex);
  const equity = curve.map(p => p.equity);
  const equityChart = new Chart(equityCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Pips Curve",
        data: equity,
        borderColor: "#10a37f",
        fill: true,
        backgroundColor: "#F4FBFA",
        pointRadius: 0,
        borderWidth: 1,
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
          enabled: true,
          displayColors: false,
          callbacks: {
            title: (ctx) => {
              const i = ctx[0].dataIndex;
              return `#${curve[i].tradeIndex ?? i + 1} | ${curve[i].date}`;
            },
            label: (ctx) => {
              const i = ctx.dataIndex;
              const p = curve[i];
              const sym = p.pips >= 0 ? '🟢' : '🔴';
              return [
                `${p.type == 'Buy' ? 'Long' : 'Short'} ${p.pair}`,
                `${num(p.pips,1)} ${sym} ${num(p.equity,1)}`,
              ];
            },
            bodyFont: {size : 10}
          }
        }
      },
      
      scales: {
        x: { ticks: { display: false }, grid: { display: false } },
        y: { ticks: { display: false }, grid: { display: false } }
      }
    }
  });
  
  window._charts.equity = equityChart;
  const observer = new ResizeObserver(() => equityChart.resize());
  observer.observe(equityContainer);
  enableResize(equityContainer, handleResizer, equityChart);
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