// /helpers/metrics_monthly.js
// Group trades by month and calculate monthly statistics.

import { standardDeviation } from './metrics_utils.js';

/* -------------------------------------------------
   1. Group trades by month (YYYY-MM)
   ------------------------------------------------- */
export function groupByMonth(trades = []) {
  const map = {};
  trades.forEach(t => {
    const dt = t.dateEN instanceof Date ? t.dateEN : new Date(t.dateEN);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });
  return map;
}

/* -------------------------------------------------
   2. NEW – ambil min / max dari aggregateMonthlyPips
   ------------------------------------------------- */
export function getMonthlyNetExtremes(monthlyMap = {}, pipValue = 1) {
  const pipsValues = [];
  const dollarValues = [];
  
  // Iterasi semua tahun → semua bulan
  for (const year in monthlyMap) {
    for (const month in monthlyMap[year]) {
      const pips = monthlyMap[year][month];
      if (pips === null || pips === undefined) continue;
      
      pipsValues.push(pips);
      dollarValues.push(pips * pipValue);
    }
  }
  
  if (pipsValues.length === 0) {
    return {
      minNetPips: 0,
      maxNetPips: 0,
    };
  }

  return {
    minNetPips: Math.min(...pipsValues),
    maxNetPips: Math.max(...pipsValues),
  };
}

/* -------------------------------------------------
   3. calculateMonthlyStats – pakai aggregateMonthlyPips
   ------------------------------------------------- */
export function calculateMonthlyStats(monthlyMap = {}, pipValue = 1) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyPips = [];
  const monthlyDollar = [];
  for (const year in monthlyMap) {
    const yearData = monthlyMap[year];
    if (typeof yearData !== 'object') continue;
    
    for (const month of MONTHS) {
      const pips = yearData[month];
      if (pips === null || pips === undefined) continue; // skip bulan kosong
      
      monthlyPips.push(pips);
      monthlyDollar.push(pips * pipValue);
    }
  }
  //console.log(monthlyPips)
  // Jika tidak ada data bulanan
  if (monthlyPips.length === 0) {
    return {
      minPips: 0,
      maxPips: 0,
      avgPips: 0,
      minDollar: 0,
      maxDollar: 0,
      avgDollar: 0,
      stability: 0
    };
  }
  
  // Hitung min, max, avg
  const minPips = Math.min(...monthlyPips);
  const maxPips = Math.max(...monthlyPips);
  const avgPips = monthlyPips.reduce((a, b) => a + b, 0) / monthlyPips.length;
  const avgDollar = monthlyDollar.reduce((a, b) => a + b, 0) / monthlyDollar.length;
  
  // Stability: CV = (stdDev / |mean|) * 100
  const stability = avgPips === 0 ?
    0 :
    Number((standardDeviation(monthlyPips) / Math.abs(avgPips)) * 100).toFixed(2);
  
  return {
    minPips,
    maxPips,
    avgPips: Number(avgPips.toFixed(2)),
    minDollar: Number((minPips * pipValue).toFixed(2)),
    maxDollar: Number((maxPips * pipValue).toFixed(2)),
    avgDollar: Number(avgDollar.toFixed(2)),
    stability
  };
}

/* -------------------------------------------------
   4. aggregateMonthlyPips – tetap seperti semula
   ------------------------------------------------- */
export function aggregateMonthlyPips(trades) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const map = {};
  
  for (const t of trades) {
    const d = t.dateEX;
    if (!d || !(d instanceof Date)) continue;
    
    const year = d.getFullYear();
    const month = MONTHS[d.getMonth()];
    const pips = Number(t.pips) || 0;
    
    if (!map[year]) {
      map[year] = {};
      MONTHS.forEach(m => map[year][m] = null); // null → belum ada data
      map[year].YTD = 0;
    }
    
    map[year][month] = (map[year][month] || 0) + pips;
    map[year].YTD += pips;
  }
  
  return map;
}