# rezz-2

Forked from `rezz-1` on 2026-10-03 during a `/vibej2` run (VJ iteration 4), ambient laptop mic,
dark brooding synthwave playing. Snapshot of the frame on the projector when the user called `/fork`.

## Lineage
`moody-octopus2` → `rezz-1` (Rezz grade) → **`rezz-2`**

## What it is
- **Rezz palette**: triangle hue walk red (1.0) → violet (0.76), purple end falls to black, lightness
  capped at 0.36 — never white, black dominates.
- **Hypnotic spiral + prowl drive**: 4-arm log-spiral streaming outward from a dark vanishing point
  (DRIVE_SPEED 0.22 cycles/s, SPIN 0.015 turns/s, time-only phases). Gaps ~94% black, hot red leading rim.
- **Julia projected onto the arms**: the Julia set is evaluated in the spiral's own coordinates
  (along-arm × across-arm), tiled 8× per wrap and mirrored, so the texture rides each ribbon outward and
  shrinks toward the vanishing point. Distance-estimate filaments (2.5px) over a dim escape glow.

## Audio
| Driver | Feature | Effect |
|---|---|---|
| ENGINE_GROWL | `bassNormalized` | deepens the red of the arm rims (amplitude only) |
| ENGINE_GROWL_TEX | `bassNormalized` | breathes the arm texture brightness (amplitude only) |

## Knobs
None — no knobs were set and no controller was active.

## Preset URL
`/jam.html?shader=redaphid/wip/moody-octopus/rezz-2`

See `journals/rezz-1-cool-moments.md` for the full iteration history.
