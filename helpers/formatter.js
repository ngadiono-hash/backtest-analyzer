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
    return `${days} days ${hours} hours`;
  }
  return `${hours} hours`;
}

export function checkSort(arr, name) {
    if (!arr || arr.length === 0) {
        console.log("%c[checkSort] Array kosong atau undefined", "color:#e67e22");
        return true;
    }

    name = name || "DATA";
    var sorted = [...arr].sort(function(a, b) { return new Date(a.dateEX) - new Date(b.dateEX); });
    var allOk = true;

    console.log("%c=== CHECK SORT: " + name + " ===", "color:#3498db; font-weight:bold");

    arr.forEach(function(item, i) {
        var origPair  = item.pair  ? item.pair  : "—";
        var origDate  = dateDMY(item.dateEX);
        var sortPair  = sorted[i] && sorted[i].pair  ? sorted[i].pair  : "—";
        var sortDate  = sorted[i] ? dateDMY(sorted[i].dateEX) : "—";

        var line = (i+1 + "   ").slice(0,3) + " │ " +
                   (origPair + "          ").slice(0,10) + " " + origDate + " │ " +
                   (sortPair + "          ").slice(0,10) + " " + sortDate + " │ " +
                   (origDate === sortDate && origPair === sortPair ? "OK" : "WRONG");

        if (origDate !== sortDate || origPair !== sortPair) allOk = false;

        console.log(line);
    });

    console.log(allOk 
        ? "%cSEMUA URUTAN BENAR" 
        : "%cADA YANG SALAH URUTAN → SORT DULU!", 
        allOk ? "color:#2ecc71; font-weight:bold" : "color:#e74c3c; font-weight:bold");

    return allOk;
}