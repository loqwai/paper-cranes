# moire-eye-3

Fork of `moire-eye-1` — the calmed, flicker-fixed eye with the **music reactivity turned back
up** using a rich spectral audio map.

## Origin
- Forked from `redaphid/wip/moire-3d/moire-eye-1` on 2026-06-07 during a `/vibej` run.
- Music at fork time: **Subtronics — "Hieroglyph (Of The Trees Remix)"** (heavy bass dubstep;
  rotation also incl. deadmau5 "Lack of a Better Name").
- Lineage: `moire-eye-3 ← moire-eye-1 ← moire-3d-1 ← shadertoy lc3SWN` (ChunderFPV "Moire 3d
  template") × `iris-7`.

## Why this fork
eye-1 had been de-twitched so hard to kill the flicker (bass ×0.12, mids ×0.25, everything
else removed) that the audio response went invisible — user: *"I do not see the music
reactivity."* + *"You need to be using the spectral features, as well as the stats on those
features, as the uniforms."* eye-3 keeps the temporal frame-blend that fixed the flicker, but
drives **larger, slower reactions from a variety of independent spectral features + their
statistical variations**. The blend low-passes them, so they read as the eye *breathing* with
the music instead of strobing.

## Spectral audio map (the point of this fork)
| eye part | feature(s) + stat | why |
|----------|-------------------|-----|
| pupil dilation (headline) | `bassNormalized` + `energyZScore` + `spectralFluxZScore` | dilates on bass, punches wide on drops/transients |
| iris brightness breath | `energyNormalized` + `spectralCentroidSlope × spectralCentroidRSquared` | loud = bright; confident *build* slowly brightens |
| tunnel ripple rate | `spectralFluxNormalized` (rate) + `bassNormalized` (depth) | timbral motion quickens the moiré |
| stroma arms | `spectralSpreadNormalized` (band width) + `midsNormalized` (brightness) | harmonic width widens the arm zone |
| stroma grit | `spectralRoughnessNormalized` | dissonance raises radial striation contrast |
| iris warmth | `spectralCentroidNormalized` + `spectralSkew` | dark/bassy = warm-gold, tilt from skew |
| collarette hue | `pitchClassNormalized` | note tints the mid-ring |
| airglow rim | `spectralRolloffNormalized` (radius) + `trebleNormalized`/`trebleZScore` | highs cutoff sets rim, treble shimmers it |
| catchlight glint | `bassNormalized` + `spectralCrestNormalized` | spiky spectrum sharpens the highlight |
| iris focus / vignette | `spectralKurtosisNormalized` | peaky spectrum = more focused eye |
| stroma shimmer | `spectralEntropyNormalized` | chaos shimmers the stroma hue |

Features chosen from **independent domains** (per CLAUDE.md matrix) so the reactions don't all
move together: bass/mids/treble (bands) × centroid/spread/skew/kurtosis (shape) ×
roughness/entropy/crest (quality) × flux (temporal) × rolloff/pitch (tonal) × energy (loudness).

## knob_11 = MASTER REACT
One dial scales the whole audio response `0.5×..2×`. Wiggle it live to dial reactivity in/out.

## Other knobs
| knob | controls |
|------|----------|
| 9 / 12 | gaze Y / X |
| 14 | pupil size |
| 1 | zoom (FOV) |
| 2 | iris hue tint |
| 6 | gold-core strength |
| 13 | anti-flicker (frame-blend persistence) |
| 16 | outer stroma glow |
| 19 | catchlight + gaze strength |

## Preset URL
```
?shader=redaphid/wip/moire-3d/moire-eye-3&remote=display&fullscreen=true&knob_11=1&knob_13=0.5&knob_14=0.4&knob_1=0.9
```
