// ui/UI.js
export const tap = e => {
  const el = e.target.closest("a,button");
  if (!el) return;
  el.classList.toggle("tap");
  setTimeout(() => el.classList.toggle("tap"), 180);
};

export class FAB {
  constructor(actions = []) {
    const SLOTS = ["fab-action-1", "fab-action-2", "fab-action-3", "fab-action-4"];
    $(".fab-wrapper")?.remove();
    this.root = CREATE("div", { class: "fab-wrapper" });
    const toggle = CREATE("input", { id: "fabCheckbox", type: "checkbox", class: "fab-checkbox" });

    const label = CREATE("label", { class: "fab", for: "fabCheckbox" },
      CREATE("span", { class: "fab-dots fab-dots-1" }),
      CREATE("span", { class: "fab-dots fab-dots-2" }),
      CREATE("span", { class: "fab-dots fab-dots-3" })
    );

    const wheel = CREATE("div", { class: "fab-wheel" });

    actions.slice(0, 4).forEach((action, i) => {
      const act = action?.active ? "active" : "";
      const btn = CREATE("a",
        {
          class: `fab-action ${act} ${SLOTS[i]}`,
          title: action.label,
          onclick: action.onClick
        },
        CREATE("i", { class: `${action.label}`} )
      );
      wheel.append(btn);
    });

    this.root.append(toggle, label, wheel);
    
    this.root.addEventListener("pointerdown", e => {
      tap(e);
      e.stopPropagation();
    });
    document.addEventListener("pointerdown", e => {
      if (!this.root.contains(e.target))
        toggle.checked = false;
    });
  }

  render() { return document.body.append(this.root); }
}

export class Modal {
  constructor({ title = "", content = "", actions = null, backdrop = true }) 
  
  {
    this.root = CREATE("div", { class: "modal-backdrop" });
    this.modal = CREATE("div", { class: "modal" });
    this.backdrop = backdrop;
    this.content = content;

    if (title) {
      const header = CREATE("div", { class: "modal-header" }, title);
      this.modal.append(header);
    }

    const custom = typeof this.content === "object";
    const body = CREATE("div", { class: `modal-body ${custom ? "custom" : "" }` });
    if (custom) {
      body.append(this.content);
    } else {
      body.innerHTML = this.content;
    }
    this.modal.append(body);

    if (Array.isArray(actions) && actions != null) {
      const footer = CREATE("div", { class: "modal-footer" });

      actions.forEach(action => {
        const btn = CREATE("button", {
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

    const notify = CREATE("div", { class: `notify ${type}` });

    const text = CREATE("span", { class: "message" }, message);
    const close = CREATE("span", { class: "close" }, "");

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
      area = CREATE("div", { class: "notify-area" });
      this.root.append(area);
    }

    return area;
  }
}

export function initSticky(scrollArea) {
  const init = () => {
    const pivotsX  = $$(".pivot-x", scrollArea);
    const pivotsY  = $$(".pivot-y", scrollArea);
    const pivotsXY = $$(".pivot-xy", scrollArea);

    if (!pivotsX.length && !pivotsY.length && !pivotsXY.length) {
      return setTimeout(init, 100);
    }

    scrollArea.addEventListener("scroll", () => {
      const x = scrollArea.scrollLeft;
      const y = scrollArea.scrollTop;

      // ==== VERTICAL SCROLL ====
      if (y > 0) {
        pivotsX.forEach(el => el.classList.add("stuck-x"));
        pivotsXY.forEach(el => el.classList.add("stuck-xy"));
      } else {
        pivotsX.forEach(el => el.classList.remove("stuck-x"));
        // XY only removed if also no horizontal
        if (x === 0) {
          pivotsXY.forEach(el => el.classList.remove("stuck-xy"));
        }
      }

      // ==== HORIZONTAL SCROLL ====
      if (x > 0) {
        pivotsY.forEach(el => el.classList.add("stuck-y"));
        pivotsXY.forEach(el => el.classList.add("stuck-xy"));
      } else {
        pivotsY.forEach(el => el.classList.remove("stuck-y"));
        if (y === 0) {
          pivotsXY.forEach(el => el.classList.remove("stuck-xy"));
        }
      }
    });
  };

  init();
}
