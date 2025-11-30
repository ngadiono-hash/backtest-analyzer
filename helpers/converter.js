// ~/helpers/converter.js

// =========================
//  CONSTANTS
// =========================
export const MONTHS = { 
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 
};

export const MONTH_NAMES = Object.keys(MONTHS);

// =========================
//  DATE HELPERS
// =========================
export function safeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val) ? null : val;
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

export function dateLocal(dateISO) {
  const d = safeDate(dateISO);
  return d 
    ? d.toLocaleDateString("en-us", { day: "numeric", month: "short", year: "numeric" })
    : "-";
}

export function dateDMY(dateISO) {
  const d = safeDate(dateISO);
  if (!d) return "-";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

export function dateISO(dateStr, defaultHour = "12:00") {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("-");
  const year = `20${y}`;
  const month = String(MONTHS[m] + 1).padStart(2, "0");
  return new Date(`${year}-${month}-${d.padStart(2, "0")}T${defaultHour}:00`);
}

// =========================
//  NUMBER HELPERS
// =========================
export function num(val = 0, decimals = 2) {
  const n = Number(val);
  return n || n === 0
    ? n.toLocaleString("en-us", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })
    : "-";
}

// =========================
//  TIME HELPERS
// =========================
function timeParts(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = Math.round(totalMinutes % 60);
  const p = [];
  if (days) p.push(`${days}d`);
  if (hours) p.push(`${hours}h`);
  if (minutes && !days) p.push(`${minutes}m`);
  return p.join(",");
}

export function barsToTime(bars = 0, barHours = 4) {
  const mins = Math.max(0, Number(bars) || 0) * barHours * 60;
  return timeParts(mins);
}

export function msToTime(ms = 0) {
  const mins = Math.max(0, Number(ms) || 0) / 60000;
  return mins ? timeParts(mins) : "-";
}

// =========================
//  STRING FORMATTING
// =========================
export function toTitle(str) {
  if (!str) return "-";
  return str
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/\s+/)
    .map(w => /^[A-Z]+$/.test(w) ? w : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// =========================
//  METRIC FORMATTER
// =========================
export function metricFormat(value, type = "float", unit = "") {
  const n = Number(value);
  let txt = "-";
  let css = "";

  switch (type) {
    case "date": txt = dateDMY(value); break;
    case "time": txt = barsToTime(value); break;
    case "ms": txt = msToTime(value); break;
    case "%": txt = `${num(value)}%`; break;
    case "1:": txt = `1:${num(value)}`; break;
    case "R":
    case "N":
      txt = num(value);
      if (n > 0) { txt = "+" + txt; css = "pos"; }
      else if (n < 0) css = "neg";
      break;
    case "unit": txt = `${num(value)} ${unit}`.trim(); break;
    case "int": txt = String(Math.round(value)); break;
    default: txt = num(value);
  }

  return { txt, css };
}

// =========================
//  TRADING BAR ESTIMATOR
// =========================
export function estimateBarsHeld(entry, exit) {
  const e = safeDate(entry);
  const x = safeDate(exit);
  if (!e || !x) return 1;

  // Same day → always 1 bar
  if (e.toDateString() === x.toDateString()) return 1;

  let hours = (x - e) / 36e5;

  // Remove weekend hours
  const start = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  const end = new Date(x.getFullYear(), x.getMonth(), x.getDate());

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) {
      const ws = new Date(d);
      const we = new Date(d);
      we.setDate(d.getDate() + 1);

      const overlapStart = Math.max(ws, e);
      const overlapEnd = Math.min(we, x);
      if (overlapEnd > overlapStart) {
        hours -= (overlapEnd - overlapStart) / 36e5;
      }
    }
  }

  return Math.max(1, Math.round(hours / 4));
}