import * as FM from "util/formatter.js";
import * as CB from "builder/chart_builder.js";
import * as TB from "builder/table_builder.js";

export class AnalyticView {
  constructor({ meta, onFilter }) {
    Object.assign(this, {
      meta, onFilter,
      tabs: ["overview","general","monthly","streak","drawdown","summaries"],
      root: create("section", { class: "page-stats" }),
      charts: Object.create(null)
    });
    this._initLayout(); 
    this._initFilter();
    this._initSwiper();
  }
  
  applySwiperState(on) {
    this.swiper.allowTouchMove = on;
    this.swiper.update();
  }
  
  _initSwiper() {
    if (this.swiper) return;
  
    const btns = $$(".nav-btn", this.navBar),
      sync = i => btns.forEach((b,x)=>
        b.classList.toggle("active", x === i) &&
        x === i &&
        b.scrollIntoView({ inline:"center" })
      );
    let stateSwipe = localStorage.getItem("swiper") ? true : false;
    this.swiper = new Swiper(this.swiperEl,{
      loop:true, slidesPerView:1, resistanceRatio:.5, speed:250, touchStartPreventDefault:false, 
      allowTouchMove: stateSwipe,
      on:{ realIndexChange: sw => (sync(sw.realIndex), this._renderActiveTab()) }
    });
  
    sync(0);
  
    btns.forEach(b =>
      b.onclick = () => this.swiper.slideToLoop(+b.dataset.index)
    );
  }
  
  render = () => this.root;

  update(v) {
    if (!v) return;
    this.lastView = v;
    this._updateRanges(v.filter);
    this._updatePairs(v.pairStats, v.filter.pairs);
    this._renderActiveTab(true);
  }
  
  /* ---------- filter ---------- */
  
  _updateRanges({ range, years=[] }) {
    this.rangeGroup.innerHTML = "";
    this.rangeBtns = [];
  
    const ranges = ["ALL","3M","6M", ...years];
  
    ranges.forEach(r => {
      const btn = create(
        "button",
        {
          className: "range-btn",
          dataset: { range: r },
          onclick: () => this.onFilter({ range: r })
        },
        r
      );
      btn.classList.toggle("active", r === range);
      this.rangeBtns.push(btn);
      this.rangeGroup.append(btn);
    });
  }
  
  _updatePairs(stats = {}, active = []) {
    const act = new Set(active);
  
    Object.entries(stats).forEach(([pair, count]) => {
      let b = this.pairBtns.get(pair);
  
      if (!b) {
        b = create("button", {
          className: "pair-btn",
          dataset: { pair },
          onclick: () => this.onFilter({ pair, on: !b.classList.contains("active") })
        },
          create("span", { className: "pair-label" }, pair),
          create("small", { className: "badge" }, count)
        );
        this.pairBtns.set(pair, b);
        this.pairGroup.append(b);
      } else {
        $(".badge", b).textContent = count;
      }
  
      b.classList.toggle("active", act.has(pair));
    });
  
    [...this.pairBtns].forEach(([p,b]) => !(p in stats) && (b.remove(), this.pairBtns.delete(p)));
  }

  /* ---------- init ---------- */

  _initLayout() {
    this.navBar = create("div", { class:"nav-bar" },
      ...this.tabs.map((t,i)=>create("button",{class:"nav-btn",dataset:{index:i}},FM.capitalize(t)))
    );

    this.wrapperEl = create("div",{class:"swiper-wrapper"},
      ...this.tabs.map(id=>create("div",{id,class:"swiper-slide"}))
    );

    this.swiperEl  = create("div",{class:"swiper"},this.wrapperEl);
    this.filterBar = create("div",{class:"filter-bar collapsed"});
    this.root.append(this.navBar,this.swiperEl,this.filterBar);
  }

  // _initSwiper() {
  //   const btns = $$(".nav-btn", this.navBar),
  //     sync = i => btns.forEach((b,x)=>
  //       b.classList.toggle("active", x === i) && x === i && b.scrollIntoView({inline:"center"})
  //     );

  //   this.swiper = new Swiper(this.swiperEl,{
  //     loop:true,slidesPerView:1,resistanceRatio:.5,speed:250,touchStartPreventDefault:false,
  //     on:{ realIndexChange: sw => (sync(sw.realIndex), this._renderActiveTab()) }
  //   });

  //   sync(0);
  //   btns.forEach(b => b.onclick = (e) => {
  //     this.swiper.slideToLoop(+b.dataset.index);
  //   });
  // }

  _initFilter() {
    this.rangeGroup = create("div",{class:"filter-group range"});
    this.pairGroup  = create("div",{class:"filter-group pair"});
    this.rangeBtns  = [];
    this.pairBtns   = new Map();
    this.filterBar.append(this.rangeGroup,this.pairGroup);
  }

  /* ---------- tabs ---------- */

  _renderActiveTab(force=false) {
    if (!this.lastView || !this.swiper) return;
    const i = this.swiper.realIndex;
    if (!force && this._activeTab === i) return;
    this._activeTab = i;

    const d = this.lastView.data;
    ({
      overview:  () => this._sectionOverview(d.curve),
      general:   () => this._sectionGeneral(d.general),
      monthly:   () => this._sectionYearMonth(d.monthly),
      streak:    () => this._sectionStreak(d.streak),
      summaries: () => this._sectionSummaries(d.summaries),
    })[this.tabs[i]]?.();
  }

  /* ---------- sections ---------- */

  _sectionOverview = d =>
    this._renderChart({ key:"equity-global", container:$("#overview",this.root), data:d, config:CB.lineChartConfig });

  _sectionGeneral(d) {
    new TB.Tables($("#general",this.root)).setId("general-table")
      .header([
        create("th",{class:"pivot pivot-xy p-mode"},"Metrics"),
        ...["All","Long","Short"].map(h=>TB.Cells.headCell(h,"pivot pivot-x p-mode"))
      ])
      .rows(Object.keys(d.a).map(k=>[
        TB.Cells.textCell(FM.toTitle(k),"pivot pivot-y p-mode"),
        TB.Cells.pvCell(d.a[k]), TB.Cells.pvCell(d.l[k]), TB.Cells.pvCell(d.s[k])
      ]))
      .build();
  }

  _sectionYearMonth(d) {
    const r=$("#monthly",this.root); r.innerHTML="";
    if (!d || !Object.keys(d).length) return r.textContent="No monthly data available.";
    Object.keys(d).sort().reverse().forEach(y=>r.append(this._buildYearSection(y,d[y])));
  }

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

  _sectionSummaries(d) {
    const r = $("#summaries",this.root); r.innerHTML="";
    const {monthly,yearly,total}=d.accumulate,
          {countM,countY,period,summaryM,summaryY}=d.summary,
          years=Object.keys(yearly).sort(),
          sec=[create("div",{class:"mb-2"}),create("div",{class:"mb-2"})];

    r.append(...sec);

    new TB.Tables(sec[0]).setId("monthly-table")
      .header([create("th",{class:"pivot pivot-xy p-mode"},"Month"),...years.map(y=>TB.Cells.headCell(y,"pivot pivot-x p-mode"))])
      .rows([
        ...MONTH_NAMES.map(n=>{
          const mm=String(MONTHS[n]+1).padStart(2,"0");
          return [TB.Cells.textCell(n,"pivot pivot-y p-mode"),...years.map(y=>TB.Cells.pvCell(monthly[`${y}-${mm}`],"N"))];
        }),
        [TB.Cells.textCell("Total","pivot pivot-y p-mode"),...years.map(y=>TB.Cells.pvCell(yearly[y],"N"))]
      ])
      .build(create("h3",{class:"txt-c pivot p-mode p-2"},
        `${FM.dateDMY(period.start,true)} - ${FM.dateDMY(period.end,true)}`));

    new TB.Tables(sec[1]).setId("summary-table")
      .rows([
        [create("td",{colspan:2,class:"pivot sprt p-mode"},`Summary Performance of ${countM}`)],
        ...Object.entries(summaryM).map(([k,v])=>[TB.Cells.textCell(FM.toTitle(k),"pivot pivot-y p-mode"),TB.Cells.pvCell(v)]),
        [create("td",{colspan:2,class:"pivot sprt p-mode"},`Summary Performance of ${countY}`)],
        ...Object.entries(summaryY).map(([k,v])=>[TB.Cells.textCell(FM.toTitle(k),"pivot pivot-y p-mode"),TB.Cells.pvCell(v)])
      ])
      .build();
  }
  
  _sectionStreak(d) {
    const root = $("#streak");
    root.innerHTML = "";
  
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
  
  /* ---------- chart ---------- */

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