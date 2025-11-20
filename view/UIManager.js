import { $, $$, _on, _ready } from "../helpers/shortcut.js";

export class UIManager {
	constructor(data, stat) {
		this.data = data;
		this.stat = stat;
		this.notif = new Notify();
		$$('.tab-container').forEach(c => this.initTab(c));
		this.initSample();
		this.initExport();
		this.mode = "pips"
		this._bindToggleButton();
		
	}
	
	setMode(mode) {
		this.mode = mode;
		
		const showPips = (mode === 'pips');
		
		$$('.pips-value')
			.forEach(el => el.classList.toggle('hidden', !showPips));
		
		$$('.vpips-value')
			.forEach(el => el.classList.toggle('hidden', showPips));
		
		this._updateToggleButtonLabel();
	}
	
	toggleValue() {
		this.setMode(this.mode === 'pips' ? 'vpips' : 'pips');
		console.log (this.mode)

	}
	
	_bindToggleButton() {
		const btn = $('#toggle');
		if (!btn) return;
		btn.addEventListener('click', () => this.toggleValue());
		this._updateToggleButtonLabel();
	}
	
	_updateToggleButtonLabel() {
		const btn = $('#toggle');
		if (!btn) return;
		btn.textContent = this.mode === 'pips' ?
			'Switch to VPips' :
			'Switch to Pips';
	}
	
	initTab(container) {
		const buttons = $$('.tab-button', container);
		const contents = $$('.tab-content', container);
		if (!buttons.length) return;
		
		const showTab = (btn) => {
			const id = btn.dataset.tab;
			if (!id) return;
			buttons.forEach(b => b.classList.toggle('active', b === btn));
			contents.forEach(c => c.classList.toggle('active', c.id === id));
		};
		_on(container, 'click', e => {
			const btn = e.target.closest('.tab-button');
			if (btn && container.contains(btn)) showTab(btn);
		});
		showTab($('.tab-button.active', container) || buttons[0]);
	}
	
	initSample() {
		const selectEl = $('#sample-select');
		const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
		let lastValue = null;
		const processSelection = async () => {
			const selected = Array.from(selectEl.selectedOptions).filter(opt => opt.value); // pastikan ada value
			if (!selected.length) {
				this.notif.info('No sample selected');
				this.data.clear();
				return;
			}
			
			const names = selected.map(opt => opt.value);
			const currentValue = names.join(',');
			if (currentValue === lastValue) return;
			lastValue = currentValue;
			let mergedText = '';
			try {
				for (const name of names) {
					const path = `/sample/${name}.csv`;
					const res = await fetch(path);
					if (!res.ok) {
						this.notif.error(`File not found: ${path}`);
						continue;
					}
					const text = await res.text();
					mergedText += text.trim() + '\n';
				}
				this.data.renderFile(mergedText, names.join('-'));
				
				this.notif.success(`Sample ${names.join('-')} loaded`);
			} catch (err) {
				this.notif.error(err.message);
			}
			const delay = isMobile ? 200 : 0;
			setTimeout(() => {
				selectEl.blur();
			}, delay);
		};
		
		_on(selectEl, 'change', processSelection);
		if (selectEl.selectedOptions.length > 0) setTimeout(processSelection, 0);
	}
	
	initExport() {
		_on($('#export-btn'), 'click', () => {
			const csv = this.data.exportCsv();
			navigator.clipboard.writeText(csv)
				.then(() => this.notif.success('Copied to clipboard!'))
				.catch(() => this.notif.error('Copy failed'));
		});
	}
	
	
	
}

export class Notify {
	constructor() {
		this.area = $('#notify-area');
	}
	
	success(message) {
		this._show('success', message);
	}
	
	error(message) {
		this._show('error', message);
	}
	
	info(message) {
		this._show('info', message);
	}
	
	warning(message) {
		this._show('warning', message);
	}
	
	_show(type = 'info', message = '') {
		if (!message) return;
		
		const el = document.createElement('div');
		el.className = `notify ${type}`;
		el.innerHTML = `${message} <span class="close" aria-label="Close">×</span>`;
		
		const closeBtn = el.querySelector('.close');
		closeBtn.onclick = () => this._remove(el);
		
		this.area.prepend(el);
		
		const timeout = type === 'error' ? 10000 : 6000;
		setTimeout(() => this._remove(el), timeout);
	}
	
	_remove(el) {
		if (!el.parentNode) return;
		el.style.animation = 'slideOut 0.3s ease-in forwards';
		el.addEventListener('animationend', () => el.remove(), { once: true });
	}
}