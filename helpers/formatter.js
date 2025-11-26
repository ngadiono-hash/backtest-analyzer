// ~/helpers/formatter.js

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const MONTH_NAMES = Object.keys(MONTHS);

export function dateLocal(dateISO) {
  return dateISO.toLocaleDateString('id-ID', {day: 'numeric',month: 'short',year: 'numeric'});
}

export function dateDMY(dateISO) {
    const d = dateISO.getDate().toString().padStart(2, '0');
    const m = MONTH_NAMES[dateISO.getMonth()];
    const y = dateISO.getFullYear().toString().slice(2);
    return `${d}-${m}-${y}`;
  }

export function num(val = 0, decimals = 2) {
  const n = Number(val);
  return n.toLocaleString('en-us', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function barsToTime(bars = 0) {
  const totalHours = Math.max(0, Number(bars) || 0) * 4;
  const days = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);
  if (days > 0) {
    return `${days}d,${hours}h`;
  } else {
    return `${hours}h`;  
  }
  
}

export function metricsFormat(key, type, value) {
  const METRIC_RULES = {
    winrate: { formatter: (v) => num(v), suffix: "%" },
    avgRR: { formatter: (v) => `1:${num(v)}`, color: false},
    netReturn:  { color: true, prefix: true },
    medReturn:  { color: true, prefix: true },
    avgReturn:  { color: true, prefix: true },
    stdReturn:  { color: true, prefix: true },
    pFactor:    { color: false, prefix: false },
    avgHold: { formatter: (v) => barsToTime(v) },
    maxHold: { formatter: (v) => barsToTime(v) }
  };
  
  const rule = METRIC_RULES[key] || {};
  let txt = value;
  let css = "";
  if (type === "float") txt = num(value);
  if (rule.formatter) txt = rule.formatter(value);
  if (rule.suffix) txt += rule.suffix;
  if (rule.color) css = value > 0 ? "pos" : value < 0 ? "neg" : "";
  if (rule.prefix && value > 0) {
    if (!rule.formatter) txt = "+" + txt;
  }
  
  return { txt, css };
}