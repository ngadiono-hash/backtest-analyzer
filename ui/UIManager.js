import { $, $$, create, _on, _ready } from "utils/template.js";

export class UIManager {
	constructor(data) {
		this.pages = [$("#page-list"), $("#page-stats")];
    this.initSwiperPage();
		new FilesHandler(data)
	}

  initSwiperPage() {
    const navBtns  = $$(".nav-btn");
    
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
      slidesPerView: 1,
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
        this.pages.forEach((p, i) => p.classList.toggle("none", i !== page));
  
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
	
  initSticky() {
    const scrollArea = $("#page-list");
  
    const init = () => {
      const pivotsX  = $$(".pivot-x", scrollArea);
      const pivotsY  = $$(".pivot-y", scrollArea);
      const pivotsXY = $$(".pivot-xy", scrollArea);
  
      // Pastikan semua belum ada? Skip dulu
      if (!pivotsX.length && !pivotsY.length && !pivotsXY.length) {
        return setTimeout(init, 100);
      }
  
      scrollArea.addEventListener("scroll", () => {
        const x = scrollArea.scrollLeft;
        const y = scrollArea.scrollTop;
  
        // ==== VERTICAL SCROLL ====
        if (y > 0) {
          pivotsX.forEach(el => el.classList.add("stuck-x"));
          pivotsXY.forEach(el => el.classList.add("stuck-xy"));
        } else {
          pivotsX.forEach(el => el.classList.remove("stuck-x"));
          // XY only removed if also no horizontal
          if (x === 0) {
            pivotsXY.forEach(el => el.classList.remove("stuck-xy"));
          }
        }
  
        // ==== HORIZONTAL SCROLL ====
        if (x > 0) {
          pivotsY.forEach(el => el.classList.add("stuck-y"));
          pivotsXY.forEach(el => el.classList.add("stuck-xy"));
        } else {
          pivotsY.forEach(el => el.classList.remove("stuck-y"));
          if (y === 0) {
            pivotsXY.forEach(el => el.classList.remove("stuck-xy"));
          }
        }
      });
    };
  
    init();
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
