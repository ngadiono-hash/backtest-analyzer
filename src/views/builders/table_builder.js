// ~/helpers/table_builder.js
import { $, $$, create } from "util/template.js";
import * as FM from "util/converter.js";

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
      create("span", { class: `value ${p.css}` }, p.txt),
      create("span", { class: `value hidden ${v.css}` }, v.txt)
    );
  }

  static textCell(txt, cls = "") {
    return create("td", { class: cls }, txt);
  }

  static headCell(txt, cls = "") {
    return create("th", { class: cls }, txt);
  }
  
}

export function Toggler(root) {
  const checkbox = create("input", { type: "checkbox", id: "toggle-pips-vpips" });
  checkbox.addEventListener("change", () => {
    $$(".pivot", root).forEach(e => {
      e.classList.toggle("pips-mode");
      e.classList.toggle("vpips-mode");
    });
    $$(".value", root).forEach(e => e.classList.toggle("hidden"));
  });

  return create("div", { class: "toggle-wrapper" },
    create("label", { class: "switch" },
      checkbox,
      create("span", { class: "slider" })
    )
  );
}


export function buildCard(side, data, className) {
  const exactKeys = Object.keys(data.exact).map(Number);
  const longest = exactKeys.length ? Math.max(...exactKeys) : 0;
  const totalP = data.details
    .filter(d => d.length === longest)
    .reduce((s, d) => s + d.totalPips, 0);
  const totalV = data.details
    .filter(d => d.length === longest)
    .reduce((s, d) => s + d.totalVPips, 0);

  return create("div", { className: `streak-card ${className}`, dataset: {side: `${side}`} },

    create("div", { className: "card-title" },
      `${FM.capitalize(side)} Streak`
    ),

    create("div", { className: "card-line" },
      create("span", { textContent: "Longest" }),
      create("span", { textContent: `${longest}x` })
    ),

    create("div", { className: "card-line" },
      create("span", { textContent: "Pips" }),
      create("span", { textContent: `${FM.num(totalP)}` })
    ),
    
    create("div", { className: "card-line" },
      create("span", { textContent: "Value Pips" }),
      create("span", { textContent: `${FM.num(totalV)}` })
    ),

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

    return buildAccordion(side, length, count, list);
  });

  container.append(...sections);
}

function buildAccordion(side, length, count, streakList) {
  const getMaxNet = (streak, p = true) => {
    return Math.max(...streak.map(s => p ? s.totalPips : s.totalVPips));
  }
  let pp = FM.metricFormat(getMaxNet(streakList), "R");
  let pv = FM.metricFormat(getMaxNet(streakList, false), "R");
  const header = create("div", { className: "acc-header" },
    create("div", { className: "row" },
    create("div", { className: "cell txt-l" }, `#${length} Streak`),
    create("div", { className: "cell txt-c" }, `${count}x`),
    create("div", { className: "cell txt-r" },
      create("span", { className: `value ${pp.css}` }, pp.txt),
      create("span", { className: `value hidden ${pv.css}` }, pv.txt),
    ))
  );
  const body = create("div", { className: "acc-body hide" });
  streakList.forEach((streak, i) => {
    const box = create("div", { className: "streak-box" },
      create("div", { className: "streak-subtitle" },
        `Detail # ${i + 1}`
      ),
      buildTradesTable(side, streak.trades)
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


function bildTradesTable(side, trades) {
  const table = create("table", { className: "streak-detail-table" });

  const col = side === "win" ? "Limit" : "Target";

  const thead = create("thead", {},
    create("tr", {},
      ...["#", "Pair", "Type", "EN Price", "EX Date", col, "Realized"]
        .map(h => Cells.headCell(h))
    )
  );

  const tbody = create("tbody");

  trades.forEach((t, i) => {

    // limit/target value pairs (pakai logika asli — tidak diubah)
    const limitObj = side === "win"
      ? { p: t.pSL, v: t.vSL, t: "" }
      : { p: t.pTP, v: t.vTP, t: "" };

    // realized pips
    const realizedObj = { p: t.pips, v: t.vpips, t: "R" };

    const row = create("tr", {},
      Cells.textCell(i + 1),
      Cells.textCell(t.pair),
      Cells.textCell(t.isLong ? "Long" : "Short"),
      Cells.textCell(FM.formatPrice(t.pair, t.priceEN)),
      Cells.textCell(FM.dateDMY(t.dateEX)),

      Cells.pvCell(limitObj),    // <-- jauh lebih rapi
      Cells.pvCell(realizedObj)  // <-- cukup sekali
    );

    tbody.append(row);
  });

  table.append(thead, tbody);
  return table;
}

function buildTradesTable(side, trades) {
  const table = create("table", { className: "streak-detail-table" });

  const col = side === "win" ? "Limit" : "Target";

  const thead = create("thead", {},
    create("tr", {},
      ...["#", "Pair", "Type", "EN Price", "EX Date", col, "Realized"]
        .map(h => Cells.headCell(h))
    )
  );

  const tbody = create("tbody");

  // -------------------------
  // MAIN ROWS
  // -------------------------
  trades.forEach((t, i) => {

    const limitObj = side === "win"
      ? { p: t.pSL, v: t.vSL, t: null }
      : { p: t.pTP, v: t.vTP, t: null };

    const realizedObj = { p: t.pips, v: t.vpips, t: "R" };

    const row = create("tr", {},
      Cells.textCell(i + 1),
      Cells.textCell(t.pair),
      Cells.textCell(t.isLong ? "Long" : "Short"),
      Cells.textCell(FM.formatPrice(t.pair, t.priceEN)),
      Cells.textCell(FM.dateDMY(t.dateEX)),
      Cells.pvCell(limitObj),
      Cells.pvCell(realizedObj)
    );

    tbody.append(row);
  });

  // -------------------------
  // FOOTER TOTAL ROW
  // -------------------------
  const totalP = trades.reduce((a, t) => a + (t.pips ?? 0), 0);
  const totalV = trades.reduce((a, t) => a + (t.vpips ?? 0), 0);
  
  const totalObj = { p: totalP, v: totalV, t: "R" };
  
  const totalRow = create("tr", { className: "total-row" },
  
    // kolom concatenated
    create("td", { colSpan: 6, className: "no-border" }, "."),
  
    // kolom Realized
    Cells.pvCell(totalObj)
  );

  tbody.append(totalRow);

  table.append(thead, tbody);
  return table;
}