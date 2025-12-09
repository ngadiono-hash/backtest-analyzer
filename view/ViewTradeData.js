
import { $, $$, create } from "../helpers/template.js";
import * as FM           from "../helpers/converter.js";
const HEADERS = ['pair', 'type', 'dateEN', 'dateEX', 'priceEN', 'priceTP', 'priceSL', 'result'];

export class ViewTradeData {
	constructor() {
		this.container = $('#page-list');
		this.editingCell = null;
		this.renderSkeleton();
		this.tbody = this.table.querySelector('tbody');
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
	
  renderSkeleton() {
    this.container.innerHTML = '';
    const table = create('table', {
      className: "trade-table",
      id: "trade-table"
    });
    const headerRow = create("tr", {});
    headerRow.append(
      create("th", {
        className: "pivot pivot-xy",
        textContent: "#"
      })
    );
    HEADERS.forEach(h => {
      headerRow.append(
        create("th", {
          className: "pivot pivot-x",
          textContent: FM.toTitle(h)
        })
      );
    });
  
    const thead = create("thead", {}, headerRow);
    const tbody = create("tbody", {});
    const sta = create("div", { id: "status-area"});
    const exp = create("button", { id: "export-btn" }, "Copy");
    table.append(thead, tbody);
    this.table = table;
    this.tbody = tbody;
    this.container.prepend(sta, exp);
    this.container.append(table);
  }
	
  render(trades) {
    this.tbody.innerHTML = '';
  
    if (!trades.length) return;
  
    const frag = document.createDocumentFragment();
  
    trades.forEach((trade, idxInAll) => {
      const { row, rawRow } = this.createRow(trade, idxInAll);
      frag.append(row, rawRow);
    });
  
    this.tbody.appendChild(frag);
  }
	
  createRow(trade, idx) {
    const row = create("tr", {
      dataset: { row: idx },
      className: trade.valid ? "" : "invalid"
    });
  
    // === # Column (toggle raw row) ===================================
    const tdToggle = create(
      "td",
      {
        textContent: idx + 1,
        className: "toggle-raw pivot pivot-y",
        style: "cursor:pointer",
        dataset: { row: idx }
      }
    );
    row.append(tdToggle);
  
    // === Data Columns =================================================
    const dataCells = HEADERS.map((key, colIdx) => {
      const hasError = !trade.valid && trade.issues?.[key];
  
      const td = create(
        "td",
        {
          textContent: trade[key] ?? "",
          className: hasError ? "data-cell cell-error" : "data-cell",
          dataset: { col: colIdx, row: idx, ...(hasError && { tooltip: trade.issues[key] }) }
        }
      );
  
      td.addEventListener("dblclick", () => {
        if (hasError) this.startCellEdit(td, idx, key);
      });
  
      row.append(td);
      return td;
    });
  
    // === RAW Row ======================================================
    const rawRow = create("tr", { className: "raw-line-row", style: "display:none" });
  
    const rawTd = create("td", { colSpan: HEADERS.length + 1 });
    rawTd.innerHTML = `<code class="raw-line">${trade.origin}</code>`;
    rawRow.append(rawTd);
  
    // === Toggle Logic =================================================
    tdToggle.addEventListener("click", e => {
      e.stopPropagation();
      const hidden = rawRow.style.display === "none";
  
      rawRow.style.display = hidden ? "table-row" : "none";
      tdToggle.style.fontWeight = hidden ? "bold" : "";
      tdToggle.style.color = hidden ? "#007bff" : "";
    });
  
    // === Return compact package ======================================
    return {
      row,
      rawRow,
      dataCells
    };
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
		this.render(this.data.getTrades());
		this.ui?.notify?.show?.('success', 'Cell saved!');
	}
	
	updateStatus({ fileName = '—', total = 0, valid = 0, invalid = 0 } = {}) {
		const statusEl = $('#status-area');
		const exportBtn = $('#export-btn');
		const tableEl = $('#trade-table');
		if (!statusEl) return;
		
		const hasError = invalid > 0 && total > 0;
		statusEl.innerHTML = `
      <span>File: <strong>${fileName}</strong></span></br>
      <span>Total: <strong>${total}</strong> | </span>
      <span>Valid: <strong class="valid">${valid}</strong> | </span>
      <span>Invalid: <strong class="invalid">${invalid}</strong></span>
    `;
		
		if (exportBtn) exportBtn.disabled = hasError;
		tableEl?.classList.toggle('invalid', hasError);
	}
	
	mapIssuesToKeys(issues) {
		return typeof issues === 'object' ? issues : {};
	}
}