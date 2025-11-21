// /helpers/metrics_equity.js

export function buildEquityCurve(trades = []) {
  let eqPips = 0,
    eqVPips = 0,
    barIndex = 0;
  
  const curvePips = [];
  const curveVPips = [];
  
  for (const t of trades) {
    const pips = Number(t.pips) || 0;
    const vpips = Number(t.vpips) || 0;
    
    eqPips += pips;
    eqVPips += vpips;
    
    const base = {
      pair: t.pair,
      type: t.type,
      pips,
      vpips,
      date: t.dateEX,
      barIndex: barIndex++
    };
    
    curvePips.push({
      ...base,
      equity: eqPips
    });
    
    curveVPips.push({
      ...base,
      equity: eqVPips
    });
  }
  
  return {
    pips: curvePips,
    vpips: curveVPips
  };
}

export function computeDrawdown(curve = [], threshold = 0) {
  if (!curve.length) return emptyResult();
  // --- PREP: gunakan timestamp dari dateEX / __ts ---
  const getTs = (e) => e.date ?? e.__ts;
  let peakVal = curve[0].equity;
  let peakIdx = 0;
  let peakTs = getTs(curve[0]);
  
  let troughVal = peakVal;
  let troughIdx = 0;
  let troughTs = peakTs;
  
  let inDD = false;
  
  const events = [];
  let maxDD = 0;
  let maxDDPercent = 0;
  let totalDD = 0;
  let ddCount = 0;
  
  for (let i = 1; i < curve.length; i++) {
    const e = curve[i].equity;
    const ts = getTs(curve[i]);
    // --- PEAK BARU ---
    if (e >= peakVal) {
      if (inDD) {
        const ddAbs = peakVal - troughVal;
        
        if (ddAbs >= threshold) {
          const ddPct = peakVal !== 0 ? (ddAbs / peakVal) * 100 : 0;
          
          const recoveryTs = ts;
          const durationMs = recoveryTs - troughTs;
          const durationHours = durationMs / 3_600_000;
          const durationBars = durationHours / 4;
          
          events.push({
            peak: { value: peakVal, index: peakIdx, timestamp: peakTs },
            trough: { value: troughVal, index: troughIdx, timestamp: troughTs },
            recoveryIndex: i,
            recoveryTimestamp: recoveryTs,
            
            ddAbs,
            ddPct,
            
            durationMs,
            durationHours,
            durationBars,
          });
          
          maxDD = Math.max(maxDD, ddAbs);
          maxDDPercent = Math.max(maxDDPercent, ddPct);
          totalDD += ddAbs;
          ddCount++;
        }
      }
      
      // reset peak
      peakVal = e;
      peakIdx = i;
      peakTs = ts;
      
      troughVal = e;
      troughIdx = i;
      troughTs = ts;
      
      inDD = false;
      continue;
    }
    
    // --- DRAWDOWN BERJALAN ---
    if (!inDD) {
      inDD = true;
      troughVal = e;
      troughIdx = i;
      troughTs = ts;
    } else if (e < troughVal) {
      troughVal = e;
      troughIdx = i;
      troughTs = ts;
    }
  }
  
  // --- END OF SERIES (unrecovered DD) ---
  if (inDD) {
    const ddAbs = peakVal - troughVal;
    
    if (ddAbs >= threshold) {
      const ddPct = peakVal !== 0 ? (ddAbs / peakVal) * 100 : 0;
      
      events.push({
        peak: { value: peakVal, index: peakIdx, timestamp: peakTs },
        trough: { value: troughVal, index: troughIdx, timestamp: troughTs },
        recoveryIndex: null,
        recoveryTimestamp: null,
        
        ddAbs,
        ddPct,
        
        durationMs: null,
        durationHours: null,
        durationBars: null,
        durationStr: "Unrecovered"
      });
      
      maxDD = Math.max(maxDD, ddAbs);
      maxDDPercent = Math.max(maxDDPercent, ddPct);
      totalDD += ddAbs;
      ddCount++;
    }
  }
  
  // --- AVERAGE RECOVERY TIME ---
  const recovered = events.filter(e => e.recoveryIndex !== null);
  
  let avgHours = 0;
  let avgBars = 0;
  if (recovered.length > 0) {
    avgHours = recovered.reduce((s, e) => s + e.durationHours, 0) / recovered.length;
    avgBars = recovered.reduce((s, e) => s + e.durationBars, 0) / recovered.length;
  }
  
  return {
    maxDD,
    maxDDPercent,
    avgDD: ddCount > 0 ? totalDD / ddCount : 0,
    count: ddCount,
    events,
    avgRecoveryBars: avgBars,
  };
}



// Utility for empty results
function emptyResult() {
  return {
    maxDD: 0,
    maxDDPercent: 0,
    avgDD: 0,
    count: 0,
    events: []
  };
}