// ~/model/TradeData.js
import { parseText, normalize, validate } from '../helpers/dataTools.js'
export const HEADERS = ['pair', 'type', 'dateEN', 'dateEX', 'priceEN', 'priceTP', 'priceSL', 'result'];

export class TradeData {
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
		const parsed = parseText(raw).map(normalize);
		this.trades = validate(parsed);
		this._dispatchChange();
	}

	saveRow(idx, updated) {
		if (idx < 0 || idx >= this.trades.length) return;
		const validated = validate([{ ...this.trades[idx], ...updated, valid: true, issues: [] }])[0];
		this.trades[idx] = validated;
		this._dispatchChange();
	}

	exportCsv() {
		return !this.trades.length ? '' : this.trades.map(t => HEADERS.map(h => t[h] ?? '').join(';')).join('\n');
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

		window.dispatchEvent(new CustomEvent('tradedata-updated', {
			detail: { trades: this.trades, stats, fileName: this.currentFileName }
		}));
	}

}