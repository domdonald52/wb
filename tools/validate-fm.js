// Headless FM validation: load performance engine, load each aircraft's afm data,
// for each FM table point run the engine and compare result vs the table value.
const fs = require('fs');
const path = require('path');

// Minimal browser-window shim
global.window = {};
global.AFM_DATA = {};
// Pull in performance.js (it attaches to window.Performance)
const perf = fs.readFileSync('performance.js','utf8');
eval(perf);
const P = window.Performance;

function loadAfm(file){
  const code = fs.readFileSync(file,'utf8');
  // afm files set window.AFM_DATA[key] = {...}
  eval(code);
}
loadAfm('perf-pa38.js');
loadAfm('perf-c172n.js');
loadAfm('perf-c152.js');

const AD = window.AFM_DATA || {};
console.log('AFM keys:', Object.keys(AD));

function checkAircraft(key){
  const a = AD[key];
  if (!a) { console.log(`-- ${key}: no AFM data`); return; }
  console.log(`\n=== ${key} (${a.name||''}) ===`);
  // Take-off table validation
  if (Array.isArray(a.takeoff_table) && a.takeoff_table.length){
    console.log('\nTakeoff table:');
    console.log('PA(ft) | OAT(C) |  Table |  App  | diff(m) | diff(%)');
    let maxAbs = 0;
    for (const row of a.takeoff_table){
      // Run the engine with the same inputs: paved, dry, zero wind, zero slope, MTOW
      const r = P.afmFactorsTakeoff(a, row.pa, row.t, 'paved', false, 0, 0, a.takeoff_table_alt_weight_kg ? null : null);
      const d = r.distance;
      const diff = d - row.d;
      const pct = (diff / row.d) * 100;
      if (Math.abs(diff) > maxAbs) maxAbs = Math.abs(diff);
      console.log(`${String(row.pa).padStart(5)} | ${String(row.t).padStart(5)} | ${String(row.d).padStart(6)} | ${d.toFixed(0).padStart(5)} | ${diff.toFixed(0).padStart(6)} | ${pct.toFixed(1).padStart(5)}%`);
    }
    console.log(`Max abs diff: ${maxAbs.toFixed(1)} m`);
  } else {
    console.log('No takeoff_table (linear coef only).');
  }
  // Landing table
  if (Array.isArray(a.landing_table) && a.landing_table.length){
    console.log('\nLanding table:');
    console.log('PA(ft) | OAT(C) |  Table |  App  | diff(m) | diff(%)');
    let maxAbs = 0;
    for (const row of a.landing_table){
      const r = P.afmFactorsLanding(a, row.pa, row.t, 'paved', false, 0, 0, null);
      const d = r.distance;
      const diff = d - row.d;
      const pct = (diff / row.d) * 100;
      if (Math.abs(diff) > maxAbs) maxAbs = Math.abs(diff);
      console.log(`${String(row.pa).padStart(5)} | ${String(row.t).padStart(5)} | ${String(row.d).padStart(6)} | ${d.toFixed(0).padStart(5)} | ${diff.toFixed(0).padStart(6)} | ${pct.toFixed(1).padStart(5)}%`);
    }
    console.log(`Max abs diff: ${maxAbs.toFixed(1)} m`);
  } else {
    console.log('No landing_table.');
  }
}

['PA-38','C172N','C152'].forEach(checkAircraft);
