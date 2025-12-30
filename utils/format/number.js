
export const round = (n, d = 2) => {
  typeof n === 'number' && Number.isFinite(n)
    ? Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d
    : n;
}

export const num = (val = 0, decimals = 1) => {
  const n = Number(val);
  return Number.isFinite(n)
    ? n.toLocaleString("en-us", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : "-";
}

export function formatPrice(pair, price) {
	if (!pair) return;
	const p = pair.toUpperCase();
	const	dec = p === 'XAUUSD' ? 2 : (p.includes('JPY') ? 3 : 5);
	const n = parseFloat(price);
	return !price || isNaN(n) ? '' : n.toFixed(dec);
}