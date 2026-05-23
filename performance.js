// Performance calculation engine.
// Two methods supported per aircraft:
//   1. P-chart method (chart-derived): uses PCHART_DATA model. Most accurate when available.
//   2. AFM+factors fallback: uses POH base distances + AC91-3 surface and slope factors.
//
// AC91-3 references:
//   Table 1: Surface factors
//     Paved x1.00, Coral x1.00 (LD x1.05), Metal x1.05/x1.08, Rolled earth x1.08/x1.16, Grass x1.14/x1.18
//   Table 2: Slope factors
//     0.5% distance per 0.1% of slope; T/O uphill = +, T/O downhill = -, LD reversed.
//   Wet runway: +15% landing distance.

window.Performance = (function(){

  // --- Crosswind component computation ---
  function windComponents(runwayHeading, windDir, windSpeed){
    // Both headings in degrees true (or all in mag, doesn't matter as long as consistent).
    // windDir is FROM direction (standard wind reporting).
    // Returns: { headwind, crosswind }  (kt; crosswind unsigned, headwind negative = tailwind)
    let angle = (windDir - runwayHeading + 360) % 360;
    if (angle > 180) angle -= 360;
    const rad = angle * Math.PI / 180;
    const headwind = windSpeed * Math.cos(rad);
    const crosswind = Math.abs(windSpeed * Math.sin(rad));
    return { headwind, crosswind };
  }

  // --- Atmospheric ---
  function pressureAltitude(elev_ft, qnh_hpa){
    // PA = elev + (1013 - QNH) * 30 ft/hPa (standard approx)
    return elev_ft + (1013 - qnh_hpa) * 30;
  }
  function isaTemp(pa_ft){
    return 15 - 1.98 * (pa_ft / 1000);
  }
  function densityAltitude(pa_ft, oat_c){
    // DA = PA + 120 * (OAT - ISA)  (standard approx in ft)
    const isa = isaTemp(pa_ft);
    return pa_ft + 120 * (oat_c - isa);
  }

  // --- AC91-3 surface factors ---
  const SURFACE_FACTORS_AC91 = {
    paved:        { to: 1.00, ld: 1.00 },
    coral:        { to: 1.00, ld: 1.05 },
    metal:        { to: 1.05, ld: 1.08 },
    rolled_earth: { to: 1.08, ld: 1.16 },
    grass:        { to: 1.14, ld: 1.18 },
  };

  // --- Operation lines ---
  // Used by P-chart method only. AFM+factors mode supports Private-Day only.
  const OPERATIONS = [
    { id: 'private_paved_day',         label: 'Private — Paved — Day' },
    { id: 'air_transport_paved_day',   label: 'Air Transport — Paved — Day' },
    { id: 'private_grass_day',         label: 'Private — Grass — Day' },
    { id: 'air_transport_grass_day',   label: 'Air Transport — Grass — Day' },
    { id: 'all_ops_paved_night',       label: 'All Ops — Paved — Night' },
    { id: 'all_ops_grass_night',       label: 'All Ops — Grass — Night' },
  ];

  // --- P-chart distance calculation ---
  function bilinearInterp2D(points, x, y){
    // points: array of {pa, t, d}; x = pa, y = oat
    // Find bracketing PAs and OATs; for missing grid cells, nearest neighbour on the other axis.
    const xs = [...new Set(points.map(p => p.pa))].sort((a,b)=>a-b);
    const ys = [...new Set(points.map(p => p.t))].sort((a,b)=>a-b);
    if (xs.length === 0 || ys.length === 0) return 0;
    // Clamp to grid
    const xc = Math.max(xs[0], Math.min(xs[xs.length-1], x));
    const yc = Math.max(ys[0], Math.min(ys[ys.length-1], y));
    // Bracket
    let x0 = xs[0], x1 = xs[xs.length-1];
    for (let i = 0; i < xs.length - 1; i++){ if (xs[i] <= xc && xc <= xs[i+1]){ x0 = xs[i]; x1 = xs[i+1]; break; } }
    let y0 = ys[0], y1 = ys[ys.length-1];
    for (let j = 0; j < ys.length - 1; j++){ if (ys[j] <= yc && yc <= ys[j+1]){ y0 = ys[j]; y1 = ys[j+1]; break; } }
    const at = (px, py) => {
      const exact = points.find(p => p.pa === px && p.t === py);
      if (exact) return exact.d;
      // Missing — nearest neighbour at same PA
      const same_pa = points.filter(p => p.pa === px);
      if (same_pa.length){
        return same_pa.reduce((best, p) => Math.abs(p.t - py) < Math.abs(best.t - py) ? p : best).d;
      }
      // Else nearest by both
      return points.reduce((best, p) => {
        const d2 = (p.pa - px)*(p.pa - px) + (p.t - py)*(p.t - py);
        return d2 < ((best.pa - px)*(best.pa - px) + (best.t - py)*(best.t - py)) ? p : best;
      }).d;
    };
    const f00 = at(x0, y0), f01 = at(x0, y1), f10 = at(x1, y0), f11 = at(x1, y1);
    const dx = x1 === x0 ? 0 : (xc - x0) / (x1 - x0);
    const dy = y1 === y0 ? 0 : (yc - y0) / (y1 - y0);
    return f00 * (1-dx)*(1-dy) + f10 * dx*(1-dy) + f01 * (1-dx)*dy + f11 * dx*dy;
  }

  function linearInterp1D(points, x){
    // points: array of {elev, d}
    if (!points.length) return 0;
    const sorted = points.slice().sort((a,b) => a.elev - b.elev);
    if (x <= sorted[0].elev) return sorted[0].d;
    if (x >= sorted[sorted.length-1].elev) return sorted[sorted.length-1].d;
    for (let i = 0; i < sorted.length - 1; i++){
      if (sorted[i].elev <= x && x <= sorted[i+1].elev){
        const t = (x - sorted[i].elev) / (sorted[i+1].elev - sorted[i].elev);
        return sorted[i].d * (1-t) + sorted[i+1].d * t;
      }
    }
    return sorted[sorted.length-1].d;
  }

  function pchartTakeoffDistance(data, pa_ft, oat_c, operation, slope_pct, wind_component_kt, wet){
    let d_ppd;
    if (data.takeoff.reference_points){
      d_ppd = bilinearInterp2D(data.takeoff.reference_points, pa_ft, oat_c);
    } else if (data.takeoff.ppd_model){
      const m = data.takeoff.ppd_model;
      d_ppd = m.a + m.b*pa_ft + m.c*oat_c + m.d_coef*pa_ft*oat_c + m.e*pa_ft*pa_ft + m.f*oat_c*oat_c;
    } else {
      d_ppd = 0;
    }
    const op_mult = (data.operation_multipliers && data.operation_multipliers[operation]) || 1.0;
    let d = d_ppd * op_mult;
    const slope_factor = 1 + (slope_pct * data.slope_factor_pct_per_pct / 100);
    d *= slope_factor;
    const wind_factor = computeWindFactor(data, wind_component_kt);
    d *= wind_factor;
    if (wet) d *= 1.15;
    return { distance: d, d_ppd, op_mult, slope_factor, wind_factor, wet_factor: wet ? 1.15 : 1.00 };
  }

  function pchartLandingDistance(data, elev_ft, operation, slope_pct, wind_component_kt, wet){
    let d_ppd;
    if (data.landing.reference_points){
      d_ppd = linearInterp1D(data.landing.reference_points, elev_ft);
    } else if (data.landing.ppd_model){
      const m = data.landing.ppd_model;
      d_ppd = m.a + m.b*elev_ft + m.c*elev_ft*elev_ft;
    } else {
      d_ppd = 0;
    }
    // Landing operation multipliers — prefer landing-specific if present, else T/O multipliers as fallback
    const mults_ld = data.operation_multipliers_ld || data.operation_multipliers || {};
    const op_mult = mults_ld[operation] || 1.0;
    let d = d_ppd * op_mult;
    const slope_factor = 1 - (slope_pct * data.slope_factor_pct_per_pct / 100);
    d *= slope_factor;
    const wind_factor = computeWindFactor(data, wind_component_kt);
    d *= wind_factor;
    if (wet) d *= 1.15;
    return { distance: d, d_ppd, op_mult, slope_factor, wind_factor, wet_factor: wet ? 1.15 : 1.00 };
  }

  function computeWindFactor(data, wind_kt){
    const wf = data.wind_factor;
    if (wind_kt >= 0){
      // Headwind: reduces distance
      const capped = Math.min(wind_kt, wf.max_headwind_kt);
      return 1 - wf.headwind_pct_per_kt * capped;
    } else {
      // Tailwind: increases distance
      const tail = Math.min(-wind_kt, wf.max_tailwind_kt);
      return 1 + wf.tailwind_pct_per_kt * tail;
    }
  }

  // --- AFM+factors fallback ---
  function afmFactorsTakeoff(ac_afm, pa_ft, oat_c, surface, slope_pct, wind_kt, wet){
    // ac_afm = { to_base_msl_isa_m, to_pa_correction_pct_per_1000, to_temp_correction_pct_per_10c, to_weight_correction_pct_per_100kg, mtow_kg, current_weight_kg }
    if (!ac_afm) return null;
    const isa_at_pa = 15 - 1.98 * (pa_ft / 1000);
    let d = ac_afm.to_base_msl_isa_m;
    d *= 1 + (ac_afm.to_pa_correction_pct_per_1000 / 100) * (pa_ft / 1000);
    d *= 1 + (ac_afm.to_temp_correction_pct_per_10c / 100) * ((oat_c - isa_at_pa) / 10);
    // Weight: less weight, less distance (typically -1% per 100 kg or so)
    if (ac_afm.current_weight_kg && ac_afm.mtow_kg && ac_afm.to_weight_correction_pct_per_100kg){
      const weight_diff_kg = ac_afm.current_weight_kg - ac_afm.mtow_kg;
      d *= 1 + (ac_afm.to_weight_correction_pct_per_100kg / 100) * (weight_diff_kg / 100);
    }
    // Surface
    const surf_factor = (SURFACE_FACTORS_AC91[surface] || SURFACE_FACTORS_AC91.paved).to;
    d *= surf_factor;
    // Slope (AC91-3 Table 2: 5% per 1% for T/O uphill)
    const slope_factor = 1 + (slope_pct * 5 / 100);
    d *= slope_factor;
    // Wind: AC91-3 says reduce headwind effect by 50% and assume tailwind 150%.
    // I.e., 'effective' wind = 0.5 * headwind, then apply a typical 1.5%/kt headwind factor.
    let wind_factor;
    if (wind_kt >= 0){
      const effective = 0.5 * wind_kt;
      wind_factor = 1 - 0.015 * Math.min(effective, 20);
    } else {
      const effective = 1.5 * (-wind_kt);
      wind_factor = 1 + 0.06 * Math.min(effective, 30);
    }
    d *= wind_factor;
    // Wet: AC91-3 says +15% for prudent T/O on wet
    if (wet) d *= 1.15;
    return { distance: d, surf_factor, slope_factor, wind_factor, wet_factor: wet ? 1.15 : 1.00 };
  }

  function afmFactorsLanding(ac_afm, pa_ft, oat_c, surface, slope_pct, wind_kt, wet){
    if (!ac_afm) return null;
    const isa_at_pa = 15 - 1.98 * (pa_ft / 1000);
    let d = ac_afm.ld_base_msl_isa_m;
    d *= 1 + (ac_afm.ld_pa_correction_pct_per_1000 / 100) * (pa_ft / 1000);
    d *= 1 + (ac_afm.ld_temp_correction_pct_per_10c / 100) * ((oat_c - isa_at_pa) / 10);
    if (ac_afm.current_landing_weight_kg && ac_afm.mtow_kg && ac_afm.ld_weight_correction_pct_per_100kg){
      const weight_diff_kg = ac_afm.current_landing_weight_kg - ac_afm.mtow_kg;
      d *= 1 + (ac_afm.ld_weight_correction_pct_per_100kg / 100) * (weight_diff_kg / 100);
    }
    const surf_factor = (SURFACE_FACTORS_AC91[surface] || SURFACE_FACTORS_AC91.paved).ld;
    d *= surf_factor;
    // LD slope: downhill = longer
    const slope_factor = 1 - (slope_pct * 5 / 100);
    d *= slope_factor;
    let wind_factor;
    if (wind_kt >= 0){
      const effective = 0.5 * wind_kt;
      wind_factor = 1 - 0.015 * Math.min(effective, 20);
    } else {
      const effective = 1.5 * (-wind_kt);
      wind_factor = 1 + 0.06 * Math.min(effective, 30);
    }
    d *= wind_factor;
    if (wet) d *= 1.15;
    return { distance: d, surf_factor, slope_factor, wind_factor, wet_factor: wet ? 1.15 : 1.00 };
  }

  return {
    windComponents, pressureAltitude, isaTemp, densityAltitude,
    pchartTakeoffDistance, pchartLandingDistance,
    afmFactorsTakeoff, afmFactorsLanding,
    OPERATIONS, SURFACE_FACTORS_AC91,
  };
})();
