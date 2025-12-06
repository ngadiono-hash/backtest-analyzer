// ~/helpers/chart_renderer.js
import { $, $$, create } from "../helpers/template.js";
import * as FM from "../helpers/converter.js";

export const initChart = (key, canvas, config) => {
  window.charts ??= {};
  if (window.charts[key]) window.charts[key].destroy();
  if (config._height) {
    canvas.canvas.height = config._height;
  }
  window.charts[key] = new Chart(canvas, config);
  return window.charts[key];
};

export function chartControl(container, chart) {
  const userOptions = { tooltip: false, zoom: false };
  container.prepend(create("div", { class: "chart-options" },
      create("label", { textContent: "Tooltip " },
        create("input", { type: "checkbox", id: "toggleTooltip" })
      ),
      create("label", { textContent: "Zoom "},
        create("input", { type: "checkbox", id: "toggleZoom" })
      )
  ));
  
  const bindControl = (selector, callback) => {
    const el = $(selector);
    if (el) el.addEventListener("change", callback);
  };
  $("#reset")?.addEventListener("click", () => {
    chart.resetZoom("active");
    userOptions.tooltip = false;
    userOptions.zoom = false;
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
  return userOptions;
}

/* === R E S I Z E R */
export function enableResize(container, handle, chart) {
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


/* === CUSTOM PLUGIN */
const segmentColorPlugin = {
  id: "segmentColor",
  afterDatasetsDraw(chart, args, opts) {
    const ctx = chart.ctx;
    const ds = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);

    const yScale = chart.scales.y;
    const zeroY = yScale.getPixelForValue(0);

    const points = meta.data;
    const values = ds.data;

    ctx.save();
    ctx.lineWidth = ds.borderWidth || 2;

    // PATH atas dan bawah terpisah
    const pathAbove = new Path2D();
    const pathBelow = new Path2D();

    const moveTo = (path, x, y) => path.moveTo(x, y);
    const lineTo = (path, x, y) => path.lineTo(x, y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const y0 = values[i];
      const y1 = values[i + 1];

      const v0 = p0.y;
      const v1 = p1.y;

      const crossing = (y0 >= 0 && y1 < 0) || (y0 < 0 && y1 >= 0);

      if (!crossing) {
        const target = y0 >= 0 ? pathAbove : pathBelow;
        if (i === 0) moveTo(target, p0.x, v0);
        lineTo(target, p1.x, v1);

        continue;
      }

      // ---- CROSSING ----
      // hitung breakpoint interpolasi
      const t = y0 / (y0 - y1);
      const xMid = p0.x + (p1.x - p0.x) * t;

      // pixel Y titik potong = zeroY

      // Segmen 1 (p0 → mid)
      const seg1 = y0 >= 0 ? pathAbove : pathBelow;
      if (i === 0) moveTo(seg1, p0.x, v0);
      lineTo(seg1, xMid, zeroY);

      // Segmen 2 (mid → p1)
      const seg2 = y1 >= 0 ? pathAbove : pathBelow;
      moveTo(seg2, xMid, zeroY);
      lineTo(seg2, p1.x, v1);
    }

    // ---- Close BOTH area paths ke baseline ----
    const lastX = points[points.length - 1].x;

    // Above
    pathAbove.lineTo(lastX, zeroY);
    pathAbove.lineTo(points[0].x, zeroY);
    pathAbove.closePath();

    // Below
    pathBelow.lineTo(lastX, zeroY);
    pathBelow.lineTo(points[0].x, zeroY);
    pathBelow.closePath();

    // ---- Fill masing-masing path ----
    ctx.fillStyle = "rgba(8,153,129,0.25)";
    ctx.fill(pathAbove);

    ctx.fillStyle = "rgba(242,54,69,0.25)";
    ctx.fill(pathBelow);

    // Draw garis ================================
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const v0 = values[i];
      const v1 = values[i + 1];
      const crossing = (v0 >= 0 && v1 < 0) || (v0 < 0 && v1 >= 0);

      if (!crossing) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = v0 >= 0 ? "#089981" : "#f23645";
        ctx.stroke();
        continue;
      }

      const t = (0 - v0) / (v1 - v0);
      const xMid = p0.x + (p1.x - p0.x) * t;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(xMid, zeroY);
      ctx.strokeStyle = v0 >= 0 ? "#089981" : "#f23645";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xMid, zeroY);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = v1 >= 0 ? "#089981" : "#f23645";
      ctx.stroke();
    }

    ctx.restore();
  }
};

const DEFAULT_CROSSHAIR = {
  enabled: true,
  color: 'rgba(0, 0, 0, 0.3)',
  labelBg: 'rgba(0, 0, 0, 0.8)',
  enableX: true,
  enableY: true,
  lineStyle: 'solid'
};
export const customCrosshairPlugin = {
  id: 'customCrosshair',

  afterEvent(chart, args) {
    const opts = {
      ...DEFAULT_CROSSHAIR,
      ...(chart.options.customCrosshair || {})
    };
    if (!opts?.enabled) return;

    const e = args.event;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    
    if (e.type === 'mousemove') {
      const datasetsCount = chart.data.datasets.length;
    
      // -----------------------
      // CASE 1: SINGLE DATASET
      if (datasetsCount === 1) {
        const index = Math.round(xScale.getValueForPixel(e.x));
    
        if (index < 0 || index >= chart.data.labels.length) {
          chart.$crosshair = null;
          return;
        }
    
        const value = chart.data.datasets[0].data[index];
    
        chart.$crosshair = {
          x: xScale.getPixelForValue(index),
          y: yScale.getPixelForValue(value),
          datasetIndex: 0,
          index,
          value
        };
    
        return; // penting!
      }
    
      // -----------------------
      // CASE 2: MULTI DATASET
      const points = chart.getElementsAtEventForMode(
        e,
        'nearest',
        { intersect: false },
        false
      );
    
      if (!points.length) {
        chart.$crosshair = null;
        return;
      }
    
      const { datasetIndex, index } = points[0];
      const value = chart.data.datasets[datasetIndex].data[index];
    
      chart.$crosshair = {
        x: xScale.getPixelForValue(index),
        y: yScale.getPixelForValue(value),
        datasetIndex,
        index,
        value
      };
    }

    if (e.type === 'mouseout') {
      chart.$crosshair = null;
    }
  },

  afterDraw(chart) {
    const opts = {
      ...DEFAULT_CROSSHAIR,
      ...(chart.options.customCrosshair || {})
    };
    if (!opts?.enabled) return;
  
    let pos = null;
    // 1) Jika tooltip aktif → sinkron ke tooltip
    const tip = chart.tooltip;
    if (tip && tip.dataPoints?.length) {
      const p = tip.dataPoints[0];
      const index = p.dataIndex;
      const datasetIndex = p.datasetIndex;
  
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      const value = chart.data.datasets[datasetIndex].data[index];
  
      pos = {
        x: xScale.getPixelForValue(index),
        y: yScale.getPixelForValue(value),
        index,
        datasetIndex,
        value
      };
  
      // Simpan ke chart untuk konsistensi
      chart.$crosshair = pos;
    }
  
    // 2) Jika tooltip OFF → fallback ke data from afterEvent
    if (!pos) {
      pos = chart.$crosshair;
    }
  
    if (!pos) return;
  
    // 3) Gambar crosshair biasa
    const ctx = chart.ctx;
    const { top, bottom, left, right } = chart.chartArea;
  
    ctx.save();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 1;
  
    // Style garis: solid / dashed
    if (opts.lineStyle === "dashed") {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }
  
    // Horizontal line
    if (opts.enableY) {
      ctx.beginPath();
      ctx.moveTo(left, pos.y);
      ctx.lineTo(right, pos.y);
      ctx.stroke();
    }
  
    // Vertical line
    if (opts.enableX) {
      ctx.beginPath();
      ctx.moveTo(pos.x, top);
      ctx.lineTo(pos.x, bottom);
      ctx.stroke();
    }
  
    // 4) Draw labels (Y & X)
    const yLabelValue = FM.num(chart.scales.y.getValueForPixel(pos.y), 1);
    drawLabel(ctx, yLabelValue, chart.scales.y.left, pos.y, opts.labelBg, false);
  
    const xLabel = chart.data.labels[pos.index] ?? "";
    drawLabel(ctx, xLabel, pos.x, bottom, opts.labelBg, true);
  
    ctx.restore();
  
    // Helper: Draw label box
    function drawLabel(ctx, text, x, y, bg, center = false) {
      const pad = 4;
      ctx.font = "12px sans-serif";
      const w = ctx.measureText(text).width + pad * 2;
      const h = 18;
  
      ctx.fillStyle = bg;
  
      if (center) {
        ctx.fillRect(x - w / 2, y, w, h);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x, y + h / 2);
      } else {
        ctx.fillRect(x, y - h / 2, w, h);
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + pad, y);
      }
    }
  }

};

Chart.register(segmentColorPlugin, customCrosshairPlugin);
