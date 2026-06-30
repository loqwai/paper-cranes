# lattice-interactive

Giving the lattice explorer an **optional goal** — something to head toward while roaming — without
losing the "just drift and look" appeal. Built off `chromadepth-lattice/5` (the MOVING version: idle
kaleido churn + gentle orbital drift kept; 6's frozen geography was a detour).

## The plan (incremental)

1. **1.frag — render the PATHS you stumble upon** ✔ — long, wiggling, flowing spline tendrils
   (contour lines of a warped field) that you rarely cross.
2. **2.frag — the tendrils LEAD to controls you operate** ✔ — the optional-goal payoff. Tendrils
   became finite (home → a control node at the far end); follow one out and turn the dial you find.
3. **3.frag — the controls are strange SPHERE artifacts that reshape the world** ✔ **— GRADUATED out
   of wip** to `shaders/redaphid/lattice-interactive/3.frag` (2026-06-30). Tendrils no longer radiate
   from home (each is a long standalone wisp out in the world); each ends at a glassy sphere that
   BULGES the actual fractal under it and recolors its interior, and turning its dial also changes the
   global structure / colour scheme / music-reactivity. Pair with
   `?controller=lattice-nav&controller=lattice-controls`.
4. _next_ — make it a real journey: nodes hidden until discovered, a "leg" the active tendril
   brightens toward, persistence. (The abandoned `chromadepth-lattice/7` + `lattice-quest` had the
   discovery/warmth/fanfare machinery — too much, too soon; we're rebuilding up to it deliberately.)

## 3.frag — bulging recolouring sphere artifacts (current)

Built off 2.frag. The dials became **strange, beautiful artifacts** you find by exploring:

- **Tendrils stand alone, not from home** — each is a long winding wisp from a hashed tail to its
  node (`leadTendril(wpos, tail, node)`), found by crossing it; most of the world is open lattice.
- **The sphere BULGES the real shader** (`lensBulge`, applied to the fractal's *input* coords before
  `fractal()`) — a fish-eye magnify + twist centred on the node, strength = the knob. The actual
  lattice balloons and twists into the sphere (not a backbuffer trick). Capped at the rim so it's
  seamless. (Earlier tries — a backbuffer event-horizon void; a gentle plasma lens; a swirling
  feedback vortex — were all rejected for "imposing void / too subtle / not the real shader." The
  lens-on-fractal-input is what reads as the geometry itself distorting.)
- **The sphere recolours its (bulged) interior** boldly per flavour — vivid hue-spin / invert / hard
  posterise / false-colour — applied to the FRESH frame (never the feedback buffer) so it **doesn't
  flicker**. (The flicker bug was a `fract()` hue rotation on the fed-back sample → runaway/strobe.)
- **Turning a dial does BOTH** (local + global): the local bulge + recolour, AND a global effect —
  `knob_2` colour scheme (hue), `knob_3` structure (cell size + warp), `knob_4` structure (kaleido
  twist `gTwist`), `knob_5` music-reactivity (`gReact`). Same `lattice-controls` dial-turn.

### Verified (Chrome DevTools)
Compiles clean; nodes scatter 0.7–1.6 out; structure (knob_3) and colour (knob_2) globally transform
the lattice obviously; the sphere visibly balloons + twists the lattice under the knob (fish-eye), no
flicker. Music-reactivity (knob_5) shares the path — best felt live with a mic.

### Open / to tune
- Bulge strength (at max the centre over-magnifies into smooth colour — could cap to keep lattice
  detail); whether the bulge should bleed a falloff outside the sphere; making the 4 sphere interiors
  more distinct; dial sensitivity.

## 2.frag + lattice-controls — turn a dial at the tendril's end

Four glowing tendrils grow from **home (world 0,0)** out to four **control nodes**. Follow a wisp to
its far terminus and you find an aesthetic **dial**: circle a finger around it to turn it (relative
angular accumulation, one full turn = full 0..1), driving a knob that obviously changes the world.

- **Tendrils are now FINITE** (`leadTendril`): a winding spline in each node's own rotated frame
  (`u` along, `v` perpendicular), wiggle-amplitude tapered to 0 at both ends so it touches home and
  the node exactly. Kept the braid + flow + `fwidth` constant-width look; flow runs *toward* the node.
- **The dials** (`controlNode`): a ring with a marker swept to `val*TAU` + a fill arc; blooms when
  grabbed (`ctrlGrab`). Distinct hue per node.
- **Effects** (one knob per node, `0` = neutral so it looks like 1.frag): `knob_2` PALETTE (hue
  rotation), `knob_3` STRUCTURE (cell size + warp), `knob_4` MOTION (churn-speed `mTime`), `knob_5`
  AUDIO REACTIVITY (`gReact` scales the music response in `fractal` + bloom). Knobs are auto-injected
  uniforms — **do not declare them**; only the controller-output `ctrl*` uniforms are hand-declared.
- **Removed the orbital drift** from 1.frag so the world holds still under pan → the controller's
  screen→world hit-testing is exact. (The kaleido churn still gives life.)

### lattice-controls.js (chain AFTER lattice-nav)
Holds node world-positions (seeded, ~0.45 out), the dial values, and the touch logic. It intercepts
touch in the **capture phase**: if a touch lands within `GRAB_R` of a node it grabs it and
`stopPropagation()`s so lattice-nav never pans — empty-space touches fall through to pan. Screen→world
mapping mirrors the shader (`uv*0.07/zoom + nav`, aspect-corrected). `da` is negated so **clockwise =
up**. Feeds `ctrl{0..3}{X,Y}` + `ctrlGrab`.

### Verified (Chrome DevTools)
Compiles clean; 4 nodes placed across quadrants; simulated dial-turn drove `knob_2` 0→0.5 in even
steps and released on touchend; palette (knob_2) and structure (knob_3) both produce obvious visual
changes. Motion/audio share the identical path (best confirmed live — speed needs running time,
reactivity needs a mic).

### Open / to tune
- Node distance/spread, dial sensitivity (one full turn = full range — maybe too much travel),
  tendril subtlety, and whether motion/audio reactivity read as obviously as palette/structure live.

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
