# taco seamless

## Origin

Forked from `taco-kandi/1` on **2026-05-09** mid-`/vibej` run (iter 17) while *I Don't Love You — My Chemical Romance* was playing. **Fork reason flagged by user:** "but we have a horizontal 'seam'" — there's a visible horizontal seam artifact in the current composition that needs investigation/fixing in this iteration.

## Inherited features (from taco-kandi/1, iters 1-17)

Comprehensive coat-25/plasma hybrid:

**Foundation (iters 1-3):**
- Plasma raymarched accretion disk (from `shaders/plasma.frag`) inside taco silhouette
- Event horizon radial structure: core glow + photon ring + lens envelope
- Coat-25 chrome rim on the taco's ink lines
- Mask: alpha + (1 - r) of `images/taco.png`
- pitchClass-driven hue flash + treble shimmer

**Smoothing pass (iters 5-10):**
- All raw `bassZScore`/`float(beat)` replaced with `bassMedian + bassSlope * bassRSquared`-derived smoothed signals
- `taco-kandi.js` controller (latching exp-decay): `beat_pulse`, `bass_smooth`, `drop_glow`
- Coat-style cubic ease-in zoom: `INTENSITY = max(bass_smooth, midsN+centroidN)` then `smoothstep^3`
- Drop punch via latched `drop_glow * 0.25`

**Variety motifs (iters 9, 11, 13):**
- Kaleidoscope mirror fold (knob_6) — 2-12 mirrors of the plasma sample coords pre-raymarch
- Auto-cycling palette modes (25s clock): ember/emerald/arctic/prism, seeded
- knob_5 → palette FREEZE (lock the family, otherwise auto-rotates)

**Coat finale ports (iters 14, 15, 16, 17):**
- VJ INNER GLOW — chrome bloom near silhouette edge inward
- VJ TIME-ECHO — triple R/G/B-tinted prev-frame samples on energy surges (>0.5 z-score)
- VJ FRY (knob_8) — hypersaturated hue-cycle drift, the-coat-25 finale signature
- VJ CHAOS HALO (knob_14) — concentric rings emanating from taco, multi-mode (tight/wide/spiral)
- VJ WARM HEARTH — auto-gated amber glow on warm-bass-mid-dominant corner

**Other audio-reactive layers:**
- Fractal fur fibers (entropy + roughness gated)
- Sigil swirl (mids + pitchClass)
- CALM_WARM 0.4Hz breath (low energy + present mids + dark centroid)
- Beat-driven RIM ZAP on flux peaks
- Frame feedback with hue aging in oklch

## Baked knob values (live state at fork time)

| knob | value | effect |
|---|---|---|
| knob_1 | 0.52 | SHAPE_TWIST (plasma swirl rate) |
| knob_2 | 0.409 | COLOR_SPIN |
| knob_3 | 0 | FRACTAL_DENSITY (sparse folds) |
| knob_4 | 0.74 | RIM_GLOW |
| knob_5 | **1.0** | PALETTE FREEZE — locked at prism mode |
| knob_6 | 0.15 | KALEIDOSCOPE (just above off threshold) |
| knob_7 | 0.362 | ZOOM (mid-wide) |
| knob_8 | 0.394 | VJ FRY (mid-strength) |
| knob_10 | 0.449 | LENS_STRENGTH |
| knob_11 | 0.583 | DRIFT_SPEED (slightly faster than baseline) |
| knob_12 | 0.504 | (free — unwired) |
| knob_13 | 0.685 | (free — unwired) |
| knob_14 | 0.63 | CHAOS HALO (wide-mode rings) |
| knob_15 | 0.307 | (free — unwired, recently grabbed) |
| knob_16 | 0 | (free — unwired) |

## Preset URL

```
http://localhost:6969/jam.html?shader=redaphid/taco/seamless&image=images/taco.png&controller=taco-kandi
```

## Controller

`controllers/taco-kandi.js` — latching beat_pulse + EMA bass_smooth + sustained drop_glow.

## Why this fork — the seam

User flagged a **horizontal seam** visible in the composition. Likely culprits to investigate in iter 18+:
1. The plasma raymarch's z-axis sample center wander (`vec3(0, 0, sin(t*0.7)*0.2)` in plasmaMap) might cross a discontinuity
2. The kaleidoscope fold's `mod(kal_a, seg)` could wrap at theta=0 (positive-x axis) creating a horizontal line
3. The mask boundary `vec2 imgUV = c + 0.5` margin check could leave a hard edge at imgUV.y == margin
4. The hearth_d radial threshold `length(uv - taco_center) - 0.18` is concentric — unlikely culprit
5. The taco_center y=0.48 might align with image-margin y=0.02/0.98 boundary at a specific aspect ratio

Highest priority: kaleidoscope theta wrap + plasma z-wander.

## Long-form set context

This fork happens during prep for a multi-hour live VJ set tomorrow. The "seam" needs to be hunted down before then — visible artifacts will be more obvious projected.
