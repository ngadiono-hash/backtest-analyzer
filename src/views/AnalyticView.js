// src/views/builders/AnalyticSheet.js
import * as FM           from "util/formatter.js";
import * as CB           from "builder/chart_builder.js";
import * as TB           from "builder/table_builder.js";

export class AnalyticView {
  constructor({ data, onFilter }) {
    this.data = data;
    this.onFilter = onFilter;
    this.tabs = ["overview","general","monthly","streak","drawdown","accumulate","summary"];
    this.root = create("section", { class: "page-stats" });

    this._initLayout();
    // this._initFilter();
    this._initSwiper();
    this._initContent(this.data);
  }

  render() {
    return this.root;
  }

  /* ---------- mount once ---------- */

  _initLayout() {
    this.navBar = create("div", { className: "nav-bar" },
      ...this.tabs.map((id, i) =>
        create("button", {
          className: "nav-btn",
          dataset: { index: i }
        }, FM.capitalize(id))
      )
    );
    this.swiperEl  = create("div", { className: "swiper" });
    this.wrapperEl = create("div", { className: "swiper-wrapper" },
      ...this.tabs.map(id =>
        create("div", { id, className: "swiper-slide" })
      )
    );
    this.swiperEl.append(this.wrapperEl);
    this.filterBar = create("div", { className: "filter-bar collapsed" });
    this.root.append(this.navBar, this.swiperEl, this.filterBar);
  }

  _initSwiper() {
    const btns = $$(".nav-btn", this.navBar);

    const updateTabs = (active) => {
      btns.forEach((b, i) => {
        const on = i === active;
        b.classList.toggle("active", on);
        on && b.scrollIntoView({ inline: "center", block: "nearest" });
      });
    };

    this.swiper = new Swiper(this.swiperEl, {
      loop: true,
      slidesPerView: 1,
      resistanceRatio: 0.5,
      speed: 250,
      autoHeight: false,
      touchStartPreventDefault: false,
      on: {
        realIndexChange: sw => updateTabs(sw.realIndex)
      }
    });

    updateTabs(0);
    btns.forEach(b =>
      b.onclick = () => this.swiper.slideToLoop(+b.dataset.index)
    );
  }

  _initFilter() {
    this.rangeGroup = create("div", { className: "filter-group range" });
    this.pairGroup  = create("div", { className: "filter-group pair" });
    this.filterBar.append(this.rangeGroup, this.pairGroup);
  }

renderRangeFilters(container, ranges, onChange) {
  container.innerHTML = "";

  ranges.forEach(r => {
    const btn = document.createElement("button");
    btn.className = "range-btn";
    btn.dataset.range = r.id;
    btn.textContent = r.label;

    btn.onclick = () => {
      [...container.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      onChange(r.id);
    };

    container.appendChild(btn);
  });
}

renderPairFilters(container, pairs, onChange) {
  container.innerHTML = "";

  const btnAll = document.createElement("button");
  btnAll.className = "pair-btn active";
  btnAll.dataset.pair = "ALL";
  btnAll.textContent = "ALL";

  container.appendChild(btnAll);

  pairs.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "pair-btn";
    btn.dataset.pair = p;
    btn.textContent = p;
    container.appendChild(btn);
  });

  container.onclick = e => {
    const btn = e.target.closest(".pair-btn");
    if (!btn) return;

    const pair = btn.dataset.pair;

    if (pair === "ALL") {
      [...container.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      onChange(null); // null = ALL
      return;
    }

    btn.classList.toggle("active");
    btnAll.classList.remove("active");

    const active = [...container.querySelectorAll(".pair-btn.active")]
      .map(b => b.dataset.pair)
      .filter(p => p !== "ALL");

    if (!active.length) {
      btnAll.classList.add("active");
      onChange(null);
    } else {
      onChange(active);
    }
  };
}

  _initContent(data) {
    // this.tableGeneral?.(data.general);
    this.chartGlobalEquity?.(data.view.curve);
    // this.tableAccumulation?.(data.period.accum);
    // this.monthlyPerformance?.(data.yearly, data.monthly);
  }

  
  
  // tableGeneral(data) {
  //   const container = $("#general", this.root);
  //   const b = new TB.Tables(container).setId("general-table");

  //   const header = [
  //     create("th", { class:"pivot pivot-xy pips-mode" }, "Metrics"),
  //     TB.Cells.headCell("All", "pivot pivot-x pips-mode"),
  //     TB.Cells.headCell("Long", "pivot pivot-x pips-mode"),
  //     TB.Cells.headCell("Short", "pivot pivot-x pips-mode"),
  //   ];

  //   const rows = Object.keys(data.a).map(m => ([
  //     TB.Cells.textCell(FM.toTitle(m), "pivot pivot-y pips-mode"),
  //     TB.Cells.pvCell(data.a[m]),
  //     TB.Cells.pvCell(data.l[m]),
  //     TB.Cells.pvCell(data.s[m])
  //   ]));

  //   b.header(header).rows(rows).build();
  //   // container.prepend(TB.Toggler(container));
  // }

  chartGlobalEquity(data) {
    const overview = $("#overview", this.root);
    overview.innerHTML = "";
    const { wrapper, canvas, controls } = this._buildChartLayout(data);
    overview.append(wrapper);
    
    const config  = CB.lineChartConfig(data);
    const chart   = CB.initChart("equity-global", canvas, config);
    CB.resizeConfig(wrapper, chart);
    // CB.lineChartAllPairs(controls, stats, chart)
    return chart;
  }
  
  // tableAccumulation(accum) {
  //   const { monthly, yearly, total } = accum;
  
  //   const container = $("#accumulate", this.root);
  //   const table = new TB.Tables(container).setId("monthly-table");
  
  //   const years = Object.keys(yearly).sort();
  
  //   /* ---------- header ---------- */
  
  //   const header = [
  //     create("th", { className: "pivot pivot-xy pips-mode" }, "Month"),
  //     ...years.map(y => TB.Cells.headCell(y, "pivot pivot-x pips-mode"))
  //   ];
  
  //   /* ---------- rows ---------- */
  
  //   const rows = MONTH_NAMES.map(name => {
  //     const mm = String(MONTHS[name] + 1).padStart(2, "0");
  
  //     const cells = years.map(y =>
  //       TB.Cells.pvCell(monthly[`${y}-${mm}`], "N")
  //     );
  
  //     return [
  //       TB.Cells.textCell(name, "pivot pivot-y pips-mode"),
  //       ...cells
  //     ];
  //   });
  
  //   /* ---------- total per year ---------- */
  
  //   rows.push([
  //     TB.Cells.textCell("Total", "pivot pivot-y pips-mode"),
  //     ...years.map(y => TB.Cells.pvCell(yearly[y], "N"))
  //   ]);
  
  //   /* ---------- grand total ---------- */
  
  //   const grand = TB.Cells.pvCell(total, "N");
  //   const merged = create("td", {
  //     colspan: years.length,
  //     className: "grand-total-row"
  //   });
  //   merged.append(...grand.childNodes);
  
  //   rows.push([
  //     TB.Cells.textCell("Grand", "pivot pivot-y pips-mode"),
  //     merged
  //   ]);
  
  //   table.header(header).rows(rows).build();
  // }

  // monthlyPerformance(yearly, monthly) {
  //   const container = $("#monthly", this.root);
  //   container.innerHTML = "";
  //   if (!monthly || !Object.keys(monthly).length) {
  //     container.textContent = "No monthly data available.";
  //     return;
  //   }
  
  //   // --- Group months by year ----------
  //   const yearMap = {};
  //   for (const monthKey in monthly) {
  //     const [y] = monthKey.split("-");
  //     if (!yearMap[y]) yearMap[y] = [];
  //     yearMap[y].push(monthKey);
  //   }
  
  //   // --- Build Accordion for each YEAR ---
  //   for (const year in yearMap) {
  //     const yearSection = this._buildYearSection(
  //       year,
  //       yearMap[year],
  //       monthly,
  //       yearly[year] ?? null
  //     );
  //     container.append(yearSection);
  //   }
  // }

  // _buildYearSection(year, monthKeys, stats) {
  //   const header = CB.createHeaderYear(year, monthKeys, stats);
  //   const body = create("div", { class: "accordion-content" });
  //   monthKeys.sort().forEach(mk => body.append(this._buildMonthSection(mk, stats[mk])));
  //   header.append(body);
  //   return header;
  // }

  // _buildMonthSection(monthKey, datas) {
  //   const data = datas.equity
  //   const header = CB.createHeaderMonth(monthKey, datas);
  //   const body = create("div", { class: "accordion-content" });
  //   const { wrapper, canvas, controls } = this._buildChartLayout(data);
  //   body.append(wrapper);
  //   body.append(controls);
  //   const config  = CB.lineChartConfig(data);
  //   $('input[type="checkbox"]', header).addEventListener("change", (e) => {
  //     if (e.target.checked) {
  //       const chart = CB.initChart(`equity-${monthKey}`, canvas, config);
  //       CB.lineChartAllPairs(controls, data, chart);
  //     }
  //   });
  //   header.append(body);
  //   return header;
  // }
  
  _buildChartLayout(data) {
    const canvas  = create("canvas", { class: "canvas" });
    const wrapper = create("div", { class: "chart-wrapper" }, canvas);
    
    const controls = create("div", { class: "filter-group pair" });
    const pairs = ["ALL", ...FM.getUniquePairs(data)];
    const counts = data.p.reduce((acc, t) => {
      acc[t.pair] = (acc[t.pair] || 0) + 1;
      return acc;
    }, {});
    pairs.forEach(pair => {
      const count = pair === "ALL" ? data.p.length : (counts[pair] ?? 0);
      const btn = create("button", { 
        class: `${pair === "ALL" ? "active" : ""}`, "data-pair": pair 
      });
      btn.append(document.createTextNode(pair + " "));
      const badge = create("small", { class: "badge" }, count);
      btn.append(badge);
      controls.append(btn);
    });
    return { wrapper, canvas, controls };
  }

  
}
