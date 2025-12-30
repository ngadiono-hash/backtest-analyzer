// ~src/builders/table_builder.js
import * as FM from "util/formatter.js";

export class Tables {
  constructor(container) {
    this.container = container;
    this.table = CREATE("table");
    this.thead = null;
    this.tbody = null;
  }

  setId(id) {
    this.table.id = id;
    return this;
  }

  header(cols) {
    const tr = CREATE("tr");
    cols.forEach(c => tr.append(c));
    this.thead = CREATE("thead", {}, tr);
    return this;
  }

  rows(rowsArray) {
    this.tbody = CREATE("tbody");
    rowsArray.forEach(row => {
      const tr = CREATE("tr");
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
      const h = CREATE("div", { class: "table-heading"},
        CREATE("div", { class: "table-title" }, title)
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

    return CREATE("td", { class: cls },
      CREATE("span", { class: `sw-able m ${p.css}` }, p.txt),
      CREATE("span", { class: `sw-able m hidden ${v.css}` }, v.txt)
    );
  }

  static textCell(txt, cls = "") {
    return CREATE("td", { class: cls }, txt);
  }

  static headCell(txt, cls = "") {
    return CREATE("th", { class: cls }, txt);
  }
  
}

export function Toggler(root) {
  const checkbox = CREATE("input", { type: "checkbox", class: "toggle-pv" });
  checkbox.onchange = () => {
    root.classList.toggle("p-mode");
    root.classList.toggle("v-mode");
    $$(".sw-able", root).forEach(e => e.classList.toggle("hidden"));
  };

  return CREATE("div", { class: "toggle-wrapper" },
    CREATE("label", { class: "switch" },
      checkbox,
      CREATE("span", { class: "slider" })
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

  return CREATE("div", { class: `streak-card ${className}`, dataset: { side: `${side}` } },
    CREATE("div", { class: "card-title" }, `${FM.capitalize(side)} Streak`),
    CREATE("div", { class: "card-line" },
      CREATE("span", "Longest"),
      CREATE("span", { class: "m" }, `${longest}x`)
    ),
    CREATE("div", { class: "card-line" },
      CREATE("span", "Pips"),
      CREATE("span", { class: "m" }, `${FM.num(extremum("totalP"))}`)
    ),
    CREATE("div", { class: "card-line" },
      CREATE("span", "Value"),
      CREATE("span", { class: "m" }, `${FM.num(extremum("totalV"))}`)
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
  CREATE("div", { class: "cell m txt-r" },
    CREATE("span", { class: `${cls} ${m.css}` }, m.txt)
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

  const accordion = CREATE("div", { class: "accordion acc-streak" },
    CREATE("input", { type: "checkbox", id: `is-${side}-${len}`, class: "accordion-input" }),
    CREATE("label", { for: `is-${side}-${len}`, class: "accordion-label" },
      CREATE("div", { class: "row" },
        CREATE("div", { class: "cell cell-title" },
          `Streak ${len} : ${count}x`,
          CREATE("br"),
          CREATE("small", `${FM.num(pct)} % of total streaks`)
        ),
        metricCell("p-mode", pp),
        metricCell("v-mode", pv),
        CREATE("div", { class: "cell blank" })
      )
    )
  );

  const content = CREATE("div", { class: "accordion-content" });

  $("input", accordion).onchange = e => {
    if (!e.target.checked || content.dataset.rendered) return;

    list.forEach((s, i) => {
      const item = CREATE("div", { class: "my-2 p-mode" });

      const head = CREATE("div", { class: "table-heading" },
        CREATE("div", { class: "table-title" },
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
  const tbody = CREATE("tbody");

  trades.forEach((t,i)=>{
    sumP += t.pResult??0; sumV += t.vResult??0;
    const limit = side==="win"?{p:t.pSL,v:t.vSL}:{p:t.pTP,v:t.vTP};
    tbody.append(CREATE("tr",{},
      Cells.textCell(i+1),
      Cells.textCell(t.pair),
      Cells.textCell(t.isLong?"Long":"Short"),
      Cells.textCell(FM.formatPrice(t.pair,t.priceEN),"m"),
      Cells.textCell(FM.dateDMY(t.dateEX)),
      Cells.pvCell(limit),
      Cells.pvCell({p:t.pResult,v:t.vResult,t:"R"})
    ));
  });

  tbody.append(CREATE("tr",{},
    CREATE("td",{colSpan:6,className:"no-border"},"."),
    Cells.pvCell({p:sumP,v:sumV,t:"R"})
  ));

  return CREATE("table",{class:"streak-detail-table"},
    CREATE("thead",{},CREATE("tr",{},
      ...["#","Pair","Type","EN Price","EX Date",col,"Realized"]
        .map(h=>Cells.headCell(h,"pivot pivot-x"))
    )),
    tbody
  );
}
