// src/models/Model.js

import { EventBus } from "core/EventBus.js";
import { EVENTS, APP_STATE } from "core/Constants.js";

import { open as openDB, trades as TradeStore } from "db/DataStore.js";

import * as DT from "component/data_tools.js";       // parse / normalize / validate
import * as MT from "component/metric_tools.js";     // untuk keperluan dashboard statistik

export class Model {

  constructor() {
    this.state = APP_STATE.EMPTY;
    this.trades = [];          // preview data hasil upload
    this.dbTrades = [];        // data dari DB
    this.fileName = null;
  }

  async initialize() {
    await openDB();
    const count = await TradeStore.count();

    if (count === 0) {
      this._setState(APP_STATE.EMPTY);
      return;
    }

    const rows = await TradeStore.getAll();
    this.dbTrades = rows;

    this._setState(APP_STATE.READY);

    EventBus.emit(EVENTS.DB_UPDATED, { trades: rows });
  }

loadRawFile(raw, fileName) {
  try {
    // 1) Parsing
    const parsed = DT.parseText(raw).map(DT.normalize);

    // 2) Validasi penuh
    let trades = DT.validate(parsed);

    // 3) Tambahkan ID sementara
    trades = trades.map((t, i) => ({
      id: "tmp_" + i,
      ...t
    }));

    this.trades = trades;
    this.fileName = fileName;

    const payload = {
      trades,
      stats: this._calculateStats(trades),
      fileName
    };

    // 4) Update state (akan ditangani Controller → View)
    this._setState(APP_STATE.PREVIEW, payload);

    // 5) Emit feedback sukses
    EventBus.emit(EVENTS.MODEL_FEEDBACK, {
      type: "success",
      message: `Loaded ${trades.length} trades from ${fileName}`
    });

  } catch (err) {
    // 6) Emit feedback error
    EventBus.emit(EVENTS.MODEL_FEEDBACK, {
      type: "error",
      message: `Failed to load file: ${err.message}`
    });
  }
}

  updateRow(id, updatedFields) {
    const idx = this.trades.findIndex(t => t.id === id);
    if (idx < 0) return;
  
    const merged = { ...this.trades[idx], ...updatedFields };
    const validated = MT.validate([merged])[0];
  
    this.trades[idx] = validated;
  
    // Emit ROW_UPDATED (untuk flash)
    EventBus.emit(EVENTS.ROW_UPDATED, {
      id,
      data: validated
    });
  
    // Emit PREVIEW_UPDATED (untuk stats + view sync)
    EventBus.emit(EVENTS.PREVIEW_UPDATED, {
      trades: this.trades,
      stats: this._calculateStats(this.trades),
      fileName: this.fileName
    });
  }

  deleteRow(idx) {
    this.trades.splice(idx, 1);

    EventBus.emit(EVENTS.PREVIEW_UPDATED, {
      trades: this.trades,
      stats: this._calculateStats(this.trades),
      fileName: this.fileName
    });
  }

  // =====================================================================
  // COMMIT TO DATABASE
  // =====================================================================
  async commitToDB() {
    if (!this.trades.length) return;

    // Insert only valid rows
    for (const row of this.trades) {
      if (row.valid) await TradeStore.insert(row);
    }

    // Reload DB
    const rows = await TradeStore.getAll();
    this.dbTrades = rows;

    this._setState(APP_STATE.READY);

    EventBus.emit(EVENTS.DB_UPDATED, {
      trades: rows
    });
  }

  // =====================================================================
  // INTERNAL UTILS
  // =====================================================================
  _setState(state, payload = null) {
    this.state = state;
    EventBus.emit(EVENTS.STATE_CHANGED, { state, payload });
  }

  _calculateStats(list) {
    const total = list.length;
    const valid = list.filter(x => x.valid).length;

    return {
      total,
      valid,
      invalid: total - valid
    };
  }
}