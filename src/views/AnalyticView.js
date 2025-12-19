// src/views/builders/AnalyticSheet.js
import { $, $$, create } from "util/template.js";
import * as FM           from "util/formatter.js";
import * as CB           from "builder/chart_builder.js";
import * as TB           from "builder/table_builder.js";

export class AnalyticView {
  constructor({ stats, filter, onChange }) {
    this.onChange = onChange;
    this.data = stats;
    this.filter = { ...filter };

    this.tabs = ["overview","general","monthly","streak","drawdown","accumulate","summary"];
    this.root = create("section", { className: "page-stats" });

    this._mounted = false;
    this._initLayout();
    this._initFilter();
    this._initSwiper();

    this.update({ stats, filter, dirty: { meta: true, data: true } });
  }

  render() {
    return this.root;
  }

  /* ---------- mount once ---------- */

  _initLayout() {
    // navbar
    this.navBar = create("div", { className: "nav-bar" },
      ...this.tabs.map((id, i) =>
        create("button", {
          className: "nav-btn",
          dataset: { index: i }
        }, FM.capitalize(id))
      )
    );

    // swiper
    this.swiperEl  = create("div", { className: "swiper" });
    this.wrapperEl = create("div", { className: "swiper-wrapper" },
      ...this.tabs.map(id =>
        create("div", { id, className: "swiper-slide" })
      )
    );
    this.swiperEl.append(this.wrapperEl);

    // filter placeholder
    this.filterBar = create("div", { className: "filter-bar" });

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

  /* ---------- filter (controlled UI) ---------- */

  _initFilter() {
    this.rangeGroup = create("div", { className: "filter-group range" });
    this.pairGroup  = create("div", { className: "filter-group pair" });
    this.filterBar.append(this.rangeGroup, this.pairGroup);
  }

  _renderRange(ranges) {
    this.rangeGroup.replaceChildren(
      ...ranges.map(r =>
        create("button", {
          className: this.filter.range === r ? "active" : "",
          onclick: () => this._toggleRange(r)
        }, r.toUpperCase())
      )
    );
  }

  _renderPairs(pairs) {
    this.pairGroup.replaceChildren(
      ...pairs.map(({ pair, count }) =>
        create("button", {
          className: this.filter.pairs?.includes(pair) ? "active" : "",
          disabled: !count,
          onclick: () => this._togglePair(pair)
        },
          pair,
          create("small", { className: "badge" }, count)
        )
      )
    );
  }

  _toggleRange(range) {
    this.filter.range = this.filter.range === range ? null : range;
    this.onChange(this.filter);
  }

  _togglePair(pair) {
    const set = new Set(this.filter.pairs ?? []);
    set.has(pair) ? set.delete(pair) : set.add(pair);
    this.filter.pairs = set.size ? [...set] : null;
    this.onChange(this.filter);
  }

  /* ---------- public update ---------- */

  update({ stats, filter, dirty }) {
    this.data = stats;
    this.filter = { ...filter };

    if (dirty.meta) {
      this._renderRange(stats.meta.ranges);
      this._renderPairs(stats.meta.pairs);
    }

    if (dirty.data) {
      this._updateSlides(stats.data);
    }
  }

  /* ---------- slide updates ---------- */

  _updateSlides(data) {
    this.tableGeneral?.(data.general);
    this.chartGlobalEquity?.(data.curve);
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
