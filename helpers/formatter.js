// ~/helpers/formatter.js

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const MONTH_NAMES = Object.keys(MONTHS);

export function dateDMY(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const m = MONTH_NAMES[date.getMonth()];
    const y = date.getFullYear().toString().slice(2);
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
    return `${days} days ${hours} hours`;
  }
  return `${hours} hours`;
}
