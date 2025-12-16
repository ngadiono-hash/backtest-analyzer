import { $, $$, create } from "util/template.js";
import * as FM from "util/formatter.js";

export class PreviewTable {
  constructor({ data, onEdit, onDelete, onSave }) {
    this.onEdit = onEdit;
    this.onDelete = onDelete;
    this.onSave = onSave;
    this.HEADERS = ["pair", "type", "dateEN", "dateEX","priceEN", "priceTP", "priceSL", "result"];
    this.root = create("section", { class: "page-preview" });

    // internal state
    this.trades = [];
    this.fileName = null;
    this.rowMap = new Map();
    this.editingCell = null;
    this._renderInitial(data);
    this.initSticky();
  }
  
  // PUBLIC API
  // ============================================================
  render() { return this.root; }
  
  rowUpdated({ trades, stats }) {
    const nextMap = new Map(trades.map(t => [t.id, t]));
    this.trades.forEach(prev => {
      const tr = this.rowMap.get(prev.id);
      const next = nextMap.get(prev.id);

      if (!next) {
        tr.remove();
        this.rowMap.delete(prev.id);
        return;
      }

      this._updateRowCells(tr, prev, next);
    });

    // add new rows
    trades.forEach((trade, idx) => {
      if (!this.rowMap.has(trade.id)) {
        const tr = this._createTbodyRow(trade, idx);
        this.rowMap.set(trade.id, tr);
        this.tbody.append(tr);
      }
    });
    this.trades = trades;
  }
  
  rowDeleted({ id, trades }) {
    const tr = this.rowMap.get(id);
    if (tr) {
      tr.remove();
      this.rowMap.delete(id);
    }
    trades.forEach((trade, idx) => {
      const tr = this.rowMap.get(trade.id);
      if (!tr) return;
  
      const rowNumber = idx + 1;
      tr.dataset.row = rowNumber;
      const pivot = $("td.pivot", tr);
      if (pivot) {
        pivot.textContent = trade.valid ? rowNumber : "❌";
        pivot.classList.toggle("del-btn", !trade.valid);
      }
      tr.classList.toggle("invalid", !trade.valid);
    });
    this.trades = trades;
  }

  getSnapShoots() {
    const invalidRows = [];
    const rows = $$("tbody tr.invalid");
    
    rows.forEach(tr => {
      const rowNumber = tr.dataset.row ?? "?";
      const cells = $$(".cell-error", tr);
      const issues = cells.map(td => ({
        key: td.dataset.key,
        message: td.dataset.tooltip
      }));
      if (issues.length) invalidRows.push({ row: Number(rowNumber), issues });
    });
    const totalIssues = invalidRows.reduce(
      (sum, row) => sum + row.issues.length, 0
    );
    const content = create("div", { class: "status-info" });
    const statsBox = create("div", { class: "stats" },
      create("span", "Total rows"),
      create("span", "Invalid rows"),
      create("span", "Total issues"),
    
      create("b", $$("tbody tr").length),
      create("b", invalidRows.length),
      create("b", totalIssues)
    );
    
    content.append(statsBox);
    
    if (invalidRows.length) {
      const list = create("ul", { class: "issues" });
      invalidRows.forEach(row => {
        const rowItem = create("li", {}, `Row ${row.row}`);
        if (row.issues.length > 0) {
          const subList = create("ul", { class: "issue-list" });
          row.issues.forEach(i => {
            subList.append(
              create("li", {}, `${FM.toTitle(i.key)}: ${i.message}`)
            );
          });
          rowItem.append(subList);
        }
        list.append(rowItem);
      });
      content.append(list);
    } else {
      content.append(create("p", { class: "txt-c" }, "All rows are valid"));
    }
    
    return content;
  }

  // INITIAL RENDER
  // ============================================================
  _renderInitial({ trades }) {
    if (!trades?.length) return;

    this.trades = trades;

    this.table = create("table", { id: "trade-table" });
    this.thead = create("thead");
    this.tbody = create("tbody");

    this._renderHeader();
    this._renderBody(trades);

    this.table.append(this.thead, this.tbody);
    this.root.append(this.table);
  }

  _renderHeader() {
    const tr = create("tr");
    tr.append(create("th", { class: "pivot pivot-xy" }, "#"));

    this.HEADERS.forEach(h =>
      tr.append(create("th", { class: "pivot pivot-x" }, FM.toTitle(h)))
    );

    this.thead.append(tr);
  }

  _renderBody(trades) {
    trades.forEach((trade, idx) => {
      const tr = this._createTbodyRow(trade, idx);
      this.rowMap.set(trade.id, tr);
      this.tbody.append(tr);
    });
  }

  _createTbodyRow(trade, idx) {
    const rowNumber = idx + 1;
  
    const row = create("tr", {
      class: trade.valid ? "" : "invalid",
      dataset: {
        id: trade.id,
        row: rowNumber
      }
    });
  
    const pivot = create("td",
      { class: "pivot pivot-y" },
      trade.valid ? rowNumber : "❌"
    );
  
    pivot.addEventListener("click", () => {
      if (!row.classList.contains("invalid")) return;
  
      this.onDelete?.({
        id: trade.id,
        idx: row.dataset.row
      });
    });
    row.append(pivot);
    
    this.HEADERS.forEach(key => {
      const hasError = !trade.valid && trade.issues?.[key];
      const td = create("td", {
        class: `data-cell${hasError ? " cell-error" : ""}`,
        dataset: {
          key,
          ...(hasError && { tooltip: trade.issues[key] })
        }
      }, trade[key] ?? "");
  
      // 🔑 bind once
      td.addEventListener("dblclick", () => {
        if (!td.classList.contains("cell-error")) return;
        this._startEditCell(td, trade.id, key);
      });
  
      row.append(td);
    });
  
    return row;
  }
  
  _updateRowCells(tr, prev, next) {
    this.HEADERS.forEach(key => {
      const td = tr.querySelector(`td[data-key="${key}"]`);
      if (!td) return;
  
      const prevVal = prev[key];
      const nextVal = next[key];
  
      const hadError = !prev.valid && prev.issues?.[key];
      const hasError = !next.valid && next.issues?.[key];
      
      if (prevVal !== nextVal) {
        td.textContent = nextVal ?? "";
        td.classList.add("cell-updated");
        setTimeout(() => td.classList.remove("cell-updated"), 800);
      }
      
      if (hasError) {
        td.classList.add("cell-error");
        td.dataset.tooltip = next.issues[key];
      } else {
        td.classList.remove("cell-error");
        delete td.dataset.tooltip;
      }
    });
    tr.classList.toggle("invalid", !next.valid);
    const pivot = tr.querySelector(".pivot-y");
    if (pivot) pivot.textContent = next.valid ? tr.dataset.row : "❌";
    
  }


  // 
  _startEditCell(td, id, key) {
    
    this.editingCell = { td, id, key, origin: td.textContent };
    td.contentEditable = true;
    td.spellcheck = false;
    td.focus();

    td.addEventListener("blur", () => this._finishEditCell(), { once: true });
    td.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        td.blur();
      }
    });
  }

  _finishEditCell() {
    if (!this.editingCell) return;
    const { td, id, key, origin } = this.editingCell;
    td.contentEditable = false;
    let value = td.textContent.trim();
    if (["priceEN", "priceTP", "priceSL"].includes(key)) {
      const n = parseFloat(value.replace(/[^0-9.-]/g, ""));
      value = isNaN(n) ? null : n;
    }
    if (value === origin || value == null) {
      td.textContent = origin ?? "";
      this.editingCell = null;
      return;
    }
  
    this.onEdit?.(
      {
        id,
        changes: { [key]: value },
        idx: td.closest("tr")?.dataset.row ?? "?"
      }
    );
    this.editingCell = null;
  }
  
  // STICKY HEADER / COLUMN
  // ============================================================
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