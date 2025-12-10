
export const $ = (selector, context = document) => context.querySelector(selector);

export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

export const create = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  if (props == null || typeof props !== "object" || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  for (const key in props) {
    const val = props[key];
    if (key === "dataset" && val && typeof val === "object") {
      // dataset: { id: "10" } → data-id="10"
      for (const d in val) el.dataset[d] = val[d];
    } else if (key === "style" && val && typeof val === "object") {
      // style: { backgroundColor: "red" }
      Object.assign(el.style, val);
    } else if (key in el) {
      // DOM property: id, className, value, textContent, etc.
      el[key] = val;
    } else {
      // attribute HTML: for, class, tabindex, aria-*, dll
      el.setAttribute(key, val);
    }
  }
  // Tambahkan children (text, element, number)
  for (const child of children)
    el.append(child instanceof Node ? child : document.createTextNode(child));

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
