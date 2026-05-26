# Within Limits — Performance Data Validation

This document records validation of the app's performance calculations against
the source data (Flight Manual tables, P-charts). It is the audit trail for the
CASO-4 / AC91-3 / FM-data implementation.

The app has two performance methods, each validated separately:

- **FM mode** — uses tabular FM data (`takeoff_table` / `landing_table`) when
  present, with AC91-3 factors (surface, slope, wind, wet) applied on top.
  Falls back to a linear-coefficient model for aircraft without tabular FM.
- **P-chart mode** — uses `reference_points` grid + operation multipliers +
  weight/wind/slope corrections, with chart-baked factors (not AC91-3).

---

## FM mode validation

Method: for each entry in `takeoff_table` / `landing_table`, run the engine
with the same inputs (PA, OAT, paved, dry, zero wind, zero slope, MTOW),
compare app output vs the table value.

| Aircraft | T/O cells | T/O max diff | LD cells | LD max diff | Status |
|---|---|---|---|---|---|
| **PA-38**  | n/a (linear coefficient only)         | n/a    | n/a    | n/a    | n/a |
| **C172N**  | 45 (9 PA × 5 OAT) | 0.0 m  | 45     | 0.0 m  | ✓ PASS |
| **C152**   | 45 (9 PA × 5 OAT) | 0.0 m  | 45     | 0.0 m  | ✓ PASS |

Engine reproduces FM grid points exactly via bilinear interpolation. The
AC91-3 layer applied on top (surface, slope, wind, wet) uses the published
constants — these have not been independently re-validated here.

---

## P-chart validation walkthrough (Wellington Aero Club fleet)

### Method

1. Open each chart in the **P-Chart Tracer**
2. De-skew (4-click rotation correction)
3. Calibrate the right-side distance scale (≥2 ticks)
4. Trace one full path through the chart per test case
5. Read the exit distance off the calibrated Y axis
6. Compare against the app's computed value

Tolerance: ±5% (chart reading + tracer precision)

### Results table (post-fix)

All values in metres. Diff = (engine − traced)/traced × 100%.

#### PA-38 Tomahawk (Air 2054, 14/3/1990)

| Test                          | Traced | Engine | Diff   |
|-------------------------------|--------|--------|--------|
| **Takeoff** | | | |
| Step 1: SL/15C PPD            |   440  |   440  |  0.0%  |
| Step 1: 2000ft/15C PPD        |   610  |   610  |  0.0%  |
| Step 1: 3000ft/15C PPD        |   690  |   685  | −0.7%  |
| Step 2: PPD baseline (SL/15C) |   440  |   440  |  0.0%  |
| Step 2: AT-PD                 |   515  |   515  |  0.0%  |
| Step 2: P-GD                  |   480  |   480  |  0.0%  |
| Step 2: AT-GD                 |   560  |   560  |  0.0%  |
| Step 2: AO-PN                 |   580  |   580  |  0.0%  |
| Step 2: AO-GN                 |   650  |   650  |  0.0%  |
| Step 3: HW 10kt ratio (avg of 4 base) | 0.750 | 0.750 | 0.0% |
| Step 3: TW 5kt ratio (avg of 4 base)  | 1.18  | 1.185 | +0.4% |
| Step 4: +2% slope             |   485  |   484  | −0.2%  |
| **Landing** | | | |
| L1: SL                        |   495  |   490  | −1.0%  |
| L1: 2000ft                    |   510  |   510  |  0.0%  |
| L1: 4000ft                    |   520  |   520  |  0.0%  |
| L2: AT-PD                     |   580  |   584  | +0.7%  |
| L2: P-GD                      |   620  |   622  | +0.3%  |
| L2: AO-PN                     |   650  |   660  | +1.5%  |
| L2: AT-GD                     |   740  |   735  | −0.7%  |
| L2: AO-GN                     |   840  |   832  | −1.0%  |
| L3: HW 10kt ratio (avg)       | 0.75   | 0.75   |  0.0%  |
| L3: TW 5kt ratio (avg)        | 1.20   | 1.20   |  0.0%  |
| L4: +2% upslope               |   430  |   431  | +0.3%  |

#### Cessna C172N (Air 2083, 20/3/1990)

| Test                          | Traced | Engine | Diff   |
|-------------------------------|--------|--------|--------|
| **Takeoff** | | | |
| Step 1: SL/15C PPD            |   475  |   475  |  0.0%  |
| Step 1: 2000ft/15C PPD        |   580  |   580  |  0.0%  |
| Step 1: 3000ft/15C PPD        |   640  |   635  | −0.8%  |
| Step 2: P-GD                  |   526  |   526  | −0.1%  |
| Step 2: AT-PD                 |   556  |   556  |  0.0%  |
| Step 2: AT-GD                 |   617  |   617  | −0.1%  |
| Step 2: AO-PN                 |   637  |   637  |  0.0%  |
| Step 2: AO-GN                 |   697  |   697  |  0.0%  |
| Step 3: HW 10kt ratio (avg)   | 0.753  | 0.750  | −0.4%  |
| Step 3: TW 5kt ratio (avg)    | 1.187  | 1.185  | −0.2%  |
| Step 4: +2% slope             |   525  |   523  | −0.5%  |
| Step 5: 953kg                 |   380  |   380  |  0.0%  |
| Step 5: 862kg                 |   295  |   295  |  0.0%  |
| **Landing** | | | |
| L1: SL                        |   380  |   380  |  0.0%  |
| L1: 2000ft                    |   400  |   400  |  0.0%  |
| L1: 4000ft                    |   420  |   420  |  0.0%  |
| L2: AT-PD                     |   440  |   445  | +1.1%  |
| L2: P-GD                      |   475  |   500  | +5.3% ⚠ |
| L2: AO-PN                     |   500  |   510  | +2.0%  |
| L2: AT-GD                     |   550  |   560  | +1.8%  |
| L2: AO-GN                     |   625  |   620  | −0.8%  |
| L3: HW 10kt ratio (avg)       | 0.760  | 0.750  | −1.3%  |
| L3: TW 5kt ratio (avg)        | 1.187  | 1.20   | +1.1%  |
| L4: +2% upslope               |   335  |   334  | −0.2%  |

⚠ C172N landing P-GD shows 5.3% diff — borderline. Either a chart-reading
   variance or the stored multiplier is slightly too high. The other 4 ops
   on the same chart match within 2%, so leaving as-is and flagging.

#### Cessna C152 (Air 2032+, 18/12/1984)

| Test                          | Traced | Engine | Diff   |
|-------------------------------|--------|--------|--------|
| **Takeoff** | | | |
| Step 1: SL/15C PPD            |   400  |   400  |  0.0%  |
| Step 1: 2000ft/15C PPD        |   513  |   513  | −0.1%  |
| Step 1: 3000ft/15C PPD        |   565  |   565  |  0.0%  |
| Step 2: P-GD                  |   440  |   435  | −1.1%  |
| Step 2: AT-PD                 |   460  |   460  |  0.0%  |
| Step 2: AT-GD                 |   520  |   520  |  0.0%  |
| Step 2: AO-PN                 |   535  |   530  | −0.9%  |
| Step 2: AO-GN                 |   595  |   590  | −0.8%  |
| Step 3: HW 10kt ratio (avg)   | 0.754  | 0.750  | −0.5%  |
| Step 3: TW 5kt ratio (avg)    | 1.187  | 1.185  | −0.2%  |
| Step 4: +2% slope             |   440  |   440  |  0.0%  |
| **Landing** | | | |
| L1: SL                        |   370  |   370  |  0.0%  |
| L1: 2000ft                    |   390  |   390  |  0.0%  |
| L1: 4000ft                    |   405  |   410  | +1.2%  |
| L2: AT-PD                     |   430  |   430  |  0.0%  |
| L2: P-GD                      |   470  |   470  |  0.0%  |
| L2: AO-PN                     |   500  |   500  |  0.0%  |
| L2: AT-GD                     |   550  |   550  |  0.0%  |
| L2: AO-GN                     |   620  |   610  | −1.6%  |
| L3: HW 10kt ratio (avg)       | 0.747  | 0.750  | +0.4%  |
| L3: TW 5kt ratio (avg)        | 1.187  | 1.20   | +1.1%  |
| L4: +2% upslope               |   325  |   326  | +0.2%  |

---

## Data fixes applied (engine v66 → next)

All three P-chart data files were updated based on the validation findings:

### 1. Wind factors — split takeoff/landing, chart-derived values

Replaced single `wind_factor` block with `wind_factor_takeoff` and
`wind_factor_landing`. Engine updated to consume the new fields, falling
back to legacy `wind_factor` for compatibility.

| Factor | Was (AC91-3) | Now (chart-derived) |
|---|---|---|
| TO HW per kt   | 1.5%  | **2.5%** |
| TO TW per kt   | 6.0%  | **3.7%** |
| LD HW per kt   | 1.5%  | **2.5%** |
| LD TW per kt   | 6.0%  | **4.0%** |

These values apply across all three aircraft (PA-38, C172N, C152) — the
NZ P-chart family uses consistent wind factors that differ from AC91-3's
generic ones.

### 2. Slope — split takeoff/landing

Replaced single `slope_factor_pct_per_pct` with `_takeoff` and `_landing`
variants:

| Factor | Was | Now |
|---|---|---|
| TO upslope per 1%  | 5%  | 5%  (unchanged, matches charts) |
| LD upslope per 1%  | 5%  | **6%** (chart-derived) |

### 3. PA-38 landing AO-GN multiplier

Was 1.885, traced as 1.697. **Updated to 1.697.**

### 4. C172N takeoff weight multipliers

Refined slightly (chart-traced values):

| Weight | Was  | Now   |
|---|---|---|
| 953 kg | 0.780 | **0.800** |
| 862 kg | 0.613 | **0.621** |

---

## Known limitations (acceptable for current operating envelope)

1. **Landing HW factor is non-linear in distance** on all 3 charts.
   Best-fit constant (~2.5%/kt) gives ±0.5%/kt drift across the chart range.
   At the operating range (300-700 m), the resulting distance error is
   bounded to about ±5%. Could be addressed in a future engine version
   with a Y-dependent landing wind factor lookup table.

2. **Landing TW factor weakly drifts** from 4.0%/kt at shorter distances
   to 3.3%/kt at longer. Best-fit constant 4.0%/kt errs slightly on the
   conservative side at longer distances (good — better safe than sorry).

3. **Tailwind > 5 kt and headwind > 20 kt are silently clamped** by the
   engine to those limits. AC91-3 only defines behaviour up to those
   values. *To do (see next-build item 26):* return `outOfRange: true`
   and force NO-GO in the UI when input wind exceeds AC91-3's defined
   limits.

4. **FM mode wind layer** still uses AC91-3's 1.5%/6.0% (not the chart's
   2.5%/3.7-4.0%). This is intentional — FM tables don't include wind, so
   AC91-3 is the documented advisory factor. The P-chart's chart-baked
   factors are *not* applicable to FM mode.

5. **Slope: landing chart shows 6%/1% (chart vs engine's 5%/1%)**, now
   matched in data. Small effect at typical operating slopes (≤2%).

---

## Files

- `VALIDATION.md` — this document
- `tools/validate-fm.js` — FM mode validation script (run from `/wb`)
- `perf-pa38.js`, `perf-c172n.js`, `perf-c152.js` — updated perf data files
- `performance.js` — updated engine

