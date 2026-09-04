# lattice-bead/hero.frag — the hero bead and its satellites

A **different architecture** from the rest of this family. `3/4/detail` are an infinite `fract()`
tiling, and a tiling has no centre — so it can never have a hero. This draws a fixed, small
number of **discrete instances**, which is what the hearts shaders do (`hearts/1.frag` orbits 25
hearts along a Mandelbrot path; `hearts/spinny.frag` runs 80 along twisting lines), and it is the
only way to say *this bead, in the middle, is the one*.

- **ONE HERO** — centred, large, spinning slowest of anything on screen so it reads as the still point.
- **SATELLITES** — on an orbit, each with its own slow feature for scale, its own spin rate and
  direction, its own hue offset and its own flex axis. Six drivers rotate across them
  (`bass / mids / treble / entropy / centroid / flux`), so neighbours grow and flex on *different
  musical quantities* rather than in unison. That is what makes a group read as individuals.

## Nothing snaps

> *"I don't want the overall camera animation to snap back and forth with rotations — it should use
> gates or whatever iris/2 uses."*

iris/2 takes its motion from the **dodeca-bloom** controller, whose own header states the principle:

> *"evolving states move UNIDIRECTIONALLY — monotonic accumulators whose RATE the music sets
> (forward only, never snap back). Levels use smoothed envelopes."*

Every rotation and every orbit here reads `spin_angle`, a monotonic accumulator. Audio sets how
fast it advances and can never rewind it. **There is not one `rot(someFeature)` in the file** —
that is exactly what snaps: the feature falls and the angle unwinds.

## The background is slow by construction

> *"NO shuddering or quick breathing of the background."*

The controller separates its channels and so does the shader:

| | channels | used by |
|---|---|---|
| **SLOW** | `*_env` + the four monotonic phases | background **and** beads |
| **FAST** | `bass_pump`, `drop_glow`, `pitch_pulse` | **beads only**, masked by coverage |

A grep for the fast channels outside `drawBead` returns only comments — that is the invariant, and
it is worth re-checking after any edit. The background's entire lightness range is a few percent,
riding `energy_env`/`mids_env` and the phases.

## Two bugs from the first render

1. **Scale.** `uv` is normalised by `iResolution.y`, so the visible frame is only ±0.5 vertically.
   The first version used `HERO_R = 0.62` and an orbit of `0.86` — the hero more than filled the
   screen and every satellite sat outside it. Now 0.20 and 0.335.
2. **Aliasing.** I took `fwidth(d)` for the antialias width, but the mon SDF is uploaded NEAREST
   with no mipmaps, so at this magnification `d` is stair-stepped and `fwidth` reports the *step*
   rather than the true gradient — heavy dither on every edge. `d` runs at roughly `BEAD_RANGE`
   per uv unit regardless of `r`, and uv is height-normalised, so the width comes from
   **screen size**: `BEAD_RANGE * 2.5 / iResolution.y`.

## Known, not yet decided

- The soft star-shaped **aura** around each bead is the contour band (`rim`, width `aa*9`)
  multiplied by `punch`, which reaches ~2.6 during a drop. It follows each motif's own outline, so
  it is not a foreign shape — but it does soften the silhouette at satellite size. Tightening
  `aa*9 → aa*4` would sharpen recognition at the cost of the glow. **A look decision, not a bug.**
- **9 satellites is too busy** — the beads overlap and the hero stops reading as the hero. 4–6 is
  the useful range; `?satellites=` is there to dial it.

## Params

`?satellites=1..9` (default 6) · `?heroScale=` (default 0.20) · `?bgAmount=0..1` (default 0.7)

Requires `?controller=dodeca-bloom`. Without it every phase and envelope reads 0 and the frame is
static — a legible failure rather than a broken one. For deterministic tests the phases can be
pinned directly as URL params instead, which is how `scripts/hero-look.mjs` works.
