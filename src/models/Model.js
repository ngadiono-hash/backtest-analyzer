// src/models/Model.js
import { EventBus } from "core/EventBus.js";
import { TradeStore } from "db/DataStore.js";
import * as DT from "component/data_tools.js";
import * as MT from "component/metric_tools.js";

export class Model {
  constructor() {
    this.state = "EMPTY";
    this.trades = [];
  }

  async initialize() {
    const rows = await TradeStore.getAll();
    if (!rows.length) return this._setState("EMPTY");
    this.trades = rows
      .map(t => MT.finalizeTrade(t))
      .sort((a, b) => a.dateEX - b.dateEX);
    this._setState("READY", { trades: this.trades });
  }

  async commitToDB() {
    if (!this.trades.length) return;
    const invalid = this.trades.filter(t => !t.valid);
    if (invalid.length) return this._feedback("error", `Cannot proceed analysis, there are ${invalid.length} invalid rows`);
    try {
      for (const t of this.trades) {
        await TradeStore.insert(MT.mapToDB(t));
      }
      const rows = await TradeStore.getAll();
      this.trades = rows
        .map(t => MT.finalizeTrade(t))
        .sort((a, b) => a.dateEX - b.dateEX);
      this._setState("READY", { trades: this.trades });
    } catch (err) {
      this._feedback("error", `Something wrong: ${err.message}`);
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

  loadFile(raw, fileName) {
    try {
      this.trades = DT.buildTrade(raw);
      this.fileName = fileName;
      const payload = { trades: this.trades, fileName: this.fileName };
      this._setState("PREVIEW", payload);
      this._feedback("success", `Loaded ${this.trades.length} trades from ${fileName}`);
    } catch (err) {
      this._feedback("error", `Failed to load file: ${err.message}`);
    }
  }

  updateRow(cmd) {
    const { id, changes, idx } = cmd;
    const row = this.trades.findIndex(t => t.id === id);  
    if (row === -1) return;
    const merged = { ...this.trades[row], ...changes };  
    const validated = DT.validate([merged])[0];  
    this.trades[row] = validated;
    EventBus.emit("model:preview-updated", { action: "edit-row", payload: { id, row: validated, trades: this.trades }});
    this._feedback(validated.valid ? "success" : "warning",
      validated.valid  
        ? `Row ${idx} updated successfully`  
        : `Row ${idx} updated but still invalid`,
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