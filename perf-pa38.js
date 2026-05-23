// Performance data for Piper PA-38-112 Tomahawk.
// Contains both P-chart and Flight Manual (POH) data when available.
window.PCHART_DATA = window.PCHART_DATA || {};
window.AFM_DATA = window.AFM_DATA || {};

// Auto-generated P-chart data for Piper PA-38-112 Tomahawk
window.PCHART_DATA['PA-38'] = {
  name: "Piper PA-38-112 Tomahawk",
  source: "P-Chart MOT/CAD Approved | Air 2054 | 14/3/1990",
  verified_by: "D.Donald, Wellington Aero Club",
  verified_date: "2026-05-23",
  notes_to: "CASO4 incorporated | T/O to 50' | Flaps one notch | Full power before brake release | Outboard & inboard flow strips",
  notes_ld: "CASO4 incorporated | Landing over  50' barroer | Flaps second notch | Outboard & inboard flow strips. ",
  caso4_compliant: true,
  mtow_kg: 757.0,
  takeoff: {
    reference_points: [
      {
            "pa": 0.0,
            "t": 10.0,
            "d": 410.0
      },
      {
            "pa": 0.0,
            "t": 20.0,
            "d": 470.0
      },
      {
            "pa": 0.0,
            "t": 30.0,
            "d": 560.0
      },
      {
            "pa": 1000.0,
            "t": 10.0,
            "d": 500.0
      },
      {
            "pa": 1000.0,
            "t": 20.0,
            "d": 560.0
      },
      {
            "pa": 1000.0,
            "t": 30.0,
            "d": 640.0
      },
      {
            "pa": 2000.0,
            "t": 10.0,
            "d": 560.0
      },
      {
            "pa": 2000.0,
            "t": 20.0,
            "d": 660.0
      },
      {
            "pa": 2000.0,
            "t": 30.0,
            "d": 720.0
      },
      {
            "pa": 3000.0,
            "t": 10.0,
            "d": 650.0
      },
      {
            "pa": 3000.0,
            "t": 20.0,
            "d": 720.0
      }
],
  },
  landing: {
    reference_points: [
      {
            "elev": 0.0,
            "d": 490.0
      },
      {
            "elev": 2000.0,
            "d": 510.0
      },
      {
            "elev": 4000.0,
            "d": 520.0
      }
],
  },
  operation_multipliers: {
    "private_paved_day": 1.0,
    "air_transport_paved_day": 1.1705,
    "private_grass_day": 1.0909,
    "air_transport_grass_day": 1.2727,
    "all_ops_paved_night": 1.3182,
    "all_ops_grass_night": 1.4773
},
  operation_multipliers_ld: {
    "private_paved_day": 1.0,
    "air_transport_paved_day": 1.1923,
    "private_grass_day": 1.2692,
    "air_transport_grass_day": 1.5,
    "all_ops_paved_night": 1.3462,
    "all_ops_grass_night": 1.8846
},
  slope_factor_pct_per_pct: 5,
  wind_factor: {
    headwind_pct_per_kt: 0.015,
    tailwind_pct_per_kt: 0.060,
    max_headwind_kt: 20,
    max_tailwind_kt: 5,
  },
};


// raw FM numbers.

// Auto-generated Flight Manual data for Piper PA-38-112 Tomahawk
window.AFM_DATA['PA-38'] = {
  name: "Piper PA-38-112 Tomahawk",
  source: "PA-38-112 Flight Manual | January 1978",
  verified_by: "D.Donald, Wellington Aero Club",
  verified_date: "2026-05-23",
  notes_to: "T/O to 50' | Flaps one notch | Full power before brake release | MTOW",
  notes_ld: "Landing over  50' barroer | Flaps second notch | Outboard & inboard flow strips | Max braking | Full stall touchdown",
  mtow_kg: 757.0,
  takeoff: {
    "base_msl_isa_m": 402.34,
    "pa_correction_pct_per_1000": 14.39,
    "temp_correction_pct_per_10c": 15.15,
    "weight_correction_pct_per_100kg": 0.0
},
  landing: {
    "base_msl_isa_m": 470.92,
    "pa_correction_pct_per_1000": 1.62,
    "temp_correction_pct_per_10c": 1.62,
    "weight_correction_pct_per_100kg": 0.0
},
};

