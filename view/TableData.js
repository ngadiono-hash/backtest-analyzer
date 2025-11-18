// ~/view/TableData.js
import { $, $$, _ready } from "../helpers/shortcut.js";
import { HEADERS } from '../model/TradeData.js';

export class TableData {
	constructor(data) {
		this.data = data;
		this.container = $('#trade-table-container');
		this.editingCell = null;
		this.showInvalidOnly = false;
		
		this.renderSkeleton();
		this.tbody = this.table.querySelector('tbody');
		
		this.initFilter();
		this.bindEvents();
	}
	
	initFilter() {
		$('#filter-invalid')?.addEventListener('change', e => {
			this.showInvalidOnly = e.target.checked;
			this.render(this.data);
		});
	}
	
	bindEvents() {
		window.addEventListener('tradedata-updated', e => {
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
		const table = document.createElement('table');
		table.id = 'trade-table';
		table.className = 'trade-table';
		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		const thToggle = document.createElement('th');
		thToggle.textContent = '#';
		thToggle.className = 'col-toggle';
		headerRow.appendChild(thToggle);
		
		HEADERS.forEach(h => {
			const th = document.createElement('th');
			th.textContent = h;
			th.className = 'col-header';
			headerRow.appendChild(th);
		});
		
		thead.appendChild(headerRow);
		table.appendChild(thead);
		
		const tbody = document.createElement('tbody');
		table.appendChild(tbody);
		
		this.table = table;
		this.tbody = tbody;
	
		this.container.appendChild(table);
	}
	
	render(trades) {
		if (!this.tbody) return;
		this.tbody.innerHTML = ''; // bersihkan tbody saja
		
		if (!trades.length) return;
		
		const filtered = this.showInvalidOnly ?
			trades.filter(t => !t.valid) :
			trades;
		
		const frag = document.createDocumentFragment();
		
		filtered.forEach((trade, idxInAll) => {
			const tr = this.createRow(trade, idxInAll, trades);
			frag.append(tr, tr._rawRow);
		});
		
		this.tbody.appendChild(frag);
	}
	
	createRow(trade, idx) {
		const tr = document.createElement('tr');
		tr.dataset.row = idx;
		if (!trade.valid) tr.classList.add('invalid');
		
		const tdRow = Object.assign(document.createElement('td'), {
			textContent: idx + 1,
			className: 'toggle-raw',
			style: 'cursor:pointer',
		});
		tr.appendChild(tdRow);
		
		const dataCells = HEADERS.map((key, colIdx) => {
			const td = document.createElement('td');
			td.dataset.col = String(colIdx);
			td.dataset.row = String(idx);
			td.textContent = trade[key] ?? '';
			td.className = 'data-cell';
			
			if (!trade.valid && trade.issues?.[key]) {
				td.classList.add('cell-error');
				td.dataset.tooltip = trade.issues[key];
			}
			
			td.addEventListener('dblclick', () =>
				td.classList.contains('cell-error') && this.startCellEdit(td, idx, key)
			);
			
			tr.appendChild(td);
			return td;
		});
		
		const rawRow = document.createElement('tr');
		rawRow.className = 'raw-line-row';
		rawRow.style.display = 'none';
		
		const rawTd = document.createElement('td');
		rawTd.colSpan = HEADERS.length + 1;
		rawTd.innerHTML = `<code class="raw-line">${trade.origin}</code>`;
		rawRow.appendChild(rawTd);
		
		tdRow.addEventListener('click', e => {
			e.stopPropagation();
			const hidden = rawRow.style.display === 'none' || rawRow.style.display === '';
			rawRow.style.display = hidden ? 'table-row' : 'none';
			tdRow.style.fontWeight = hidden ? 'bold' : '';
			tdRow.style.color = hidden ? '#007bff' : '';
			tdRow.title = hidden ? 'Klik untuk sembunyikan raw' : 'Klik untuk lihat baris asli (raw)';
		});
		
		tr._rawRow = rawRow;
		tr._dataCells = dataCells;
		return tr;
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
      <span>File: <strong>${fileName}</strong> | </span>
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