import { create } from "util/template.js";

export class Modal {
  constructor({ title = "", content = "", actions = null, backdrop = true }) 
  
  {
    this.root = create("div", { class: "modal-backdrop" });
    this.modal = create("div", { class: "modal" });
    this.backdrop = backdrop;
    this.content = content;
    // ================= HEADER =================
    if (title) {
      const header = create("div", { class: "modal-header" }, title);
      this.modal.append(header);
    }

    // ================= BODY =================
    const custom = typeof this.content === "object";
    const body = create("div", { class: `modal-body ${custom ? "custom" : "" }` });
    if (custom) {
      body.append(this.content);
    } else {
      body.innerHTML = this.content;
    }
    this.modal.append(body);

    // ================= FOOTER (OPTIONAL) =================
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

    // ================= BACKDROP CLICK =================
    if (this.backdrop) {
      this.root.addEventListener("click", e => {
        if (e.target === this.root) this.close();
      });
    }
  }

  render() {
    return document.body.append(this.root);
  }

  close() {
    this.root.remove();
  }
}