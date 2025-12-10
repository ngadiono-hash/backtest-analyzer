
import * as DB from 'components/data_builder.js'

export class TradeDataModel {
	constructor() {
		this.trades = [];
		this.stats = { total: 0, valid: 0, invalid: 0 };
		this.currentFileName = null;
		this.headers = ['pair', 'type', 'dateEN', 'dateEX', 'priceEN', 'priceTP', 'priceSL', 'result'];
	}
	
	getTrades() { return this.trades; }
	getStats() { return this.stats; }
	getFileName() { return this.currentFileName; }

	renderFile(raw, fileName = null) {
		this.currentFileName = fileName;
		const parsed = DB.parseText(raw).map(DB.normalize);
		this.trades = DB.validate(parsed);
		this._dispatchChange();
	}

	saveRow(idx, updated) {
		if (idx < 0 || idx >= this.trades.length) return;
		const validated = DB.validate([{ ...this.trades[idx], ...updated, valid: true, issues: [] }])[0];
		this.trades[idx] = validated;
		this._dispatchChange();
	}

	exportCsv() {
		return !this.trades.length ? '' : this.trades.map(t => this.headers.map(h => t[h] ?? '').join(';')).join('\n');
	}

	clear() {
		this.trades = [];
		this.stats = { total: 0, valid: 0, invalid: 0 };
		this.currentFileName = null;
		this._dispatchChange();
	}

	_dispatchChange() {
		const total = this.trades.length;
		const valid = this.trades.filter(t => t.valid).length;
		const invalid = total - valid;

		const stats = { total, valid, invalid };

		window.dispatchEvent(new CustomEvent('data-updated', {
			detail: { trades: this.trades, stats, fileName: this.currentFileName }
		}));
	}

}