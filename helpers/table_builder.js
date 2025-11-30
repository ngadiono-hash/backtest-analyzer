// ~/helpers/table_builder.js
import { create } from "./template.js";
import * as FM from "./converter.js";

export class Tables {
  constructor(container) {
    this.container = container;
    this.table = create("table");
    this.thead = null;
    this.tbody = null;
  }

  setId(id) {
    this.table.id = id;
    return this;
  }

  header(cols) {
    const tr = create("tr");
    cols.forEach(c => tr.append(c));
    this.thead = create("thead", {}, tr);
    return this;
  }

  rows(rowsArray) {
    this.tbody = create("tbody");
    rowsArray.forEach(row => {
      const tr = create("tr");
      row.forEach(col => tr.append(col));
      this.tbody.append(tr);
    });
    return this;
  }

  appendSection(sectionNodes) {
    sectionNodes.forEach(n => this.container.append(n));
    return this;
  }

  build(prepend = null) {
    this.container.innerHTML = "";

    if (prepend) this.container.append(prepend);

    if (this.thead) this.table.append(this.thead);
    if (this.tbody) this.table.append(this.tbody);

    this.container.append(this.table);
  }
}

export class Cells {
  static pvCell(obj, typeOverride = null) {
    if (!obj) obj = { p: null, v: null };

    const type = typeOverride || obj.t;

    const p = FM.metricFormat(obj.p, type);
    const v = FM.metricFormat(obj.v, type);

    return create("td", {},
      create("span", { className: `value ${p.css}` }, p.txt),
      create("span", { className: `value hidden ${v.css}` }, v.txt)
    );
  }

  static textCell(txt, className = "") {
    return create("td", { className }, txt);
  }

  static headCell(txt, className = "") {
    return create("th", { className }, txt);
  }
  
}

export function Toggler(root) {
  const checkbox = create("input", {type: "checkbox", id: "toggle-pips-vpips" });
  checkbox.addEventListener("change", () => {
    $$(".pivot", root).forEach(e => {
      e.classList.toggle("pips-mode");
      e.classList.toggle("vpips-mode");
    });
    $$(".value", root).forEach(e => e.classList.toggle("hidden"));
  });

  return create("div", { className: "toggle-wrapper" },
    create("label", { className: "switch" },
      checkbox,
      create("span", { className: "slider" })
    )
  );
}
