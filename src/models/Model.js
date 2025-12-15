// src/models/Model.js

import { EventBus } from "core/EventBus.js";
import { EVENTS, APP_STATE } from "core/Constants.js";
import { openDB, TradeStore } from "db/DataStore.js";
import * as DT from "component/data_tools.js";       // parse / normalize / validate
import * as MT from "component/metric_tools.js";     // untuk keperluan dashboard statistik

export class Model {

  constructor() {
    this.state = "EMPTY";
    this.trades = [];
    this.stats = null;
    this.fileName = null;
  }

  async initialize() {
    const rows = await TradeStore.getAll();
    if (!rows.length) {
      this.trades = [];
      this._setState("EMPTY");
    } else {
      this.trades = rows;
      this._setState("READY");
    }
  }

  async commitToDB() {
    if (!this.trades.length) return;
    const inv = this.trades.filter(t => !t.valid).length;
    if (inv > 0) {
      this._feedback("error", `Cannot proceed to analysis, there are ${inv} invalid rows`);
      return;
    }
    try {
      for (const row of this.trades) {
        await TradeStore.insert(row);
      }
      const rows = await TradeStore.getAll();
      this.trades = rows;
      this._setState("READY", { trades: rows });
    } catch (err) {
      this._feedback("error", `Something wrong : ${err.message}`);
    }
  }

  async deleteAll() {
    try {
      await TradeStore.clear();
      this.trades = [];
      this.fileName = null;
      this._setState("EMPTY");
      this._feedback("warning", "Your data has been permanently deleted");
    } catch (err) {
      this._feedback("error", `Failed to clear data: ${err.message}`);
    }
  }

  loadFile(raw, fileName) {
    try {
      this.trades = DT.buildTrade(raw);
      this.fileName = fileName;
      const payload = {
        trades: this.trades,
        fileName: this.fileName
      };
  
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
    const validated = DT._validate([merged])[0];  
    this.trades[row] = validated;
    EventBus.emit("model:preview-updated", {  
      action: "edit-row",  
      payload: { id, row: validated, trades: this.trades }  
    });
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
    EventBus.emit("model:preview-updated", {  
      action: "delete-row",  
      payload: { id, trades: this.trades }  
    }); 
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