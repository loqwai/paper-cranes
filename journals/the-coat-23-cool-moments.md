# the-coat-23 — Session Journal

## Status
Iter 67 (2026-04-27). Forked from the-coat-22 at iter 66 mid-`/vj` run during *Comments (feat. KE) – Claude VonStroke, ZDS, KE*. Captures the "inky-dramatic chaos drop" config — distinct from -15's painterly-groove. /vj run continues on -16 from here.

Iter 1 of new /vibej run (2026-04-30, *Enemy* — Habstrakt, Dr. Fresch). Snapshot read: bassN=0.10, trebN=0.76, centroid=0.81, entropy=0.91, roughness=0.69, energyZ=+0.32. Added `VJ_RIM_HISS_69` — entropy+treble+roughness gated rim shimmer, subtle (NOT a chromatic split — RGB-split was vetoed pre-fork at -5).

Iter 2 (*Gladiator* — Dr. Fresch, Def3). Snapshot: bassN=0.06 (dead), trebN=0.82, mids=0.27, energy=0.38, centroid=0.65, entropy=0.89. High-treble + low-bass + moderate-mids = vocal/rap pocket. Added `VJ_GLADIATOR_BRASS_70` — gold/bronze (1.0, 0.72, 0.28) seam-pulse on coat, gated on that fingerprint exactly. Audit-todo from prior fork: this picks up the "audit hard-coded hues" thread — brass is independent of HUE_BASE intentionally so it carries the gladiator/arena theme without rotating with palette knob_3.

## Forks
- `the-coat-23 ← the-coat-22` (iter 66, 2026-04-27): captured during *Comments (feat. KE)*. Bakes the iter-65 Z-TRAIN extreme-bass amplifier + iter-66 chaotic-bright eye coefficient bump. Knob preset: knob_10 + knob_12 MAX (ground-quake + INKY BG), knob_3 mid-rotation (palette mixed), knob_8 moderate (DOOM RED present), knob_4 on (eye wash), knob_15 mild (drip), knob_5 mild (drop-zoom).
- `the-coat-24 ← the-coat-23` (iter 4, 2026-04-30, *Greedy* — bradeazy & Mike Renza): "every-knob-mapped" preset. Bakes iter-2 wirings (knob_4 fur fluff, knob_7 coat rim, knob_16 godrays), iter-3 widened knob_4 range (gamma 1.4, 0.05..3.5x), iter-4 wiring (knob_17 eye blaze). User has 17-knob MIDI device. Inky BG heavy (knob_12=0.87), crisp/no feedback (knob_9=0), warm palette (knob_3=0.11). See `the-coat-24-cool-moments.md`.

## Key lessons carried forward
(See `the-coat-22-cool-moments.md` and the chain back through -14, -3, -6, -8 for the full lineage corpus.)

**Fresh reminders for this fork:**
- This preset is for **chaos-bright drop** territory: high-treble, high-entropy, high-roughness moments. The iter-66 chaotic-bright eye coefficient (0.9) makes peak chaos blaze.
- Z-TRAIN extreme-bass amplifier (iter 65) makes peak bass passages even more striking — this preset has palette mid-rotated so Z-TRAIN beam will be in mixed teal/purple zone.
- All prior vetoes still active.
- Composition is at saturation. Refining > adding.

## Cool moments
(continuing from -15 / -14)

Iter 2 (2026-04-30, *Chapter & Verse* — Louis V). User said "I'm just messing with knobs to figure out what they do — wire them to obvious cool aspects." Filled the three remaining unwired knobs:
- **knob_4** → fur fluff amplitude (coat shagginess). Multiplies the fluff_amp computation by `mix(0.4, 2.5, knob_4)` so 0=tight, 0.5=normal-ish, 1=wild fur explosion.
- **knob_7** → coat rim chrome amplitude. Scales `RIM_BOOST` by `mix(0.3, 2.0, knob_7)`. Direct lever on how blazing/ghosted the coat outline reads.
- **knob_16** → godray intensity feeling. Scales the existing `GODRAY_INTENSITY` block by `mix(0.2, 3.0, knob_16)`. 0=barely-there 1=biblical.

All other knobs were already mapped (see Knob map below). Bogus shader the-coat-fur-coat-reactive-knobs.frag deleted (was the-coat-23 template before discovering -23 was the active fork). User flagged that they have a 16-knob MIDI device wired up and wants every knob doing something obviously cool.

## Knob map (current, post-iter-2)
| Knob | Maps to |
|---|---|
| 1 | zoom (BASE_ZOOM) |
| 2 | nebula fog density + star fade |
| 3 | palette hue rotation (HUE_BASE/HUE_DROP) |
| 4 | fur fluff amplitude (widened iter 3: 0=glass-edge, 1=explosive, gamma 1.4) |
| 5 | drop-zoom punch multiplier |
| 6 | camera tilt + groove breath |
| 7 | coat rim chrome amplitude ← iter 2 |
| 8 | doom-red BG + warm hearth gain |
| 9 | feedback/trails (0=crisp, 1=smear) |
| 10 | ground quake gain |
| 11 | step ripple |
| 12 | inky BG dim outside silhouette |
| 13 | beat strobe |
| 14 | pinwheel/sigil swirl (USER HATES — keep at 0) |
| 15 | drip + ripple pool |
| 16 | godray intensity ← iter 2 |
| 17 | eye blaze multiplier ← iter 4 (0.3..3.0x on `col += eyes * hot * 2.2`) |

## Todo
- `[ ] Effect-region DSL hypothesis — standing.`
- `[ ] Formal event/subscription system for v(next).`
- `[ ] Higher-order pitch_change detectors (octave jumps, sustained rises).`
- `[ ] Audit other hard-coded hues besides WARM HEARTH.`

## History of changes (post-fork)
(empty — first tick on -16 will populate)

## Design hypotheses for v(next)
(carry forward from -15)
