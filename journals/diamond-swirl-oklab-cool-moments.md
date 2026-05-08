# diamond-swirl-oklab — Session Journal

## Status
Iter 1 of 180. Forked from `ambience/diamond-swirl.frag` to oklch + audio + knob_1-16. Currently in **midnight monsoon** aesthetic: indigo/violet palette, vertical rain streaks driven by mids, beat triggers lightning streaks.

## Cool moments
*(none yet)*

## Todo
- [ ] Watch for: rain streaks visible at all knob_15 values, or do they disappear at knob_15=0?
- [ ] Confirm lightning is dramatic enough without strobing (currently bassZ > 0.6 OR beat triggers it).

## History of changes
- 2026-05-03: Forked diamond-swirl → diamond-swirl-oklab. Rewired:
  - Color: HSL fract → oklch (lightness, chroma, hue) end-to-end.
  - Knobs: knob_71-79 → knob_1-16, each centered at 0.5.
  - Ring profile softened (gaussian thickness halved + smoothstep easing) to fix harsh edges.
  - Total wave soft-clipped via tanh, interference reinhard-toned.
  - Lightness capped at 0.86 (oklch gamut wall).
  - **Midnight monsoon palette**: hue locked to indigo→violet→magenta-edge band (~3.4–5.0 rad).
  - **Rain streaks**: vertical sin bands scrolling on uv.y, density driven by mids.
  - **Lightning**: beat OR bassZScore > 0.6 triggers vertical white-violet streak with smoothstep onset.

## Forks
- `diamond-swirl-oklab ← ambience/diamond-swirl` (knob remap + oklch + monsoon vibe)

## Design hypotheses for v(next)
- Locking hue to a narrow band (rather than full rainbow) makes the shader feel like a cohesive *mood* instead of generic prettiness. Worth using anywhere "vibe" matters.
- Vertical scrolling rain pattern is a cheap way to imply weather. Apply same idea for snow (slower, drift sideways) or embers (warm hue, rising).
