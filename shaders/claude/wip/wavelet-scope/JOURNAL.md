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

### EYE vs DATA: slew (grid winner) vs spring (looks best) — they DISAGREE
Viewed all 4 easings on the same band1 feature live (ease-compare.frag, jam page):
- RAW: jagged fuzz. EMA: smoother but kinky corners.
- SPRING: **smoothest to the EYE** — rounded flowing curves, no fuzz, no cliffs.
- SLEW (headless #1): eased but slightly ANGULAR — the constant-rate cap makes near-
  straight segments that read as subtle kinks, not silky curves.
The grid ranked slew #1 because it penalizes LATENCY (slew ~0f lag) and measures sawtooth
via maxJump/sd — but that metric doesn't capture "curviness." Spring's gentle accel/decel
looks smoother even though it lags a few frames more.
**Takeaway:** "best easing" depends on the visual. Fast-reactive effect → slew (low
latency, snappy). Flowing/organic effect → spring (silky curves). Both should be offered.
TODO: add a "curviness" metric (2nd-derivative smoothness) to the grid so it captures
what the eye sees, and re-score.

### Service worker / cache gotcha
Controller edits weren't reaching the browser — NOT a code bug. Cause chain: Vite caches
module transforms (clear node_modules/.vite + restart dev server), AND an aggressive
service worker can serve stale JS. Fix reflex: unregister SWs + clear caches() + restart
vite. `?t=` cache-bust params do NOT defeat either cache.

## Shader lineage
- `independent.frag` — pure-wavelet smooth tapestry (synthetic-tuned 6 features + EMA)
- `combined.frag` — wavelet vs FFT vs combos (punch, confirmedDrop)
- `bass-activity.frag` — mic-tuned: 4 smooth independent lines + 2 clean triggers
- (more to come as I find good combos)

## TODO / ideas to test
- centroid + slope features for "frequency gliding" lanes (worked on synthetic sweeps)
- a "drama" shader: only the most reactive independent features for high-energy music
- cross-domain combos as smooth lines (not just triggers)

### LEGIBILITY > pure independence (user insight)
User: "I can't tell how some lines relate to the music." Key realization: a
mathematically-independent line is useless for animation if you can't MAP it to what you
hear. Abstract features (tilt, spread, z-scores) wiggle without obvious musical meaning.
→ legible.frag uses only INTERPRETABLE features, each verifiable by ear:
  bass (low thump) · kick (beat flash) · loudness (intensity) · brightness/centroid
  (cymbals vs muddy) · treble (air) · low-mid (vocal/instrument body).
Tradeoff: legible features correlate a bit more (bass & loudness both rise on a drop) than
abstract ones — but "drive size off bass, hue off brightness" is PREDICTABLE, which is
what makes animation make sense. Legibility wins for usable animation.

### MISSING DIMENSION: pitch/key (user heard synths in different keys)
The energy/timbre features (bass/loudness/brightness/treble/low-mid) completely MISS which
NOTE a synth plays — a melody is invisible to them. Confirmed live: `pitchClass` hit all 12
notes in 6s (range 0.00-0.92) while the synth riff played. Added pitchClassNormalized as a
PITCH/KEY lane in legible.frag.
IMPORTANT: pitch is CATEGORICAL (which note) — it JUMPS, doesn't flow. So do NOT spring/EMA
it (averaging across unrelated notes = mush). Plot raw/stepped.
TODO: raw pitchClass flickers frame-to-frame when ambiguous — for animation it needs a
DEBOUNCE ("current note, held until a clear change") rather than per-frame flicker. Pitch
needs different treatment than the smooth energy lines.

### FLOWING melody line (melodyFlow) — user wanted flow + identifiable musical key
Brightness/centroid does NOT track pitch (corr |0.06-0.16| with raw note — timbre ≠ note).
The only way to a FLOWING melody line is to smooth the pitch ITSELF, handling its quirks:
- pitch is CIRCULAR (note 11→0 adjacent): ease along the SHORTER arc around the circle.
- gate by tonal confidence (spectralCrest): only chase pitch when there's a clear tonal
  note, else HOLD — stops drums/noise from yanking it.
melodyFlow (in wavelet-ease controller) does this → melody.frag. Result: a smooth contour
that holds on sustained notes, glides on melodic movement, ignores drum hits. It's a
CONTOUR (rough up-down melody shape), not transcription — but "line rises when riff climbs"
is the identifiable musical motion wanted. Also exposes tonalStrength (how melodic vs noisy).
