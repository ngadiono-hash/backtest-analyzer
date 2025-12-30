
import * as FM from "util/formatter.js";

export class Preview {
  constructor() {
    
  }

  buildTrade(raw) {
    const parsed = this._parseText(raw).map(this.normalize);
    return this.validate(parsed).map((t, i) => ({
      id: `tmp_${i}`,
      ...t
    }));
  }

  mapToDB(trade) {
    const tsEN = FM.toTimestamp(trade.dateEN);
    const tsEX = FM.toTimestamp(trade.dateEX);
  
    const { pTP, pSL, vTP, vSL } = this._computeResult(trade);
    const isWin  = trade.result === "TP";
    const isLong = trade.type === "LONG";
  
    return {
      pair: trade.pair,
      isWin,
      isLong,
      
      dateEN: tsEN,
      dateEX: tsEX,
      month: FM.yearMonth(tsEX),
  
      priceEN: +trade.priceEN,
      priceTP: +trade.priceTP,
      priceSL: +trade.priceSL,
  
      pTP: FM.round(pTP),
      pSL: FM.round(pSL),
      vTP: FM.round(vTP),
      vSL: FM.round(vSL),
    };
  }
  
  validate(trade) {
    const pairs = Object.keys(PAIRS);
  
    const vPair = p => !p?.trim() ? 'Missing value' :
      !/^[A-Z]{6}$/.test(p) ? `Invalid format (${p})` :
      !pairs.includes(p) ? `Not available pair (${p})` : null;
  
    const vType = t => !t?.trim() ? 'Missing value' :
      !['LONG','SHORT'].includes(t) ? `Invalid value (${t})` : null;
  
    const vDate = d => {
      if (!d?.trim()) return "Missing value";
    
      const [day, mon, year] = d.split("-");
      const dayN  = Number(day);
      const yearN = Number(year);
    
      if (!MONTH_NAMES.includes(mon))
        return `Invalid month (${mon})`;
    
      if (dayN < 1 || dayN > 31)
        return `Invalid day (${day})`;
    
      const monthIndex = MONTH_NAMES.indexOf(mon);
      const fullYear   = 2000 + yearN;
      const date       = new Date(fullYear, monthIndex, dayN);
    
      if (
        date.getFullYear() !== fullYear ||
        date.getMonth()    !== monthIndex ||
        date.getDate()     !== dayN
      ) {
        return `Invalid calendar date (${d})`;
      }
    
      return null;
    };
    
    const vDateOrder = (dateEN, dateEX) => {
      const dEN = FM.toTimestamp(dateEN);
      const dEX = FM.toTimestamp(dateEX);
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
      if (type === 'LONG') {
        if (!(tp > en && sl < en)) return 'Invalid price for LONG (TP > EN > SL)';
      }
      if (type === 'SHORT') {
        if (!(tp < en && sl > en)) return 'Invalid price for SHORT (TP < EN < SL)';
      }
      return null;
    };
  
    const vResult = r => !r?.trim() ? 'Missing value' :
      !['TP','SL'].includes(r) ? `Invalid value (${r})` : null;
  
    return trade.map(t => {
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

  normalize(trade) {
    const normalType = s => {
      if (typeof s !== "string") return s;
      let t = s.trim().toUpperCase();
      t = t.replace(/^(BU|LO).*$/, "LONG");
      t = t.replace(/^(SE|SHO).*$/, "SHORT");
     return t;
    };
  
    const normalPrice = s => {
      if (!trade.pair) return s;
      const p   = trade.pair.toUpperCase(),
            dec = p === "XAUUSD" ? 2 : p.includes("JPY") ? 3 : 5,
            num = parseFloat(s);
      return !s || Number.isNaN(num) ? "" : num.toFixed(dec);
    };
  
    const normalDate = s => {
      if (!s || typeof s !== "string") return s;
      const [d, m, y] = s.trim().split("-");
      if (!d || !m || !y) return s;
  
      // month text
      if (/[a-zA-Z]/.test(m)) {
        const key = m.slice(0,3).toLowerCase();
        const k   = key[0].toUpperCase() + key.slice(1);
        if (!(k in MONTHS)) return s;
        return `${d.padStart(2,"0")}-${MONTH_NAMES[MONTHS[k]]}-${y.slice(-2).padStart(2,"0")}`;
      }
  
      // month numeric
      const mi = Number(m);
      if (mi < 1 || mi > 12) return s;
      return `${d.padStart(2,"0")}-${MONTH_NAMES[mi-1]}-${y.slice(-2).padStart(2,"0")}`;
    };
    const normalResult = s => {
      if (typeof s !== "string") return s;
      let t = s.trim().toUpperCase();
      t = t.replace(/^(T).*$/, "TP");
      t = t.replace(/^(S).*$/, "SL");
     return t;
    };
    return {
      ...trade,
      type:    normalType(trade.type),
      dateEN:  normalDate(trade.dateEN),
      dateEX:  normalDate(trade.dateEX),
      priceEN: normalPrice(trade.priceEN),
      priceTP: normalPrice(trade.priceTP),
      priceSL: normalPrice(trade.priceSL),
      result:  normalResult(trade.result),
    };
  }
  
  _parseText(raw) {
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

  _computeResult(trade) {
    const { priceEN, priceTP, priceSL, type, pair } = trade;
    const en = +priceEN;
    const tp = +priceTP;
    const sl = +priceSL;
    const factor = pair.endsWith('JPY') ? 100 : pair === 'XAUUSD' ? 10 : 10000;
    const multiplier = PAIRS[pair];
    const rawTP = type === 'LONG' ? (tp - en) * factor : (en - tp) * factor;
    const rawSL = type === 'LONG' ? (sl - en) * factor : (en - sl) * factor;
    const pTP = Math.abs(rawTP);
    const pSL = -Math.abs(rawSL);
    const vTP = pTP * multiplier;
    const vSL = pSL * multiplier;
    return { pTP, pSL, vTP, vSL };
  }


}
