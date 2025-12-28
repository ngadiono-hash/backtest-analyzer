// ~src/views/builders/chart_builder.js
import { $, $$, create } from "util/template.js";
import * as FM           from "util/formatter.js";
import { plugins }       from "builder/chart_plugins.js";

Chart.register(...plugins);

/* === R E S I Z E R */

export function resizeConfig(container, chart) {
  const handle = create("div", { class: "resizer" });
  container.append(handle);

  chart.equityObserver?.disconnect();
  chart.equityResizeCleanup?.();

  let raf;
  const observer = new ResizeObserver(() => {
    if (!chart?.canvas) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => chart.resize());
  });

  observer.observe(container);
  chart.equityObserver = observer;
  chart.equityResizeCleanup = enableResize(container, handle, chart);
}

function enableResize(container, handle, chart) {
  const MIN = 150;
  let startY = 0, startH = 0;

  const y = e => (e.touches?.[0] || e).clientY;

  const stop = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", stop);
    document.removeEventListener("touchmove", move);
    document.removeEventListener("touchend", stop);
  };

  const move = e => {
    e.preventDefault();
    if (!chart?.canvas?.ownerDocument) return stop();

    container.style.height =
      Math.max(MIN, startH + y(e) - startY) + "px";

    chart.resize?.();
  };

  const start = e => {
    e.preventDefault();
    startY = y(e);
    startH = container.offsetHeight;

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", stop);
  };

  handle.addEventListener("mousedown", start);
  handle.addEventListener("touchstart", start, { passive: false });

  return () => {
    handle.removeEventListener("mousedown", start);
    handle.removeEventListener("touchstart", start);
    stop();
  };
}

// === LINE CHART BUILDER

export function lineChartConfig(src) {
  const A1 = "#089981", B1 = "#f23645";
  const A2 = "#36A2EB", B2 = "#FFB60C";
  const datasetDefaults = {
    tension: 0,
    pointRadius: 0,
    hoverRadius: 0,
    borderWidth: 1,
    fill: false,
    backgroundColor: undefined
  };
  const pips = [
    { x: 0, y: 0, time: null, pair: null, result: 0, __init: true },
    ...src.p.map((d, i) => ({
      x: i + 1,
      y: d.equity,
      time: FM.dateDMY(d.time),
      pair: d.pair,
      result: d.result
    }))
  ];
  const value = [
    { x: 0, y: 0, time: null, pair: null, result: 0, __init: true },
    ...src.v.map((d, i) => ({
      x: i + 1,
      y: d.equity,
      time: FM.dateDMY(d.time),
      pair: d.pair,
      result: d.result
    }))
  ];

  return {
    type: "line",
    data: {
      datasets: [
        {
          label: "pips",
          data: pips,
          segmentColor: { enabled: true, above: A1, below: B1 },
          ...datasetDefaults
        },
        {
          label: "value",
          data: value,
          segmentColor: { enabled: true, above: A2, below: B2 },
          ...datasetDefaults
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      crosshair: { enabled: true },
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        x: {
          type: "linear",
          grace: 0,
          bounds: "data",
          grid: { display: true },
          ticks: {
            callback(v, _, ticks) {
              const max = this.max ?? ticks.at(-1).value;
              return v === max ? v : null;
            }
            // callback(value, index, ticks) {
            //   const last = ticks.at(-1)?.value;
            //   if (value !== last && Math.abs(last - value) < 4) return "";
            //   return value;
            // }
          }
        },
        y: {
          beginAtZero: true,
          grid: { display: false },
          ticks: {
            display: true,
            callback(v, _, ticks) {
              const max = this.max ?? ticks.at(-1).value;
              return v === 0 || v === max ? FM.num(v) : null;
            }
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
        tooltip: {
          enabled: true,
          intersect: false,
          cornerRadius: 0,
          titleFont: { size: 10 },
          bodyFont: { size: 10 },
          callbacks: {
            title(ctx) {
              const d = ctx[0]?.raw;
              if (!d || d.__init) return "Initial State";
              return `${d.pair} | ${d.time}`;
            },
        
            label(ctx) {
              const d = ctx.raw;
              if (!d || d.__init) return null;
              return `${FM.num(d.result)} | ${FM.num(d.y)}`;
            },
        
            labelColor(ctx) {
              const d = ctx.raw;
              if (!d || d.__init) return null;
            
              const ds = ctx.dataset;
              const color = d.result >= 0
                ? ds.segmentColor.above
                : ds.segmentColor.below;
            
              return {
                borderColor: color,
                backgroundColor: color
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

      }
    }
  };
}

export function createHeaderYear(year, y) {
  return buildHeader({
    accClass: "acc-year",
    id: String(year),
    title: `Year ${year}`,
    tradeCount: y.tCount,
    netP: FM.metricFormat(y.netP, "R"),
    avgP: FM.metricFormat(y.avgP, "R"),
    netV: FM.metricFormat(y.netV, "R"),
    avgV: FM.metricFormat(y.avgV, "R")
  });
}

export function createHeaderMonth(monthYear, monthData) {
  const [year] = monthYear.split("-");
  const name = FM.getMonthName(monthYear);
  const m = monthData.summary;

  return buildHeader({
    accClass: "acc-month",
    id: `${name}-${year}`,
    title: `${name} ${year}`,
    tradeCount: m.tCount,
    netP: FM.metricFormat(m.netP, "R"),
    avgP: FM.metricFormat(m.avgP, "R"),
    netV: FM.metricFormat(m.netV, "R"),
    avgV: FM.metricFormat(m.avgV, "R")
  });
}

function buildHeader({ accClass,id,title,tradeCount,netP,avgP,netV,avgV }) {
  return create("div", { class: `accordion ${accClass}` },
    create("input", { type: "checkbox", id, class: "accordion-input" }),
    create("label", { for: id, class: "accordion-label" },
      create("div", { class: "row" },
        create("div", { class: "cell cell-title" },
          title,
          create("br"),
          create("small", `${tradeCount} trades`)
        ),
        metricCell("p-mode", netP, avgP),
        metricCell("v-mode", netV, avgV),
        create("div", { class: "cell blank" })
      )
    )
  );
}

const metricCell = (mode, net, avg) =>
  create("div", { class: "cell txt-r" },
    create("span", { class: `${mode} ${net.css}` },
      net.txt,
      create("br"),
      create("small", avg.txt)
    )
  );