// ~/helpers/table_builder.js
import { $, $$, create } from "util/template.js";
import * as FM from "util/formatter.js";

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

  build(title = null, switcher = false) {
    this.container.innerHTML = "";

    if (title) {
      const h = create("div", { class: "table-heading"},
        create("div", { class: "table-title" }, title)
      );
      if (switcher) h.append(Toggler(this.container));
      this.container.append(h);
    }
    if (this.thead) this.table.append(this.thead);
    if (this.tbody) this.table.append(this.tbody);

    this.container.append(this.table);
  }
}

export class Cells {
  static pvCell(obj, typeOverride = null, cls = "") {
    if (!obj) obj = { p: null, v: null };

    const type = typeOverride || obj.t;

    const p = FM.metricFormat(obj.p, type);
    const v = FM.metricFormat(obj.v, type);

    return create("td", { class: cls },
      create("span", { class: `sw-able m ${p.css}` }, p.txt),
      create("span", { class: `sw-able m hidden ${v.css}` }, v.txt)
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
  const checkbox = create("input", { type: "checkbox", class: "toggle-pv" });
  checkbox.onchange = () => {
    root.classList.toggle("p-mode");
    root.classList.toggle("v-mode");
    $$(".sw-able", root).forEach(e => e.classList.toggle("hidden"));
  };

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

  const streakList = data.details.filter(d => d.length === longest);

  const totalP = streakList.reduce((s, d) =>
    s + (side === "win" ? d.totalP : d.totalP), 0
  );
  const totalV = streakList.reduce((s, d) =>
    s + (side === "win" ? d.totalV : d.totalV), 0
  );

  const extremum = (k) => {
    const values = streakList.map(s => s[k]);
    return side === "win" ? Math.max(...values) : Math.min(...values);
  };

  return create("div", { class: `streak-card ${className}`, dataset: { side: `${side}` } },
    create("div", { class: "card-title" }, `${FM.capitalize(side)} Streak`),
    create("div", { class: "card-line" },
      create("span", "Longest"),
      create("span", { class: "m" }, `${longest}x`)
    ),
    create("div", { class: "card-line" },
      create("span", "Pips"),
      create("span", { class: "m" }, `${FM.num(extremum("totalP"))}`)
    ),
    create("div", { class: "card-line" },
      create("span", "Value"),
      create("span", { class: "m" }, `${FM.num(extremum("totalV"))}`)
    )
  );
}

export function showDetailSheet(side, data, container) {
  container.innerHTML = "";
  Object.keys(data.exact)
    .map(Number)
    .sort((a, b) => b - a)
    .forEach(len =>
      container.append(
        buildAccordion(
          side,
          len,
          data.pct[len],
          data.exact[len],
          data.details.filter(d => d.length === len)
        )
      )
    );
}

const metricCell = (cls, m) =>
  create("div", { class: "cell m txt-r" },
    create("span", { class: `${cls} ${m.css}` }, m.txt)
  );

export function buildAccordion(side, len, pct, count, list) {
  const extremum = k => FM.metricFormat(
    side === "win"
      ? Math.max(...list.map(s => s[k]))
      : Math.min(...list.map(s => s[k])),
    "R"
  );

  const pp = extremum("totalP");
  const pv = extremum("totalV");

  const accordion = create("div", { class: "accordion acc-streak" },
    create("input", { type: "checkbox", id: `is-${side}-${len}`, class: "accordion-input" }),
    create("label", { for: `is-${side}-${len}`, class: "accordion-label" },
      create("div", { class: "row" },
        create("div", { class: "cell cell-title" },
          `Streak ${len} : ${count}x`,
          create("br"),
          create("small", `${FM.num(pct)} % of total streaks`)
        ),
        metricCell("p-mode", pp),
        metricCell("v-mode", pv),
        create("div", { class: "cell blank" })
      )
    )
  );

  const content = create("div", { class: "accordion-content" });

  $("input", accordion).onchange = e => {
    if (!e.target.checked || content.dataset.rendered) return;

    list.forEach((s, i) => {
      const item = create("div", { class: "my-2 p-mode" });

      const head = create("div", { class: "table-heading" },
        create("div", { class: "table-title" },
          `Detail Streak ${i + 1}`
        )
      );

      head.append(Toggler(item));

      item.append(
        head,
        buildTradesTable(side, s.trades)
      );

      content.append(item);
    });

    content.dataset.rendered = "1";
  };

  return accordion.append(content), accordion;
}
function buildTradesTable(side, trades) {
  const col = side==="win"?"Limit":"Target";
  let sumP=0, sumV=0;
  const tbody = create("tbody");

  trades.forEach((t,i)=>{
    sumP += t.pResult??0; sumV += t.vResult??0;
    const limit = side==="win"?{p:t.pSL,v:t.vSL}:{p:t.pTP,v:t.vTP};
    tbody.append(create("tr",{},
      Cells.textCell(i+1),
      Cells.textCell(t.pair),
      Cells.textCell(t.isLong?"Long":"Short"),
      Cells.textCell(FM.formatPrice(t.pair,t.priceEN),"m"),
      Cells.textCell(FM.dateDMY(t.dateEX)),
      Cells.pvCell(limit),
      Cells.pvCell({p:t.pResult,v:t.vResult,t:"R"})
    ));
  });

  tbody.append(create("tr",{},
    create("td",{colSpan:6,className:"no-border"},"."),
    Cells.pvCell({p:sumP,v:sumV,t:"R"})
  ));

  return create("table",{class:"streak-detail-table"},
    create("thead",{},create("tr",{},
      ...["#","Pair","Type","EN Price","EX Date",col,"Realized"]
        .map(h=>Cells.headCell(h,"pivot pivot-x"))
    )),
    tbody
  );
}
