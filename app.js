// Weight & Balance app
// All math is in the aircraft's native unit system. Stations have weight and arm; moment = weight * arm.
// CG = total moment / total weight. Envelope is a piecewise-linear polygon of (weight, fwd_arm, aft_arm) rows.

const DEFAULT_FLEET = [
  {
    id: 'c152-demo',
    reg: 'G-DEMO',
    type: 'Cessna 152',
    units: 'imperial',           // imperial: lb, in, US gal; metric: kg, mm, L
    empty_weight: 1118,
    empty_arm: 32.9,
    fuel_lb_per_gal: 6.0,        // imperial only
    fuel_kg_per_litre: 0.72,     // metric only
    usable_fuel: 24.5,           // gal or L
    fuel_arm: 42.0,
    burn_rate: 6.0,              // gph or lph
    mtow: 1670,
    mlw: 1670,
    mzfw: null,
    reserve_minutes: 30,
    scenarios: [],
    stations: [
      { name: 'Pilot + front pax', arm: 39.0, min: 0, max: 400, default: 340 },
      { name: 'Baggage area 1',    arm: 64.0, min: 0, max: 120, default: 0 }
    ],
    envelope: [
      { w: 1118, fwd: 31.0, aft: 36.5 },
      { w: 1350, fwd: 31.0, aft: 36.5 },
      { w: 1670, fwd: 32.65, aft: 36.5 }
    ]
  },
  {
    id: 'c172-demo',
    reg: 'G-DEM2',
    type: 'Cessna 172N',
    units: 'imperial',
    empty_weight: 1467,
    empty_arm: 39.0,
    fuel_lb_per_gal: 6.0,
    fuel_kg_per_litre: 0.72,
    usable_fuel: 40,
    fuel_arm: 48.0,
    burn_rate: 8.5,
    mtow: 2300,
    mlw: 2300,
    mzfw: null,
    reserve_minutes: 30,
    scenarios: [],
    stations: [
      { name: 'Pilot + front pax', arm: 37.0, min: 0, max: 450, default: 340 },
      { name: 'Rear passengers',   arm: 73.0, min: 0, max: 400, default: 0 },
      { name: 'Baggage area 1',    arm: 95.0, min: 0, max: 120, default: 0 },
      { name: 'Baggage area 2',    arm: 123.0, min: 0, max:  50, default: 0 }
    ],
    envelope: [
      { w: 1500, fwd: 35.0, aft: 47.3 },
      { w: 1950, fwd: 35.0, aft: 47.3 },
      { w: 2300, fwd: 38.5, aft: 47.3 }
    ]
  },
  {
    id: 'pa28-demo',
    reg: 'G-DEM3',
    type: 'Piper PA-28-161 Warrior',
    units: 'imperial',
    empty_weight: 1454,
    empty_arm: 86.5,
    fuel_lb_per_gal: 6.0,
    fuel_kg_per_litre: 0.72,
    usable_fuel: 48,
    fuel_arm: 95.0,
    burn_rate: 8.5,
    mtow: 2325,
    mlw: 2325,
    mzfw: null,
    reserve_minutes: 30,
    scenarios: [],
    stations: [
      { name: 'Pilot + front pax', arm: 80.5,  min: 0, max: 450, default: 340 },
      { name: 'Rear passengers',   arm: 118.1, min: 0, max: 400, default: 0 },
      { name: 'Baggage',           arm: 142.8, min: 0, max: 200, default: 0 }
    ],
    envelope: [
      { w: 1500, fwd: 83.0, aft: 95.9 },
      { w: 1950, fwd: 83.0, aft: 95.9 },
      { w: 2325, fwd: 88.6, aft: 95.9 }
    ]
  },
  {
    id: 'pa38-demo',
    reg: 'G-DEM4',
    type: 'Piper PA-38 Tomahawk',
    units: 'imperial',
    empty_weight: 1109,
    empty_arm: 71.4,
    fuel_lb_per_gal: 6.0,
    fuel_kg_per_litre: 0.72,
    usable_fuel: 30,
    fuel_arm: 75.4,
    burn_rate: 6.0,
    mtow: 1670,
    mlw: 1670,
    mzfw: null,
    reserve_minutes: 30,
    scenarios: [],
    pchart_id: 'PA-38',
    crosswind_demonstrated_kt: 15,
    crosswind_club_kt: null,
    stations: [
      { name: 'Pilot + front pax', arm: 75.6,  min: 0, max: 400, default: 340 },
      { name: 'Baggage',           arm: 114.5, min: 0, max: 100, default: 0 }
    ],
    envelope: [
      { w: 1109, fwd: 68.0, aft: 82.0 },
      { w: 1670, fwd: 71.0, aft: 82.0 }
    ]
  }
];

const STORAGE_KEY = 'wb_fleet_v1';
const SELECTED_KEY = 'wb_selected_v1';
const RECENT_RUNWAYS_KEY = 'wb_recent_runways_v1';
const RUNWAYS_KEY = 'wb_runways_v1';
const SELECTED_TO_RUNWAY_KEY = 'wb_selected_to_runway_v1';
const SELECTED_LD_RUNWAY_KEY = 'wb_selected_ld_runway_v1';
const MAX_RECENT_RUNWAYS = 5;

const App = (function(){
  let fleet = [];
  let selectedId = null;
  let mode = 'forward';
  let stationValues = {};   // {ac_id: {station_idx: weight}}
  let fuelInput = {};       // {ac_id: {fuel: x, duration: y}}
  let legsInput = {};       // {ac_id: [{name, duration, uplift_after}]}
  let perfInput = {
    to_runway: { id: null, ident: '', heading: 0, elev: 0, slope: 0, tora: 0, lda: 0, surface: 'paved', group: null },
    to_condition: 'dry',
    to_wind: { mode: 'dirspeed', dir: 0, speed: 0, headwind_component: 0 },
    ld_runway: { id: null, ident: '', heading: 0, elev: 0, slope: 0, tora: 0, lda: 0, surface: 'paved', group: null },
    ld_condition: 'dry',
    ld_wind: { mode: 'dirspeed', dir: 0, speed: 0, headwind_component: 0 },
    conditions: { oat: null, qnh: 1013 },
    op_type: 'private',
    op_time: 'day',
    perf_method: 'pchart',
  };
  let recentRunways = [];
  const APP_VERSION = 'wb-v33';
  let runways = [];
  let selectedToRunwayId = null;
  let selectedLdRunwayId = null;
  let editingRunwayId = null;
  let chart = null;
  let editingId = null;     // id of aircraft being edited (null = new)

  // ---- units helpers ----
  function u(ac){
    if (ac.units === 'metric'){
      return { w:'kg', arm:'mm', vol:'L', flow:'lph', fuel_density: ac.fuel_kg_per_litre || 0.72 };
    }
    return { w:'lb', arm:'in', vol:'gal', flow:'gph', fuel_density: ac.fuel_lb_per_gal || 6.0 };
  }
  const fmt = (n, d=0) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString(undefined, {minimumFractionDigits:d, maximumFractionDigits:d});
  };
  const fmtArm = (n, ac) => fmt(n, ac.units === 'metric' ? 0 : 2);

  // ---- storage ----
  function migrate(ac){
    if (!ac.scenarios) ac.scenarios = [];
    if (ac.pchart_id === undefined) ac.pchart_id = null;
    if (ac.afm_id === undefined) ac.afm_id = null;
    if (ac.crosswind_demonstrated_kt === undefined) ac.crosswind_demonstrated_kt = null;
    if (ac.crosswind_club_kt === undefined) ac.crosswind_club_kt = null;
    if (ac.group === undefined) ac.group = null;
    if (ac.fuel_total === undefined){ ac.fuel_total = ac.usable_fuel; ac.fuel_unusable = 0; }
    // One-time fix-up: the default PA-38 demo aircraft should be bound to the PA-38 P-chart.
    // Existing installs from before P-chart support won't have this set; restore it now
    // without disturbing user-edited fields.
    if (ac.id === 'pa38-demo' && !ac.pchart_id){
      ac.pchart_id = 'PA-38';
      if (ac.crosswind_demonstrated_kt == null) ac.crosswind_demonstrated_kt = 15;
    }
    return ac;
  }
  function migrateRunway(r){
    // ensure new fields exist; group=null means no Group check
    if (r.group === undefined) r.group = null;
    if (!r.id) r.id = 'rwy-' + Math.random().toString(36).slice(2, 9);
    return r;
  }
  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw){ fleet = JSON.parse(raw).map(migrate); }
      else { fleet = JSON.parse(JSON.stringify(DEFAULT_FLEET)); save(); }
    } catch(e){ fleet = JSON.parse(JSON.stringify(DEFAULT_FLEET)); }
    selectedId = localStorage.getItem(SELECTED_KEY) || (fleet[0] && fleet[0].id);
    if (!fleet.find(a => a.id === selectedId)) selectedId = fleet[0] && fleet[0].id;
    // Recent runways
    try {
      const rr = localStorage.getItem(RECENT_RUNWAYS_KEY);
      if (rr) recentRunways = JSON.parse(rr);
    } catch(e){ recentRunways = []; }
    // Saved runways database
    try {
      const rd = localStorage.getItem(RUNWAYS_KEY);
      if (rd){
        runways = JSON.parse(rd).map(migrateRunway);
      } else {
        // First time: migrate existing recent runways into the saved list
        runways = recentRunways.map(r => migrateRunway(JSON.parse(JSON.stringify(r))));
        saveRunways();
      }
    } catch(e){ runways = []; }
    selectedToRunwayId = localStorage.getItem(SELECTED_TO_RUNWAY_KEY) || null;
    selectedLdRunwayId = localStorage.getItem(SELECTED_LD_RUNWAY_KEY) || null;
    if (selectedToRunwayId && !runways.find(r => r.id === selectedToRunwayId)) selectedToRunwayId = null;
    if (selectedLdRunwayId && !runways.find(r => r.id === selectedLdRunwayId)) selectedLdRunwayId = null;
    // Populate perfInput from selected runways
    const applyRw = (sd, id) => {
      if (!id) return;
      const rw = runways.find(x => x.id === id); if (!rw) return;
      const key = sd === 'ld' ? 'ld_runway' : 'to_runway';
      perfInput[key] = { id: rw.id, ident: rw.ident || '', heading: rw.heading ?? 0, elev: rw.elev ?? 0, slope: rw.slope ?? 0, tora: rw.tora ?? 0, lda: rw.lda ?? 0, surface: rw.surface || 'paved', group: rw.group ?? null };
    };
    applyRw('to', selectedToRunwayId);
    applyRw('ld', selectedLdRunwayId);
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(fleet)); }
  function saveSelected(){ if (selectedId) localStorage.setItem(SELECTED_KEY, selectedId); }
  function saveRecentRunways(){ localStorage.setItem(RECENT_RUNWAYS_KEY, JSON.stringify(recentRunways)); }
  function saveRunways(){ localStorage.setItem(RUNWAYS_KEY, JSON.stringify(runways)); }
  function saveSelectedToRunway(){ if (selectedToRunwayId) localStorage.setItem(SELECTED_TO_RUNWAY_KEY, selectedToRunwayId); else localStorage.removeItem(SELECTED_TO_RUNWAY_KEY); }
  function saveSelectedLdRunway(){ if (selectedLdRunwayId) localStorage.setItem(SELECTED_LD_RUNWAY_KEY, selectedLdRunwayId); else localStorage.removeItem(SELECTED_LD_RUNWAY_KEY); }

  // ---- W&B math ----
  function interpLimit(envelope, w, side){
    const e = [...envelope].sort((a,b) => a.w - b.w);
    if (w <= e[0].w) return e[0][side];
    if (w >= e[e.length-1].w) return e[e.length-1][side];
    for (let i = 0; i < e.length-1; i++){
      if (w >= e[i].w && w <= e[i+1].w){
        const t = (w - e[i].w) / (e[i+1].w - e[i].w);
        return e[i][side] + t * (e[i+1][side] - e[i][side]);
      }
    }
    return e[e.length-1][side];
  }
  function inEnvelope(env, w, cg){
    const sortedW = [...env].map(p => p.w).sort((a,b)=>a-b);
    if (w < sortedW[0] - 0.001 || w > sortedW[sortedW.length-1] + 0.001) return false;
    const fwd = interpLimit(env, w, 'fwd');
    const aft = interpLimit(env, w, 'aft');
    return cg >= fwd - 0.001 && cg <= aft + 0.001;
  }

  function calc(ac){
    const sv = stationValues[ac.id] || {};
    const fc = fuelInput[ac.id] || {};
    const fuel = (fc.fuel !== undefined) ? fc.fuel : ac.usable_fuel;
    const duration = (fc.duration !== undefined) ? fc.duration : 1.0;

    const fuelWeight = fuel * u(ac).fuel_density;
    const fuelBurned = Math.min(fuel, duration * ac.burn_rate);
    const burnedWeight = fuelBurned * u(ac).fuel_density;

    let items = [];
    items.push({ name: 'Empty aircraft', w: ac.empty_weight, arm: ac.empty_arm });
    ac.stations.forEach((s, idx) => {
      const w = sv[idx] !== undefined ? sv[idx] : s.default || 0;
      items.push({ name: s.name, w, arm: s.arm, station: s, idx });
    });
    items.push({ name: 'Fuel', w: fuelWeight, arm: ac.fuel_arm, isFuel: true, gal: fuel });

    const tow = items.reduce((s,i) => s + i.w, 0);
    const m_to = items.reduce((s,i) => s + i.w * i.arm, 0);
    const cg_to = tow > 0 ? m_to / tow : 0;

    const ldw = tow - burnedWeight;
    const m_ld = m_to - burnedWeight * ac.fuel_arm;
    const cg_ld = ldw > 0 ? m_ld / ldw : 0;

    const zfw = tow - fuelWeight;
    const m_zf = m_to - fuelWeight * ac.fuel_arm;
    const cg_zf = zfw > 0 ? m_zf / zfw : 0;

    const violations = [];
    if (tow > ac.mtow) violations.push(`Takeoff weight ${fmt(tow)} exceeds MTOW ${fmt(ac.mtow)} by ${fmt(tow - ac.mtow)} ${u(ac).w}`);
    if (ac.mlw && ldw > ac.mlw) violations.push(`Landing weight ${fmt(ldw)} exceeds MLW ${fmt(ac.mlw)} by ${fmt(ldw - ac.mlw)} ${u(ac).w}`);
    if (ac.mzfw && zfw > ac.mzfw) violations.push(`Zero-fuel weight ${fmt(zfw)} exceeds MZFW ${fmt(ac.mzfw)}`);
    if (!inEnvelope(ac.envelope, tow, cg_to)) violations.push(`Takeoff CG ${fmtArm(cg_to, ac)} ${u(ac).arm} is outside envelope`);
    if (ldw > 0 && !inEnvelope(ac.envelope, ldw, cg_ld)) violations.push(`Landing CG ${fmtArm(cg_ld, ac)} ${u(ac).arm} is outside envelope`);
    ac.stations.forEach((s, idx) => {
      const w = sv[idx] !== undefined ? sv[idx] : s.default || 0;
      if (s.max && w > s.max) violations.push(`${s.name} ${fmt(w)} exceeds limit ${fmt(s.max)} ${u(ac).w}`);
    });
    if (fuel > ac.usable_fuel + 0.01) violations.push(`Fuel ${fmt(fuel,1)} exceeds usable ${fmt(ac.usable_fuel,1)} ${u(ac).vol}`);

    return { ac, items, tow, m_to, cg_to, ldw, cg_ld, zfw, cg_zf, fuelWeight, fuelBurned, burnedWeight, fuel, duration, violations };
  }

  // Multi-leg: each leg has {name, duration, uplift_before} (uplift_before is fuel added before this leg starts).
  // Leg 1 uplift_before is ignored — starting fuel comes from the main fuelInput.fuel value.
  function calcMultileg(ac){
    const sv = stationValues[ac.id] || {};
    const fc = fuelInput[ac.id] || {};
    const fuelDens = u(ac).fuel_density;
    let payloadW = ac.empty_weight;
    let payloadM = ac.empty_weight * ac.empty_arm;
    ac.stations.forEach((s, idx) => {
      const w = sv[idx] !== undefined ? sv[idx] : s.default || 0;
      payloadW += w; payloadM += w * s.arm;
    });
    const startFuel = fc.fuel !== undefined ? fc.fuel : ac.usable_fuel;
    const legs = (legsInput[ac.id] || []).slice();
    if (legs.length === 0) legs.push({ name: 'Leg 1', duration: 1.0, uplift_before: 0 });

    const legResults = [];
    let fuel = startFuel;
    let violations = [];
    legs.forEach((leg, i) => {
      // Uplift before leg (skip for leg 0 — starting fuel is what's in the tank)
      if (i > 0 && leg.uplift_before > 0){
        fuel = Math.min(fuel + leg.uplift_before, ac.usable_fuel);
      }
      // Tank overfill warning
      if (i > 0 && leg.uplift_before > 0 && (fuel + leg.uplift_before - ac.usable_fuel > 0.5)){
        // already clamped, but flag
      }

      const startW = payloadW + fuel * fuelDens;
      const startM = payloadM + fuel * fuelDens * ac.fuel_arm;
      const startCG = startW > 0 ? startM / startW : 0;

      const burnFuel = Math.min(fuel, leg.duration * ac.burn_rate);
      const endFuel = fuel - burnFuel;
      const endW = payloadW + endFuel * fuelDens;
      const endM = payloadM + endFuel * fuelDens * ac.fuel_arm;
      const endCG = endW > 0 ? endM / endW : 0;

      const startOK_W = startW <= ac.mtow;
      const startOK_CG = inEnvelope(ac.envelope, startW, startCG);
      const endOK_W = !ac.mlw || endW <= ac.mlw;
      const endOK_CG = endW > 0 && inEnvelope(ac.envelope, endW, endCG);
      const ranOutOfFuel = leg.duration * ac.burn_rate > fuel + 0.001;

      if (!startOK_W) violations.push(`Leg ${i+1}: takeoff weight ${fmt(startW)} > MTOW ${fmt(ac.mtow)}`);
      if (!startOK_CG) violations.push(`Leg ${i+1}: takeoff CG ${fmtArm(startCG, ac)} out of envelope`);
      if (!endOK_W) violations.push(`Leg ${i+1}: landing weight ${fmt(endW)} > MLW ${fmt(ac.mlw)}`);
      if (!endOK_CG) violations.push(`Leg ${i+1}: landing CG ${fmtArm(endCG, ac)} out of envelope`);
      if (ranOutOfFuel) violations.push(`Leg ${i+1}: planned ${fmt(leg.duration,2)}h but only ${fmt(fuel/ac.burn_rate,2)}h of fuel available`);

      legResults.push({
        idx: i, name: leg.name || `Leg ${i+1}`, duration: leg.duration,
        uplift_before: i > 0 ? leg.uplift_before : 0,
        startFuel: fuel, endFuel, burnFuel,
        startW, startCG, endW, endCG,
        startOK_W, startOK_CG, endOK_W, endOK_CG, ranOutOfFuel
      });
      fuel = endFuel;
    });
    // Reserve check on final leg
    const reserveFuel = (ac.reserve_minutes / 60) * ac.burn_rate;
    const finalFuel = legResults.length ? legResults[legResults.length-1].endFuel : 0;
    const reserveOK = finalFuel >= reserveFuel - 0.001;
    if (!reserveOK) violations.push(`Final fuel ${fmt(finalFuel,1)} ${u(ac).vol} below ${ac.reserve_minutes}-min reserve (${fmt(reserveFuel,1)} ${u(ac).vol})`);

    return { legResults, violations, payloadW, payloadM, startFuel, finalFuel, reserveFuel, reserveOK };
  }

  // and (separately) that landing weight + landing CG stay in envelope.
  // Returns max usable fuel and corresponding endurance with reserve.
  function calcReverse(ac){
    const sv = stationValues[ac.id] || {};
    let payload = ac.empty_weight;
    let payloadMoment = ac.empty_weight * ac.empty_arm;
    ac.stations.forEach((s, idx) => {
      const w = sv[idx] !== undefined ? sv[idx] : s.default || 0;
      payload += w;
      payloadMoment += w * s.arm;
    });
    const fuelDens = u(ac).fuel_density;

    // Max fuel by MTOW
    const maxFuelByMtow = Math.max(0, (ac.mtow - payload) / fuelDens);
    const maxFuelByTank = ac.usable_fuel;

    // Walk fuel down until both takeoff CG and landing CG are in envelope
    // (this matters for some aircraft where loading a small pilot + full rear pax + full fuel pushes CG aft)
    let bestFuel = 0;
    let bestEndurance = 0;
    const maxTry = Math.min(maxFuelByMtow, maxFuelByTank);
    for (let f = maxTry; f >= 0; f -= 0.1){
      const tow = payload + f * fuelDens;
      const m_to = payloadMoment + f * fuelDens * ac.fuel_arm;
      const cg_to = tow > 0 ? m_to / tow : 0;
      if (!inEnvelope(ac.envelope, tow, cg_to)) continue;
      // Check landing assuming we burn until reserve only
      const reserveFuel = (ac.reserve_minutes / 60) * ac.burn_rate;
      const burnable = Math.max(0, f - reserveFuel);
      const ldw = tow - burnable * fuelDens;
      const m_ld = m_to - burnable * fuelDens * ac.fuel_arm;
      const cg_ld = ldw > 0 ? m_ld / ldw : 0;
      if (ac.mlw && ldw > ac.mlw) continue;
      if (!inEnvelope(ac.envelope, ldw, cg_ld)) continue;
      bestFuel = f;
      bestEndurance = ac.burn_rate > 0 ? f / ac.burn_rate : 0;
      break;
    }
    const usableEndurance = Math.max(0, bestEndurance - ac.reserve_minutes / 60);

    return { payload, fuelDens, maxFuelByMtow, maxFuelByTank, bestFuel, bestEndurance, usableEndurance };
  }

  // ---- rendering ----
  function renderAircraftDropdown(){
    const sel = document.getElementById('ac-dropdown');
    if (!sel) return;
    if (fleet.length === 0){
      sel.innerHTML = '<option value="">— no aircraft —</option>';
    } else {
      sel.innerHTML = fleet.map(ac =>
        `<option value="${ac.id}" ${ac.id === selectedId ? 'selected' : ''}>${ac.reg} — ${ac.type}</option>`
      ).join('');
    }
    document.getElementById('hdr-sub').textContent = selectedId ? (fleet.find(a => a.id === selectedId)?.reg || '') : 'no aircraft';
    document.getElementById('calculator').classList.toggle('hidden', !selectedId);
  }

  function selectAircraft(id){
    selectedId = id;
    saveSelected();
    renderAll();
  }

  function toggleAcMenu(event){
    if (event) event.stopPropagation();
    const m = document.getElementById('ac-menu');
    if (!m) return;
    m.classList.toggle('hidden');
    // Close on outside click
    if (!m.classList.contains('hidden')){
      setTimeout(() => {
        const handler = (ev) => {
          if (!m.contains(ev.target) && ev.target.id !== 'ac-menu-btn'){
            m.classList.add('hidden');
            document.removeEventListener('click', handler);
          }
        };
        document.addEventListener('click', handler);
      }, 0);
    }
  }
  function closeAcMenu(){
    const m = document.getElementById('ac-menu');
    if (m) m.classList.add('hidden');
  }

  function openManageAircraft(){
    renderManageList();
    document.getElementById('manage-modal').classList.remove('hidden');
  }
  function closeManageAircraft(){
    document.getElementById('manage-modal').classList.add('hidden');
  }
  function renderManageList(){
    const host = document.getElementById('manage-list');
    if (!host) return;
    if (fleet.length === 0){
      host.innerHTML = '<p style="color:var(--muted);font-size:13px">No aircraft yet. Tap "+ Add new aircraft" below.</p>';
      return;
    }
    host.innerHTML = fleet.map(ac => `
      <div class="manage-row">
        <div class="info">
          <div class="name">${ac.reg}</div>
          <div class="desc">${ac.type} · ${ac.units === 'metric' ? 'kg/mm' : 'lb/in'} · MTOW ${fmt(ac.mtow)} ${u(ac).w}</div>
        </div>
        <div class="actions">
          <button class="icon-btn" onclick="App.manageSelect('${ac.id}')" title="Select" aria-label="Select">✓</button>
          <button class="icon-btn" onclick="App.manageEdit('${ac.id}')" title="Edit" aria-label="Edit">✎</button>
          <button class="icon-btn" onclick="App.manageDuplicate('${ac.id}')" title="Duplicate" aria-label="Duplicate">⎘</button>
          <button class="icon-btn" onclick="App.manageDelete('${ac.id}')" title="Delete" aria-label="Delete" style="border-color:var(--bad);color:var(--bad)">🗑</button>
        </div>
      </div>
    `).join('');
  }
  function manageSelect(id){
    selectedId = id; saveSelected();
    closeManageAircraft();
    renderAll();
  }
  function manageEdit(id){
    selectedId = id; saveSelected();
    closeManageAircraft();
    openConfig();
  }
  function manageDuplicate(id){
    selectedId = id; saveSelected();
    closeManageAircraft();
    duplicateAircraft();
  }
  function manageDelete(id){
    const ac = fleet.find(a => a.id === id);
    if (!ac) return;
    if (!confirm(`Delete ${ac.reg} (${ac.type})? This cannot be undone.`)) return;
    fleet = fleet.filter(a => a.id !== id);
    if (selectedId === id) selectedId = fleet[0]?.id || null;
    save(); saveSelected();
    renderManageList();
    renderAll();
  }

  function renderStations(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac) return;
    const host = document.getElementById('stations');
    host.innerHTML = '';
    const sv = stationValues[ac.id] = stationValues[ac.id] || {};

    ac.stations.forEach((s, idx) => {
      if (sv[idx] === undefined) sv[idx] = s.default || 0;
      const div = document.createElement('div');
      div.className = 'station';
      div.innerHTML = `
        <div class="station-head">
          <span class="station-name">${s.name}</span>
          <span class="station-meta">arm ${fmtArm(s.arm, ac)}${s.max ? ' · max ' + fmt(s.max) + ' ' + u(ac).w : ''}</span>
        </div>
        <input type="number" inputmode="decimal" value="${sv[idx]}" min="0" max="${s.max ? s.max * 1.5 : 999}" step="${ac.units === 'metric' ? 1 : 1}" data-idx="${idx}">
      `;
      div.querySelector('input').addEventListener('input', e => {
        sv[idx] = parseFloat(e.target.value) || 0;
        update();
      });
      host.appendChild(div);
    });
  }

  function renderFuelControls(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac) return;
    const host = document.getElementById('fuel-controls');
    const titleEl = document.getElementById('fuel-card-title');
    const fc = fuelInput[ac.id] = fuelInput[ac.id] || {};
    if (fc.fuel === undefined) fc.fuel = ac.usable_fuel;
    if (fc.duration === undefined) fc.duration = 1.0;

    if (mode === 'forward'){
      titleEl.textContent = 'Fuel & flight';
      host.innerHTML = `
        <div class="row">
          <div>
            <label>Usable fuel on board (${u(ac).vol})</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="number" inputmode="decimal" id="in-fuel" value="${fc.fuel}" min="0" max="${ac.usable_fuel}" step="0.5" style="flex:1">
              <button class="btn secondary" id="in-fuel-max" type="button" style="width:auto;padding:8px 12px;font-size:12px;white-space:nowrap" title="Calculate and fill the maximum possible usable fuel given station weights, MTOW, tank capacity and CG">Max possible</button>
            </div>
            <small class="help" id="in-fuel-help">tank ${fmt(ac.usable_fuel,1)} ${u(ac).vol} usable · burn ${fmt(ac.burn_rate,1)} ${u(ac).flow}${(ac.fuel_unusable||0) > 0 ? ` · dipstick − ${fmt(ac.fuel_unusable,1)} = usable` : ''}</small>
          </div>
          <div>
            <label>Flight duration (hours)</label>
            <input type="number" inputmode="decimal" id="in-dur" value="${fc.duration}" min="0" max="10" step="0.25">
            <small class="help" id="in-dur-help">Burn: ${fmt(fc.duration * ac.burn_rate, 1)} ${u(ac).vol} × ${fmt(u(ac).fuel_density, 2)} = <strong>${fmt(fc.duration * ac.burn_rate * u(ac).fuel_density, 1)} ${u(ac).w}</strong></small>
          </div>
        </div>
        <div id="endurance-check" style="margin-top:6px;font-size:11px"></div>
      `;
      const refreshEnduranceCheck = () => {
        const f = parseFloat(document.getElementById('in-fuel').value) || 0;
        const d = parseFloat(document.getElementById('in-dur').value) || 0;
        const el = document.getElementById('endurance-check');
        if (!el || ac.burn_rate <= 0){ if (el) el.innerHTML = ''; return; }
        const reserveFuel = (ac.reserve_minutes / 60) * ac.burn_rate;
        const endurance = f / ac.burn_rate;
        const usableEnd = Math.max(0, (f - reserveFuel) / ac.burn_rate);
        const msg = `Endurance: ${fmt(endurance,2)} h to dry · ${fmt(usableEnd,2)} h after ${ac.reserve_minutes}-min reserve`;
        if (d > usableEnd && d > 0){
          el.innerHTML = `<div class="banner bad" style="margin:0;font-size:11px">⚠ Planned duration ${fmt(d,2)} h exceeds endurance after reserve (${fmt(usableEnd,2)} h). ${msg}</div>`;
        } else if (d > 0){
          el.innerHTML = `<div style="color:var(--muted)">${msg}</div>`;
        } else {
          el.innerHTML = `<div style="color:var(--muted)">${msg}</div>`;
        }
      };
      host.querySelector('#in-fuel').addEventListener('input', e => { fc.fuel = parseFloat(e.target.value) || 0; refreshEnduranceCheck(); update(); });
      host.querySelector('#in-fuel-max').addEventListener('click', () => {
        const r = calcReverse(ac);
        fc.fuel = r.bestFuel;
        const fuelEl = document.getElementById('in-fuel');
        fuelEl.value = fmt(r.bestFuel, 1);
        // Flash to make change obvious
        const origBorder = fuelEl.style.border;
        const origBg = fuelEl.style.background;
        fuelEl.style.border = '2px solid #16a34a';
        fuelEl.style.background = 'rgba(22,163,74,0.15)';
        setTimeout(() => { fuelEl.style.border = origBorder; fuelEl.style.background = origBg; }, 800);
        const limitedBy = r.bestFuel >= r.maxFuelByMtow - 0.05 ? 'MTOW' : (r.bestFuel >= r.maxFuelByTank - 0.05 ? 'tank capacity' : 'CG envelope');
        const unusable = ac.fuel_unusable || 0;
        const dipstick = r.bestFuel + unusable;
        const help = document.getElementById('in-fuel-help');
        if (help) help.innerHTML = `Max possible: <strong>${fmt(r.bestFuel,1)} ${u(ac).vol}</strong> usable (limited by ${limitedBy})${unusable > 0 ? ` · dipstick <strong>${fmt(dipstick,1)} ${u(ac).vol}</strong>` : ''}`;
        refreshEnduranceCheck();
        update();
      });
      host.querySelector('#in-dur').addEventListener('input', e => {
        fc.duration = parseFloat(e.target.value) || 0;
        const burnVol = fc.duration * ac.burn_rate;
        const burnWt = burnVol * u(ac).fuel_density;
        document.getElementById('in-dur-help').innerHTML = `Burn: ${fmt(burnVol, 1)} ${u(ac).vol} × ${fmt(u(ac).fuel_density, 2)} = <strong>${fmt(burnWt, 1)} ${u(ac).w}</strong>`;
        refreshEnduranceCheck();
        update();
      });
      refreshEnduranceCheck();
    } else if (mode === 'reverse'){
      titleEl.textContent = 'Maximum fuel';
      const r = calcReverse(ac);
      const limitedBy = r.bestFuel >= r.maxFuelByMtow - 0.05 ? 'MTOW' :
                       (r.bestFuel >= r.maxFuelByTank - 0.05 ? 'tank capacity' : 'CG envelope');
      const unusable = ac.fuel_unusable || 0;
      const dipstick = r.bestFuel + unusable;
      host.innerHTML = `
        <p style="margin:0 0 8px;color:var(--muted);font-size:13px">
          Given your station weights, the maximum <strong>usable</strong> fuel you can carry is:
        </p>
        <div class="endurance-note">
          <div>Max usable: <span class="big">${fmt(r.bestFuel, 1)} ${u(ac).vol}</span> &nbsp; (${fmt(r.bestFuel * r.fuelDens, 0)} ${u(ac).w})</div>
          ${unusable > 0 ? `<div style="margin-top:4px;font-size:13px">Dipstick level: <strong>${fmt(dipstick, 1)} ${u(ac).vol}</strong> &nbsp;<span style="color:var(--muted);font-size:11px">(includes ${fmt(unusable, 1)} ${u(ac).vol} unusable)</span></div>` : ''}
          <div style="margin-top:6px">Endurance to dry: <span class="big">${fmt(r.bestEndurance, 1)} h</span></div>
          <div>Endurance after ${ac.reserve_minutes}-min reserve: <span class="big">${fmt(r.usableEndurance, 1)} h</span></div>
          <small class="help" style="margin-top:6px">Limited by: ${limitedBy}. Unusable fuel is already in the empty weight from the weighing report.</small>
        </div>
      `;
      // also set the forward inputs so the chart shows the max-fuel case
      fc.fuel = Math.round(r.bestFuel * 10) / 10;
      fc.duration = Math.round(r.usableEndurance * 100) / 100;
    } else if (mode === 'multileg'){
      titleEl.textContent = 'Legs';
      const legs = legsInput[ac.id] = legsInput[ac.id] || [{ name: 'Leg 1', duration: 1.0, uplift_before: 0 }];
      host.innerHTML = `
        <div class="row">
          <div>
            <label>Starting fuel (${u(ac).vol})</label>
            <input type="number" inputmode="decimal" id="in-fuel-ml" value="${fc.fuel}" min="0" max="${ac.usable_fuel}" step="0.5">
            <small class="help">tank ${fmt(ac.usable_fuel,1)} ${u(ac).vol} · burn ${fmt(ac.burn_rate,1)} ${u(ac).flow} · reserve ${ac.reserve_minutes} min</small>
          </div>
        </div>
        <div id="legs-list" style="margin-top:10px"></div>
        <button class="btn secondary" onclick="App.addLeg()" style="margin-top:4px">+ Add leg</button>
      `;
      host.querySelector('#in-fuel-ml').addEventListener('input', e => { fc.fuel = parseFloat(e.target.value) || 0; update(); });
      renderLegs(ac);
    }
  }

  function renderLegs(ac){
    const legs = legsInput[ac.id] || [];
    const ml = calcMultileg(ac);
    const host = document.getElementById('legs-list');
    if (!host) return;
    host.innerHTML = legs.map((leg, i) => {
      const r = ml.legResults[i] || {};
      const startBad = !r.startOK_W || !r.startOK_CG;
      const endBad = !r.endOK_W || !r.endOK_CG || r.ranOutOfFuel;
      const upliftRow = i === 0 ? '' : `
        <div style="flex:1">
          <label>Uplift before leg (${u(ac).vol})</label>
          <input type="number" inputmode="decimal" step="0.5" min="0" max="${ac.usable_fuel}" value="${leg.uplift_before||0}" data-li="${i}" data-f="uplift_before">
        </div>`;
      return `
        <div class="leg">
          <div class="leg-head">
            <span class="num">${i+1}</span>
            <input type="text" class="name" value="${leg.name||('Leg '+(i+1))}" data-li="${i}" data-f="name" style="border:0;background:transparent;color:var(--text);font-size:14px;font-weight:600;padding:4px 0">
            ${legs.length > 1 ? `<button class="icon-btn" onclick="App.removeLeg(${i})" aria-label="Remove leg" style="width:28px;height:28px;font-size:14px">✕</button>` : ''}
          </div>
          <div class="row" style="margin-bottom:4px">
            <div style="flex:1">
              <label>Duration (h)</label>
              <input type="number" inputmode="decimal" step="0.25" min="0" max="10" value="${leg.duration}" data-li="${i}" data-f="duration">
            </div>
            ${upliftRow}
          </div>
          <div class="leg-summary">
            Start: <span class="${startBad?'bad':'ok'}">${fmt(r.startW||0)} ${u(ac).w} · CG ${fmtArm(r.startCG||0, ac)}</span>
            &nbsp;→&nbsp;
            End: <span class="${endBad?'bad':'ok'}">${fmt(r.endW||0)} ${u(ac).w} · CG ${fmtArm(r.endCG||0, ac)}</span>
            <br>Fuel: ${fmt(r.startFuel||0,1)} → ${fmt(r.endFuel||0,1)} ${u(ac).vol} (burn ${fmt(r.burnFuel||0,1)})
          </div>
        </div>
      `;
    }).join('');
    host.querySelectorAll('input').forEach(inp => {
      inp.oninput = e => {
        const i = +e.target.dataset.li;
        const f = e.target.dataset.f;
        legs[i][f] = (f === 'name') ? e.target.value : (parseFloat(e.target.value) || 0);
        update();
      };
    });
  }

  function addLeg(){
    const ac = fleet.find(a => a.id === selectedId);
    const legs = legsInput[ac.id] = legsInput[ac.id] || [];
    legs.push({ name: `Leg ${legs.length+1}`, duration: 1.0, uplift_before: 0 });
    renderFuelControls();
    update();
  }
  function removeLeg(i){
    const ac = fleet.find(a => a.id === selectedId);
    const legs = legsInput[ac.id] || [];
    legs.splice(i, 1);
    if (legs.length === 0) legs.push({ name: 'Leg 1', duration: 1.0, uplift_before: 0 });
    renderFuelControls();
    update();
  }

  function renderResults(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac) return;

    if (mode === 'multileg'){
      renderMultilegResults(ac);
      return;
    }

    const r = calc(ac);
    const towOK = r.tow <= ac.mtow;
    const ldwOK = !ac.mlw || r.ldw <= ac.mlw;
    const cgToOK = inEnvelope(ac.envelope, r.tow, r.cg_to);
    const cgLdOK = r.ldw > 0 && inEnvelope(ac.envelope, r.ldw, r.cg_ld);

    const stat = (label, val, sub, ok) => `
      <div class="stat ${ok ? 'ok' : 'bad'}">
        <div class="l">${label}</div>
        <div class="v">${val}</div>
        <div class="s">${sub}</div>
      </div>`;

    document.getElementById('results').innerHTML =
      stat('Takeoff weight', `${fmt(r.tow)} ${u(ac).w}`, towOK ? `MTOW ${fmt(ac.mtow)}` : `over by ${fmt(r.tow - ac.mtow)}`, towOK) +
      stat('Landing weight', `${fmt(r.ldw)} ${u(ac).w}`, ldwOK ? (ac.mlw ? `MLW ${fmt(ac.mlw)}` : 'no MLW set') : `over by ${fmt(r.ldw - ac.mlw)}`, ldwOK) +
      stat('CG at takeoff', `${fmtArm(r.cg_to, ac)} ${u(ac).arm}`, cgToOK ? 'in envelope' : 'OUT of envelope', cgToOK) +
      stat('CG at landing', `${fmtArm(r.cg_ld, ac)} ${u(ac).arm}`, cgLdOK ? 'in envelope' : 'OUT of envelope', cgLdOK);

    // Banner
    const bh = document.getElementById('banner-host');
    if (r.violations.length === 0){
      bh.innerHTML = `<div class="banner ok">✓ Within all limits for takeoff and landing.</div>`;
    } else {
      bh.innerHTML = `<div class="banner bad">⚠ ${r.violations.length} issue${r.violations.length>1?'s':''}:<br>${r.violations.map(v=>'• '+v).join('<br>')}</div>`;
    }

    // Breakdown
    const rows = r.items.map(i => `<tr><td>${i.name}</td><td>${fmt(i.w, 1)}</td><td>${fmtArm(i.arm, ac)}</td><td>${fmt(i.w * i.arm, 1)}</td></tr>`).join('');
    document.getElementById('breakdown').innerHTML = `
      <table>
        <thead><tr><td><strong>Item</strong></td><td><strong>${u(ac).w}</strong></td><td><strong>${u(ac).arm}</strong></td><td><strong>moment</strong></td></tr></thead>
        <tbody>${rows}
          <tr><td><strong>Takeoff total</strong></td><td><strong>${fmt(r.tow,1)}</strong></td><td><strong>${fmtArm(r.cg_to, ac)}</strong></td><td><strong>${fmt(r.m_to,1)}</strong></td></tr>
          <tr><td>Fuel burned (${fmt(r.fuelBurned,1)} ${u(ac).vol})</td><td>-${fmt(r.burnedWeight,1)}</td><td>${fmtArm(ac.fuel_arm, ac)}</td><td>-${fmt(r.burnedWeight*ac.fuel_arm,1)}</td></tr>
          <tr><td><strong>Landing total</strong></td><td><strong>${fmt(r.ldw,1)}</strong></td><td><strong>${fmtArm(r.cg_ld, ac)}</strong></td><td><strong>${fmt(r.m_to - r.burnedWeight*ac.fuel_arm, 1)}</strong></td></tr>
        </tbody>
      </table>
    `;

    document.getElementById('chart-caption').textContent = 'green = takeoff · amber = landing · dashed line = fuel burn track';
    renderChart(r);
  }

  function renderMultilegResults(ac){
    const ml = calcMultileg(ac);
    const allW = ml.legResults.flatMap(l => [l.startW, l.endW]);
    const allCG = ml.legResults.flatMap(l => [l.startCG, l.endCG]);
    const maxW = allW.length ? Math.max(...allW) : 0;
    const minW = allW.length ? Math.min(...allW) : 0;
    const fwdCG = allCG.length ? Math.min(...allCG) : 0;
    const aftCG = allCG.length ? Math.max(...allCG) : 0;

    const overMtow = maxW > ac.mtow;
    const allCGok = ml.legResults.every(l => l.startOK_CG && l.endOK_CG);

    const stat = (label, val, sub, ok) => `
      <div class="stat ${ok ? 'ok' : 'bad'}">
        <div class="l">${label}</div>
        <div class="v">${val}</div>
        <div class="s">${sub}</div>
      </div>`;

    document.getElementById('results').innerHTML =
      stat('Max weight on trip', `${fmt(maxW)} ${u(ac).w}`, overMtow ? `over MTOW ${fmt(ac.mtow)}` : `MTOW ${fmt(ac.mtow)}`, !overMtow) +
      stat('Min weight on trip', `${fmt(minW)} ${u(ac).w}`, '', true) +
      stat('Forward-most CG', `${fmtArm(fwdCG, ac)} ${u(ac).arm}`, allCGok ? 'all in envelope' : 'some out of envelope', allCGok) +
      stat('Aft-most CG', `${fmtArm(aftCG, ac)} ${u(ac).arm}`, allCGok ? 'all in envelope' : 'some out of envelope', allCGok);

    const bh = document.getElementById('banner-host');
    if (ml.violations.length === 0){
      const totalH = ml.legResults.reduce((s,l) => s+l.duration, 0);
      bh.innerHTML = `<div class="banner ok">✓ All ${ml.legResults.length} leg${ml.legResults.length>1?'s':''} within limits. Total flight: ${fmt(totalH,2)} h. Final fuel: ${fmt(ml.finalFuel,1)} ${u(ac).vol} (reserve req: ${fmt(ml.reserveFuel,1)}).</div>`;
    } else {
      bh.innerHTML = `<div class="banner bad">⚠ ${ml.violations.length} issue${ml.violations.length>1?'s':''}:<br>${ml.violations.map(v=>'• '+v).join('<br>')}</div>`;
    }

    // Breakdown table = leg-by-leg
    let rows = '';
    ml.legResults.forEach((l, i) => {
      if (i > 0 && l.uplift_before > 0){
        rows += `<tr><td><em>Uplift</em></td><td>+${fmt(l.uplift_before * u(ac).fuel_density, 1)}</td><td>${fmtArm(ac.fuel_arm, ac)}</td><td>—</td></tr>`;
      }
      rows += `<tr><td><strong>${l.name} start</strong></td><td><strong>${fmt(l.startW,1)}</strong></td><td><strong>${fmtArm(l.startCG, ac)}</strong></td><td>${fmt(l.startFuel,1)} ${u(ac).vol}</td></tr>`;
      rows += `<tr><td>Burn ${fmt(l.duration,2)}h</td><td>-${fmt(l.burnFuel * u(ac).fuel_density,1)}</td><td>${fmtArm(ac.fuel_arm, ac)}</td><td>−${fmt(l.burnFuel,1)} ${u(ac).vol}</td></tr>`;
      rows += `<tr><td>${l.name} end</td><td>${fmt(l.endW,1)}</td><td>${fmtArm(l.endCG, ac)}</td><td>${fmt(l.endFuel,1)} ${u(ac).vol}</td></tr>`;
    });
    document.getElementById('breakdown').innerHTML = `
      <table>
        <thead><tr><td><strong>Item</strong></td><td><strong>${u(ac).w}</strong></td><td><strong>${u(ac).arm}</strong></td><td><strong>fuel / note</strong></td></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    document.getElementById('chart-caption').textContent = 'green = leg start · amber = leg end · numbers next to points = leg index';
    renderMultilegChart(ml, ac);
  }

  function renderMultilegChart(ml, ac){
    if (typeof Chart === 'undefined'){ showChartFallback(); return; }
    const env = [...ac.envelope].sort((a,b) => a.w - b.w);
    const fwdPts = [], aftPts = [];
    env.forEach(p => { fwdPts.push({x: p.fwd, y: p.w}); aftPts.push({x: p.aft, y: p.w}); });
    const poly = fwdPts.concat(aftPts.slice().reverse()).concat([fwdPts[0]]);

    const allArms = env.flatMap(p => [p.fwd, p.aft]).concat(ml.legResults.flatMap(l => [l.startCG, l.endCG]));
    const allWeights = env.flatMap(p => [p.w]).concat(ml.legResults.flatMap(l => [l.startW, l.endW]));
    const armSpan = Math.max(...allArms) - Math.min(...allArms);
    const armPad = Math.max(armSpan * 0.15, ac.units === 'metric' ? 50 : 1);
    const minA = Math.min(...allArms) - armPad;
    const maxA = Math.max(...allArms) + armPad;
    const minW = Math.min(...allWeights) * 0.92;
    const maxW = Math.max(...allWeights) * 1.05;

    // Build a trajectory: start1, end1, [uplift jump], start2, end2, ...
    const traj = [];
    const startPts = [];
    const endPts = [];
    ml.legResults.forEach((l, i) => {
      startPts.push({ x: l.startCG, y: l.startW, label: `${i+1}↑` });
      endPts.push({ x: l.endCG, y: l.endW, label: `${i+1}↓` });
      traj.push({ x: l.startCG, y: l.startW });
      traj.push({ x: l.endCG, y: l.endW });
    });

    const datasets = [
      { label: 'envelope', data: poly, showLine: true, fill: true, backgroundColor: 'rgba(52,211,153,.12)', borderColor: '#34d399', borderWidth: 1.5, pointRadius: 0, tension: 0, order: 5 },
      { label: 'trajectory', data: traj, showLine: true, fill: false, borderColor: 'rgba(255,255,255,.35)', borderWidth: 1, borderDash: [4,4], pointRadius: 0, order: 4 },
      { label: 'Leg start', data: startPts, backgroundColor: '#34d399', borderColor: '#0a3d2c', borderWidth: 2, pointRadius: 7, pointHoverRadius: 8, order: 1 },
      { label: 'Leg end',   data: endPts,   backgroundColor: '#fbbf24', borderColor: '#3a2a0a', borderWidth: 2, pointRadius: 7, pointHoverRadius: 8, order: 2 }
    ];

    if (chart) chart.destroy();
    const ctx = document.getElementById('env-chart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { labels: { color: '#8a99b3', font: {size: 11}, filter: it => !['envelope','trajectory'].includes(it.text) } },
          tooltip: {
            callbacks: {
              label: c => {
                const lbl = c.raw.label || c.dataset.label;
                return `${lbl}: ${fmtArm(c.parsed.x, ac)} ${u(ac).arm}, ${fmt(c.parsed.y)} ${u(ac).w}`;
              }
            }
          }
        },
        scales: {
          x: { type: 'linear', min: minA, max: maxA, title: { display: true, text: `CG arm (${u(ac).arm})`, color: '#8a99b3', font: {size: 11} }, ticks: { color: '#8a99b3', font: {size: 10} }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { min: minW, max: maxW, title: { display: true, text: `Weight (${u(ac).w})`, color: '#8a99b3', font: {size: 11} }, ticks: { color: '#8a99b3', font: {size: 10} }, grid: { color: 'rgba(255,255,255,.05)' } }
        }
      }
    });
  }

  function showChartFallback(){
    const canvas = document.getElementById('env-chart');
    if (!canvas) return;
    const parent = canvas.parentElement;
    parent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:13px;text-align:center;padding:20px;border:1px dashed var(--line);border-radius:10px">Chart library could not load.<br>Calculations are still accurate above.<br>Connect to the internet once to cache it for offline use.</div>';
  }

  function renderChart(r){
    if (typeof Chart === 'undefined'){ showChartFallback(); return; }
    const ac = r.ac;
    const env = [...ac.envelope].sort((a,b) => a.w - b.w);
    const minW = env[0].w * 0.92;
    const maxW = env[env.length-1].w * 1.05;
    const fwdPts = [], aftPts = [];
    env.forEach(p => { fwdPts.push({x: p.fwd, y: p.w}); aftPts.push({x: p.aft, y: p.w}); });
    // polygon: fwd points bottom→top, then aft points top→bottom
    const poly = fwdPts.concat(aftPts.slice().reverse()).concat([fwdPts[0]]);

    const allArms = env.flatMap(p => [p.fwd, p.aft]).concat([r.cg_to, r.cg_ld]);
    const armSpan = Math.max(...allArms) - Math.min(...allArms);
    const armPad = Math.max(armSpan * 0.15, ac.units === 'metric' ? 50 : 1);
    const minA = Math.min(...allArms) - armPad;
    const maxA = Math.max(...allArms) + armPad;

    const data = {
      datasets: [
        { label: 'envelope', data: poly, showLine: true, fill: true, backgroundColor: 'rgba(52,211,153,.12)', borderColor: '#34d399', borderWidth: 1.5, pointRadius: 0, tension: 0, order: 3 },
        { label: 'Takeoff', data: [{x: r.cg_to, y: r.tow}], backgroundColor: '#34d399', borderColor: '#0a3d2c', borderWidth: 2, pointRadius: 8, pointHoverRadius: 9, order: 1 },
        { label: 'Landing', data: [{x: r.cg_ld, y: r.ldw}], backgroundColor: '#fbbf24', borderColor: '#3a2a0a', borderWidth: 2, pointRadius: 8, pointHoverRadius: 9, order: 2 },
        { label: 'fuel-burn-line', data: [{x: r.cg_to, y: r.tow}, {x: r.cg_ld, y: r.ldw}], showLine: true, fill: false, borderColor: 'rgba(255,255,255,.3)', borderWidth: 1, borderDash: [4,4], pointRadius: 0, order: 4 }
      ]
    };

    if (chart) chart.destroy();
    const ctx = document.getElementById('env-chart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'scatter',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { labels: { color: '#8a99b3', font: {size: 11}, filter: (item) => !item.text.includes('-line') && !item.text.includes('envelope') } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtArm(ctx.parsed.x, ac)} ${u(ac).arm}, ${fmt(ctx.parsed.y)} ${u(ac).w}` } }
        },
        scales: {
          x: { type: 'linear', min: minA, max: maxA, title: { display: true, text: `CG arm (${u(ac).arm})`, color: '#8a99b3', font: {size: 11} }, ticks: { color: '#8a99b3', font: {size: 10} }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { min: minW, max: maxW, title: { display: true, text: `Weight (${u(ac).w})`, color: '#8a99b3', font: {size: 11} }, ticks: { color: '#8a99b3', font: {size: 10} }, grid: { color: 'rgba(255,255,255,.05)' } }
        }
      }
    });
  }

  // ---- scenarios ----
  function renderScenarioSelect(){
    const ac = fleet.find(a => a.id === selectedId);
    const sel = document.getElementById('scenario-select');
    if (!sel) return;
    if (!ac){ sel.innerHTML = '<option value="">— no aircraft —</option>'; return; }
    const list = ac.scenarios || [];
    sel.innerHTML = '<option value="">— load scenario —</option>' +
      list.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
  }

  function saveScenario(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac) return;
    const name = prompt('Name this scenario (e.g. "Solo + full fuel"):');
    if (!name) return;
    const sv = stationValues[ac.id] || {};
    const fc = fuelInput[ac.id] || {};
    const legs = legsInput[ac.id] || [];
    const sc = {
      name: name.trim(),
      mode,
      stations: ac.stations.map((s, i) => sv[i] !== undefined ? sv[i] : (s.default || 0)),
      fuel: fc.fuel !== undefined ? fc.fuel : ac.usable_fuel,
      duration: fc.duration !== undefined ? fc.duration : 1.0,
      legs: legs.map(l => ({ name: l.name, duration: l.duration, uplift_before: l.uplift_before || 0 }))
    };
    ac.scenarios = ac.scenarios || [];
    // overwrite if same name
    const existing = ac.scenarios.findIndex(s => s.name === sc.name);
    if (existing >= 0){
      if (!confirm(`Replace existing scenario "${sc.name}"?`)) return;
      ac.scenarios[existing] = sc;
    } else {
      ac.scenarios.push(sc);
    }
    save();
    renderScenarioSelect();
    document.getElementById('scenario-select').value = ac.scenarios.findIndex(s => s.name === sc.name);
  }

  function loadScenario(idxStr){
    if (idxStr === '') return;
    const idx = +idxStr;
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac || !ac.scenarios || !ac.scenarios[idx]) return;
    const sc = ac.scenarios[idx];
    stationValues[ac.id] = {};
    sc.stations.forEach((w, i) => { stationValues[ac.id][i] = w; });
    fuelInput[ac.id] = { fuel: sc.fuel, duration: sc.duration };
    legsInput[ac.id] = (sc.legs && sc.legs.length) ? sc.legs.map(l => ({...l})) : [{ name: 'Leg 1', duration: 1.0, uplift_before: 0 }];
    if (sc.mode && sc.mode !== mode){ setMode(sc.mode); }
    else { renderAll(); }
  }

  function deleteScenario(){
    const ac = fleet.find(a => a.id === selectedId);
    const sel = document.getElementById('scenario-select');
    const idxStr = sel ? sel.value : '';
    if (idxStr === '' || !ac || !ac.scenarios) return;
    const sc = ac.scenarios[+idxStr];
    if (!sc) return;
    if (!confirm(`Delete scenario "${sc.name}"?`)) return;
    ac.scenarios.splice(+idxStr, 1);
    save();
    renderScenarioSelect();
  }

  // ---- printing ----
  function buildPerfPrint(ac){
    const rTo = perfInput.to_runway;
    const rLd = perfInput.ld_runway;
    const c = perfInput.conditions;
    const P = window.Performance;
    const pdata = ac.pchart_id && window.PCHART_DATA && window.PCHART_DATA[ac.pchart_id];
    const adata = ac.afm_id && window.AFM_DATA && window.AFM_DATA[ac.afm_id];
    const activeMethod = perfInput.perf_method && ((perfInput.perf_method === 'pchart' && pdata) || (perfInput.perf_method === 'afm' && adata)) ? perfInput.perf_method : (pdata ? 'pchart' : (adata ? 'afm' : 'none'));

    const winds = ['to','ld'].map(side => {
      const w = side === 'ld' ? perfInput.ld_wind : perfInput.to_wind;
      const rwy = side === 'ld' ? rLd : rTo;
      if (w.mode === 'dirspeed'){
        const wc = P.windComponents(rwy.heading, w.dir, w.speed);
        return { side, headwind: wc.headwind, crosswind: wc.crosswind, dir: w.dir, speed: w.speed, mode: 'dirspeed' };
      }
      return { side, headwind: w.headwind_component, crosswind: 0, mode: 'component' };
    });
    const toW = winds[0], ldW = winds[1];

    const paTo = P.pressureAltitude(rTo.elev || 0, c.qnh);
    const paLd = P.pressureAltitude(rLd.elev || 0, c.qnh);
    const isaTo = P.isaTemp(paTo);
    const oat = c.oat === null ? isaTo : c.oat;
    const daTo = P.densityAltitude(paTo, oat);
    const daLd = P.densityAltitude(paLd, oat);
    const toWet = (perfInput.to_condition === 'wet' || perfInput.to_condition === 'long_grass');
    const ldWet = (perfInput.ld_condition === 'wet' || perfInput.ld_condition === 'long_grass');
    const opKeyTo = deriveOperationKey(perfInput.op_type, perfInput.op_time, rTo.surface);
    const opKeyLd = deriveOperationKey(perfInput.op_type, perfInput.op_time, rLd.surface);

    let to_result = null, ld_result = null, methodLabel = '';
    if (activeMethod === 'pchart'){
      methodLabel = `P-chart (${pdata.source})`;
      to_result = P.pchartTakeoffDistance(pdata, paTo, oat, opKeyTo, rTo.slope, toW.headwind, toWet);
      ld_result = P.pchartLandingDistance(pdata, rLd.elev, opKeyLd, rLd.slope, ldW.headwind, ldWet);
    } else if (activeMethod === 'afm'){
      methodLabel = `Flight Manual + AC91-3 factors (${adata.source})`;
      const afmTo = { to_base_msl_isa_m: adata.takeoff.base_msl_isa_m, to_pa_correction_pct_per_1000: adata.takeoff.pa_correction_pct_per_1000, to_temp_correction_pct_per_10c: adata.takeoff.temp_correction_pct_per_10c, to_weight_correction_pct_per_100kg: adata.takeoff.weight_correction_pct_per_100kg || 0, mtow_kg: ac.mtow };
      const afmLd = { ld_base_msl_isa_m: adata.landing.base_msl_isa_m, ld_pa_correction_pct_per_1000: adata.landing.pa_correction_pct_per_1000, ld_temp_correction_pct_per_10c: adata.landing.temp_correction_pct_per_10c, ld_weight_correction_pct_per_100kg: adata.landing.weight_correction_pct_per_100kg || 0, mtow_kg: ac.mtow };
      to_result = P.afmFactorsTakeoff(afmTo, paTo, oat, rTo.surface, rTo.slope, toW.headwind, toWet);
      ld_result = P.afmFactorsLanding(afmLd, paLd, oat, rLd.surface, rLd.slope, ldW.headwind, ldWet);
      if (to_result){ to_result.d_ppd = to_result.distance / (to_result.surf_factor * to_result.slope_factor * to_result.wind_factor * to_result.wet_factor); to_result.op_mult = to_result.surf_factor; }
      if (ld_result){ ld_result.d_ppd = ld_result.distance / (ld_result.surf_factor * ld_result.slope_factor * ld_result.wind_factor * ld_result.wet_factor); ld_result.op_mult = ld_result.surf_factor; }
    }
    const to_d = to_result && to_result.distance;
    const ld_d = ld_result && ld_result.distance;

    const surfLbl = sf => ({paved:'Paved', grass:'Grass', metal:'Metal', rolled_earth:'Rolled earth', coral:'Coral'})[sf] || sf;
    const condLbl = cd => ({dry:'Dry', wet:'Wet', long_grass:'Long grass'})[cd] || cd;
    const lineLabels = {private_paved_day:'Private \u2014 Paved \u2014 Day', air_transport_paved_day:'Air Transport \u2014 Paved \u2014 Day', private_grass_day:'Private \u2014 Grass \u2014 Day', air_transport_grass_day:'Air Transport \u2014 Grass \u2014 Day', all_ops_paved_night:'All Ops \u2014 Paved \u2014 Night', all_ops_grass_night:'All Ops \u2014 Grass \u2014 Night'};
    const fmt0 = v => v == null ? '?' : v.toFixed(0);
    const fmt1 = v => v == null ? '?' : v.toFixed(1);
    const fmt2 = v => v.toFixed(3);

    document.getElementById('print-perf-title').textContent = 'Performance sheet';
    document.getElementById('print-perf-acline').textContent = `${ac.reg} \u2014 ${ac.type}`;
    document.getElementById('print-perf-when').textContent = new Date().toLocaleString();

    const xwLimit = (ac.crosswind_demonstrated_kt && ac.crosswind_club_kt) ? Math.min(ac.crosswind_demonstrated_kt, ac.crosswind_club_kt) : (ac.crosswind_demonstrated_kt || ac.crosswind_club_kt || null);
    const violations = [];
    if (to_d != null && rTo.tora > 0 && to_d > rTo.tora) violations.push(`T/O ${to_d.toFixed(0)} m exceeds TORA ${rTo.tora} m`);
    if (ld_d != null && rLd.lda > 0 && ld_d > rLd.lda) violations.push(`Landing ${ld_d.toFixed(0)} m exceeds LDA ${rLd.lda} m`);
    if (xwLimit && toW.crosswind > xwLimit) violations.push(`T/O crosswind ${toW.crosswind.toFixed(1)} kt exceeds limit ${xwLimit} kt`);
    if (xwLimit && ldW.crosswind > xwLimit) violations.push(`Landing crosswind ${ldW.crosswind.toFixed(1)} kt exceeds limit ${xwLimit} kt`);
    if (toW.headwind < 0) violations.push(`T/O tailwind ${(-toW.headwind).toFixed(1)} kt`);
    if (ldW.headwind < 0) violations.push(`Landing tailwind ${(-ldW.headwind).toFixed(1)} kt`);
    if (ac.group != null && rTo.group != null && ac.group > rTo.group) violations.push(`T/O: Aircraft Group ${ac.group} exceeds runway Group ${rTo.group}`);
    if (ac.group != null && rLd.group != null && ac.group > rLd.group) violations.push(`Landing: Aircraft Group ${ac.group} exceeds runway Group ${rLd.group}`);

    const pb = document.getElementById('print-perf-banner');
    if (violations.length === 0){
      pb.style.background = '#e8f5ec'; pb.style.color = '#060'; pb.style.borderColor = '#060';
      pb.textContent = '✓ Within all performance limits.';
    } else {
      pb.style.background = '#fde8e8'; pb.style.color = '#a00'; pb.style.borderColor = '#a00';
      pb.innerHTML = '<strong>⚠ Issues:</strong> ' + violations.join(' \u00b7 ');
    }

    const toMargin = (to_d != null && rTo.tora > 0) ? ((1 - to_d/rTo.tora)*100).toFixed(0)+'%' : '\u2014';
    const ldMargin = (ld_d != null && rLd.lda > 0) ? ((1 - ld_d/rLd.lda)*100).toFixed(0)+'%' : '\u2014';

    const rwyBox = (label, r, cond, w) => `
      <div style="border:1px solid #999;padding:8px;border-radius:4px">
        <div style="font-weight:600;font-size:10pt;margin-bottom:4px">${label} <span style="font-weight:400;color:#a00;font-size:8pt">⚠ Verify against current AIP</span></div>
        <div style="font-size:9pt;line-height:1.5">
          <strong>${r.ident || '(no ident)'}</strong> \u00b7 Hdg ${r.heading}°M<br>
          Elev ${r.elev}\u2032 \u00b7 Slope ${r.slope}%<br>
          TORA ${r.tora} m \u00b7 LDA ${r.lda} m<br>
          ${surfLbl(r.surface)} \u00b7 ${condLbl(cond)}${r.group != null ? ' \u00b7 Group ' + r.group : ''}<br>
          ${w.mode === 'dirspeed' && w.speed > 0
            ? `Wind ${w.dir}°M / ${w.speed} kt \u00b7 HW ${fmt1(w.headwind)} \u00b7 XW ${fmt1(w.crosswind)} kt`
            : `HW component ${fmt1(w.headwind)} kt`}
        </div>
      </div>`;

    const breakdownTable = (label, runway, w, wet, result) => {
      if (!result) return '';
      const o = result.op_mult, sl = result.slope_factor, wf = result.wind_factor, wt = result.wet_factor;
      return `
        <table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:9pt">
          <tr style="background:#eee"><td colspan="3" style="border:1px solid #999;padding:4px"><strong>${label}${runway.ident ? ' \u2014 ' + runway.ident : ''} breakdown</strong></td></tr>
          <tr><td style="border:1px solid #999;padding:4px">PPD reference</td><td colspan="2" style="border:1px solid #999;padding:4px;text-align:right">${result.d_ppd.toFixed(0)} m</td></tr>
          <tr><td style="border:1px solid #999;padding:4px">× Operation</td><td style="border:1px solid #999;padding:4px;text-align:right">${fmt2(o)}</td><td style="border:1px solid #999;padding:4px;text-align:right">${(result.d_ppd*o).toFixed(0)} m</td></tr>
          <tr><td style="border:1px solid #999;padding:4px">× Slope (${runway.slope}%)</td><td style="border:1px solid #999;padding:4px;text-align:right">${fmt2(sl)}</td><td style="border:1px solid #999;padding:4px;text-align:right">${(result.d_ppd*o*sl).toFixed(0)} m</td></tr>
          <tr><td style="border:1px solid #999;padding:4px">× Wind (${w.headwind.toFixed(1)} kt)</td><td style="border:1px solid #999;padding:4px;text-align:right">${fmt2(wf)}</td><td style="border:1px solid #999;padding:4px;text-align:right">${(result.d_ppd*o*sl*wf).toFixed(0)} m</td></tr>
          ${wet ? `<tr><td style="border:1px solid #999;padding:4px">× Wet</td><td style="border:1px solid #999;padding:4px;text-align:right">${fmt2(wt)}</td><td style="border:1px solid #999;padding:4px;text-align:right">${result.distance.toFixed(0)} m</td></tr>` : ''}
        </table>`;
    };

    document.getElementById('print-perf-body').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">
        ${rwyBox('Takeoff runway', rTo, perfInput.to_condition, toW)}
        ${rwyBox('Landing runway', rLd, perfInput.ld_condition, ldW)}
      </div>
      <div style="border:1px solid #999;padding:8px;border-radius:4px;margin-bottom:8px;font-size:9pt">
        <strong>Atmospheric:</strong> OAT ${fmt0(oat)}°C \u00b7 QNH ${c.qnh} hPa \u00b7
        T/O: PA ${fmt0(paTo)}\u2032 \u00b7 DA ${fmt0(daTo)}\u2032 \u00b7
        Landing: PA ${fmt0(paLd)}\u2032 \u00b7 DA ${fmt0(daLd)}\u2032
      </div>
      <div style="border:1px solid #999;padding:8px;border-radius:4px;margin-bottom:8px;font-size:9pt">
        <strong>Method:</strong> ${methodLabel || 'none'}${activeMethod === 'pchart' ? ' \u2014 CASO 4 baked into chart' : (activeMethod === 'afm' ? ' \u2014 CASO 4 (AC91-3) factors applied' : '')}
        ${activeMethod === 'pchart' ? '<br><strong>T/O chart line:</strong> ' + lineLabels[opKeyTo] + '<br><strong>Landing chart line:</strong> ' + lineLabels[opKeyLd] : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:9pt">
        <thead><tr style="background:#eee">
          <td style="border:1px solid #999;padding:6px;font-weight:600">Performance</td>
          <td style="border:1px solid #999;padding:6px;font-weight:600;text-align:right">Required</td>
          <td style="border:1px solid #999;padding:6px;font-weight:600;text-align:right">Available</td>
          <td style="border:1px solid #999;padding:6px;font-weight:600;text-align:right">Margin</td>
          <td style="border:1px solid #999;padding:6px;font-weight:600;text-align:center">GO/NO-GO</td>
        </tr></thead>
        <tbody>
          <tr>
            <td style="border:1px solid #999;padding:6px">T/O distance to 50\u2032${rTo.ident ? ' (' + rTo.ident + ')' : ''}</td>
            <td style="border:1px solid #999;padding:6px;text-align:right">${fmt0(to_d)} m</td>
            <td style="border:1px solid #999;padding:6px;text-align:right">${rTo.tora || '\u2014'} m</td>
            <td style="border:1px solid #999;padding:6px;text-align:right">${toMargin}</td>
            <td style="border:1px solid #999;padding:6px;text-align:center">${to_d != null && rTo.tora > 0 ? (to_d <= rTo.tora ? '<span style="color:#060">✓ GO</span>' : '<span style="color:#a00">✗ NO-GO</span>') : '\u2014'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:6px">Landing distance from 50\u2032${rLd.ident ? ' (' + rLd.ident + ')' : ''}</td>
            <td style="border:1px solid #999;padding:6px;text-align:right">${fmt0(ld_d)} m</td>
            <td style="border:1px solid #999;padding:6px;text-align:right">${rLd.lda || '\u2014'} m</td>
            <td style="border:1px solid #999;padding:6px;text-align:right">${ldMargin}</td>
            <td style="border:1px solid #999;padding:6px;text-align:center">${ld_d != null && rLd.lda > 0 ? (ld_d <= rLd.lda ? '<span style="color:#060">✓ GO</span>' : '<span style="color:#a00">✗ NO-GO</span>') : '\u2014'}</td>
          </tr>
        </tbody>
      </table>
      ${breakdownTable('Takeoff', rTo, toW, toWet, to_result)}
      ${breakdownTable('Landing', rLd, ldW, ldWet, ld_result)}
    `;
  }

  function printSheet(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac){ alert('Select an aircraft first.'); return; }
    document.getElementById('print-title').textContent = 'Weight & Balance sheet';
    document.getElementById('print-acline').textContent = `${ac.reg} — ${ac.type}`;
    document.getElementById('print-when').textContent = new Date().toLocaleString();

    // --- Always build the W&B section ---
    const sv = stationValues[ac.id] || {};
    const fc = fuelInput[ac.id] || {};
    const stationStr = ac.stations.map((s, i) => {
      const w = sv[i] !== undefined ? sv[i] : (s.default || 0);
      return `${s.name}: ${fmt(w)} ${u(ac).w}`;
    }).join(' · ');
    let loadingHtml = `<strong>Loading:</strong> ${stationStr}`;
    const fuel = fc.fuel !== undefined ? fc.fuel : ac.usable_fuel;
    const dur = fc.duration !== undefined ? fc.duration : 1.0;
    loadingHtml += `<br><strong>Fuel:</strong> ${fmt(fuel,1)} ${u(ac).vol} · <strong>Flight time:</strong> ${fmt(dur,2)} h`;
    if (ac.burn_rate > 0){
      const endurance = fuel / ac.burn_rate;
      const reserveFuel = (ac.reserve_minutes / 60) * ac.burn_rate;
      const usableEnd = Math.max(0, (fuel - reserveFuel) / ac.burn_rate);
      const unusable = ac.fuel_unusable || 0;
      const dipstick = fuel + unusable;
      loadingHtml += `<br><strong>Endurance:</strong> ${fmt(endurance,2)} h to dry · ${fmt(usableEnd,2)} h after ${ac.reserve_minutes}-min reserve${unusable > 0 ? ` · <strong>Dipstick:</strong> ${fmt(dipstick,1)} ${u(ac).vol} (incl. ${fmt(unusable,1)} unusable)` : ''}`;
    }
    document.getElementById('print-loading').innerHTML = loadingHtml;

    const pb = document.getElementById('print-banner');
    const violations = calc(ac).violations;
    if (violations.length === 0){
      pb.className = 'print-only ok';
      pb.textContent = '✓ Within all W&B limits.';
    } else {
      pb.className = 'print-only bad';
      pb.innerHTML = '<strong>⚠ Out of limits:</strong> ' + violations.join(' · ');
    }

    // --- Build performance section if data permits ---
    const perfSection = document.getElementById('print-perf-section');
    const rTo = perfInput.to_runway;
    const rLd = perfInput.ld_runway;
    const pdata = ac.pchart_id && window.PCHART_DATA && window.PCHART_DATA[ac.pchart_id];
    const adata = ac.afm_id && window.AFM_DATA && window.AFM_DATA[ac.afm_id];
    const hasPerfData = pdata || adata;
    const hasRunway = (rTo.ident || rTo.tora > 0 || rTo.lda > 0) || (rLd.ident || rLd.tora > 0 || rLd.lda > 0);
    if (hasPerfData && hasRunway){
      perfSection.style.display = '';
      buildPerfPrint(ac);
    } else {
      perfSection.style.display = 'none';
      // Tell pilot why performance didn't print
      if (mode === 'performance' && !hasRunway){
        // user is on Perf tab with no runway — make this visible in the banner
        pb.innerHTML += '<br><small>Performance sheet skipped: no runway entered.</small>';
      } else if (!hasPerfData && (hasRunway || mode === 'performance')){
        pb.innerHTML += `<br><small>Performance sheet skipped: ${ac.reg} has no P-chart or Flight Manual data configured.</small>`;
      }
    }

    setTimeout(() => window.print(), 100);
  }

  // ---- performance ----

  // Derive the canonical operation key used by P-chart data, from op_type, op_time, surface
  function deriveOperationKey(op_type, op_time, surface){
    // surface 'paved' / 'grass' / other (metal, coral, etc. treat as grass for safety)
    const grass = (surface !== 'paved');
    if (op_time === 'night'){
      // Night = "All Ops Night" line (no Private/AT distinction at night per CASO 4)
      return grass ? 'all_ops_grass_night' : 'all_ops_paved_night';
    }
    if (op_type === 'air_transport'){
      return grass ? 'air_transport_grass_day' : 'air_transport_paved_day';
    }
    // Private day
    return grass ? 'private_grass_day' : 'private_paved_day';
  }

  function renderPerformance(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac) return;
    document.getElementById('to-condition').value = perfInput.to_condition || 'dry';
    document.getElementById('ld-condition').value = perfInput.ld_condition || 'dry';
    document.getElementById('cond-oat').value = perfInput.conditions.oat ?? '';
    document.getElementById('cond-qnh').value = perfInput.conditions.qnh ?? 1013;
    document.getElementById('perf-op-type').value = perfInput.op_type;
    document.getElementById('perf-op-time').value = perfInput.op_time;
    renderSavedRunwaysPicker('to');
    renderSavedRunwaysPicker('ld');
    renderRunwaySummary('to');
    renderRunwaySummary('ld');
    renderWindInputs('to');
    renderWindInputs('ld');
    bindPerfHandlers();
    computeAndRenderPerf();
  }

  function _side(side){
    return side === 'ld' ? { rw: 'ld_runway', wind: 'ld_wind', cond: 'ld_condition', sel: 'selectedLdRunwayId',
                              pickerId: 'saved-ld-rwy-select', summaryId: 'ld-rwy-summary',
                              condId: 'ld-condition', menuId: 'ld-rwy-menu', menuBtnId: 'ld-rwy-menu-btn',
                              windInputsId: 'ld-wind-inputs', windCompId: 'ld-wind-components' }
                          : { rw: 'to_runway', wind: 'to_wind', cond: 'to_condition', sel: 'selectedToRunwayId',
                              pickerId: 'saved-to-rwy-select', summaryId: 'to-rwy-summary',
                              condId: 'to-condition', menuId: 'to-rwy-menu', menuBtnId: 'to-rwy-menu-btn',
                              windInputsId: 'to-wind-inputs', windCompId: 'to-wind-components' };
  }
  function _selId(side){ return side === 'ld' ? selectedLdRunwayId : selectedToRunwayId; }
  function _setSelId(side, id){
    if (side === 'ld'){ selectedLdRunwayId = id; saveSelectedLdRunway(); }
    else { selectedToRunwayId = id; saveSelectedToRunway(); }
  }

  function renderRunwaySummary(side){
    const k = _side(side);
    const host = document.getElementById(k.summaryId);
    if (!host) return;
    const r = perfInput[k.rw];
    if (!_selId(side) || !r.ident){
      host.innerHTML = '<em>No runway selected. Pick from the dropdown, or tap ⚙ to add one.</em>';
      return;
    }
    const surfaceLabel = ({paved:'Paved', grass:'Grass', metal:'Metal', rolled_earth:'Rolled earth', coral:'Coral'})[r.surface] || r.surface || 'Paved';
    const parts = [
      `<strong>${r.ident}</strong>`,
      `Hdg ${r.heading}°M`,
      `Elev ${r.elev}\u2032`,
      `Slope ${r.slope >= 0 ? '+' : ''}${r.slope}%`,
      `TORA ${r.tora} m`,
      `LDA ${r.lda} m`,
      surfaceLabel,
    ];
    if (r.group != null) parts.push(`Group ${r.group}`);
    host.innerHTML = parts.join(' \u00b7 ');
  }

  function renderSavedRunwaysPicker(side){
    const k = _side(side);
    const sel = document.getElementById(k.pickerId);
    if (!sel) return;
    const surfaceLabel = s => ({paved:'Paved', grass:'Grass', metal:'Metal', rolled_earth:'Rolled earth', coral:'Coral'}[s] || s || 'Paved');
    const curId = _selId(side);
    sel.innerHTML = (curId ? '<option value="">— none (clear selection) —</option>' : '<option value="">— select a runway —</option>') +
      runways.map(rw => {
        const parts = (rw.ident || '').trim().split(/\s+/);
        const icao = parts[0] || '?';
        const dir = parts.slice(1).join(' ') || '?';
        return `<option value="${rw.id}" ${rw.id===curId?'selected':''}>${icao} - ${dir} - ${surfaceLabel(rw.surface)}</option>`;
      }).join('');
    sel.value = curId || '';
  }

  function bindPerfHandlers(){
    const fields = ['to-condition','ld-condition','cond-oat','cond-qnh','perf-op-type','perf-op-time'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.oninput = onPerfFieldChange;
      el.onchange = onPerfFieldChange;
    });
  }

  function onPerfFieldChange(){
    perfInput.to_condition = document.getElementById('to-condition').value;
    perfInput.ld_condition = document.getElementById('ld-condition').value;
    const oat_val = document.getElementById('cond-oat').value;
    perfInput.conditions.oat = oat_val === '' ? null : parseFloat(oat_val);
    perfInput.conditions.qnh = parseFloat(document.getElementById('cond-qnh').value) || 1013;
    perfInput.op_type = document.getElementById('perf-op-type').value;
    perfInput.op_time = document.getElementById('perf-op-time').value;
    computeAndRenderPerf();
  }

  function setWindMode(side, m){
    const k = _side(side);
    perfInput[k.wind].mode = m;
    document.querySelectorAll(`[data-wind-side="${side}"]`).forEach(b => {
      const isActive = b.dataset.windMode === m;
      b.style.background = isActive ? '#d97706' : '';
      b.style.color = isActive ? '#fff' : '';
    });
    renderWindInputs(side);
    computeAndRenderPerf();
  }

  function renderWindInputs(side){
    const k = _side(side);
    const host = document.getElementById(k.windInputsId);
    if (!host) return;
    const w = perfInput[k.wind];
    if (w.mode === 'dirspeed'){
      host.innerHTML = `
        <div class="row">
          <div><label>Direction (°M)</label><input type="number" inputmode="decimal" id="${side}-wind-dir" min="0" max="360" step="10" value="${w.dir || ''}"><small class="help">degrees magnetic</small></div>
          <div><label>Speed (kt)</label><input type="number" inputmode="decimal" id="${side}-wind-spd" min="0" step="1" value="${w.speed || ''}"><small class="help">wind speed in knots</small></div>
        </div>
      `;
      document.getElementById(side+'-wind-dir').oninput = e => { w.dir = parseFloat(e.target.value) || 0; computeAndRenderPerf(); };
      document.getElementById(side+'-wind-spd').oninput = e => { w.speed = parseFloat(e.target.value) || 0; computeAndRenderPerf(); };
    } else {
      host.innerHTML = `
        <div class="row">
          <div><label>Headwind component (kt)</label><input type="number" inputmode="decimal" id="${side}-wind-hwc" step="1" value="${w.headwind_component || ''}"><small class="help">negative = tailwind</small></div>
        </div>
      `;
      document.getElementById(side+'-wind-hwc').oninput = e => { w.headwind_component = parseFloat(e.target.value) || 0; computeAndRenderPerf(); };
    }
    document.querySelectorAll(`[data-wind-side="${side}"]`).forEach(b => {
      const isActive = b.dataset.windMode === w.mode;
      b.style.background = isActive ? '#d97706' : '';
      b.style.color = isActive ? '#fff' : '';
    });
  }

  // Compute wind components and a calm-warning HTML snippet for one side
  function _windFor(side, runway){
    const k = _side(side);
    const w = perfInput[k.wind];
    let headwind = 0, crosswind = 0;
    if (w.mode === 'dirspeed'){
      const wc = window.Performance.windComponents(runway.heading, w.dir, w.speed);
      headwind = wc.headwind; crosswind = wc.crosswind;
    } else {
      headwind = w.headwind_component;
    }
    const wcEl = document.getElementById(k.windCompId);
    if (wcEl){
      if (w.mode === 'dirspeed' && w.speed > 0){
        wcEl.innerHTML = `→ Headwind: <strong>${headwind.toFixed(1)} kt</strong> · Crosswind: <strong>${crosswind.toFixed(1)} kt</strong>`;
      } else if (w.mode === 'component' && w.headwind_component !== 0){
        wcEl.innerHTML = '';
      } else {
        wcEl.innerHTML = `<span style="color:var(--warn)">⚠ No wind entered — calculation assumes calm. Confirm against ATIS/METAR.</span>`;
      }
    }
    return { headwind, crosswind, mode: w.mode, speed: w.speed };
  }

  function computeAndRenderPerf(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac) return;
    const rTo = perfInput.to_runway;
    const rLd = perfInput.ld_runway;
    const c = perfInput.conditions;
    const P = window.Performance;

    // Per-side winds
    const toWind = _windFor('to', rTo);
    const ldWind = _windFor('ld', rLd);

    // Atmospheric — use T/O elevation for PA reference (most common); show both ifferent
    const paTo = P.pressureAltitude(rTo.elev || 0, c.qnh);
    const paLd = P.pressureAltitude(rLd.elev || 0, c.qnh);
    const isaTo = P.isaTemp(paTo);
    const isaLd = P.isaTemp(paLd);
    const oat = c.oat === null ? isaTo : c.oat;  // OAT defaults to T/O ISA if unset
    const daTo = P.densityAltitude(paTo, oat);
    const daLd = P.densityAltitude(paLd, oat);
    const daStrip = document.getElementById('perf-da-strip');
    if (daStrip){
      const sameElev = (rTo.elev === rLd.elev);
      if (sameElev){
        daStrip.innerHTML = `<strong style="color:#d97706">Density Altitude: ${daTo.toFixed(0)}\u2032</strong> &nbsp; PA ${paTo.toFixed(0)}\u2032 · OAT ${oat.toFixed(0)}°C · ISA ${isaTo.toFixed(0)}°C${c.oat===null?' <em style="color:var(--muted)">(using ISA)</em>':''}`;
      } else {
        daStrip.innerHTML = `<strong style="color:#d97706">DA: T/O ${daTo.toFixed(0)}\u2032 · Landing ${daLd.toFixed(0)}\u2032</strong> &nbsp; OAT ${oat.toFixed(0)}°C${c.oat===null?' <em style="color:var(--muted)">(using ISA at T/O elev)</em>':''}`;
      }
    }
    const aiEl = document.getElementById('atmospheric-info');
    if (aiEl){
      const sameElev = (rTo.elev === rLd.elev);
      if (sameElev){
        aiEl.innerHTML = `PA: <strong>${paTo.toFixed(0)}\u2032</strong> · ISA: <strong>${isaTo.toFixed(0)}°C</strong> · Density Altitude: <strong>${daTo.toFixed(0)}\u2032</strong>${c.oat===null?' <em>(using ISA \u2014 enter OAT to override)</em>':''}`;
      } else {
        aiEl.innerHTML = `T/O: PA ${paTo.toFixed(0)}\u2032 · DA ${daTo.toFixed(0)}\u2032 \u00b7 Landing: PA ${paLd.toFixed(0)}\u2032 · DA ${daLd.toFixed(0)}\u2032${c.oat===null?' <em>(using ISA at T/O elev)</em>':''}`;
      }
    }

    const toWet = (perfInput.to_condition === 'wet' || perfInput.to_condition === 'long_grass');
    const ldWet = (perfInput.ld_condition === 'wet' || perfInput.ld_condition === 'long_grass');

    const pdata = ac.pchart_id && window.PCHART_DATA && window.PCHART_DATA[ac.pchart_id];
    const adata = ac.afm_id && window.AFM_DATA && window.AFM_DATA[ac.afm_id];
    const hasP = !!pdata, hasA = !!adata;

    let activeMethod;
    if (hasP && hasA){
      activeMethod = perfInput.perf_method === 'afm' ? 'afm' : 'pchart';
    } else if (hasP){ activeMethod = 'pchart'; }
    else if (hasA){ activeMethod = 'afm'; }
    else { activeMethod = 'none'; }
    if (activeMethod !== 'none') perfInput.perf_method = activeMethod;

    const toggleHost = document.getElementById('perf-method-toggle');
    if (toggleHost){
      if (hasP && hasA){
        toggleHost.style.display = '';
        ['pchart','afm'].forEach(m => {
          const btn = document.getElementById('method-' + m);
          const isActive = activeMethod === m;
          btn.style.background = isActive ? '#d97706' : '';
          btn.style.color = isActive ? '#fff' : '';
          btn.disabled = false;
          btn.style.opacity = '1';
        });
      } else if (hasP || hasA){
        toggleHost.style.display = '';
        ['pchart','afm'].forEach(m => {
          const btn = document.getElementById('method-' + m);
          const isActive = activeMethod === m;
          btn.style.background = isActive ? '#d97706' : '';
          btn.style.color = isActive ? '#fff' : '';
          btn.style.opacity = isActive ? '1' : '0.4';
          btn.disabled = !isActive;
        });
      } else {
        toggleHost.style.display = 'none';
      }
    }

    const opKeyTo = deriveOperationKey(perfInput.op_type, perfInput.op_time, rTo.surface);
    const opKeyLd = deriveOperationKey(perfInput.op_type, perfInput.op_time, rLd.surface);
    const opLabelMap = {
      private_paved_day:        'Private \u2014 Paved \u2014 Day',
      air_transport_paved_day:  'Air Transport \u2014 Paved \u2014 Day',
      private_grass_day:        'Private \u2014 Grass \u2014 Day',
      air_transport_grass_day:  'Air Transport \u2014 Grass \u2014 Day',
      all_ops_paved_night:      'All Ops \u2014 Paved \u2014 Night',
      all_ops_grass_night:      'All Ops \u2014 Grass \u2014 Night',
    };

    const opDerived = document.getElementById('perf-op-derived');
    if (opDerived){
      const noteFor = (surface) => (activeMethod === 'pchart' && surface !== 'paved' && surface !== 'grass')
        ? ` <span style="color:var(--warn)">(chart treats "${surface.replace('_',' ')}" as Grass)</span>` : '';
      opDerived.innerHTML = `T/O line: <strong>${opLabelMap[opKeyTo]}</strong>${noteFor(rTo.surface)}<br>Landing line: <strong>${opLabelMap[opKeyLd]}</strong>${noteFor(rLd.surface)}`;
    }

    const opWarn = document.getElementById('perf-op-warning');
    if (opWarn){
      if (perfInput.op_type === 'air_transport'){
        opWarn.innerHTML = `<div class="banner warn" style="margin:0;font-size:12px">⚠ Air Transport operation selected. This app is normally used for private GA \u2014 confirm Air Transport is correct for this flight.</div>`;
      } else { opWarn.innerHTML = ''; }
    }

    let to_result = null, ld_result = null;
    let methodNote = '';
    const opCard = document.getElementById('perf-op-card');
    if (opCard) opCard.classList.toggle('hidden', activeMethod !== 'pchart');

    if (activeMethod === 'pchart'){
      methodNote = `Method: <strong>P-chart</strong> (${pdata.source}). CASO 4 baked in.`;
      to_result = P.pchartTakeoffDistance(pdata, paTo, oat, opKeyTo, rTo.slope, toWind.headwind, toWet);
      ld_result = P.pchartLandingDistance(pdata, rLd.elev, opKeyLd, rLd.slope, ldWind.headwind, ldWet);
    } else if (activeMethod === 'afm'){
      methodNote = `Method: <strong>Flight Manual + AC91-3 factors</strong> (${adata.source}).`;
      const afmTo = { to_base_msl_isa_m: adata.takeoff.base_msl_isa_m, to_pa_correction_pct_per_1000: adata.takeoff.pa_correction_pct_per_1000, to_temp_correction_pct_per_10c: adata.takeoff.temp_correction_pct_per_10c, to_weight_correction_pct_per_100kg: adata.takeoff.weight_correction_pct_per_100kg || 0, mtow_kg: ac.mtow };
      const afmLd = { ld_base_msl_isa_m: adata.landing.base_msl_isa_m, ld_pa_correction_pct_per_1000: adata.landing.pa_correction_pct_per_1000, ld_temp_correction_pct_per_10c: adata.landing.temp_correction_pct_per_10c, ld_weight_correction_pct_per_100kg: adata.landing.weight_correction_pct_per_100kg || 0, mtow_kg: ac.mtow };
      to_result = P.afmFactorsTakeoff(afmTo, paTo, oat, rTo.surface, rTo.slope, toWind.headwind, toWet);
      ld_result = P.afmFactorsLanding(afmLd, paLd, oat, rLd.surface, rLd.slope, ldWind.headwind, ldWet);
      if (to_result){ to_result.d_ppd = to_result.distance / (to_result.surf_factor * to_result.slope_factor * to_result.wind_factor * to_result.wet_factor); to_result.op_mult = to_result.surf_factor; }
      if (ld_result){ ld_result.d_ppd = ld_result.distance / (ld_result.surf_factor * ld_result.slope_factor * ld_result.wind_factor * ld_result.wet_factor); ld_result.op_mult = ld_result.surf_factor; }
    } else {
      methodNote = `Method: <strong>none</strong>. Set a P-chart or Flight Manual data source in the aircraft config.`;
    }

    const host = document.getElementById('perf-results');
    if (activeMethod === 'none'){
      host.innerHTML =
        `<div style="background:var(--panel-2);padding:8px 10px;border-radius:8px;margin-bottom:8px;font-size:11px;line-height:1.5">${methodNote}</div>` +
        `<div class="banner warn" style="margin:0">No performance data computed for this aircraft. Set a P-chart or Flight Manual data source in the aircraft configuration.</div>`;
      document.getElementById('perf-breakdown').innerHTML = '';
    } else {
      const stat = (label, distance, available, ok, sub) => {
        const margin = available > 0 ? (1 - distance/available) * 100 : null;
        const cls = available > 0 ? (ok ? 'ok' : 'bad') : 'warn';
        const marginChip = margin != null
          ? ` <span style="font-size:13px;font-weight:600;padding:2px 8px;border-radius:10px;background:${ok?'rgba(22,163,74,0.15)':'rgba(220,38,38,0.15)'};color:${ok?'#16a34a':'#dc2626'};margin-left:6px">${ok?'+':'\u2212'}${Math.abs(margin).toFixed(0)}%</span>`
          : '';
        return `
          <div class="stat ${cls}" style="margin-bottom:8px">
            <div class="l">${label}</div>
            <div class="v">${distance.toFixed(0)} m${marginChip}</div>
            <div class="s">${available > 0 ? (ok ? `✓ GO \u2014 ${margin.toFixed(0)}% margin on ${sub} (${available} m)` : `✗ NO-GO \u2014 exceeds ${sub} (${available} m) by ${(distance - available).toFixed(0)} m`) : `no ${sub} entered`}</div>
          </div>`;
      };
      const toOK = rTo.tora > 0 && to_result.distance <= rTo.tora;
      const ldOK = rLd.lda > 0 && ld_result.distance <= rLd.lda;

      let windWarning = '';
      if (activeMethod === 'pchart' && pdata.wind_factor){
        if (toWind.headwind < -pdata.wind_factor.max_tailwind_kt) windWarning += `<div class="banner warn" style="margin:0 0 6px;font-size:12px">⚠ T/O tailwind ${(-toWind.headwind).toFixed(1)} kt exceeds chart limit ${pdata.wind_factor.max_tailwind_kt} kt</div>`;
        if (ldWind.headwind < -pdata.wind_factor.max_tailwind_kt) windWarning += `<div class="banner warn" style="margin:0 0 6px;font-size:12px">⚠ Landing tailwind ${(-ldWind.headwind).toFixed(1)} kt exceeds chart limit ${pdata.wind_factor.max_tailwind_kt} kt</div>`;
      }

      host.innerHTML =
        `<div style="background:var(--panel-2);padding:8px 10px;border-radius:8px;margin-bottom:8px;font-size:11px;line-height:1.5">${methodNote}</div>` +
        windWarning +
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">` +
        stat(`T/O to 50\u2032 ${rTo.ident ? '\u2014 ' + rTo.ident : ''}`, to_result.distance, rTo.tora, toOK, 'TORA') +
        stat(`Landing from 50\u2032 ${rLd.ident ? '\u2014 ' + rLd.ident : ''}`, ld_result.distance, rLd.lda, ldOK, 'LDA') +
        `</div>`;

      const fmt2 = x => x.toFixed(3);
      document.getElementById('perf-breakdown').innerHTML = `
        <table style="width:100%;font-variant-numeric:tabular-nums;font-size:12px;border-collapse:collapse">
          <tr><td colspan="3"><strong>Takeoff${rTo.ident ? ' \u2014 ' + rTo.ident : ''}</strong></td></tr>
          <tr><td>PPD reference</td><td colspan="2" style="text-align:right">${to_result.d_ppd.toFixed(0)} m</td></tr>
          <tr><td>× Operation</td><td style="text-align:right">${fmt2(to_result.op_mult)}</td><td style="text-align:right">${(to_result.d_ppd * to_result.op_mult).toFixed(0)} m</td></tr>
          <tr><td>× Slope (${rTo.slope}%)</td><td style="text-align:right">${fmt2(to_result.slope_factor)}</td><td style="text-align:right">${(to_result.d_ppd * to_result.op_mult * to_result.slope_factor).toFixed(0)} m</td></tr>
          <tr><td>× Wind (${toWind.headwind.toFixed(1)} kt)</td><td style="text-align:right">${fmt2(to_result.wind_factor)}</td><td style="text-align:right">${(to_result.d_ppd * to_result.op_mult * to_result.slope_factor * to_result.wind_factor).toFixed(0)} m</td></tr>
          ${toWet ? `<tr><td>× Wet</td><td style="text-align:right">${fmt2(to_result.wet_factor)}</td><td style="text-align:right">${to_result.distance.toFixed(0)} m</td></tr>` : ''}
          <tr><td colspan="3" style="padding-top:8px"><strong>Landing${rLd.ident ? ' \u2014 ' + rLd.ident : ''}</strong></td></tr>
          <tr><td>PPD reference</td><td colspan="2" style="text-align:right">${ld_result.d_ppd.toFixed(0)} m</td></tr>
          <tr><td>× Operation</td><td style="text-align:right">${fmt2(ld_result.op_mult)}</td><td style="text-align:right">${(ld_result.d_ppd * ld_result.op_mult).toFixed(0)} m</td></tr>
          <tr><td>× Slope (${rLd.slope}%)</td><td style="text-align:right">${fmt2(ld_result.slope_factor)}</td><td style="text-align:right">${(ld_result.d_ppd * ld_result.op_mult * ld_result.slope_factor).toFixed(0)} m</td></tr>
          <tr><td>× Wind (${ldWind.headwind.toFixed(1)} kt)</td><td style="text-align:right">${fmt2(ld_result.wind_factor)}</td><td style="text-align:right">${(ld_result.d_ppd * ld_result.op_mult * ld_result.slope_factor * ld_result.wind_factor).toFixed(0)} m</td></tr>
          ${ldWet ? `<tr><td>× Wet</td><td style="text-align:right">${fmt2(ld_result.wet_factor)}</td><td style="text-align:right">${ld_result.distance.toFixed(0)} m</td></tr>` : ''}
        </table>
      `;
    }

    renderPerfAudit(activeMethod, pdata, adata);

    // Crosswind — show one block with T/O and Landing rows
    const demoXW = ac.crosswind_demonstrated_kt;
    const clubXW = ac.crosswind_club_kt;
    const limit = (demoXW && clubXW) ? Math.min(demoXW, clubXW) : (demoXW || clubXW || null);
    const xwHost = document.getElementById('perf-crosswind');
    let xwHtml = '';

    const xwRow = (label, runway, w) => {
      if (w.mode !== 'dirspeed' || !w.speed){
        return `<div style="color:var(--muted);font-size:13px;padding:6px 0">${label}: enter direction and speed to compute.</div>`;
      }
      const cls = (limit && w.crosswind > limit) ? 'bad' : 'ok';
      const sub = limit ? `limit ${limit} kt ${demoXW && clubXW ? '(lower of demo ' + demoXW + ', club ' + clubXW + ')' : (demoXW ? '(demonstrated)' : '(club)')}` : 'no limit set in aircraft config';
      return `<div class="stat ${cls}" style="margin-bottom:6px">
        <div class="l">${label}${runway.ident ? ' \u2014 ' + runway.ident : ''}</div>
        <div class="v">${w.crosswind.toFixed(1)} kt</div>
        <div class="s">${limit && w.crosswind > limit ? '✗ exceeds ' + sub : (limit ? '✓ within ' + sub : sub)}</div>
      </div>`;
    };
    xwHtml += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${xwRow('T/O crosswind', rTo, toWind)}${xwRow('Landing crosswind', rLd, ldWind)}</div>`;

    // Tailwind + better-runway suggestions for each side
    const tailwindBlock = (label, runway, w, selId) => {
      if (w.mode !== 'dirspeed' || !w.speed || w.headwind >= 0) return '';
      let suggestion = '';
      if (runway.ident){
        const prefix = runway.ident.split(/\s+/)[0];
        const siblings = runways.filter(rw => rw.ident && rw.ident.startsWith(prefix) && rw.id !== selId);
        let best = null;
        siblings.forEach(rw => {
          const wc = window.Performance.windComponents(rw.heading, perfInput[w === toWind ? 'to_wind' : 'ld_wind'].dir, perfInput[w === toWind ? 'to_wind' : 'ld_wind'].speed);
          if (!best || wc.headwind > best.hw){ best = { rw, hw: wc.headwind, xw: wc.crosswind }; }
        });
        if (best && best.hw > w.headwind){
          suggestion = `<div style="margin-top:6px;font-size:12px">→ Better option: <strong>${best.rw.ident}</strong> would give HW ${best.hw.toFixed(1)} kt / XW ${best.xw.toFixed(1)} kt</div>`;
        }
      }
      return `<div class="banner warn" style="margin-top:8px;font-size:12px">⚠ ${label}: Tailwind ${(-w.headwind).toFixed(1)} kt on this runway.${suggestion}</div>`;
    };
    xwHtml += tailwindBlock('T/O', rTo, toWind, _selId('to'));
    xwHtml += tailwindBlock('Landing', rLd, ldWind, _selId('ld'));

    // Group sanity checks (one per side)
    const groupBlock = (label, runway) => {
      if (ac.group == null || runway.group == null) return '';
      if (ac.group > runway.group){
        return `<div class="banner warn" style="margin-top:8px;font-size:12px">⚠ ${label}: Aircraft Group ${ac.group} exceeds aerodrome Group ${runway.group}. Sanity check only \u2014 verify with operator / AIP.</div>`;
      }
      return `<div class="banner ok" style="margin-top:8px;font-size:12px">✓ ${label}: Aircraft Group ${ac.group} is compatible with aerodrome Group ${runway.group}.</div>`;
    };
    xwHtml += groupBlock('T/O', rTo);
    xwHtml += groupBlock('Landing', rLd);

    xwHost.innerHTML = xwHtml;
  }

  function copyRunway(fromSide, toSide){
    const fromId = _selId(fromSide);
    if (!fromId){ alert('Select the source runway first.'); return; }
    loadSavedRunway(toSide, fromId);
  }

  function reverseRunway(side){
    const sd = side || 'to';
    const curId = _selId(sd);
    if (!curId){ alert('Select a runway first.'); return; }
    const cur = runways.find(x => x.id === curId);
    if (!cur || cur.heading == null){ alert('No heading on current runway.'); return; }
    const reciprocalHdg = (cur.heading + 180) % 360;
    // Match same ICAO prefix and a heading within ±10° of reciprocal
    const prefix = (cur.ident || '').trim().split(/\s+/)[0];
    const candidate = runways.find(rw => {
      if (rw.id === curId) return false;
      const rwPrefix = (rw.ident || '').trim().split(/\s+/)[0];
      if (rwPrefix !== prefix) return false;
      const diff = Math.abs(((rw.heading - reciprocalHdg + 540) % 360) - 180);
      return diff <= 10;
    });
    if (!candidate){
      alert(`No reciprocal runway found in saved list for ${cur.ident}. Add one via the ⚙ menu.`);
      return;
    }
    loadSavedRunway(sd, candidate.id);
  }

  function renderPerfAudit(activeMethod, pdata, adata){
    const host = document.getElementById('perf-audit');
    if (!host) return;
    if (activeMethod === 'none'){ host.innerHTML = '<em style="color:var(--muted)">No data source.</em>'; return; }

    const tbl = (rows) => `<table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:11px;margin:4px 0">${rows.map(r => `<tr><td style="padding:2px 6px;border:1px solid var(--border)">${r[0]}</td><td style="padding:2px 6px;border:1px solid var(--border);text-align:right">${r[1]}</td></tr>`).join('')}</table>`;

    if (activeMethod === 'pchart' && pdata){
      const tref = (pdata.takeoff && pdata.takeoff.reference_points) || [];
      const lref = (pdata.landing && pdata.landing.reference_points) || [];
      const ops = pdata.operation_multipliers || {};
      const wf = pdata.wind_factor || {};

      const opRows = Object.entries(ops).map(([k, v]) => [k.replace(/_/g, ' '), '×' + v.toFixed(2)]);
      const toRows = tref.map(p => [`PA ${p.pa}\u2032 / ${p.t}°C`, p.d + ' m']);
      const ldRows = lref.map(p => [`Elev ${p.elev}\u2032`, p.d + ' m']);

      host.innerHTML = `
        <p><strong>Source:</strong> ${pdata.source}<br>
        <strong>Aircraft:</strong> ${pdata.name}<br>
        <strong>CASO 4:</strong> ${pdata.caso4_compliant ? 'baked into chart \u2014 not re-applied' : 'NOT baked in'}<br>
        ${pdata.precision ? '<strong>Precision:</strong> ' + pdata.precision + '<br>' : ''}
        ${pdata.precision_note ? '<em>' + pdata.precision_note + '</em>' : ''}</p>
        <p style="color:var(--warn);font-size:11px">Cross-check these values against your paper P-chart. If any reference point differs by more than the stated precision, flag it.</p>

        <p style="margin:8px 0 2px"><strong>T/O reference points</strong> (Private-Paved-Day, zero wind, zero slope, MTOW)</p>
        ${tbl(toRows)}

        <p style="margin:8px 0 2px"><strong>Landing reference points</strong> (Private-Paved-Day, zero wind, zero slope, MTOW)</p>
        ${tbl(ldRows)}

        <p style="margin:8px 0 2px"><strong>Operation line multipliers</strong> (applied to PPD)</p>
        ${tbl(opRows)}

        <p style="margin:8px 0 2px"><strong>Slope</strong></p>
        ${tbl([['per 1% slope', (pdata.slope_factor_pct_per_pct || 0).toFixed(1) + '%']])}

        <p style="margin:8px 0 2px"><strong>Wind</strong></p>
        ${tbl([
          ['headwind reduction', ((wf.headwind_pct_per_kt||0)*100).toFixed(1) + '% per kt'],
          ['tailwind increase', ((wf.tailwind_pct_per_kt||0)*100).toFixed(1) + '% per kt'],
          ['max headwind (chart)', (wf.max_headwind_kt||0) + ' kt'],
          ['max tailwind (chart)', (wf.max_tailwind_kt||0) + ' kt'],
        ])}

        <p style="margin:8px 0 2px"><strong>Wet runway</strong>: +15% landing (AC91-3)</p>
      `;
      return;
    }

    if (activeMethod === 'afm' && adata){
      const t = adata.takeoff || {}, l = adata.landing || {};
      host.innerHTML = `
        <p><strong>Source:</strong> ${adata.source}<br>
        <strong>Aircraft:</strong> ${adata.name}<br>
        <strong>CASO 4:</strong> applied via AC91-3 factors (surface, slope, wind, wet)<br>
        ${adata.precision ? '<strong>Precision:</strong> ' + adata.precision : ''}</p>
        <p style="color:var(--warn);font-size:11px">Cross-check the base distances and corrections against your Flight Manual.</p>

        <p style="margin:8px 0 2px"><strong>Takeoff base</strong> (MTOW, sea level, ISA, paved, dry, zero wind, zero slope)</p>
        ${tbl([
          ['base distance', (t.base_msl_isa_m||'?') + ' m'],
          ['per 1000\u2032 PA', (t.pa_correction_pct_per_1000||0) + '%'],
          ['per 10°C above ISA', (t.temp_correction_pct_per_10c||0) + '%'],
          ['per 100 kg below MTOW', (t.weight_correction_pct_per_100kg||0) + '% (lighter = shorter)'],
        ])}

        <p style="margin:8px 0 2px"><strong>Landing base</strong></p>
        ${tbl([
          ['base distance', (l.base_msl_isa_m||'?') + ' m'],
          ['per 1000\u2032 PA', (l.pa_correction_pct_per_1000||0) + '%'],
          ['per 10°C above ISA', (l.temp_correction_pct_per_10c||0) + '%'],
          ['per 100 kg below MTOW', (l.weight_correction_pct_per_100kg||0) + '%'],
        ])}

        <p style="margin:8px 0 2px"><strong>AC91-3 factors applied on top</strong></p>
        ${tbl([
          ['Grass (T/O × LD)', '1.14 × 1.18'],
          ['Metal (T/O × LD)', '1.05 × 1.08'],
          ['Rolled earth (T/O × LD)', '1.08 × 1.16'],
          ['Coral (T/O × LD)', '1.00 × 1.05'],
          ['Slope (T/O uphill / LD downhill)', '5% per 1%'],
          ['Wind (HW / TW)', '0.5× per kt HW / 1.5× per kt TW'],
          ['Wet runway', '+15% landing'],
        ])}
      `;
      return;
    }

    host.innerHTML = '<em style="color:var(--muted)">No data available for this method.</em>';
  }

  function setPerfMethod(m){
    if (m !== 'pchart' && m !== 'afm') return;
    perfInput.perf_method = m;
    computeAndRenderPerf();
  }

  function loadSavedRunway(side, id){
    if (!side){ // legacy single-arg form ignored
      return;
    }
    if (!id){ _setSelId(side, null); renderPerformance(); return; }
    const rw = runways.find(x => x.id === id);
    if (!rw) return;
    _setSelId(side, id);
    const key = side === 'ld' ? 'ld_runway' : 'to_runway';
    perfInput[key] = {
      id: rw.id,
      ident: rw.ident || '', heading: rw.heading ?? 0, elev: rw.elev ?? 0, slope: rw.slope ?? 0,
      tora: rw.tora ?? 0, lda: rw.lda ?? 0, surface: rw.surface || 'paved', group: rw.group ?? null,
    };
    renderPerformance();
  }

  function runwayConfigForm(rw){
    return `
      <div class="row">
        <div style="flex:2"><label>Designator</label><input type="text" id="rcfg-ident" value="${rw.ident||''}" placeholder="e.g. NZWN 16"><small class="help">ICAO + direction</small></div>
        <div><label>Heading (°M)</label><input type="number" inputmode="decimal" id="rcfg-hdg" min="0" max="360" step="1" value="${rw.heading ?? ''}" placeholder="160"></div>
      </div>
      <div class="row">
        <div><label>Elevation (ft)</label><input type="number" inputmode="decimal" id="rcfg-elev" step="1" value="${rw.elev ?? ''}" placeholder="41"></div>
        <div><label>Slope (%)</label><input type="number" inputmode="decimal" id="rcfg-slope" step="0.1" value="${rw.slope ?? ''}" placeholder="-0.7"><small class="help">+ uphill, − downhill (T/O dir)</small></div>
      </div>
      <div class="row">
        <div><label>TORA (m)</label><input type="number" inputmode="decimal" id="rcfg-tora" step="1" value="${rw.tora ?? ''}" placeholder="1936"></div>
        <div><label>LDA (m)</label><input type="number" inputmode="decimal" id="rcfg-lda" step="1" value="${rw.lda ?? ''}" placeholder="1719"></div>
      </div>
      <div class="row">
        <div><label>Surface</label>
          <select id="rcfg-surface">
            <option value="paved" ${(rw.surface||'paved')==='paved'?'selected':''}>Paved</option>
            <option value="grass" ${rw.surface==='grass'?'selected':''}>Grass</option>
            <option value="metal" ${rw.surface==='metal'?'selected':''}>Metal</option>
            <option value="rolled_earth" ${rw.surface==='rolled_earth'?'selected':''}>Rolled earth</option>
            <option value="coral" ${rw.surface==='coral'?'selected':''}>Coral</option>
          </select>
        </div>
        <div><label>Aerodrome Group (NZ)</label>
          <select id="rcfg-group">
            <option value="">— not set —</option>
            ${[1,2,3,4,5,6,7,8].map(g => `<option value="${g}" ${rw.group===g?'selected':''}>${g}</option>`).join('')}
          </select>
          <small class="help">from AIP (AC139-7)</small>
        </div>
      </div>
    `;
  }

  let _editingSide = null;
  function openRunwayConfig(side, forNew, runwayIdOverride){
    _editingSide = side || 'to';
    editingRunwayId = forNew ? null : (runwayIdOverride || _selId(_editingSide));
    const rw = editingRunwayId ? runways.find(x => x.id === editingRunwayId) : null;
    const blank = { ident: '', heading: 0, elev: 0, slope: 0, tora: 0, lda: 0, surface: 'paved', group: null };
    document.getElementById('rwy-config-title').textContent = editingRunwayId ? 'Edit runway' : 'Add new runway';
    document.getElementById('rwy-config-body').innerHTML = runwayConfigForm(rw || blank);
    document.getElementById('btn-rwy-save-copy').style.display = editingRunwayId ? '' : 'none';
    document.getElementById('btn-delete-rwy').style.display = editingRunwayId ? '' : 'none';
    document.getElementById('rwy-config-modal').classList.remove('hidden');
  }
  function closeRunwayConfig(){ document.getElementById('rwy-config-modal').classList.add('hidden'); }
  function readRunwayForm(){
    const grpV = document.getElementById('rcfg-group').value;
    return {
      ident: document.getElementById('rcfg-ident').value.trim(),
      heading: parseFloat(document.getElementById('rcfg-hdg').value) || 0,
      elev: parseFloat(document.getElementById('rcfg-elev').value) || 0,
      slope: parseFloat(document.getElementById('rcfg-slope').value) || 0,
      tora: parseFloat(document.getElementById('rcfg-tora').value) || 0,
      lda: parseFloat(document.getElementById('rcfg-lda').value) || 0,
      surface: document.getElementById('rcfg-surface').value,
      group: grpV === '' ? null : parseInt(grpV, 10),
    };
  }
  function _applyRunwayToSide(side, rw){
    const key = side === 'ld' ? 'ld_runway' : 'to_runway';
    perfInput[key] = { id: rw.id, ident: rw.ident, heading: rw.heading, elev: rw.elev, slope: rw.slope, tora: rw.tora, lda: rw.lda, surface: rw.surface, group: rw.group };
  }
  function saveRunwayConfig(){
    const data = readRunwayForm();
    if (!data.ident){ alert('Designator is required.'); return; }
    const side = _editingSide || 'to';
    let rwId;
    if (editingRunwayId){
      const rw = runways.find(x => x.id === editingRunwayId);
      if (rw) Object.assign(rw, data);
      rwId = editingRunwayId;
    } else {
      const newRw = { id: 'rwy-' + Math.random().toString(36).slice(2, 9), ...data };
      runways.push(newRw);
      rwId = newRw.id;
      _setSelId(side, rwId);
    }
    saveRunways();
    closeRunwayConfig();
    // Refresh perfInput for whichever side(s) reference this runway
    ['to','ld'].forEach(s => {
      if (_selId(s) === rwId){
        const rw = runways.find(x => x.id === rwId);
        if (rw) _applyRunwayToSide(s, rw);
      }
    });
    renderPerformance();
  }
  function saveRunwayConfigAsCopy(){
    const data = readRunwayForm();
    if (!data.ident){ alert('Designator is required.'); return; }
    const side = _editingSide || 'to';
    const newRw = { id: 'rwy-' + Math.random().toString(36).slice(2, 9), ...data };
    runways.push(newRw);
    _setSelId(side, newRw.id);
    _applyRunwayToSide(side, newRw);
    saveRunways();
    closeRunwayConfig();
    renderPerformance();
  }
  function deleteRunway(){
    if (!editingRunwayId) return;
    if (!confirm('Delete this runway? This cannot be undone.')) return;
    const delId = editingRunwayId;
    runways = runways.filter(x => x.id !== delId);
    ['to','ld'].forEach(s => {
      if (_selId(s) === delId){
        _setSelId(s, null);
        const key = s === 'ld' ? 'ld_runway' : 'to_runway';
        perfInput[key] = { id: null, ident: '', heading: 0, elev: 0, slope: 0, tora: 0, lda: 0, surface: 'paved', group: null };
      }
    });
    saveRunways();
    closeRunwayConfig();
    renderPerformance();
  }

  function newRunway(side){ openRunwayConfig(side || 'to', true); }
  function editCurrentRunway(side){
    if (!_selId(side || 'to')){ alert('No runway selected. Pick one from the dropdown first, or use "Add new runway".'); return; }
    openRunwayConfig(side || 'to', false);
  }
  function duplicateCurrentRunway(side){
    const sd = side || 'to';
    if (!_selId(sd)){ alert('No runway selected to duplicate.'); return; }
    const orig = runways.find(x => x.id === _selId(sd));
    if (!orig) return;
    const copy = { ...orig, id: 'rwy-' + Math.random().toString(36).slice(2, 9), ident: (orig.ident || '') + ' (copy)' };
    runways.push(copy);
    _setSelId(sd, copy.id);
    _applyRunwayToSide(sd, copy);
    saveRunways();
    openRunwayConfig(sd, false);
  }

  function toggleRwyMenu(side, event){
    if (event) event.stopPropagation();
    const sd = side || 'to';
    const menuId = sd === 'ld' ? 'ld-rwy-menu' : 'to-rwy-menu';
    const btnId = sd === 'ld' ? 'ld-rwy-menu-btn' : 'to-rwy-menu-btn';
    const m = document.getElementById(menuId);
    if (!m) return;
    m.classList.toggle('hidden');
    if (!m.classList.contains('hidden')){
      setTimeout(() => {
        const handler = (ev) => {
          if (!m.contains(ev.target) && ev.target.id !== btnId){
            m.classList.add('hidden');
            document.removeEventListener('click', handler);
          }
        };
        document.addEventListener('click', handler);
      }, 0);
    }
  }
  function closeRwyMenu(side){
    const sd = side || 'to';
    const m = document.getElementById(sd === 'ld' ? 'ld-rwy-menu' : 'to-rwy-menu');
    if (m) m.classList.add('hidden');
  }

  function openManageRunways(){
    renderManageRunwaysList();
    document.getElementById('manage-runways-modal').classList.remove('hidden');
  }
  function closeManageRunways(){
    document.getElementById('manage-runways-modal').classList.add('hidden');
  }
  function renderManageRunwaysList(){
    const host = document.getElementById('manage-runways-list');
    if (!host) return;
    if (runways.length === 0){
      host.innerHTML = '<p style="color:var(--muted);font-size:13px">No runways saved yet. Use "Add new runway" to create one.</p>';
      return;
    }
    host.innerHTML = runways.map(rw => `
      <div style="display:flex;align-items:center;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
        <div style="flex:1">
          <div style="font-weight:600">${rw.ident || '(no ident)'}</div>
          <div style="font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums">${rw.surface||'paved'} · hdg ${rw.heading||'?'}° · elev ${rw.elev||'?'}\u2032 · TORA ${rw.tora||'?'} · LDA ${rw.lda||'?'}${rw.group!=null?' · Gp '+rw.group:''}</div>
        </div>
        <button class="icon-btn" onclick="App.manageRunwaySelect('${rw.id}')" title="Select" aria-label="Select">✓</button>
        <button class="icon-btn" onclick="App.manageRunwayEdit('${rw.id}')" title="Edit" aria-label="Edit">✎</button>
        <button class="icon-btn" onclick="App.manageRunwayDuplicate('${rw.id}')" title="Duplicate" aria-label="Duplicate">⎘</button>
        <button class="icon-btn" onclick="App.manageRunwayDelete('${rw.id}')" title="Delete" aria-label="Delete">🗑</button>
      </div>
    `).join('');
  }
  function manageRunwaySelect(id){
    // Default to T/O side; user can also pick from per-side dropdown directly
    loadSavedRunway('to', id);
    closeManageRunways();
  }
  function manageRunwayEdit(id){
    closeManageRunways();
    openRunwayConfig('to', false, id);
  }
  function manageRunwayDuplicate(id){
    const orig = runways.find(x => x.id === id);
    if (!orig) return;
    const copy = { ...orig, id: 'rwy-' + Math.random().toString(36).slice(2, 9), ident: (orig.ident || '') + ' (copy)' };
    runways.push(copy);
    saveRunways();
    renderManageRunwaysList();
    renderSavedRunwaysPicker();
  }
  function manageRunwayDelete(id){
    const rw = runways.find(x => x.id === id);
    if (!rw) return;
    if (!confirm(`Delete runway "${rw.ident || '(no ident)'}"?`)) return;
    runways = runways.filter(x => x.id !== id);
    ['to','ld'].forEach(sd => {
      if (_selId(sd) === id){
        _setSelId(sd, null);
        const key = sd === 'ld' ? 'ld_runway' : 'to_runway';
        perfInput[key] = { id: null, ident: '', heading: 0, elev: 0, slope: 0, tora: 0, lda: 0, surface: 'paved', group: null };
      }
    });
    if (mode === 'performance') renderPerformance();
    saveRunways();
    renderManageRunwaysList();
    renderSavedRunwaysPicker();
  }
  function exportRunways(){
    if (runways.length === 0){ alert('No runways to export.'); return; }
    closeManageRunways();
    openPicker({
      title: 'Export runways',
      subtitle: 'Choose which runways to include in the export file.',
      confirmLabel: 'Export',
      items: runways.map(rw => ({
        value: rw.id, checked: true,
        label: rw.ident || '(no ident)',
        detail: `${rw.surface||'paved'} · hdg ${rw.heading||'?'}° · elev ${rw.elev||'?'}\u2032 · TORA ${rw.tora||'?'}m`,
      })),
      onConfirm: (ids) => {
        if (ids.length === 0) return;
        const subset = runways.filter(rw => ids.includes(rw.id));
        const blob = new Blob([JSON.stringify({ runways: subset, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'wb-runways-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
        URL.revokeObjectURL(url);
      },
    });
  }
  function importRunwaysFile(e){
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const incoming = Array.isArray(data) ? data : data.runways;
        if (!Array.isArray(incoming)) throw new Error('Invalid format');
        closeMenu();
        openPicker({
          title: 'Import runways',
          subtitle: `${incoming.length} runway(s) in this file. Choose which to add.`,
          confirmLabel: 'Import',
          items: incoming.map(rw => ({
            value: rw, checked: true,
            label: rw.ident || '(no ident)',
            detail: `${rw.surface||'paved'} · hdg ${rw.heading||'?'}° · elev ${rw.elev||'?'}\u2032 · TORA ${rw.tora||'?'}m`,
          })),
          onConfirm: (chosen) => {
            chosen.forEach(rw => runways.push(migrateRunway({ ...rw, id: 'rwy-' + Math.random().toString(36).slice(2, 9) })));
            saveRunways();
            if (mode === 'performance') renderSavedRunwaysPicker();
            alert(`Imported ${chosen.length} runway(s).`);
          },
        });
      } catch(err){ alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  function restoreDefaultRunways(){
    if (!confirm('Clear all saved runways? Your runway data will be lost.')) return;
    runways = [];
    selectedToRunwayId = null; selectedLdRunwayId = null;
    saveRunways(); saveSelectedToRunway(); saveSelectedLdRunway(); closeMenu();
    perfInput.to_runway = { id: null, ident: '', heading: 0, elev: 0, slope: 0, tora: 0, lda: 0, surface: 'paved', group: null };
    perfInput.ld_runway = { id: null, ident: '', heading: 0, elev: 0, slope: 0, tora: 0, lda: 0, surface: 'paved', group: null };
    if (mode === 'performance') renderPerformance();
    alert('All saved runways cleared.');
  }

  function importRunways(){
    // Used from inside the Manage Runways modal — file picker via element
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    input.onchange = e => importRunwaysFile(e);
    input.click();
  }

  function openConfig(forNew){
    editingId = forNew ? null : selectedId;
    const ac = editingId ? fleet.find(a => a.id === editingId) : null;
    const blank = {
      reg: '', type: '', units: 'imperial',
      empty_weight: 0, empty_arm: 0,
      fuel_lb_per_gal: 6.0, fuel_kg_per_litre: 0.72,
      usable_fuel: 0, fuel_total: 0, fuel_unusable: 0, fuel_arm: 0, burn_rate: 0,
      mtow: 0, mlw: 0, mzfw: null, reserve_minutes: 30,
      scenarios: [],
      pchart_id: null,
      afm_id: null,
      crosswind_demonstrated_kt: null,
      crosswind_club_kt: null,
      group: null,
      stations: [{ name: 'Pilot + front pax', arm: 0, min: 0, max: 0, default: 0 }],
      envelope: [{ w: 0, fwd: 0, aft: 0 }]
    };
    const a = ac ? JSON.parse(JSON.stringify(ac)) : blank;
    document.getElementById('config-title').textContent = ac ? `Edit ${ac.reg}` : 'New aircraft';
    document.getElementById('btn-delete-ac').classList.toggle('hidden', !ac);
    document.getElementById('config-body').innerHTML = configForm(a);
    bindConfigEvents(a);
    document.getElementById('config-modal').classList.remove('hidden');
    window._editingAircraft = a;
  }
  function closeConfig(){ document.getElementById('config-modal').classList.add('hidden'); }

  function configForm(a){
    const isMetric = a.units === 'metric';
    const wU = isMetric ? 'kg' : 'lb';
    const aU = isMetric ? 'mm' : 'in';
    const vU = isMetric ? 'L' : 'gal';
    const fU = isMetric ? 'lph' : 'gph';

    return `
      <div class="row">
        <div><label>Registration</label><input type="text" id="cfg-reg" value="${a.reg||''}" placeholder="G-XXXX"></div>
        <div><label>Type</label><input type="text" id="cfg-type" value="${a.type||''}" placeholder="C172N"></div>
      </div>
      <div class="row">
        <div><label>Units</label>
          <select id="cfg-units"><option value="imperial" ${!isMetric?'selected':''}>Imperial (lb / in / gal)</option><option value="metric" ${isMetric?'selected':''}>Metric (kg / mm / L)</option></select>
        </div>
        <div><label>Fuel density (${isMetric?'kg/L':'lb/gal'})</label>
          <input type="number" inputmode="decimal" step="0.01" id="cfg-fdens" value="${isMetric ? a.fuel_kg_per_litre : a.fuel_lb_per_gal}">
        </div>
      </div>
      <hr>
      <h3 style="font-size:14px;margin:4px 0 8px">Airframe</h3>
      <div class="row">
        <div><label>Empty weight (${wU})</label><input type="number" inputmode="decimal" id="cfg-ew" value="${a.empty_weight}" step="0.1"></div>
        <div><label>Empty arm (${aU})</label><input type="number" inputmode="decimal" id="cfg-ea" value="${a.empty_arm}" step="0.01"></div>
      </div>
      <div class="row">
        <div><label>MTOW (${wU})</label><input type="number" inputmode="decimal" id="cfg-mtow" value="${a.mtow}" step="1"></div>
        <div><label>MLW (${wU})</label><input type="number" inputmode="decimal" id="cfg-mlw" value="${a.mlw||''}" step="1" placeholder="same as MTOW"></div>
      </div>
      <div class="row">
        <div><label>MZFW (${wU}) — optional</label><input type="number" inputmode="decimal" id="cfg-mzfw" value="${a.mzfw||''}" step="1" placeholder="if applicable"></div>
        <div><label>Reserve minutes</label><input type="number" inputmode="decimal" id="cfg-reserve" value="${a.reserve_minutes||30}" step="5"></div>
      </div>
      <hr>
      <h3 style="font-size:14px;margin:4px 0 8px">Fuel</h3>
      <div class="row">
        <div><label>Total capacity (${vU})</label><input type="number" inputmode="decimal" id="cfg-uf-total" value="${(a.fuel_total ?? (a.usable_fuel + (a.fuel_unusable||0)))}" step="0.5"><small class="help" id="cfg-usable-info">usable = total − unusable</small></div>
        <div><label>Unusable (${vU})</label><input type="number" inputmode="decimal" id="cfg-uf-unusable" value="${a.fuel_unusable ?? 0}" step="0.1"><small class="help">included in empty weight</small></div>
      </div>
      <div class="row">
        <div><label>Fuel arm (${aU})</label><input type="number" inputmode="decimal" id="cfg-fa" value="${a.fuel_arm}" step="0.01"></div>
        <div class="narrow"><label>Burn (${fU})</label><input type="number" inputmode="decimal" id="cfg-burn" value="${a.burn_rate}" step="0.1"></div>
      </div>
      <hr>
      <h3 style="font-size:14px;margin:4px 0 8px">Performance</h3>
      <div class="row">
        <div><label>P-chart data</label>
          <select id="cfg-pchart">
            <option value="">— none —</option>
            ${Object.keys(window.PCHART_DATA||{}).map(k => { const d = window.PCHART_DATA[k]; return `<option value="${k}" ${a.pchart_id===k?'selected':''}>${k} — ${d.name||''}</option>`; }).join('')}
          </select>
        </div>
        <div><label>Flight Manual data</label>
          <select id="cfg-afm">
            <option value="">— none —</option>
            ${Object.keys(window.AFM_DATA||{}).map(k => { const d = window.AFM_DATA[k]; return `<option value="${k}" ${a.afm_id===k?'selected':''}>${k} — ${d.name||''}</option>`; }).join('')}
          </select>
        </div>
      </div>
      <div id="cfg-perf-info" style="font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:8px"></div>
      <small class="help" style="margin-bottom:8px">P-chart includes CASO 4 factors. Flight Manual uses raw distances + AC91-3 factors applied by the app. When both are set, you can switch on the Performance tab.</small>
      <div class="row">
        <div><label>Demonstrated crosswind (kt)</label><input type="number" inputmode="decimal" step="1" id="cfg-xw-demo" value="${a.crosswind_demonstrated_kt ?? ''}" placeholder="from Flight Manual"></div>
        <div><label>Club crosswind limit (kt)</label><input type="number" inputmode="decimal" step="1" id="cfg-xw-club" value="${a.crosswind_club_kt ?? ''}" placeholder="if lower than demo"></div>
      </div>
      <div class="row">
        <div><label>Aircraft Group (NZ)</label>
          <select id="cfg-group">
            <option value="">— not set —</option>
            ${[1,2,3,4,5,6,7,8].map(g => `<option value="${g}" ${a.group===g?'selected':''}>${g}</option>`).join('')}
          </select>
          <small class="help">used for aerodrome group check (AC139-7). Aircraft can use runways of equal or higher group.</small>
        </div>
        <div></div>
      </div>
      <hr>
      <h3 style="font-size:14px;margin:4px 0 8px">Stations <button class="icon-btn" onclick="App.addStation()" aria-label="Add station">+</button></h3>
      <small class="help" style="margin-bottom:6px">Values from Flight Manual.</small>
      <div id="cfg-stations"></div>
      <hr>
      <h3 style="font-size:14px;margin:4px 0 8px">CG envelope <button class="icon-btn" onclick="App.addEnvPoint()" aria-label="Add point">+</button></h3>
      <small class="help" style="margin-bottom:6px">Envelope vertices from Flight Manual, in increasing weight. fwd = forward CG limit, aft = rear CG limit at that weight.</small>
      <div id="cfg-envelope"></div>
    `;
  }

  function bindConfigEvents(a){
    document.getElementById('cfg-units').onchange = e => {
      const oldUnits = a.units;
      const newUnits = e.target.value;
      if (oldUnits !== newUnits){
        const toMetric = (newUnits === 'metric');
        const kw = toMetric ? 0.4535924 : 1/0.4535924;    // lb→kg or kg→lb
        const ka = toMetric ? 25.4 : 1/25.4;              // in→mm or mm→in
        const kv = toMetric ? 3.785412 : 1/3.785412;      // gal→L or L→gal
        const kf = toMetric ? (1/(1/0.4535924 * 3.785412)) : (1/0.4535924 * 3.785412); // lb/gal ↔ kg/L (1 lb/gal ≈ 0.1198 kg/L)
        a.empty_weight = +(a.empty_weight * kw).toFixed(1);
        a.empty_arm    = +(a.empty_arm    * ka).toFixed(1);
        a.mtow         = Math.round(a.mtow * kw);
        if (a.mlw) a.mlw = Math.round(a.mlw * kw);
        if (a.mzfw) a.mzfw = Math.round(a.mzfw * kw);
        a.usable_fuel  = +(a.usable_fuel  * kv).toFixed(1);
        if (a.fuel_total !== undefined) a.fuel_total = +(a.fuel_total * kv).toFixed(1);
        if (a.fuel_unusable !== undefined) a.fuel_unusable = +(a.fuel_unusable * kv).toFixed(1);
        a.fuel_arm     = +(a.fuel_arm     * ka).toFixed(1);
        a.burn_rate    = +(a.burn_rate    * kv).toFixed(1);
        a.stations.forEach(s => {
          s.arm = +(s.arm * ka).toFixed(1);
          if (s.max) s.max = Math.round(s.max * kw);
          if (s.min) s.min = Math.round(s.min * kw);
          if (s.default) s.default = Math.round(s.default * kw);
        });
        a.envelope.forEach(p => {
          p.w = Math.round(p.w * kw);
          p.fwd = +(p.fwd * ka).toFixed(1);
          p.aft = +(p.aft * ka).toFixed(1);
        });
      }
      a.units = newUnits;
      document.getElementById('config-body').innerHTML = configForm(a);
      bindConfigEvents(a);
      renderStationEditors(a);
      renderEnvEditor(a);
    };
    const updateUsableHint = () => {
      const t = parseFloat(document.getElementById('cfg-uf-total')?.value) || 0;
      const u = parseFloat(document.getElementById('cfg-uf-unusable')?.value) || 0;
      const hint = document.getElementById('cfg-usable-info');
      if (hint){
        const vU = a.units === 'metric' ? 'L' : 'gal';
        hint.innerHTML = `usable = <strong>${Math.max(0, t - u).toFixed(1)} ${vU}</strong> (total − unusable)`;
      }
    };
    document.getElementById('cfg-uf-total')?.addEventListener('input', updateUsableHint);
    document.getElementById('cfg-uf-unusable')?.addEventListener('input', updateUsableHint);
    updateUsableHint();
    const updatePerfInfo = () => {
      const pid = document.getElementById('cfg-pchart')?.value;
      const aid = document.getElementById('cfg-afm')?.value;
      const lines = [];
      if (pid && window.PCHART_DATA?.[pid]){
        const d = window.PCHART_DATA[pid];
        lines.push(`✓ P-chart: <strong>${d.name||pid}</strong>${d.source ? ' — '+d.source : ''}`);
      }
      if (aid && window.AFM_DATA?.[aid]){
        const d = window.AFM_DATA[aid];
        lines.push(`✓ Flight Manual: <strong>${d.name||aid}</strong>${d.source ? ' — '+d.source : ''}`);
      }
      if (lines.length === 0) lines.push('No performance data selected.');
      const host = document.getElementById('cfg-perf-info');
      if (host) host.innerHTML = lines.join('<br>');
    };
    document.getElementById('cfg-pchart')?.addEventListener('change', updatePerfInfo);
    document.getElementById('cfg-afm')?.addEventListener('change', updatePerfInfo);
    updatePerfInfo();
    renderStationEditors(a);
    renderEnvEditor(a);
  }
  function renderStationEditors(a){
    const host = document.getElementById('cfg-stations');
    const isMetric = a.units === 'metric';
    const wU = isMetric ? 'kg' : 'lb';
    const aU = isMetric ? 'mm' : 'in';
    host.innerHTML = a.stations.map((s, idx) => `
      <div class="station">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <input type="text" value="${s.name}" data-sidx="${idx}" data-f="name" placeholder="Station name" style="flex:1">
          <button class="icon-btn" onclick="App.removeStation(${idx})" aria-label="Remove station" title="Remove">✕</button>
        </div>
        <div class="row">
          <div><label>Arm (${aU})</label><input type="number" inputmode="decimal" step="0.01" value="${s.arm}" data-sidx="${idx}" data-f="arm"></div>
          <div><label>Max load (${wU})</label><input type="number" inputmode="decimal" step="1" value="${s.max}" data-sidx="${idx}" data-f="max"></div>
          <div class="narrow"><label>Default</label><input type="number" inputmode="decimal" step="1" value="${s.default||0}" data-sidx="${idx}" data-f="default"></div>
        </div>
      </div>
    `).join('');
    host.querySelectorAll('input').forEach(inp => {
      inp.oninput = e => {
        const idx = +e.target.dataset.sidx, f = e.target.dataset.f;
        a.stations[idx][f] = f === 'name' ? e.target.value : (parseFloat(e.target.value) || 0);
      };
    });
  }
  function renderEnvEditor(a){
    const host = document.getElementById('cfg-envelope');
    const isMetric = a.units === 'metric';
    const wU = isMetric ? 'kg' : 'lb';
    const aU = isMetric ? 'mm' : 'in';
    host.innerHTML = a.envelope.map((p, idx) => `
      <div class="row">
        <div><label>Weight (${wU})</label><input type="number" inputmode="decimal" step="1" value="${p.w}" data-eidx="${idx}" data-f="w"></div>
        <div><label>fwd CG (${aU})</label><input type="number" inputmode="decimal" step="0.01" value="${p.fwd}" data-eidx="${idx}" data-f="fwd"></div>
        <div><label>aft CG (${aU})</label><input type="number" inputmode="decimal" step="0.01" value="${p.aft}" data-eidx="${idx}" data-f="aft"></div>
        <div class="narrow" style="flex:0 0 60px"><label>&nbsp;</label><button class="btn danger" onclick="App.removeEnvPoint(${idx})" style="padding:9px 6px;font-size:12px;width:100%">×</button></div>
      </div>
    `).join('');
    host.querySelectorAll('input').forEach(inp => {
      inp.oninput = e => {
        const idx = +e.target.dataset.eidx, f = e.target.dataset.f;
        a.envelope[idx][f] = parseFloat(e.target.value) || 0;
      };
    });
  }
  function addStation(){
    const a = window._editingAircraft;
    a.stations.push({ name: 'New station', arm: 0, min: 0, max: 0, default: 0 });
    renderStationEditors(a);
  }
  function removeStation(idx){
    const a = window._editingAircraft;
    a.stations.splice(idx, 1);
    renderStationEditors(a);
  }
  function addEnvPoint(){
    const a = window._editingAircraft;
    a.envelope.push({ w: 0, fwd: 0, aft: 0 });
    renderEnvEditor(a);
  }
  function removeEnvPoint(idx){
    const a = window._editingAircraft;
    if (a.envelope.length <= 2){ alert('Envelope needs at least 2 points.'); return; }
    a.envelope.splice(idx, 1);
    renderEnvEditor(a);
  }
  function saveConfig(){
    const a = window._editingAircraft;
    a.reg = document.getElementById('cfg-reg').value || 'G-NEW';
    a.type = document.getElementById('cfg-type').value || 'Unknown';
    a.units = document.getElementById('cfg-units').value;
    const fdens = parseFloat(document.getElementById('cfg-fdens').value) || (a.units==='metric'?0.72:6.0);
    if (a.units === 'metric') a.fuel_kg_per_litre = fdens; else a.fuel_lb_per_gal = fdens;
    a.empty_weight = parseFloat(document.getElementById('cfg-ew').value) || 0;
    a.empty_arm = parseFloat(document.getElementById('cfg-ea').value) || 0;
    a.mtow = parseFloat(document.getElementById('cfg-mtow').value) || 0;
    const mlw = parseFloat(document.getElementById('cfg-mlw').value);
    a.mlw = isNaN(mlw) ? a.mtow : mlw;
    const mzfw = parseFloat(document.getElementById('cfg-mzfw').value);
    a.mzfw = isNaN(mzfw) ? null : mzfw;
    a.reserve_minutes = parseFloat(document.getElementById('cfg-reserve').value) || 30;
    const fuelTotal = parseFloat(document.getElementById('cfg-uf-total').value) || 0;
    const fuelUnusable = parseFloat(document.getElementById('cfg-uf-unusable').value) || 0;
    a.fuel_total = fuelTotal;
    a.fuel_unusable = fuelUnusable;
    a.usable_fuel = Math.max(0, fuelTotal - fuelUnusable);
    a.fuel_arm = parseFloat(document.getElementById('cfg-fa').value) || 0;
    a.burn_rate = parseFloat(document.getElementById('cfg-burn').value) || 0;
    // Performance fields
    const pcEl = document.getElementById('cfg-pchart');
    if (pcEl) a.pchart_id = pcEl.value || null;
    const afmEl = document.getElementById('cfg-afm');
    if (afmEl) a.afm_id = afmEl.value || null;
    const xwDemo = parseFloat(document.getElementById('cfg-xw-demo')?.value);
    a.crosswind_demonstrated_kt = isNaN(xwDemo) ? null : xwDemo;
    const xwClub = parseFloat(document.getElementById('cfg-xw-club')?.value);
    a.crosswind_club_kt = isNaN(xwClub) ? null : xwClub;
    const grpVal = document.getElementById('cfg-group')?.value;
    a.group = grpVal === '' || grpVal === undefined ? null : parseInt(grpVal, 10);

    if (editingId){
      const i = fleet.findIndex(x => x.id === editingId);
      a.id = editingId;
      fleet[i] = a;
    } else {
      a.id = 'ac-' + Date.now();
      fleet.push(a);
      selectedId = a.id;
      saveSelected();
    }
    save();
    closeConfig();
    delete stationValues[a.id]; // clear cached station values so defaults apply
    delete fuelInput[a.id];
    renderAll();
  }
  function deleteAircraft(){
    if (!editingId) return;
    if (!confirm('Delete this aircraft? This cannot be undone.')) return;
    fleet = fleet.filter(a => a.id !== editingId);
    if (selectedId === editingId) selectedId = fleet[0] && fleet[0].id || null;
    save(); saveSelected(); closeConfig(); renderAll();
  }
  function newAircraft(){ openConfig(true); }

  function duplicateAircraft(){
    if (!selectedId) return;
    const src = fleet.find(a => a.id === selectedId);
    if (!src) return;
    const newReg = prompt(`Duplicate "${src.reg}". Enter a new registration:`, src.reg + '-copy');
    if (!newReg) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'ac-' + Date.now();
    copy.reg = newReg.trim();
    copy.scenarios = []; // start fresh — scenarios are usually airframe-specific in spirit
    fleet.push(copy);
    selectedId = copy.id;
    save(); saveSelected(); renderAll();
  }

  function saveConfigAsCopy(){
    // Called from inside the config editor. Save the currently-editing aircraft as a NEW airframe
    // instead of overwriting the original.
    const a = window._editingAircraft;
    if (!a) return;
    const baseReg = document.getElementById('cfg-reg').value || 'G-NEW';
    const newReg = prompt('Save as copy. Enter a registration for the new aircraft:', baseReg + '-copy');
    if (!newReg) return;
    editingId = null; // force the save path to treat this as a new aircraft
    document.getElementById('cfg-reg').value = newReg.trim();
    a.scenarios = []; // fresh scenario list on the copy
    saveConfig();
  }

  // ---- import/export ----
  // --- Multi-select picker ---
  let _pickerCtx = null;
  function openPicker({title, subtitle, items, confirmLabel, onConfirm}){
    _pickerCtx = { items, onConfirm };
    document.getElementById('picker-title').textContent = title || 'Select';
    document.getElementById('picker-subtitle').textContent = subtitle || '';
    document.getElementById('picker-confirm-btn').textContent = confirmLabel || 'OK';
    renderPickerList();
    document.getElementById('picker-modal').classList.remove('hidden');
  }
  function renderPickerList(){
    if (!_pickerCtx) return;
    const host = document.getElementById('picker-list');
    host.innerHTML = _pickerCtx.items.map((it, i) => `
      <label style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:4px;cursor:pointer">
        <input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}>
        <div style="flex:1">
          <div style="font-weight:600">${it.label}</div>
          ${it.detail ? `<div style="font-size:11px;color:var(--muted)">${it.detail}</div>` : ''}
        </div>
      </label>
    `).join('');
    host.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', e => { _pickerCtx.items[+e.target.dataset.i].checked = e.target.checked; });
    });
  }
  function pickerSelectAll(v){
    if (!_pickerCtx) return;
    _pickerCtx.items.forEach(it => it.checked = v);
    renderPickerList();
  }
  function cancelPicker(){
    document.getElementById('picker-modal').classList.add('hidden');
    _pickerCtx = null;
  }
  function confirmPicker(){
    if (!_pickerCtx) return;
    const chosen = _pickerCtx.items.filter(it => it.checked).map(it => it.value);
    const cb = _pickerCtx.onConfirm;
    document.getElementById('picker-modal').classList.add('hidden');
    _pickerCtx = null;
    if (cb) cb(chosen);
  }

  function exportData(){
    if (fleet.length === 0){ alert('No aircraft to export.'); return; }
    openPicker({
      title: 'Export aircraft',
      subtitle: 'Choose which aircraft to include in the export file.',
      confirmLabel: 'Export',
      items: fleet.map(a => ({
        value: a.id, checked: true,
        label: `${a.reg || '(no reg)'} — ${a.type || ''}`,
        detail: `Empty ${a.empty_weight} ${u(a).w} · MTOW ${a.mtow}${a.pchart_id ? ' · P-chart' : ''}${a.afm_id ? ' · FM' : ''}`,
      })),
      onConfirm: (ids) => {
        if (ids.length === 0) return;
        const subset = fleet.filter(a => ids.includes(a.id));
        const blob = new Blob([JSON.stringify(subset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'wb-fleet-' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    });
    closeMenu();
  }
  function importData(e){
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('not an array');
        openPicker({
          title: 'Import aircraft',
          subtitle: `${data.length} aircraft in this file. Choose which to add. Existing aircraft with the same registration will be replaced.`,
          confirmLabel: 'Import',
          items: data.map(a => {
            const exists = fleet.find(x => x.reg === a.reg);
            return {
              value: a, checked: true,
              label: `${a.reg || '(no reg)'} — ${a.type || ''}${exists ? ' ⚠ replaces existing' : ''}`,
              detail: `Empty ${a.empty_weight || '?'} · MTOW ${a.mtow || '?'}${a.pchart_id ? ' · P-chart' : ''}${a.afm_id ? ' · FM' : ''}`,
            };
          }),
          onConfirm: (chosen) => {
            chosen.forEach(incoming => {
              const idx = fleet.findIndex(x => x.reg === incoming.reg);
              const ac = migrate({ ...incoming, id: idx >= 0 ? fleet[idx].id : ('ac-' + Math.random().toString(36).slice(2, 9)) });
              if (idx >= 0) fleet[idx] = ac; else fleet.push(ac);
            });
            if (!fleet.find(a => a.id === selectedId)) selectedId = fleet[0] && fleet[0].id || null;
            save(); saveSelected(); closeMenu(); renderAll();
            alert(`Imported ${chosen.length} aircraft.`);
          },
        });
      } catch(err){ alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
    // Reset input so the same file can be picked again later
    e.target.value = '';
  }
  function restoreDefaults(){
    if (!confirm('Replace your fleet with the default sample aircraft? Your current configurations will be lost.')) return;
    fleet = JSON.parse(JSON.stringify(DEFAULT_FLEET));
    selectedId = fleet[0].id;
    save(); saveSelected(); closeMenu(); renderAll();
  }

  function openMenu(){ document.getElementById('menu-modal').classList.remove('hidden'); }
  function closeMenu(){ document.getElementById('menu-modal').classList.add('hidden'); }

  // ---- main render ----
  function update(){ renderResults(); }
  function renderAll(){
    renderAircraftDropdown();
    if (selectedId){
      renderStations();
      renderFuelControls();
      renderResults();
      renderScenarioSelect();
      if (mode === 'performance') renderPerformance();
    }
  }
  function setMode(m){
    mode = m;
    document.querySelectorAll('.tab-bar button').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    const isPerf = (m === 'performance');
    // W&B cards visible in non-perf modes
    document.getElementById('stations-card').classList.toggle('hidden', isPerf);
    document.getElementById('fuel-card').classList.toggle('hidden', isPerf);
    document.getElementById('results-card').classList.toggle('hidden', isPerf);
    document.getElementById('envelope-card').classList.toggle('hidden', isPerf);
    document.getElementById('banner-host').classList.toggle('hidden', isPerf);
    // Perf cards visible only in perf mode
    document.getElementById('perf-cards').classList.toggle('hidden', !isPerf);
    // Scenario bar hidden in perf mode (scenarios only apply to W&B)
    document.querySelector('.scenario-bar').classList.toggle('hidden', isPerf);
    if (isPerf){
      renderPerformance();
    } else {
      renderFuelControls();
      renderResults();
    }
  }

  function init(){
    load();
    document.getElementById('btn-menu').onclick = openMenu;
    const vEl = document.getElementById('version-label');
    if (vEl) vEl.textContent = APP_VERSION;
    renderAll();
    if ('serviceWorker' in navigator){
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  }

  return {
    init, setMode, newAircraft, openConfig, closeConfig, saveConfig, saveConfigAsCopy, deleteAircraft, duplicateAircraft,
    selectAircraft, toggleAcMenu, closeAcMenu,
    openManageAircraft, closeManageAircraft, manageSelect, manageEdit, manageDuplicate, manageDelete,
    addStation, removeStation, addEnvPoint, removeEnvPoint,
    exportData, importData, restoreDefaults, closeMenu,
    saveScenario, loadScenario, deleteScenario,
    printSheet,
    setWindMode, setPerfMethod, loadSavedRunway, reverseRunway, copyRunway,
    newRunway, editCurrentRunway, duplicateCurrentRunway,
    openRunwayConfig, closeRunwayConfig, saveRunwayConfig, saveRunwayConfigAsCopy, deleteRunway,
    toggleRwyMenu, closeRwyMenu,
    openManageRunways, closeManageRunways, manageRunwaySelect, manageRunwayEdit, manageRunwayDuplicate, manageRunwayDelete,
    exportRunways, importRunways, importRunwaysFile, restoreDefaultRunways,
    pickerSelectAll, cancelPicker, confirmPicker,
  };
})();

window.addEventListener('DOMContentLoaded', App.init);
