
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
  on:   (e, h) => addEventListener(e, h),
  once: (e, h) => addEventListener(e, h, { once: true }),
  off:  (e, h) => removeEventListener(e, h),
  emit: (e, d) => dispatchEvent(new CustomEvent(e, { detail: d }))
};

const $ = (selector, context = document) => context.querySelector(selector);

const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

const CREATE = (tag, props, ...children) => {
  const el = document.createElement(tag);
  if (!props || props.constructor !== Object) {
    children.unshift(props); props = {};
  }
  for (const k in props) {
    const v = props[k];
    k === "dataset" && v ? Object.assign(el.dataset, v)
    : k[0] === "o" && k[1] === "n" && typeof v === "function" ? el.addEventListener(k.slice(2).toLowerCase(), v)
    : k in el ? (el[k] = v)
    : el.setAttribute(k, v);
  }
  for (const c of children)
    c != null && el.append(c instanceof Node ? c : document.createTextNode(c));
  return el;
};

