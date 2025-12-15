import { $, create } from "util/template.js";

export class Notify {
  constructor() {
    this.root = document.body;
    this.area = this._ensureArea();
  }

  show(type = "info", message = "") {
    if (!message) return;

    const notify = create("div", {
      class: `notify ${type}`
    });

    const text = create("span", { class: "message" }, message);
    const close = create("span", { class: "close" }, "");

    notify.append(text, close);
    this.area.append(notify);

    close.onclick = () => this._remove(notify);

    const timeout = type === "error" ? 15000 : 6000;
    setTimeout(() => this._remove(notify), timeout);
  }

  _remove(el) {
    if (!el || !el.parentNode) return;

    el.style.animation = "slideOut 0.3s ease-in forwards";
    el.addEventListener(
      "animationend",
      () => el.remove(),
      { once: true }
    );
  }

  // =========================================================
  // INIT
  // =========================================================
  _ensureArea() {
    let area = $(".notify-area");
    if (!area) {
      area = create("div", { class: "notify-area" });
      this.root.append(area);
    }

    return area;
  }
}