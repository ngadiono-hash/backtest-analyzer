export const EventBus = {
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