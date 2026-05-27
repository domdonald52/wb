# Within Limits — Weight & Balance + Performance PWA

A weight & balance and takeoff/landing performance calculator for light aircraft. Runs as a Progressive Web App: works in any browser, installs to the home screen on iOS/Android, works **offline** once loaded.

## Repository layout

This repository contains:

### Main app (deploy to web host)
- `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `chart.umd.min.js`
- `performance.js` — calculation engine (FM and P-chart modes)
- `perf-pa38.js`, `perf-c172n.js`, `perf-c152.js` — per-aircraft P-chart and FM data

### Maintainer / developer tools (use locally, no deployment needed)
- `editor.html` — standalone editor for creating club JSON config files
- `compare.html` — P-chart vs FM+AC91-3 method comparison (heatmap, charts)
- `pchart-digitiser.html` — P-Chart Tracer for validating chart-derived numbers
- `club-data-template.json` — sample club data file (starting point for maintainers)
- `tools/validate-fm.js` — FM-mode validation script (Node)
- `make_icons.py` — regenerate PWA icons

### Documentation
- `README.md` — this file
- `VALIDATION.md` — audit trail of performance-data validation against source charts

## What the main app does

**Weight & Balance**
- Stores a configurable fleet of aircraft (empty weight, empty arm, station arms+limits, fuel arm, usable fuel, burn rate, MTOW/MLW, CG envelope).
- **Plan flight mode** — enter station weights, fuel, flight duration. Shows takeoff and landing weight/CG, both checked against MTOW/MLW and the envelope. CG plot shows both points + fuel-burn track.
- **Max fuel / endurance mode** — enter passengers, app reports max possible fuel and resulting endurance with reserve.
- **Multi-leg mode** — multiple legs with fuel uplift between them, every transition checked.
- **Scenarios** — save loading patterns ("Solo + full fuel", "Instructor + student") per aircraft.
- **Print / PDF** — A4 W&B sheet.
- Imperial (lb/in/gal) and metric (kg/mm/L) units, per aircraft.

**Performance (takeoff & landing distance)**
- Two methods: **P-chart** (CASO 4-compliant chart-derived numbers) or **FM + AC91-3** (raw Flight Manual data layered with AC91-3 generic correction factors).
- All 6 CASO operation lines for P-chart (Private/Air-Transport × Paved/Grass × Day/Night).
- Wind, slope, surface, wet runway corrections.
- Crosswind component checked against demonstrated and club limits.
- Out-of-range wind (>5 kt TW, >20 kt HW) or out-of-envelope (PA/elev/OAT) forces NO-GO.
- GO / NO-GO traffic-light vs TORA and LDA.
- "Plan for the larger" view when both methods are available.

**Club data sync**
- Pull aircraft and runway data from a club-hosted JSON file (OneDrive or Google Drive direct link).
- Multiple clubs supported — data tagged with source club name, visible in headers and config screens.
- Disclaimer modal on every sync (PIC remains responsible for verification).

## Maintainer tools

### `editor.html` — Club data editor
Standalone HTML file. Lets a maintainer (CFI, ops manager) build a club JSON file from scratch or by importing an existing file. Outputs a JSON file ready to drop in OneDrive/Drive.

Workflow:
1. Open `editor.html` in any browser
2. Set club name, maintainer, etc.
3. Add aircraft and runways (or open an existing club JSON / app export to start from)
4. Save as JSON
5. Drop the file in shared OneDrive/Drive folder, share with members

The editor doesn't touch any installed app data — it's purely a file editor.

### `compare.html` — Method comparison
Standalone HTML file. Shows the discrepancy between P-chart and FM+AC91-3 methods across PA × OAT, operation type, wind, and weight. Useful for understanding when the two methods diverge.

Requires the same folder to contain: `chart.umd.min.js`, `performance.js`, `perf-pa38.js`, `perf-c172n.js`, `perf-c152.js`.

### `pchart-digitiser.html` — P-Chart Tracer
Standalone tool for tracing values from P-chart images. Used to validate the perf-*.js data files. Includes de-skew, calibration, H/V lock. See `VALIDATION.md` for the validation methodology and results.

### `tools/validate-fm.js`
Node script that exercises every cell in the FM tables (where present) and compares against the engine. Run with `node tools/validate-fm.js` from the `wb/` directory.

### `club-data-template.json`
A starting point for club maintainers. Contains the JSON envelope structure with one sample aircraft and two sample runways. Copy this file, edit it, and use it as the source for `editor.html` or as a direct template.

## Deployment

### Option 1 — open from disk
Unzip and open `index.html` in any browser. Works immediately, no install-to-home-screen.

### Option 2 — host on GitHub Pages or any static host (recommended)
1. Push this repo to GitHub.
2. Settings → Pages → Source = main branch, root.
3. Open the resulting URL on phone/tablet.
4. **iOS:** Share → Add to Home Screen. **Android Chrome:** menu → Install app.
5. Opens fullscreen, offline-capable.

Also works on Netlify, Cloudflare Pages, Vercel, or any static host.

### Option 3 — App Store / Play Store
Wrap with [Capacitor](https://capacitorjs.com/) if a store listing is needed. Not necessary for use.

## Configuring aircraft

The app ships with sample data for C152, C172N, PA-28, PA-38. **These are illustrative — replace with values from each aircraft's individual weighing report and POH before flight planning.** Empty weight changes after every maintenance event.

To edit: select the aircraft → "Edit selected". To add: "+ Add aircraft".

For each aircraft you need:
- **Empty weight + empty arm** from the most recent weighing report (not the POH "typical").
- **Stations** with name, arm, max load. Multi-zone baggage gets one station per zone.
- **Fuel** — usable, arm, burn rate.
- **Limits** — MTOW, MLW (if different).
- **CG envelope** — at least 2 vertices (weight, fwd_arm, aft_arm). Linear interpolation between.
- **Reserve minutes** — VFR day 30, night 45, IFR 45.

## Sharing configs

Three options:

1. **Manual** — Menu → Export → AirDrop / email the JSON → Import on other device.
2. **Club sync** — Maintainer publishes a club JSON file to OneDrive/Drive; pilots add the URL once and pull updates on demand.
3. **Editor-driven** — Maintainer uses `editor.html` to build the club JSON file, drops it in shared storage.

Approach (2) + (3) is the recommended workflow for a club.

## Safety

This is a planning aid, not a substitute for the POH or pilot judgement. **Always:**

- Verify configured numbers match current weighing report and POH.
- Cross-check against an independent calculation until you trust the app.
- Sanity-check results — if it says you're fine but you put 4 large adults and full tanks in a C152, something is wrong.
- For club-synced data: club is providing without warranty; PIC remains responsible.

The app is offered as-is with no warranty. The PIC is responsible for the safe loading and operation of the aircraft.

## Validation

Performance calculations have been validated against the original P-chart images for the Wellington Aero Club fleet. See `VALIDATION.md` for the full audit trail — 71 chart-traced test points across PA-38, C172N, C152, all within ±5% tolerance.

