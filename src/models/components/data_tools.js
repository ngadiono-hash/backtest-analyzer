import * as FM from "util/formatter.js";

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildTrade(raw) {
  const parsed = _parseText(raw).map(_normalize);
  return validate(parsed).map((t, i) => ({
    id: `tmp_${i}`,
    ...t
  }));
}



function _parseText(raw) {
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
		return { pair, type, dateEN, dateEX, priceEN, priceTP, priceSL, result, origin: line, valid: false, issues: [] };
	});
}

export function _normalize(trade) {
  const normalType = s =>
    typeof s === 'string'
      ? s.trim().toUpperCase() === 'BUY' ? 'Buy'
      : s.trim().toUpperCase() === 'SELL' ? 'Sell'
      : s
      : s;

  const normalPrice = s => {
    if (!trade.pair) return s;
    const p = trade.pair.toUpperCase(),
          dec = p === 'XAUUSD' ? 2 : p.includes('JPY') ? 3 : 5,
          num = parseFloat(s);
    return !s || isNaN(num) ? '' : num.toFixed(dec);
  };

  const normalDate = s => {
    if (!s || typeof s !== 'string') return s;
    const [d, m, y] = s.trim().split('-');
    if (!d || !m || !y || !/^\d{1,2}$/.test(d) || !/^\d{1,4}$/.test(y)) return s;
    if (/^[A-Z][a-z]{2}$/.test(m)) return s;
    const mi = parseInt(m, 10);
    if (isNaN(mi) || mi < 1 || mi > 12 || !months?.length) return s;
    return `${d.padStart(2,'0')}-${months[mi-1]}-${y.slice(-2).padStart(2,'0')}`;
  };

  return {
    ...trade,
    type: normalType(trade.type),
    dateEN: normalDate(trade.dateEN),
    dateEX: normalDate(trade.dateEX),
    priceEN: normalPrice(trade.priceEN),
    priceTP: normalPrice(trade.priceTP),
    priceSL: normalPrice(trade.priceSL)
  };
}
const PAIRS = {
  XAUUSD: { value: 0.5 },
  GBPJPY: { value: 1.0 }, EURNZD: { value: 1.0 }, EURJPY: { value: 1.0 }, USDJPY: { value: 1.0 }, CHFJPY: { value: 1.0 },
  AUDJPY: { value: 1.5 }, CADJPY: { value: 1.5 }, NZDJPY: { value: 1.5 }, GBPUSD: { value: 1.5 }, EURUSD: { value: 1.5 }, USDCAD: { value: 1.5 },
  USDCHF: { value: 2.0 }, AUDUSD: { value: 2.0 }, NZDUSD: { value: 2.0 }, EURGBP: { value: 2.0 },
};

export function validate(trades) {
  const pairs = Object.keys(PAIRS);

  const vPair = p => !p?.trim() ? 'Missing value' :
    !/^[A-Z]{6}$/.test(p) ? `Invalid format (${p})` :
    !pairs.includes(p) ? `Not available pair (${p})` : null;

  const vType = t => !t?.trim() ? 'Missing value' :
    !['Buy','Sell'].includes(t) ? `Invalid value (${t})` : null;

  const vDate = d => {
    if (!d?.trim()) return 'Missing value';
    //if (!/^\d{2}-[A-Z][a-z]{2}-\d{2}$/.test(d)) return `Invalid format (${d})`;
    const [day, mon, year] = d.split('-');
    const dayN = +day, yearN = +year;
    if (!months.includes(mon)) return `Invalid month (${mon})`;
    if (dayN < 1 || dayN > 31) return `Invalid day (${day})`;
    const monthIndex = months.indexOf(mon);
    const fullYear = 2000 + yearN;
    const date = new Date(fullYear, monthIndex, dayN);
    if (date.getFullYear() !== fullYear || date.getMonth() !== monthIndex || date.getDate() !== dayN) {
      return `Invalid calendar date (${d})`;
    }
    return null;
  };
  
  const vDateOrder = (dateEN, dateEX) => {
    const dEN = FM.dateISO(dateEN);
    const dEX = FM.dateISO(dateEX);
    if (!dEN || !dEX) return null;
    return dEN > dEX ? 'Invalid date order (Exit < Entry)' : null;
  };
  const vPrice = (p, pair) => !String(p)?.trim() ? 'Missing value' :
    !(pair === 'XAUUSD' ? /^\d{4}\.\d{2}$/ :
      pair.includes('JPY') ? /^\d{3}\.\d{3}$/ : /^\d{1}\.\d{5}$/).test(p)
      ? `Digit mismatch for ${pair}` : null;

  const vPriceLogic = (t) => {
    const { type, priceEN, priceTP, priceSL } = t;
    if (!type || !priceEN || !priceTP || !priceSL) return null;
    const en = +priceEN, tp = +priceTP, sl = +priceSL;
    if ([en, tp, sl].some(isNaN)) return null;
    if (type === 'Buy') {
      if (!(tp > en && sl < en)) return 'Invalid price for Buy (TP > EN > SL)';
    }
    if (type === 'Sell') {
      if (!(tp < en && sl > en)) return 'Invalid price for Sell (TP < EN < SL)';
    }
    return null;
  };

  const vResult = r => !r?.trim() ? 'Missing value' :
    !['TP','SL'].includes(r) ? `Invalid value (${r})` : null;

  return trades.map(t => {
    const issues = {
      ...(vPair(t.pair) && { pair: vPair(t.pair) }),
      ...(vType(t.type) && { type: vType(t.type) }),
      ...(vDate(t.dateEN) && { dateEN: vDate(t.dateEN) }),
      ...(vDate(t.dateEX) && { dateEX: vDate(t.dateEX) }),
      ...(vDateOrder(t.dateEN, t.dateEX) && { dateEX: vDateOrder(t.dateEN, t.dateEX) }),
      ...(vPrice(t.priceEN, t.pair) && { priceEN: vPrice(t.priceEN, t.pair) }),
      ...(vPrice(t.priceTP, t.pair) && { priceTP: vPrice(t.priceTP, t.pair) }),
      ...(vPrice(t.priceSL, t.pair) && { priceSL: vPrice(t.priceSL, t.pair) }),
      ...(vPriceLogic(t) && { priceTP: vPriceLogic(t) }),
      ...(vResult(t.result) && { result: vResult(t.result) })
    };
    const dateOrderError = vDateOrder(t.dateEN, t.dateEX);
    if (dateOrderError) {
      issues.dateEN = dateOrderError;
      issues.dateEX = dateOrderError;
    }
    const priceLogicError = vPriceLogic(t);
      if (priceLogicError) {
        issues.type = priceLogicError;
        issues.priceEN = priceLogicError;
        issues.priceTP = priceLogicError;
        issues.priceSL = priceLogicError;
      }
    const keys = Object.keys(issues);
    return { ...t, issues, valid: !keys.length };
  });
}