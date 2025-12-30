// src/views/View.js
import * as UI        from "ui/UI.js";
import { Adaptor }    from "submodel/Adaptor.js";
import { Landing }    from "subview/Landing.js";
import { Preview }    from "subview/Preview.js";
import { Analytic }   from "subview/Analytic.js";

export class View {
  constructor() {
    this.app = $("#app");
    this.notif = new UI.Notify();
    this.preview = null;
    this.ready = null;
    this.state = null;
  }
  
  notify(type, message) {
    return this.notif.show(type, message);
  }

  renderState(state, payload = null) {
    const prev = this.state;
    this.state = state;
    const hardReset = state !== prev || state === "EMPTY" || state === "PREVIEW";
  
    if (hardReset) {
      this.app.innerHTML = "";
      this.ready = null;
      this.preview = null;
    }
  
    switch (state) {
      case "EMPTY":
        this.renderLANDING();
        break;
  
      case "PREVIEW":
        this.renderPREVIEW(payload);
        this._injectFAB([
          { label: "info",    onClick: () => this._showSnapShoot() },
          { label: "process", onClick: () => EVENT.emit("ui:save-db") },
          { label: "add",     onClick: () => EVENT.emit("ui:add-record") },
          { label: "delete",  onClick: () => this._confirmDelete(false) },
        ]);
        break;
  
      case "READY":
        this.renderDASHBOARD(payload);
        this._injectFAB([
          { label: "tune",    onClick: (e) => this._toggleFilter(e) },
          { label: "export",  onClick: () => EVENT.emit("ui:export-data") },
          { label: "gesture", onClick: (e) => this._swiperToggle(e), active: localStorage.getItem("swiper") },
          { label: "delete",  onClick: () => this._confirmDelete(false) },
        ]);
        break;
    }
  }

  renderLANDING() {
    const view = new Landing({
      onProcess: ({ raw, fileName }) => {
        EVENT.emit("ui:upload-file", { raw, fileName });
      }
    });
    this._renderView(view);
  }

  renderPREVIEW(data) {
    this.preview = new Preview({
      data,
      onEdit: (data) => EVENT.emit("ui:edit-row", { data }),
      onDelete: (data) => this._confirmDelete(true, data),
    });
    this._renderView(this.preview);
  }
  
  renderDASHBOARD(payload) {
    const { rows } = payload;
  
    this.adaptor ??= new Adaptor();
    this.adaptor.setSource(rows);
  
    if (!this.ready) {
      this.ready = new Analytic({
        onFilter: patch => {
          const view = this.adaptor.applyFilter(patch);
          this.ready.update(view);
        }
      });
  
      this._renderView(this.ready);
    }
    this.ready.update(this.adaptor.getView());
  }

  previewUpdateRow({ trades, stats, fileName }) {
    if (!this.preview) return;
    this.preview.rowUpdated({ trades, stats, fileName });
  }
  
  previewDeleteRow({ id, trades, stats }) {
    if (!this.preview) return;
    this.preview.rowDeleted({ id, trades, stats });
  }
  
  _swiperToggle(e) {
    const wasOn = localStorage.getItem("swiper") !== null;
    const on = !wasOn;
    if (on) localStorage.setItem("swiper", 1);
    else localStorage.removeItem("swiper");
  
    e.target.closest("a")?.classList.toggle("active", on);
    this.ready?.updateSwiper(on);
  }

  _showSnapShoot() {
    const modal = new UI.Modal({
      title: "Preview Status",
      content: this.preview.getSnapShoots()
    });
    modal.render();
  }
  
  _confirmDelete(single = true, data = null) {
    const strT = single ? `Delete row ${data.idx}` : `Delete all record`;
    const strC = `Are you sure to delete ${ single ? "this row?" : "this record?"}`;
    const emt = single ? "ui:delete-row" : "ui:delete-all";
    
    const modal = new UI.Modal({
      title: strT,
      content: strC,
      actions: [
        { label: "Cancel", class: "btn btn-warning", onClick: () => {} },
        { label: "Delete", class: "btn btn-danger", onClick: () => EVENT.emit(emt, { data }) }
      ]
    });
    modal.render();
  }
  
  _toggleFilter(e) {
    $(".filter-bar", this.root).classList.toggle("collapsed");
    $(".swiper", this.root).classList.toggle("shrink");
  }
  
  _injectFAB(actions) {
    this.fab = new UI.FAB(actions).render();
  }

  _renderView(viewInstance) {
    this.app.innerHTML = "";
    this.app.append(viewInstance.render());
  }
}