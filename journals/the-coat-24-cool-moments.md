# the-coat-24 — Session Journal

## Status
Forked from the-coat-23 on 2026-04-30 mid-`/vibej` run during *Greedy* — bradeazy & Mike Renza. Captures the "every-knob-mapped" preset after iter 2-4 of the -23 run wired all remaining unwired knobs (4, 7, 16, 17) and widened knob_4's fluff range. User has a 17+ knob MIDI device and was exploring each knob's full sweep when the fork was taken.

## Forks
- `the-coat-24 ← the-coat-23` (iter 4, 2026-04-30): every-knob-mapped preset captured during *Greedy*. See `the-coat-23-cool-moments.md` for the iter 2-4 wiring history.

## Knob map (current)
| Knob | Maps to |
|---|---|
| 1 | zoom (BASE_ZOOM) |
| 2 | nebula fog density + star fade |
| 3 | palette hue rotation |
| 4 | fur fluff amplitude (0=glass-edge, 1=explosive, gamma 1.4) |
| 5 | drop-zoom punch multiplier |
| 6 | camera tilt + groove breath |
| 7 | coat rim chrome amplitude |
| 8 | doom-red BG + warm hearth gain |
| 9 | feedback/trails (0=crisp, 1=smear) |
| 10 | ground quake gain |
| 11 | step ripple |
| 12 | inky BG dim outside silhouette |
| 13 | beat strobe |
| 14 | pinwheel/sigil swirl (USER HATES — never set in code; user can crank themselves) |
| 15 | drip + ripple pool |
| 16 | godray intensity feeling |
| 17 | eye blaze multiplier (0.3..3.0x) |

## Standing user preferences (carried forward from -23 lineage)
- **Pinwheel (knob_14): never bake > 0 in new iteration templates.** User-set values are fine; code-set values are not. Default to 0 in any new fork's baked preset.
- **No RGB-split, no flannel diamonds, no crystalline shards on the coat** (vetoed earlier in -5 / -19 lineage).
- **Composition is at saturation** — refining beats adding. Many overlay effects already stacked.

## Cool moments
(pending)

## Todo
- `[ ] Wire knobs 18-24+` if the user reveals more MIDI knobs available — pool of "obvious cool" levers still has room (pose drift, head tilt amplitude, eye tracking offset, controller drop-glow scale).
- `[ ] Effect-region DSL hypothesis — standing` (carried from -23).
- `[ ] Formal event/subscription system for v(next)` (carried from -23).

## History of changes (post-fork)
(empty — fresh fork)

## Design hypotheses for v(next)
(carry forward from -23: explicit feature-region declarations per effect; higher-order pitch_change detectors)
