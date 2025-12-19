// src/controllers/Controller.js
import { EventBus } from "core/EventBus.js";
import { Model } from "model/Model.js";
import { View } from "view/View.js";

export class Controller {
  constructor() {
    this.model = new Model();
    this.view = new View();
  }

  bootstrap() {
    this._bindModelEvents();
    this._bindViewEvents();
    this.model.initialize();
  }

  _bindViewEvents() {
    EventBus.on("ui:upload-file", (e) => {
      const { raw, fileName } = e.detail;
      this.model.loadFile(raw, fileName);
    });
    EventBus.on("ui:edit-row", (e) => {
      this.model.updateRow(e.detail);
    });
    EventBus.on("ui:delete-row", (e) => {
      this.model.deleteRow(e.detail);
    });
    EventBus.on("ui:delete-all", () => {
      this.model.deleteAll();
    });
    EventBus.on("ui:save-db", () => {
      this.model.commitToDB();
    });
    EventBus.on("ui:filter-change", (e) => {
      this.model.rebuild(e.detail);
    });
    
  }

  _bindModelEvents() {
    EventBus.on("model:state-change", (e) => {
      const { state, payload } = e.detail;
      this.view.renderState(state, payload);
    });
    EventBus.on("model:preview-updated", (e) => {
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
    EventBus.on("model:feedback", (e) => {
      const { type, message } = e.detail;
      this.view.notify(type, message);
    });
    
  }
}