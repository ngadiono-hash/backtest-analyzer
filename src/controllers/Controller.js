import { Model } from "model/Model.js";
import { View } from "view/View.js";
import { EventBus } from "core/EventBus.js";
import { EVENTS, APP_STATE } from "core/Constants.js";
import { Notify } from "ui/Notify.js";

export class Controller {
  constructor() {
    this.model = new Model();
    this.view = new View();
    this.notif = new Notify();
  }

  bootstrap() {
    this._bindModelEvents();
    this._bindViewEvents();
    this.model.initialize();
  }

  // ============================================================
  // VIEW → CONTROLLER → MODEL
  // ============================================================
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
    EventBus.on("ui:save-db", () => {
      this.model.commitToDB();
    });
  }

  // ============================================================
  // MODEL → CONTROLLER → VIEW
  // ============================================================
  _bindModelEvents() {
    EventBus.on("model:state-change", (e) => {
      const { state, payload } = e.detail;
      this.view.renderState(state, payload);
    });
    EventBus.on("model:preview-updated", (e) => {
      const { action, payload } = e.detail;
      switch (action) {
        case "edit-row":
          this.view.updateRow(payload);
          break;
    
        case "delete-row":
          this.view.deleteRow(payload);
          break;
      }
    });
    EventBus.on("model:load-db", (e) => {
      this.view.renderDashboard(e.detail);
    });
    EventBus.on("model:feedback", (e) => {
      const { type, message } = e.detail;
      this.notif.show(type, message);
    });
  }
}