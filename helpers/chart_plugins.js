import * as FM from "../helpers/converter.js";

const DEFAULT_SEGMENT = { enabled: false, above: "#089981", below: "#f23645" };
const segmentColorPlugin = {
  id: "segmentColor",
  afterDatasetsDraw(chart, args) {

    chart.data.datasets.forEach((ds, i) => {
      const cfg = {
        ...DEFAULT_SEGMENT,
        ...chart.options.segmentColor || {},
        ...ds.segmentColor || {}
      };

      if (!cfg.enabled) return;

      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(i);

      const { top, bottom } = chart.chartArea;
      const yScale = chart.scales.y;
      const zeroY = yScale.getPixelForValue(0);

      const points = meta.data;
      const values = ds.data;

      ctx.save();
      ctx.lineWidth = ds.borderWidth || 2;

      const pathAbove = new Path2D();
      const pathBelow = new Path2D();

      const moveTo = (p, x, y) => p.moveTo(x, y);
      const lineTo = (p, x, y) => p.lineTo(x, y);

      // -----------------------
      // BUILD PATH FOR AREA
      // -----------------------
      for (let c = 0; c < points.length - 1; c++) {
        const p0 = points[c];
        const p1 = points[c + 1];
        const y0 = values[c];
        const y1 = values[c + 1];

        const v0 = p0.y;
        const v1 = p1.y;

        const crossing = (y0 >= 0 && y1 < 0) || (y0 < 0 && y1 >= 0);

        if (!crossing) {
          const target = y0 >= 0 ? pathAbove : pathBelow;
          if (c === 0) moveTo(target, p0.x, v0);
          lineTo(target, p1.x, v1);
          continue;
        }

        const t = y0 / (y0 - y1);
        const xMid = p0.x + (p1.x - p0.x) * t;

        const seg1 = y0 >= 0 ? pathAbove : pathBelow;
        if (c === 0) moveTo(seg1, p0.x, v0);
        lineTo(seg1, xMid, zeroY);

        const seg2 = y1 >= 0 ? pathAbove : pathBelow;
        moveTo(seg2, xMid, zeroY);
        lineTo(seg2, p1.x, v1);
      }

      const lastX = points[points.length - 1].x;

      pathAbove.lineTo(lastX, zeroY);
      pathAbove.lineTo(points[0].x, zeroY);
      pathAbove.closePath();

      pathBelow.lineTo(lastX, zeroY);
      pathBelow.lineTo(points[0].x, zeroY);
      pathBelow.closePath();

      // -----------------------
      // GRADIENT FILL
      // -----------------------
      const gradAbove = ctx.createLinearGradient(0, top, 0, zeroY);
      gradAbove.addColorStop(0, cfg.above + "40");
      gradAbove.addColorStop(1, cfg.above + "00");

      const gradBelow = ctx.createLinearGradient(0, zeroY, 0, bottom);
      gradBelow.addColorStop(1, cfg.below + "40");
      gradBelow.addColorStop(0, cfg.below + "00");

      ctx.fillStyle = gradAbove;
      ctx.fill(pathAbove);

      ctx.fillStyle = gradBelow;
      ctx.fill(pathBelow);

      // -----------------------
      // DRAW LINES
      // -----------------------
      for (let c = 0; c < points.length - 1; c++) {
        const p0 = points[c];
        const p1 = points[c + 1];
        const v0 = values[c];
        const v1 = values[c + 1];

        const crossing = (v0 >= 0 && v1 < 0) || (v0 < 0 && v1 >= 0);

        if (!crossing) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = v0 >= 0 ? cfg.above : cfg.below;
          ctx.stroke();
          continue;
        }

        const t = (0 - v0) / (v1 - v0);
        const xMid = p0.x + (p1.x - p0.x) * t;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(xMid, zeroY);
        ctx.strokeStyle = v0 >= 0 ? cfg.above : cfg.below;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(xMid, zeroY);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = v1 >= 0 ? cfg.above : cfg.below;
        ctx.stroke();
      }

      ctx.restore();
    });
  }
};
const DEFAULT_CROSSHAIR = {
  enabled: true,
  color: 'rgba(0, 0, 0, 0.3)',
  labelBg: 'rgba(0, 0, 0, 0.8)',
  enableX: true,
  enableY: true,
  lineStyle: 'dashed'
};
const customCrosshairPlugin = {
  id: 'crosshair',

  afterInit(chart) {
    chart.canvas.addEventListener("mouseleave", () => {
      chart.$crosshair = null;
      chart.draw();
    });
  },

  afterEvent(chart, args) {
    const cfg = {
      ...DEFAULT_CROSSHAIR,
      ...(chart.options.crosshair || {})
    };
    if (!cfg?.enabled) return;

    const e = args.event;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;

    // only track mousemove
    if (e.type !== "mousemove") return;

    const datasetsCount = chart.data.datasets.length;

    // SINGLE DATASET
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

      return;
    }

    // MULTI DATASET
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

  },

  afterDraw(chart) {
    const cfg = {
      ...DEFAULT_CROSSHAIR,
      ...(chart.options.crosshair || {})
    };
    if (!cfg?.enabled) return;
  
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
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1;
  
    // Style garis: solid / dashed
    if (cfg.lineStyle === "dashed") {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }
  
    // Horizontal line
    if (cfg.enableY) {
      ctx.beginPath();
      ctx.moveTo(left, pos.y);
      ctx.lineTo(right, pos.y);
      ctx.stroke();
    }
  
    // Vertical line
    if (cfg.enableX) {
      ctx.beginPath();
      ctx.moveTo(pos.x, top);
      ctx.lineTo(pos.x, bottom);
      ctx.stroke();
    }
  
    // 4) Draw labels (Y & X)
    const yLabelValue = FM.num(chart.scales.y.getValueForPixel(pos.y), 1);
    drawLabel(ctx, yLabelValue, chart.scales.y.left, pos.y, cfg.labelBg, false);
  
    const xLabel = chart.data.labels[pos.index] ?? "";
    drawLabel(ctx, xLabel, pos.x, bottom, cfg.labelBg, true);
  
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

export const plugins = [segmentColorPlugin, customCrosshairPlugin];