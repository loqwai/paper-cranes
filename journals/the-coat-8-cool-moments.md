# the-coat-8 — Session Journal

## Status
Iter 47/180. Mercury lattice + warm-breath intensity both addressed. No open user flags. Active track: *Take It Off - Dubstep – AIR SIK*.

## Cool moments

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

## Forks

- `the-coat-7 ← the-coat-6` (iter 45): snapshot of "pretty gorgeous" state before mercury-flow fix attempt.
- `the-coat-8 ← the-coat-7` (iter 45): confetti removed.

## Design hypotheses for v(next)

- Dedicated **mid-dominant warmth** effect for `mids > 0.7 AND centroid < 0.3 AND entropy < 0.2` (slow amber inner glow emanating from silhouette).
- **Effects declare their feature-space region** via a lightweight DSL so multi-effect alignments are deliberate rather than accidental. The iter-39 five-way alignment happened because three separate blocks coincidentally wanted the same corner; v(next) should express that intent in one place.
- **Avoid visible sine-cross products** on elements that will be textured onto silhouettes — they read as artifacting (mercury-flow lattice lesson).
- **Pitch-driven color** (iter 41 confetti, iter 19 chrome, iter 43 mouth glow) consistently felt *intentional*. Keep this pattern: the music's note → some visual channel's hue. v(next) should have a single place where pitchClass is the palette's anchor, rather than each effect computing its own.
- **Feedback is the #1 flow killer** when effects feed back into next frame and create tiling. Keep effect blocks *after* the `col = mix(prev, col, feedback_amt)` step if they shouldn't persist across frames.
