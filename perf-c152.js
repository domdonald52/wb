// Performance data for Cessna C152/A152.
// Contains both P-chart and Flight Manual (POH) data when available.
window.PCHART_DATA = window.PCHART_DATA || {};
window.AFM_DATA = window.AFM_DATA || {};

// Auto-generated P-chart data for Cessna C152/A152
window.PCHART_DATA['C152'] = {
  name: "Cessna C152/A152",
  source: "P-Chart MOT/CAD Approved | Air 2032+ | 18/12/1984",
  verified_by: "D.Donald, Wellington Aero Club",
  verified_date: "2026-05-01",
  notes_to: "CASO4  | T/O to 50' | Flaps 10 | Full power before brake release\t\t",
  notes_ld: "CASO4 | Power Off | 54 kts at 50 ft",
  caso4_compliant: true,
  mtow_kg: 757.0,
  envelope: {"pa_min": 0.0, "pa_max": 4000.0, "oat_min": -6.0, "oat_max": 30.0, "elev_min": 0.0, "elev_max": 4000.0},
  takeoff: {
    reference_points: [
      {
            "pa": 0.0,
            "t": 10.0,
            "d": 380.0
      },
      {
            "pa": 0.0,
            "t": 20.0,
            "d": 420.0
      },
      {
            "pa": 0.0,
            "t": 30.0,
            "d": 485.0
      },
      {
            "pa": 1000.0,
            "t": 10.0,
            "d": 430.0
      },
      {
            "pa": 1000.0,
            "t": 20.0,
            "d": 480.0
      },
      {
            "pa": 1000.0,
            "t": 30.0,
            "d": 540.0
      },
      {
            "pa": 2000.0,
            "t": 10.0,
            "d": 485.0
      },
      {
            "pa": 2000.0,
            "t": 20.0,
            "d": 540.0
      },
      {
            "pa": 2000.0,
            "t": 30.0,
            "d": 600.0
      },
      {
            "pa": 3000.0,
            "t": 10.0,
            "d": 540.0
      },
      {
            "pa": 3000.0,
            "t": 20.0,
            "d": 590.0
      }
],
  },
  landing: {
    reference_points: [
      {
            "elev": 0.0,
            "d": 370.0
      },
      {
            "elev": 2000.0,
            "d": 390.0
      },
      {
            "elev": 4000.0,
            "d": 410.0
      }
],
  },
  operation_multipliers: {
    "private_paved_day": 1.0,
    "air_transport_paved_day": 1.15,
    "private_grass_day": 1.0875,
    "air_transport_grass_day": 1.3,
    "all_ops_paved_night": 1.325,
    "all_ops_grass_night": 1.475
},
  operation_multipliers_ld: {
    "private_paved_day": 1.0,
    "air_transport_paved_day": 1.1622,
    "private_grass_day": 1.2703,
    "air_transport_grass_day": 1.4865,
    "all_ops_paved_night": 1.3514,
    "all_ops_grass_night": 1.6486
},
  slope_factor_pct_per_pct: 5,
  wind_factor: {
    headwind_pct_per_kt: 0.015,
    tailwind_pct_per_kt: 0.060,
    max_headwind_kt: 20,
    max_tailwind_kt: 5,
  },
};
// Auto-generated Flight Manual data for Cessna C152/A152
window.AFM_DATA['C152'] = {
  name: "Cessna C152/A152",
  source: "Cessna 152 POH, 20 April 1981, Section 5 (Figures 5-5, 5-11)",
  verified_by: "D.Donald, Wellington Aero Club",
  verified_date: "2026-05-01",
  notes_to: "Short field technique | Flaps 10\u00b0 | Full throttle prior to brake release | Lean above 3000 ft for max RPM | 50 KIAS lift off, 54 KIAS at 50 ft",
  notes_ld: "Short field technique | Flaps 30\u00b0 | Power off | Maximum braking | 54 KIAS approach",
  mtow_kg: 757.0,
  envelope: {"pa_max": 8000.0, "oat_max": 40.0},
  takeoff: {
    "base_msl_isa_m": 408.43,
    "pa_correction_pct_per_1000": 18.28,
    "temp_correction_pct_per_10c": 10.0,
    "weight_correction_pct_per_100kg": 0.0
},
  landing: {
    "base_msl_isa_m": 365.76,
    "pa_correction_pct_per_1000": 2.75,
    "temp_correction_pct_per_10c": 2.42,
    "weight_correction_pct_per_100kg": 0.0
},
};
