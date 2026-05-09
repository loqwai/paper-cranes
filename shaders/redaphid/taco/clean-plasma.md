# taco clean plasma

## Origin

Forked from `taco-kandi/5` on **2026-05-09** mid-`/vibej` run (iter 38) while *Windhorse — Of The Trees, Sophie Marks* was playing. Captures state after iter-38's user-flagged removals: green flash, horizontal scanline, and dripping sphere are all gone.

## What changed in /5 → /6

Same code as /5 with these removals:
- **Beat flash** removed (was `col = mix(col, col*1.25, silhouette*0.5*beat_pulse)` — the green/cyan plasma palette × the brighten read as "green flash" on each beat)
- **Rim zap** removed (was `vec3(0.85, 1.0, 1.2) * ink * rim_zap * 0.6` — white-cyan flash on ink each beat)
- **Horizon scan bar** removed (the iter-37 thin horizontal sweep)
- **VJ Drip** disabled via `if (false && ...)` (the falling sphere from taco_center)

Plus knob_4 → outline edge glow (auto-wired iter 38, full subtle→hero range).

## Inherited features (active)

**Outline-aware (the core aesthetic):**
- Julia-warped feedback (knob_14 intensity, knob_13 c-radius, banding-safe)
- Logo-shaped echo (knob_16, banding-safe)
- Wooli scrolling tapestry line (Y tracks centroidZ)
- Outline edge glow with knob_4 prominence
- Prismatic R/G/B edge split
- Sharp ink overlay (logo recognition guard)

**Coat finale ports:**
- VJ FRY (knob_8, oklch-clean)
- Inner glow + Time-echo
- Fringe (knob_9, capped 25%)
- Heart pulse, Warm hearth, Calm 0.4Hz breath
- Sigil swirl, Fractal fur fibers
- Photon ring (knob_12)
- Lens warp (knob_10)
- Kaleidoscope (knob_6, seam-fixed)

**Atmospheric BG:** Starfield + Nebula fog
**Plasma core:** Raymarched accretion disk + event horizon

## Baked knob values

| knob | value | effect |
|---|---|---|
| knob_1 | 0.551 | SHAPE_TWIST |
| knob_2 | 0 | COLOR_SPIN off |
| knob_3 | 0.528 | FRACTAL_DENSITY mid |
| knob_4 | 0 | OUTLINE_GLOW (off) |
| knob_5 | 0.260 | PALETTE picks ~1/4 toward nebula |
| knob_6 | 0.220 | KALEIDOSCOPE light |
| knob_7 | 0.378 | ZOOM mid (some pulse) |
| knob_8 | 0.370 | VJ FRY mid |
| knob_9 | 0.087 | FRINGE almost off |
| knob_10 | 0.024 | LENS off |
| knob_11 | 0.795 | DRIFT_SPEED high |
| knob_12 | 0.441 | PHOTON_RING_RADIUS mid |
| knob_13 | 0 | JULIA c-radius compact |
| knob_14 | 0.740 | JULIA WARP high |
| knob_15 | 0.906 | (drip disabled, unused) |
| knob_16 | 0.472 | LOGO ECHO mid |

## Preset URL

```
http://localhost:6969/jam.html?shader=redaphid/taco/clean-plasma&image=images/taco.png&controller=taco-kandi
```

## Controller

`controllers/taco-kandi.js` — latching beat_pulse + EMA bass_smooth + sustained drop_glow.

## Why this fork

User flagged three specific effects as unwanted (green flash, scanline, dripping sphere). After removing them, the shader is in a calmer/cleaner state. Forking now to lock in the "user-curated rejection list applied" baseline so future iters don't accidentally re-introduce removed effects.

## Long-form set context

Branded VJ set tomorrow for taco. Logo recognition is sacred (sharp ink overlay guards it). All feedback paths are mathematically banding-safe (bounded mix() blends).

## Seed map (for per-device uniqueness)

Each physical device/bracelet will get unique values for `seed`, `seed2`, `seed3`, `seed4` (currently passed as float uniforms). The goal: every per-device taco feels distinct without ever breaking the brand (logo readable; palette in plasma family — orange↔blue-violet, NEVER magenta).

**Hard constraints (do NOT seed-modulate):**
- Outline shape, ink contrast, sharp_ink overlay — logo recognition is sacred
- Hue cycle through magenta (3.0–3.5 rad) — permanently rejected
- Beat-driven flash intensity — kept stable across devices
- Banding-safe blend gains (mix() caps) — must stay <0.5 regardless of seed

**Currently wired:**
| Seed | Used for | Range | Notes |
|---|---|---|---|
| `seed`  | (unused as of iter 45) | — | candidate for: kaleido seg-count parity offset (4/6/8/10/12), or fractal coprime-frequency offset |
| `seed2` | CORE_HUE tilt | × 0.05 (~±0.05 rad ≈ ±3°) | Subtle warmth shift within orange family. Iter 45: was 0.15 (too loud), reduced to 0.05. |
| `seed3` | (unused) | — | candidate for: photon-ring base radius offset, lensing strength bias, drift speed multiplier |
| `seed4` | CORONA_HUE tilt | × 0.05 (~±0.05 rad) | Subtle blue-violet shift. Same caps as seed2. |

**Candidate hooks — to land in iter 46+ (each adds character without breaking brand):**

1. **Outline-radiation wavelength** — when RADIATION_WAVES land, the wave count `r * N` could use `N = mix(5.0, 9.0, fract(seed))` so each device's halo has a different ring spacing. Logo-safe (rings are exterior).
2. **Fractal coprime-frequency phase** — the `FRAC_EVO_A/B/C` oscillators take `seed3 * TAU` as a phase offset so different devices are at different stages of the same evolution at any given moment.
3. **Kaleido seg-count parity** — fold count is forced even (2/4/6/8/10/12). Use `seed3` to bias toward LOW (intimate) vs HIGH (mandala) fold counts: `floor(mix(2.0, 12.0, mix(knob_6, fract(seed3), 0.3)) * 0.5) * 2.0`.
4. **Outline halo width breath base** — `edgeWidth_base = 0.004 + 0.002 * fract(seed)` so each device's halo is naturally tighter or wider. Capped so logo stays clearly outlined.
5. **MONSTER_BASS / CALM_WARM gate response amplitude** — each device emphasizes one regime more (`fract(seed3)` → which corner gate is louder). Two devices side by side: one breathes warm-bass passages, the other compresses on monster-bass.
6. **Plasma drift phase** — `SHAPE_DRIFT_A/B` add `fract(seed) * TAU` as a phase offset so devices are out-of-sync. Group of devices = group of related-but-distinct organisms.
7. **Chrome rim breath frequency** — instead of fixed 0.4Hz, use `mix(0.3, 0.5, fract(seed4))`. All in the "organism breath" range, but each device exhales at a slightly different cadence.

**Bug-to-fix on next iter:** the WARM HEARTH block uses `fract(seed2 * 0.3 + 0.1)` for `hearth_hue` which can land in any HSL hue including GREEN. With seed2 currently ~0 it's at 0.1 (orange-ish), but the seeded value is unbounded. Either anchor to oklch CORE_HUE family, or remove the seed entirely — that's a leftover bug from the HSL-first version of the shader.
