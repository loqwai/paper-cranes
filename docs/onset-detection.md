# Onset Detection and Envelopes

How to make visuals hit **on** the beat instead of a moment after it.

---

## The problem this solves

Paper Cranes visuals have historically reacted about a second behind the audio. That lag was never transport cost or FFT cost. It was **smoothing, applied as a bandage for shudder**.

The chain that produces it:

| Stage | Cost |
|---|---|
| `AnalyserNode.smoothingTimeConstant = 0.4` | ~1 frame |
| Worker round-trip (`getResult()` returns last frame's answer) | ~1 frame |
| `AudioProcessor` EMA at `smoothingFactor = 0.10` | ~10 frames to 63%, ~30 to settle |
| Rolling stats window (`historySize = 500`) | seconds, by design |

The EMA is the expensive one, and it is there for a good reason. Raw features jitter frame to frame. Jittery features make visuals flash and strobe. The only knob anyone had was *smooth harder* — and smoothing hard enough to kill the shudder is also smoothing hard enough to arrive late.

**The root cause is that one signal was being asked to be two things at once:**

- a **measurement**, which wants fidelity and immediacy
- an **animation driver**, which wants continuity and must never jump

Those are opposing requirements. No single smoothing constant satisfies both — every value of it is a compromise between strobing and lag. That is why the knob never felt right at any setting.

## The fix: detect events, synthesize responses

Stop asking one signal to do both jobs.

- The **detector** measures. It is allowed to be noisy, because its output is a discrete *event*, and "noisy" has no meaning for an event — it either fired or it didn't.
- The **envelope** animates. It cannot shudder, because once the trigger fires there is no audio left in its path. Its value is a designed curve: a pure function of time since the trigger and one latched peak.

This is what a drum machine does. You do not smooth a kick drum's waveform to get a nice-looking meter; you detect the hit and play an envelope.

Measured on a click track buried in frame-uncorrelated noise (600 frames, 18 beats):

| Signal | Direction reversals | Reading |
|---|---|---|
| Raw spectral flux | **424** of 598 frames | vibrates — unusable for animation |
| Synthesized envelope | **18** | exactly one peak per beat |

Every peak lands within two frames of its beat. **The smoothness cost no timing** — that is the whole claim.

---

## Three timescales

Do not drive everything from one feature. Layer them by what each is good at:

| Layer | Uniform | Timescale | Use for |
|---|---|---|---|
| **Events** | `onsetKick`, `onsetSnare`, `onsetHat` | 60–200ms | hits, flashes, kicks, punches |
| **The now** | `bassNormalized`, `energyNormalized` | ~200ms | body, presence, "how loud is it" |
| **Mood** | `spectralCentroidZScore`, `pitchClass`, `*Slope` | seconds | palette, background, structure |

Slow features are *supposed* to lag. Let them. Just don't drive a kick flash from one.

---

## Uniforms

Available in every shader, no declaration needed. Bands are `Kick` (20–200 Hz), `Snare` (200–2000 Hz), `Hat` (4–12 kHz), and `Full` (whole spectrum).

| Uniform | Type | Range | Meaning |
|---|---|---|---|
| `onsetKick` | float | 0–1 | **the envelope — animate from this** |
| `onsetKickTrigger` | float | 0 or 1 | 1.0 on the firing frame only |
| `onsetKickStrength` | float | 0–1 | how hard the last hit was, latched |
| `onsetKickAge` | float | 0–10 | seconds since the last onset |

Same four for `onsetSnare*`, `onsetHat*`, `onsetFull*`.

Decay times are tuned per band: kick 220ms (weight), snare 150ms, hat 90ms (dry ticks, not washes).

---

## How to use it

### Drive a visual from an envelope, not a smoothed level

```glsl
// BEFORE — a smoothed level. Arrives late, and still shudders if you
// reduce the smoothing enough to make it arrive on time.
float punch = bassNormalized;
vec3 color = baseColor * (0.5 + punch * 1.5);

// AFTER — a synthesized envelope. Immediate AND smooth; those stopped
// being a tradeoff the moment the trigger and the curve were separated.
float punch = onsetKick;
vec3 color = baseColor * (0.5 + punch * 1.5);
```

### Delete your damping

The frame-feedback damping in [debugging-twitchy-shaders.md](debugging-twitchy-shaders.md) exists to hide jitter. An envelope has no jitter to hide, so the damping only adds lag back:

```glsl
// Don't do this to an envelope — you are re-introducing the lag you just removed.
float punch = mix(getLastFrameColor(uv).r, onsetKick, 0.1);

// Use it directly.
float punch = onsetKick;
```

### Scale the response to how hard the hit was

The envelope already carries strength in its peak height, so usually you need nothing extra. When you want to react *differently* to a hard hit rather than just *more*:

```glsl
// Hard hits go white; soft hits stay in the palette.
vec3 color = mix(paletteColor, vec3(1.0), onsetKick * onsetKickStrength);
```

### Roll your own curve from the age

When you want a shape the built-in attack-decay doesn't give you — a bounce, a hold, a double-pulse:

```glsl
// A hard gate: full brightness for 80ms after each kick, then nothing.
float gate = step(onsetKickAge, 0.08);

// A slow bloom that ignores the built-in decay entirely.
float bloom = exp(-onsetKickAge * 2.0);
```

### Layer bands so elements move independently

The bands are largely uncorrelated, which is what stops everything pulsing in lockstep (root cause #4 in [debugging-twitchy-shaders.md](debugging-twitchy-shaders.md)):

```glsl
float scale      = 1.0 + onsetKick * 0.3;    // body moves with the kick
float brightness = 0.6 + onsetSnare * 0.4;   // backbeat lights it
float sparkle    = onsetHat;                 // hats glitter on top
vec3 hue         = palette(spectralCentroidNormalized); // mood drifts slowly
```

### Use `Trigger` only for genuinely discrete decisions

`onsetKickTrigger` is 1.0 for exactly one frame. That is one frame at whatever the display's refresh rate happens to be — too short to see reliably, and it *will* look different on a 144Hz monitor. Use it to change state, not to draw:

```glsl
// Good: advance a palette index, reseed a random, flip a direction.
float paletteIndex = mod(paletteIndex + onsetKickTrigger, 8.0);

// Bad: this is a one-frame flash that some viewers simply won't see.
vec3 color = vec3(onsetKickTrigger);
```

---

## Tuning

Onset behavior is configured in `src/audio/OnsetProcessor.js` (`ONSET_BANDS`) and hypnosound's `defaultOnsetConfig`.

| Knob | Default | Raise it to… | Lower it to… |
|---|---|---|---|
| `sensitivity` | 3 | miss soft hits, reject noise | catch ghost notes, risk false fires |
| `refractoryMs` | 120 | ignore fast doubles | catch fast rolls |
| `releaseRatio` | 0.7 | re-fire more readily on sustained material | require a fuller drop between hits |
| `decayMs` | per band | longer, heavier tails | snappier, drier hits |

**`refractoryMs: 120` caps the onset rate at ~500 BPM (8.3 hits/sec).** That is deliberate for visuals — you do not want 20 flashes a second — but it means 16th notes above ~170 BPM will not each get their own onset. Lower it for drum & bass if you want every hit.

---

## Known limitations

These are measured and characterized in hypnosound's `src/utils/onset.js` header, with regression tests pinning them. Summarized:

1. **Narrow bands false-fire on unsmoothed frames.** An 8-bin band drops to P=0.633 on frame-uncorrelated input. This is why the bands here are wider than textbook drum ranges, and why `smoothingTimeConstant` is not 0.
2. **Sustained modulation fires once per cycle.** A 4 Hz tremolo with no transients yields ~40 onsets in 10s. There is no local-maximum peak-picking stage. Relevant to heavily sidechained/pumping material.
3. **On a perfectly steady spectrum, `sensitivity` is bypassed** and the threshold collapses to `fluxFloor`.

---

## Requirements

The detector and envelope live in **hypnosound** (`makeOnsetDetector`, `makeOnsetEnvelope`), so the ESP32 badge firmware can run the identical algorithm rather than a lookalike.

**This needs hypnosound ≥ 2.1, which is not yet published.** `package.json` currently pins `^1.14.0`. Until that lands, `OnsetProcessor` detects the missing exports, logs one warning, and leaves every onset uniform at rest — shaders still compile and read 0, nothing breaks, but nothing fires either.
