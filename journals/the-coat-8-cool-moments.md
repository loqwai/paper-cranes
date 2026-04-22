# the-coat-8 — Session Journal

## Status
Iter 52/180. **Big knob-layout revamp**: knobs 3–8 each now a clearly-visible visual lever (fog, aurora, hyperspace, particles, trails, saturation). Also fixed zoom-in pixelation by scaling hash-grid frequencies (grit, starfield, dissolution particles) by `zoomAmount` so cells stay screen-pixel sized under zoom. Active track: *TiiGA – Buku*.

## Knob map (current)
- knob_1: zoom
- knob_2: **climax dampener** (god rays, eye wash, eye punch, cosmic shockwave, mouth glow)
- knob_3: god ray intensity multiplier (old)
- knob_4: eye wash override (old)
- knob_5: drop zoom
- knob_6: camera tilt (off by default)
- knob_7: fur thickness
- knob_8, 10, 11: unwired
- knob_9: feedback amount

## Cool moments

### iter 51 — *Holy* — Nostalgix, Kyra Mastro

**Audio fingerprint:** `treble 0.74 (trebZ +0.08) + centroid 0.71 + entropy 0.79 + energy 0.61 + bass 0.19 + mids 0.23 + pitch 0.50 + knob_2 ≈ 0.98 (climax near full)`.

**What worked:** Volumetric beams fire strong (centroid × energy both mid-high both satisfy gates), god rays at full knob_2 climax, beam color now pitch-shifts warm-cool. The track title cues a religious reading → the existing cathedral-sunbeam motif reads as literally holy. User pulled knob_2 up from 0.76 → 0.98 mid-track, which *is* them calling for the climax. Journal-driven dampener is working: subtle ambient sections → knob_2 low → warm-breath + fog + aurora only; climax → knob_2 high → beams + god rays + mouth glow + cosmic shockwave + eye-wash unload.

**What was missed:** No effect specifically keyed to *beat-aligned pitch changes* as its own channel. pitchClass is used for rainbow drift + confetti-style tints, but not as a *beat-aware signal*. A chord-change detector (pitchClass over several beats) would let v(next) respond to harmonic motion, not just instantaneous note.

**Design hypothesis:** v(next) should have a **pitch-change event detector** — window pitchClass over ~2 seconds, emit a pulse when it discretely shifts (major 3rd, 5th, octave). That's a stronger signal than instantaneous pitch — would key a "harmony changed" visual moment distinct from rhythmic signals.

### iter 39 (carried from the-coat-6) — *Odds & Ends* — Late Night Radio

**Audio fingerprint:** `bass 0.69 (bassZ +0.58) + mids 0.85 + treble 0.19 + centroid 0.10 + entropy 0.07 + roughness 0.04`. Warm dark instrumental, no transients.

**What worked:** Mercury flow (bass > 0.25 AND centroid < 0.6) + ground quake (bass > 0.3 AND centroid < 0.5) + aurora veils (centroid < 0.10) + nebula fog bass-pulse + black hole all fired simultaneously. Character poured like chrome while the ground rippled and green-teal curtains lit the sky — five effects with different gates happened to overlap at the same audio corner. Read as a *place*, not a stack.

**What was missed:** Nothing keyed specifically to *dominant sustained mids* as a signal in its own right. Warm instrumental character has that as its identity; the shader only saw it as "mild hue drift."

**Design hypothesis:** v(next) should have a dedicated effect for `mids > 0.7 AND centroid < 0.3 AND entropy < 0.2` — "warm dark instrumental" — a slow-breathing amber inner glow radiating *from* the silhouette, distinct from the bass-ring system. (Partially addressed: warm-breath chest glow added in iter 45, coat-7.)

## Todo

- [x] **Fix mercury-flow diamond lattice** (iter 46) — replaced `sin(uv.x*18 + sin(uv.y*4 + t)*2.5 - t*2)` cross-product with fbm-based domain warp: `fbm(uv * (2.5, 3.5) + vec2(sin(t*0.7)*0.4, t*1.1))`. fbm has no periodic lattice so no diamonds can form. Preserves "flowing liquid" character without the microscope-artifact look. Also slowed flow_t base from 0.5 → 0.3 per bass-scale unit to read less frantic.

- [x] **Warm breath intensity (iter 47)** — bumped `* 0.45` → `* 0.70`. Gates on `centroid < 0.8` so won't over-read on bright tracks. Will show more presence when a warm low-centroid passage kicks in.

## History of changes

(Most recent last. Don't re-add these.)

- **the-coat-3** base session: accumulated nebula fog, starfield, sub-ring, heart pulse, RGB split, scan line, lightning, crystalline facets, rotor gear, cosmic shockwave, time-echo, water pool, volumetric beams, camera drift, fog pulse, fur shimmer, aurora, tearfall, black hole, dissolution particles, hyperspace tunnel, mercury flow, ground quake, searchlight, flux hue drift, mouth glow, warm breath, bouncing body.
- **Removed in -5 fork:** RGB-SPLIT (chromatic aberration block) — user: "rgb checkerboard on coat."
- **Removed iter 35:** TEARFALL — user: "vertical white streaks."
- **Removed iter 37:** LIGHTNING + SCAN LINE + CRYSTALLINE FACETS — user: "horizontal lightning / CRT scan / rainbow checkerboard."
- **Removed iter pre-fork -7:** INFINITY MIRROR (spinning tiled kaleido) — user: "spinning squares, distracting."
- **Removed in -8 fork (iter 45):** CONFETTI — user request.
- **Removed iter 52:** VJ GRIT — user: "let's not have that grittiness at all." Was always-on noise flicker on coat during high-roughness tracks.

## Forks

- `the-coat-7 ← the-coat-6` (iter 45): snapshot of "pretty gorgeous" state before mercury-flow fix attempt.
- `the-coat-8 ← the-coat-7` (iter 45): confetti removed.

## Design hypotheses for v(next)

- Dedicated **mid-dominant warmth** effect for `mids > 0.7 AND centroid < 0.3 AND entropy < 0.2` (slow amber inner glow emanating from silhouette).
- **Effects declare their feature-space region** via a lightweight DSL so multi-effect alignments are deliberate rather than accidental. The iter-39 five-way alignment happened because three separate blocks coincidentally wanted the same corner; v(next) should express that intent in one place.
- **Avoid visible sine-cross products** on elements that will be textured onto silhouettes — they read as artifacting (mercury-flow lattice lesson).
- **Pitch-driven color** (iter 41 confetti, iter 19 chrome, iter 43 mouth glow, iter 51 beam color) consistently felt *intentional*. Keep this pattern: the music's note → some visual channel's hue. v(next) should have a single place where pitchClass is the palette's anchor, rather than each effect computing its own.
- **Feedback is the #1 flow killer** when effects feed back into next frame and create tiling. Keep effect blocks *after* the `col = mix(prev, col, feedback_amt)` step if they shouldn't persist across frames.
- **Climax dampener knob** was the biggest-impact live control this session. User pulled it back during chill phases, pushed it up for drops. v(next) should **bake this into the design** — a single "intensity" channel that scales all payoff effects uniformly, keyed to a user knob AND to `IS_DROP` / `drop_glow`. Multiple effects shouldn't each do their own drop-gating; they should subscribe to the single channel.
- **Pitch-change event detector** (windowed pitchClass, emit pulse on discrete chord changes) would give v(next) a "harmony changed" signal distinct from rhythmic ones. Would let visuals respond to musical structure, not just loudness.
