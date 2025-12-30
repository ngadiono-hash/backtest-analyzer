import * as FM from "util/formatter.js";

export class Preview {
  constructor({ data, onEdit, onDelete, onSave }) {
    this.onEdit = onEdit;
    this.onDelete = onDelete;
    this.onSave = onSave;
    this.HEADERS = ["pair", "type", "dateEN", "dateEX","priceEN", "priceTP", "priceSL", "result"];
    this.root = CREATE("section", { class: "page-preview" });

    // internal state
    this.trades = [];
    this.fileName = null;
    this.rowMap = new Map();
    this.editingCell = null;
    this._renderInitial(data);
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
    const content = CREATE("div", { class: "status-info" });
    const statsBox = CREATE("div", { class: "stats" },
      CREATE("span", "Total rows"),
      CREATE("span", "Invalid rows"),
      CREATE("span", "Total issues"),
    
      CREATE("b", $$("tbody tr").length),
      CREATE("b", invalidRows.length),
      CREATE("b", totalIssues)
    );
    
    content.append(statsBox);
    
    if (invalidRows.length) {
      const list = CREATE("ul", { class: "issues" });
      invalidRows.forEach(row => {
        const rowItem = CREATE("li", {}, `Row ${row.row}`);
        if (row.issues.length > 0) {
          const subList = CREATE("ul", { class: "issue-list" });
          row.issues.forEach(i => {
            subList.append(
              CREATE("li", {}, `${FM.toTitle(i.key)}: ${i.message}`)
            );
          });
          rowItem.append(subList);
        }
        list.append(rowItem);
      });
      content.append(list);
    } else {
      content.append(CREATE("p", { class: "txt-c" }, "All rows are valid"));
    }
    
    return content;
  }

  // INITIAL RENDER
  // ============================================================
  _renderInitial({ trades }) {
    if (!trades?.length) return;

    this.trades = trades;

    this.table = CREATE("table", { id: "trade-table" });
    this.thead = CREATE("thead");
    this.tbody = CREATE("tbody");

    this._renderHeader();
    this._renderBody(trades);

    this.table.append(this.thead, this.tbody);
    this.root.append(this.table);
  }

  _renderHeader() {
    const tr = CREATE("tr");
    tr.append(CREATE("th", { class: "pivot pivot-xy" }, "#"));

    this.HEADERS.forEach(h =>
      tr.append(CREATE("th", { class: "pivot pivot-x" }, FM.toTitle(h)))
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
  
    const row = CREATE("tr", {
      class: trade.valid ? "" : "invalid",
      dataset: {
        id: trade.id,
        row: rowNumber
      }
    });
  
    const pivot = CREATE("td",
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
      const td = CREATE("td", {
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


}