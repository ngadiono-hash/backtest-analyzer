import { APP_STATE, EVENTS } from "core/Constants.js";
import { EventBus } from "core/EventBus.js";
import { FileHandle } from "builder/FileHandle.js";
import { FAB } from "builder/FAB.js";
import { PreviewTable } from "builder/PreviewTable.js";

export class View {
  constructor() {
    this.app = document.getElementById("app");
    this.currentPreview = null;  
  }

  // ============================================================
  // ENTRY POINT
  // ============================================================
  renderState(state, payload = null) {
    this.app.innerHTML = "";

    switch (state) {
      case APP_STATE.EMPTY:
        this.renderUpload();
        break;

      case APP_STATE.PREVIEW:
        this.renderPreview(payload);
        this._injectPreviewFAB();
        break;

      case APP_STATE.READY:
        this.renderDashboard(payload);
        break;
    }
  }

  // ============================================================
  // FILE UPLOAD VIEW
  // ============================================================
  renderUpload() {
    const view = new FileHandle({
      onProcess: ({ raw, fileName }) => {
        EventBus.emit(EVENTS.UI_UPLOAD_FILE, { raw, fileName });
      }
    });

    this._renderView(view);
  }

  // ============================================================
  // PREVIEW TABLE VIEW
  // ============================================================
  renderPreview(data) {
    this.currentPreview = new PreviewTable({
      data,
      onEdit: (id, field) => EventBus.emit(EVENTS.UI_EDIT_ROW, { id, data: field }),
      onDelete: id => EventBus.emit(EVENTS.UI_DELETE_ROW, { id }),
      onSave: () => EventBus.emit(EVENTS.UI_COMMIT_DB)
    });

    this._renderView(this.currentPreview);
  }

  // Called by Controller when model updates the preview
  updatePreview({ trades, stats, fileName }) {
    if (!this.currentPreview) return;
    this.currentPreview.updateData({ trades, stats, fileName });
  }

  // ============================================================
  // DASHBOARD VIEW
  // ============================================================
  renderDashboard(data) {
    // TODO: Implement real dashboard
    const div = document.createElement("div");
    div.textContent = "Dashboard placeholder";
    this.app.append(div);
  }

  // ============================================================
  // GLOBAL UI COMPONENTS
  // ============================================================
  _injectPreviewFAB() {
    const fab = new FAB({
      onAdd: () => EventBus.emit(EVENTS.UI_ADD_ROW),
      onSave: () => EventBus.emit(EVENTS.UI_COMMIT_DB),
      onDelete: () => EventBus.emit(EVENTS.UI_DELETE_ALL),
      onCopy: () => EventBus.emit(EVENTS.UI_COPY_DATA)
    });

    this.app.append(fab.render());
  }

  // ============================================================
  // FEEDBACK FROM MODEL → UI
  // ============================================================
  showNotification(type, message) {
    // Basic minimal UI (temporary)
    const box = document.createElement("div");
    box.className = `notif notif-${type}`;
    box.textContent = message;

    document.body.append(box);

    setTimeout(() => box.remove(), 1500);
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  _renderView(viewInstance) {
    this.app.innerHTML = "";
    this.app.append(viewInstance.render());
  }
}