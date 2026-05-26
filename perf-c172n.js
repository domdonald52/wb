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
  slope_factor_pct_per_pct_takeoff: 5,
  slope_factor_pct_per_pct_landing: 6,
  wind_factor_takeoff: {
    headwind_pct_per_kt: 0.025,
    tailwind_pct_per_kt: 0.037,
    max_headwind_kt: 20,
    max_tailwind_kt: 5,
  },
  wind_factor_landing: {
    headwind_pct_per_kt: 0.025,
    tailwind_pct_per_kt: 0.040,
    max_headwind_kt: 20,
    max_tailwind_kt: 5,
  },
  // T/O weight box has three reference lines (2300 lb MTOW, 2100 lb, 1900 lb).
  // Multipliers averaged across SL/15°C and 2000 ft/30°C readings (within 4% of each other).
  // Linear-interpolated between points; clamped at endpoints.
  // Only applied when actual T/O weight is known from W&B data.
  takeoff_weight_multipliers: [
    { weight_kg: 1043, mult: 1.000 },  // 2300 lb MTOW
    { weight_kg: 953,  mult: 0.800 },  // 2100 lb (chart-traced)
    { weight_kg: 862,  mult: 0.621 },  // 1900 lb (chart-traced)
  ],
};

// Tabular FM data (POH table values, bilinear interpolation)
window.AFM_DATA['C172N'] = {
  name: "Cessna C172N",
  source: "Cessna 172N POH, 1 July 1979, Section 5 (Figures 5-4, 5-10)",
  verified_by: "D.Donald, Wellington Aero Club",
  verified_date: "2026-05-23",
  notes_to: "Short field to 50' | Flaps 10\u00b0 | Full throttle before brake release",
  notes_ld: "Short field | Flaps 40\u00b0 | Power off | Max braking | Total dist from 50ft (POH table)",
  mtow_kg: 1043,
  envelope: {pa_max: 8000, oat_max: 40},
  takeoff: { takeoff_table_present: true },  // marker for audit display
  landing: { landing_table_present: true },
  takeoff_table: [
      {pa:0,t:0,d:381.0},
      {pa:0,t:10,d:408.4},
      {pa:0,t:20,d:438.9},
      {pa:0,t:30,d:470.9},
      {pa:0,t:40,d:504.4},
      {pa:1000,t:0,d:417.6},
      {pa:1000,t:10,d:449.6},
      {pa:1000,t:20,d:483.1},
      {pa:1000,t:30,d:519.7},
      {pa:1000,t:40,d:557.8},
      {pa:2000,t:0,d:460.2},
      {pa:2000,t:10,d:495.3},
      {pa:2000,t:20,d:533.4},
      {pa:2000,t:30,d:574.5},
      {pa:2000,t:40,d:618.7},
      {pa:3000,t:0,d:509.0},
      {pa:3000,t:10,d:548.6},
      {pa:3000,t:20,d:591.3},
      {pa:3000,t:30,d:638.6},
      {pa:3000,t:40,d:688.8},
      {pa:4000,t:0,d:563.9},
      {pa:4000,t:10,d:609.6},
      {pa:4000,t:20,d:659.9},
      {pa:4000,t:30,d:713.2},
      {pa:4000,t:40,d:772.7},
      {pa:5000,t:0,d:627.9},
      {pa:5000,t:10,d:681.2},
      {pa:5000,t:20,d:739.1},
      {pa:5000,t:30,d:803.1},
      {pa:5000,t:40,d:871.7},
      {pa:6000,t:0,d:704.1},
      {pa:6000,t:10,d:766.6},
      {pa:6000,t:20,d:835.2},
      {pa:6000,t:30,d:909.8},
      {pa:6000,t:40,d:995.2},
      {pa:7000,t:0,d:795.5},
      {pa:7000,t:10,d:868.7},
      {pa:7000,t:20,d:952.5},
      {pa:7000,t:30,d:1045.5},
      {pa:7000,t:40,d:1150.6},
      {pa:8000,t:0,d:906.8},
      {pa:8000,t:10,d:996.7},
      {pa:8000,t:20,d:1100.3},
      {pa:8000,t:30,d:1219.2},
      {pa:8000,t:40,d:1360.9},
    ],
  landing_table: [
      {pa:0,t:0,d:367.3},
      {pa:0,t:10,d:376.4},
      {pa:0,t:20,d:385.6},
      {pa:0,t:30,d:394.7},
      {pa:0,t:40,d:405.4},
      {pa:1000,t:0,d:376.4},
      {pa:1000,t:10,d:385.6},
      {pa:1000,t:20,d:396.2},
      {pa:1000,t:30,d:405.4},
      {pa:1000,t:40,d:416.1},
      {pa:2000,t:0,d:385.6},
      {pa:2000,t:10,d:396.2},
      {pa:2000,t:20,d:406.9},
      {pa:2000,t:30,d:417.6},
      {pa:2000,t:40,d:428.2},
      {pa:3000,t:0,d:396.2},
      {pa:3000,t:10,d:406.9},
      {pa:3000,t:20,d:417.6},
      {pa:3000,t:30,d:428.2},
      {pa:3000,t:40,d:438.9},
      {pa:4000,t:0,d:406.9},
      {pa:4000,t:10,d:417.6},
      {pa:4000,t:20,d:429.8},
      {pa:4000,t:30,d:440.4},
      {pa:4000,t:40,d:451.1},
      {pa:5000,t:0,d:417.6},
      {pa:5000,t:10,d:431.3},
      {pa:5000,t:20,d:442.0},
      {pa:5000,t:30,d:452.6},
      {pa:5000,t:40,d:464.8},
      {pa:6000,t:0,d:431.3},
      {pa:6000,t:10,d:443.5},
      {pa:6000,t:20,d:454.2},
      {pa:6000,t:30,d:467.9},
      {pa:6000,t:40,d:478.5},
      {pa:7000,t:0,d:443.5},
      {pa:7000,t:10,d:455.7},
      {pa:7000,t:20,d:467.9},
      {pa:7000,t:30,d:480.1},
      {pa:7000,t:40,d:492.3},
      {pa:8000,t:0,d:457.2},
      {pa:8000,t:10,d:469.4},
      {pa:8000,t:20,d:481.6},
      {pa:8000,t:30,d:493.8},
      {pa:8000,t:40,d:507.5},
    ],
  takeoff_table_alt: [
      {pa:0,t:0,d:310.9},
      {pa:0,t:10,d:333.8},
      {pa:0,t:20,d:356.6},
      {pa:0,t:30,d:381.0},
      {pa:0,t:40,d:408.4},
      {pa:1000,t:0,d:339.9},
      {pa:1000,t:10,d:364.2},
      {pa:1000,t:20,d:391.7},
      {pa:1000,t:30,d:419.1},
      {pa:1000,t:40,d:448.1},
      {pa:2000,t:0,d:373.4},
      {pa:2000,t:10,d:400.8},
      {pa:2000,t:20,d:429.8},
      {pa:2000,t:30,d:461.8},
      {pa:2000,t:40,d:495.3},
      {pa:3000,t:0,d:410.0},
      {pa:3000,t:10,d:440.4},
      {pa:3000,t:20,d:474.0},
      {pa:3000,t:30,d:509.0},
      {pa:3000,t:40,d:547.1},
      {pa:4000,t:0,d:452.6},
      {pa:4000,t:10,d:487.7},
      {pa:4000,t:20,d:524.3},
      {pa:4000,t:30,d:565.4},
      {pa:4000,t:40,d:608.1},
      {pa:5000,t:0,d:501.4},
      {pa:5000,t:10,d:541.0},
      {pa:5000,t:20,d:583.7},
      {pa:5000,t:30,d:629.4},
      {pa:5000,t:40,d:678.2},
      {pa:6000,t:0,d:556.3},
      {pa:6000,t:10,d:602.0},
      {pa:6000,t:20,d:650.7},
      {pa:6000,t:30,d:704.1},
      {pa:6000,t:40,d:763.5},
      {pa:7000,t:0,d:621.8},
      {pa:7000,t:10,d:673.6},
      {pa:7000,t:20,d:731.5},
      {pa:7000,t:30,d:794.0},
      {pa:7000,t:40,d:864.1},
      {pa:8000,t:0,d:699.5},
      {pa:8000,t:10,d:760.5},
      {pa:8000,t:20,d:829.1},
      {pa:8000,t:30,d:903.7},
      {pa:8000,t:40,d:989.1},
    ],
  takeoff_table_alt_weight_kg: 953,
};
