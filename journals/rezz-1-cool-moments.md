# moody-octopus/rezz-1 — Session Journal

## Status
Iter 2 of /vibej2 run. **Ambient laptop mic** (no Spotify). Forked from `shaders/redaphid/wip/moody-octopus2.frag`.
Brief (user, 2026-10-03): "vibe off of moody-octopus-2, but with a dark, rezz-like color scheme. dark reds. blacks. purples."

## History of changes
- **iter0/1: fork + REZZ grade.** Kept the moody-octopus2 Julia/feedback structure untouched and added a
  final grade: hue = triangle walk over (source hue + finalDist + slow time) folded into red (1.0) ->
  violet (0.76) so there is no wrap seam; lightness = `pow(smoothstep(0.12, 0.55, L), 1.6) * 0.36`,
  then multiplied by `pow(1 - walk, 1.8)` so the purple end of the walk sinks into black.
- **First attempt was a black frame.** Floor 0.30 / power 2.2 crushed everything: the source's HSL
  lightness sits ~0.35, and the feedback loop then reads its own black. Lesson: measure source L before
  choosing a floor.
- **Second attempt was a magenta wall** (0% black). Lightness had no structural term. The walk-based
  shadow fixed it: 58% true black, mean luma 0.018, peak 0.10.
- Added `@fullscreen: true`.
- **iter2: HYPNOTIC SPIRAL + PROWL DRIVE.** User (2026-10-03): *"more spiral, make it hypnotic. We're playing
  like a dark, brooding synthwave. So maybe something that feels a little like we're driving a car. prowling."*
  A first pass of faint log-spiral bands (contrast 0.35-0.8) was invisible under the fractal tiles. Replaced
  with a dominant 4-arm log spiral: `fract(log(r)*1.6 + angle*4 - time*0.22)` so the arms stream OUTWARD from
  the centre like road lines (driving forward), plus a 0.015 turns/s spin. Gaps between arms 94% black, fractal
  shows only inside the arms, each arm has a hot red leading-edge rim (L 0.30 * (0.5+0.5*bassNormalized) —
  the engine growl, amplitude only). Centre recedes to black (`depth = smoothstep(0.02, 0.75, r)`) = vanishing
  point. All phases time-only. Probe: true-black 0.62-0.68, mean 0.015, peak 0.10-0.115.

- **iter3: Julia PROJECTED onto the spiral arms.** User: "The julia set should look projected so that it
  'textures' the spiral arms." The Julia set is now evaluated in arm space, not screen space: u = along-arm
  coordinate `log(r)*ARMS/2PI - TIGHT*theta` and the across-arm `spiral` phase are the log-spiral's
  *conformal* pair, so the texture rides each ribbon undistorted and shrinks toward the vanishing point
  for free (perspective). u jumps by TIGHT*2PI at the atan seam, so it is tiled by that/8 and mirrored,
  which keeps the seam clean. Julia c walks the 0.7885 circle on time only (ARM_JULIA_MORPH 0.02).
  ARM_TEX_MIX 0.85 keeps 15% of the old screen fractal underneath.
- **iter3 gotcha: the first pass was invisible** (91% black, only rims showing). On the 0.7885 circle the
  Julia set is mostly dust, so almost every arm pixel escapes in 2-5 iterations. A smooth count /24 reads as
  near-black. Fix: ARM_TEX_GAIN 6 + pow 0.55 + smoothstep(0.04, 0.8). Result: black 0.64, mean 0.024, peak 0.10.

- **iter4: all 4 rims + filigree.** Ray probe (luma along E/N/W/S from centre) showed the 4-fold symmetry
  was intact — the "only 2 of 4 rims" read came from each rim floating ALONE in the gap: the across-arm Julia
  coord put fast-escaping exterior (dark) at the leading edge, so ribbons read "texture, bare line, texture".
  Fix: mirror the across coord at the ribbon centre, add a dimmer trailing rim (ARM_TRAIL_RIM 0.6) so each
  ribbon is framed both sides. Blobs came from ARM_TEX_GAIN 6 saturating every slow-escaping point into flat
  pink; replaced with distance-estimate filaments (ARM_FILAMENT_WIDTH 2.5 px, via fwidth of arm coords) over a
  dim escape glow (ARM_GLOW_FLOOR 0.45, GAIN 16). Probe: black 0.61, mean 0.029, peak 0.138.

## Cool moments

## Todo
- [ ] Mic read FLAT again at iter4 start (energy 0, all Normalized 0.5) — audio may be dropping intermittently; check permissions/console.
- [x] Rezz motif: hypnotic spiral (iter2). Standing requirement now — never remove, tune only.
- [ ] Prowl: optional low horizon / vanishing-point hint; keep spiral first.
- [ ] Mic read flat at iter2 (energy 0, all Normalized 0.5) — check the mic is live before tuning audio terms.
- [ ] Nothing in the grade is audio-reactive yet; give the hue walk / shadow depth slow mic-safe drivers.
- [ ] Original still uses `beat` (ripple) and raw z-scores in UV offsets — candidates for removal if shivery.

## Forks
- `rezz-1 ← moody-octopus2` (iter 0). Sibling of `moody-octopus/dark-1` (see `journals/dark-1-cool-moments.md`).

## Design hypotheses for v(next)
- A palette grade at the end of an existing shader is a cheap way to re-skin it — but the lightness map
  needs a structural term (here: position on the hue walk), or a narrow source L range becomes a flat wall.
