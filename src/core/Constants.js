
const TIMEFRAME = "4h";
const TIMEZONE = 7;
const MONTH_FULL_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_NAMES = MONTH_FULL_NAMES.map(m => m.slice(0, 3));
const MONTHS = Object.fromEntries(MONTH_NAMES.map((m, i) => [m, i]));
const PAIRS = {
  XAUUSD: 0.5,
  GBPJPY: 1.0, EURNZD: 1.0, EURJPY: 1.0, USDJPY: 1.0, CHFJPY: 1.0,
  AUDJPY: 1.5, CADJPY: 1.5, NZDJPY: 1.5, GBPUSD: 1.5, EURUSD: 1.5, USDCAD: 1.5,
  USDCHF: 2.0, AUDUSD: 2.0, NZDUSD: 2.0, EURGBP: 2.0,
};

const EVENT = {
  on(event, handler) {
    window.addEventListener(event, handler);
  },

  once(event, handler) {
    window.addEventListener(event, handler, { once: true });
  },

  off(event, handler) {
    window.removeEventListener(event, handler);
  },

  emit(event, detail = null) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  }
};

const $ = (selector, context = document) => context.querySelector(selector);

const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

const create = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  if (props == null || typeof props !== "object" || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  for (const key in props) {
    const val = props[key];

    if (key === "dataset" && val && typeof val === "object") {
      for (const d in val) el.dataset[d] = val[d];
    
    } else if (key === "style" && val && typeof val === "object") {
      Object.assign(el.style, val);
      
    } else if (key in el) {
      el[key] = val;
      
    } else { // sebisa mungkin hindari penggunaan ini
      el.setAttribute(key, val);
    }
  }
  
  for (const child of children)
    el.append(child instanceof Node ? child : document.createTextNode(child));

  return el;
};

// const _on = (el, event, handler, options) => {
//   if (el instanceof NodeList || Array.isArray(el)) {
//     el.forEach(e => e.addEventListener(event, handler, options));
//   } else {
//     el.addEventListener(event, handler, options);
//   }
// };

// const _off = (el, event, handler, options) => {
//   if (el instanceof NodeList || Array.isArray(el)) {
//     el.forEach(e => e.removeEventListener(event, handler, options));
//   } else {
//     el.removeEventListener(event, handler, options);
//   }
// };

// const _ready = fn => document.addEventListener('DOMContentLoaded', fn);
