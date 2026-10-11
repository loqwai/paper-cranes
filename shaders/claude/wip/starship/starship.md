# starship — Space Imagination Game

## Visual intent
A starfield fly-through for playing "spaceship" with kids. The knobs are the ship's
control panel — every knob does something a kid can see and name. Scenery evolves
over time via the /vibej loop; **knob meanings must stay stable** so the kids' mental
model of the controls never breaks.

## Ship controls (knobs)
| Knob | Control | Effect |
|------|---------|--------|
| knob_1 | WARP SPEED | FOV zoom + trail persistence + pull (streaks grow) |
| knob_2 | STEER left/right | Moves vanishing point, banks the ship (roll) |
| knob_3 | STEER up/down | Moves vanishing point vertically |
| knob_4 | HYPERDRIVE | Stronger pull + rainbow hue-spin on trails |
| knob_5 | SHIELDS | Cyan energy bubble ring + dome glow |
| knob_6 | NEBULA | Space cloud density |
| knob_7 | ENGINE COLOR | Hue seed for star tint + nebula palette |

## Audio mapping
- `bassZScore` → engine rumble: hull shake, star brightness, shield ripple
- `trebleZScore` → star twinkle speed boost
- `beat` → star brightness pop

## Design constraints (learned from docs/advanced-shader-techniques)
- Flight speed is CONSTANT (t * 0.02 in the fract-depth loop). Warp knob only
  affects FOV zoom, trail pull, and persistence — all continuous in the knob —
  so twisting warp never causes the starfield to pop/re-randomize.
- Frame feedback combines with `max(col, prev * persist)`, never additive, so
  trails can't accumulate to white. persist caps at 0.96.

## Iterations
- **1.frag**: initial — 4-layer fract-depth starfield, fbm nebula, feedback warp
  trails, shield bubble, banking on steer.
