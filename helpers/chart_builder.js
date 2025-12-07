// ~/helpers/chart_renderer.js
import { $, $$, create } from "../helpers/template.js";
import { plugins } from "../helpers/chart_plugins.js";

Chart.register(...plugins);

export const initChart = (key, canvas, config) => {
  window.charts ??= {};
  if (window.charts[key]) window.charts[key].destroy();
  if (config._height) {
    canvas.canvas.height = config._height;
  }
  window.charts[key] = new Chart(canvas, config);
  return window.charts[key];
};

export function chartControl(container) {
  const opt = { tooltip: false, zoom: false, crosshair: false };
  const wrap = create("div", { class: "chart-options" });
  wrap.append(
    create("label", {}, 
      "Tooltip ",
      create("input", { type: "checkbox", class: "toggleTooltip" })
    ),
    create("label", {}, 
      "Zoom ",
      create("input", { type: "checkbox", class: "toggleZoom" })
    ),
    create("button", { class: "reset" }, "Reset")
  );
  container.prepend(wrap);
  return opt;
}

export function bindChartControl(container, chart) {
  container.addEventListener("change", (e) => {
    if (e.target.matches(".toggleTooltip")) {
      const enabled = e.target.checked;
      chart.options.plugins.tooltip.enabled = enabled;
      chart.options.crosshair.enabled = enabled;
      chart.update("none");
    }

    if (e.target.matches(".toggleZoom")) {
      const ena = e.target.checked;
      const zoom = chart.options.plugins.zoom;
      zoom.pan.enabled = ena;
      zoom.zoom.wheel.enabled = ena;
      zoom.zoom.pinch.enabled = ena;
      chart.update("none");
    }
  });

  // RESET FIX — ini yang perlu dibenerin
  $(".reset", container)?.addEventListener("click", () => {
    chart.resetZoom("active");

    // reset chart config
    chart.options.plugins.tooltip.enabled = false;
    chart.options.plugins.zoom.pan.enabled = false;
    chart.options.plugins.zoom.zoom.wheel.enabled = false;
    chart.options.plugins.zoom.zoom.pinch.enabled = false;
    chart.options.crosshair.enabled = false;

    // reset UI
    $(".toggleTooltip", container).checked = false;
    $(".toggleZoom", container).checked   = false;

    chart.update("none");
  });
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