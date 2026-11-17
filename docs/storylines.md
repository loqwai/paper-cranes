# Storylines — music-driven acts for a shader

A **storyline** turns a shader into something that plays out over minutes. It runs as a series of
**acts**. Each act is a target vector of a few **story params**, and the music decides when the
story moves on. The first storyline is the stellar life cycle in the sun shader. The engine lives in
its controller, `controllers/black-sun.js` (`ACTS`); the shader is
`shaders/claude/wip/black-sun/sun-1.frag`, and its forks go in `shaders/claude/wip/sun/`.

## Why a controller

A story needs memory across frames: which act it is in, how long it has been there, whether a build
is armed, and where each param has glided to. GLSL cannot hold that state, so the engine lives in
the controller and the shader only reads uniforms (see [controllers.md](controllers.md)).

## The parts

### 1. Story params: what the shader reads

The params are a small set of slow scalars, each with one meaning the shader agrees to honour:

| param | meaning | how the sun shader uses it |
|---|---|---|
| `bs_heat` | temperature: 0 ember … 0.5 red … 1 gold … 1.4 pale yellow | `sunLch()` shifts hue toward red and dims below 1. Above 1 it lifts L and drops chroma, so it never reaches white. Every sun colour goes through it. |
| `bs_size` | star scale | multiplies `HOLE_R` (ball, iris, lens, ray roots) |
| `bs_power` | ray energy | ray brightness ×power, reach ×√power |
| `bs_dark` | scene dimming / night | sky × (1 − 0.8·dark) |
| `bs_abstract` | how far the scene dissolves | mixes `nebula()` (warped plasma in the LSD palette) over everything except the sun |
| `bs_chaos` | turbulence | plasma-ball swirl, nebula warp, ray flex |
| `bs_pull` | extra gravity | lens radius × (1 + 1.6·pull) |
| `bs_nova` | detonation flash, 1 → 0 over ~20 s | ball core × (1 + 1.4·nova), shell visibility |
| `bs_shell` | seconds since the last supernova (capped at 30) | shell radius 0.28·s, plus its shock front lensing the previous frame |
| `bs_act`, `bs_actT` | current act index, seconds in it | available for act-keyed effects |
| `bs_night` | day sky → deep space | crossfades the Van Gogh tile sky into `deepSpace()`: indigo depth, slow-twinkling stars (lensed around the sun, dimmed by gas), LSD-banded nebula gas |
| `bs_sunX`, `bs_sunY` | the sun's position | `SUN`: everything anchored to it (ball, rays, lens, waves, shutter, sky rings) follows. Path = slow Lissajous on a monotonic `skyPh` (rate = act `move` × energy), minus `sink` |

**Rule: params glide, they never snap.** Each frame every param moves toward the current act's
target with time constant `ease / 3`, so it is about 95% of the way there after `ease` seconds. The
one exception is designed in: the supernova is a short-ease act (4 s), and its flash and shell run
on their own clock (`novaT`) from the moment it fires.

### 2. Acts: the arc

```js
{ name, ease, min, max, p: { heat, size, power, dark, abstract, chaos, pull }, next: (m, dwell) => index | -1 }
```

- `p`: the target param vector.
- `ease`: glide time into this act, in seconds.
- `min`: minimum dwell. No transition fires before it, which prevents flapping.
- `max`: maximum dwell. Every `next` also returns a fallback once `dwell > max`, so the story always
  progresses even on music that never triggers anything.
- `next(m, dwell)`: the act to move to, or `-1` to stay.

### 3. Musical state `m`: what moves the story

Computed every frame from envelopes the controller already has:

| flag | meaning | computed from |
|---|---|---|
| `m.building` | a sustained build | confident energy trend (`energySlope × energyRSquared × 3000 > 0.5`) with flux not falling, held 8 s. Also *arms* the drop. |
| `m.drop` | the drop after a build | armed, and `energyZScore > 0.8` jumping > 0.5 above its 3 s envelope |
| `m.calm` | steady, unremarkable music | sustained energy z near 0 and no trend, for 15 s |
| `m.low` | a quiet or low stretch | sustained energy z < −0.25, or the quiet gate closed, for 10 s |

### 4. Manual override: K5 STORY

`knob_5`: 0 (or below 0.02) is **auto**. Any higher value forces act `floor(k × 7)`, so the knob
scrubs through the arc in order. The forced act still glides in with its own ease, so a hand on the
knob never makes the wall jump. Returning the knob to 0 hands control back to the music, starting
from the forced act.

## The sun arc (stellar life cycle, abstracted)

Each act also sets `sink` / `night` / `move`: MAIN 0 / 0 / 1, RED GIANT 0.05 / 0.25 / 0.5, DYING 0.38 / 0.8 / 0.7, COLLAPSE 0.38 / 0.95 / 0 (holds still), SUPERNOVA 0.3 / 0.55 / 0, NEBULA 0.12 / 1.0 / 0.6, REBIRTH 0 / 0.5 / 0.9 (rises).

| # | act | heat | size | power | dark | abstract | chaos | pull | ease | min / max | advances when |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | MAIN SEQUENCE | 1.0 | 1.0 | 1.0 | 0 | 0 | 0.3 | 0 | 40 | 60 / 180 | build → COLLAPSE; calm → RED GIANT |
| 1 | RED GIANT | 0.55 | 1.65 | 0.75 | 0.15 | 0.1 | 0.2 | 0 | 60 | 45 / 150 | build → COLLAPSE; low → DYING |
| 2 | DYING (red dwarf) | 0.2 | 0.45 | 0.3 | 0.7 | 0 | 0.1 | 0.1 | 60 | 45 / 120 | build → COLLAPSE |
| 3 | COLLAPSE | 0.4 | 0.22 | 0.2 | 0.85 | 0.2 | 0.6 | 1.0 | 25 | 15 / 90 | the drop → SUPERNOVA |
| 4 | SUPERNOVA | 1.4 | 1.9 | 2.0 | 0 | 0.5 | 1.0 | 0 | 4 | 25 / 25 | after 25 s → NEBULA |
| 5 | NEBULA | 0.8 | 0.55 | 0.55 | 0.3 | 1.0 | 0.7 | 0 | 30 | 60 / 150 | calm → REBIRTH |
| 6 | REBIRTH | 1.2 | 0.5 | 0.8 | 0.4 | 0.35 | 0.3 | 0 | 45 | 45 / 75 | after 60 s → MAIN |

Events tied to acts: entering COLLAPSE fires a distortion wave inward. Entering SUPERNOVA disarms
the build, starts `novaT`, and fires a full-strength wave. The shell then crosses the frame in about
7 s.

Rehearsal check (2026-10-06): each act was forced with K5 and its params snapped for a screenshot
(`.claude/vj-shots/act-0..6.png`, `acts-sheet.png`). Short meter windows:

| act | lum | dark | clip |
|---|---|---|---|
| MAIN | 0.38 | 0.06 | 0 |
| RED GIANT | 0.32 | 0.05 | 0 |
| DYING | 0.07 | 0.63 | 0 |
| COLLAPSE | 0.07 | 0.74 | 0 |
| SUPERNOVA | 0.55 | 0 | 0 |
| NEBULA | 0.17 | 0 | 0 |
| REBIRTH | 0.17 | 0.08 | 0 |

DYING and COLLAPSE are deliberately night-dark. They sit below the usual lumMin ≥ 0.08 rule, and
that is the point of those acts.

## Adding an arc or an act

1. Add an entry to `ACTS` with its `p` vector. Use only the existing params unless the shader also
   learns a new one.
2. Give it a `next`. Prefer musical flags over time, and always include the `dwell > max` fallback.
3. Point some earlier act's `next` at it, or the arc never reaches it.
4. K5 maps over `ACTS.length`, so the knob covers the new act automatically, but every act's knob
   position moves.
5. If you add a param: add it to `STORY_KEYS`, give every act a value for it, output it as
   `bs_<name>`, and declare `uniform float bs_<name>;` in the shader.
6. Force the act with K5 and screenshot it. Check clip 0 and flicker < 0.4.

## Retargeting the engine to another shader

The engine knows nothing about the sun. To use it elsewhere:

- Copy `ACTS`, `STORY_KEYS`, the musical-state block and the glide loop into that shader's
  controller. Better, chain this controller ahead of the new one and read the `bs_*` outputs.
- Decide what each param means for the new visual. The table above is the sun's contract, not a
  rule. Keep the semantics simple: one param, one visible quality.
- The acts become your visual's chapters. Keep heat/size/dark-style params monotone in meaning, so
  that tuning a number tunes a feeling.

## Hot-swap safety (learned the hard way)

The controller keeps its state on `window.__blackSunState` so a hot swap resumes instead of
resetting. Every new field must appear in `DEFAULTS`: `make()` backfills missing keys and repairs
any non-finite number. Without that, a field added in a later version reads `undefined`, `x + dt`
becomes `NaN`, the fail-loud check in `out()` throws every frame, and every uniform freezes. The
wall froze for about a minute that way when `bs_fAge` was added.

## Decision log

- **Story in the controller, not the shader:** it needs dwell timers, arming, and glide state.
- **Params, not act-specific code:** the shader stays a function of about 10 scalars, so acts
  blend, and a forced act never shows a seam.
- **Glide time constant = ease / 3:** "ease" then reads as "about done after N seconds", which is how
  you think about it on stage.
- **Max-dwell fallbacks on every act:** rehearsal music is often too uniform to trigger anything,
  and the story must not stall in MAIN for a whole set.
- **Supernova is one event, not a param ramp:** its flash and shell run on `novaT`, so the
  detonation is the same shape every time, even if the act is left early.
- **Heat lives in `sunLch()`:** one choke point recolours ball, rays, corona and disk together. LSD
  cloud bands and the nebula do not take heat; they are the counterpoint.
- **Distortion waves only on large changes (2026-10-06):** fronts used to fire on every kick. They
  now fire on an energy/bass z-score jumping > 1.3 above its 3 s envelope, a big flux spike, a
  section change, COLLAPSE, or SUPERNOVA. Refractory 8 s, life 6 s, ~0.25 units/s, ~2.4× the old
  lensing. Thresholds of 0.7 and 1.0 still fired every 7–10 s on the rehearsal feed.
- **Sky path as Lissajous on a monotonic phase (2026-10-06):** never `mod`, never reversed (the-coat research). Phase 0 equals the old fixed sun position. Switching the shader from fixed to driven still jumped the sun ~0.32 once, because the controller's phase had already advanced by the time the shader picked it up. Swap a new uniform's consumer in before its producer starts moving.
- **Night is its own axis, not `dark`:** `dark` dims, `night` changes what the sky *is*. DYING/COLLAPSE/NEBULA lean night, MAIN/REBIRTH lean day.
- **Ball brightest, rays capped below it:** ball knee caps at 0.92, rays at 0.80, so the core always reads as the hottest thing (critic #1). The resting size stays; K4 ZOOM owns size.

## Music-earned transitions and legible channels (2026-10-06)

- **Acts change only on musical causes.** `next(m, dwell)` returns `[act, cause]`; every transition (and every shutter resize) is logged to `actLog` with its cause and the feature values that fired it. The old per-act max dwell is gone; a single `FALLBACK` (420 s) remains for music that never moves, and it glides 2.5× slower to a gentle act (DYING/COLLAPSE fall back to REBIRTH, never SUPERNOVA). Steady music holds the act.
- **SUPERNOVA needs a drop**, confirmed by the wavelet (`wavelet_confirmedDrop`) after a build has armed it.
- **Kisses need an event:** a drop, a section change, a strong sustained onset cluster, or K7 by hand. No timer.
- **Legible channels:** each musical element drives one visual verb — see the table in `shaders/claude/wip/sun/sun.md`. Retargeting tip: when porting to another shader, keep the one-element-one-verb rule; it's what makes the response readable from the back of the room.
