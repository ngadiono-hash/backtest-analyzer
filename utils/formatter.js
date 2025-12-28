
export function getUniquePairs(stats) {
  const s = new Set();
  stats.p.forEach(x => s.add(x.pair));
  return Array.from(s);
}

//  DATE HELPERS
// =========================
//input = "2023-03"
export function getMonthName(input, full = true) {
  if (!input) return "-";
  const m = input.slice(5, 7);      // lebih tegas daripada split
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return "???";
  return (full ? MONTH_FULL_NAMES : MONTH_NAMES)[idx];
}
// input = unixTimestamp || date ISO
export function dateDMY(input, full = false) {
  if (!input) return "-";
  const d = new Date(input + TIMEZONE * 36e5);
  if (Number.isNaN(d)) return "-";
  const dd = String(d.getUTCDate()).padStart(2,"0")
  const mm = (full ? MONTH_FULL_NAMES : MONTH_NAMES)[d.getUTCMonth()];
  const yy = String(d.getUTCFullYear());
  const yyy = full ? yy : yy.slice(-2);
  return `${dd} ${mm} ${yyy}`;
}

// input: "23-Jan-24"
export function toTimestamp(input, { defaultTime = "12:00:00" } = {}) {
  if (!input) return null;

  const [dd, mon, yy] = input.split("-");
  const month = MONTHS[mon];
  if (!dd || month == null || !yy) return null;

  const y = Number(yy);
  if (Number.isNaN(y)) return null;

  const now = new Date().getFullYear() % 100;
  const year = yy.length === 2
    ? y <= now + 1 ? 2000 + y : 1900 + y
    : y;

  const [hh, mm, ss = 0] = defaultTime.split(":").map(Number);

  return Date.UTC(
    year,
    month,
    Number(dd),
    hh - TIMEZONE,
    mm,
    ss
  );
}

export function yearMonth(ts) {
  const d = new Date(ts + TIMEZONE * 36e5);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,"0")}`;
}

//  NUMBER HELPERS
// =========================
export const round = (n, d = 2) =>
  typeof n === 'number' && Number.isFinite(n)
    ? Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d
    : n;

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

