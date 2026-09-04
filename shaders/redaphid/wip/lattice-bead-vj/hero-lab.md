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

## Second pass (edited directly in `2.frag`, 2026-09-04 13:35–13:50)

4. **Key-following outline** — `lineH` adds `(pitchClassMedian - 0.5) * HERO_KEYHUE` (K195, 0.35
   turns); the rim inherits it. Median 0.15 → cyan-green stroke, 0.85 → pink-violet (m1-keyA/B.png).
5. **Pad knobs named** — K191 GROUND QUIET, K193 GROUND CURVE, K194 INTERIOR CHROMA, K195 KEY HUE,
   K163 BEAD LEVELS, K196 FINE FADE, K197 GROUND GLINT.
6. **Ground speckle — found and fixed.** Not the bead texture (hex ground 6.43 vs bead 6.32 exterior
   roughness) and not the fine fold levels (a fade on sub-pixel levels changed nothing: alpha is
   already saturated by the coarse levels). At 4x zoom it is 1-px white vertical dashes: the
   rim/shade/specular block takes `dFdx/dFdy(lum)`, and every sub-pixel ground line flips `lum` per
   pixel, so `edge` spikes and the glint fires. `rimMask` removes those three terms outside the bead
   (HERO_GLINT 0.85): roughness 6.43 → 2.96, crest untouched, 15% still nameable.
   The bead fetch is now a real uniform branch on the coarse `BEAD_LEVELS` only (cost saving).

Still open: whole-frame luminance breathes on iTime alone (meanLum 37 → 54 → 61 → 32 across
t = 8 / 9.5 / 11 / 12.5 with every phase pinned) — the depth-travelling `wave` accent; and the
interior aperture changes picture every couple of seconds (critic: "slideshow"), both substrate
behaviour, untouched here.

Ship: `?shader=redaphid/wip/lattice-bead-vj/2&image=images/beads/mon-hakkaku.png&controller=lattice-nav&wavelet=true&navZoom0=0.218&knob_1=0.429&knob_134=0.507`
