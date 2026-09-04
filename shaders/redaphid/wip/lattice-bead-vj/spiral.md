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
