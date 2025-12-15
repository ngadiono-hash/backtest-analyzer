const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildTrade(raw) {
  const parsed = _parseText(raw).map(_normalize);
  return _validate(parsed).map((t, i) => ({
    id: `tmp_${i}`,
    ...t
  }));
}

export function updateTrade(trades, id, changes) {
  const idx = trades.findIndex(t => t.id === id);
  if (idx === -1) return null;

  const merged = { ...trades[idx], ...changes };
  const validated = _validate([merged])[0];

  const next = trades.slice();
  next[idx] = validated;

  return { idx, row: validated, trades: next };
}

export function deleteTrade(trades, id) {
  const idx = trades.findIndex(t => t.id === id);
  if (idx === -1) return null;

  const next = trades.slice();
  next.splice(idx, 1);

  return { idx, trades: next };
}

export function calculateStats(trades) {
  const total = trades.length;
  const valid = trades.filter(t => t.valid).length;

  return {
    total,
    valid,
    invalid: total - valid
  };
}

export function _parseText(raw) {
	let txt = String(raw ?? '')
		.split('\n').filter(line => !line.trim().startsWith('#')).join('\n')
		.replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2')
		.replace(/(\d{1,2}-\d{2}-\d{2})\s*,\s*(\d{1,2}-\d{2}-\d{2})/g, '$1;$2')
		.replace(/(\d{3,}\.\d+)\s*,\s*(\d{3,}\.\d+)/g, '$1;$2')
		.replace(/\s*[:;]\s*/g, ';')
		.replace(/([A-Z]{3,6};[A-Za-z]+)\s(?=\d{1,2}-\d{2}-\d{2})/g, "$1;")
		.replace(/;;+/g, ';')
		.replace(/(TP|SL)[^\w]*(?=[A-Z]{3,6}\b)/g, '$1\n')
		.replace(/\s{2,}/g, ' ');
	return txt.split("\n").filter(Boolean).map(line => {
		line = line.replace(/-(?:\d{2}).(?:\d{2})-/g, m => m.replace('.', ';'));
		const parts = line.split(";").map(s => s.trim().replace(/\s+/g, '').replace(/,+/g, '').replace(/[^\w.\-]/g, ''));
		const [pair, type, dateEN, dateEX, priceEN, priceTP, priceSL, result] = parts;
		return { pair, type, dateEN, dateEX, priceEN, priceTP, priceSL, result, origin: line, valid: true, issues: [] };
	});
}

export function _normalize(trade) {
	const normalizeType = s => (typeof s === 'string' ? (s.trim().toUpperCase() === 'BUY' ? 'Buy' : s.trim().toUpperCase() === 'SELL' ? 'Sell' : s) : s);
	const normalizePrice = s => {
		if (!trade.pair) return trade;
		const p = trade.pair.toUpperCase(),
			dec = p === 'XAUUSD' ? 2 : (p.includes('JPY') ? 3 : 5);
		const num = parseFloat(s);
		return !s || isNaN(num) ? '' : num.toFixed(dec);
	};
	const normalizeDate = s => {
		if (!s || typeof s !== 'string') return s;
		const [dayP, monP, yearP] = s.trim().split('-');
		if (!dayP || !monP || !yearP || !/^\d{1,2}$/.test(dayP) || !/^\d{1,4}$/.test(yearP)) return s;
		if (/^[A-Z][a-z]{2}$/.test(monP)) return s;
		const mon = parseInt(monP, 10);
		if (isNaN(mon) || mon < 1 || mon > 12 || !Array.isArray(months)) return s;
		const monthAbbr = months[mon - 1],
			shortYear = (yearP.length > 2 ? yearP.slice(-2) : yearP).padStart(2, '0');
		return `${dayP.padStart(2, '0')}-${monthAbbr}-${shortYear}`;
	};
	return {
		...trade,
		type: normalizeType(trade.type),
		dateEN: normalizeDate(trade.dateEN),
		dateEX: normalizeDate(trade.dateEX),
		priceEN: normalizePrice(trade.priceEN),
		priceTP: normalizePrice(trade.priceTP),
		priceSL: normalizePrice(trade.priceSL)
	};
}

export function _validate(trades) {
	const pairs = ['XAUUSD', 'GBPJPY', 'EURJPY', 'GBPUSD', 'EURUSD', 'USDCHF'];
	const vPair = p => !p?.trim() ? 'Missing value' : !/^[A-Z]{6}$/.test(p) ? `Invalid format (${p})` : !pairs.includes(p) ? `Not available symbol (${p})` : null;
	const vType = t => !t?.trim() ? 'Missing value' : !['Buy', 'Sell'].includes(t) ? `Invalid value (${t})` : null;
	const vDate = d => {
		if (!d?.trim()) return 'Missing value';
		const [day, mon, year] = d.split('-'), dayN = +day, yearN = +year;
		if (isNaN(dayN) || dayN < 1 || dayN > 31) return `Invalid day (${day})`;
		if (!months.includes(mon)) return `Invalid month (${mon})`;
		if (isNaN(yearN) || yearN < 0 || yearN > 99) return `Invalid year (${year})`;
		return null;
	};
	const vPrice = (p, pair) => !String(p)?.trim() ? 'Missing value' :
		!(pair === 'XAUUSD' ? /^\d{4}\.\d{2}$/ : pair.includes('JPY') ? /^\d{3}\.\d{3}$/ : /^\d{1}\.\d{5}$/).test(p) ?
		`Format mismatch for ${pair} → ${p}` : null;
	const vResult = r => !r?.trim() ? 'Missing value' : !['TP', 'SL'].includes(r) ? `Invalid value (${r})` : null;

	return trades.map(t => {
		const issues = {
			...(vPair(t.pair) && { pair: vPair(t.pair) }),
			...(vType(t.type) && { type: vType(t.type) }),
			...(vDate(t.dateEN) && { dateEN: vDate(t.dateEN) }),
			...(vDate(t.dateEX) && { dateEX: vDate(t.dateEX) }),
			...(vPrice(t.priceEN, t.pair) && { priceEN: vPrice(t.priceEN, t.pair) }),
			...(vPrice(t.priceTP, t.pair) && { priceTP: vPrice(t.priceTP, t.pair) }),
			...(vPrice(t.priceSL, t.pair) && { priceSL: vPrice(t.priceSL, t.pair) }),
			...(vResult(t.result) && { result: vResult(t.result) })
		};
		const valid = !Object.keys(issues).length;
		return { ...t, issues, valid, _issueCount: Object.keys(issues).length };
	});
}
