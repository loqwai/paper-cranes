Iter 16. Added roughness-driven film grain in dark areas — atmospheric grit on dissonant/rough moments. Pure darkwave aesthetic.

## Cool moments
- **iter 10** — `entropy 0.87 + flux 0.50 + energy 0.61` (dynamic moment): hueAng with `length(uv)*5 + atan*1.5 + lum*6` produces deep purples (124,10,57), midnight blues (5,7,86), forest greens simultaneously across the carpet. Entropy kick boosts chroma so high-chaos moments pop. Oklab keeps it perceptually flat — no harsh transitions even with 3-channel hue spread.
  - Design hypothesis: position-domain hue spread (multiple terms, generously scaled) is essential for oklab — single time-only hue gives mono regions because at any frame the whole screen lands on one cos/sin axis.

## Knob map
- `knob_1` — X pan (uv.x offset, centered at 0.5, range ±1.0)
- `knob_2` — Y pan (uv.y offset, centered at 0.5, range ±1.0)
- `knob_3` — zoom (centered at 0.5; exp scale, ±3 stops in/out, applied before pan)
- `knob_4` — palette hue offset (0..1 wraps full hue circle)
- `knob_5` — rotation speed (0=still, 0.5=normal, 1=2x)

## Knob map
- `knob_1` — X pan (uv.x offset, centered at 0.5, range ±1.0)
- `knob_2` — Y pan (uv.y offset, centered at 0.5, range ±1.0)
- `knob_3` — zoom (centered at 0.5; exp scale, ±3 stops in/out, applied before pan)

## Cool moments
(none yet)

## Todo
- [ ] keep reactivity dialed WAY down — user explicitly asked for less
- [ ] watch for any future "more X" requests before adding any new audio mappings

## History of changes
- Iter 16 (2026-05-02): Added FILM GRAIN. Hash noise `fract(sin(dot(seed, vec2(12.9898,78.233)))*43758.5453) - 0.5` with seed `fragCoord + vec2(time*97.13, time*47.7)` (per-pixel + per-frame). Intensity = `roughness * darkness * 0.10` so grain is loudest in dark areas (where it reads cinematically) and on dissonant moments. Hits the unused spectralRoughness signal.
  - Design hypothesis: every darkwave shader needs grain. Without it the smooth oklab gradients look digital; with it they look like film.
- Iter 15 (2026-05-02): Added BREATHING RADIAL MIST. Soft additive halo `breath * voidness * mistRadial * 0.10` where `breath = sin(time*0.4)*0.5+0.5`, `voidness = 1 - bassNormalized`, `mistRadial = 1 - smoothstep(0,0.7,length(fc-0.5))`. **Inverse-coupled** to bass: fills the void when audio is quiet (bass<0.2), fades to nothing when bass kicks. Tinted with current oklab hue family + 1.5 rad offset (complement). Pure darkwave atmospheric for silent/breath sections.
  - Design hypothesis: inverse-coupled effects are essential for darkwave — most reactive shaders only respond to *more* signal. The void itself needs animation.
- Iter 14 (2026-05-02): Added `pitchClassNormalized*1.6` term to oklab hueAng. Each note (1/12 step) now shifts the global palette by ~0.13 rad → traveling color regions tied to melody. Independent from time + position terms — adds a melodic signal layer that wasn't audio-driven before.
- Iter 13 (2026-05-02): Added CENTROID-DRIVEN RADIAL TWIST. `twistAmt = (centroid-0.3) * (0.5 + mids*1.2)`, applied as `rotate(uv, twistAmt * smoothstep(0,0.6,radius))`. Smoothstep means center stays unrotated, edges twist most → spiraling-vortex feel on bright/vocal moments. Hits a feature pair we hadn't used (centroid + mids).
  - **Compile-fail learned**: `r` was redefined — chromatic-aberration block already declares `float r` for the red channel. Renamed to `radius`. Lesson: when adding new locals to mainImage, grep for collisions first.
- Iter 12 (2026-05-02): Added CHROMATIC ABERRATION on the echo trail. Trigger: `trebleZScore > 0` spikes. Sample prevFrame three times — R offset radially outward by `max(trebleZ,0)*0.012 + treble*0.003`, G centered, B inward by same. Direction is `normalize(fc - 0.5)` so split is radial. On hi-freq hits, echo trail tears into RGB ghosts.
  - Triggered by audio fingerprint observed at iter 12: `trebleZScore=1.0` while bass/mid/energy=0 — a pure treble anomaly (hiss/chirp). Perfect glitch trigger.
- Iter 11 (2026-05-02): Added FRAME FEEDBACK ECHO TRAIL. Sample `prevFrame` at slightly contracted UV `(fc-0.5)*(0.985 - bass*0.012) + 0.5` → ghost trails bloom outward from center as motion happens. Bass amplifies brightness. **Used `max(rgb, echo)` instead of mix** to prevent runaway feedback (each frame the trail dims, but bright current pixels override). Verified: max lum stays ~43 (no blowout) while showing echo bands.
  - Design hypothesis: max-blend feedback is safer than mix-blend for darkwave — keeps trails bright + visible without ever going white.
- Iter 10 (2026-05-02): Multi-hue spread fix. After darkwave pivot, screen was monochromatic (single oklab axis dominated). Boosted hueAng position terms: `length(uv)*2.5→5.0`, `atan*0.8→1.5`, `lum*3.0→6.0`, `mids*1.4→2.0`. Lowered base chroma `0.18→0.11` and treble factor `0.10→0.08` to keep oklab in-gamut. Now R, G, B channels all show simultaneously. Entropy kick (smoothstep 0.5→0.9) gives chaos-moments a chroma boost.
- Iter 9 (2026-05-02): **Darkwave/oklab pivot.** User: "more reactive, continuous complexity, this is darkwave music, use oklab". Changes:
  - Loop iters: `8` → `6 + int(energyNormalized*4 + spectralFluxZScore*2)` (continuous, not on-beat)
  - warp_scale: `4.0 + energyNormalized*1.5` → `3 + energy*4 + flux*2 + entropy*3` (multi-feature continuous)
  - Beat punch: `1.05` → `1.18`
  - Color: HSL → **oklab**. Hue from `time*0.06 + length(uv)*0.7 + mids*1.4 + knob_4*2π`. Chroma `0.16 + treble*0.10 + entropy*0.08 + bass*0.06`. L `0.28 + bassZ*0.18 + lum*0.30 + energy*0.08`, capped 0.12-0.70 for darkwave moodiness.
  - Removed `/2.` darkening on fragColor (palette already controls L).
  - Knob_4 now offsets oklab hue angle in radians (was wrapping HSL).
- Iter 8 (2026-05-02): Wired `knob_6`→fractal scale (1.2..2.0). Required hoisting `const float scale=1.5;` to non-const + assigning in mainImage from knob_6.
- Iter 7 (2026-05-02): Wired `knob_5`→rotation speed. Was fixed `time*.1`; now `time*.1*(knob_5*2.0)`. User can stop the rotation entirely (knob_5=0) for a still navigation, or speed it up for swirl.
- Iter 6 (2026-05-02): Wired `knob_4`→palette hue offset. Added directly into the `fract(...)` hue formula so it wraps cleanly. User-controlled palette without touching reactivity.
- Iter 5 (2026-05-02): User flag "It's black and white now". Diagnosis: dialing reactivity down made `col1` from fractal converge to grey; `rgb2hsl(grey)` gives `y=0` and undefined hue, so setting `y=0.85` did nothing. Fix: synthesize hue from `fract(time*0.02 + length(uv)*0.5)` and lift lightness floor `hsl.z = 0.45 + hsl.z*0.4`. Color now independent of fractal saturation. Verified via `gl.readPixels` — sat range 0→97.
- Iter 4 (2026-05-02): Wired `knob_3`→zoom. `exp((knob_3-0.5)*3.0)` then `uv /= zoom`. Applied before pan so user pans through zoomed view. User had pegged pan knobs to corners → gave them depth too.
- Iter 3 (2026-05-02): Wired `knob_1`→X pan, `knob_2`→Y pan. Both centered at 0.5, range ±1.0. Applied AFTER rotate so panning navigates through the rotated fractal space.
- Iter 2 (2026-05-02): Added autonomous hue drift `hsl.x += time*0.01`. Replaces a commented-out energy-based hue shift. Gives motion without reactivity.
- Iter 1 (2026-05-02): User flagged shader as too reactive. Pulled four aggressive mappings:
  - Loop iters: `8 + int(energyMean*10.)` → constant `8`. Was scaling fractal depth with energy → huge visual swings.
  - `warp_scale`: `16.*energyMean*2.` → `4.0 + energyNormalized * 1.5`. Was reaching 32x at full energy.
  - Beat punch: `c1*=1.5` → `c1*=1.05`. Beat used to slam the brightness; now it's a whisper.
  - Saturation: `mix(hsl.y,1.,energyNormalized)` → `mix(hsl.y,0.85,energyNormalized*0.25)`. Was pinning to full saturation on loud audio.

## Forks
(none)

## Design hypotheses for v(next)
- Reactivity ceiling matters more than raw mapping correctness. A "calm carpet" is a coherent aesthetic — depth and warp held constant, only color/saturation gently breathe.
