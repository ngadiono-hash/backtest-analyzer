
// input = "2023-03"
export const getMonthName = (s, full = true) => {
  if (!s) return "-";
  const i = +s.slice(5, 7) - 1;
  return MONTH_NAMES[i] ? (full ? MONTH_FULL_NAMES[i] : MONTH_NAMES[i]) : "???";
};
// input = unixTimestamp
export const yearMonth = ts => {
  const d = new Date(ts + TIMEZONE * 36e5);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
// input = unixTimestamp || date ISO
export const dateDMY = (v, full = false) => {
  if (!v) return "-";

  const d = new Date(v + TIMEZONE * 36e5);
  if (Number.isNaN(d.getTime())) return "-";

  const mm = d.getUTCMonth();
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yy = d.getUTCFullYear().toString();

  return `${dd} ${(full ? MONTH_FULL_NAMES : MONTH_NAMES)[mm]} ${full ? yy : yy.slice(-2)}`;
};
// input = "23-Jan-24"
export const toTimestamp = (s, { defaultTime = "12:00:00" } = {}) => {
  if (!s) return null;

  const [dd, mm, yy] = s.split("-");
  const m = MONTHS[mm];
  if (!dd || m == null || !yy) return null;

  const y = +yy;
  if (Number.isNaN(y)) return null;
  const now = new Date().getFullYear() % 100;
  const year = yy.length === 2 ? y <= now + 1 ? 2000 + y : 1900 + y : y;
  const [h = 12, mi = 0, se = 0] = defaultTime.split(":").map(Number);
  const t = Date.UTC(year, m, +dd, h - TIMEZONE, mi, se);
  return Number.isNaN(t) ? null : t;
}

function timeParts(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = Math.round(totalMinutes % 60);
  const p = [];
  if (days) p.push(`${days} days`);
  if (hours) p.push(`${hours} hours`);
  if (minutes && !days) p.push(`${minutes}min`);
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