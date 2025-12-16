// src/views/builders/AnalyticSheet.js

export class AnalyticSheet {
  constructor({ data }) {
    this.data = data;
    this.tabs = ["overview","general","monthly","streak","drawdown","accumulate","summary"];
  }
  
}