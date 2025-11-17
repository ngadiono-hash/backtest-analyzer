import { $, $$, _ready } from "../helpers/shortcut.js";

// ================== NOTIFY ==================
export class Notify {
	constructor() {
		this.area = $('#notify-area') || this._createArea();
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

	_createArea() {
		const area = document.createElement('div');
		area.id = 'notify-area';
		document.body.appendChild(area);
		return area;
	}
}

// ================== TAB MANAGER ==================
export class TabManager {
	constructor() { this.init(); }

	init() {
		const buttons = $$('.tab-button');
		if (!buttons.length) return;

		buttons.forEach(btn => btn.addEventListener('click', () => this.activateTab(btn)));
		this.activateTab($('.tab-button.active') || buttons[0]);
	}

	activateTab(activeBtn) {
		const target = activeBtn.dataset.tab;
		if (!target) return;

		$$('.tab-button').forEach(b => b.classList.remove('active'));
		activeBtn.classList.add('active');

		$$('.tab-content').forEach(c => c.classList.remove('active'));
		$(`#${target}`)?.classList.add('active');
	}
}
new TabManager();
// ================== UI MANAGER ==================
export class UIManager {
	constructor() {
		this.notify = new Notify();
		this.initControllers();
	}

	initControllers() {
		$('#import-btn')?.addEventListener('click', () =>
			document.dispatchEvent(new CustomEvent('user:import-requested'))
		);

		const selectEl = $('#sample-select');
		if (selectEl) {
			let isInitial = true;
			selectEl.addEventListener('input', () => {
				if (isInitial) return (isInitial = false);
				const files = Array.from(selectEl.selectedOptions).map(opt => opt.value);
				document.dispatchEvent(new CustomEvent('user:sample-selected', { detail: { files } }));
			});

			const defaultVal = selectEl.dataset.default;
			const opt = defaultVal && selectEl.querySelector(`option[value="${defaultVal}"]`);
			if (opt) opt.selected = true;
		}

		$('#export-btn')?.addEventListener('click', () =>
			document.dispatchEvent(new CustomEvent('user:export-requested'))
		);

		window.addEventListener('app:notify', e =>
			this.notify._show(e.detail.type, e.detail.message)
		);
	}
}

