// src/db/IndexedDB.js
import { DB_NAME, DB_VERSION, SCHEMA } from "db/Schema.js";

class IndexedDBWrapper {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db; // guard

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => reject(req.error);

      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        const trx = e.target.transaction;

        Object.entries(SCHEMA).forEach(([storeName, cfg]) => {
          let store;

          if (!db.objectStoreNames.contains(storeName)) {
            store = db.createObjectStore(storeName, {
              keyPath: cfg.keyPath,
              autoIncrement: cfg.autoIncrement
            });
          } else {
            store = trx.objectStore(storeName);
          }

          // Create indexes
          (cfg.indexes || []).forEach(index => {
            if (!store.indexNames.contains(index.name)) {
              store.createIndex(
                index.name,
                index.keyPath,
                index.options ?? {}
              );
            }
          });
        });
      };
    });
  }

  tx(storeName, mode = "readonly") {
    if (!this.db) throw new Error("Database not opened. Call open() first.");

    const tx = this.db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    return { tx, store };
  }
}

export const IndexedDB = new IndexedDBWrapper();