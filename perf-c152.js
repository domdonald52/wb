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

// Tabular FM data (POH table values, bilinear interpolation)
window.AFM_DATA['C152'] = {
  name: "Cessna C152/A152",
  source: "Cessna 152 POH, 20 April 1981, Section 5 (Figures 5-5, 5-11)",
  verified_by: "D.Donald, Wellington Aero Club",
  verified_date: "2026-05-01",
  notes_to: "Short field | Flaps 10\u00b0 | Full throttle prior to brake release | Lean above 3000 ft | 54 KIAS at 50 ft",
  notes_ld: "Short field | Flaps 30\u00b0 | Power off | Maximum braking | 54 KIAS approach",
  mtow_kg: 757,
  envelope: {pa_max: 8000, oat_max: 40},
  takeoff: { takeoff_table_present: true },  // marker for audit display
  landing: { landing_table_present: true },
  takeoff_table: [
      {pa:0,t:0,d:362.7},
      {pa:0,t:10,d:393.2},
      {pa:0,t:20,d:423.7},
      {pa:0,t:30,d:455.7},
      {pa:0,t:40,d:489.2},
      {pa:1000,t:0,d:399.3},
      {pa:1000,t:10,d:432.8},
      {pa:1000,t:20,d:466.3},
      {pa:1000,t:30,d:501.4},
      {pa:1000,t:40,d:539.5},
      {pa:2000,t:0,d:440.4},
      {pa:2000,t:10,d:477.0},
      {pa:2000,t:20,d:515.1},
      {pa:2000,t:30,d:554.7},
      {pa:2000,t:40,d:597.4},
      {pa:3000,t:0,d:487.7},
      {pa:3000,t:10,d:527.3},
      {pa:3000,t:20,d:570.0},
      {pa:3000,t:30,d:615.7},
      {pa:3000,t:40,d:666.0},
      {pa:4000,t:0,d:541.0},
      {pa:4000,t:10,d:585.2},
      {pa:4000,t:20,d:634.0},
      {pa:4000,t:30,d:685.8},
      {pa:4000,t:40,d:743.7},
      {pa:5000,t:0,d:600.5},
      {pa:5000,t:10,d:652.3},
      {pa:5000,t:20,d:707.1},
      {pa:5000,t:30,d:769.6},
      {pa:5000,t:40,d:838.2},
      {pa:6000,t:0,d:670.6},
      {pa:6000,t:10,d:730.0},
      {pa:6000,t:20,d:795.5},
      {pa:6000,t:30,d:870.2},
      {pa:6000,t:40,d:952.5},
      {pa:7000,t:0,d:752.9},
      {pa:7000,t:10,d:824.5},
      {pa:7000,t:20,d:902.2},
      {pa:7000,t:30,d:992.1},
      {pa:7000,t:40,d:1094.2},
      {pa:8000,t:0,d:853.4},
      {pa:8000,t:10,d:938.8},
      {pa:8000,t:20,d:1034.8},
      {pa:8000,t:30,d:1147.6},
      {pa:8000,t:40,d:1278.6},
    ],
  landing_table: [
      {pa:0,t:0,d:353.6},
      {pa:0,t:10,d:361.2},
      {pa:0,t:20,d:370.3},
      {pa:0,t:30,d:378.0},
      {pa:0,t:40,d:385.6},
      {pa:1000,t:0,d:361.2},
      {pa:1000,t:10,d:370.3},
      {pa:1000,t:20,d:378.0},
      {pa:1000,t:30,d:387.1},
      {pa:1000,t:40,d:394.7},
      {pa:2000,t:0,d:370.3},
      {pa:2000,t:10,d:378.0},
      {pa:2000,t:20,d:387.1},
      {pa:2000,t:30,d:396.2},
      {pa:2000,t:40,d:405.4},
      {pa:3000,t:0,d:378.0},
      {pa:3000,t:10,d:388.6},
      {pa:3000,t:20,d:397.8},
      {pa:3000,t:30,d:406.9},
      {pa:3000,t:40,d:414.5},
      {pa:4000,t:0,d:388.6},
      {pa:4000,t:10,d:397.8},
      {pa:4000,t:20,d:406.9},
      {pa:4000,t:30,d:417.6},
      {pa:4000,t:40,d:426.7},
      {pa:5000,t:0,d:397.8},
      {pa:5000,t:10,d:406.9},
      {pa:5000,t:20,d:417.6},
      {pa:5000,t:30,d:426.7},
      {pa:5000,t:40,d:437.4},
      {pa:6000,t:0,d:408.4},
      {pa:6000,t:10,d:417.6},
      {pa:6000,t:20,d:429.8},
      {pa:6000,t:30,d:438.9},
      {pa:6000,t:40,d:449.6},
      {pa:7000,t:0,d:419.1},
      {pa:7000,t:10,d:429.8},
      {pa:7000,t:20,d:438.9},
      {pa:7000,t:30,d:451.1},
      {pa:7000,t:40,d:461.8},
      {pa:8000,t:0,d:429.8},
      {pa:8000,t:10,d:442.0},
      {pa:8000,t:20,d:451.1},
      {pa:8000,t:30,d:463.3},
      {pa:8000,t:40,d:474.0},
    ],
};
