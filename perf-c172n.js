// Performance data for Cessna C172N.
// Contains both P-chart and Flight Manual (POH) data when available.
window.PCHART_DATA = window.PCHART_DATA || {};
window.AFM_DATA = window.AFM_DATA || {};

// Auto-generated P-chart data for Cessna C172N
window.PCHART_DATA['C172N'] = {
  name: "Cessna C172N",
  source: "P-Chart MOT/CAD Approved | Air 2083 | 20/3/1990",
  verified_by: "D.Donald, Wellington Aero Club",
  verified_date: "2026-05-23",
  notes_to: "CASO4  | T/O to 50' | Flaps up | Full power before brake release",
  notes_ld: "CASO4  | Landing from 50'  | Flaps 40 | Max braking | 60kts over threshold",
  caso4_compliant: true,
  mtow_kg: 1043.0,
  envelope: {"pa_min": 0.0, "pa_max": 4000.0, "oat_min": -6.0, "oat_max": 40.0, "elev_min": 0.0, "elev_max": 4000.0},
  takeoff: {
    reference_points: [
      {
            "pa": 0.0,
            "t": 10.0,
            "d": 450.0
      },
      {
            "pa": 0.0,
            "t": 20.0,
            "d": 500.0
      },
      {
            "pa": 0.0,
            "t": 30.0,
            "d": 550.0
      },
      {
            "pa": 1000.0,
            "t": 10.0,
            "d": 520.0
      },
      {
            "pa": 1000.0,
            "t": 20.0,
            "d": 550.0
      },
      {
            "pa": 1000.0,
            "t": 30.0,
            "d": 620.0
      },
      {
            "pa": 2000.0,
            "t": 10.0,
            "d": 550.0
      },
      {
            "pa": 2000.0,
            "t": 20.0,
            "d": 610.0
      },
      {
            "pa": 2000.0,
            "t": 30.0,
            "d": 660.0
      },
      {
            "pa": 3000.0,
            "t": 10.0,
            "d": 610.0
      },
      {
            "pa": 3000.0,
            "t": 20.0,
            "d": 660.0
      }
],
  },
  landing: {
    reference_points: [
      {
            "elev": 0.0,
            "d": 380.0
      },
      {
            "elev": 2000.0,
            "d": 400.0
      },
      {
            "elev": 4000.0,
            "d": 420.0
      }
],
  },
  operation_multipliers: {
    "private_paved_day": 1.0,
    "air_transport_paved_day": 1.1702,
    "private_grass_day": 1.1064,
    "air_transport_grass_day": 1.2979,
    "all_ops_paved_night": 1.3404,
    "all_ops_grass_night": 1.4681
},
  operation_multipliers_ld: {
    "private_paved_day": 1.0,
    "air_transport_paved_day": 1.1711,
    "private_grass_day": 1.3158,
    "air_transport_grass_day": 1.4737,
    "all_ops_paved_night": 1.3421,
    "all_ops_grass_night": 1.6316
},
  slope_factor_pct_per_pct: 5,
  wind_factor: {
    headwind_pct_per_kt: 0.015,
    tailwind_pct_per_kt: 0.060,
    max_headwind_kt: 20,
    max_tailwind_kt: 5,
  },
};
// Auto-generated Flight Manual data for Cessna C172N
window.AFM_DATA['C172N'] = {
  name: "Cessna C172N",
  source: "C172N Flight Manual | July 1979",
  verified_by: "D.Donald, Wellington Aero Club",
  verified_date: "2026-05-23",
  notes_to: "T/O to 50' | Flaps one notch | Full pwr before brake release | MTOW",
  notes_ld: "Landing over 50' barrier | Flaps 40 | Max braking | Full stall touchdown",
  mtow_kg: 1043.0,
  envelope: {"pa_max": 8000.0, "oat_max": 40.0},
  takeoff: {
    "base_msl_isa_m": 423.67,
    "pa_correction_pct_per_1000": 12.59,
    "temp_correction_pct_per_10c": 7.63,
    "weight_correction_pct_per_100kg": 24.03
},
  landing: {
    "base_msl_isa_m": 381.0,
    "pa_correction_pct_per_1000": 3.12,
    "temp_correction_pct_per_10c": 2.72,
    "weight_correction_pct_per_100kg": 14.0
},
};
