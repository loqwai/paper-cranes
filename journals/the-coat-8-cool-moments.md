# the-coat-8 — Session Journal

## Status
Iter 54/180. Knob layout settled. **Colors back** (saturation formula was collapsing to greyscale at knob_8=0; fixed to passthrough-at-0). **knob_3 + knob_4 now palette-navigators**: knob_3 rotates hue globally, knob_4 is chroma floor — works everywhere, any position gives a coherent palette. Starfield defaulted OFF (knob_9) + softened (was likely source of "graininess"). Active track: *Sweat (Soulji Remix) – Karma Fields*.

## Knob map (current, final)
- knob_1: zoom
- knob_2: climax dampener
- knob_3: **palette hue shift** (global hue wheel)
- knob_4: **palette chroma floor** (0=natural, 1=always saturated)
- knob_5: hyperspace tunnel
- knob_6: particle storm
- knob_7: trails/ghost smear
- knob_8: saturation boost (0=natural, up=supersat)
- knob_9: **star density** (0=off, 1=full starry)
- knob_10: fog density
- knob_11: aurora intensity

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

### iter 43 — *Cyclops Rocks VIP* tuba-demon return — Subtronics (2026-04-22)

**Audio fingerprint:** `bass 0.58 + bassZ +0.59 + mids 0.88 + treble 0.23 + trebZ -0.87 + energy 0.09 + energyZ -0.56 + centroid 0.12 + entropy 0.28`. Second independent confirmation of the **mids-huge + energy-zero + bassZ-spike + centroid-near-black** corner (first seen in *End of You / Big Florida* at iter 38). The "tuba demon arrives" fingerprint is a real archetype, not a one-off.

**What worked:** All five gates fire simultaneously — BLACK HOLE (bassZ>0.3 ✓ and now-primary after iter 37 promotion, lens_strength 0.12 × bh_strength 0.59 ≈ ×1 bigger pull than before), WARM HEARTH (mids>0.45 × centroid<0.25 × energy<0.5 ✓ all three), MERCURY FLOW (bass>0.25 × centroid<0.6 ✓, now slower due to iter 36 energy-scaled speed formula), AURORA VEILS (centroid<0.35 ✓), GROUND QUAKE (bass>0.3 × centroid<0.5 ✓). Five effects, different feature gates, all aligned on this rare corner. Reads as an *arrival moment* — figure pulls the scene inward while warm amber + green curtains pour in.

**Design hypothesis:** The `mids-huge + energy-zero + bassZ-spike` corner is a **named archetype**: call it `TUBA_DEMON` or `BASS_FORTRESS` (journal names consistently). A v(next) shader should have a single named gate that drives a coordinated payoff here — not multiple independent gates accidentally aligning. Also: this fingerprint recurred on both Big Florida (trap-ish) and Subtronics (dubstep) → it's genre-agnostic.

### iter "auto-30" — *Sleepy Hollow* glassy bells — Big Florida (2026-04-22)

**Audio fingerprint:** `bass 0.52 + bassZ +0.27 + treble 0.24 + trebZ -0.19 + mids 0.33 + centroid 0.73 + entropy 0.65 + energy 0.48 + flux +0.45 + pitch 0.00 + beat=true`. Bright spectral tilt without hiss — bells/chimes over a bass pulse. Pitch pinned to C root.

**What worked / what was added:** Introduced **VJ GLASS SHIMMER** — fires on `centroid > 0.55 AND treble < 0.45 AND bass > 0.25` (intersected via smoothsteps). Icy-blue silhouette rim glint with a vertical sine shimmer modulated by pitchClass. Sits between MERCURY FLOW and TIME-ECHO in the post-process chain.

**What was missed (before this tick):** This exact fingerprint — bass+centroid-bright but treble-dark — had no dedicated response. Too bright for MERCURY FLOW (which requires centroid < 0.60), not hissy enough to fire the treble-gated GEAR or STARS prominently. The figure read as "bass pulse" but the *glassy* character of the timbre had no visual handle.

**Design hypothesis:** The `centroid × 1/treble` axis is musically distinct ("bright but not noisy" = tonal brilliance — bells, glockenspiels, filtered synth plucks, piano brights). It deserves its own named gate: `TONAL_BRIGHTNESS`. Combining with bass presence yields the "glassy bell over sub-bass" archetype common in lush dubstep breaks + trap bridges.

### iter "auto-26" — *Wonkestra* sub-bass fortress — LIU KANG, Wolfie (2026-04-23)

**Audio fingerprint:** `bass 0.98 + bassZ +1.62 (huge!) + mids 0.69 + treble 0.19 + trebZ -1.17 + centroid 0.22 + entropy 0.23 + energy 0.00 + energyZ -1.02 + pitch 0.00`. **Bass-only fortress moment** — sub-bass hits maximum while everything else dies. The "tuba demon arrives" frame.

**What worked:** Three converging signals all firing hard simultaneously:
1. **SUB RING** at max (`bass_hit = 1.62`, way over iter-15's 0.2 threshold) — orange ring expanding under the figure.
2. **WARM HEARTH** all-gates-pass (mids 0.69 + centroid 0.22 + energy 0) — amber chest glow.
3. **HEART PULSE saturated** (heart_pulse = 0.3 + 1.62×1.2 + 0.98×0.5 + 0.69×0.4 ≈ 3+) — red glow blazing on chest.

Plus fog at 0.6, aurora at 0.6 — full atmospheric warmth around the figure. Eyes correctly off (energy=0). The substitutes from this session's iter-1 + iter-15 (SUB RING threshold loosened to 0.2) + iter-21 (WARM HEARTH speed scaling) all align on this rare audio shape.

**What was missed:** Nothing — this is a pristine alignment. Rare audio fingerprint (bass max + energy zero + warm-dark) and the shader has a dedicated response for each axis.

**Design hypothesis:** This corner — `bass > 0.9 + energy < 0.1` — is the "bass arrives, everything else gone" moment in dubstep / Subtronics-style production. Worth a *named* gate in v(next) (e.g. `BASS_FORTRESS`) that drives a coordinated payoff (bigger ring + heart bloom + maybe a brief BLACK HOLE silhouette pulse). Currently emerges from three independent gates accidentally aligning — a deliberate channel would let it land harder still.

### iter "auto-13" — *ETOILE* drop — HOL! (2026-04-23)

**Audio fingerprint:** `bass 0.18 + treble 0.73 (trebZ +0.34) + mids 0.18 + centroid 0.89 + entropy 0.87 + energy 0.79 (energyZ +0.61, very rising) + flux +0.23 + pitch 0.50`. Drop landing on a star-themed French house track.

**What worked:** The iter-13 wiring `knob_9 (stars) += IS_DROP * 0.6` paid off — stars at MAX during this confident drop without needing extreme treble. Knob_2 (climax) substitute saturated: eyes/god-rays/eye-wash/mouth all unloading. Hyperspace at 0.55 (energyZ + trebleZ contribution from iter-1). Aurora correctly off (centroid 0.89 too bright). Star theme + stars-at-max read as deliberate even though no track-name lookup happened — the audio shape matched the thematic intent.

**What was missed:** No way to literally *recognize* "ETOILE" / "star" / "starlight" in the track name and intensify the star motif specifically. That'd require track-name keyword routing in the skill, not the shader. Standing hypothesis since prior journals.

**Design hypothesis:** Audio substitutes for the climax/star/hyperspace knobs are now well-tuned for drop landings. v(next) could expose a track-name keyword channel from the skill side as a uniform (e.g. `theme_star`, `theme_dark`, `theme_fire`) that the shader could opt into without inventing per-track regexes.

### iter "auto-7" — *BETWEEN WORLDS* break — Deathpact (2026-04-23)

**Audio fingerprint:** `bass 0.71 (bassZ +0.14) + mids 0.84 + treble 0.21 (trebZ -0.11) + centroid 0.08 + entropy 0.27 + energy 0.09 (very low) + pitch 0.45`. **The exact "warm dark instrumental" corner the journal has flagged for years.** Mid-Deathpact quiet break — bass holding, mids dominant, almost no treble, very calm.

**What worked:** WARM BREATH gate (`midsNormalized - 0.15` × `smoothstep(0.8, 0.2, centroid)`) fires hard: 0.69 amplitude × breath × 0.7 = peak ~0.48 amber chest glow. Aurora at full (centroid 0.08 = 1.0 substitute). Fog blooming (mids 0.84 → fog substitute 0.7). Eyes/payoff effects properly off (knob_2 substitute ≈ 0). The figure is a warm pulse against green-teal aurora curtains in a fog cloud — exactly the "place, not stack" feel the iter-39 entry described.

**What was missed:** WARM BREATH cycle was 0.5Hz (3.14 coefficient) which felt too fast for this calm energy. Fixed in this tick — now scales with energyNormalized so quiet sections breathe at ~0.1Hz, energetic sections at ~0.6Hz.

**Design hypothesis:** The full-auto knob substitutes (iter-1 + iter-2/5/7 refinements) make this corner findable via *any* track that hits the right audio shape, not just one specific track. The hypothesis from -6 was real — the corner is musically meaningful AND the existing effects respond well; just the rate scaling needed tuning.

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
- **Iter 39 (2026-04-22):** User: "there's a terrible line sweeping over time from the top ... like a spotlight". **Removed VJ BATON** (tall thin bright vertical line from top, sin(time × 1.3) sweep angle, gated on `trebZ > 0.2 × centroid > 0.55` — fired often on Subtronics-style treble-bright drops). **Also removed VJ SEARCHLIGHT** (rotating red/blue police beam from above, origin `(sin(t*0.7)*0.5, 1.1)`, gated only on `midsN > 0.2` — fired almost always). Both looked like spotlights-from-top. Do not re-add either. Also this tick: HUE_DROP rewritten as centroid-split — low-centroid→hot orange (hue=0.02), high-centroid→ice blue (hue=0.58) — bass drops stay warm, screamy-treble drops shift cool.
- **Iter 37 (2026-04-22):** User: "let's clean up the code if it's messy. save the eye rays going crazy for truly special moments, and use a different 'primary' effect" + "move closer to the original shader. let's simplify the coat texture to be more like the earlier ones". Changes: (1) **Cleaned code**: removed stale knob-map doc block, `DROP_TRIGGER` unused define, `INFINITY MIRROR removed` tombstone comment, `DEBUG_OUTLINES` dead `#if` block, "END AUTO-PILOT" marker. (2) **Eye rays + eye wash** gated by new `special_moment = smoothstep(0.55, 0.9, drop_hit) × smoothstep(0.55, 0.85, energyNorm) × smoothstep(0.3, 0.9, bassNorm)` — narrow triple overlap means they only fire on genuinely big drops. (3) **BLACK HOLE promoted to primary**: threshold lowered from `bassZ > 0.3` to `bassZ > -0.05 + 0.4×max(energyZ - 0.2)`, lens strength 0.08→0.12, outside-silhouette blend 0.8→0.9. Now the dominant drop visual is gravitational lensing, not eye blast. (4) **Fur texture restored to original**: removed my Local-Edge Sobel + catch-light, put back the domain-warped fbm strand code from the-coat-3.
- **Iter 35 (2026-04-22):** User: "those lollipop looking things flashing rapidly on the jacket — look terrible." **Removed VJ WHORLS** (ported from the-coat-9 at iter 30). The log-polar spiral cells with jittered center_offset rendered as a field of circular shapes that flashed rapidly via `swirl_t * 2.0` in the sine term. Do not re-port whorls to this shader.
- **Iter 33 (2026-04-22):** User flagged "gray shimmery feedback loop" + "cleaner lines for the fur coat" + "eyes often hidden in idle state". Three fixes: (1) **Removed VJ INK OUTLINE** (Sobel-on-prev-frame → ink-blend accumulated gray every frame; classic feedback gray-bleed). (2) **Rewrote fur strands** from turbulent-fbm to **directional hatching** — rotated uv by slow per-location angle, then `pow(abs(sin(fp_rot.x)), 4.5)` for sharp parallel combed lines with per-row jitter. Cleaner, illustration-like. (3) **Eyes floor**: knob_2 now starts at 0.35 baseline + audio on top, so eyes + god-rays always read in idle, just brighter on drops.
- **Iter "auto-1" (2026-04-23):** User: "the dubstep daddy is missing his eyes" + "going full auto, no knobs". Eyes were on `col += eyes * hot * 2.2 * knob_2;` and the controller hadn't injected presets, so knob_2 = 0 → invisible eyes. Rather than special-case eyes, **defined all 15 knobs at the top of the file as audio-driven `#define` substitutes** — knob_2 → `clamp(IS_DROP + smoothstep(0.5, 0.9, energyNormalized), 0, 1)` so eyes/god-rays/eye-wash/mouth/shockwave/baton fire on real drops + sustained energy; knob_9 → `smoothstep(0.55, 0.9, trebleNormalized)` (stars on bright tracks); knob_10 → `smoothstep(0.3, 0.75, midsNormalized) * 0.7` (fog grows with mids); knob_11 → `smoothstep(0.4, 0.1, spectralCentroidNormalized)` (aurora on dark tracks); knob_5 → energyZ + trebleZ; knob_6 → bassZ; rest set to safe constants. **No knob_* uniform reads in the shader anymore** — pure audio reactive. Eyes back. Also: jam.html now auto-installs `__vjValidate` so future ticks don't need re-injection.

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
