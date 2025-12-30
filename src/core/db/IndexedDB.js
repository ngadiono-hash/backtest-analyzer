// src/db/IndexedDB.js
import { DB_NAME, DB_VERSION, SCHEMA } from "db/Schema.js";

class IndexedDBWrapper {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => reject(req.error);

      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 🔥 HARD RESET strategy (sesuai kesepakatan)
        Object.keys(SCHEMA).forEach(storeName => {
          if (db.objectStoreNames.contains(storeName)) {
            db.deleteObjectStore(storeName);
          }
        });

        // 🔨 Recreate strictly from schema
        Object.entries(SCHEMA).forEach(([storeName, cfg]) => {
          const store = db.createObjectStore(storeName, {
            keyPath: cfg.keyPath,
            autoIncrement: cfg.autoIncrement
          });

          (cfg.indexes || []).forEach(idx => {
            store.createIndex(
              idx.name,
              idx.keyPath,
              idx.options ?? {}
            );
          });
        });
      };
    });
  }

  tx(storeName, mode = "readonly") {
    if (!this.db) {
      throw new Error("IndexedDB not opened. Call open() first.");
    }

    const tx = this.db.transaction(storeName, mode);
    return {
      tx,
      store: tx.objectStore(storeName)
    };
  }
}

export const IndexedDB = new IndexedDBWrapper();