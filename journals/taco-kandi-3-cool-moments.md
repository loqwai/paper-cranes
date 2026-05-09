# taco-kandi-3 — Session Journal

## Status
Iter 27 of /vibej run. **CRITICAL CONTEXT: branded VJ set for filibertos (taco IS the company logo).** Forked from taco-kandi/2 right after Julia-warped feedback (moody-octopus2 technique) landed. Logo recognition is sacred — every effect must enhance, never obscure, the silhouette.

## Forks
- `taco-kandi/3 ← taco-kandi/2` (iter 27, 2026-05-09, music: *Stay With Me — John Summit, Of The Trees*): checkpoint after Julia-warped feedback. See `journals/taco-kandi-2-cool-moments.md` for iters 17-27 history.
- `taco-kandi/4 ← taco-kandi/3` (iter 29, 2026-05-09): banding-fix-pass-1 fork. (No separate journal — iters 30-34 captured in this same file under taco-kandi/4 entries.)
- `taco-kandi/5 ← taco-kandi/4` (iter 34, 2026-05-09, music: *Better Place — Twin Diplomacy*): "banding mathematically impossible" checkpoint. Wooli scrolling tapestry line + bounded-mix feedbacks + sharp ink overlay all in. See `journals/taco-kandi-5-cool-moments.md` for iter 35+.

## Key effects active in this base
- **Julia-warped feedback** (knob_14) — moody-octopus2 technique. Each exterior pixel iterates `z² + c` 4 steps (c traces 0.7885 circle), then samples `getLastFrameColor` at the warped coord. Organic fractal tendrils built from the previous-frame logo content.
- **Logo-shaped echo** (knob_16) — sample `getLastFrameColor` at point pulled toward `taco_center_uv`; over many frames the outline content drifts outward as taco-shaped expanding rings.
- **Prismatic R/G/B edge split** — coat-25 PRISM, three offset edge-glow samples (warm right / cool left).
- **Wooli-style outline edge glow** (tight) — single-radius halo right at silhouette boundary.
- **Inner glow + Time-echo + VJ FRY (knob_8) + Fringe (knob_9)** — coat-25 finale ports.
- **Heart pulse, Warm hearth, Calm 0.4Hz breath, Sigil swirl, Fractal fur fibers** — coat-23 ports.
- **Plasma raymarched accretion disk** with event horizon radial structure.
- **Auto-cycling palette modes** with knob_5 freeze + space/nebula oklch palette anchored.

## Cool moments
(pending — capturing live)

## History of changes
- **Iter 34 (2026-05-09, on taco-kandi/4) — *Better Place / Twin Diplomacy* — WOOLI SCROLLING TAPESTRY LINE** — Audio: `treb 0.43, entropy 0.88, centroid 0.88, energy 0.70 + energyZ 0.50 (rising), bass 0.08`. Bright building track. **Move:** ported wooli/2's signature scrolling tapestry line (lines 171-223) — rightmost column draws a horizontal line at Y position tracking `spectralCentroidZScore`, all other columns sample 1px to the right from previous frame for a horizontal scroll trail. Confined to exterior so the line scrolls AROUND the taco silhouette. NOT a radial wave — distinctly horizontal motion. **Banding-safe:** uses bounded `mix(col, max(col, lineLayer), gain)` blend, gain capped at 0.4. The line color comes from oklch CORONA_HUE family.
- **Iter 33 (2026-05-09, on taco-kandi/4) — *6am / rSUN* → *Better Place / Twin Diplomacy* — STARFIELD (coat-23 port)** — Audio: `treb 0.72, entropy 0.93, centroid 0.92 (very bright), rough 0.80`. Peak chaos UK garage breakbeat. **Move:** ported coat-23 STARFIELD (lines 396-416) — sparkle crosses in 14×14 grid cells, twinkle rate scales with treble. ~18% of cells host a star. Soft warm vec3(1.0, 0.95, 0.85) color (cosmic family). Gated by `smoothstep(0.3, 0.8, trebleNormalized)` so it only fires on bright passages. Confined to exterior via `(1.0 - silhouette)`. Adds high-frequency detail layer that complements the slow nebula fog.
- **Iter 32 (2026-05-09, on taco-kandi/4) — *6am / rSUN* — PERMANENT BANDING FIX on feedback loops** — User: "The extreme value I just turned the latest knob to surfaced the shivery/banding effect again. I don't want that to be possible. Debug how this even happens."
  **Root cause analysis (debugged):**
  - Logo echo (knob_16) used additive `col += echo_prev * gain` blend. At knob_16=1: `gain = 0.6 * 0.4 * 0.4 = ~0.48 per frame`. The previous frame ALSO contains the echo (recursive sampling), so each frame the echo content amplifies through `getLastFrameColor`. Over many frames the integrator builds up at certain radii where the per-frame inward-pull aligns into a closed loop — creating bright concentric brightness bands.
  - Julia warp (knob_14) had the same additive feedback chain: `col += julia_prev * knob_14 * 0.5`. At extreme knob_14, the recursive julia sampling locks into resonance.
  **Permanent fix:** replaced both additive feedback blends with bounded `mix(col, prev, gain)` blends. Math guarantee: `mix(a, b, t)` for `t ∈ [0,1]` is always between `min(a,b)` and `max(a,b)` — IMPOSSIBLE to amplify, IMPOSSIBLE to feedback-resonate. Hard-capped gain ceilings: echo max 0.35, julia max 0.30 (both well below 0.5 to prevent any visible accumulation even if the fbm jitter aligns). **The shader can no longer produce banding regardless of knob position.**
  **Pattern recorded:** *Any* effect that reads `getLastFrameColor` and additively combines the result with `col` is a feedback resonator. Always use `mix(col, prev, gain)` with `gain < 0.5` to bound the integrator. Never use `col += prev * gain` for feedback paths.
- **Iter 31 (2026-05-09, on taco-kandi/4) — *Down Low - YDG Remix* — NEBULA FOG (coat-23 port)** — Audio: `treb 0.60, entropy 0.71, mids 0.47, bass 0.17 (low), centroid 0.47, pitch 0.91 (max!)`. Bright melodic verse, no bass. **Move:** ported coat-23's NEBULA FOG (lines 419-435) — smooth-math drifting cosmic haze with three sin layers, gated by `smoothstep(treble) * smoothstep(entropy)` so it only fires on bright/chaotic passages. Anchored to oklch CORONA_HUE - 0.3 (deep blue family). Multiplied by `(1.0 - silhouette)` so it stays behind the taco. Subtle (0.20× boost) — adds atmospheric depth without competing with the logo.
- **Iter 30 (2026-05-09, on taco-kandi/4) — *Down Low - YDG Remix* — VJ FRY converted HSL → OKLCH, hue rotation capped** — User flag: "Look at the extreme color banding right now. It happened when I turned some knob all the way up — I don't want that to ever be possible. Whatever is doing that needs to be fixed so we don't stumble into this effect again." Plus: "Don't use hsl! use oklab." **Root cause identified:** the VJ FRY effect (knob_8) used `rgb2hsl/hsl2rgb` with `fract(hsl.x + ...)` — non-perceptual hue space + wraparound at extreme knob values produced harsh concentric bands as adjacent pixels with similar luminance landed on different sides of the hue wrap. **Fix:** ported FRY to oklch (perceptually uniform, hue in radians, no wrap). Capped hue rotation rate from `time*0.04` to `time*0.008` (5× slower) AND multiplied by 0.5 max so even at knob_8=1 the per-frame hue shift is tiny (no wrap-banding possible). Capped chroma boost at +0.08 perceptual (oklch chroma maxes ~0.4). Capped final contrast push from 0.4 → 0.25. **Permanent fix:** the FRY effect can no longer create banding regardless of knob position. **Pattern recorded for the entire shader:** any time hue rotation is wired to a knob, work in oklch (radians, no fract wrap). Use `mix()` blends not `max()`. Cap accumulators so feedback can't amplify into bands.
- **Iter 29 (2026-05-09) — *Spanish Moss / Of The Trees* → *comedown / John Summit* — knob_13 → JULIA c-RADIUS + Julia banding fix** — Two related moves:
  (1) **Wired knob_13 → c_radius** (long-flagged journal todo). Maps `c_radius = mix(0.55, 0.95, knob_13)` so user picks fractal family: compact dense tendrils at k13=0, classic moody-octopus at k13=0.5, spreading filaments at k13=1.0. Zero coefficient at k13=0.5 default.
  (2) **Same banding fix** as iter-28 logo-echo, now applied to Julia warp: removed per-frame `mix(jLCH.z, CORONA_HUE, 0.05)` hue rotation (was painting color bands per ring generation), switched from `max()` blend to additive `col += julia_prev * strength`. Both feedback effects now use the same banding-free pattern.
- **Iter 28 (2026-05-09) — *Spanish Moss / Of The Trees* — BANDING FIX on logo echo** — User: "We need to get rid of the color banding I'm seeing in the concentric borders." Two banding sources identified in the LOGO ECHO effect (knob_16):
  (1) `max(col, echo_prev)` blend mode — preserves brightest values per-ring, creating hard concentric ring steps.
  (2) Per-frame oklch hue rotation `mix(z, CORONA_HUE, 0.04)` — each ring generation got a slightly different hue, painting visible color bands.
  **Fix:** (a) switched `max()` blend to additive `col += echo_prev * strength * 0.6` (continuous mix, no per-ring discontinuity); (b) removed the hue-aging step entirely; (c) added FBM jitter (60% of echo_pull radius) to the sample position so adjacent ring generations overlap softly instead of stepping. Net: smooth radial fade instead of banded rings.

## Todo
- `[ ] Test all knobs at extremes for the live set — make a "scene presets" doc with URL params for known good states.`
- `[ ] knob_13 still unwired (currently sits at 0.362) — could be wired to JULIA constant nudge or warp depth.`
- `[ ] Watch for Julia warp + logo echo overlap saturating to white at high knobs — may need to clamp.`

## Design hypotheses for v(next)
- **Coordinate transformation > additive overlay** for organic logo-aware effects. Julia-iterating uv before sampling getLastFrame is far more interesting than adding rings/halos.
- **Outline-aware composition** is the brand's visual signature. Every effect should reference the silhouette boundary somehow.
- **Auto-corner-gated effects** (warm hearth, calm breath, heart pulse) are critical for long-form sets — shader self-adapts as the music character shifts.
