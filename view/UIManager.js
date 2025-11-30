import { $, $$, _on, _ready } from "../helpers/template.js";

export class UIManager {
	constructor(data, stat) {
		this.data = data;
		this.stat = stat;
		this.notif = new Notify();
    this.initTab();
    this.initAccordion();
		
		this.initSample();
		this.initExport();
	}

  initTab() {
    const root = $('#app');
    const groups = root.querySelectorAll('.tab-group');
    groups.forEach(group => {
      const safeQuery = (sel) => {
        try { return group.querySelectorAll(sel); }
        catch { return [...group.querySelectorAll(sel.replace(':scope > ', ''))]
          .filter(el => el.closest('.tab-group') === group); }
      };
  
      const btns = safeQuery(':scope > .tabs > .tab-button, :scope > .tab-button');
      const contents = safeQuery(':scope > .tab-content');
  
      const show = (btn) => {
        if (!btn) return;
        const id = btn.dataset.tab;
        btns.forEach(b => b.classList.toggle('active', b === btn));
        contents.forEach(c => c.classList.toggle('active', c.id === id));
      };
  
      group.addEventListener('click', e => {
        const btn = e.target.closest('.tab-button');
        if (btn && btn.closest('.tab-group') === group) show(btn);
      });
  
      show([...btns].find(b => b.classList.contains('active')) || btns[0]);
    });
  }
	
	initAccordion() {
    $$('.accordion-header').forEach(btn => {
      btn.addEventListener('click', () => {
        const content = $(btn.dataset.target);
        content.classList.toggle('open');
      });
    });
	}

  initSample() {
    const selectEl = $('#sample-select');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let lastValue = null;

    // ===== UTIL: Simpan pilihan ke localStorage =====
    const saveSelection = (names, mergedText) => {
        localStorage.setItem('bt_selected_names', JSON.stringify(names));
        localStorage.setItem('bt_data_text', mergedText);
        localStorage.setItem('bt_data_name', names.join('-'));
    };

    // ===== Restore selection from localStorage =====
    const restoreSelection = () => {
        const saved = localStorage.getItem('bt_selected_names');
        if (!saved) return [];

        const names = JSON.parse(saved);

        // tandai option di <select>
        Array.from(selectEl.options).forEach(opt => {
            opt.selected = names.includes(opt.value);
        });

        return names;
    };

    // ===== Load data from localStorage =====
    const loadFromCache = () => {
        const text = localStorage.getItem('bt_data_text');
        const name = localStorage.getItem('bt_data_name');
        if (text && name) {
            this.data.renderFile(text, name);
            this.notif.success(`Loaded from localStorage: ${name}`);
            return true;
        }
        return false;
    };

    // ===== EVENT: User mengubah pilihan pada <select> =====
    const processSelection = async () => {
        const selected = Array.from(selectEl.selectedOptions).map(o => o.value);
        if (!selected.length) {
            this.notif.info('No sample selected');
            this.data.clear();
            localStorage.removeItem('bt_selected_names');
            localStorage.removeItem('bt_data_text');
            localStorage.removeItem('bt_data_name');
            return;
        }

        const currentValue = selected.join(',');
        if (currentValue === lastValue) return;
        lastValue = currentValue;

        let mergedText = '';

        try {
            for (const name of selected) {
                const path = `./sample/${name}.csv`;
                const res = await fetch(path);
                if (!res.ok) return this.notif.error(`File not found: ${path}`);

                const text = await res.text();
                mergedText += text.trim() + '\n';
            }

            const mergedName = selected.join('-');
            this.data.renderFile(mergedText, mergedName);

            // ===== Simpan ke localStorage =====
            saveSelection(selected, mergedText);

            this.notif.success(`Sample ${mergedName} loaded`);

        } catch (err) {
            this.notif.error(err.message);
        }

        const delay = isMobile ? 200 : 0;
        setTimeout(() => selectEl.blur(), delay);
    };

    // ===== Initialize =====
    // 1) Restore pilihan select
    const restored = restoreSelection();

    // 2) Bila ada cached data → render langsung
    const loaded = loadFromCache();

    // 3) Jika restore berhasil dan belum render dari cache → trigger
    if (restored.length && !loaded) {
        processSelection();
    }

    // 4) Event listener
    _on(selectEl, 'change', processSelection);
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