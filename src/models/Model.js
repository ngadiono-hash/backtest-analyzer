// src/models/Model.js
import { EventBus } from "core/EventBus.js";
import { TradeStore } from "db/DataStore.js";
import { ModelPreview } from "model/ModelPreview.js";
import { ModelAnalytic } from "model/ModelAnalytic.js";

export class Model {
  constructor() {
    this.state = "EMPTY";
    this.trades = [];
    this.pre = new ModelPreview();
    this.core = new ModelAnalytic();
    this.filter = { pairs: null, range: null };
  }
  async initialize() {
    const rows = await TradeStore.getAll();
  
    if (!rows.length) {
      this.trades = [];
      return this._setState("EMPTY");
    }
  
    this.trades = rows;
  
    this._buildAndEmit();
  }
  
  rebuild(filterPatch) {
    if (this.state !== "READY") return;
    this.filter = { ...this.filter, ...filterPatch };
    log(this.filter)
    this._buildAndEmit();
  }

  _buildAndEmit() {
    this.stats = this.core.build(this.trades, this.filter);
    this._setState("READY", { stats: this.stats, filter: this.filter });
  }

  async commitToDB() {
    if (!this.trades.length || this.state == "READY") return;
  
    const invalid = this.trades.filter(t => !t.valid);
    if (invalid.length) return this._feedback("error", `Cannot proceed analysis, there are ${invalid.length} invalid rows`);
    
    try {
      for (const t of this.trades) {
        await TradeStore.insert(this.pre.mapToDB(t));
      }
  
      const rows = await TradeStore.getAll();
      this.trades = rows;
  
      this._buildAndEmit();
    } catch (err) {
      this._feedback("error", `Something wrong: ${err.message}`);
    }
  }

  loadFile(raw, fileName) {
    try {
      this.trades = this.pre.buildTrade(raw);
      this.fileName = fileName;
      const payload = { trades: this.trades, fileName: this.fileName };
      this._setState("PREVIEW", payload);
      this._feedback("success", `Loaded ${this.trades.length} trades from ${fileName}`);
    } catch (err) {
      this._feedback("error", `Failed to load file: ${err.message}`);
    }
  }
  

  async deleteAll() {
    try {
      await TradeStore.clear();
      this.trades = [];
      this._setState("EMPTY");
      this._feedback("warning", "All backtest data has been permanently deleted");
    } catch (err) {
      this._feedback("error", `Failed to clear data: ${err.message}`);
    }
  }

  updateRow(cmd) {
    const { id, changes, idx } = cmd;
    const i = this.trades.findIndex(t => t.id === id);
    if (i === -1) return;
    const merged = { ...this.trades[i], ...changes };
  
    const normalized = this.pre.normalize([merged])[0];
  
    this.trades[i] = normalized;
    const validated = this.pre.validate([normalized])[0];
  
    this.trades[i] = validated;
    EventBus.emit("model:preview-updated", {
      action: "edit-row",
      payload: { id, row: validated, trades: this.trades }
    });
  
    this._feedback(
      validated.valid ? "success" : "warning",
      validated.valid
        ? `Row ${idx} is valid now`
        : `Row ${idx} updated but still invalid`
    );
  }
  
  deleteRow(cmd) {
    const { id, idx } = cmd;
    const row = this.trades.findIndex(t => t.id === id);  
    if (row === -1) return;
    this.trades.splice(row, 1);  
    EventBus.emit("model:preview-updated", { action: "delete-row", payload: { id, trades: this.trades }}); 
    this._feedback("success", `Row ${idx} deleted successfully`);
  }

  _setState(state, payload = null) {
    this.state = state;
    EventBus.emit("model:state-change", { state, payload });
  }

  _feedback(type, message, meta = null) {
    EventBus.emit("model:feedback", { type, message, meta });
  }
  
}