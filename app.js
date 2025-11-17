// ~/app.js
import { $, $$, _ready } from "./helpers/shortcut.js";
import { TradeData } from './model/TradeData.js';
import { TableData } from './view/TableData.js';
import { TradeStat } from './model/TradeStat.js';
import { TableStat } from './view/TableStat.js';
import { TabManager, Notify} from './view/UIManager.js';

export class App {
	constructor() {
		this.notify = new Notify();
		this.tradeData = new TradeData();
		this.tableTrade = new TableData(this.tradeData);
		this.tradeStat = new TradeStat();

		this.initExport();
		this.initSample();
	}

	initSample() {
		const selectEl = $('#sample-select');
		const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
		let lastValue = null;
		const processSelection = async () => {
			const selected = Array.from(selectEl.selectedOptions).filter(opt => opt.value); // pastikan ada value
			if (!selected.length) {
				this.notify.info('No sample selected');
				this.tradeData.clear();
				return;
			}

			const names = selected.map(opt => opt.value);
			const currentValue = names.join(',');
			if (currentValue === lastValue) return;
			lastValue = currentValue;

			try {
				let mergedText = '';
				let notes = '';
				for (const name of names) {
					const path = `/sample/${name}.csv`;
					const res = await fetch(path);
					if (!res.ok) {
						this.notify.error(`File not found: ${path}`);
						continue;
					}
					const text = await res.text();
					mergedText += text.trim() + '\n';
				}
				this.tradeData.renderFile(mergedText, names.join('-'));

				this.notify.success(`Sample ${names} loaded`);
			} catch (err) {
				this.notify.error(err.message);
			}

			const delay = isMobile ? 200 : 0;
			setTimeout(() => {
				selectEl.blur();
			}, delay);
		};

		selectEl.addEventListener('change', processSelection);
		if (selectEl.selectedOptions.length > 0) setTimeout(processSelection, 0);
	}


	initExport() {
		$('#export-btn')?.addEventListener('click', () => {
			const csv = this.tradeData.exportCsv();
			navigator.clipboard.writeText(csv)
				.then(() => this.notify.show('success', 'Copied to clipboard!'))
				.catch(() => this.notify.show('error', 'Copy failed'));
		});
	}
	
}

document.addEventListener('DOMContentLoaded', () => new App());