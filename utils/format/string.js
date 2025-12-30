
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

export function metricFormat(value, type = "", unit = "") {
  const n = Number(value);
  let txt = "-";
  let css = "";

  switch (type) {
    case "date": txt = dateDMY(value); break;
    case "time": txt = barsToTime(value); break;
    case "int":  txt = String(Math.round(value)); break;
    case "ms":   txt = msToTime(value); break;
    case "%":    txt = `${num(value)} %`; break;
    case "1:":   txt = `1 : ${num(value)}`; break;
    case "R":
    case "N":
      txt = num(value);
      if (n > 0) { txt = "+" + txt; css = "pos"; }
      else if (n < 0) css = "neg";
      else txt = "--";
      break;
    default: txt = num(value);
  }

  return { txt, css };
}