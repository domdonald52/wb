// AFM (POH-derived) performance data registry.
// Each entry holds simplified POH numbers for use when no P-chart exists.
// When the calc runs, AC91-3 surface (Table 1), slope (Table 2), wind (50%/150%),
// and wet (+15%) factors are applied on top of the POH baseline by the engine.
//
// Add new aircraft by appending: window.AFM_DATA['C172N'] = { ... }
// The fields below are illustrative — fill in from each POH's takeoff/landing
// distance charts. The structure expects: a base distance at MTOW / sea level /
// ISA, and percent corrections per 1000 ft of pressure altitude and per 10°C
// above ISA. Weight correction optional.
//
// CASO 4 factors are NOT applied by these numbers — they are applied by the
// engine, on top of these baselines (this is the AC91-3 prescribed workflow).

window.AFM_DATA = window.AFM_DATA || {};

// Example (commented out — fill in real numbers from each POH):
// window.AFM_DATA['C172N'] = {
//   name: 'Cessna 172N (POH simplification)',
//   source: 'C172N POH Section 5',
//   precision: '±10 % typical (POH chart digitisation + AC91-3 factors)',
//   takeoff: {
//     // takeoff over 50 ft at MTOW, sea level, ISA, paved, dry, zero wind, zero slope
//     base_msl_isa_m: 497,
//     pa_correction_pct_per_1000: 10,   // +10% per 1000 ft PA
//     temp_correction_pct_per_10c: 7,   // +7% per 10°C above ISA
//     weight_correction_pct_per_100kg: 5, // -5% per 100 kg below MTOW
//   },
//   landing: {
//     base_msl_isa_m: 461,
//     pa_correction_pct_per_1000: 5,
//     temp_correction_pct_per_10c: 4,
//     weight_correction_pct_per_100kg: 0,
//   },
//   demonstrated_crosswind_kt: 15,
// };
