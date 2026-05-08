# mandelbulb — Session Journal

## Status
Iter 10 on /vibej run. Hour-long camera journey active: 120s dive cycle (far→close→far), irrational drift means non-repeating path, look-target drifts during dives. 5 curated IQ cosine palettes (Sunset/Bioluminescent/Iridescent/Lava/Aurora). Internal fractal rotation. Halo glow on grazing rays gives atmospheric corona. 4 knobs (k1=zoom, k2=power, k3=palette, k4=light angle). Composition reads as cathedral-meets-deep-sea-coral.

## Cool moments
### 2026-05-02 — "Golden Relic" — far phase + Lava palette + halo corona
Track: *Pressure (GENESI, Laherte)* — mic input, audio still flowing.
Audio fingerprint: bass=0.69 (high), mids=0.56, centroid=0.29 (low/dark), pitch=0.45.
Composition: tiny intricate golden mandelbulb hovering small in frame, surrounded by deep-blue halo corona on black void. Reads like a glowing artefact in space.
What worked: the dive cycle's "far" phase makes the figure small in frame; the halo glow I added (exp(-minDist*4.5)*0.6) renders as cyan halo around the gold; Lava palette gives warm body that contrasts the cool halo. Audio-driven power (~10 from bass=0.69) creates tightly-detailed surface bumps.
Design hypothesis: **(palette-warm body × halo-cool atmosphere) is a powerful contrast formula. Worth using for many fractal shaders — pick palette body, use complement-hue for atmospheric halo.**

### 2026-05-02 — "Iridescent Dive" — near phase + Iridescent palette + cathedral scale
Track: *Pressure*.
Audio: bass=0.50, treb=0.36, mids=0.69, centroid=0.48, entropy=0.64.
Composition: figure fills entire frame; intricate cyan/blue ridges with deep crimson valleys; mandala/oculus motif at center; full 3D depth.
Why: dive cycle pushed camera close to surface, look-target drifted to bring central feature into focus, Iridescent palette + crimson AO crevices = Hagia Sophia-meets-deep-sea-coral.
Design hypothesis: **The dive cycle's bottom-of-arc (~30s of close-up viewing every 2 min) is THE money shot. Worth lengthening that hold time if user enjoys it.**

### 2026-05-02 — "Mint Mandorla" — dive close-up + Sunset/Biolum border palette
Track: *Pressure*, mic input.
Audio: bass=0.36, mids=0.82 (high), centroid=0.19 (low), entropy=0.58, pitch=0.00.
Composition: dive close-up with a striking pale-mint mandala "eye" centered against deep crimson/magenta carved tendrils on deep blue halo. Reads like a fractal cathedral oculus.
Why it worked: pitch=0 + slow time put pal_t at the Sunset/Biolum border, mixing warm magenta tendrils with cooler mint center. Adaptive iters (12 in dive) gave sharper detail in the mandala. Slowed rotation kept the eye stable.
Design hypothesis: **Palette borders (between two named schemes) often produce the most striking compositions because two complementary hues coexist on the same fractal.**

### 2026-05-02 — "Internal Rotation" win
Removing camera orbit but adding fractal-internal rotation kept the figure centered while sliding fractal detail across the surface. Per user feedback "less spinny" but "still spinning"  — internal rotation reads as the SHAPE evolving rather than the camera flying around. Crucial distinction.

## Todo
- [ ] Consider widening dive hold time (currently smoothstep 0.5..0.7 of cycle = ~24s; could be 40s if dive is the money shot)
- [ ] Add a bonus motif at the bottom of dives — e.g. brief chromatic aberration when ray-skim is highest, signalling intimate close-up moment
- [ ] knob_5 = halo intensity (currently fixed at 0.6) so user can dim atmosphere if they want pure black void

## History of changes
- iter 1: fixed hit-detection bug (misses no longer color as hits → BG goes black).
- iter 2: full audio-reactive layer (bass→power, treble→light, pitch→hue, etc.) + @fullscreen: true.
- iter 3: 3D shading via tetrahedral finite-difference normals + 3-point lighting + rim.
- iter 4: knob_1 (zoom) + knob_3 (hue offset) added.
- iter 5: knob_2 (power offset) + knob_4 (light angle) added.
- iter 6: removed camera orbit per "less spinny", added internal fractal rotation, removed full-surface bass flash kept rim glow + beat pulse, slowed hue cycle.
- iter 7: rewrote color system as Inigo Quilez cosine palettes (5 schemes) + soft 2-tap AO. Replaces noisy HSL.
- iter 8: hour-long camera journey — 120s dive cycle, irrational-frequency drift, look-target drifts during dives.
- iter 9: halo glow on grazing rays gives atmospheric corona.

## Forks
None yet.

## Design hypotheses for v(next)
- The IQ cosine palette pattern (5 hand-picked schemes, time-rotated, audio-tilted) is durable and should be ported to other shaders.
- Internal-rotation + fixed-camera reads as "alive but anchored" — better than camera orbit for compositions where the figure should stay centered.
- Long-form camera journey (irrational drift + smooth dive cycle) makes a single-fractal shader watchable for an hour. Pattern worth reusing for any 3D shader that's tempting to "set and forget".
