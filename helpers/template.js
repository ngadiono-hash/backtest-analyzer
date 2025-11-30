
export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

export const create = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);

  for (const key in props) {
    const val = props[key];

    if (key === "dataset") {
      // assign dataset satu per satu
      for (const d in val) el.dataset[d] = val[d];
    }
    else if (key === "style" && typeof val === "object") {
      // style object (optional)
      Object.assign(el.style, val);
    }
    else {
      // fallback property biasa
      el[key] = val;
    }
  }

  el.append(...children);
  return el;
};

export const _on = (el, event, handler, options) => {
  if (el instanceof NodeList || Array.isArray(el)) {
    el.forEach(e => e.addEventListener(event, handler, options));
  } else {
    el.addEventListener(event, handler, options);
  }
};

export const _off = (el, event, handler, options) => {
  if (el instanceof NodeList || Array.isArray(el)) {
    el.forEach(e => e.removeEventListener(event, handler, options));
  } else {
    el.removeEventListener(event, handler, options);
  }
};

export const _ready = fn => document.addEventListener('DOMContentLoaded', fn);

export const _addClass = (el, ...classes) => el.classList.add(...classes);
export const _removeClass = (el, ...classes) => el.classList.remove(...classes);
export const _toggleClass = (el, className, force) => el.classList.toggle(className, force);
export const _hasClass = (el, className) => el.classList.contains(className);

export const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  return res.json();
};