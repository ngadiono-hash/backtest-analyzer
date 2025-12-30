// src/db/Schema.js

export const DB_NAME = "BacktestDB";
export const DB_VERSION = 2; // ⬅️ NAIKKAN VERSION (breaking schema)

export const SCHEMA = {

  trades: {
    keyPath: "id",
    autoIncrement: true,

    indexes: [

      // 🔒 Prevent duplicate logical trades
      {
        name: "uniq",
        keyPath: ["pair", "dateEN", "priceEN", "isLong"],
        options: { unique: true }
      },

      // 🔍 Filtering
      { name: "pair", keyPath: "pair" },
      { name: "isWin", keyPath: "isWin" },
      { name: "isLong", keyPath: "isLong" },
      { name: "month", keyPath: "month" },
      // ⏱ Range query
      { name: "dateEN", keyPath: "dateEN" },
      { name: "dateEX", keyPath: "dateEX" },
      // 
      { name: "priceEN", keyPath: "priceEN" },
      { name: "priceSL", keyPath: "priceSL" },
      { name: "priceTP", keyPath: "priceTP" },
      
      { name: "pTP", keyPath: "pTP" },
      { name: "pSL", keyPath: "pSL" },
      { name: "vTP", keyPath: "vTP" },
      { name: "vSL", keyPath: "vSL" },
      
    ]
  }

};