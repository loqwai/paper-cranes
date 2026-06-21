# blobs-2

Forked from **blobs-1** on 2026-06-07, during *Heart's Reprise — Headlund* (ambient/calm rotation: Jeremy Soule, Gabriel Lewis, Dust Follows, Porter Robinson).

## Why this fork
Captures the state after the big iter-7 rework: **smooth structure-driven oklch color** (no patchwork), **slow-stat palette** (long-term shifts), **harmonized rim**, and a **static de-gridded hall-of-mirrors** background.

## Design
- **Geometry:** 16-sphere raymarched metaball field. `knob_4` sets blob COUNT (4..16), `knob_11` sets SPREAD (separation).
- **Color (oklch):** hue glides smoothly across the cluster from surface orientation (`flow = n.x*0.6 + n.y*0.45 + 0.3·sin(...)`) plus **slow audio stats** so the palette evolves with song sections, not frame jitter:
  - `SLOW_HUE = (pitchClassMean−0.5)·2.5 + (spectralCentroidMean−0.3)·1.2`
  - `(spectralSkewMean−0.5)·0.4` base tilt
  - brightness lift `AIRGLOW = spectralCentroidMean`
  - **No fast (Normalized/ZScore/Slope) features on hue/brightness** — slow only.
- **Rim:** harmonized — light, low-chroma, hue-analogous (`hue + 0.45`); no clashing blue-violet.
- **Background mirror:** STATIC UV-space tiling (`tile = 2.6`, undistorted because cells share the screen aspect). De-gridded with alternate-cell x/y flips + per-copy brightness variation + soft vignette. **No drift/warp/rotation** (user disliked background motion). `knob_1` controls presence.
- **Motion:** monotonic via `controllers/blobs.js` (`blobMotion` orbit phase; speed from spectralFlux). Audio scales speed, never phase → no shake.

## Audio mapping (still spectral-domain only — no bass/treble/energy)
| Feature (stat) | Drives |
|---|---|
| pitchClassMean, spectralCentroidMean, spectralSkewMean | **slow palette hue + brightness** |
| spectralFlux (controller) | blob orbit **speed** |
| spectralEntropy slope×r² | blob **melt** (BLOB_K) |
| spectralSpread slope×r² | blob **spread** |
| spectralRolloff slope×r² | **fog** density |
| spectralCrestNormalized | chroma micro-vividness |
| spectralRoughnessNormalized | rim intensity/fuzz |
| spectralKurtosisNormalized | rim focus (tight↔diffuse) |

## Baked knobs (preset)
| Knob | Value | Controls |
|---|---|---|
| knob_1 | 0 | MIRROR_AMT — hall-of-mirrors presence (minimal) |
| knob_2 | 0 | HUE_KNOB — palette rotation (0.5 = peach) |
| knob_3 | 1 | CHROMA — vividness (full) |
| knob_4 | 1 | COUNT — 16 blobs |
| knob_5 | 1 | COLOR_GLIDE — max hue glide across cluster |
| knob_6 | 0 | FOG — extra haze (none) |
| knob_10 | 1 | EXPOSURE — brightness (full) |
| knob_11 | 0.228 | SPREAD — tighter cluster |

Controller: `?controller=blobs`

## Preset URL
```
/jam.html?shader=redaphid/wip/blobs/blobs-2&controller=blobs&fullscreen=true&knob_1=0&knob_2=0&knob_3=1&knob_4=1&knob_5=1&knob_6=0&knob_10=1&knob_11=0.228
```
