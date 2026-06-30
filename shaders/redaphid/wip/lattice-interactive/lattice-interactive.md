# lattice-interactive

Giving the lattice explorer an **optional goal** — something to head toward while roaming — without
losing the "just drift and look" appeal. Built off `chromadepth-lattice/5` (the MOVING version: idle
kaleido churn + gentle orbital drift kept; 6's frozen geography was a detour).

## The plan (incremental)

1. **1.frag — render the PATHS you stumble upon** ← we are here. Get the paths beautiful and alive
   first; no goal/discovery logic yet.
2. _later_ — layer a controller to pick a destination on a path and lead you there (the optional
   goal). This is where a controller earns its keep: a graph + memory of where you've been, which a
   stateless shader can't hold. (See the abandoned `chromadepth-lattice/7` + `lattice-quest` for the
   discovery/warmth/fanfare version — too much, too soon; we're rebuilding up to it.)

## 1.frag — the tendrils

Long, freely-curving, glowing **tendrils** in world space that you occasionally stumble across — à la
*No Rest for the Wicked* waypoint wisps. Subtle and alive; they catch the eye by **motion, not
brightness**.

### How (and what we learned)
- **The curve = a contour line of a smooth, domain-warped field** (`pathField`). This is the key.
  Earlier attempts failed because they were the wrong *geometry*:
  - A single sine "road" (lattice 5) → one path, mildly interesting.
  - A **Voronoi tessellation** → every cell is bordered, so any "present" region became a *dense
    interconnected web* — the opposite of "a path or two." Scrapped.
  - **Function graphs** `y = f(x)` → axis-locked; can't double back or sweep. Bad directions. Scrapped.
  - **Level set of a warped field** → long curves that turn any direction, like a spline. ✔
- **Constant screen-width line via `fwidth(F)`** — the tendril stays a thin ~3px thread at any zoom,
  anchored to a world-space location. (Location is world-stable; thickness is screen-stable.)
- **Braided** — 3 nearby contour levels (`fk * 2.4 * aa`) = a few filaments, not one fat line.
- **Wiggle** — the field drifts slowly in time (`bTime` terms in `pathField`) so the curve undulates,
  plus per-strand `aa`-scale jitter. (User: "wiggle is perfect.")
- **Flow** — bright pulses travel along an along-path proxy `al` (`sin(al - bTime*4.5)`).
- **Rare** — gated by a large, low-frequency world presence field so most of the world is open lattice
  and a length of tendril only occasionally sweeps through. (User: "rarity is ok.")
- **Subtle** — additive, faintly-whitened glow at `* 0.22`. Not a painted road.

### Tunables (in `tendril()` / `pathField()`)
- **shape / how it curves** → `pathField` frequencies (2.3 / 2.0) and warp amount (`0.55`).
- **wiggle speed** → `bTime * 0.12` (field drift) and `* 1.4` (strand jitter).
- **flow speed / density** → `- bTime * 4.5` and the `al` scale (`* 7.0`).
- **rarity** → the `smoothstep(0.50, 0.86, …)` presence threshold + its `0.55 / 0.5` frequencies.
- **subtlety / thickness** → the `* 0.22` additive weight and `aa * 1.5` line width.
- **hue** → currently a whitened local-offset hue; could be a distinct cool cyan/teal to read as
  otherworldly wisps.

### Verifying (Chrome DevTools, not claude-in-chrome)
claude-in-chrome screenshots WebGL as black (no `preserveDrawingBuffer`); **Chrome DevTools MCP
`take_screenshot` captures it correctly**. To inspect a subtle/sparse feature: temporarily force its
presence gate on, and/or render it isolated (`col = vec3(clamp(tend,0,1))`) to see the geometry, then
restore. Pan/zoom by dispatching `WheelEvent`/drag events to the `lattice-nav` listeners.

### Next
- Junctions/waypoints: a second `pathField` whose contour crosses the first = a crossing point.
- Then the controller layer: pick a tendril/junction as a destination and lead the explorer to it.
