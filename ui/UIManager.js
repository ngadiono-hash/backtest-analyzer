import { $, $$, _on, _ready } from "utils/template.js";

export class UIManager {
	constructor(data, stat) {
		this.data = data;
		this.stat = stat;
		this.notif = new Notify();
		
    this.initSwiperPage();
		this.initSample();
		this.initExport();
	}

  initSwiperPage() {
    const navBtns  = $$(".nav-btn");
    const pages    = [$("#page-list"), $("#page-stats")];
    const tabBar   = $(".tab-bar");
    const tabBtns  = $$(".tab-btn");
    const toggleBtn = $("#toggle-swiper");
    const dropupBtn = $(".dropup-btn");
    const dropupPanel = $(".dropup-panel");
    
    let currentPage = 0;
    
    // NAV DROPUP
    dropupBtn.addEventListener("click", () => {
      dropupPanel.classList.toggle("active");
    });
    document.addEventListener("pointerdown", (e) => {
      if (!dropupPanel.contains(e.target) && !dropupBtn.contains(e.target)) {
        dropupPanel.classList.remove("active");
      }
    });
  
    // TAB BUTTON HANDLING
    const updateTabs = (active) => {
      tabBtns.forEach((btn, i) => {
        const isActive = i === active;
        btn.classList.toggle("active", isActive);
        if (isActive) {
          btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      });
    };
  
    // INIT SWIPER
    const swiper = new Swiper(".swiper", {
      loop: true,
      slidesPerView: 1,         // penting! untuk jamin loop aktif
      resistanceRatio: 0.5,
      speed: 250,
      autoHeight: false,
      touchStartPreventDefault: false,
      on: {
        realIndexChange(sw) {
          updateTabs(sw.realIndex);
        }
      }
    });
    
    updateTabs(0);
    
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        swiper.slideToLoop(parseInt(btn.dataset.index));
      });
    });
  
    // SWIPER ENABLE/DISABLE MODE
    let enabled = localStorage.swipe !== "false"; // default true
  
    const applySwiperState = () => {
      swiper.allowTouchMove = enabled && currentPage === 1;
      toggleBtn.textContent = enabled ? "Disable Slide" : "Enable Slide";
      toggleBtn.classList.toggle("none", currentPage !== 1);
    };
  
    toggleBtn.onclick = () => {
      enabled = !enabled;
      localStorage.swipe = enabled;
      applySwiperState();
    };
  
    applySwiperState();
  
  
    // NAVIGATION BUTTONS (pages)
    navBtns.forEach(btn => {
      btn.onclick = () => {
        const page = Number(btn.dataset.page);
        currentPage = page;
  
        // page visibility
        pages.forEach((p, i) => p.classList.toggle("none", i !== page));
  
        // nav active
        navBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
  
        // tab bar (only on stats page)
        tabBar.classList.toggle("none", page !== 1);
  
        // always reapply swiper state
        applySwiperState();
      };
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
            this.notif.success(`localStorage: ${name}`);
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