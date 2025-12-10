
(function() {
  const parseStack = (err) => {
    if (!err?.stack) return { url: 'unknown', line: 0, col: 0 };

    for (const line of err.stack.split('\n')) {
      let m = line.match(/\((.*):(\d+):(\d+)\)$/) || 
              line.match(/at\s+(.*):(\d+):(\d+)/);
      if (m) return { url: m[1], line: m[2], col: m[3] };
    }
    return { url: 'unknown', line: 0, col: 0 };
  };

  const showError = (message, detail, err) => {
    const { url, line, col } = parseStack(err);
    let fileName = url;

    try {
      const path = new URL(url).pathname.split('/');
      fileName = path.slice(-3).join('/');
    } catch {}

    console.log(`%c ${err} `, 'background:#fff;color:#c0392b;font-weight:bold;');
    console.groupCollapsed('%c Detail', 'color:#e74c3c; cursor:pointer;');
    console.log('%cFile     : %c' + fileName, 'font-weight:bold;', 'color:#3498db;');
    console.log('%cLine     : %c' + line + ':' + col, 'font-weight:bold;', 'color:#e67e22;');
    console.log('%cMessage  : %c' + message, 'font-weight:bold;', 'color:#e74c3c;');

    if (err?.stack) {
      console.log('%cStack Trace:', 'font-weight:bold;');
      console.log(err.stack);
    }
    console.groupEnd();
  };

  window.onerror = (msg, url, line, col, error) => {
    showError(msg, url, error ?? new Error(msg));
    return false;
  };

  window.onunhandledrejection = (ev) => {
    const error = ev.reason instanceof Error ? ev.reason : new Error(ev.reason);
    showError('UNHANDLED PROMISE REJECTION', ev.reason, error);
  };
})();

const log = (...args) => console.log(...args)

const logJ = (...args) => console.log(JSON.stringify(...args, null, 2));

eruda.init();

/**
 * Log object/array as JSON but truncate long arrays/objects and deep structures.
 *
 * Options:
 *  - maxArrayItems: number of items to show for arrays (default 5)
 *  - maxObjectProps: number of properties to show for objects (default 10)
 *  - maxDepth: recursion depth (default 3)
 *  - indent: JSON.stringify indent (default 2)
 */
function logJson(value, opts = {}) {
  const {
    maxArrayItems = 5,
    maxObjectProps = 12,
    maxDepth = 5,
    indent = 2,
  } = opts;

  const seen = new WeakSet();

  function truncate(val, depth) {
    if (val === null) return null;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return val;
    }
    if (typeof val === 'function') {
      return `[Function: ${val.name || 'anonymous'}]`;
    }
    if (typeof val === 'symbol') {
      return val.toString();
    }
    // Dates
    if (val instanceof Date) {
      return val.toISOString();
    }
    // RegExp
    if (val instanceof RegExp) {
      return val.toString();
    }

    // Prevent deep recursion
    if (depth <= 0) {
      if (Array.isArray(val)) return `[Array(${val.length})]`;
      if (typeof val === 'object') return `[Object]`;
      return String(val);
    }

    // Circular detection
    if (typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }

    if (Array.isArray(val)) {
      const len = val.length;
      const shown = Math.min(len, maxArrayItems);
      const arr = [];
      for (let i = 0; i < shown; i++) {
        arr.push(truncate(val[i], depth - 1));
      }
      if (len > shown) arr.push(`... +${len - shown} more`);
      return arr;
    }

    if (typeof val === 'object') {
      const keys = Object.keys(val);
      const total = keys.length;
      const shown = Math.min(total, maxObjectProps);
      const obj = {};
      for (let i = 0; i < shown; i++) {
        const k = keys[i];
        obj[k] = truncate(val[k], depth - 1);
      }
      if (total > shown) obj['...'] = `+${total - shown} more keys`;
      return obj;
    }

    // fallback
    try { return String(val); } catch (e) { return '[Unserializable]'; }
  }

  try {
    const truncated = truncate(value, maxDepth);
    console.log(JSON.stringify(truncated, null, indent));
  } catch (e) {
    // In case JSON.stringify fails for some reason
    console.log(String(value), '(failed to stringify)', e);
  }
}