import { Model } from "model/Model.js";
import { View } from "view/View.js";
import { EventBus } from "core/EventBus.js";
import { EVENTS, APP_STATE } from "core/Constants.js";

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

  // ============================================================
  // VIEW → CONTROLLER → MODEL
  // ============================================================
  _bindViewEvents() {
    EventBus.on(EVENTS.UI_UPLOAD_FILE, (e) => {
      const { raw, fileName } = e.detail;
      this.model.loadRawFile(raw, fileName);
    });

    EventBus.on(EVENTS.UI_EDIT_ROW, (e) => {
      const { id, data } = e.detail;
      this.model.updateRow(id, data);
    });

    EventBus.on(EVENTS.UI_DELETE_ROW, (e) => {
      const { id } = e.detail;
      this.model.deleteRow(id);
    });

    EventBus.on(EVENTS.UI_COMMIT_DB, () => {
      this.model.commitToDB();
    });
  }

  // ============================================================
  // MODEL → CONTROLLER → VIEW
  // ============================================================
  _bindModelEvents() {
    // 1. State change → view renders new screen
    EventBus.on(EVENTS.MODEL_STATE_CHANGED, (e) => {
      const { state, payload } = e.detail;
      this.view.renderState(state, payload);
    });

    // 2. Preview updated → partial update
    EventBus.on(EVENTS.MODEL_PREVIEW_UPDATED, (e) => {
      this.view.updatePreview(e.detail);
    });

    // 3. Database commits or loads
    EventBus.on(EVENTS.MODEL_DB_UPDATED, (e) => {
      this.view.renderDashboard(e.detail);
    });

    // 4. Model feedback → send to view notification
    EventBus.on(EVENTS.MODEL_FEEDBACK, (e) => {
      const { type, message } = e.detail;
      this.view.showNotification(type, message);
    });
  }
}