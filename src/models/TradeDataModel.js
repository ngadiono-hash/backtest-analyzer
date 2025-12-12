import * as DB from "components/data_builder.js";
import * as DS from "db/DataStore.js";

export class TradeDataModel {
  constructor() {
    this.trades = [];          // buffer aktif di UI (bukan DB)
    this.persisted = [];       // database snapshot
    this.stats = { total: 0, valid: 0, invalid: 0 };
    this.currentFileName = null;
    this.headers = ['pair', 'type', 'dateEN', 'dateEX', 'priceEN', 'priceTP', 'priceSL', 'result'];

    this.initialized = false;
  }

  /** -------------------------------------------------------
   *  INIT — load semua data dari DB saat startup
   * ------------------------------------------------------- */
  async init() {
    if (this.initialized) return;
    
    await DS.open();

    this.persisted = await DS.trades.getAll();
    this.trades = [...this.persisted];  // tampilkan ke tabel
    this._dispatchChange();

    this.initialized = true;
  }

  getTrades() { return this.trades; }
  getStats() { return this.stats; }
  getFileName() { return this.currentFileName; }

  /** -------------------------------------------------------
   *  CREATE (bulk insert dari upload)
   * ------------------------------------------------------- */
  async storeAll(trades) {
    await this.init();

    const results = [];

    for (const row of trades) {
      try {
        await DS.trades.insert(row);
        results.push({ ok: true, row });
      } catch (err) {
        results.push({ ok: false, error: err.message, row });
      }
    }

    // refresh UI state
    this.persisted = await DS.trades.getAll();
    this.trades = [...this.persisted];
    this._dispatchChange();

    return results; // biar View bisa notif success/duplicate/error
  }

  /** -------------------------------------------------------
   *  LOAD FILE (tidak langsung simpan ke DB)
   * ------------------------------------------------------- */
  renderFile(raw, fileName = null) {
    this.currentFileName = fileName;

    const parsed = DB.parseText(raw).map(DB.normalize);
    this.trades = DB.validate(parsed);

    this._dispatchChange();
  }

  /** -------------------------------------------------------
   *  UPDATE satu row (edit cell)
   *  Mode: perubahan hanya terjadi di UI, belum ke DB
   * ------------------------------------------------------- */
  saveRow(idx, updatedFields) {
    if (idx < 0 || idx >= this.trades.length) return;

    const merged = { ...this.trades[idx], ...updatedFields };
    const validated = DB.validate([merged])[0];

    this.trades[idx] = validated;
    this._dispatchChange();
  }

  /** -------------------------------------------------------
   *  COMMIT UPDATE to DB (explicit save)
   *  dipanggil saat user klik "Save to DB"
   * ------------------------------------------------------- */
  async commitRow(idx) {
    const row = this.trades[idx];
    if (!row.valid) throw new Error("Row is invalid, cannot commit.");

    await DS.trades.update(row.id, row); // gunakan keypath "id"

    this.persisted = await DS.trades.getAll();
    this.trades = [...this.persisted];
    this._dispatchChange();
  }

  /** -------------------------------------------------------
   *  DELETE row
   * ------------------------------------------------------- */
  async deleteRow(idx) {
    const row = this.trades[idx];
    if (!row || !row.id) return;

    await DS.trades.delete(row.id);

    this.persisted = await DS.trades.getAll();
    this.trades = [...this.persisted];
    this._dispatchChange();
  }

  /** -------------------------------------------------------
   *  ADD ROW (manual insert)
   * ------------------------------------------------------- */
  addEmptyRow() {
    const blank = {};
    this.headers.forEach(h => blank[h] = "");
    blank.valid = false;
    blank.issues = { manual: "Empty row. Fill required fields." };

    this.trades.push(blank);
    this._dispatchChange();
  }

  /** -------------------------------------------------------
   *  EXPORT (buffer, bukan DB)
   * ------------------------------------------------------- */
  exportCsv() {
    if (!this.trades.length) return "";
    return this.trades
      .map(t => this.headers.map(h => t[h] ?? "").join(";"))
      .join("\n");
  }

  /** -------------------------------------------------------
   *  CLEAR BUFFER (bukan DB)
   * ------------------------------------------------------- */
  clear() {
    this.trades = [];
    this.stats = { total: 0, valid: 0, invalid: 0 };
    this.currentFileName = null;
    this._dispatchChange();
  }

  /** -------------------------------------------------------
   *  DISPATCH UI update
   * ------------------------------------------------------- */
  _dispatchChange() {
    const total = this.trades.length;
    const valid = this.trades.filter(t => t.valid).length;
    const invalid = total - valid;

    this.stats = { total, valid, invalid };

    window.dispatchEvent(
      new CustomEvent("data-updated", {
        detail: {
          trades: this.trades,
          stats: this.stats,
          fileName: this.currentFileName
        }
      })
    );
  }
}