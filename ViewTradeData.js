
import { $, $$, create } from "utils/template.js";
import * as FM           from "utils/converter.js";
import { Notify } from "ui/UIManager.js"
const HEADERS = ['pair', 'type', 'dateEN', 'dateEX', 'priceEN', 'priceTP', 'priceSL', 'result'];

export class ViewTradeData {
	constructor(data) {
	  this.notif = new Notify();
	  this.data = data;
		this.container = $('#page-list');
		this.editingCell = null;
		this.render(this.data);
		this.tbody = $('tbody', this.table);
		this.bindEvents();
	}
	
	bindEvents() {
		window.addEventListener('data-updated', e => {
			const { trades, stats, fileName } = e.detail;
			this.render(trades);
			this.updateStatus({
				fileName: fileName || '—',
				total: stats.total ?? 0,
				valid: stats.valid ?? 0,
				invalid: stats.invalid ?? 0
			});
		});
	}
	
render(trades) {
  if (!trades.length) return;

  this.container.innerHTML = "";

  const table = create("table", { id: "trade-table" });
  const thead = create("thead");
  const tbody = create("tbody");

  // === HEADER ========================================================
  const headerRow = create("tr");
  headerRow.append(create("th", { class: "pivot pivot-xy" }, "#"));

  HEADERS.forEach(h => {
    headerRow.append(
      create("th", { class: "pivot pivot-x" }, FM.toTitle(h))
    );
  });

  thead.append(headerRow);
  table.append(thead, tbody);

  // === BODY ==========================================================
  trades.forEach((trade, idx) => {
    const row = this._createTableRow(trade, idx);
    tbody.append(row);
  });

  const sta = create("div", { id: "status-area"});
  const exp = create("button", { id: "export-btn" }, "Copy");
  this.container.append(sta, exp, table);
}
_createTableRow(trade, idx) {
  const row = create("tr", {
    class: trade.valid ? "" : "invalid",
    dataset: { row: idx }
  });

  // === TOGGLE COLUMN ================================================
  const tdToggle = create("td",
    { class: "toggle-raw pivot pivot-y", dataset: { row: idx } },
    idx + 1
  );
  row.append(tdToggle);

  // === DATA CELLS ====================================================
  HEADERS.forEach((key, colIdx) => {
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

    // double-click editing (validasi error)
    if (hasError) {
      td.addEventListener("dblclick", () => {
        this.startCellEdit(td, idx, key);
      });
    }

    row.append(td);
  });

  // === RAW ROW ======================================================
  const rawRow = create("tr", {
    class: "raw-line-row",
    style: "display:none"
  });

  const rawTd = create("td", {
    colSpan: HEADERS.length + 1
  });

  rawTd.innerHTML = `<code class="raw-line">${trade.origin}</code>`;
  rawRow.append(rawTd);

  // === TOGGLE LOGIC =================================================
  tdToggle.addEventListener("click", e => {
    e.stopPropagation();

    const isHidden = rawRow.style.display === "none";
    rawRow.style.display = isHidden ? "table-row" : "none";

    // UI feedback
    tdToggle.style.fontWeight = isHidden ? "bold" : "";
    tdToggle.style.color = isHidden ? "#007bff" : "";
  });

  return row;
}

	startCellEdit(td, rowIdx, key) {
		this.finishCellEdit();
		this.editingCell = { td, rowIdx, key };
		td.contentEditable = true;
		td.focus();
		
		td.addEventListener('blur', () => this.finishCellEdit(), { once: true });
		td.addEventListener('keydown', e => {
			if (e.key === 'Enter') e.preventDefault(), td.blur();
		});
	}
	
	finishCellEdit() {
		if (!this.editingCell) return;
		
		const { td, rowIdx, key } = this.editingCell;
		td.contentEditable = false;
		let val = td.textContent.trim();
		if (['priceEN', 'priceTP', 'priceSL'].includes(key)) {
			const n = parseFloat(val.replace(/[^0-9.-]/g, ''));
			val = isNaN(n) ? null : n;
		}
		
		const updated = { ...this.data.getTrades()[rowIdx], [key]: val };
		this.data.saveRow(rowIdx, updated);
		this.editingCell = null;
		this.notif.success(`Row ${rowIdx} updated`);
	}
	
	updateStatus({ fileName = '—', total = 0, valid = 0, invalid = 0 } = {}) {
		const statusEl = $('#status-area');
		const exportBtn = $('#export-btn');
		const tableEl = $('#trade-table');
		if (!statusEl) return;
		
		const hasError = invalid > 0 && total > 0;
		statusEl.innerHTML = `
      <span>File: <strong>${fileName}</strong></span></br>
      <span>Total: <strong>${total}</strong> rows | </span>
      <span>Invalid: <strong class="invalid">${invalid}</strong> rows</span>
    `;
		
		if (exportBtn) exportBtn.disabled = hasError;
		tableEl?.classList.toggle('invalid', hasError);
	}
	
	mapIssuesToKeys(issues) {
		return typeof issues === 'object' ? issues : {};
	}
	
}