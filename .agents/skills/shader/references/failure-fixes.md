# Failure to fix

Find the symptom Aaron named, then measure before you change code (`bin/shader-check.mjs`,
`scripts/sparkle-score.mjs`, the `?vj=1` meter). Two confident wrong diagnoses in a row means stop
guessing and measure. The basics of jitter are in
[docs/debugging-twitchy-shaders.md](../../../../docs/debugging-twitchy-shaders.md); this table adds
what the shows taught.

| He says / you see | Usual cause | Fix | Seen on |
|---|---|---|---|
| "twitchy", jitter on every frame | z-scores or raw values driving position, size or colour | `*Normalized`, `*Median`, onset envelopes, controller `*Spring`; z-scores only past a threshold | the-coat, plasma-event-horizon |
| "shivery", "shaking back and forth" | a sine on geometry; a transient added to a phase; audio on a fold parameter | one-way clocks; transient scales amplitude only; no audio on folds | lattice-vj iters 138-142, clit-set/2 (shiver 0.92 to 0.35) |
| "flashing black every other frame" | audio inside a phase argument (`sin(x - iTime * audio)`) | constant-rate phase, audio on amplitude | plasma-event-horizon/3 iter 19b |
| "cymbals make it flash like crazy", "too flashy" | many audio terms on light and coordinates, each small | audit every audio path, halve all coefficients, take audio out of coordinates | clit/4 iter 36-38 |
| "global brightness shift" | a gain on the whole frame, or a palette rotating fast (7.7 turns/min on lattice-vj-2) | move audio to local light; measure hue drift per minute | lattice-vj-2 |
| circular flash from the centre | a ring or core glow pulsed on bass (photon ring, god rays) | remove it; radiate by distorting the previous frame | taco-kandi iters 43-45 |
| blows out white when loud | additive stacking, no knee | one hue-preserving soft knee at the end; clamp before colour | sun-1 (2026-10-06) |
| brighter when quiet | Normalized and z-scores blow up in silence; an inverted energy term on light | clamp z-scores, multiply by a presence gate | sun-1 (2026-10-06) |
| "gray", "washed out", grey static | double sRGB encode; RGB multiply inside feedback (`col *= 0.86`); high L with low C | encode gamma once; dim in OKLab; raise chroma, lower the lightness ceiling, gamut-fit | the-coat-11, sun-1, lattice-bead |
| banding, worst at a knob extreme | HSL; `fract()` or `floor()` on hue; `max()` blend in feedback; hue rotation each feedback pass | OKLab mixes, `ramp4`/`palCycle` from the kit, additive feedback, hue fixed inside the loop; test every knob at 1 | taco-kandi/4 iters 28-30 |
| hot magenta | trails blending red over violet; per-channel gamma; a hue rotation crossing the pink arc | squeeze the output hue out of the arc; clamp and sanitise what feedback stores | clit-vibej iter 5, sun-1 |
| sparkle, speckle, "static" on fine detail | spatial aliasing: sub-pixel filaments popping in for one frame | `fwidth`-gated detail on CLAMPED values (an unclamped `log(trap)` dotted thread cores dark); fewer octaves at small size; check with `sparkle-score --ss 4` | clit-vibej (11-23) |
| "It is not moving", "almost still" | link missing `controller=` or `wavelet=true`; gate tuned at line level; long holds | check the URL first; tune the gate at phone level; keep a clock always running | clit-set/2 (11-21/22) |
| dead in quiet parts | everything is audio-driven, nothing runs on a clock | resting motion on constant clocks; audio adds on top | the-coat, sun-1 |
| "samey" after a while | one camera model; colour-only variety | fork with a new camera or form (log-polar tube, new fractal axis, waypoints) | clit-vibej/2 (11-22 04:07) |
| spin seems to speed up over a set | `iTime * audioRate` | controller phase accumulator | iris/1 |
| a jump every ~17 minutes | `iTime` wraps at 1000 s | periods that divide 1000 s, or controller clocks | clit-vj/2 |
| feedback creeps to white, or goes black and stays black | feedback gain >= 1; a NaN stored in the buffer | `mix(prev * 0.98, new, k)`; sanitise to finite 0-1 before storing; guard `pow`, `sqrt`, division | black-sun ("black wall" 2026-10-06) |
| ChromaDepth flat, "isn't popping" | bright background competing; one mid-depth hue everywhere; depth averaged across layers | dark violet background, red rim on silhouettes, front-most compositing; see `chromadepth.md` | handstand iter 36 |
| "It's too slow" | raymarch steps, fractal iterations, soft shadows, AO on a phone | the mobile limits in SKILL.md; drop style before frame rate | sun-1-show |
| a knob jumps the picture on first touch | the Twister is absolute: a dial lands where its ring sits | ease knobs in a controller, or map them to rates instead of positions | clit-set |

## Hunting a flash you can't find

On taco-kandi the "circular flash" survived three fixes. What found it was a flash hunter: sample
16 background pixels on a 64x64 downsample every frame, log the peak with an audio-feature
snapshot, then grep the shader for every term tied to the feature that spiked. Remove one term at a
time with the `#define` swap (set it to 0.0) and look again.
