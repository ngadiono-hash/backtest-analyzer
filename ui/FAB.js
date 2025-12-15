// ui/components/FAB.js
import { create } from "util/template.js";

const SLOTS = ["fab-action-1", "fab-action-2", "fab-action-3", "fab-action-4"];
export class FAB {
  constructor(actions = []) {
    this.root = create("div", { class: "fab-wrapper" });

    const toggle = create("input", {
      id: "fabCheckbox",
      type: "checkbox",
      class: "fab-checkbox"
    });

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
        action.icon
      );
      
      wheel.append(btn);
      btn.addEventListener("click", () => toggle.checked = false);
    });

    this.root.append(toggle, label, wheel);
    this.root.addEventListener("click", e => e.stopPropagation());
    document.addEventListener("click", () => toggle.checked = false );

  }

  render() {
    return this.root;
  }
}