# the-coat-15

## Origin

Forked from `the-coat-14` on **2026-04-27** mid-`/vj` run (iter 64) while *Temptation – SIDEPIECE* was playing. Captured the "painterly-groove + cool-palette" knob config the user had dialed in across iters 60-64. State preserves the iter-64 RIM_BOOST formulation with all 6 pitch_change subscriptions.

## Knob defaults (baked from live state)

| knob | value | effect |
|---|---|---|
| knob_1 | 0.26  | zoom (mid-wide — figure not too close) |
| knob_2 | 0.66  | nebula fog density (cosmic haze, warm-shifted via knob_8) |
| knob_3 | **1.00** | palette hue rotation **MAX** (cool/teal/cyan zone) |
| knob_4 | 0.00  | eye wash override (off — eyes use audio-region channels) |
| knob_5 | 0.00  | drop-zoom punch **OFF** |
| knob_6 | **1.00** | camera tilt swagger **MAX** |
| knob_7 | 0.80  | fur thickness (thick) |
| knob_8 | 0.45  | DOOM RED BG tint (moderate crimson, below nebula warm-shift threshold) |
| knob_9 | **0.92** | feedback / heavy smear (painterly trails) |
| knob_10 | 0.33  | GROUND QUAKE gain (mild) |
| knob_11 | 0.68  | STEP RIPPLE (lateral beat wave) |
| knob_12 | 0.31  | INKY BG (mild dim outside silhouette) |
| knob_13 | 0.00  | BEAT STROBE (off) |
| knob_14 | 0.34  | SIGIL SWIRL (mild) |
| knob_15 | 0.02  | DRIP (essentially off) |

## Preset URL

```
http://localhost:56619/jam.html?shader=redaphid/wip/the-coat-fur-coat/the-coat-15&controller=the-coat&knob_1=0.26&knob_2=0.661&knob_3=1&knob_4=0&knob_5=0&knob_6=1&knob_7=0.795&knob_8=0.449&knob_9=0.921&knob_10=0.331&knob_11=0.677&knob_12=0.307&knob_13=0&knob_14=0.339&knob_15=0.024
```

## Controller

Uses `controllers/the-coat.js` (extended in iter 38 of the VJ run): emits `drop_glow` (sustained drop momentum, decay via knob_13) and `pitch_change` (transient 0-1 pulse on pitch-class jumps > ~1 semitone, decays in ~0.5s).

## What this fork captures (vs the-coat-14 baseline)

The-coat-14 went through 27 ticks of live VJ refinement (iters 38-64). Key durable additions baked into this fork:

- **pitch_change event subscription across 6 systems** (HUE_BASE rotation, eye intensity, Z-TRAIN beam, SIGIL SWIRL gain, WARM HEARTH, RIM_BOOST) — harmony arrivals ripple across the figure.
- **VJ Z-TRAIN motif** (iter 44) — slow horizontal headlight beam gated to ZHU's bass-dominant + low-entropy + low-centroid corner.
- **VJ DOOM RED BG tint** (iter 41) — knob_8 crimson BG overlay.
- **VJ EMBER RISE** (iter 46) — 6 deterministic upward-drifting sparks, gated to mid-vocal warm-low corner.
- **VJ STEP RIPPLE** (iter 43) — knob_11 lateral beat-wave from chest.
- **VJ GROOVE BREATH** (iter 48 + 51 tightening) — slow full-frame brightness breath gated to mid-energy bell-curve, suppressed during builds.
- **4-channel eye system** (iters 26/45/53/57) — bright-sustained, calm-vocal, chaotic-bright, harmony-arrival.
- **RIM_BOOST extended** (iters 47/61/63/64) — entropy×roughness chaos, energyZ drop, knob_1 zoom, pitch_change harmony.
- **Async shader compile** in `Visualizer.js` (iter 40) — HMR shader-swaps no longer freeze the renderer.
- **WARM HEARTH** energy gate widened to fire on vocal-with-energy passages (iter 62), HUE_BASE-linked color (iter 56).
- **Cross-feature harmony**: nebula colors warm-shift with knob_8, stars dim under nebula, hearth boosts under DOOM RED.

## Cool moments captured during the run

- iter 55: WARM HEARTH first activation in the wild (*Another You – Armin van Buuren*)
- iter 58: Z-TRAIN first activation under non-default palette (*Stay With Me – John Summit*)
- iter 62: Convergence moment `bass 0.88 + mids 0.83 + pitch_change 0.85` (*Simulation – Glass Petals*)

## Notes

This fork is a "painterly groove" alternative to the more figure-first the-coat-13. Where -13 reduces overlays for clarity, -15 leans into the painterly aesthetic with maxed feedback + camera swagger + full palette rotation.

knob_2 wiring stale-comment note: the journal originally called knob_2 "climax dampener" but the active wiring is `nebula fog density` (since iter 33 of the -14 lineage). Worth fixing in future Status sections.
