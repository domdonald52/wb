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
const SELECTED_RUNWAY_KEY = 'wb_selected_runway_v1';
const MAX_RECENT_RUNWAYS = 5;

const App = (function(){
  let fleet = [];
  let selectedId = null;
  let mode = 'forward';
  let stationValues = {};   // {ac_id: {station_idx: weight}}
  let fuelInput = {};       // {ac_id: {fuel: x, duration: y}}
  let legsInput = {};       // {ac_id: [{name, duration, uplift_after}]}
  let perfInput = {         // performance tab inputs (single, not per-aircraft)
    runway: { ident: '', heading: 160, elev: 0, slope: 0, tora: 0, lda: 0, surface: 'paved', condition: 'dry', group: null },
    conditions: { oat: null, qnh: 1013 },  // oat=null means default to ISA at elev
    wind: { mode: 'dirspeed', dir: 0, speed: 0, headwind_component: 0 },
    op_type: 'private',     // 'private' or 'air_transport'
    op_time: 'day',         // 'day' or 'night'
    perf_method: 'pchart',  // 'pchart' or 'afm' — auto-selected per-aircraft if only one exists
    use_landing_weight_for_landing: true,
  };
  let recentRunways = [];
  let runways = [];                  // user-saved runway database
  let selectedRunwayId = null;       // currently selected saved runway on Perf tab
  let editingRunwayId = null;        // runway being edited in modal
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
    selectedRunwayId = localStorage.getItem(SELECTED_RUNWAY_KEY) || null;
    if (selectedRunwayId && !runways.find(r => r.id === selectedRunwayId)) selectedRunwayId = null;
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(fleet)); }
  function saveSelected(){ if (selectedId) localStorage.setItem(SELECTED_KEY, selectedId); }
  function saveRecentRunways(){ localStorage.setItem(RECENT_RUNWAYS_KEY, JSON.stringify(recentRunways)); }
  function saveRunways(){ localStorage.setItem(RUNWAYS_KEY, JSON.stringify(runways)); }
  function saveSelectedRunway(){ if (selectedRunwayId) localStorage.setItem(SELECTED_RUNWAY_KEY, selectedRunwayId); else localStorage.removeItem(SELECTED_RUNWAY_KEY); }

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
            <input type="number" inputmode="decimal" id="in-fuel" value="${fc.fuel}" min="0" max="${ac.usable_fuel}" step="0.5">
            <small class="help">tank ${fmt(ac.usable_fuel,1)} ${u(ac).vol} usable · burn ${fmt(ac.burn_rate,1)} ${u(ac).flow}${(ac.fuel_unusable||0) > 0 ? ` · dipstick − ${fmt(ac.fuel_unusable,1)} = usable` : ''}</small>
          </div>
          <div>
            <label>Flight duration (hours)</label>
            <input type="number" inputmode="decimal" id="in-dur" value="${fc.duration}" min="0" max="10" step="0.25">
            <small class="help">Burn: ${fmt(fc.duration * ac.burn_rate, 1)} ${u(ac).vol} × ${fmt(u(ac).fuel_density, 2)} = <strong>${fmt(fc.duration * ac.burn_rate * u(ac).fuel_density, 1)} ${u(ac).w}</strong></small>
          </div>
        </div>
      `;
      host.querySelector('#in-fuel').addEventListener('input', e => { fc.fuel = parseFloat(e.target.value) || 0; update(); });
      host.querySelector('#in-dur').addEventListener('input', e => {
        fc.duration = parseFloat(e.target.value) || 0;
        const burnVol = fc.duration * ac.burn_rate;
        const burnWt = burnVol * u(ac).fuel_density;
        e.target.nextElementSibling.innerHTML = `Burn: ${fmt(burnVol, 1)} ${u(ac).vol} × ${fmt(u(ac).fuel_density, 2)} = <strong>${fmt(burnWt, 1)} ${u(ac).w}</strong>`;
        update();
      });
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
  function printSheet(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac) return;
    document.getElementById('print-acline').textContent = `${ac.reg} — ${ac.type}`;
    document.getElementById('print-when').textContent = new Date().toLocaleString();

    // Build loading summary line(s) so the print sheet shows what produced the numbers
    const sv = stationValues[ac.id] || {};
    const fc = fuelInput[ac.id] || {};
    const stationStr = ac.stations.map((s, i) => {
      const w = sv[i] !== undefined ? sv[i] : (s.default || 0);
      return `${s.name}: ${fmt(w)} ${u(ac).w}`;
    }).join(' · ');
    let loadingHtml = `<strong>Loading:</strong> ${stationStr}`;

    if (mode === 'multileg'){
      const legs = legsInput[ac.id] || [];
      const startFuel = fc.fuel !== undefined ? fc.fuel : ac.usable_fuel;
      const legParts = legs.map((l, i) => {
        const uplift = (i > 0 && l.uplift_before > 0) ? ` (+${fmt(l.uplift_before,1)} ${u(ac).vol})` : '';
        return `${l.name || 'Leg '+(i+1)}: ${fmt(l.duration,2)} h${uplift}`;
      }).join(' · ');
      loadingHtml += `<br><strong>Start fuel:</strong> ${fmt(startFuel,1)} ${u(ac).vol} · <strong>Legs:</strong> ${legParts}`;
    } else {
      const fuel = fc.fuel !== undefined ? fc.fuel : ac.usable_fuel;
      const dur = fc.duration !== undefined ? fc.duration : 1.0;
      loadingHtml += `<br><strong>Fuel:</strong> ${fmt(fuel,1)} ${u(ac).vol} · <strong>Flight time:</strong> ${fmt(dur,2)} h · <strong>Mode:</strong> ${mode === 'reverse' ? 'Max-fuel calculation' : 'Plan flight'}`;
    }
    document.getElementById('print-loading').innerHTML = loadingHtml;

    // Populate the print banner with pass/fail summary
    const pb = document.getElementById('print-banner');
    let violations = [];
    if (mode === 'multileg'){
      violations = calcMultileg(ac).violations;
    } else {
      violations = calc(ac).violations;
    }
    if (violations.length === 0){
      pb.className = 'print-only ok';
      pb.textContent = '✓ Within all limits.';
    } else {
      pb.className = 'print-only bad';
      pb.innerHTML = '<strong>⚠ Out of limits:</strong> ' + violations.join(' · ');
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

    // Bind runway form fields
    const r = perfInput.runway;
    document.getElementById('rwy-ident').value = r.ident || '';
    document.getElementById('rwy-hdg').value = r.heading ?? '';
    document.getElementById('rwy-elev').value = r.elev ?? '';
    document.getElementById('rwy-slope').value = r.slope ?? '';
    document.getElementById('rwy-tora').value = r.tora ?? '';
    document.getElementById('rwy-lda').value = r.lda ?? '';
    document.getElementById('rwy-surface').value = r.surface || 'paved';
    document.getElementById('rwy-condition').value = r.condition || 'dry';
    document.getElementById('rwy-group').value = r.group ?? '';

    document.getElementById('cond-oat').value = perfInput.conditions.oat ?? '';
    document.getElementById('cond-qnh').value = perfInput.conditions.qnh ?? 1013;

    document.getElementById('perf-op-type').value = perfInput.op_type;
    document.getElementById('perf-op-time').value = perfInput.op_time;

    // Saved runways picker
    renderSavedRunwaysPicker();

    renderWindInputs();
    bindPerfHandlers();
    computeAndRenderPerf();
  }

  function renderSavedRunwaysPicker(){
    const sel = document.getElementById('saved-rwy-select');
    if (!sel) return;
    const surfaceLabel = s => ({paved:'Paved', grass:'Grass', metal:'Metal', rolled_earth:'Rolled earth', coral:'Coral'}[s] || s || 'Paved');
    sel.innerHTML = '<option value="">— enter a new runway below —</option>' +
      runways.map(rw => {
        const parts = (rw.ident || '').trim().split(/\s+/);
        const icao = parts[0] || '?';
        const dir = parts.slice(1).join(' ') || '?';
        return `<option value="${rw.id}" ${rw.id===selectedRunwayId?'selected':''}>${icao} - ${dir} - ${surfaceLabel(rw.surface)}</option>`;
      }).join('');
    sel.value = selectedRunwayId || '';
  }

  function bindPerfHandlers(){
    const fields = ['rwy-ident','rwy-hdg','rwy-elev','rwy-slope','rwy-tora','rwy-lda','rwy-surface','rwy-condition','rwy-group','cond-oat','cond-qnh','perf-op-type','perf-op-time'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.oninput = onPerfFieldChange;
      el.onchange = onPerfFieldChange;
    });
  }

  function onPerfFieldChange(){
    const r = perfInput.runway;
    r.ident = document.getElementById('rwy-ident').value;
    r.heading = parseFloat(document.getElementById('rwy-hdg').value) || 0;
    r.elev = parseFloat(document.getElementById('rwy-elev').value) || 0;
    r.slope = parseFloat(document.getElementById('rwy-slope').value) || 0;
    r.tora = parseFloat(document.getElementById('rwy-tora').value) || 0;
    r.lda = parseFloat(document.getElementById('rwy-lda').value) || 0;
    r.surface = document.getElementById('rwy-surface').value;
    r.condition = document.getElementById('rwy-condition').value;
    const grpVal = document.getElementById('rwy-group').value;
    r.group = grpVal === '' ? null : parseInt(grpVal, 10);
    const oat_val = document.getElementById('cond-oat').value;
    perfInput.conditions.oat = oat_val === '' ? null : parseFloat(oat_val);
    perfInput.conditions.qnh = parseFloat(document.getElementById('cond-qnh').value) || 1013;
    perfInput.op_type = document.getElementById('perf-op-type').value;
    perfInput.op_time = document.getElementById('perf-op-time').value;
    computeAndRenderPerf();
  }

  function setWindMode(m){
    perfInput.wind.mode = m;
    document.querySelectorAll('[data-wind-mode]').forEach(b => {
      const isActive = b.dataset.windMode === m;
      b.style.background = isActive ? 'var(--accent-2)' : '';
      b.style.color = isActive ? '#fff' : '';
    });
    renderWindInputs();
    computeAndRenderPerf();
  }

  function renderWindInputs(){
    const host = document.getElementById('wind-inputs');
    if (!host) return;
    if (perfInput.wind.mode === 'dirspeed'){
      host.innerHTML = `
        <div class="row">
          <div><label>Direction (°M)</label><input type="number" inputmode="decimal" id="wind-dir" min="0" max="360" step="10" value="${perfInput.wind.dir || ''}"><small class="help">degrees magnetic (match runway hdg)</small></div>
          <div><label>Speed (kt)</label><input type="number" inputmode="decimal" id="wind-spd" min="0" step="1" value="${perfInput.wind.speed || ''}"><small class="help">wind speed in knots</small></div>
        </div>
      `;
      document.getElementById('wind-dir').oninput = e => { perfInput.wind.dir = parseFloat(e.target.value) || 0; computeAndRenderPerf(); };
      document.getElementById('wind-spd').oninput = e => { perfInput.wind.speed = parseFloat(e.target.value) || 0; computeAndRenderPerf(); };
    } else {
      host.innerHTML = `
        <div class="row">
          <div><label>Headwind component (kt)</label><input type="number" inputmode="decimal" id="wind-hwc" step="1" value="${perfInput.wind.headwind_component || ''}"><small class="help">negative = tailwind</small></div>
        </div>
      `;
      document.getElementById('wind-hwc').oninput = e => { perfInput.wind.headwind_component = parseFloat(e.target.value) || 0; computeAndRenderPerf(); };
    }
    // Apply button styling
    document.querySelectorAll('[data-wind-mode]').forEach(b => {
      const isActive = b.dataset.windMode === perfInput.wind.mode;
      b.style.background = isActive ? 'var(--accent-2)' : '';
      b.style.color = isActive ? '#fff' : '';
    });
  }

  function computeAndRenderPerf(){
    const ac = fleet.find(a => a.id === selectedId);
    if (!ac) return;
    const r = perfInput.runway;
    const c = perfInput.conditions;
    const P = window.Performance;

    // Wind
    let headwind = 0, crosswind = 0;
    if (perfInput.wind.mode === 'dirspeed'){
      const wc = P.windComponents(r.heading, perfInput.wind.dir, perfInput.wind.speed);
      headwind = wc.headwind;
      crosswind = wc.crosswind;
    } else {
      headwind = perfInput.wind.headwind_component;
      crosswind = 0;
    }
    const wcEl = document.getElementById('wind-components');
    if (wcEl){
      if (perfInput.wind.mode === 'dirspeed' && perfInput.wind.speed > 0){
        wcEl.innerHTML = `→ Headwind: <strong>${headwind.toFixed(1)} kt</strong> · Crosswind: <strong>${crosswind.toFixed(1)} kt</strong>`;
      } else if (perfInput.wind.mode === 'component'){
        wcEl.innerHTML = '';
      } else {
        wcEl.innerHTML = '';
      }
    }

    // Atmospheric
    const pa = P.pressureAltitude(r.elev, c.qnh);
    const isa = P.isaTemp(pa);
    const oat = c.oat === null ? isa : c.oat;
    const da = P.densityAltitude(pa, oat);
    const aiEl = document.getElementById('atmospheric-info');
    if (aiEl){
      aiEl.innerHTML = `PA: <strong>${pa.toFixed(0)}'</strong> · ISA: <strong>${isa.toFixed(0)}°C</strong> · Density Altitude: <strong>${da.toFixed(0)}'</strong>${c.oat===null?' <em>(using ISA — enter OAT to override)</em>':''}`;
    }

    const wet = (r.condition === 'wet' || r.condition === 'long_grass');

    const pdata = ac.pchart_id && window.PCHART_DATA && window.PCHART_DATA[ac.pchart_id];
    const adata = ac.afm_id && window.AFM_DATA && window.AFM_DATA[ac.afm_id];
    const hasP = !!pdata, hasA = !!adata;

    // Determine active method based on availability + user preference
    let activeMethod;
    if (hasP && hasA){
      // Both available — honour user toggle
      activeMethod = perfInput.perf_method === 'afm' ? 'afm' : 'pchart';
    } else if (hasP){
      activeMethod = 'pchart';
    } else if (hasA){
      activeMethod = 'afm';
    } else {
      activeMethod = 'none';
    }
    // Sync state
    if (activeMethod !== 'none') perfInput.perf_method = activeMethod;

    // Render toggle row
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
        });
      } else if (hasP || hasA){
        // Show as info-only (disabled, indicating which one)
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

    // Derive the canonical operation key from the user's choices + runway surface
    const opKey = deriveOperationKey(perfInput.op_type, perfInput.op_time, r.surface);
    const surfaceIsGrass = (r.surface !== 'paved');
    const opLabelMap = {
      private_paved_day:        'Private — Paved — Day',
      air_transport_paved_day:  'Air Transport — Paved — Day',
      private_grass_day:        'Private — Grass — Day',
      air_transport_grass_day:  'Air Transport — Grass — Day',
      all_ops_paved_night:      'All Ops — Paved — Night',
      all_ops_grass_night:      'All Ops — Grass — Night',
    };

    // Annotate the Surface label
    const sln = document.getElementById('surface-label-note');
    if (sln) sln.textContent = activeMethod === 'pchart' ? '· feeds Operation line' : (activeMethod === 'afm' ? '· used directly (AC91-3 factor)' : '');

    // Show derived line
    const opDerived = document.getElementById('perf-op-derived');
    if (opDerived){
      const chartSurfaceNote = (activeMethod === 'pchart' && r.surface !== 'paved' && r.surface !== 'grass')
        ? `<br><span style="color:var(--warn)">⚠ Chart has only Paved and Grass lines — your "${r.surface.replace('_',' ')}" surface is being treated as Grass. Use POH+AC91-3 mode for accurate Metal/Rolled earth/Coral factors.</span>`
        : '';
      opDerived.innerHTML = `→ P-chart line: <strong>${opLabelMap[opKey]}</strong> (auto-set from surface)${chartSurfaceNote}`;
    }

    // Air Transport warning
    const opWarn = document.getElementById('perf-op-warning');
    if (opWarn){
      if (perfInput.op_type === 'air_transport'){
        opWarn.innerHTML = `<div class="banner warn" style="margin:0;font-size:12px">⚠ Air Transport operation selected. This app is normally used for private GA — confirm Air Transport is correct for this flight.</div>`;
      } else {
        opWarn.innerHTML = '';
      }
    }

    let to_result = null, ld_result = null;
    let methodNote = '';

    // Show/hide Operation card: relevant only in P-chart mode
    const opCard = document.getElementById('perf-op-card');
    if (opCard) opCard.classList.toggle('hidden', activeMethod !== 'pchart');

    if (activeMethod === 'pchart'){
      methodNote = `Method: <strong>P-chart</strong> (${pdata.source}). CASO 4 factors are <strong>baked into the chart</strong> — not re-applied. Inputs: pressure altitude, OAT, slope, wind, operation line (set by surface + day/night).`;
      to_result = P.pchartTakeoffDistance(pdata, pa, oat, opKey, r.slope, headwind, wet);
      ld_result = P.pchartLandingDistance(pdata, r.elev, opKey, r.slope, headwind, wet);
    } else if (activeMethod === 'afm'){
      methodNote = `Method: <strong>POH + AC91-3 (CASO 4) factors</strong> (${adata.source}). Inputs: POH base distance × PA correction × temp correction, then × surface (Table 1) × slope (Table 2) × wind (1.5×/0.5×) × wet (+15%).`;
      const afmTo = {
        to_base_msl_isa_m: adata.takeoff.base_msl_isa_m,
        to_pa_correction_pct_per_1000: adata.takeoff.pa_correction_pct_per_1000,
        to_temp_correction_pct_per_10c: adata.takeoff.temp_correction_pct_per_10c,
        to_weight_correction_pct_per_100kg: adata.takeoff.weight_correction_pct_per_100kg || 0,
        mtow_kg: ac.mtow, current_weight_kg: null,
      };
      const afmLd = {
        ld_base_msl_isa_m: adata.landing.base_msl_isa_m,
        ld_pa_correction_pct_per_1000: adata.landing.pa_correction_pct_per_1000,
        ld_temp_correction_pct_per_10c: adata.landing.temp_correction_pct_per_10c,
        ld_weight_correction_pct_per_100kg: adata.landing.weight_correction_pct_per_100kg || 0,
        mtow_kg: ac.mtow, current_landing_weight_kg: null,
      };
      to_result = P.afmFactorsTakeoff(afmTo, pa, oat, r.surface, r.slope, headwind, wet);
      ld_result = P.afmFactorsLanding(afmLd, pa, oat, r.surface, r.slope, headwind, wet);
      // afm functions don't return d_ppd/op_mult; fake them so the breakdown still renders
      if (to_result){ to_result.d_ppd = to_result.distance / (to_result.surf_factor * to_result.slope_factor * to_result.wind_factor * to_result.wet_factor); to_result.op_mult = to_result.surf_factor; }
      if (ld_result){ ld_result.d_ppd = ld_result.distance / (ld_result.surf_factor * ld_result.slope_factor * ld_result.wind_factor * ld_result.wet_factor); ld_result.op_mult = ld_result.surf_factor; }
    } else {
      methodNote = `Method: <strong>none</strong>. Set a P-chart or POH data source in the aircraft config.`;
    }

    const host = document.getElementById('perf-results');
    if (activeMethod === 'none'){
      host.innerHTML =
        `<div style="background:var(--panel-2);padding:8px 10px;border-radius:8px;margin-bottom:8px;font-size:11px;line-height:1.5">${methodNote}</div>` +
        `<div class="banner warn" style="margin:0">No performance data computed for this aircraft. Set a P-chart or POH data source in the aircraft configuration.</div>`;
      document.getElementById('perf-breakdown').innerHTML = '';
    } else {
      const stat = (label, distance, available, ok, sub) => {
        const margin = available > 0 ? (1 - distance/available) * 100 : null;
        const cls = available > 0 ? (ok ? 'ok' : 'bad') : 'warn';
        return `
          <div class="stat ${cls}" style="margin-bottom:8px">
            <div class="l">${label}</div>
            <div class="v">${distance.toFixed(0)} m</div>
            <div class="s">${available > 0 ? (ok ? `✓ GO — ${margin.toFixed(0)}% margin on ${sub} (${available} m)` : `✗ NO-GO — exceeds ${sub} (${available} m) by ${(distance - available).toFixed(0)} m`) : `no ${sub} entered`}</div>
          </div>`;
      };
      const toOK = r.tora > 0 && to_result.distance <= r.tora;
      const ldOK = r.lda > 0 && ld_result.distance <= r.lda;

      // Wind out-of-chart warning (P-chart mode only)
      let windWarning = '';
      if (activeMethod === 'pchart' && pdata.wind_factor){
        if (headwind < -pdata.wind_factor.max_tailwind_kt){
          windWarning = `<div class="banner warn" style="margin:0 0 6px;font-size:12px">⚠ Tailwind ${(-headwind).toFixed(1)} kt exceeds chart limit ${pdata.wind_factor.max_tailwind_kt} kt — distances computed at chart maximum tailwind, actual distance likely worse.</div>`;
        } else if (headwind > pdata.wind_factor.max_headwind_kt){
          windWarning = `<div class="banner warn" style="margin:0 0 6px;font-size:12px">ℹ Headwind ${headwind.toFixed(1)} kt exceeds chart limit ${pdata.wind_factor.max_headwind_kt} kt — distances computed at chart maximum headwind.</div>`;
        }
      }

      host.innerHTML =
        `<div style="background:var(--panel-2);padding:8px 10px;border-radius:8px;margin-bottom:8px;font-size:11px;line-height:1.5">${methodNote}</div>` +
        windWarning +
        stat('T/O distance to 50\u2032 (max performance)', to_result.distance, r.tora, toOK, 'TORA') +
        stat('Landing distance from 50\u2032 (full flap)', ld_result.distance, r.lda, ldOK, 'LDA');

      const fmt2 = x => x.toFixed(3);
      document.getElementById('perf-breakdown').innerHTML = `
        <table style="width:100%;font-variant-numeric:tabular-nums;font-size:12px;border-collapse:collapse">
          <tr><td colspan="3"><strong>Takeoff</strong></td></tr>
          <tr><td>PPD reference</td><td colspan="2" style="text-align:right">${to_result.d_ppd.toFixed(0)} m</td></tr>
          <tr><td>× Operation</td><td style="text-align:right">${fmt2(to_result.op_mult)}</td><td style="text-align:right">${(to_result.d_ppd * to_result.op_mult).toFixed(0)} m</td></tr>
          <tr><td>× Slope (${r.slope}%)</td><td style="text-align:right">${fmt2(to_result.slope_factor)}</td><td style="text-align:right">${(to_result.d_ppd * to_result.op_mult * to_result.slope_factor).toFixed(0)} m</td></tr>
          <tr><td>× Wind (${headwind.toFixed(1)} kt)</td><td style="text-align:right">${fmt2(to_result.wind_factor)}</td><td style="text-align:right">${(to_result.d_ppd * to_result.op_mult * to_result.slope_factor * to_result.wind_factor).toFixed(0)} m</td></tr>
          ${wet ? `<tr><td>× Wet</td><td style="text-align:right">${fmt2(to_result.wet_factor)}</td><td style="text-align:right">${to_result.distance.toFixed(0)} m</td></tr>` : ''}
          <tr><td colspan="3" style="padding-top:8px"><strong>Landing</strong></td></tr>
          <tr><td>PPD reference</td><td colspan="2" style="text-align:right">${ld_result.d_ppd.toFixed(0)} m</td></tr>
          <tr><td>× Operation</td><td style="text-align:right">${fmt2(ld_result.op_mult)}</td><td style="text-align:right">${(ld_result.d_ppd * ld_result.op_mult).toFixed(0)} m</td></tr>
          <tr><td>× Slope (${r.slope}%)</td><td style="text-align:right">${fmt2(ld_result.slope_factor)}</td><td style="text-align:right">${(ld_result.d_ppd * ld_result.op_mult * ld_result.slope_factor).toFixed(0)} m</td></tr>
          <tr><td>× Wind (${headwind.toFixed(1)} kt)</td><td style="text-align:right">${fmt2(ld_result.wind_factor)}</td><td style="text-align:right">${(ld_result.d_ppd * ld_result.op_mult * ld_result.slope_factor * ld_result.wind_factor).toFixed(0)} m</td></tr>
          ${wet ? `<tr><td>× Wet</td><td style="text-align:right">${fmt2(ld_result.wet_factor)}</td><td style="text-align:right">${ld_result.distance.toFixed(0)} m</td></tr>` : ''}
        </table>
      `;

      // If a saved runway is currently selected, auto-save edits back to it
      if (selectedRunwayId){
        const rw = runways.find(x => x.id === selectedRunwayId);
        if (rw){
          clearTimeout(window._rwSaveT);
          window._rwSaveT = setTimeout(() => {
            Object.assign(rw, { ident: r.ident, heading: r.heading, elev: r.elev, slope: r.slope, tora: r.tora, lda: r.lda, surface: r.surface, condition: r.condition, group: r.group });
            saveRunways();
            renderSavedRunwaysPicker();
          }, 2000);
        }
      }
    }

    // Crosswind
    const xwHost = document.getElementById('perf-crosswind');
    const demoXW = ac.crosswind_demonstrated_kt;
    const clubXW = ac.crosswind_club_kt;
    const limit = (demoXW && clubXW) ? Math.min(demoXW, clubXW) : (demoXW || clubXW || null);
    let xwHtml = '';
    if (perfInput.wind.mode !== 'dirspeed' || !perfInput.wind.speed){
      xwHtml = `<div style="color:var(--muted);font-size:13px">Enter wind direction and speed to compute crosswind.</div>`;
    } else {
      const cls = (limit && crosswind > limit) ? 'bad' : 'ok';
      const sub = limit ? `limit ${limit} kt ${demoXW && clubXW ? '(lower of demo ' + demoXW + ', club ' + clubXW + ')' : (demoXW ? '(demonstrated)' : '(club)')}` : 'no limit set in aircraft config — add via Edit aircraft';
      xwHtml = `
        <div class="stat ${cls}">
          <div class="l">Crosswind component</div>
          <div class="v">${crosswind.toFixed(1)} kt</div>
          <div class="s">${limit && crosswind > limit ? '✗ exceeds ' + sub : (limit ? '✓ within ' + sub : sub)}</div>
        </div>
      `;
    }

    // Tailwind warning + better-runway suggestion
    if (perfInput.wind.mode === 'dirspeed' && perfInput.wind.speed > 0 && headwind < 0){
      // Component-mode case skipped; we only know headwind in dirspeed mode
      let suggestion = '';
      if (r.ident){
        // Sibling runways: same ICAO prefix (4 chars), different direction
        const prefix = r.ident.split(/\s+/)[0];
        const siblings = runways.filter(rw => rw.ident && rw.ident.startsWith(prefix) && rw.id !== selectedRunwayId);
        let best = null;
        siblings.forEach(rw => {
          const wc = window.Performance.windComponents(rw.heading, perfInput.wind.dir, perfInput.wind.speed);
          if (!best || wc.headwind > best.hw){ best = { rw, hw: wc.headwind, xw: wc.crosswind }; }
        });
        if (best && best.hw > headwind){
          suggestion = `<div style="margin-top:6px;font-size:12px">→ Better option: <strong>${best.rw.ident}</strong> would give HW ${best.hw.toFixed(1)} kt / XW ${best.xw.toFixed(1)} kt</div>`;
        }
      }
      xwHtml += `<div class="banner warn" style="margin-top:8px;font-size:12px">⚠ Tailwind ${(-headwind).toFixed(1)} kt on this runway. ${suggestion ? '' : 'Check the reciprocal direction.'}${suggestion}</div>`;
    }

    // Group sanity check
    if (ac.group != null && r.group != null){
      if (ac.group > r.group){
        xwHtml += `<div class="banner warn" style="margin-top:8px;font-size:12px">⚠ Aircraft Group ${ac.group} exceeds aerodrome Group ${r.group}. Sanity check only — verify with operator / AIP.</div>`;
      } else {
        xwHtml += `<div class="banner ok" style="margin-top:8px;font-size:12px">✓ Aircraft Group ${ac.group} is compatible with aerodrome Group ${r.group}.</div>`;
      }
    }

    xwHost.innerHTML = xwHtml;
  }

  function setPerfMethod(m){
    if (m !== 'pchart' && m !== 'afm') return;
    perfInput.perf_method = m;
    computeAndRenderPerf();
  }

  function loadSavedRunway(id){
    if (!id){
      selectedRunwayId = null;
      saveSelectedRunway();
      return;
    }
    const rw = runways.find(x => x.id === id);
    if (!rw) return;
    selectedRunwayId = id;
    saveSelectedRunway();
    perfInput.runway = {
      ident: rw.ident || '', heading: rw.heading ?? 0, elev: rw.elev ?? 0, slope: rw.slope ?? 0,
      tora: rw.tora ?? 0, lda: rw.lda ?? 0, surface: rw.surface || 'paved',
      condition: perfInput.runway.condition,  // keep current condition (dry/wet) since it's per-flight
      group: rw.group ?? null,
    };
    renderPerformance();
  }

  function saveCurrentRunway(){
    const r = perfInput.runway;
    if (!r.ident && !r.tora && !r.lda){ alert('Enter at least a designator and TORA before saving.'); return; }
    const wasNew = !selectedRunwayId;
    if (selectedRunwayId){
      const rw = runways.find(x => x.id === selectedRunwayId);
      if (rw){
        Object.assign(rw, { ident: r.ident, heading: r.heading, elev: r.elev, slope: r.slope, tora: r.tora, lda: r.lda, surface: r.surface, group: r.group });
        saveRunways();
        renderSavedRunwaysPicker();
        flashSaveButton(wasNew);
        return;
      }
    }
    const newRw = {
      id: 'rwy-' + Math.random().toString(36).slice(2, 9),
      ident: r.ident, heading: r.heading, elev: r.elev, slope: r.slope,
      tora: r.tora, lda: r.lda, surface: r.surface, group: r.group,
    };
    runways.push(newRw);
    selectedRunwayId = newRw.id;
    saveRunways();
    saveSelectedRunway();
    renderSavedRunwaysPicker();
    flashSaveButton(wasNew);
  }
  function flashSaveButton(wasNew){
    const btn = document.getElementById('rwy-save-btn');
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.innerHTML = wasNew ? '✓' : '✓';
    btn.style.background = '#16a34a';
    btn.style.color = '#fff';
    btn.title = wasNew ? 'Saved as new runway' : 'Updated saved runway';
    setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.style.color = ''; btn.title = 'Save current runway'; }, 1200);
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
      host.innerHTML = '<p style="color:var(--muted);font-size:13px">No runways saved yet. Enter runway details on the Performance tab and tap 💾 to save.</p>';
      return;
    }
    host.innerHTML = runways.map(rw => `
      <div style="display:flex;align-items:center;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
        <div style="flex:1">
          <div style="font-weight:600">${rw.ident || '(no ident)'}</div>
          <div style="font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums">${rw.surface||'paved'} · hdg ${rw.heading||'?'}° · elev ${rw.elev||'?'}\u2032 · TORA ${rw.tora||'?'} · LDA ${rw.lda||'?'}${rw.group!=null?' · Gp '+rw.group:''}</div>
        </div>
        <button class="icon-btn" onclick="App.manageRunwaySelect('${rw.id}')" title="Use this runway (loads into form for editing)" aria-label="Use">✓</button>
        <button class="icon-btn" onclick="App.manageRunwayDelete('${rw.id}')" title="Delete" aria-label="Delete">🗑</button>
      </div>
    `).join('');
  }
  function manageRunwaySelect(id){
    loadSavedRunway(id);
    closeManageRunways();
  }
  function manageRunwayDelete(id){
    const rw = runways.find(x => x.id === id);
    if (!rw) return;
    if (!confirm(`Delete runway "${rw.ident || '(no ident)'}"?`)) return;
    runways = runways.filter(x => x.id !== id);
    if (selectedRunwayId === id){ selectedRunwayId = null; saveSelectedRunway(); }
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
  function importRunways(){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          const incoming = Array.isArray(data) ? data : data.runways;
          if (!Array.isArray(incoming)) throw new Error('Invalid format');
          closeManageRunways();
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
              renderSavedRunwaysPicker();
              alert(`Imported ${chosen.length} runway(s).`);
            },
          });
        } catch(err){ alert('Import failed: ' + err.message); }
      };
      reader.readAsText(file);
    };
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
      <h3 style="font-size:14px;margin:4px 0 8px">Airframe (from weighing report)</h3>
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
        <div><label>POH (AFM) data</label>
          <select id="cfg-afm">
            <option value="">— none —</option>
            ${Object.keys(window.AFM_DATA||{}).map(k => { const d = window.AFM_DATA[k]; return `<option value="${k}" ${a.afm_id===k?'selected':''}>${k} — ${d.name||''}</option>`; }).join('')}
          </select>
        </div>
      </div>
      <div id="cfg-perf-info" style="font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:8px"></div>
      <small class="help" style="margin-bottom:8px">P-chart includes CASO 4 factors. POH (AFM) uses raw POH numbers + AC91-3 factors applied by the app. When both are set, you can switch on the Performance tab.</small>
      <div class="row">
        <div><label>Demonstrated crosswind (kt)</label><input type="number" inputmode="decimal" step="1" id="cfg-xw-demo" value="${a.crosswind_demonstrated_kt ?? ''}" placeholder="from POH"></div>
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
      <div id="cfg-stations"></div>
      <hr>
      <h3 style="font-size:14px;margin:4px 0 8px">CG envelope <button class="icon-btn" onclick="App.addEnvPoint()" aria-label="Add point">+</button></h3>
      <small class="help" style="margin-bottom:6px">Vertices in increasing weight. fwd = forward CG limit, aft = rear CG limit at that weight.</small>
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
        lines.push(`✓ POH (AFM): <strong>${d.name||aid}</strong>${d.source ? ' — '+d.source : ''}`);
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
        <input type="text" value="${s.name}" data-sidx="${idx}" data-f="name" placeholder="Station name" style="margin-bottom:6px">
        <div class="row">
          <div><label>Arm (${aU})</label><input type="number" inputmode="decimal" step="0.01" value="${s.arm}" data-sidx="${idx}" data-f="arm"></div>
          <div><label>Max load (${wU})</label><input type="number" inputmode="decimal" step="1" value="${s.max}" data-sidx="${idx}" data-f="max"></div>
          <div class="narrow"><label>Default</label><input type="number" inputmode="decimal" step="1" value="${s.default||0}" data-sidx="${idx}" data-f="default"></div>
        </div>
        <button class="btn danger" onclick="App.removeStation(${idx})" style="padding:6px 8px;font-size:12px;margin-top:6px">Remove</button>
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
        detail: `Empty ${a.empty_weight} ${u(a).w} · MTOW ${a.mtow}${a.pchart_id ? ' · P-chart' : ''}${a.afm_id ? ' · POH' : ''}`,
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
              detail: `Empty ${a.empty_weight || '?'} · MTOW ${a.mtow || '?'}${a.pchart_id ? ' · P-chart' : ''}${a.afm_id ? ' · POH' : ''}`,
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
    addLeg, removeLeg,
    printSheet,
    setWindMode, setPerfMethod, loadSavedRunway, saveCurrentRunway,
    openManageRunways, closeManageRunways, manageRunwaySelect, manageRunwayDelete,
    exportRunways, importRunways,
    pickerSelectAll, cancelPicker, confirmPicker,
  };
})();

window.addEventListener('DOMContentLoaded', App.init);
