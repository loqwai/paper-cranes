# eclipse — "Totality"

Live link (everything needed in one URL):

```
https://visuals.beadfamous.com/?shader=claude/wip/eclipse/1&controller=wavelet-ease&wavelet=true&fullscreen=true
```

## Visual intent

A total solar eclipse. A black disc that **never moves**, with everything happening at its edge:
corona streamers, Baily's beads, a diamond ring, crimson prominences, and stars that come out in
the dark. Built to read instantly from across a dark room — the silhouette does the work, so there
is nothing to explain.

The **dynamic range is the piece**: a quiet passage collapses the corona to a thin pearly rim and
the stars come out (real totality darkness); a drop erupts it into long chromatic spikes that shoot
past the edge of frame. Quiet genuinely looks quiet.

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
- Raw transients (`waveletBassZScore`, `wavelet_bassHit`) drive **amplitude only** — the bead pop,
  the diamond flare, the dilation punch. They never touch a phase or an angle, so nothing shivers
  or rocks backwards.
- All motion comes from the controller's monotonic accumulators (`flowPhase`, `morphPhase`,
  `spinPhase`), never `iTime * rate`.
- Every audio offset is multiplied by `quietGate`.
- The streamer field is sampled on the **unit direction vector**, so it is seamless around the
  circle — no `atan` branch cut, and no `fract()` wrap to window away.

## Iterations

**1.frag** — first version, and the one that shipped. Two significant fixes were made against
rendered frames before it went out:

- *White-out.* A single corona `reach` driving both the halo and the rays meant a loud section
  flooded the whole frame to pure white. Split into a tight `glowReach` (halo hugging the limb) and
  a long `rayReach` (spikes), and hard-separated the streamers with `smoothstep(lo, 0.90, n1)` so
  the sky **between** rays stays dark. The drop now reads as long spikes against night, not a sheet.
- *Washed colour.* Corona lightness started near 1.0 and a hard `clamp()` drove every over-1 channel
  to the same value, so bright meant white. Lowered the palette lightness to ≈0.6 and replaced the
  clamp with an exponential exposure tone-map (`1 - exp(-col * k)`), which compresses each channel
  smoothly — a blazing ray now stays gold/cyan/violet instead of going white. The halo and rim are
  painted a fixed warm white-gold so it always reads ECLIPSE regardless of where the melody has
  taken the palette.

## Ideas not yet done

- Beads should march around the limb as the moon "moves" rather than twinkling in place.
- A real second-contact moment: on the first drop after a long quiet, a single huge diamond ring
  flash timed to the transient.
- The sky between rays could carry a faint corona-lit cloud layer for depth.

## 2.frag — the motion rebuild

**1.frag failed in front of a live audience.** The verdict: *"It's almost all that black circle
with almost no movement. Terrible."*

### Why it failed, and why review missed it

**It was validated from still frames, and a still frame cannot validate a motion piece.** In a
still, a black disc filling the middle of the screen reads as a dramatic eclipse. In motion it
reads as a dead black hole with a shimmer at the edge.

Two independent causes, both invisible in a screenshot:

1. **A huge motionless region.** `R = 0.208` in uv units is 42% of the half-height — the disc and
   its immediate surround were ~29% of the frame at pure black (measured: `deadFrac 0.288`).
2. **Everything animated rode the controller's phases at their BASE rate.** `wavelet-ease`
   advances `flowPhase` at 0.06/s and `spinPhase` at 0.02/s. 1.frag then scaled them DOWN —
   `flowPhase * 0.42` is 0.025 noise-units per second, and `spinPhase * 0.55` gave the diamond
   ring **one revolution every nine minutes**. The discipline "all motion comes from monotonic
   accumulators, never `iTime`" was followed to the letter and produced a still image.

Measured on the real thing (`scripts/motion-check.mjs`, mean |Δ| per channel, 0-255):

| | frame-to-frame (quiet) | frame-to-frame (loud) | quiet vs loud | dead pixels |
|---|---|---|---|---|
| **1.frag** | **0.17** | 0.36 | 55.7 | 28.8% |
| **2.frag** | **7.60** | 20.08 | 68.1 | 1.7% |

0.17/255 is a still image. That number is the whole bug.

### The rule that caused it, corrected

The real rule is *never put audio into a phase or an angle* — because `iTime * <changing rate>`
jumps the accumulated angle by `iTime * Δrate` whenever the rate changes, and that jump grows
without bound. **A constant rate has no Δrate, so `iTime * k` is perfectly safe** and is the only
thing that guarantees motion when the room is silent and every audio term is zero. 2.frag uses
both, added:

```glsl
float spin  = iTime * 0.130 + spinPhase  * 2.2;   // constant floor + audio speeds it up
float flow  = iTime * 0.560 + flowPhase  * 3.2;
float churn = iTime * 0.230 + morphPhase * 2.6;
```

### What changed

- **Core shrunk** `R 0.208 → 0.082` (~1/6 the area) and **filled** with a churning ember plasma
  that is dark at the centre and white-hot at the limb — added *after* the moon mask, or the mask
  crushes it. It also **drifts** on a slow constant-rate Lissajous so nothing is anchored.
- **Background nebula** — 2-octave turbulence over the whole frame, parallaxing against the
  drifting core. This is what guarantees no motionless region at any audio level.
- **Shock rings** travelling outward at a constant rate, brightness detonating on the transient
  (amplitude only — a hit never moves a ring, only lights it).
- **Corona reaches the corners**: `rayReach` 0.26 quiet → ~1.4 loud (frame radius ≈0.57 portrait).
- **Beat punch**: 11.5% whole-frame scale + exposure flash + hue kick + ring blaze + diamond
  supernova, all on the same transient.

### The white-out, again — and the chroma restore

The first cut of 2.frag hit **mean luma 212/255** on a sustained kick: a white sheet with no
structure, the exact failure 1.frag had already been fixed for. Half a dozen additive layers of
different hue **sum towards white**, and the exponential exposure curve then flattens what little
chroma survives. Trimming amplitudes got luma to 154 but left a milky grey fog. The fix that
actually restored the colour is a post-tone-map chroma extrapolation:

```glsl
float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
col = clamp(mix(vec3(lum), col, 1.38), 0.0, 1.0);   // mix factor > 1 pushes AWAY from grey
```

A drop now reads as violent magenta/gold rather than as brightness.

### Verifying motion (`scripts/motion-check.mjs`)

Renders N frames ~90ms apart at a fixed audio level and reports the mean absolute per-pixel delta
between **consecutive** frames, then the delta **between** audio levels. It also reports
`deadFrac`, the fraction of pixels below luma 12.

**Run it against 1.frag as a control.** A motion metric nobody has watched go red is not evidence;
1.frag scoring 0.17 is what proves the harness measures anything at all. Rough reading of the
frame-to-frame number: `<1` dead, `2-6` gentle but unmistakable, `>8` energetic.

Note the contact-sheet page loads its tiles over `file:///` from a `setContent` document, which
the browser blocks — it renders a grid of empty boxes and *looks* fine. Read the individual PNGs.

## 3.frag — filling the disc, and how the metric nearly lied

2.frag shrank the occluder correctly but **left its interior dark**, so it still read as a hole
with a rim rather than a body in a sky. 3.frag finishes the job.

### Measuring the occluder, and two ways to get it wrong

**Wrong way 1 — centroid of dark pixels.** Works only while the disc dominates the dark mass. In
a quiet passage the sky is dark too, so the centroid lands on an average of scattered background
and the ray-cast measures a radius of *zero* while a disc is plainly on screen.

**Wrong way 2 — largest connected dark blob.** Also confounded by the sky: on 2.frag's quiet
frame it returns a blob with a bounding box 99.8% of frame width, centroid at y=0.79. That is the
background, not the moon.

**What actually worked** was tying the pixels back to the geometry. `uv.y` spans exactly 1.0 over
the frame height, so the disc's height fraction is exactly `2R` — and on a *loud* frame, where the
corona isolates the silhouette, the measured bounding box confirms it:

| | `R` | predicted `2R` | measured bbox height |
|---|---|---|---|
| 1.frag | 0.208 | 41.6% | **41.7%** |

Prediction and measurement agree to 0.1%, which is what licenses using `2R` for the others:
**1.frag 41.6% of frame height → 2.frag 16.4% → 3.frag 14.0%.**

### Near-black pixels, the number that answers the complaint

Fraction of the frame below luma 12 (reads as pure black on a phone in a dark room):

| | quiet | loud |
|---|---|---|
| 1.frag | **28.8%** | **24.7%** |
| 2.frag | 1.7% | 0.4% |
| 3.frag | **0.3%** | **0.0%** |

At loud, a quarter of 1.frag's frame is pure black — that is the disc, and it is the complaint.

### The threshold trap

`deadFrac` uses an absolute cutoff (luma < 12). A silhouette lifted to luma 13 scores as "not
dead" while still reading as a black hole. It was not gamed here — the drop from 28.8% to 1.7% was
real, and `frac25`/`frac45` move the same way — but a single absolute threshold is one lucky
constant away from being meaningless. Report several thresholds, and measure the silhouette's
*size* independently, as `scripts/measure-disc.mjs` now does.

### Changes

- `R` 0.082 → 0.070; disc floor lifted (mask `0.88 + 0.12` → `0.82 + 0.18`).
- Ember reaches much further in (`pow(ir, 1.7)` → `pow(ir, 1.05)`, threshold 0.28 → 0.20) and
  burns nearly twice as bright, so the core is a churning body, not a silhouette.
- Quiet floor raised: nebula 0.135 → 0.245 base, corona `rayAmp` 0.62 → 0.74 base — the audio-
  scaled terms were trimmed to compensate so loud does not blow out again.

### Always look at the frames

Twice this shader shipped with a defect only the images would show: the white-out, then the dark
disc interior. Both were invisible in the numbers and obvious in a side-by-side.

Two traps in the tooling itself, both of which produce output that *looks* fine:
- The contact sheet loaded tiles over `file:///` from a `setContent` document. Browsers block
  that; it rendered a neat grid of empty boxes. `scripts/compare-shots.mjs` inlines the bytes as
  base64 and asserts every image decoded before screenshotting.
- Renders from different runs land in different directories with reusable tags —
  `tmp/eclipse-shots/v2-*.png` is the *second tuning pass of 1.frag*, not 2.frag. Two files named
  `v2-quiet.png` showed different shaders. Check what a render actually is before trusting it;
  measuring it settles the question in seconds (identical disc geometry = identical shader).
