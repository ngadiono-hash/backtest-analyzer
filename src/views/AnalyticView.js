
import * as FM from "util/formatter.js";
import * as CB from "builder/chart_builder.js";
import * as TB from "builder/table_builder.js";

export class AnalyticView {
  constructor({ onFilter }) {
    Object.assign(this, {
      onFilter,
      tabs: ["overview","general","monthly","streak","drawdown","summaries"],
      root: create("section", { class: "page-stats" }),
      charts: Object.create(null)
    });
  
    this.lastRange = null;
    this.lastView  = null;
    this._rangesRendered = false;
    this._initLayout();
    this._initFilter();
    this._initSwiper();
    
    
    this._tabState = Object.fromEntries(
      this.tabs.map(t => [t, { rendered:false, dirty:true }])
    );
  }
  
  render = () => this.root;

  /* ================= update ================= */

  update(view) {
    if (!view) return;
    this.lastView = view;
  
    const { filter, pairStats } = view;
  
    if (!this._rangesRendered) 
      this._renderRanges(filter.years);
      this._rangesRendered = true;
    
  
    if (!this._pairsRendered) 
      this._renderPairs(pairStats);
      this._pairsRendered = true;
    
  
    this._updateRangeActive(filter.range);
    this._updatePairBadges(pairStats, filter.range);
    this._updatePairActive(filter.pairs);
  
    Object.values(this._tabState).forEach(t => t.dirty = true);
  
    this._renderActiveTab();
  }

  /* ================= range ================= */

  _renderRanges(years = []) {
    const ranges = ["ALL","3M","6M", ...years];
    this.rangeGroup.innerHTML = "";
  
    ranges.forEach(r => {
      const b = create(
        "button",
        { className:"range-btn", dataset:{ range:r } },
        r
      );
      b.addEventListener("click", () =>
        this.onFilter({ range:r })
      );
      this.rangeGroup.append(b);
    });
  
    this.$rangeBtns = $$("[data-range]", this.rangeGroup);
  }
  
  _updateRangeActive(range) {
    const r = String(range);
    this.$rangeBtns.forEach(b =>
      b.classList.toggle("active", b.dataset.range === r)
    );
  }

  /* ================= pair ================= */

  _renderPairs(pairStats = {}) {
    this.pairGroup.innerHTML = "";
    this.pairBtns = new Map();

    Object.entries(pairStats).forEach(([pair, count]) => {
      const b = create(
        "button",
        { className:"pair-btn", dataset:{ pair } },
        create("span",{className:"pair-label"},pair),
        create("small",{className:"badge"},count)
      );

      b.addEventListener("click", () =>
        this.onFilter({
          pair,
          on: !b.classList.contains("active")
        })
      );

      this.pairBtns.set(pair, b);
      this.pairGroup.append(b);
    });

    this.$pairBtns = [...this.pairBtns.values()];
  }

  _updatePairBadges(pairStats, range) {
    if (range === this.lastRange) return;
    this.lastRange = range;

    this.$pairBtns.forEach(b => {
      const n = pairStats[b.dataset.pair] || 0;
      $(".badge", b).textContent = n;
      b.classList.toggle("disabled", !n);
    });
  }

  _updatePairActive(pairs) {
    const set = new Set(pairs);
    this.$pairBtns.forEach(b =>
      b.classList.toggle("active", set.has(b.dataset.pair))
    );
  }

  /* ================= layout & infra ================= */

  _initLayout() {
    this.navBar = create("div",{class:"nav-bar"},
      ...this.tabs.map((t,i)=>
        create("button",{class:"nav-btn",dataset:{index:i}},FM.capitalize(t))
      )
    );

    this.wrapperEl = create("div",{class:"swiper-wrapper"},
      ...this.tabs.map(id=>create("div",{id,class:"swiper-slide"}))
    );

    this.swiperEl  = create("div",{class:"swiper"},this.wrapperEl);
    this.filterBar = create("div",{class:"filter-bar collapsed"});

    this.root.append(this.navBar,this.swiperEl,this.filterBar);
  }

  _initFilter() {
    this.rangeGroup = create("div",{class:"filter-group range"});
    this.pairGroup  = create("div",{class:"filter-group pair"});
    this.filterBar.append(this.rangeGroup,this.pairGroup);
  }

  _initSwiper() {
    if (this.swiper) return;

    const btns = $$(".nav-btn", this.navBar);
    const sync = i => btns.forEach((b,x)=>
      b.classList.toggle("active", x===i) &&
      x===i &&
      b.scrollIntoView({inline:"center"})
    );

    this.swiper = new Swiper(this.swiperEl,{
      loop:true,
      slidesPerView:1,
      resistanceRatio:.5,
      speed:250,
      touchStartPreventDefault:false,
      allowTouchMove: !!localStorage.getItem("swiper"),
      on:{
        realIndexChange: sw => (
          sync(sw.realIndex),
          this._renderActiveTab()
        )
      }
    });

    sync(0);
    btns.forEach(b =>
      b.onclick = () => this.swiper.slideToLoop(+b.dataset.index)
    );
  }

  updateSwiper(on) {
    this.swiper.allowTouchMove = on;
    this.swiper.update();
  }

  /* ================= tab ================= */

  _renderActiveTab() {
    if (!this.lastView || !this.swiper) return;
  
    const i   = this.swiper.realIndex;
    const tab = this.tabs[i];
    const st  = this._tabState[tab];
  
    if (st.rendered && !st.dirty) return;
  
    const d = this.lastView.data;
  
    ({
      overview:  () => this._sectionOverview(d.curve),
      general:   () => this._sectionGeneral(d.general),
      monthly:   () => this._sectionYearMonth(d.monthly),
      streak:    () => this._sectionStreak(d.streak),
      drawdown:  () => this._sectionDrawdown(d.drawdown),
      summaries: () => this._sectionSummaries(d.summaries),
    })[tab]?.();
    st.rendered = true;
    st.dirty    = false;
  }

  /* ---------- sections ---------- */

  _sectionOverview(d) {
    this._renderChart({ key:"equity-global", container:$("#overview",this.root), data:d, config:CB.lineChartConfig });
  }

  _sectionGeneral(d) {
    const root = $("#general",this.root); root.innerHTML = "";
    const sec = create("div", { class: "p-mode"} );
    new TB.Tables(sec).setId("general-table")
      .header([
        create("th",{class:"pivot pivot-xy"},"Metrics"),
        ...["All","Long","Short"].map(h=>TB.Cells.headCell(h,"pivot pivot-x"))
      ])
      .rows(Object.keys(d.a).map(k=>[
        TB.Cells.textCell(FM.toTitle(k),"pivot pivot-y"),
        TB.Cells.pvCell(d.a[k]), TB.Cells.pvCell(d.l[k]), TB.Cells.pvCell(d.s[k])
      ]))
      .build("General Metrics Performance", true)
    root.append(sec)
  }

  _sectionYearMonth(d) {
    const r=$("#monthly",this.root); r.innerHTML="";
    if (!d || !Object.keys(d).length) return r.textContent="No monthly data available.";
    Object.keys(d).sort().reverse().forEach(y=>r.append(this._buildYearSection(y,d[y])));
  }

  _sectionSummaries(d) {
    const r = $("#summaries",this.root); r.innerHTML="";
    const { monthly,yearly,total } = d.accumulate,
      { countM, countY, period, summaryM, summaryY } = d.summary,
      years = Object.keys(yearly).sort(),
      sec = [create("div",{class:"mb-2 p-mode"}),create("div",{class:"mb-2 p-mode"}),create("div",{class:"mb-2 p-mode"})];

    r.append(...sec);

    const yearHeaders = years.map(y =>
      TB.Cells.headCell(y, "pivot pivot-x p-mode")
    );
    const monthRows = MONTH_NAMES.map(n => {
      const mm = String(MONTHS[n] + 1).padStart(2, "0");
      return [
        TB.Cells.textCell(n, "pivot pivot-y"),
        ...years.map(y => TB.Cells.pvCell(monthly[`${y}-${mm}`], "R"))
      ];
    });
    const totalRow = [
      TB.Cells.textCell("Total", "pivot pivot-y"),
      ...years.map(y => TB.Cells.pvCell(yearly[y], "R", "total-row"))
    ];
    const grand = TB.Cells.pvCell(total, "R");
    const merged = create("td", {
      colspan: years.length,
      className: "grand-total-row"
    });
    merged.append(...grand.childNodes);
    
    const grandRow = [
      TB.Cells.textCell("Grand", "pivot pivot-y"),
      merged
    ];
    
    new TB.Tables(sec[0])
      .setId("monthly-table")
      .header([
        create("th", { class: "pivot pivot-xy p-mode" }, "Month"),
        ...yearHeaders
      ])
      .rows([
        ...monthRows,
        totalRow,
        grandRow
      ])
      .build("Net Monthly Accumulation", true);
    //${FM.dateDMY(period.start, true)} To ${FM.dateDMY(period.end, true)
    new TB.Tables(sec[1]).setId("monthSummary-table")
      .rows([
        ...Object.entries(summaryM).map(([k,v])=>[TB.Cells.textCell(FM.toTitle(k),"pivot pivot-y p-mode"),TB.Cells.pvCell(v)]),
      ])
      .build(`Summary Performance of ${countM}`, true);
      const formatters = {
        start: FM.dateDMY,
        end: FM.dateDMY
      };
      
    new TB.Tables(sec[2]).setId("yearSummary-table")
      .rows([
        [
          TB.Cells.textCell("Start Period", "pivot pivot-y p-mode"),
          TB.Cells.textCell(FM.dateDMY(summaryY.start, true))
        ],
        [
          TB.Cells.textCell("End Period", "pivot pivot-y p-mode"),
          TB.Cells.textCell(FM.dateDMY(summaryY.end, true))
        ],
        [
          TB.Cells.textCell("Average Return", "pivot pivot-y p-mode"),
          TB.Cells.pvCell(summaryY.averageReturn)
        ],
        [
          TB.Cells.textCell("Best Net Year", "pivot pivot-y p-mode"),
          TB.Cells.pvCell(summaryY.bestYear)
        ],
        [
          TB.Cells.textCell("Worst Net Year", "pivot pivot-y p-mode"),
          TB.Cells.pvCell(summaryY.worstYear)
        ]
      ])
      .build(`Summary Performance of ${countY}`, true);
  }
  
  _sectionStreak(d) {
    const root = $("#streak", this.root); root.innerHTML = "";
  
    const tabBar = create("div", { className: "streak-tabs" });
    const panels = create("div", { className: "streak-panels" });
  
    const tabs = {
      win: TB.buildCard("win", d.win, "streak-tab"),
      lose: TB.buildCard("lose", d.lose, "streak-tab")
    };
  
    Object.entries(tabs).forEach(([side, tab]) => {
      tab.dataset.tab = side;
      tabBar.append(tab);
    });
  
    const panel = side =>
      create("div", {
        className: "streak-panel p-2",
        dataset: { panel: side, state: "inactive" }
      });
  
    const panelsMap = {
      win: panel("win"),
      lose: panel("lose")
    };
  
    TB.showDetailSheet("win", d.win, panelsMap.win);
    TB.showDetailSheet("lose", d.lose, panelsMap.lose);
  
    panels.append(panelsMap.win, panelsMap.lose);
    root.append(tabBar, panels);
  
    const activate = side => {
      for (const k in tabs) {
        tabs[k].dataset.state = k === side ? "active" : "inactive";
        panelsMap[k].dataset.state = k === side ? "active" : "inactive";
      }
    };
  
    activate("win");
  
    tabBar.addEventListener("click", e => {
      const tab = e.target.closest("[data-tab]");
      if (!tab) return;
      activate(tab.dataset.tab);
    });
  }
  
  _sectionDrawdown(d) {
    const root = $("#drawdown", this.root); root.innerHTML = "";
    const labels = [
      "2024-01-01","2024-01-02","2024-01-03","2024-01-04",
      "2024-01-05","2024-01-06","2024-01-07"
    ];
    
    // equity (naik turun)
    const equity = [10000, 10200, 10150, 10400, 10300, 10550, 10700];
    
    // drawdown (%) dari peak — NILAI NEGATIF
    const drawdown = [0, 0, -0.49, 0, -0.96, 0, 0];
    const config = () => {
      return {
        type: "line", // default
        data: {
          labels,
          datasets: [
            {
              label: "Equity",
              type: "line",
              data: equity,
              yAxisID: "y",
              tension: 0.3,
              pointRadius: 0,
              order: 2
            },
            {
              label: "Drawdown (%)",
              type: "bar",
              data: drawdown,
              yAxisID: "dd",
              order: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false
          },
          scales: {
            y: {
              position: "left",
              min: Math.min(...equity) * 0.995,
              max: Math.max(...equity) * 1.005,
              title: { display: true, text: "Equity" }
            },
            dd: {
              position: "right",
              max: 0,
              min: Math.min(...drawdown),
              title: { display: true, text: "Drawdown (%)" }
            }
          },
        }
      }
    }
    this._renderChart({ key:"equity-drawdown", container: root, data: {}, config });
  }

  /* ---------- helpers ---------- */

  _buildYearSection(y,{summary,months}) {
    const h = CB.createHeaderYear(y,summary),
      b = create("div",{class:"accordion-content"});
    Object.keys(months).sort().forEach(m=>b.append(this._buildMonthSection(m,months[m])));
    return h.append(b), h;
  }

  _buildMonthSection(m,d) {
    const h = CB.createHeaderMonth(m,d),
      b = create("div",{class:"accordion-content"});
    $('input[type="checkbox"]', h).onchange = e => e.target.checked &&
      this._renderChart({key:`equity-${m}`,container:b,data:d.equity,config:CB.lineChartConfig,resize:false});
    return h.append(b), h;
  }
  
  _renderChart({key,container,data,config,resize=true}) {
    let c=this.charts[key];
    if (!c) {
      const cv=create("canvas",{class:"canvas"}),
            w=create("div",{class:"chart-wrapper"},cv);
      container.innerHTML=""; container.append(w);
      return this.charts[key]=new Chart(cv,config(data)), resize&&CB.resizeConfig(w,this.charts[key]), this.charts[key];
    }
    const cfg = config(data);
    c.data.labels = cfg.data.labels;
    cfg.data.datasets.forEach((d,i) => c.data.datasets[i].data = d.data);
    return c.update(), c;
  }
}