// src/App.js
import { Model } from "model/Model.js";
import { View }  from "view/View.js";

class App {
  constructor() {
    this.model = new Model();
    this.view = new View();
    this.bootstrap();
  }

  bootstrap() {
    this._bindModelEvents();
    this._bindViewEvents();
    this.model.initialize();
  }

  _bindViewEvents() {
    EVENT.on("ui:upload-file", (e) => {
      const { raw, fileName } = e.detail;
      this.model.loadFile(raw, fileName);
    });
    EVENT.on("ui:edit-row", (e) => {
      this.model.updateRow(e.detail);
    });
    EVENT.on("ui:delete-row", (e) => {
      this.model.deleteRow(e.detail);
    });
    EVENT.on("ui:delete-all", () => {
      this.model.deleteAll();
    });
    EVENT.on("ui:save-db", () => {
      this.model.commitToDB();
    });
    EVENT.on("ui:filter-change", (e) => {
      this.model.rebuild(e.detail);
    });
    
  }

  _bindModelEvents() {
    EVENT.on("model:state-change", (e) => {
      const { state, payload } = e.detail;
      this.view.renderState(state, payload);
    });
    EVENT.on("model:preview-updated", (e) => {
      const { action, payload } = e.detail;
      switch (action) {
        case "edit-row":
          this.view.previewUpdateRow(payload);
          break;
        case "delete-row":
          this.view.previewDeleteRow(payload);
          break;
      }
    });
    EVENT.on("model:feedback", (e) => {
      const { type, message } = e.detail;
      this.view.notify(type, message);
    });
    
  }
}

document.addEventListener('DOMContentLoaded', new App());
document.addEventListener("click", e => {
  const el = e.target.closest("a,button");
  if (!el) return;
  el.classList.toggle("tap");
  setTimeout(() => el.classList.toggle("tap"), 180);
});

// src/
// ├── App.js // entry point antara domain (model) dengan views
// │
// ├── core/                  
// │   └── Constants.js # konstanta yang bisa dipakai semua file. sengaja aku panggil dalam bentuk modul tadi dalam bentuk script global
// │
// ├── domain/
// │   ├── preview/ # sub domain lain
// │   └── analytic/ # fokus refactor
// │       ├── AnalyticEngine.js      # entrypoint analytic (pengganti ModelAnalytic)
// │       ├── FilterEngine.js        # filter analytic
// │       ├── EquityEngine.js        # equity, curve, drawdown
// │       ├── PeriodEngine.js        # period, summary
// │       ├── BreakdownEngine.js     # monthly, yearly
// │       ├── types.js               # shape hasil (opsional, tapi sangat membantu)
// │       └── helpers/
// │           ├── metric.js          # pindahan metric_tools
// │           └── math.js
// │
// ├── adapters/
// │   └── AnalyticAdapter.js
// │
// ├── views/
// │   ├── View.js
// │   ├── preview/  # subview lain
// │   └── analytic/ # fokus refactor
// │       ├── AnalyticView.js
// │       └── sections/
// │           ├── OverviewSection.js
// │           ├── DrawdownSection.js
// │           ├── MonthlySection.js
// │           └── SummarySection.js
// │
// ├── builders/              # PURE RENDER HELPERS
// │   ├── chart/
// │   │   ├── chartBuilder.js
// │   │   ├── chartPlugins.js
// │   │   └── chartContext.js
// │   └── tableBuilder.js
// │
// ├── ui/
// │   └── UI.js
// │
// ├── utils/
// │   ├── format/
// │   │   ├── number.js
// │   │   ├── date.js
// │   │   └── percent.js
// │   └── guard.js