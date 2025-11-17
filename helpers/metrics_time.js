// ~/helpers/metrics_time.js

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const MONTH_NAMES = Object.keys(MONTHS);

export function dateDMY(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const m = MONTH_NAMES[date.getMonth()];
    const y = date.getFullYear().toString().slice(2);
    return `${d}-${m}-${y}`;
  }

export function dateHours(dateStr, defaultHour = "12:00") {
  const [d, m, y] = dateStr.split('-');
  const year = `20${y}`;
  const month = String(MONTHS[m] + 1).padStart(2, '0');  
  const day = d.padStart(2, '0');

  return new Date(`${year}-${month}-${day}T${defaultHour}:00`);
}


export function estimateBarsHeld(dateEN, dateEX) {
  const entry = dateHours(dateEN);
  const exit = dateHours(dateEX);
  if (!entry || !exit) return 1;
  if (+entry === +exit) return 1;
  let hours = (exit - entry) / (1000 * 60 * 60);

  const startDay = new Date(entry.getFullYear(), entry.getMonth(), entry.getDate());
  const endDay = new Date(exit.getFullYear(), exit.getMonth(), exit.getDate());
  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 6 || day === 0) {
      // subtract 24 hours for that day only if that day falls within the interval
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      const overlapStart = Math.max(dayStart, entry);
      const overlapEnd = Math.min(dayEnd, exit);
      if (overlapEnd > overlapStart) {
        hours -= (overlapEnd - overlapStart) / (1000 * 60 * 60);
      }
    }
  }

  const bars = Math.max(1, Math.round(hours / 4));
  return bars;
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