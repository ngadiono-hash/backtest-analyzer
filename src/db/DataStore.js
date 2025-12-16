// src/db/DataStore.js
import { IndexedDB } from "db/IndexedDB.js";

const withStore = async (mode, fn) => {
  await IndexedDB.open();
  return new Promise((resolve, reject) => {
    const { tx, store } = IndexedDB.tx("trades", mode);
    tx.onerror = () => reject(tx.error);
    fn(store, resolve, reject);
  });
};

export const TradeStore = {

  insert: row =>
    withStore("readwrite", (store, resolve) =>
      store.add(row).onsuccess = e => resolve(e.target.result)
    ),

  update: (id, row) =>
    withStore("readwrite", (store, resolve) =>
      store.put({ ...row, id }).onsuccess = () => resolve(true)
    ),

  delete: id =>
    withStore("readwrite", (store, resolve) =>
      store.delete(id).onsuccess = () => resolve(true)
    ),

  getAll: () =>
    withStore("readonly", (store, resolve) =>
      store.getAll().onsuccess = e => resolve(e.target.result)
    ),

  count: () =>
    withStore("readonly", (store, resolve) =>
      store.count().onsuccess = e => resolve(e.target.result)
    ),

  clear: () =>
    withStore("readwrite", (store, resolve) => {
      store.clear();
      resolve(true);
    })

};