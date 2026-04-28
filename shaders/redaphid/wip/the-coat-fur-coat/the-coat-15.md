# the-coat-15

Forked from `the-coat-14.frag` (twister-fighter branch). First version designed
around the **MIDI Fighter Twister** for the upcoming live show. Every tunable
visual aspect is reachable through one of 16 high-level knobs, and every knob
crossfades between **manual** (you turn it) and **audio** (it tracks a paired
audio feature) on click.

## Knob layout

The 4×4 Twister face maps to four bands of the visual:

| # | Knob | Manual meaning | Audio pair |
|---|------|----------------|------------|
| 1  | **ZOOM**         | wide ↔ tight | `energyNormalized` |
| 2  | **BG MOOD**      | clean ↔ inky+nebula | `spectralEntropyNormalized` |
| 3  | **PALETTE**      | hue rotation 0..1 | `pitchClassNormalized` |
| 4  | **TILT**         | locked ↔ full sway | `bassNormalized` |
| 5  | **FUR PEAK**     | clean coat ↔ fibers visible | `spectralRoughnessNormalized` |
| 6  | **GLEAM**        | matte ↔ chrome shoulder gleam | `spectralFluxNormalized` |
| 7  | **SMEAR**        | crisp ↔ heavy feedback trails | `energyNormalized` |
| 8  | **CHAOS**        | calm fibers ↔ wild strand blend | `spectralEntropyNormalized` |
| 9  | **GOD RAYS**     | none ↔ blinding | `trebleNormalized` |
| 10 | **DROP SUSTAIN** | manual gate ↔ controller `drop_glow` | `drop_glow` |
| 11 | **CLIMAX**       | master gain (0.4×..1.3×) | `energyNormalized` |
| 12 | **EYE WASH**     | off ↔ max bloom on drops | `energyNormalized` |
| 13 | **BEAT STROBE**  | off ↔ full warm bump | `midsNormalized` |
| 14 | **SIGIL SWIRL**  | off ↔ full coat swirl | `spectralRoughnessNormalized` |
| 15 | **DRIP / POOL**  | off ↔ full chest drip + ground pool | `bassNormalized` |
| 16 | **SURPRISE**     | rim accent (`+0..0.6×` boost) | `spectralFluxNormalized` |

**Click any knob** → toggle that aspect between manual and audio. The LED on
the Twister turns blue when you own it and feature-coloured when audio owns it.

**Long-press knob 16** → fires a `cranes:vj-bump` event on `window` and writes
`localStorage['cranes-vj-bump']` with an ISO timestamp. The `/vj` skill polls
this between ticks; when it fires, /vj treats the next iteration as dramatic.

## Controller toggles

Knob 10 is the singular gate for the `controllers/the-coat.js` output:
- audio mode: `K_DROP_SUSTAIN = drop_glow` → controller drives the sustain
- manual mode + 0: kills the sustain entirely (falls back to instantaneous IS_DROP)
- manual mode + 1: pins drop_hit at 1.0 (locked-in drop look)

`drop_hit = max(drop_now, K_DROP_SUSTAIN)` cascades into eyes, god_rays, drip,
pool, sub_ring, black_hole, drop_color, drop_zoom, ground_quake — so the one
click silences every drop-gated effect at once.

## How `mix()` form works

```glsl
#define K_ZOOM mix(knob_1, energyNormalized, knob_1_mode)
```

`knob_1_mode` is a per-knob uniform that midi.js writes:
- 0.0 = pure manual (LED blue)
- 1.0 = pure audio (LED feature-colour)
- between = crossfade (live click animates 180 ms via a tween in `src/midi.js`)

Audio-on default is seeded for all 16 mode uniforms before the first frame
(see `seedAudioOnDefaults()` in `src/midi.js`), so the shader looks the way
the journals describe -14 looking, even before the user touches the Twister.

## Preset URL

Use with `?controller=the-coat&midi=true`:

```
?shader=redaphid/wip/the-coat-fur-coat/the-coat-15&controller=the-coat&midi=true
```

For audio-off testing of the manual side:
```
?shader=redaphid/wip/the-coat-fur-coat/the-coat-15&noaudio=true&knob_1=0.5&knob_1_mode=0&knob_3=0.4&knob_3_mode=0
```

(Override any `knob_N_mode=0` to test that knob in manual mode without MIDI.)

## What carried over from -14

- Coat anatomy and SDF math: identical.
- All VJ blocks (sub-ring, heart, drip, pool, water-pool, beams, ground-quake,
  warm-hearth, time-echo, black-hole) preserved as-is.
- Veto list still applies — no chaos-halo, crystalline-facets, mercury-flow,
  RGB split, scan-line, lightning, cosmic-shockwave, infinity-mirror, confetti,
  grit, tearfall.

## What changed from -14

- Knobs 1, 2, 3, 5, 6, 9, 12, 13, 14, 15 repurposed to the high-level layout.
  Old comment headers (knob_4, knob_7, knob_10, knob_11) were stale and have
  been removed.
- Every `knob_N` body reference now goes through a `K_*` define.
- INKY BG (was knob_12) and NEBULA FOG (was knob_2) merged into K_BG_MOOD —
  rotating one knob now fades from clean → fog → inky.
- DROP_ZOOM no longer has the `* (knob_5 * 2.0)` punch multiplier; punch scales
  through K_DROP_SUSTAIN instead.
- New CLIMAX CAP (master gain) on K_CLIMAX at the end of the pipeline.
- New SURPRISE accent on RIM_BOOST through K_SURPRISE (so cranking knob 16
  pops the chrome edge, while audio mode rides flux).
- Controller's `drop_glow` is now reachable through K_DROP_SUSTAIN — first
  per-knob controller toggle.
