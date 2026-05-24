# Weight & Balance — aero club PWA

A weight & balance calculator for light aircraft. Runs as a Progressive Web App: works in any browser, installs to the home screen on iOS/Android, works **offline** once loaded.

## What it does

- Stores a configurable fleet of aircraft, each with empty weight, empty arm, station arms, station limits, fuel arm, usable fuel, burn rate, MTOW/MLW/MZFW, reserve minutes, and a CG envelope (as a list of weight + fwd/aft arm vertices).
- **Plan flight mode** — enter station weights, fuel on board, and flight duration. Shows takeoff weight, landing weight, takeoff CG, landing CG, all checked against MTOW/MLW and the envelope at both weights. The CG envelope plot shows both points and the dashed line between them (the fuel-burn track).
- **Max fuel / endurance mode** — enter the station weights only. App tells you the maximum fuel you can carry (limited by MTOW, tank capacity, or CG), the resulting endurance to dry tanks, and the useful endurance after your configured reserve.
- **Multi-leg mode** — model a flight with multiple legs, including fuel uplift between legs. Each leg has a duration and (from leg 2 onwards) an "uplift before leg" amount. The app shows start and end weight/CG for every leg, checks each transition against MTOW, MLW, and the envelope, and warns if the final fuel drops below your reserve. The envelope plot shows every leg's start and end as a connected trajectory.
- **Scenarios** — save the current loading (stations, fuel, duration, mode, and legs) under a name like "Solo + full fuel" or "Instructor + student + 1.5 hr". Per aircraft. Recall with one tap. Travel with the aircraft via export/import.
- **Print / PDF** — tap the print icon to render a single-page A4 W&B sheet showing: aircraft, date/PIC blanks, pass/fail banner, loading summary, headline results, and envelope chart. Use the browser's "Save as PDF" option to keep it as a file.
- **Duplicate aircraft** — "Duplicate selected" on the aircraft list, or "Save as copy" inside the config editor. Faster than re-entering an aircraft from scratch when only the empty weight, empty arm, or registration differs.
- **Performance (takeoff and landing distance)** — for aircraft with P-chart data, the Performance tab computes:
  - Takeoff and landing distance required (over 50 ft), with all 6 CASO 4 operation lines (Private/Air Transport × Paved/Grass × Day/Night).
  - Wind components from runway heading + wind direction/speed, or directly entered as headwind component.
  - Slope, surface, and wet-runway corrections applied automatically.
  - Crosswind component checked against the demonstrated and club crosswind limits (lower of the two wins).
  - GO / NO-GO traffic-light vs TORA and LDA, with margin %.
  - Recent runways (last 5) saved across sessions for quick re-entry — never authoritative, always re-verify against the current AIP.
  - Currently the PA-38 has full P-chart data from the Wellington Aero Club P-charts (Dom Donald 2024). Other aircraft will say "no performance data" until P-charts are added.
- All numbers checked: any out-of-limits condition triggers a red banner listing every violation.
- Calculation breakdown table for each result (item, weight, arm, moment) so you or an examiner can audit the answer.
- Supports both imperial (lb / in / US gal) and metric (kg / mm / L) units, per aircraft.

## Deployment options

### Option 1 — open from disk
Unzip the folder. Open `index.html` in any browser (Safari, Chrome, Edge, Firefox). Works immediately, but no install-to-home-screen.

### Option 2 — host on GitHub Pages or any static host (recommended)
1. Create a free GitHub account, make a new repo, upload these files to it.
2. In the repo's Settings → Pages, set "Source" to "Deploy from branch", choose `main` / root.
3. After a minute you'll have a URL like `https://<your-name>.github.io/<repo>`.
4. Open that URL on your iPhone/iPad/Android device.
5. **iOS:** tap Share → Add to Home Screen. **Android Chrome:** tap menu → Install app.
6. It now opens fullscreen with its own icon, works offline, and feels like a native app.

You can also host this on Netlify, Cloudflare Pages, Vercel, or your aero club's existing website — any static-file host works.

### Option 3 — App Store / Play Store (later, if needed)
Wrap with [Capacitor](https://capacitorjs.com/). This converts the PWA into a native iOS and Android app you can submit to the stores. Worth it only if you want a store listing; not necessary for use.

## Configuring your aircraft

The app ships with sample numbers for a C152, C172N, PA-28-161, and PA-38. **These are illustrative — you must replace them with the numbers from each aircraft's individual weighing report and POH before flight planning.** Empty weight changes after every maintenance event, paint job, or avionics install.

To edit: select the aircraft → "Edit selected". To add another: "+ Add aircraft".

For each aircraft you need:
- **Empty weight + empty arm** — from the most recent weighing report (not the POH "typical" figures).
- **Stations** — name, arm, max load, and a default occupant weight for each. Multi-zone baggage (C172 has Area 1 and Area 2) gets one station per zone.
- **Fuel** — usable fuel in tank, fuel arm (may vary slightly with quantity in tip-tank aircraft; use the POH average), burn rate (POH average for the cruise phase you typically plan to).
- **Limits** — MTOW, MLW (if different from MTOW; same for most light singles), MZFW (only if your POH gives one).
- **CG envelope** — at least two (weight, fwd_arm, aft_arm) points. For a C172 the envelope is a trapezoid with the forward limit kinking aft at higher weights; you'd enter three points to capture the kink (e.g. 1500/35.0/47.3, 1950/35.0/47.3, 2300/38.5/47.3). The app linearly interpolates between adjacent points.
- **Reserve minutes** — used by the max-fuel/endurance mode. VFR day = 30, night = 45, IFR = 45.

## Sharing configs across club devices

Menu → Export all aircraft (JSON). Send the file by email or AirDrop. On the other device: Menu → Import aircraft (JSON). This is the simplest way to keep the clubhouse iPad and your phone in sync.

If the club wants automatic syncing across many devices, that needs a small backend (Firebase, Supabase, or a tiny custom one). Easy to add later if you outgrow the manual export approach.

## Safety note

This is a tool to assist with planning, not a substitute for the POH or a pilot's own judgement. **Always:**

- Verify the configured numbers match the current weighing report and POH for that specific airframe.
- Cross-check the result against an independent calculation (a paper sheet or another tool) until you trust the app.
- Sanity-check the result — if it says you're fine but you put 4 large adults and full tanks in a C152, something is wrong.

The app is offered as-is with no warranty. The Pilot-in-Command is responsible for the safe loading of the aircraft.

## Files

- `index.html` — markup and styles
- `app.js` — calculation, rendering, storage, configuration UI
- `sw.js` — service worker for offline support
- `manifest.webmanifest` — PWA install metadata
- `icon-192.png`, `icon-512.png` — app icons
- `make_icons.py` — Python script that generated the icons (re-run if you want to customise)
- `verify.js`, `verify2.js` — small Node scripts that exercise the W&B math against known cases. Useful if you want to extend the calculation engine.

## Coming next (discussed)


- **Shared/central aircraft configs across devices** — separate discussion. Several routes (free Firebase/Supabase database, a GitHub-hosted JSON file the app pulls on launch, a tiny custom backend, or a "club admin exports + others import" workflow). The right answer depends on how many people will edit configs vs read them and how often the empty weights change.

## Other possible enhancements

- Crew database (pilot names with weights) so you can pick "Tom + Sarah" instead of typing kg.
- Audit log (which pilot calculated W&B for which flight, with date/time) for club records.
- Per-aircraft additional performance data for more types as the club fleet grows.
