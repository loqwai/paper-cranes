# hero-lab.frag — pinned-visual enhancement pass on hero-folded (2026-09-04)

Copy of `lattice-bead/hero-folded.frag` used to judge PURE visual changes: `noaudio=true`,
`wavelet=true`, every declared uniform and referenced feature stubbed as a URL param, and
`?time=8` holding iTime (verified 0.00% pixel change over 3 s). Render with
`node scripts/lab/hero-lab-shot.mjs --out shot.png [--pin] [--extra "&k=v"] [--w 900 --h 1200]`.

Accepted into `2.frag` via scratchpad patches hero2.patch / hero3.patch:

1. **Ground curve** — exterior contrast toe pivoting at the ground mean (`HERO_TOE` 2.0, knob_193).
   Marginal alone; the "static" is bright fine-level contour lines, which a curve amplifies.
2. **Ground quiet + interior chroma** — `HERO_QUIET` 0.38→0.26, `HERO_INL` 0→-0.22, interior
   saturation boost `HERO_SAT` 1.55 (knob_194). meanLum 52.6→41.7, bright>50 33%→21%: the crest is
   the bright thing and the 15% copy is nameable. Biggest single win.
3. **Outline + rim under white, wavelet relief** — stroke and rim are `oklch2rgb` at L 0.80/0.76
   instead of `lush(...,1.0)` (the lightness ceiling); wavelet centroid tints the stroke, bands
   3/4 light the sun-facing rim (capped 1.15), band 1 lifts the dome. Stubs 0.1/0.4/0.85 show a
   visible, coloured, never-white range.

Aspect check: hakkaku identical at 1200x900 and 900x1200 — `heroDist` samples square `suv`.

Open: the ground speckle is NEAREST-sampled bead texture on the fine fold levels; needs a
coarse-levels-only bead branch (revsplit) or mipmaps, not more tonemap.
