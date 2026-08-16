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
