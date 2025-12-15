// src/db/DataStore.js
import { IndexedDB } from "db/IndexedDB.js";


export async function openDB() {
  await IndexedDB.open();
}

export const TradeStore = {

  async insert(row) {
    await openDB();

    return new Promise((resolve, reject) => {
      const { tx, store } = IndexedDB.tx("trades", "readwrite");

      tx.onerror = (e) => reject(tx.error || e.target.error);
      tx.oncomplete = () => {};

      const req = store.add(row);
      req.onsuccess = () => resolve(req.result);
    });
  },

  async update(id, row) {
    await openDB();

    return new Promise((resolve, reject) => {
      const { tx, store } = IndexedDB.tx("trades", "readwrite");

      tx.onerror = (e) => reject(tx.error || e.target.error);

      const req = store.put({ ...row, id });
      req.onsuccess = () => resolve(true);
    });
  },

  async delete(id) {
    await openDB();

    return new Promise((resolve, reject) => {
      const { tx, store } = IndexedDB.tx("trades", "readwrite");

      tx.onerror = (e) => reject(tx.error || e.target.error);

      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
    });
  },

  async getAll() {
    await openDB();

    return new Promise((resolve, reject) => {
      const { tx, store } = IndexedDB.tx("trades");

      tx.onerror = (e) => reject(tx.error || e.target.error);

      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
  },

  async count() {
    await openDB();

    return new Promise((resolve, reject) => {
      const { tx, store } = IndexedDB.tx("trades");

      tx.onerror = (e) => reject(tx.error || e.target.error);

      const req = store.count();
      req.onsuccess = () => resolve(req.result);
    });
  },
  
  async clear() {
    await openDB();
  
    return new Promise((resolve, reject) => {
      const { tx, store } = IndexedDB.tx("trades", "readwrite");
  
      tx.onerror = (e) => reject(tx.error || e.target.error);
      tx.oncomplete = () => resolve(true);
  
      store.clear();
    });
  }
  
  

};