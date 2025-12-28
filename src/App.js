// src/App.js
import { Model } from "model/Model.js";
import { View } from "view/View.js";

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