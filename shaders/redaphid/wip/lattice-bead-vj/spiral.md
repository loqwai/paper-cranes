# lattice-bead-vj/spiral.frag — a spiral of bead outlines

Built 2026-09-04 from the hearts shaders' idea (`hearts/spinny.frag`: 80 hearts flowing along
twisting lines, `t = fract(i/N - time)`, one hue offset per line, max-composited) and
`lattice-bead/hero.frag`'s discrete-instance bead sampling.

## What it draws
- **One hero** at the centre (`heroScale`, default 0.20), spinning slowest of anything.
- **N beads** (default 28) **born at the hero's rim** that travel outward along a **logarithmic
  spiral** (`turns` 2.2), growing with radius (`sizeExp` 0.6), fading in at birth and out at the
  rim (`tail`) so the `fract()` wrap never pops. `arms` (1–4) interleaves extra spirals.
- Each bead: thin bright Oklch outline (3 px), a dimmer **inset echo** of the same outline inside
  (so the fill is thematically the bead), near-black body. Hue runs along the spiral inside one
  family (`hueSpan` 0.32 of the wheel) and the band **travels outward one-way on `hue_phase`**.
- Beads point along their radius (`align`) and counter-spin the arm's global turn on `spin_angle`.

## The three additions (2026-09-04, second pass)
- **Dust ribbon** (`dust`, default 1.0): the radial gap from each pixel to the nearest turn of every
  arm's log spiral, from the beads' own equation, drawn as a soft coloured band (L 0.40, ~0.05 uv
  wide) on slow channels only, hue matching the beads passing there. +2/255 mean luminance.
- **Drop surge** (`surge`, default 0.03): the birth position adds `hue_phase * surge`. `hue_phase`
  is dodeca-bloom's monotonic accumulator whose rate jumps on flux spikes and settles back, so on a
  drop the arms surge outward and beads are born faster, and nothing ever runs backward. The
  counter-ratchet is structural: the surge lives in a `fract()`-wrapped position, not a rate.
  Newborn beads (t < 0.3) flare on `drop_glow`, contour only (peak pixel 160 at drop_glow 0.7).
- **Chirality** (`chiral`, default 1): with 2+ arms, odd arms are mirrored and spin the other way.
  Tomoe curls both ways across the galaxy.

- **Drop ripple** (critic's ask): `tRing = 1 - drop_glow`. A drop latches `drop_glow` high, so a
  ring is born near the hero and `drop_glow`'s decay carries it outward once while it fades; it
  lights each bead outline it passes (`ringBoost`, contour only) and glows on the ribbon (thin,
  local). One-way by construction; a new drop starts a new ring. `scripts/spiral-motion.mjs`
  with `DROP=1` walks `drop_glow` 0.85 → 0.12 across the four frames to show the travel.
- **Hero as outline**: near-black fill (`fill` 0.15), radius 0.22, brighter rim (+2.0·drop_glow),
  so it reads as the crest and not a filled badge. Ribbon now carries the hero's blue outward and
  fades to nothing by the red beads (one continuous stroke per arm).

Critic verdicts (art-critic agent, 2026-09-04): m1dust still 8 / motion 8, m2surge 8 / 6 ("the
drop does not read as an event"), m3chiral 8 / 7 ("a connoisseur's secret; project m3chiral; the
drop ripple is the real upgrade"). Ripple + outline hero added in response.

Measured with dodeca-bloom running, envelopes pinned mid-energy, `knob_5=1`, 1280×720, 4 frames
1.5 s apart (`scripts/spiral-motion.mjs`): lum 23.2 (dust) / 25.5 (drop) / 23.2 (all on), max
pixel 136–160 = the outline, phases strictly increasing frame to frame.

## Discipline
Every angle and position reads a monotonic phase (`spin_angle`, `flow_phase`, `hue_phase`).
Slow `*_env` drive lightness/chroma. Fast channels (`bass_pump`, `drop_glow`, `pitch_pulse`) touch
only the 3 px contour, punch range 0.55–1.9. Background L range ≈3 %. No global multiplier.
`hash11` only. `BEAD_RANGE 1.0` (true distance in tile-half units — the bake stores mm/12).

## Verified
- **Aspect ratio**: hero bounding box 344×340 at 1600×900 and 609×604 at 900×1600
  (`scripts/spiral-look.mjs`) — ratios 1.012 / 1.008, no stretch on any viewport.
- **Motion** with `controller=dodeca-bloom`: continuous global turn + outward drift, no snap.
- **Lightness** (2026-09-04, after the lift): ground L 0.19–0.30, body L 0.40–0.61, outline L
  0.80–0.84 so the outline is always the brightest thing. Measured headless at 960×540, phases
  pinned: hakkaku single arm lum 16.5/255 (bright>50: 9 %), tomoe single arm 20.2 (12 %),
  tomoe galaxy `arms=2` 23.5 (15 %). Before the lift these were 7.6 / 9.8 / 11.9.
- **Motifs**: tomoe reads best (swirl of swirls, chirality preserved because nothing is folded),
  kiku and hakkaku clean at every size, ume fine. Only one `image=` per page, so "a different
  mon per arm" needs a second texture channel — not possible today.

## Run
```
/?shader=redaphid/wip/lattice-bead-vj/spiral&image=images/beads/mon-tomoe.png&controller=dodeca-bloom
  &arms=2&beads=20&turns=1.6        # galaxy variant
```
Headless variants: `PORT=6969 OUT=<dir> node scripts/spiral-shots.mjs [names]`.

## Next ideas
1. A faint dust ribbon along the spiral path so the curve reads between beads.
2. Beads born ON a drop (`drop_glow` latch → one-way birth pulse in `flow`), a counter-ratchet so
   the rate settles back.
3. Per-arm alternation of orientation/mirroring (chirality flip per arm) as a stand-in for
   different mon per arm; or a second sampler for a second mon.
