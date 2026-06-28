# Advanced Shader Techniques

Hard-won techniques for shaders that feel **musical, alive, and intentional** — and the specific
failure modes that make them feel cheap. This complements:

- [debugging-twitchy-shaders.md](debugging-twitchy-shaders.md) — fixing jitter/strobe (the basics of smoothing).
- [unique-feature-guide.md](unique-feature-guide.md) — picking decorrelated audio features.
- [MAKING_A_NEW_SHADER.md](MAKING_A_NEW_SHADER.md) — uniforms, color spaces, basic ChromaDepth mapping.

Reference shaders to study: `redaphid/iris/1.frag` (+ `controllers/wavelet-ease.js`),
`redaphid/chromadepth-lattice/*.frag`, `tesla/chromadepth/*.frag`.

---

## 1. Signal conditioning — the iris/1 discipline

The difference between "twitchy" and "musical" is almost entirely *what signal you feed in* and *how
motion is integrated*. Rules, in priority order:

- **Smoothed features for anything continuous.** Raw `*ZScore`/`*Normalized` jump 0.12–0.17 per
  frame. Use the `wavelet-ease` controller's spring-smoothed `*Spring` uniforms and EMA-smoothed
  `spectralCrestSmooth`/`spectralRoughnessSmooth`. Raw is only for *tiny local transients* (a single
  glint, a kick-zoom that springs back) — never for whole-frame color/brightness/geometry.
- **Motion = monotonic phase accumulators, never `iTime*rate`.** `iTime*rate` jumps the angle by
  `iTime*Δrate` whenever the rate changes, and that jump *grows with iTime* → the spin appears to
  accelerate over a set. Use the controller's `spinPhase/morphPhase/flowPhase/huePhase` (integrated
  `phase += rate*dt`). The shader reads them as monotonic clocks.
- **Audio modulates RATE / SHAPE, never the ANGLE.** Adding audio to a rotation angle makes it *rock
  backward* when the feature falls. Modulate the spin *rate*, or shear/scale the *shape* instead.
- **`quietGate` everything.** Multiply every audio offset by `quietGate` (0 in silence → 1 loud) so
  a quiet room's mic noise (which blows up Normalized/z-score ranges) can't drive motion.
- **Coherent feature→region families.** Drive related parts with related features:
  PITCH (`melodyFlow`, centroid) → **color**; LEVEL (bass/mids/treble/energy) → **size/depth**;
  TEXTURE (crest/roughness/flux) → **detail/sparkle**; SHAPE (spread/rolloff/skew/kurtosis) →
  **spacing/reach**.

## 2. Discontinuity engineering — the "occasional sudden jump/snap"

Beyond per-frame jitter, these *structural* discontinuities cause occasional snaps:

- **`fract()` wrap on a traveling wave.** A wave positioned by `fract(phase)` *teleports* when phase
  wraps 1→0. Fix: **window it** so its amplitude is zero at the seam — multiply by `sin(phase*PI)`
  (or a smoothstep that hits 0 at both ends). The wrap becomes invisible.
- **Transients injected into a phase.** Adding a raw kick/z-score *into* a phase jumps the position
  non-monotonically (a "shiver"). Scale the **amplitude** with the transient, never the phase.
- **Discrete-band hue popping.** Compositing N layers each painted one discrete hue: when animation
  flips which layer dominates, the hue jumps a whole band. Either keep front-most discrete (sharp —
  see ChromaDepth) or map a **continuous** field (for non-depth-locked color).
- **Hashed seed re-rolls.** A seed that hard-jumps (e.g. on a drop) cuts the structure. Only re-roll
  on rare events, and/or crossfade.

## 3. ChromaDepth — making it POP without breaking the 3D

Basic red→violet mapping is in MAKING_A_NEW_SHADER. The advanced part:

- **Make it pop:** (a) color from **front-to-back** ray/structure distance so the nearest thing is
  red and it recedes to violet; (b) a **hot red fresnel rim** on silhouettes (throws the edge toward
  you); (c) a **blue inner-depth** where surfaces face you (you "see into" it) → real near/far
  volume. See `tesla/chromadepth/diamond.frag`.
- **HUE MUST STAY LOCKED TO DEPTH.** Every kind of variation — per-area, per-device (seeds), audio,
  evolution — must touch **structure / brightness / warp / depth-distribution**, *never rotate the
  hue*, or `red=near` breaks. (This is the one place ChromaDepth diverges from iris, which rotates
  hue freely for art.)
- **Do NOT average depth across layers.** Coverage- or occlusion-weighted averaging pulls everything
  to the middle of the gradient → green/pastel **mush**, killing the pop. Use **discrete front-most**
  compositing for the full, sharp red→violet range. (Averaging is acceptable *only* for a free,
  non-depth-locked palette.)
- Keep saturation high, lightness bounded (no white-out), background dark/violet so it floats.

## 4. Brightness for a dark room / a phone at night

To read from across a room: **high-lightness neon palette + a LIT background field** (no black
voids — the whole screen emits light) + a **glow lift** (gamma-up ~0.8 then a ~1.15 gain) + **minimal
vignette**. Tradeoff: brightness vs saturation — pushing L and bloom too far desaturates to pastel,
so keep the *loud-section* bloom gentle and let color stay saturated.

## 5. Bass you can feel

A kick should move the *whole frame*: a smooth swell (spring) for the build + a snappy thump
(raw `waveletBassZScore`/`wavelet_bassHit`) on the hit, both decaying. A "subwoofer-cone"
**dilation/zoom-in punch that springs back** reads as the bass hitting you. Smooth for the swell, raw
only for the transient — and the transient drives *amplitude/zoom*, not a phase.

## 6. Navigation & touch — drag/pinch to explore a world

- **Pan needs STATE → a controller.** A stateless shader can only do an absolute touch→position map,
  which snaps to the finger and resets. A controller (see `controllers/lattice-nav.js`) accumulates
  `navX/navY` from drag *deltas* (+ `navZoom` from pinch), with momentum, so it never snaps back.
- **Match pan-speed units.** `screens-per-swipe = SPEED / (shader's view-window in the same units)`.
  If the shader samples a `0.07`-wide window and the controller adds `1.0` per swipe, that's ~14
  screens/swipe (wildly fast). Set `SPEED ≈ window` (~0.07 → 1 screen/swipe). Divide drag by zoom so
  it stays screen-consistent at any zoom. Expose it as a knob.
- **Per-AREA rotation inverts the pan axis.** Varying the lattice's *rotation* by world position
  makes "drag right" move content *left* in regions rotated ~180°. Vary cell **size/color** by
  position instead. Also avoid a whole-field *time* rotation — it slowly drifts the pan axis too.
- **Kill the "constantly panning" feel.** Separate **idle geographic motion** (translation/rotation
  drift) from **in-place reactivity**. For a stable, explorable world, remove the idle drift/churn
  and let life come from color/breathing/pulse that *don't translate the geography*.

## 7. Breaking tiling — a hard problem (what didn't work)

Periodic folds (mirror-fold / `fract`) **tile** when you zoom out. The obvious fix — a large-scale,
low-frequency, incommensurate **domain warp** + per-region cell-size variation — **was tried on
`chromadepth-lattice/6` and did not satisfy** (reverted). Honest takeaways:

- A **bounded** warp only *softens* the tiling; it doesn't remove it. The warp is itself
  periodic/finite, and the underlying fold is still `fract`-periodic, so deep zoom-out still reveals
  repetition — now smeared, which can read as **mushy** rather than varied.
- A bigger warp distorts cells into melt and, past a Jacobian of ~1, **folds back on itself** (which
  also reverses local pan direction).
- **If you genuinely need non-repeating terrain, change the base**, don't paper over a periodic one:
  use a non-periodic field (value/FBM noise) as the structure, or accept the tiling as a *feature*
  (kaleidoscopic symmetry) and add variety through **color / lighting / landmarks** instead of
  geometry. The per-area `regionHue` color drift and world-space landmarks (§9) carry "every area is
  different" far more convincingly than warping the geometry did.

(Slow audio features — the `*Mean` history-averages and `wavelet-ease`'s `evoFlow/evoWarp/evoPlasma`
drifters — are still a great *randomness source* for evolving variety without jitter; that part
wasn't the problem. They're just better spent on color/landmarks than on a warp that fights a
periodic fold.)

## 8. Per-device uniqueness — `seed` / `seed2` / `seed3` / `seed4`

Four random floats generated **once per device** and persisted in `localStorage` (auto-declared
uniforms). Seed the **palette** (base hue, saturation) *and* the **structure** (rotation/twist, the
"region map" phase, warp phase) so every phone shows a one-of-a-kind variant. A URL `seed=` overrides
them (pin a specific look for presets/NFC tags). `wooli/chromadepth-*` use `seed2` for palette bias.

## 9. Spatial landmarks & paths — give an explorable world somewhere to go

- **A path that reads against ANY palette: invert the color** (`1.0 - col`) along a winding corridor.
  Inversion is always high-contrast, and since it inverts the *structure* it appears to follow the
  lattice. Gate it to where structure is bright (`onStruct = high lum`) so it traces the lines.
- **Landmarks as world-space features** (a function of world position → stable places you can return
  to, unique per device via a seed-hash). Add a **far halo** so you can see one coming and navigate
  toward it.

## 10. Verification workflow — how to actually check this

- **Screenshot every iteration** (headless Chromium / Playwright vs the dev server). Reactivity bugs
  (no red, washed pastel, banding) jump out of a *still*; motion bugs do not — so also...
- **A/B audio-reactive states by injecting features** — there's no mic in headless:
  ```js
  await page.evaluate(f => Object.assign(window.cranes.manualFeatures, f),
    { quietGate: 1, energySpring: 0.6, waveletBassSpring: 0.9, melodyFlow: 0.7 })
  ```
  Capture a "rest" frame vs a "kick/loud" frame to see the reactivity.
- **Test touch/knob controllers** by driving real pointer/touch events (`page.mouse` / touch) and
  reading back `window.cranes.manualFeatures` / `window.cranes.controllerFeatures`.
- **Deterministic stills:** `?time=<seconds>` holds `iTime` (pair with `?noaudio=true`). Note that
  controller phases still advance in real time even when `time=` is held.
- **Validate before committing:** `node scripts/validate-shader.js <path>` (GLSL compile + warnings).
  Watch for reserved-word collisions (e.g. `patch` is reserved) and duplicate-uniform redefinitions.
