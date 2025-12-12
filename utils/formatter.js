export const MONTHS = { 
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 
};
export const MONTH_NAMES = Object.keys(MONTHS); 
export const MONTH_FULL_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
export function getUniquePairs(stats) {
  const s = new Set();
  stats.p.forEach(x => s.add(x.pair));
  return Array.from(s);
}
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
    ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "-";
}

export function getMonthName(ym, full = false) {
  if (!ym) return "-";
  const [y, m] = ym.split("-");
  const monthIndex = Number(m) - 1; // 01 → 0, 08 → 7
  const mon = MONTH_NAMES[monthIndex] || "???";
  return full ? MONTH_FULL_NAMES[monthIndex] : MONTH_NAMES[monthIndex];
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
  return new Date(`${year}-${month}-${d.padStart(2, "0")}T${defaultHour}:00+07:00`);
}

// =========================
//  NUMBER HELPERS
// =========================
export function num(val = 0, decimals = 1) {
  const n = Number(val);
  return n || n === 0
    ? n.toLocaleString("en-us", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })
    : "-";
}

export function formatPrice(pair, price) {
		if (!pair) return;
		const p = pair.toUpperCase();
		const	dec = p === 'XAUUSD' ? 2 : (p.includes('JPY') ? 3 : 5);
		const n = parseFloat(price);
		return !price || isNaN(n) ? '' : n.toFixed(dec);
	};

// =========================
//  TIME HELPERS
// =========================
function timeParts(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = Math.round(totalMinutes % 60);
  const p = [];
  if (days) p.push(`${days} days`);
  if (hours) p.push(`${hours} hours`);
  if (minutes && !days) p.push(`${minutes}minutes`);
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
export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
      else txt = "--";
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

  // Same day can still be multiple bars → remove this rule
  // if (e.toDateString() === x.toDateString()) return 1;

  let hours = removeWeekendHours(e, x);

  return Math.max(1, Math.round(hours / 4));
}

function removeWeekendHours(e, x) {
  let hours = (x - e) / 36e5;

  // Weekend start: Saturday 04:00
  const ws = new Date(e);
  ws.setHours(4, 0, 0, 0);
  ws.setDate(ws.getDate() + ((6 - ws.getDay() + 7) % 7)); // next Saturday

  // Weekend end: Monday 04:00
  const we = new Date(ws);
  we.setDate(ws.getDate() + 2); // Saturday → Monday
  // Monday → 04:00 handled by ws hour = 04:00

  // Loop through all weekends within the range
  for (let wStart = ws, wEnd = we;
       wStart < x;
       wStart = new Date(wStart.getTime() + 7 * 86400e3),
       wEnd = new Date(wEnd.getTime() + 7 * 86400e3)) {

    const overlapStart = Math.max(wStart, e);
    const overlapEnd   = Math.min(wEnd, x);

    if (overlapEnd > overlapStart) {
      hours -= (overlapEnd - overlapStart) / 36e5;
    }
  }

  return hours;
}