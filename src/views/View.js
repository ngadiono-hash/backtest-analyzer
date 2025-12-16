// src/views/View.js
import { EventBus } from "core/EventBus.js";
import { FAB, Modal, Notify } from "ui/ui_tools.js";
import { FileHandle } from "builder/FileHandle.js";
import { PreviewTable } from "builder/PreviewTable.js";
import { AnalyticSheet } from "builder/AnalyticSheet.js";

export class View {
  constructor() {
    this.app = document.getElementById("app");
    this.notif = new Notify();
    this.preview = null;
    this.ready = null;
  }
  
  notify(type, message) {
    return this.notif.show(type, message);
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
          { label: "Info",   onClick: () => this._showSnapShoot() },
          { label: "Process",onClick: () => EventBus.emit("ui:save-db") },
          { label: "Add",    onClick: () => EventBus.emit("ui:add-record") },
          { label: "Delete", onClick: () => this._confirmDelete(false)  },
        ]);
        break;

      case "READY":
        this.renderDASHBOARD(payload);
        this._injectFAB([
          { label: "Delete", onClick: () => this._confirmDelete(false) },
          { label: "Export", onClick: () => EventBus.emit("ui:export-data") },
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
    this.preview = new PreviewTable({
      data,
      onEdit: (data) => EventBus.emit("ui:edit-row", { data }),
      onDelete: (data) => this._confirmDelete(true, data),
    });
    this._renderView(this.preview);
  }
  
  renderDASHBOARD(data) {
    this.ready = new AnalyticSheet({
      
    });
    this._renderView(this.ready);
  }  

  previewUpdateRow({ trades, stats, fileName }) {
    if (!this.preview) return;
    this.preview.rowUpdated({ trades, stats, fileName });
  }
  
  previewDeleteRow({ id, trades, stats }) {
    if (!this.preview) return;
    this.preview.rowDeleted({ id, trades, stats });
  }
  
  _showSnapShoot() {
    const modal = new Modal({
      title: "Preview Status",
      content: this.preview.getSnapShoots()
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
        { label: "Cancel", class: "btn btn-warning", onClick: () => {} },
        { label: "Delete", class: "btn btn-danger", onClick: () => EventBus.emit(emt, { data }) }
      ]
    });
    modal.render();
  }
  
  _injectFAB(actions) {
    this.fab?.remove();
    this.fab = new FAB(actions);
    this.fab.render();
  }

  _renderView(viewInstance) {
    this.app.innerHTML = "";
    this.app.append(viewInstance.render());
  }
}