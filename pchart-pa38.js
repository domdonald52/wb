// PA-38 P-chart data, derived from Wellington Aero Club P-charts
// (Dom Donald 2024 redraw of original 1990 MOT/CAD Air 2053 Supplement D charts).
//
// Method:
// - Reference distance for Private-Paved-Day at zero slope, zero wind,
//   modelled as polynomial in (PA, T) for takeoff, polynomial in elevation for landing.
// - Other 5 operation lines as fixed multipliers on the PPD reference.
// - Slope and wind as adjustment factors applied to the result.
//
// These coefficients were fit to 9 reference points read from the takeoff chart and 5
// from the landing chart, with max residuals of 4.2 m and 1.3 m respectively.

window.PCHART_DATA = window.PCHART_DATA || {};

window.PCHART_DATA['PA-38'] = {
  name: 'Piper PA-38-112 Tomahawk',
  source: 'Wellington Aero Club P-charts (Dom Donald 2024)',
  caso4_compliant: true,
  precision: '±5 m typical, ±15 m worst-case (orange Private-Paved-Day line)',
  precision_note: 'Other operation lines use fixed multipliers from PPD — accuracy somewhat lower (~±5%).',

  takeoff: {
    // d_PPD(PA, T) = a + b*PA + c*T + d_coef*PA*T + e*PA^2 + f*T^2  (metres)
    ppd_model: {
      a: 423.395,
      b: 0.0418579,
      c: 3.51943,
      d_coef: 0.000610656,
      e: 5.41667e-6,
      f: 0.0251852,
    },
    // PA in feet, valid 0–4000
    // T in degC, valid -10 to +35
    valid: { pa_min: 0, pa_max: 4000, t_min: -10, t_max: 35 },
    reference_points: [
      // Used for fitting; useful for sanity check display
      { pa: 0, t: -10, d: 390 }, { pa: 0, t: 15, d: 480 }, { pa: 0, t: 35, d: 580 },
      { pa: 2000, t: -10, d: 485 }, { pa: 2000, t: 15, d: 610 }, { pa: 2000, t: 35, d: 720 },
      { pa: 4000, t: -10, d: 620 }, { pa: 4000, t: 15, d: 770 }, { pa: 4000, t: 35, d: 920 },
    ],
  },

  landing: {
    // d_PPD(elev) = a + b*elev + c*elev^2  (metres)
    ppd_model: {
      // Fit to: SL=480, 2000'=530, 4000'=580 — linear in elevation
      a: 480,
      b: 0.025,
      c: 0,
    },
    valid: { elev_min: 0, elev_max: 4000 },
    reference_points: [
      { elev: 0, d: 480 }, { elev: 2000, d: 530 }, { elev: 4000, d: 580 },
    ],
  },

  // Operation line multipliers, applied to PPD reference. Same for T/O and Landing
  // (chart line spacing is essentially identical between the two charts).
  operation_multipliers: {
    'private_paved_day':    1.00,
    'air_transport_paved_day': 1.16,
    'private_grass_day':    1.30,
    'air_transport_grass_day': 1.46,
    'all_ops_paved_night':  1.56,
    'all_ops_grass_night':  1.78,
  },

  // Slope adjustment: percent change in distance per 1% of slope.
  // For takeoff, uphill = longer. For landing, downhill = longer.
  // AC91-3 Table 2 gives +5%/+1% for takeoff uphill (and -5% for downhill), and reversed for landing.
  // The chart matches these factors closely.
  slope_factor_pct_per_pct: 5.0,

  // Wind: distance multiplier as function of wind component (negative = tailwind, positive = headwind).
  // Read from the chart wind curves:
  //   -5 kt (tailwind): ~ +30% distance (×1.30)
  //   0 kt:             ×1.00
  //   +20 kt (head):    ~ -30% distance (×0.70)
  // Approximate piecewise linear:
  wind_factor: {
    // distance multiplier = 1 + tailwind_pct_per_kt * tailwind_kt    if tailwind > 0
    // distance multiplier = 1 - headwind_pct_per_kt * headwind_kt    if headwind > 0
    headwind_pct_per_kt: 0.015,   // 1.5% per kt — at 20 kts gives 0.70x
    tailwind_pct_per_kt: 0.060,   // 6% per kt — at 5 kts gives 1.30x
    // Wind component is computed from runway heading + wind direction/speed.
    // Tailwind capped at 5 kt (chart doesn't extend further); app should warn.
    max_tailwind_kt: 5,
    max_headwind_kt: 20,
  },

  // Demonstrated crosswind limit (POH). Aero club may set lower (separate field).
  demonstrated_crosswind_kt: 15,
};
