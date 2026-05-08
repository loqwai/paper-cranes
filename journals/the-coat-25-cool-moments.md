# the-coat-25 — Session Journal

## Status
**RUN COMPLETE — 60/60 ticks, full angelic→fried evolution.** Mid-run user requested in-code morph between coat figure and mandelbulb fractal — built `the-coat-mandelbulb-morph.frag` that crossfades both renders via knob_19 (auto-cycles every 60s). Final composition: fractal-mandala-altar with max AURA rings, eye beams, and dense red-on-emerald mandelbulb embedded in figure silhouette.

## Forks
- `the-coat-25 ← the-coat-24` (fork tick): checkpointed all the multi-mode-knobs, audio-override layer, FRY, INNER GLOW, tonemap.

## Cool moments

### 2026-05-02 — Iter 60/60 — "Fractal-Mandala-Altar Finale"
Track: *Pressure (GENESI, Laherte)*, mic.
Knobs: ALL fried preset locked (AURA 1.00, FRY 1.00, FEEDBACK 1.00, EYE WASH 1.00). Morph cycling auto.
Composition: dense red-on-emerald mandelbulb (max FRY rotates the IQ palette to crimson on green) suspended inside the egg figure silhouette, MASSIVE olive AURA rings filling the entire frame, magenta eye-beam crosses, FRY-saturated pink-purple chromatic rim around body. The egg is cracking open into the fractal.
Why it worked: every effect at maximum but the morph shader keeps them legible — figure silhouette gates where the fractal shows. Without the morph the fractal would just be standalone; without the egg-mask it'd be a wall of effects.
Design hypothesis: **maximalist presets work when there's a strong silhouette to organize the chaos. The morph shader's `fig` mask served that role even at full FRY/AURA — the eye reads "figure with fractal inside" not "soup". Lesson: any future chaos-mode shader needs a structural frame.**

### 2026-05-02 — Iter 48/60 — "Mandala Altar" (on `the-coat-mandelbulb-morph`)
Track: *Pressure (GENESI, Laherte)* — mic input.
Knobs: AURA 0.85, FRY 0.80, FEEDBACK 0.85, EYE WASH ~0.80. Morph phase 0.96 (deep into mandelbulb side).
Composition: Egg-shaped figure silhouette dead-center with FRY gold/cyan body, scalloped cyan halo at head, eye-beam crosses, BUT massive concentric yellow AURA rings radiate across the entire frame, with mandelbulb fractal texture faintly visible behind. Reads as "figure-as-mandala-altar" — the morph captured the figure on the way to dissolving into pure geometry.
Why it worked: AURA at 0.85 + audio-side frame is mandelbulb-dominant (m=0.96) but the smoothstep-mixed coat-essence at low alpha still bleeds through. Combined: foreground figure read + background fractal symmetry + ring radiance.
Design hypothesis: **The morph shader is most striking near the extremes (m > 0.9 or m < 0.1) where one layer dominates but the other still ghosts in. The middle (0.4-0.6) is muddier. Worth biasing the morph curve to spend more time near extremes.**

### 2026-05-02 — Iter 30/60 — "Midpoint Drift"
Track: *Pressure (GENESI, Laherte)* — mic input.
Knobs: AURA 0.63, EYE WASH 0.57, FEEDBACK 0.65, FRY 0.50, NEBULA 0.38, audioBlend 0.40.
Composition: Renaissance figure with amber-gold scalloped halo (hue rotated from magenta), iridescent teal-mint body, lavender-pink chromatic rim, olive-green AURA waves through the void. Star-speckled background.
Why it worked: at exactly the 50% lerp point the FRY hue-cycle has rotated all halo/rim/AURA hues by ~180° from the angelic preset, but FEEDBACK is only at 0.65 so the figure still reads as a discrete silhouette rather than a smear. The composition is most "painterly" right here.
Design hypothesis: **the lerp halfway-point is the sweet spot for a long evolution — full hue rotation has happened but feedback hasn't taken over yet. Worth dwelling here longer in future sessions, or making the lerp non-linear (sigmoid) to expand the midpoint.**

### 2026-05-02 — Iter 29/60 — "Eye-Beam Awakening"
Track: *Pressure*, mic.
Knobs: AURA 0.61, EYE WASH 0.56, FRY 0.48.
Composition: pink/violet eye beams sweeping out from sockets through a magenta scalloped halo. Body has chrome-mint chromatic rim, soft grey interior.
Why it worked: EYE WASH crossing 0.5 entered "bloom mode" (mid tier of multi-mode), making the beams look intentional rather than glitchy. Pairing with the still-pink halo gave a "lit from within" feel.
Design hypothesis: **EYE WASH at 0.5-0.65 is the most "intentional" reading — past 0.85 it goes full sweeping and becomes a separate motif from the figure.**

## Todo
- [ ] Consider non-linear lerp (sigmoid centered at 0.5) so the painterly midpoint lasts longer
- [ ] Try a "fried→angelic" return trip after this run completes — see if descending feels different
- [ ] knob_15 (zoom) currently lerps from 0.45 → 0.30 (zooming IN over time); could invert so figure pulls back as it gets fried (more "consumed by chaos" reading)

## History of changes
- (Inherited from the-coat-24) all features, including: AURA k1, PRISM k2, GOD RAYS+PAL k3, DRIP k4, PAL WARP k5, INKY VOID k6, FEEDBACK k7, DOOM RED k8, FUR k9, EYE WASH k10, NEBULA k12, FRY k55, INNER GLOW k56.
- (At fork) Forced full-knob mode replaced with proper audio↔knob blend via knob_18: `_bass = mix(bass, knob_20, knob_18)` etc.

## Design hypotheses for v(next)
- The "angelic→fried" 60-min evolution is a durable vibej pattern. Worth packaging as a reusable mode (`moveStyle: "evolve"` with named preset pairs).
- knob_18 audio blend at 0.4 is a good default — preserves manual control while letting beat read through.
- FRY hue-cycle at 0.5 produces complete palette rotation with no chaos — best "painterly" reading is mid-FRY.
