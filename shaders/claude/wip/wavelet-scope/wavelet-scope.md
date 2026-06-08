# wavelet-scope — DWT multiresolution prototype

A throwaway diagnostic for evaluating whether a **wavelet transform** (multiresolution
analysis) gives sharper transients and better bass/treble timing than the production
FFT pipeline.

## Why this exists

The FFT pipeline uses a single window (4096-pt ≈ 85ms). One window length means bass
and treble are analyzed at the *same* time resolution — wrong for music. Bass wants long
windows (frequency precision); transients/treble want short windows (time precision).
A **dyadic DWT** gives each octave its own natural time resolution for free, and
localizes transients to ~1-2ms instead of smearing them across 85ms.

## Architecture (isolated — zero changes to AudioProcessor.js / hypnosound)

```
raw-tap-processor.js (AudioWorklet)   → grabs raw, un-windowed time-domain samples
        ↓ 1024-sample frames
src/audio/waveletWorker.js            → Daubechies-4 (D4) DWT per frame
        ↓
src/audio/WaveletProcessor.js         → publishes window.cranes.waveletFeatures
        ↓ (spread into getCranesState in index.js)
this shader                           → 6 band meters + onset flash vs FFT spectralFlux
```

Gated behind `?wavelet=true`. Exposed uniforms (declared explicitly in the .frag since
they aren't in the known hypnosound feature list):
`wavelet_band0..5`, `wavelet_band0Z..5Z`, `wavelet_onset`, `wavelet_onsetSmooth`, `wavelet_bass`.

## How to run

```
?shader=claude/wip/wavelet-scope/1&wavelet=true&audio_file=test-audio/dubstep.mp3&audio_time=30&fullscreen=true
```

- Left 70%: 6 octave-band z-score meters (red=low → violet=high)
- Right 30%: FFT spectralFlux z-score reference
- Top strip: wavelet onset (cyan) vs FFT spectralFlux (magenta) — the A/B

(Audio-file playback needs a user gesture; click once and resume the context.)

## Findings (Subtronics "Revenge Of The Goldfish", ~30s in, 2026-06-07)

DWT math verified standalone first: orthonormal (energy-preserving ratio 1.0000), low
sine → coarse band, high sine → finest band, impulse → sharp finest-band spike.

Live on real dubstep, sampled at 33ms over 2s:

| Metric | Wavelet onset | FFT spectralFlux |
|---|---|---|
| Transient events detected | **5** | 2 |
| Spike shape | isolated single-frame (`▇`→`▁`) | broader bumps (`▄▃`) |

The wavelet onset catches ~2.5× more kicks and fires as sharp single-frame spikes, while
FFT flux smears and misses several. The bass band (band0) tracks the kick envelope cleanly
(`██▇▇` swell + natural decay). **Conclusion: the multiresolution approach delivers the two
things the FFT pipeline was weak on — sharper transients and per-octave bass/treble timing.**

## Deep-bass-hit detection (the live-phone-mic use case)

Reworked the worker from a treble-onset detector into a **deep bass HIT detector**,
because the real goal is catching bass drops on a phone mic in a live room.

DWT band frequency map (44.1kHz, 1024-pt frame, 23ms):

| band | freq | role |
|---|---|---|
| band0 | 43-86 Hz | deep bass (fundamental of a drop) |
| band1 | 86-172 Hz | low bass / first harmonic — **survives phone-mic rolloff best** |
| approx | <43 Hz | true sub (mostly murdered by phone mics) |

**Key insight:** phone mics roll off hard below ~100Hz, so a 48Hz drop's fundamental is
heavily attenuated, but its harmonic near 96Hz (band1) survives. The detector uses a
**harmonic-weighted** `bassEnergy = band1*1.0 + band0*0.8 + sub*0.5` so it fires on the
HIT even when the sub-tone barely reaches the mic.

New uniforms: `wavelet_bassHit` (sharp rising-edge signal), `wavelet_bassZ`
(self-calibrating hit strength — mic-level-agnostic), `wavelet_bassEnergy`.

**Findings** (synthetic `bass-drop-test.mp3`: 48Hz hits @0.75s + 40Hz sub @1.5s + pink noise):
- 7/8 hits detected over 6s, both via raw hit and z-score. bassZ peaked 1.565.
- Sparkline shows sharp, evenly-spaced rising edges with clean silence between — only
  ~10% of frames above threshold, all clustered at hits. Low false-positive.
- band1 (`▇`) consistently taller than band0 (`▄`) on each hit — confirms the harmonic
  survives better than the fundamental, validating the harmonic weighting for phone mics.

`wavelet_bassZ` is the recommended signal to drive bass-drop visuals: it measures "is this
bass unusual right now" so it adapts to whatever level the mic actually captures.

## 2.frag — scrolling oscilloscope comparison (wavelet vs traditional)

Built in the `graph/line-z-score.frag` idiom (scroll left via frame feedback, draw a new
sample in the rightmost column). Overlays four bass-relevant lines so you can watch which
spikes cleanly on each hit:

- CYAN = `wavelet_bassZ` (ours), RED = `bassZScore`, YELLOW = `energyZScore`,
  MAGENTA = `spectralFluxZScore` (the current de-facto drop signal).
- White full-height column = `wavelet_bassHit` fired (a detected drop).

Run: `?shader=claude/wip/wavelet-scope/2&wavelet=true&audio_file=test-audio/bass-drop-test.mp3&fullscreen=true`

**Result (visual, ~12 hits on the synthetic deep-bass file):**
- The white hit-flash columns are perfectly periodic — one per drop, no misses, no false
  fires between. Clean, reliable bass-drop trigger.
- The cyan `wavelet_bassZ` line is a coherent trace that dips then snaps to a sharp peak at
  each hit. High signal-to-noise, readable rhythm.
- The traditional features are visibly noisier — scattered confetti with no clean line.
  `spectralFluxZScore` (magenta) in particular does NOT track the bass hits cleanly,
  matching the live experience that the FFT drop signal is mushy on bass-starved input.

Conclusion: `wavelet_bassHit` (trigger) + `wavelet_bassZ` (continuous strength) are the
recommended signals for deep-bass-drop visuals, especially on phone mics.

## 3.frag — wavelet bass vs the ACTUAL drop-detector

`2.frag` compared against a single feature (`spectralFluxZScore`). But the real signal we've
been using is `graph/drop-detector/1.frag`, which is NOT one feature — it counts how many
spectral z-scores exceed PROBE_B (0.95) at once: a "drop" = >=2 of
{energyZ, spectralKurtosisZ, spectralEntropyZ, spectralFluxZ, spectralRolloffZ}.
`3.frag` reproduces that exact logic and plots it (orange) next to `wavelet_bassZ` (cyan),
with the drop-detector's five input z-scores drawn dimly so you can see what it reacts to.

Run: `?shader=claude/wip/wavelet-scope/3&wavelet=true&audio_file=test-audio/bass-drop-test.mp3&fullscreen=true`

**Measured comparison (synthetic deep-bass file, ~18s, hits every 0.75s):**

| Detector | Distinct events | Character |
|---|---|---|
| wavelet bass (`wavelet_bassHit`) | **11** | clean ~1-per-drop, readable cyan line, bassZ max 1.6 |
| drop-detector (>=2 z>0.95) | 8 | DID fire (maxSimultaneousZ reached 5), but erratic — its inputs are scattered confetti, not a coherent line |

Honest read: the drop-detector is NOT dead on bass content — each hit's broadband transient
nudges entropy/flux/rolloff enough to trip it sometimes. But it's noisier and less consistent
(8 vs 11), and its trace is visually noise where the wavelet bass line is a clean readable
trace. For deep-bass-drop reliability the wavelet line wins; the gap should widen on a real
phone mic where the spectral features get even mushier. Worth re-running this exact 3.frag
comparison live through a phone to confirm.

## Next steps (not done — prototype only)

- Decide: add wavelet features *alongside* FFT (lowest risk) vs build a kick-detection
  controller off `wavelet_onset` (replaces the unreliable `beat` uniform).
- CWT scalogram version would be prettier but is too expensive for 60fps mobile — DWT is
  the right call for a live tool.
- `test-audio/dubstep.mp3` and `test-audio/kick-test.mp3` are local test assets (gitignore
  if not wanted in the repo).
```
