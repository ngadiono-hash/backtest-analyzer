// ~/helpers/table_builder.js
import { $, $$, create } from "./template.js";
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


export function buildCard(side, data, className) {
  log(side)
  const exactKeys = Object.keys(data.exact).map(Number);
  const longest = exactKeys.length ? Math.max(...exactKeys) : 0;

  // Total pips hanya streak dengan panjang = longest
  const totalPips = data.details
    .filter(d => d.length === longest)
    .reduce((s, d) => s + d.totalPips, 0);

  return create("div", { className: `streak-card ${className}` },

    create("div", { className: "card-title" },
      `${capitalize(side)} Streak`
    ),

    create("div", { className: "card-line" },
      create("span", { textContent: "Longest Streak" }),
      create("span", { textContent: `${longest}x` })
    ),

    create("div", { className: "card-line" },
      create("span", { textContent: "Total Net" }),
      create("span", { textContent: `${FM.num(totalPips)}` })
    ),

    create("button", { className: "detail-btn", dataset: { side } },
      "Show Detail"
    )
  );
}

export function showDetailSheet(side, data, container) {
  container.innerHTML = "";
  container.classList.remove("win", "lose", "hide");
  container.classList.add(`${side}`);

  // Urutkan exact dari panjang terbesar ke kecil
  const sortedLengths = Object.keys(data.exact)
    .map(Number)
    .sort((a, b) => b - a);

  const sections = sortedLengths.map(length => {
    const count = data.exact[length];
    const list = data.details.filter(d => d.length === length);
    const totalPips = list.reduce((s, d) => s + d.totalPips, 0);

    return buildAccordionSection(length, count, totalPips, list);
  });

  container.append(...sections);
}

function buildAccordionSection(length, count, totalPips, streakList) {
  const header = create("div", { className: "acc-header" },
    create("span", {}, `#${length} Streak`),
    create("span", {}, `${count}x`),
    create("span", {}, FM.num(totalPips))
  );

  const body = create("div", { className: "acc-body hide" });

  streakList.forEach((streak, i) => {
    const box = create("div", { className: "streak-box" },
      create("div", { className: "streak-subtitle" },
        `Detail #${i + 1}`
      ),
      buildTradesTable(streak.trades)
    );
    body.append(box);
  });

  // toggle
  header.addEventListener("click", () => {
    body.classList.toggle("hide");
  });

  const section = create("div", { className: "acc-section" },
    header,
    body
  );
  return section;
}

function buildTradesTable(trades) {
  const table = create("table", { className: "streak-detail-table" });

  const thead = create("thead", {},
    create("tr", {},
      ...["#", "Pair", "Type", "Date EN", "Date EX", "Pips"].map(h =>
        create("th", {}, h)
      )
    )
  );

  const tbody = create("tbody");

  trades.forEach((t, i) => {
    const row = create("tr", {},
      create("td", {}, i + 1),
      create("td", {}, t.pair),
      create("td", {}, t.isLong ? "Long" : "Short"),
      create("td", {}, FM.dateDMY(t.dateEN)),
      create("td", {}, FM.dateDMY(t.dateEX)),
      create("td", {}, FM.num(t.pips, 1))
    );
    tbody.append(row);
  });

  table.append(thead, tbody);
  return table;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}