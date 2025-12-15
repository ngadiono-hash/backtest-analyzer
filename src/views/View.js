import { APP_STATE, EVENTS } from "core/Constants.js";
import { EventBus } from "core/EventBus.js";
import { FileHandle } from "ui/FileHandle.js";
import { FAB } from "ui/FAB.js";
import { PreviewTable } from "builder/PreviewTable.js";
import { Modal } from "ui/Modal.js";

export class View {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
  }

  renderState(state, payload = null) {
    this.app.innerHTML = "";

    switch (state) {
      case "EMPTY":
        this.renderLANDING();
        break;

      case "PREVIEW":
        this.renderPREVIEW(payload);
        this._injectFAB([
          { icon: "❓", label: "Info",   onClick: () => this._showSnapShoot(this.status) },
          { icon: "📊", label: "Process",onClick: () => EventBus.emit("ui:save-db") },
          { icon: "🗑️", label: "Delete", onClick: () => this._confirmDelete(false)  },
          { icon: "📝", label: "Add",    onClick: () => EventBus.emit("ui:add-record") }
        ]);
        break;

      case "READY":
        this.renderDASHBOARD(payload);
        this._injectFAB([
          { icon: "🗑️", label: "Delete", onClick: () => this._confirmDelete(false) },
          { icon: "📥", label: "Export", onClick: () => EventBus.emit("ui:export-data") },
          { icon: "📝", label: "Add",    onClick: () => EventBus.emit("ui:add-record") }
        ]);
        break;
    }
  }

  renderLANDING() {
    const view = new FileHandle({
      onProcess: ({ raw, fileName }) => {
        EventBus.emit("ui:upload-file", { raw, fileName });
      }
    });

    this._renderView(view);
  }

  renderPREVIEW(data) {
    this.currentView = new PreviewTable({
      data,
      onEdit: (data) => EventBus.emit("ui:edit-row", { data }),
      onDelete: (data) => this._confirmDelete(true, data),
    });

    this._renderView(this.currentView);
  }

  updateRow({ trades, stats, fileName }) {
    if (!this.currentView) return;
    this.currentView.rowUpdated({ trades, stats, fileName });
  }
  
  deleteRow({ id, trades, stats }) {
    if (!this.currentView) return;
    this.currentView.rowDeleted({ id, trades, stats });
  }
  

  renderDASHBOARD(data) {
    
  }
  
  _showSnapShoot() {
    const modal = new Modal({
      title: "Preview Status",
      content: this.currentView.getSnapShoots()
    });
    modal.render();
  }
  
  _confirmDelete(single = true, data = null) {
    const strT = single ? `Delete row ${data.idx}` : `Delete all record`;
    const strC = `Are you sure to delete ${ single ? "this row?" : "this record?"}`;
    const emt = single ? "ui:delete-row" : "ui:delete-all";
    
    const modal = new Modal({
      title: strT,
      content: strC,
      actions: [
        {
          label: "Cancel",
          class: "btn btn-warning",
          onClick: () => {}
        },
        {
          label: "Delete",
          class: "btn btn-danger",
          onClick: () => EventBus.emit(emt, { data })
        }
      ]
    });
    modal.render();
  }
  
  _injectFAB(actions) {
    this.fab?.remove();
    this.fab = new FAB(actions).render();
    document.body.append(this.fab);
  }

  _renderView(viewInstance) {
    this.app.innerHTML = "";
    this.app.append(viewInstance.render());
  }
}