// /helpers/metrics_monthly.js
// AGGREGATE EVERY MONTH, PERIOD BACKTEST, AGGREGATE BY PAIRS
import { log } from "../helpers/shortcut.js";
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function aggregateByMonth(trades) {
  
  const map = {};
  
  for (const t of trades) {
    const d = t.dateEX;
    if (!d || !(d instanceof Date)) continue;
    
    const year = d.getFullYear();
    const monthName = MONTHS[d.getMonth()];
    const pips = Number(t.pips) || 0;
    const vpips = Number(t.vpips) || 0;
    
    // Jika tahun belum dibuat
    if (!map[year]) {
      map[year] = {};
      
      // Buat semua month slot = null → belum ada data
      MONTHS.forEach(m => {
        map[year][m] = null;
      });
      
      map[year].YTD_pips = 0;
      map[year].YTD_vpips = 0;
    }
    
    // Jika bulan belum punya data, buat struktur baru
    if (!map[year][monthName]) {
      map[year][monthName] = {
        pips: 0,
        vpips: 0,
        count: 0,
        list: []
      };
    }
    
    const entry = map[year][monthName];
    
    // Tambahkan akumulasi
    entry.pips += pips;
    entry.vpips += vpips;
    entry.count += 1;
    
    // Simpan list trade
    entry.list.push({
      no: entry.count,
      pair: t.pair,
      type: t.type,
      dateEX: d,
      pips,
      vpips
    });
    
    // Tambahkan YTD
    map[year].YTD_pips += pips;
    map[year].YTD_vpips += vpips;
  }
  
  return map;
}

export function computeMonthlyStats(monthlyMap, stabilityTarget = 300) {
  
  const monthlyList = []; // semua bulan valid
  
  // Untuk periode
  let firstDate = null;
  let lastDate = null
  
  for (const year in monthlyMap) {
    for (const m of MONTHS) {
      const entry = monthlyMap[year][m];
      if (entry && typeof entry === 'object') {
        
        // entry.list harus punya minimal 1 trade
        
          // Ambil tanggal pertama & terakhir pada bulan itu
          const monthDates = entry.list.map(t => t.dateEX).sort((a, b) => a - b);
          
          firstDate = monthDates[0];
          lastDate = monthDates.at(-1);
        
        
        monthlyList.push({
          year,
          month: m,
          pips: entry.pips,
          vpips: entry.vpips
        });
      }
    }
  }
  
  // ---- PERIOD SECTION ----
  const startDate = firstDate;
  const endDate = lastDate;
  
  // Total bulan valid dihitung dari monthlyList
  const months = monthlyList.length;
  
  const period = { start: startDate, end: endDate, months };
  
  // ---- TOTALS ----
  const totalPips = monthlyList.reduce((s, m) => s + m.pips, 0);
  const totalVPips = monthlyList.reduce((s, m) => s + m.vpips, 0);
  
  // ---- AVERAGES ----
  const avgPips = totalPips / months;
  const avgVPips = totalVPips / months;
  
  // ---- HIGHEST & LOWEST (berdasarkan vpips) ----
  let highest = monthlyList[0];
  let lowest = monthlyList[0];
  
  for (const m of monthlyList) {
    if (m.vpips > highest.vpips) highest = m;
    if (m.vpips < lowest.vpips) lowest = m;
  }
  
  // ---- STANDARD DEVIATION ----
  const stdPips = Math.sqrt(
    monthlyList.reduce((s, m) => s + Math.pow(m.pips - avgPips, 2), 0) / months
  );
  
  const stdVPips = Math.sqrt(
    monthlyList.reduce((s, m) => s + Math.pow(m.vpips - avgVPips, 2), 0) / months
  );
  
  // ---- STABILITY (vpips ≥ target) ----
  const stableCount = monthlyList.filter(m => m.vpips >= stabilityTarget).length;
  const stability = (stableCount / months) * 100;
  
  return {
    period,
    months,
    totalPips,
    totalVPips,
    avgPips,
    avgVPips,
    highest,
    lowest,
    stdPips,
    stdVPips,
    stability
  };
}

export function aggregateByPair(trades) {
    const map = {};
    
    for (const t of trades) {
      const pair = t.pair;
      const pips = Number(t.pips) || 0;
      const vpips = Number(t.vpips) || 0;
      
      if (!map[pair]) {
        map[pair] = {
          pair,
          count: 0,
          win: 0,
          loss: 0,
          pips: 0,
          vpips: 0
        };
      }
      
      const entry = map[pair];
      
      entry.count++;
      entry.pips += pips;
      entry.vpips += vpips;
      
      if (t.isWin) entry.win++;
      else entry.loss++;
    }
    
    // transform → calculate derived metrics
    const list = Object.values(map).map(entry => ({
      ...entry,
      avgPips: entry.count ? entry.pips / entry.count : 0,
      avgVPips: entry.count ? entry.vpips / entry.count : 0
    }));
    
    // sorting: VPIPS lebih relevan secara ekonomis
    list.sort((a, b) => b.vpips - a.vpips);
    
    return list;
  }