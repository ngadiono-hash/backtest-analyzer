// ~/helpers/metrics_time.js

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const MONTH_NAMES = Object.keys(MONTHS);

export function dateISO(dateStr, defaultHour = "12:00") {
  const [d, m, y] = dateStr.split('-');
  const year = `20${y}`;
  const month = String(MONTHS[m] + 1).padStart(2, '0');  
  const day = d.padStart(2, '0');

  return new Date(`${year}-${month}-${day}T${defaultHour}:00`);
}

export function estimateBarsHeld(entry, exit) {
  if (!entry || !exit) return 1;
  
  // SAME DAY TRADE → karena tidak ada waktu → minimal 1 bar
  if (
    entry.getFullYear() === exit.getFullYear() &&
    entry.getMonth() === exit.getMonth() &&
    entry.getDate() === exit.getDate()
  ) {
    return 1; // minimal 1 bar
  }
  
  let hours = (exit - entry) / 36e5;
  
  // Normalize to start-of-day for iteration
  const startDay = new Date(entry.getFullYear(), entry.getMonth(), entry.getDate());
  const endDay = new Date(exit.getFullYear(), exit.getMonth(), exit.getDate());
  
  // Remove weekend hours
  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0=Sun, 6=Sat
    if (day === 6 || day === 0) {
      const ws = new Date(d);
      const we = new Date(d);
      we.setDate(d.getDate() + 1);
      
      const overlapStart = Math.max(ws.getTime(), entry.getTime());
      const overlapEnd = Math.min(we.getTime(), exit.getTime());
      
      if (overlapEnd > overlapStart) {
        hours -= (overlapEnd - overlapStart) / 36e5;
      }
    }
  }
  
  const bars = Math.max(1, Math.round(hours / 4));
  return bars;
}
