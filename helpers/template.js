
export const $ = (selector, context = document) => context.querySelector(selector);

export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

export const create = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  for (const key in props) {
    const val = props[key];
    if (key === "dataset") {
      for (const d in val) el.dataset[d] = val[d];
    } else if (key === "style" && typeof val === "object") {
      Object.assign(el.style, val);
    } else {
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
