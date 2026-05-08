# living-rainbow-water-oklab — Session Journal

## Status
Iter 60. Wash-out, flicker, and one-color collapse all addressed; rainbow now driven by spatial gradient (`p.x*TWO_PI*0.6 + p.y*TWO_PI*0.15`) so all hues coexist on screen. Vignette removed. `knob_1` wired to dedicated camera zoom.

## Cool moments
*(none yet)*

## Todo
- [ ] Confirm visible "blob formation" — hungry cells should clump into territories of similar hue. If too soft, raise `groupingStrength` floor (currently 0.35) or drop `MAX_HUE_CHANGE` clamp from 0.6.
- [ ] Confirm beat punch is felt without strobing — currently `+0.18 L`, `+0.08 C`. Adjust if too aggressive.

## History of changes
- Iter 59 (2026-05-02): Forked `ambience/living-rainbow-water.frag` → `living-rainbow-water-oklab.frag`. Three-part rebuild:
  1. **Audio-reactive**: replaced almost every `knob_*` ref with audio features.
     - `time` factor → `energyNormalized` + `energyZScore`
     - Scale → `bassNormalized` + `midsNormalized`
     - Warp strength → `spectralFluxZScore` + `bassZScore`
     - Pattern morph → `midsNormalized` / `trebleNormalized`
     - Symmetry slices → `spectralEntropyNormalized`
     - Pheromone strength → `spectralRoughnessNormalized`
     - Environment food → `bassNormalized` + `bassZScore`
     - Mutation rate → `spectralFluxZScore`
     - Hunting reach → `energyNormalized` + `spectralFluxZScore`
     - Hue anchor → `pitchClassNormalized`
  2. **Life-sim more obvious**:
     - 8 neighbors instead of 4 (better tribal averaging).
     - Hunting "reach" expands with energy — cells see farther on loud passages.
     - Added `hueCoherence` metric (length of mean-hue vector) — used to: slow metabolism in coherent tribes, boost chroma in coherent tribes, strengthen grouping.
     - Grouping strength now genuinely strong (0.35 floor + up to 0.85 when hungry).
     - Random hue mutation gated on positive `spectralFluxZScore` so timbral surprises spawn new tribes.
     - Beat-punch: instant L+C bump on `beat`, hue nudged by centroid.
  3. **Fix wash-out**:
     - Old final blend was `mix(prev, new, 0.02–0.03)` → almost zero signal. New blend is `mix(prev, new, 0.30–0.70)`, biased toward the new frame, with feedback DROPPING under bright pulses (so highlights don't smear into mud).
     - Color path is now end-to-end oklch with chroma clamped to perceptual max (0.34) instead of HSL `clamp(sat, 0, 1)`.
     - Vignette in oklch L (perceptual) instead of multiplicative RGB.

## Forks
- `living-rainbow-water-oklab ← ambience/living-rainbow-water` (iter 59)

## Design hypotheses for v(next)
- 8-neighbor mean-hue + `hueCoherence` metric is the thing that makes tribes legible. Use this metric anywhere life-sims are involved.
- Audio features should drive *system parameters* (reach, metabolism, food, mutation rate), not direct color outputs — that's what makes the cells "feel alive" instead of "feel reactive".
- Wash-out cause: feedback factors under 0.10 turn life-sims into mud because the simulation has no headroom to express change before it's averaged away. Keep new-frame bias ≥ 0.30 for any sim that wants visible state.
