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
      const { data } = e.detail;
      this.model.updateRow(data);
    });
    EventBus.on("ui:delete-row", (e) => {
      const { data } = e.detail;
      this.model.deleteRow(data);
    });
    EventBus.on("ui:delete-all", () => {
      this.model.deleteAll();
    });
    EventBus.on("ui:save-db", (e) => {
      this.model.commitToDB();
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
    EventBus.on("model:load-db", (e) => {
      this.view.renderDashboard(e.detail);
    });
    EventBus.on("model:feedback", (e) => {
      const { type, message } = e.detail;
      this.view.notify(type, message);
    });
  }
}