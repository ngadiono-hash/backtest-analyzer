// src/models/Model.js
import { TradeStore } from "db/DataStore.js";
import { ModelPreview } from "model/ModelPreview.js";

export class Model {
  constructor() {
    this.state = "EMPTY";
    this.trades = [];
    this.pre = new ModelPreview();
  }

  async initialize() {
    const rows = await TradeStore.getAll();
    if (!rows.length) {
      this.trades = [];
      return this._setState("EMPTY");
    }
    this._buildAndEmit(rows);
  }

  async commitToDB() {
    if (!this.trades.length || this.state === "READY") return;
    const invalid = this.trades.filter(t => !t.valid);
    if (invalid.length)
      return this._feedback(
        "error",
        `Cannot proceed analysis, there are ${invalid.length} invalid rows`
      );
    try {
      for (const t of this.trades)
        await TradeStore.insert(this.pre.mapToDB(t));
      const rows = await TradeStore.getAll();
      this._buildAndEmit(rows);
    } catch (err) {
      this._feedback("error", `Something wrong: ${err.message}`);
    }
  }

  _buildAndEmit(trades) {
    const rows = trades
      .map(t => ({
        ...t,
        pResult: t.isWin ? t.pTP : t.pSL,
        vResult: t.isWin ? t.vTP : t.vSL,
        bars: this._estimateBarsHeld(t.dateEN, t.dateEX),
        year: t.month.slice(0, 4)
      }))
      .sort((a, b) => a.dateEX - b.dateEX);
    this._setState("READY", { rows });
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
    EVENT.emit("model:preview-updated", {
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
    EVENT.emit("model:preview-updated", { action: "delete-row", payload: { id, trades: this.trades }}); 
    this._feedback("success", `Row ${idx} deleted successfully`);
  }

  _setState(state, payload = null) {
    this.state = state;
    EVENT.emit("model:state-change", { state, payload });
  }

  _feedback(type, message, meta = null) {
    EVENT.emit("model:feedback", { type, message, meta });
  }
  
  _estimateBarsHeld(entryTs, exitTs) {
    if (!entryTs || !exitTs) return 1;
  
    const hours = this._removeWeekendHours(entryTs, exitTs);
    const tf = TIMEFRAME == "1h" ? 1 : TIMEFRAME == "1d" ? 24 : 4;
  
    return Math.max(1, Math.round(hours / tf));
  }

  _removeWeekendHours(eTs, xTs) {
    let hours = (xTs - eTs) / 36e5;
    const shift = TIMEZONE * 36e5;
  
    const e = new Date(eTs + shift);
  
    // anchor ke awal minggu (Senin)
    const base = new Date(Date.UTC(
      e.getUTCFullYear(),
      e.getUTCMonth(),
      e.getUTCDate()
    ));
    base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  
    // Saturday 04:00 local
    base.setUTCDate(base.getUTCDate() + 5);
    base.setUTCHours(4, 0, 0, 0);
  
    let wStart = base.getTime() - shift;
    let wEnd   = wStart + 2 * 86400e3;
  
    for (; wStart < xTs; wStart += 7 * 86400e3, wEnd += 7 * 86400e3) {
      const overlapStart = Math.max(wStart, eTs);
      const overlapEnd   = Math.min(wEnd, xTs);
  
      if (overlapEnd > overlapStart) {
        hours -= (overlapEnd - overlapStart) / 36e5;
      }
    }
  
    return hours;
  }  
  
}