// src/views/builders/AnalyticSheet.js
import { $, $$, create } from "util/template.js";
import * as FM           from "util/formatter.js";
import * as CB           from "builder/chart_builder.js";
import * as TB           from "builder/table_builder.js";
import { Filter }        from "ui/Filter.js";

  
export class AnalyticView {
  constructor({ stats, filter, onChange }) {
    this.onChange = onChange;
    this.data = stats;
    // log(this.data)
    this.filter = filter;
    this.tabs = ["overview","general","monthly","streak","drawdown","accumulate","summary"];
    this.root = create("section", { className: "page-stats" });

    this.renderLayout();
    this.renderFilter();
    this.renderContent();
  }

  render() {
    return this.root;
  }

  /* ---------- layout ---------- */

  renderLayout() {
    this.root.innerHTML = ""; // aman, view ini stateless
    this.nav = this.createSection();
    this.root.append(this.nav);
  }

  /* ---------- filter ---------- */

  renderFilter() {
    const fill = new Filter({
      ranges: this.data.meta.ranges,
      pairs: this.data.meta.pairs,
      onChange: this.onChange,
      state: this.filter
    });

    this.root.append(fill.el);
  }

  /* ---------- content ---------- */

  renderContent() {
    this.renderOverview?.(this.data);
    this.tableGeneral(this.data.general);
    this.chartGlobalEquity(this.data.curve);
  }

  
  createSection() {
    const navBar = create('div', { class: 'nav-bar' });
    navBar.append(...this.tabs.map((id, i) => create('button', { class: 'nav-btn', 'data-index': i }, FM.capitalize(id))));
    const swiper = create('div', { class: 'swiper' });
    const wrapper = create('div', { class: 'swiper-wrapper' });
    wrapper.append(...this.tabs.map(id => create('div', { id, class: 'swiper-slide' })));
    swiper.append(wrapper);
    this.root.append(navBar, swiper);
  
    const navBtn = $$(".nav-btn", navBar);
    const updateTabs = (active) => {
      navBtn.forEach((btn, i) => {
        const isActive = i === active;
        btn.classList.toggle("active", isActive);
        if (isActive) {
          btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      });
    };
    const swp = new Swiper(swiper, {
      loop: true,
      slidesPerView: 1,
      resistanceRatio: 0.5,
      speed: 250,
      autoHeight: false,
      touchStartPreventDefault: false,
      on: { realIndexChange: sw => updateTabs(sw.realIndex) }
    });
  
    updateTabs(0);
    navBtn.forEach(btn => btn.addEventListener("click", () => swp.slideToLoop(+btn.dataset.index)));
  }
  
  
  tableGeneral(stats) {
    const container = $("#general", this.root);
    const b = new TB.Tables(container).setId("general-table");

    const header = [
      create("th", { class:"pivot pivot-xy pips-mode" }, "Metrics"),
      TB.Cells.headCell("All", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("Long", "pivot pivot-x pips-mode"),
      TB.Cells.headCell("Short", "pivot pivot-x pips-mode"),
    ];

    const rows = Object.keys(stats.a).map(m => ([
      TB.Cells.textCell(FM.toTitle(m), "pivot pivot-y pips-mode"),
      TB.Cells.pvCell(stats.a[m]),
      TB.Cells.pvCell(stats.l[m]),
      TB.Cells.pvCell(stats.s[m])
    ]));

    b.header(header).rows(rows).build();
    container.prepend(TB.Toggler(container));
  }


  chartGlobalEquity(stats) {
    const overview = $("#overview", this.root);
    overview.innerHTML = "";
  
    // 1. Layout
    const { wrapper, canvas, controls } = this._buildChartLayout(stats);
    overview.append(wrapper);
    // overview.append(controls);
  
    // 2. Chart
    // const userOpt = CB.lineChartControl(wrapper);
    const config  = CB.lineChartConfig(stats);
    const chart   = CB.initChart("equity-global", canvas, config);
  
    //CB.bindChartControl(wrapper, chart);
    CB.resizeConfig(wrapper, chart);
  
    // 3. Event
    CB.lineChartAllPairs(controls, stats, chart)

    return chart;
  }
  
  _buildChartLayout(data) {
    const canvas  = create("canvas", { class: "canvas" });
    const wrapper = create("div", { class: "chart-wrapper" }, canvas);
  
    const controls = create("div", { class: "pair-filter" });
    const pairs = ["ALL", ...FM.getUniquePairs(data)];
    const counts = data.p.reduce((acc, t) => {
      acc[t.pair] = (acc[t.pair] || 0) + 1;
      return acc;
    }, {});
    pairs.forEach(pair => {
      const count = pair === "ALL" ? data.p.length : (counts[pair] ?? 0);
      const btn = create("button", { 
        class: `pair-btn ${pair === "ALL" ? "active" : ""}`, 
        "data-pair": pair 
      });
      btn.append(document.createTextNode(pair + " "));
      const badge = create("small", { class: "pair-count" }, count);
      btn.append(badge);
      controls.append(btn);
    });
  
    return { wrapper, canvas, controls };
  }
}
