import * as FM from "utils/converter.js";

const DEFAULT_ULTIMATE = { enabled: false, above: "#089981", below: "#f23645" };

const UltimatePlugin = {
  id: "ultimate",

  // ------------------------------------------
  // Utility: baca nilai y baik dari number atau object
  // ------------------------------------------
  _getY(v) {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "object" && "y" in v) return v.y;
    return 0;
  },

  // -------------------------------------------------
  // 1) BEFORE UPDATE
  //    Inject titik awal {x:0, y:0} dengan struktur aman
  // -------------------------------------------------
  beforeUpdate(chart) {
    if (chart.$ultimateInjected) return;
    if (chart.config.type !== "line") return;

    chart.data.datasets.forEach((ds) => {
      if (!Array.isArray(ds.data)) return;

      const first = ds.data[0];
      const firstY = this._getY(first);

      // Inject titik zero hanya kalau data pertama bukan 0
      ds.data = [
        { x: 0, y: 0, __injected: true },
        ...ds.data
      ];
    });

    // Labels juga harus ditambah jika data pakai labels biasa
    if (Array.isArray(chart.data.labels)) {
      chart.data.labels = ["0", ...chart.data.labels];
    }

    chart.$ultimateInjected = true;
  },

  // -------------------------------------------------
  // 2) BEFORE DATASETS DRAW
  //    Matikan default line Chart.js
  // -------------------------------------------------
  beforeDatasetsDraw(chart) {
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.type !== "line") return;

      meta.dataset.options.borderColor = "rgba(0,0,0,0)";
      meta.dataset.options.backgroundColor = "rgba(0,0,0,0)";
    });
  },

  // -------------------------------------------------
  // 3) AFTER DATASETS DRAW (DRAW SEGMENTS)
  // -------------------------------------------------
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const { top, bottom } = chart.chartArea;
    const yScale = chart.scales.y;
    const zeroY = yScale.getPixelForValue(0);

    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.type !== "line") return;
      if (ds.hidden) return;

      const cfg = {
        ...DEFAULT_ULTIMATE,
        ...(chart.options.segmentColor || {}),
        ...(ds.segmentColor || {})
      };
      if (!cfg.enabled) return;

      const points = meta.data;
      const values = ds.data;

      // Build two paths
      const pathAbove = new Path2D();
      const pathBelow = new Path2D();

      for (let c = 0; c < points.length - 1; c++) {
        const p0 = points[c];
        const p1 = points[c + 1];

        const y0 = this._getY(values[c]);
        const y1 = this._getY(values[c + 1]);

        const v0 = p0.y;
        const v1 = p1.y;

        const crossing = (y0 >= 0 && y1 < 0) || (y0 < 0 && y1 >= 0);

        if (!crossing) {
          const path = y0 >= 0 ? pathAbove : pathBelow;
          if (c === 0) path.moveTo(p0.x, v0);
          path.lineTo(p1.x, v1);
          continue;
        }

        // Crossing position
        const t = y0 / (y0 - y1);
        const xMid = p0.x + (p1.x - p0.x) * t;

        // First segment
        const path1 = y0 >= 0 ? pathAbove : pathBelow;
        if (c === 0) path1.moveTo(p0.x, v0);
        path1.lineTo(xMid, zeroY);

        // Second segment
        const path2 = y1 >= 0 ? pathAbove : pathBelow;
        path2.moveTo(xMid, zeroY);
        path2.lineTo(p1.x, v1);
      }

      // Close the paths
      const firstX = points[0].x;
      const lastX = points[points.length - 1].x;

      pathAbove.lineTo(lastX, zeroY);
      pathAbove.lineTo(firstX, zeroY);
      pathAbove.closePath();

      pathBelow.lineTo(lastX, zeroY);
      pathBelow.lineTo(firstX, zeroY);
      pathBelow.closePath();

      // ------ FILL GRADIENT -------
      const gradAbove = ctx.createLinearGradient(0, top, 0, zeroY);
      gradAbove.addColorStop(0, cfg.above + "40");
      gradAbove.addColorStop(1, cfg.above + "00");

      const gradBelow = ctx.createLinearGradient(0, zeroY, 0, bottom);
      gradBelow.addColorStop(1, cfg.below + "40");
      gradBelow.addColorStop(0, cfg.below + "00");

      ctx.save();
      ctx.fillStyle = gradAbove;
      ctx.fill(pathAbove);
      ctx.fillStyle = gradBelow;
      ctx.fill(pathBelow);

      // ------ DRAW SEGMENT LINES -------
      for (let c = 0; c < points.length - 1; c++) {
        const p0 = points[c];
        const p1 = points[c + 1];

        const y0 = this._getY(values[c]);
        const y1 = this._getY(values[c + 1]);

        const crossing = (y0 >= 0 && y1 < 0) || (y0 < 0 && y1 >= 0);

        if (!crossing) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = y0 >= 0 ? cfg.above : cfg.below;
          ctx.stroke();
          continue;
        }

        const t = y0 / (y0 - y1);
        const xMid = p0.x + (p1.x - p0.x) * t;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(xMid, zeroY);
        ctx.strokeStyle = y0 >= 0 ? cfg.above : cfg.below;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(xMid, zeroY);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = y1 >= 0 ? cfg.above : cfg.below;
        ctx.stroke();
      }

      ctx.restore();
    });
  },

  // -------------------------------------------------
  // 4) AFTER DRAW — custom hover dot
  // -------------------------------------------------
  afterDraw(chart) {
    const ctx = chart.ctx;
    const active = chart.getActiveElements();
    if (!active.length) return;

    active.forEach((item) => {
      const { datasetIndex, index } = item;
      const ds = chart.data.datasets[datasetIndex];
      if (ds.hidden) return;

      const meta = chart.getDatasetMeta(datasetIndex);
      const point = meta.data[index];

      const value = this._getY(ds.data[index]);

      const cfg = {
        ...DEFAULT_ULTIMATE,
        ...(ds.segmentColor || {})
      };

      const color = value >= 0 ? cfg.above : cfg.below;
      const bg = color + "80";

      const radius = ds.hoverPointRadius ?? 3;

      ctx.save();
      ctx.fillStyle = bg;
      ctx.strokeStyle = color;
      ctx.lineWidth = ds.hoverPointBorderWidth ?? 1;

      const { x, y } = point.getProps(["x", "y"], true);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
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
  id: "crosshair",

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
    if (!cfg.enabled) return;

    const e = args.event;
    if (e.type !== "mousemove") return;

    const xScale = chart.scales.x;
    const yScale = chart.scales.y;

    // --- Tooltip aktif → crosshair mengikuti tooltip ---
    if (chart.options.plugins.tooltip.enabled) return;

    // --- Tooltip OFF → manual tracking ---
    const index = Math.round(xScale.getValueForPixel(e.x));

    if (index < 0 || index >= chart.data.labels.length) {
      chart.$crosshair = null;
      return;
    }

    // Ambil dataset pertama untuk referensi jika multi dataset
    const ds0 = chart.data.datasets[0];
    const value = ds0.data[index];

    chart.$crosshair = {
      x: xScale.getPixelForValue(index),
      y: yScale.getPixelForValue(value),
      index,
      datasetIndex: 0,
      value
    };
  },

  afterDraw(chart) {
    const cfg = {
      ...DEFAULT_CROSSHAIR,
      ...(chart.options.crosshair || {})
    };
    if (!cfg.enabled) return;

    let pos = null;

    // --- PRIORITAS 1: Tooltip (jika aktif dan ada datapoint) ---
    const tip = chart.tooltip;
    if (tip && tip.dataPoints?.length && chart.options.plugins.tooltip.enabled) {
      const p = tip.dataPoints[0];
      const datasetIndex = p.datasetIndex;
      const index = p.dataIndex;
      const el = chart.getDatasetMeta(datasetIndex).data[index];
      
      pos = {
        x: el.x,
        y: el.y,
        datasetIndex,
        index
      };
      chart.$crosshair = pos;
    }

    // --- PRIORITAS 2: Fallback dari afterEvent (tooltip off) ---
    if (!pos) pos = chart.$crosshair;

    if (!pos) return;

    const ctx = chart.ctx;
    const { top, bottom, left, right } = chart.chartArea;

    ctx.save();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1;

    if (cfg.lineStyle === "dashed") ctx.setLineDash([6, 4]);
    else ctx.setLineDash([]);

    // --- Horizontal line ---
    if (cfg.enableY) {
      ctx.beginPath();
      ctx.moveTo(left, pos.y);
      ctx.lineTo(right, pos.y);
      ctx.stroke();
    }

    // --- Vertical line ---
    if (cfg.enableX) {
      ctx.beginPath();
      ctx.moveTo(pos.x, top);
      ctx.lineTo(pos.x, bottom);
      ctx.stroke();
    }

    // --- Draw Y label ---
    const yLabel = FM.num(chart.scales.y.getValueForPixel(pos.y), 1);
    drawLabel(ctx, yLabel, chart.scales.y.left, pos.y, cfg.labelBg, false);

    // --- Draw X label (ingat: label sekarang punya "0") ---
    const xLabel = chart.data.labels[pos.index] ?? "";
    drawLabel(ctx, xLabel, pos.x, bottom, cfg.labelBg, true);

    ctx.restore();

    /* Helper */
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
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + pad, y);
      }
    }
  }
};

export const plugins = [
  UltimatePlugin,
  customCrosshairPlugin
  ];