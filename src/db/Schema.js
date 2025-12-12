// src/db/Schema.js

export const DB_NAME = "BacktestDB";
export const DB_VERSION = 1;

export const SCHEMA = {

  trades: {
    keyPath: "id",
    autoIncrement: true,

    indexes: [
      {
        name: "uniq",
        keyPath: ["pair", "dateEN", "priceEN", "type"],
        options: { unique: true }
      },
      {
        name: "pair",
        keyPath: "pair"
      },
      {
        name: "dateEN",
        keyPath: "dateEN"
      }
    ]
  }

};