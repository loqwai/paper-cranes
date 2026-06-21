# blobs-1 — Session Journal

## Status
Iter 2 on /vibej run. 16-sphere raymarched metaball field, now **PEACH-PLASMA** palette (oklch, hot peach-orange core → blue-violet corona) + soft photon-ring rim + deep-violet void. Audio = full spectral stat palette (slope×r² trends + zScore/normalized). Started 2026-06-07.

## Mandate (user, 2026-06-07 — evolved)
1. **Stay spectral-domain only** — no bass/treble/energy/amplitude.
2. Began **EXCLUSIVELY `*Slope` × `*RSquared`** (confident trends: slope = heading, rSquared = steadiness; product big only on a confident build/fall). **Reality check:** on calm tracks slopes are ~1e-4 (barely move); zScore/normalized give far more usable range.
3. User then: *"monitor the OTHER spectral features and their stats, start mixing them in."* → now use the **full spectral stat palette** (slope×r² for trend-detection + zScore for events + normalized for smooth modulation), across all 9 spectral features.
4. **Palette = PEACH-PLASMA** (per `journals/plasma` + `journals/magic-peach`, user: *"the plasma peach... there's a whole plasma series"*): `CORE_HUE 0.6` peach-orange → `CORONA_HUE 4.2` blue-violet, blended by **silhouette** (fresnel, not depth); soft wide photon-ring rim hue-locked to corona; deep-violet void where ray misses; plasma-soft gamma 0.82; oklch chroma ~0.15–0.18 (NOT 1.0).

### Scaling note (measured iter 1)
Spectral slopes are tiny per-frame: idle ≈ 1e-4, a full-swing trend ≈ 1e-3 (slope is per-frame change over the ~500-frame history window). So scale `slope * TREND_GAIN` (currently 2000) and clamp to ±1 BEFORE gating by rSquared. Multipliers smaller than ~1000 leave the shader effectively static.

## Audio mapping (iter 1)
- `FLUX_TREND`  (spectralFlux slope×r²)    → **MOTION** (orbit speed, 1.0 + t·0.8)
- `CHAOS_TREND` (spectralEntropy slope×r²) → **BLOB_K** (smooth-union melt, 0.4 + t·0.4)
- `WIDTH_TREND` (spectralSpread slope×r²)  → **SPREAD** (sphere displacement amplitude, 1.0 + t·0.5)
- `BRIGHT_TREND`(spectralCentroid slope×r²)→ **HUE_DRIFT** (cosine-palette phase, t·3.0)

## Cool moments
(none yet)

## Todo
- `[x]` Infinity mirror: user **rejected the ring tunnel** (inward zoom). Wants **many small copies scattered in space** around the balls. Fixed iter3 via subtronics fract-tiling (zoom OUT + fract wrap). **Do NOT reintroduce single inward-zoom feedback — it reads as rings.**
- `[ ]` Tiled-copy density is ~74% lit — if user says "too busy/less busy", lower `MIRROR_TILE` (2.0→1.6) or `MIRROR_DECAY` (0.68→0.55).
- `[x]` Shaky reactivity → fixed iter4 with **controllers/blobs.js** (monotonic phases; audio scales speed not phase). **Do NOT multiply iTime by an audio factor for phase — that is the shake.**
- `[x]` Distorted copies → aspect-correct the tiling before rotating. Seams → soft per-cell vignette (`edgeFade`). Copies competing with primary → composite BEHIND via `mix(mirror, col, smoothstep(primaryLum))` + darker `depthDim`.
- `[x]` **DEV-SERVER RESTART DONE (iter5)**: restarted with `PORT=6969` (branch default is 6674 — must force 6969 to match tabs/state). `index.js` `loadController` cache-bust fix is now live; controller loads NATIVELY on reload (verified, no injection). **Controllers work on the jam page now.**
- `[ ]` "permutations of the spheres" is currently approximated by per-cell rotation/scale of the fed-back frame (not true 3D re-renders). If user wants real permutations, render 2–3 extra metaball instances with shuffled per-sphere seeds behind the primary (costs raymarch passes).
- [ ] Watch whether TREND_GAIN=2000 reacts enough on real builds; bump toward 3000-4000 if too sleepy.
- [ ] Consider adding spectralRolloff/spectralCrest slope as a 5th spectral driver once the first four are tuned.

## Knob map (live controls)
- `knob_1` → **MIRROR_AMT** — hall-of-mirrors presence (0 = just the primary blobs, 1+ = full depth copies)
- `knob_2` → **HUE_KNOB** — palette rotation, `(knob_2-0.5)*3.0` rad (0.5 = default peach, up = gold/green/violet)
- `knob_10` → **EXPOSURE** — master brightness `0.7 + knob_10*0.7`
- (shader otherwise uses NO knobs — knob_3/4/5/6/7/8/9/11/13/14/15 are free; auto-wire as the user turns them)

## History of changes
- iter 1: created blobs-1 from pasted Shadertoy metaball source; wired 4 spectral slope×r² trends.
- iter 1b: added `ROLLOFF_TREND → FOG` (5th slope driver).
- **iter 2 (big): oklch peach-plasma rebuild + 3 new spectral drivers.** Replaced cosine palette with oklch peach-plasma (CORE 0.6 → CORONA 4.2, silhouette-blended), added soft photon-ring rim + deep-violet void + plasma-soft gamma 0.82. New spectral drivers (normalized stats): `spectralCrestNormalized → chroma vividness`, `spectralSkewNormalized → core-hue tilt (yellow↔coral)`, `spectralRoughnessNormalized → rim intensity/fuzz`.
  - **GOTCHA logged:** a stale on-disk save (oklch palette that referenced `FOG`/`ROLLOFF_TREND` before they were defined / malformed `#define ROLLOFF_TREND(` with no space → function-like macro) compiled black; user refreshed into it → **black screen**. Fix: always keep disk file compilable; under `remote=display` HMR is unreliable so after disk edits push `window.cranes.shader`. The async validator install (`await (async()=>{})()`) threw `await is not defined` in `javascript_tool` — push synchronously instead.
  - **Balance lesson:** first peach-plasma attempt keyed corona off depth → whole frame went blue (avg 27,66,110). Keying corona off **silhouette** + adding a dark void made the peach core dominate (lit 25%, ~80% of lit = peach).
- **iter 3:** `spectralKurtosisNormalized → rim FOCUS` (peaked spectrum → tight bright ring via `pow(fres, 1.0..2.2)` + smaller halo; diffuse → wide bloom). Then **INFINITY MIRROR**: first did inward-zoom feedback → user rejected ("rings"). Replaced with **subtronics fract-tiling** (`fract((uv-0.5)*TILE + 0.5 + drift)`, TILE 2.0–3.2 off spectralCentroid, rotation iTime*0.04, `max(col, prev*DECAY)`) → many small floating copies, lit ~74%, 0% white-out.

## Forks
- `blobs-2 ← blobs-1` (iter7, 2026-06-07, during *Heart's Reprise* — Headlund): captured the smooth-oklch-slow-palette + harmonized-rim + static-de-gridded-mirror state. VJ loop continues on blobs-2. Companion: `shaders/redaphid/wip/blobs/blobs-2.md`.

## Design hypotheses for v(next)
- Slope×r² is a "build detector" — pairs well with parameters that read as tension (melt, spread, speed) rather than instantaneous flashes.
