// ~/helpers/chart_renderer.js
import { $, $$, _on, _ready, log } from "../helpers/shortcut.js";
import * as FM from "../helpers/formatter.js";

window._charts = {};
const equityContainer = $('#equity-chart-container');
const equityCanvas = $('#equity-chart').getContext('2d');
const handleResizer = equityContainer.querySelector('.resizer');
const pairsCanvas = $('#pairs-chart').getContext('2d');

export function renderPairsChart(stats) {
  if (window._charts.pairs) window._charts.pairs.destroy();
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


export function renderEquityChart(data) {
  //log(data.pips)
  //console.log(JSON.stringify(data.pips, null, 2));
  if (window._charts.equity) window._charts.equity.destroy();
  
  const labels = data.pips.map((_, index) => index + 1);
  const equityPips   = data.pips.map(item   => item.graph);
  const equityVPips  = data.vpips.map(item  => item.graph);
  
  const equityChart = new Chart(equityCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Pips",
          data: equityPips,
          borderColor: "#e17055",
          fill: true,
          backgroundColor: "#e1705500",
          pointRadius: 0,
          borderWidth: 1,
          tension: 0.25,
          hoverRadius: 5,
        },
        {
          label: "VPips",
          data: equityVPips,
          borderColor: "#10a37f",
          fill: true,
          backgroundColor: "#F4FBFA",
          pointRadius: 0,
          borderWidth: 1,
          tension: 0.25,
          hoverRadius: 5,
        },
      
      ]
    },
    
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      
      plugins: {
        title: {
          display: true,
          text: "Equity Chart"
        },
        tooltip: {
          //mode: 'interpolate',
          intersect: false,
          //displayColors: false,
          callbacks: {
          // Judul: ambil tanggal dari pips (atau vpips, terserah — biasanya sama)
          title: (t) => {
            if (!t.length) return '';
            const i = t[0].dataIndex;
            const dateStr = FM.dateLocal(data.pips[i].date);
            return `Trade #${i + 1} | ${dateStr}`;
          },
    
          // Label per dataset
          label: (context) => {
            const i = context.dataIndex;
            const isPips = context.datasetIndex === 0;
    
            if (isPips) {
              const item = data.pips[i];
              return `P: ${FM.num(item.value)} | ${FM.num(item.graph)}`;
            } else {
              const item = data.vpips[i];
              return `V: ${FM.num(item.value)} | ${FM.num(item.graph)}`;
            }
          },
          footer: (t) => {
            const i = t[0].dataIndex;
            const isWin = data.pips[i].value >= 0 ? '🟢' : '🔴';
            const pair  = data.pips[i].pair;
            const isLong   = data.pips[i].isLong ? "Long" : "Short";
            return `${pair} | ${isLong} | ${isWin}`;
          }
          }
        },
      },
      scales: {
        x: { beginAtZero: true, ticks: { display: false }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { display: false }, grid: { display: false } }
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