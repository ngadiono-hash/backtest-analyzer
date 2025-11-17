// =============================================
// JavaScript Shortcuts / Helper Template
// =============================================

// 1. Query Selector shortcuts (mirip jQuery)
export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

// 2. Event listener shortcuts
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

export const _ready = (fn) => {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
};

// 3. Class & attribute shortcuts
export const _addClass = (el, ...classes) => el.classList.add(...classes);
export const _removeClass = (el, ...classes) => el.classList.remove(...classes);
export const _toggleClass = (el, className, force) => el.classList.toggle(className, force);
export const _hasClass = (el, className) => el.classList.contains(className);

// 4. Create element shortcut
export const _create = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  Object.assign(el, props);
  el.append(...children);
  return el;
};

// 5. Ajax / Fetch shortcut (mirip $.ajax)
export const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  return res.json();
};

// 6. Log shortcut
export const _log = (...args) => console.log('%c[LOG]', 'color: #0f9', ...args);
