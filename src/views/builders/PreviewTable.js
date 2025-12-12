import { $, $$, create } from "util/template.js";
import * as FM from "util/formatter.js";

export class PreviewTable {
  constructor({ data, onEdit, onDelete, onSave }) {
    this.onEdit = onEdit;
    this.onDelete = onDelete;
    this.onSave = onSave;
  
    this.HEADERS = ['pair', 'type', 'dateEN', 'dateEX', 'priceEN', 'priceTP', 'priceSL', 'result'];
    this.root = create("main", { class: "page-preview" });
  
    this.createTable(data);
    this.initSticky();
  }
  
  render() {
    return this.root;
  }
  
  createTable(data) {
    const { trades, stats, fileName } = data;
    
    if (!trades.length) return;
    
    const table = create("table", { id: "trade-table" });
    const thead = create("thead");
    const tbody = create("tbody");
  
    const headerRow = create("tr");
    headerRow.append(create("th", { class: "pivot pivot-xy" }, "#"));
  
    this.HEADERS.forEach(h => {
      headerRow.append(
        create("th", { class: "pivot pivot-x" }, FM.toTitle(h))
      );
    });
  
    thead.append(headerRow);
    table.append(thead, tbody);
  
    trades.forEach((trade, idx) => {
      const row = this._createTableRow(trade, idx);
      tbody.append(row);
    });
    this.root.append(table);
  }
  
  _createTableRow(trade, idx) {
    
    const row = create("tr", {
      class: trade.valid ? "" : "invalid",
      dataset: { id: trade.id }
    });
  
    const tdToggle = create("td",
      { class: "toggle pivot pivot-y", dataset: { id: trade.id } },
      idx + 1
    );
    row.append(tdToggle);
  
    this.HEADERS.forEach((key, colIdx) => {
      const hasError = !trade.valid && trade.issues?.[key];
      const td = create(
        "td",
        {
          class: hasError ? "data-cell cell-error" : "data-cell",
          dataset: {
            col: colIdx,
            row: idx,
            ...(hasError && { tooltip: trade.issues[key] })
          }
        },
        trade[key] ?? ""
      );
  
      if (hasError) {
        td.addEventListener("dblclick", () => {
          this.startCellEdit(td, trade.id, key);
        });
      }
  
      row.append(td);
    });
  
    return row;
  }
  
  startCellEdit(td, id, key) {
    this.finishCellEdit();
    this.editingCell = { td, id, key };
  
    td.contentEditable = true;
    td.focus();
  
    td.addEventListener("blur", () => this.finishCellEdit(), { once: true });
    td.addEventListener("keydown", e => {
      if (e.key === "Enter") e.preventDefault(), td.blur();
    });
  }

  finishCellEdit() {
    if (!this.editingCell) return;
  
    const { td, id, key } = this.editingCell;
    td.contentEditable = false;
  
    let value = td.textContent.trim();
  
    if (['priceEN', 'priceTP', 'priceSL'].includes(key)) {
      const n = parseFloat(value.replace(/[^0-9.-]/g, ""));
      value = isNaN(n) ? null : n;
    }
  
    // Kirim ke View → keluar sebagai event EDIT_ROW
    this.onEdit?.(id, { [key]: value });
  
    this.editingCell = null;
  }
  
  initSticky() {
    const scrollArea = this.root;
  
    const init = () => {
      const pivotsX  = $$(".pivot-x", scrollArea);
      const pivotsY  = $$(".pivot-y", scrollArea);
      const pivotsXY = $$(".pivot-xy", scrollArea);
  
      if (!pivotsX.length && !pivotsY.length && !pivotsXY.length) {
        return setTimeout(init, 100);
      }
  
      scrollArea.addEventListener("scroll", () => {
        const x = scrollArea.scrollLeft;
        const y = scrollArea.scrollTop;
  
        // ==== VERTICAL SCROLL ====
        if (y > 0) {
          pivotsX.forEach(el => el.classList.add("stuck-x"));
          pivotsXY.forEach(el => el.classList.add("stuck-xy"));
        } else {
          pivotsX.forEach(el => el.classList.remove("stuck-x"));
          // XY only removed if also no horizontal
          if (x === 0) {
            pivotsXY.forEach(el => el.classList.remove("stuck-xy"));
          }
        }
  
        // ==== HORIZONTAL SCROLL ====
        if (x > 0) {
          pivotsY.forEach(el => el.classList.add("stuck-y"));
          pivotsXY.forEach(el => el.classList.add("stuck-xy"));
        } else {
          pivotsY.forEach(el => el.classList.remove("stuck-y"));
          if (y === 0) {
            pivotsXY.forEach(el => el.classList.remove("stuck-xy"));
          }
        }
      });
    };
  
    init();
  }


}