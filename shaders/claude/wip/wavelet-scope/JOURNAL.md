# Wavelet Scope — Feature Exploration Journal

Running log of feature combos tested live (laptop mic, various music) and what worked.
Each entry: what I tried, what the data/eye showed, verdict.

## Metrics used
- **sd** (movement): want > 0.06 — a flat line animates nothing
- **jitter** (smoothness): want < 0.10 — higher reads as noise, bad for smooth visuals
- **|corr|** (independence): want < 0.5 pairwise — correlated lanes drive only one thing
- **fire rate / distinct hits** (triggers): want discrete hits, NOT always-on or never

## Findings

### Smooth animation lines (laptop mic)
The maximally-independent smooth set that survived multiple loop iterations:
`energyNormalized` (loudness) · `waveletBand5Normalized` (treble) · `waveletBand3Normalized` (mid) · `waveletBand1Normalized` (low-bass).
- All pairwise |corr| ≤ 0.44, all sd 0.10–0.19, all jitter < 0.10. ✓
- Tested swaps that ALL made it worse: `rolloffN` (0.66 w/ energyN), `band4N` (0.78 w/ band3N), `tilt` (0.67 w/ energyN), `centroid` (too flat on mic, sd 0.04). So this set is converged for mic.
- **band1N is the weakest** (jitter 0.097, corr 0.44) but the most independent — kept.

### Triggers
- **BUG (found & fixed):** trigger fired on `zMap(z) > 0.4`, but zMap(0)=0.5 → fired ~99% of the time (always-on wall, not a trigger). Fixed to fire on RAW `z > 0.8` (genuine positive spike).
- **`energyZScore` is the best trigger source** — 11 distinct hits in 5s. `waveletBassZScore` only 2, `spectralFluxZScore` 1 (always-on). `waveletBand5ZScore` = 9 (good for treble).
- Mic note: `wavelet_bassHit` is weak on laptop mic (peaks ~0.15-0.25) — deep-bass transients attenuated. Use level lines or energyZ triggers instead in mic environments.

### Smoothing
- Wavelet features were 6-7× jitterier than FFT until I added EMA (a=0.18) in WaveletProcessor (FFT pipeline already smooths). Triggers (`bassHit`/`confirmedDrop`) exempt — sharpness is the point.

### Sawtooth problem → use Median variant (NOT invented smoothing)
User: the Normalized lines are sawtooth-y (sharp kick attack, then decay) — bad for
animation. Key: don't hand-roll smoothing in the shader; use the stat variants we already
compute. Live-measured maxJump/sd ratio (lower = more eased):
- `Normalized`: ratio 1.0–1.8 → SAWTOOTH (the cliffs)
- `Mean`: ratio 0.1, but sd ~0.005 → too FLAT (dead)
- `Median`: ratio 0.4–0.5, sd up to 0.11 → **the sweet spot (eased + still moves)**
Best eased+independent median movers on mic: `tiltMedian` (sd 0.112!), `centroidMedian`,
`spreadMedian`, `bassMedian`. → `eased.frag`. Tradeoff: eased lines move LESS than
Normalized — pick Median for smooth flowing visuals, Normalized for punchy ones.

### Trigger fire bug
zMap(z)>0.4 fired ~99% of the time (zMap(0)=0.5). Fixed: fire on RAW z>0.8. `energyZScore`
is the best trigger (11 hits/5s); `band5ZScore` good for treble; `bassZScore`/`fluxZ` poor.

### EXHAUSTIVE easing grid (scripts/easing-grid.mjs) — slew-limiting wins
Tested 7 features × 12 temporal easings over the 22-signal synthetic battery, scored on
lively (sd) + eased (maxJump/sd ratio) + low-latency (lag frames) + range. Leaderboard:
  1. slew_06 (0.932) — slew-rate limit, cap 0.06/frame  ← WINNER
  2. slew_04 (0.925), slew_02 (0.914), slew_08 (0.911)
  5. slewEma (0.873), ema_heavy (0.824)
  7. spring_smooth (0.788) ← my earlier EYEBALL pick, beaten by data
  ... ema_light (0.785), spring_snappy (0.782), raw (0.650), attackRelease (0.614)
**Slew-rate limiting** (cap max change/frame) is best: kills sawtooth cliffs (ratio
0.13-0.18) while staying lively (sd 0.22-0.30) AND low-latency (0-3 frames). It only
intervenes on too-fast jumps, leaving everything else untouched. Fancier variants
(adaptive slew, slew+ema) were WORSE — simple wins. Optimum cap ≈ 0.06/frame.

### AudioProcessor already smooths — but with EMA (the weak one)
AudioProcessor.js line ~109 applies EXPONENTIAL smoothing to every FFT feature
(α=0.10, ×1.5 for ZScore/Normalized → ~0.15). That's exactly `ema_light` in the grid =
7th place. So the existing engine smoothing kills raw jitter (good baseline) but is NOT
the good-animation easing. Slew-limiting beats it. The wavelet path's added EMA matches
AudioProcessor (consistent baseline); the WINNER to graduate is slew, not EMA/spring.
**DO NOT graduate without user sign-off** — still exhaustively exploring.

## Shader lineage
- `independent.frag` — pure-wavelet smooth tapestry (synthetic-tuned 6 features + EMA)
- `combined.frag` — wavelet vs FFT vs combos (punch, confirmedDrop)
- `bass-activity.frag` — mic-tuned: 4 smooth independent lines + 2 clean triggers
- (more to come as I find good combos)

## TODO / ideas to test
- centroid + slope features for "frequency gliding" lanes (worked on synthetic sweeps)
- a "drama" shader: only the most reactive independent features for high-energy music
- cross-domain combos as smooth lines (not just triggers)
