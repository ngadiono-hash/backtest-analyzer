// src/views/components/FAB.js
import { create } from "util/template.js";

export class FAB {
  constructor(actions = {}) {
    // actions = { onAdd, onSave, onDelete, onCopy }

    this.root = create("div", { class: "fab-wrapper" });

    // Checkbox toggle
    const toggle = create("input", {
      id: "fabCheckbox",
      type: "checkbox",
      class: "fab-checkbox"
    });

    // FAB main button
    const label = create("label", {
      class: "fab",
      for: "fabCheckbox"
    },
      create("span", { class: "fab-dots fab-dots-1" }),
      create("span", { class: "fab-dots fab-dots-2" }),
      create("span", { class: "fab-dots fab-dots-3" })
    );

    // Wheel container
    const wheel = create("div", { class: "fab-wheel" });

    // ======= ACTION BUTTONS =======

    const btnAdd = create("a", {
      class: "fab-action fab-action-1",
      onclick: () => actions.onAdd?.()
    }, create("i", { class: "add" }));

    const btnSave = create("a", {
      class: "fab-action fab-action-2",
      onclick: () => actions.onSave?.()
    }, create("i", { class: "save" }));

    const btnDelete = create("a", {
      class: "fab-action fab-action-3",
      onclick: () => actions.onDelete?.()
    }, create("i", { class: "delete" }));

    const btnCopy = create("a", {
      class: "fab-action fab-action-4",
      onclick: () => actions.onCopy?.()
    }, create("i", { class: "copy" }));

    // Append actions to wheel
    wheel.append(btnAdd, btnSave, btnDelete, btnCopy);

    // Build FAB
    this.root.append(toggle, label, wheel);
  }

  render() {
    return this.root;
  }
}