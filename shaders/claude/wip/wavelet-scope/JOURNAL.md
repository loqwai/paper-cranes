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

## Shader lineage
- `independent.frag` — pure-wavelet smooth tapestry (synthetic-tuned 6 features + EMA)
- `combined.frag` — wavelet vs FFT vs combos (punch, confirmedDrop)
- `bass-activity.frag` — mic-tuned: 4 smooth independent lines + 2 clean triggers
- (more to come as I find good combos)

## TODO / ideas to test
- centroid + slope features for "frequency gliding" lanes (worked on synthetic sweeps)
- a "drama" shader: only the most reactive independent features for high-energy music
- cross-domain combos as smooth lines (not just triggers)
