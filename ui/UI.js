// ui/ui_tools.js
import { $, create } from "util/template.js";

const LABELS = {
  Filter: "🗂️", Delete : "🗑️", Add : "📝", Process: "📊", Info : "❗", Help : "❓", Export : "📥", Setup  : "⚙️"
}
const SLOTS = ["fab-action-1", "fab-action-2", "fab-action-3", "fab-action-4"];

export class FAB {
  constructor(actions = []) {
    $(".fab-wrapper")?.remove();
    this.root = create("div", { class: "fab-wrapper" });
    const toggle = create("input", { id: "fabCheckbox", type: "checkbox", class: "fab-checkbox" });

    const label = create("label", { class: "fab", for: "fabCheckbox" },
      create("span", { class: "fab-dots fab-dots-1" }),
      create("span", { class: "fab-dots fab-dots-2" }),
      create("span", { class: "fab-dots fab-dots-3" })
    );

    const wheel = create("div", { class: "fab-wheel" });

    actions.slice(0, 4).forEach((action, i) => {
      const btn = create("a",
        {
          class: `fab-action ${SLOTS[i]}`,
          title: action.label,
          onclick: action.onClick
        },
        // LABELS[action.label]
        create("i", { class: `${action.label}`} )
      );
      
      wheel.append(btn);
      // btn.addEventListener("click", () => toggle.checked = false);
    });

    this.root.append(toggle, label, wheel);
    this.root.addEventListener("click", e => e.stopPropagation());
    document.addEventListener("click", () => toggle.checked = false );

  }

  render() { return document.body.append(this.root); }
}

export class Modal {
  constructor({ title = "", content = "", actions = null, backdrop = true }) 
  
  {
    this.root = create("div", { class: "modal-backdrop" });
    this.modal = create("div", { class: "modal" });
    this.backdrop = backdrop;
    this.content = content;

    if (title) {
      const header = create("div", { class: "modal-header" }, title);
      this.modal.append(header);
    }

    const custom = typeof this.content === "object";
    const body = create("div", { class: `modal-body ${custom ? "custom" : "" }` });
    if (custom) {
      body.append(this.content);
    } else {
      body.innerHTML = this.content;
    }
    this.modal.append(body);

    if (Array.isArray(actions) && actions != null) {
      const footer = create("div", { class: "modal-footer" });

      actions.forEach(action => {
        const btn = create("button", {
          class: action.class ?? "btn",
          onclick: () => {
            action.onClick?.();
            this.close();
          }
        }, action.label);

        footer.append(btn);
      });

      this.modal.append(footer);
    }

    this.root.append(this.modal);

    if (this.backdrop) {
      this.root.addEventListener("click", e => {
        if (e.target === this.root) this.close();
      });
    }
  }

  close() { this.root.remove(); }
  render() {
    $(".fab-checkbox").checked = false;
    return document.body.append(this.root);
  }
}

export class Notify {
  constructor() {
    this.root = document.body;
    this.area = this._ensureArea();
  }

  show(type = "info", message = "") {
    if (!message) return;

    const notify = create("div", { class: `notify ${type}` });

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

  _ensureArea() {
    let area = $(".notify-area");
    if (!area) {
      area = create("div", { class: "notify-area" });
      this.root.append(area);
    }

    return area;
  }
}
