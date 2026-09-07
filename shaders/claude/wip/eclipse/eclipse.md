# eclipse — "Totality"

Live link (everything needed in one URL):

```
https://visuals.beadfamous.com/?shader=claude/wip/eclipse/3&controller=wavelet-ease&wavelet=true&fullscreen=true
```

The shipped shader is **`3.frag`**. Iterations 1 and 2 were deleted once 3 was the only good one —
the numbering is deliberately left alone so the live URL above keeps working. A lone `3.frag`
looks odd; a dead link in someone's hand mid-set is worse.

## Visual intent

A total solar eclipse. A small black-cored disc with everything happening around it: corona
streamers, Baily's beads, a diamond ring, crimson prominences, shock rings, a turbulent nebula,
and stars that come out in the dark. Built to read instantly from across a dark room — the
silhouette does the work, so there is nothing to explain.

The **dynamic range is the piece**: a quiet passage collapses the corona to a pearly rim and the
stars come out; a drop erupts it into long chromatic spikes that reach the corners of the frame.
Quiet genuinely looks quiet — but it never looks *frozen*, which is the distinction that took
three iterations to get right.

## Audio mapping

Requires `?controller=wavelet-ease&wavelet=true`. Feature families are kept coherent
(docs/advanced-shader-techniques.md §1):

| Region | Family | Features |
|---|---|---|
| Corona reach (ray length + halo size) | LEVEL | `waveletBassSpring`, `energySpring`, `waveletBand4Spring` |
| Corona hue journey | PITCH | `melodyFlow`, `waveletCentroidSpring` |
| Streamer filaments / sharpness | TEXTURE | `spectralRoughnessSmooth`, `wubDepth` |
| Radial depth banding | LEVEL, by depth | `bandForDepth()` — treble at the limb, mids mid, bass far |
| Prominences | MIDS | `waveletBand2Spring` |
| Baily's beads | TEXTURE + transient | `waveletBand5Spring`, `spectralCrestSmooth`, raw bass hit |
| Diamond ring flare | transient + swell | `waveletBassZScore`, `wavelet_bassHit`, `energySpring` |
| Stars, totality darkness | gate | `quietGate` (inverted) |
| Palette family shift | structure | `sectionMode` / `sectionMix` (breakdown→drop detector) |
| Long-set drift | evolution | `evoWarp`, `evoPlasma` (streamer count + writhe character) |

### Signal discipline

- Every continuous quantity reads a spring-smoothed `*Spring` uniform, never a raw z-score.
- Raw transients (`waveletBassZScore`, `wavelet_bassHit`) drive **amplitude and scale only** — the
  bead pop, the diamond flare, the dilation punch, the ring blaze. They never touch a phase or an
  angle, so nothing shivers or rocks backwards as they decay.
- Every motion is `iTime * k + <monotonicPhase> * m`: a **constant-rate floor** plus an audio-fed
  monotonic accumulator. See "the rule, corrected" below — this is the point the first two
  iterations got wrong.
- Every audio offset is multiplied by `quietGate`.
- The streamer field is sampled on the **unit direction vector**, so it is seamless around the
  circle — no `atan` branch cut, and no `fract()` wrap to window away.

## The lesson: a still frame cannot validate a motion piece

The first version **failed in front of a live audience**. The verdict: *"It's almost all that
black circle with almost no movement. Terrible."* It had been reviewed from rendered stills, and
in a still, a black disc filling the middle of the frame reads as a dramatic eclipse. In motion it
reads as a dead black hole with a shimmer.

Two independent causes, both invisible in a screenshot:

1. **A huge motionless region.** `R = 0.208` in uv units is 42% of the half-height — the disc and
   its immediate surround were ~29% of the frame at pure black.
2. **Everything animated rode the controller's phases at their BASE rate.** `wavelet-ease`
   advances `flowPhase` at 0.06/s and `spinPhase` at 0.02/s. The shader then scaled them DOWN —
   `flowPhase * 0.42` is 0.025 noise-units per second, and `spinPhase * 0.55` gave the diamond
   ring **one revolution every nine minutes**. The discipline "all motion comes from monotonic
   accumulators, never `iTime`" was followed to the letter and produced a still image.

### The rule that caused it, corrected

The real rule is *never put audio into a phase or an angle* — because `iTime * <changing rate>`
jumps the accumulated angle by `iTime * Δrate` whenever the rate changes, and that jump grows
without bound. **A constant rate has no Δrate, so `iTime * k` is perfectly safe**, and it is the
only thing that guarantees motion when the room is silent and every audio term is zero. Use both:

```glsl
float spin  = iTime * 0.130 + spinPhase  * 2.2;   // constant floor + audio speeds it up
float flow  = iTime * 0.560 + flowPhase  * 3.2;
float churn = iTime * 0.230 + morphPhase * 2.6;
```

At `quietGate` 0 the frame still rotates, scrolls, ripples and drifts. Silence looks CALM, not
FROZEN.

### Measured

`scripts/motion-check.mjs` renders N frames ~90ms apart at a fixed audio level and reports the
mean absolute per-pixel delta between **consecutive** frames, then the delta **between** audio
levels. It also reports `deadFrac`, the fraction of pixels below luma 12.

| | frame-to-frame (quiet) | frame-to-frame (loud) | quiet vs loud | dead pixels |
|---|---|---|---|---|
| first version | **0.17** | 0.36 | 55.7 | 28.8% |
| after the motion rebuild | **7.60** | 20.08 | 68.1 | 1.7% |

0.17/255 is a still image. That number is the whole bug. Rough reading of the frame-to-frame
number: `<1` dead, `2-6` gentle but unmistakable, `>8` energetic.

**Keep a known-bad control.** A motion metric nobody has watched go red is not evidence; the
first version scoring 0.17 is what proves the harness measures anything at all. If you change the
harness, re-derive a red result before trusting a green one.

## The white-out, twice

**Cause 1 — one reach driving everything.** A single corona `reach` feeding both the halo and the
rays meant a loud section flooded the whole frame to pure white. Split into a tight `glowReach`
(halo hugging the limb) and a long `rayReach` (spikes), and hard-separate the streamers with
`smoothstep(lo, 0.90, n1)` so the sky **between** rays stays dark. A drop then reads as long
spikes against night, not as a sheet.

**Cause 2 — a hard clamp.** Corona lightness started near 1.0 and a hard `clamp()` drove every
over-1 channel to the same value, so bright meant white. Palette lightness dropped to ≈0.6 and the
clamp became an exponential exposure tone-map (`1 - exp(-col * k)`), which compresses each channel
smoothly — a blazing ray stays gold/cyan/violet.

**Cause 3 — additive layers sum towards white.** After the motion rebuild the shader hit **mean
luma 212/255** on a sustained kick: a white sheet again, from half a dozen additive layers of
different hue summing towards white, with the exposure curve then flattening what little chroma
survived. Trimming amplitudes got luma to 154 but left a milky grey fog. What actually restored
the colour is a post-tone-map chroma extrapolation:

```glsl
float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
col = clamp(mix(vec3(lum), col, 1.38), 0.0, 1.0);   // mix factor > 1 pushes AWAY from grey
```

A drop now reads as violent magenta/gold rather than as brightness. Amplitudes stay deliberately
restrained because every layer stacks into the same exposure.

## Measuring the occluder, and two ways to get it wrong

Shrinking the disc was only half the fix — the second version left the disc's **interior dark**,
so it still read as a hole with a rim rather than a body in a sky. Measuring the silhouette
honestly is what settled it.

**Wrong way 1 — centroid of dark pixels.** Works only while the disc dominates the dark mass. In
a quiet passage the sky is dark too, so the centroid lands on an average of scattered background
and the ray-cast measures a radius of *zero* while a disc is plainly on screen.

**Wrong way 2 — largest connected dark blob.** Also confounded by the sky: on a quiet frame it
returns a blob with a bounding box 99.8% of frame width, centroid at y=0.79. That is the
background, not the moon.

**What actually worked** was tying the pixels back to the geometry. `uv.y` spans exactly 1.0 over
the frame height, so the disc's height fraction is exactly `2R` — and on a *loud* frame, where the
corona isolates the silhouette, the measured bounding box confirms it:

| | `R` | predicted `2R` | measured bbox height |
|---|---|---|---|
| first version | 0.208 | 41.6% | **41.7%** |

Prediction and measurement agree to 0.1%, which is what licenses using `2R` for the rest:
**41.6% of frame height → 16.4% → 14.0% shipped** (`R = 0.070`). `scripts/measure-disc.mjs` does
this.

### Near-black pixels, the number that answers the complaint

Fraction of the frame below luma 12 (reads as pure black on a phone in a dark room):

| | quiet | loud |
|---|---|---|
| first version | **28.8%** | **24.7%** |
| motion rebuild | 1.7% | 0.4% |
| **shipped** | **0.3%** | **0.0%** |

At loud, a quarter of the first version's frame was pure black — that is the disc, and that is the
complaint.

### The threshold trap

`deadFrac` uses an absolute cutoff (luma < 12). A silhouette lifted to luma 13 scores as "not
dead" while still reading as a black hole. It was not gamed here — the drop from 28.8% to 1.7% was
real, and `frac25`/`frac45` move the same way — but a single absolute threshold is one lucky
constant away from being meaningless. Report several thresholds, and measure the silhouette's
*size* independently.

## What the shipped shader does

- **Core `R = 0.070`** — 14% of frame height — with the disc floor lifted (mask `0.82 + 0.18`). A
  churning ember plasma burns *inside* it, added **after** the moon mask or the mask crushes it:
  dark at the very centre so it still reads as an eclipse, white-hot against the limb. It reaches
  well in (`pow(ir, 1.05)`, threshold 0.20) and burns bright, so the core is a body, not a hole.
- **The core drifts** on a slow constant-rate Lissajous, so the composition is never anchored.
- **Background nebula** — 2-octave turbulence over the whole frame (0.245 base), parallaxing
  against the drifting core. This is what guarantees no motionless region at any audio level.
- **Shock rings** travelling outward at a constant rate, brightness detonating on the transient
  (amplitude only — a hit never moves a ring, only lights it).
- **Corona reaches the corners** on a drop: `rayReach` 0.26 quiet, climbing well past the portrait
  frame radius of ≈0.57 when loud. Base `rayAmp` 0.74, with the audio-scaled terms trimmed to
  compensate so loud does not blow out again.
- **Beat punch**: 11.5% whole-frame scale + exposure flash + hue kick + ring blaze + diamond
  supernova, all on the same transient. Obvious from across a dark room.

## The square grid — two lattices, and how to prove one is gone

Reported from a big screen: *"The eclipse itself has a square grid that is visible moving around
over time."* Real, and there were **two independent lattices**, in different layers. Isolating each
layer and rendering it alone is what separated them; editing everything at once would have fixed
one and hidden the other.

### 1. The star field was ruled into columns

```glsl
float sh1 = ehash(cell + 11.3), sh2 = ehash(cell + 41.7);
vec2  sfr = fract(...) - vec2(0.28 + 0.44 * sh1, 0.28 + 0.44 * sh2);
float star = step(0.962, sh1) * ...;
```

`sh1` **gated whether a star exists** *and* **placed it in x**. A star only exists where
`sh1 > 0.962`, so every visible star's x-offset was confined to `0.28 + 0.44 × [0.962, 1]` =
**[0.703, 0.720]** — a window 1.7% of a cell wide. Every star in the sky sat at the same x inside
its cell: a perfect column lattice at the cell pitch. The twinkle had the identical bug
(`sin(T * (1.1 + sh1 * 2.4) + ...)`), so with `sh1` effectively constant the entire field also
pulsed at one rate — which is the "moving around over time" part.

The fix is to give placement and twinkle **their own hashes**, so only presence reads `sh1`.

**Measured, by isolating the star layer alone** at a resolution where the cell pitch is 8px (at
the 760px render height the pitch is 5.07px, and sub-pixel histogram bins measure pixel
quantisation rather than placement — the metric came back a meaningless ~2.0 for both versions
and nearly hid the bug). Histogram of star-centre x-phase within a cell, 20 bins:

| | stars | x-phase peak/mean | histogram |
|---|---|---|---|
| before | 843 | **20.0** | all 843 in ONE bin |
| after | 860 | 3.91 | spread over every reachable bin |

20.0 out of a possible 20.0 is every star in a single bin — the worst score the metric can
produce. Only 8 bins are reachable at an 8px pitch, so a perfectly scattered field scores 2.5;
3.91 is scattered. **This is a check that was watched going red before it was trusted.**

### 2. The nebula was value noise on an axis-aligned lattice

Three compounding causes, all present at once:

- **The hash correlated along the axes.** `fract(p.x * p.y)` off a `fract(p * vec2(a,b))` seed
  gives neighbouring cells in a row or column related values, so the field grew long axis-aligned
  rectangular streaks with hard edges.
- **Value noise bakes the lattice in by construction.** Every cell is a *constant* that the fade
  merely blends between, so cell boundaries are structural. When the domain scrolls they slide
  across the screen — "a grid moving around over time", precisely.
- **The fbm octaves were scaled but never rotated** (`p = p * 2.03 + 17.1`), so every octave
  shared one axis alignment and the grid reinforced itself instead of averaging away.

Fixed by switching to **gradient (Perlin-style) noise** — the value is zero *at* each lattice
point and is built from a random gradient dotted with the offset, so there is no per-cell plateau
and no grid — with a **quintic fade** (`t³(t(6t-15)+10)`, C2-continuous, the correct partner for
gradient noise), a stronger hash, and a **~36.4° rotation between octaves**.

One trap worth recording: a **quintic fade on *value* noise makes the grid worse, not better.**
Quintic has zero first *and* second derivative at the ends, so each cell plateaus around its
constant and reads as more of a flat tile. Quintic is right for gradient noise and wrong for
value noise. Changing the fade without changing the noise type would have looked like a fix and
been a regression.

A curvature metric (|Laplacian| bucketed by cell phase) reported ~1.0 — "clean" — for the broken
version. It measures the *seam* at a cell boundary, and this artefact is a *structural* axis
alignment with no seam. The images showed it instantly. **Look at the field, rendered alone.**

### Re-measured after the fix

Nothing regressed; motion improved slightly because the background is no longer partly
plateaued:

| | frame-to-frame quiet | loud | beat | dead pixels (quiet) |
|---|---|---|---|---|
| before | 7.85 | 21.58 | 31.81 | 0.3% |
| after | **9.73** | **22.85** | **33.98** | **0.0%** |

## Always look at the frames

Twice this shader shipped with a defect only the images would show: the white-out, then the dark
disc interior. Both were invisible in the numbers and obvious in a side-by-side.

Two traps in the tooling itself, both of which produce output that *looks* fine:

- The contact sheet loaded its tiles over `file:///` from a `setContent` document. Browsers block
  that; it rendered a neat grid of empty boxes and looked plausible at a glance. Read the
  individual PNGs. `scripts/compare-shots.mjs` now inlines the bytes as base64 and asserts every
  image decoded before screenshotting.
- Renders from different runs land in different directories under reusable tags — a `v2-*.png` was
  the *second tuning pass of the first version*, not the second version. Two files named
  `v2-quiet.png` showed different shaders. Check what a render actually is before trusting it;
  measuring it settles the question in seconds (identical disc geometry = identical shader).

## Ideas not yet done

- Beads should march around the limb as the moon "moves" rather than twinkling in place.
- A real second-contact moment: on the first drop after a long quiet, a single huge diamond ring
  flash timed to the transient.
- The sky between rays could carry a faint corona-lit cloud layer for depth.
