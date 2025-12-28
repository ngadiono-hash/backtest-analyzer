import * as FM from "util/formatter.js";

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
  beforeDraw(chart, args, opts) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    ctx.save();
    ctx.fillStyle = opts.bg || "#f2f2f2";
    ctx.fillRect(
      chartArea.left,
      chartArea.top,
      chartArea.width,
      chartArea.height
    );
    ctx.restore();
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
  color: "rgba(0,0,0,0.3)",
  labelBg: "rgba(0,0,0,0.8)"
};

const customCrosshairPlugin = {
  id: "crosshair",

  afterDraw(chart) {
    const cfg = {
      ...DEFAULT_CROSSHAIR,
      ...(chart.options.crosshair || {}),
    };
    if (!cfg.enabled) return;

    const tooltip = chart.tooltip;

    if (
      !chart.options.plugins.tooltip?.enabled ||
      !tooltip ||
      tooltip.opacity < 1 ||
      !tooltip.dataPoints?.length
    ) {
      return;
    }

    const ctx = chart.ctx;
    const { top, bottom, left, right } = chart.chartArea;

    const p = tooltip.dataPoints[0];

    const xScale = chart.scales.x;
    const yScale = chart.scales.y;

    const xVal = p.parsed.x ?? p.dataIndex;
    const yVal = p.parsed.y;

    const x = xScale.getPixelForValue(xVal);
    const y = yScale.getPixelForValue(yVal);

    ctx.save();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);

    // --- Horizontal ---
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    // --- Vertical ---
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    ctx.setLineDash([]);

    // --- Labels ---
    drawYLabel(ctx, chart, y, cfg);
    drawXLabel(ctx, chart, p.dataIndex, x, bottom, cfg);

    ctx.restore();
  },
};

/* ---------------- HELPERS ---------------- */

function drawYLabel(ctx, chart, y, cfg) {
  const val = chart.scales.y.getValueForPixel(y);
  const text = FM.num(val, 1);

  drawLabel(
    ctx,
    text,
    chart.scales.y.left,
    y,
    cfg.labelBg,
    false,
    cfg.font
  );
}

function drawXLabel(ctx, chart, index, x, bottom, cfg) {
  let text = chart.scales.x.getValueForPixel(x);
  text = text.toFixed(0)

  drawLabel(
    ctx,
    text,
    x,
    bottom,
    cfg.labelBg,
    true,
    cfg.font
  );
}

function drawLabel(ctx, text, x, y, bg, center, font) {
  const pad = 4;
  const h = 18;

  ctx.font = font;
  const w = ctx.measureText(text).width + pad * 2;

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
export const plugins = [
  UltimatePlugin,
  customCrosshairPlugin
  ];