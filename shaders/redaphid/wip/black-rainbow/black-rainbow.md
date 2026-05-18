# black-rainbow

Tribal rainbow logo (`public/images/black-rainbow.png`) used as a region mask
over an event-horizon plasma field.

## Visual intent

The PNG has three regions: rainbow stripes, jagged black "scythes" flanking the
arc, and transparent background. The rainbow stays as-is (it's the logo). The
black scythes are replaced with full **event-horizon plasma** (Ether / nimitz,
ported from `plasma.frag`) so the flames look like matter swirling into a black
hole. The transparent background gets the same plasma but dimmed to a deep
void, so the logo reads cleanly on top.

Each scythe gets its own local "singularity" offset to roughly where the
scythe's visual mass sits (`scytheCenter = vec2(±0.32, -0.05)`). This makes it
feel like there are two black holes pulling on the rainbow rather than one
global plasma soup behind the image.

## Region classification

`classifyImage(uv)` separates pixels from the PNG using channel chroma:
- `scythe` = opaque AND low max-channel (black ink)
- `rainbow` = opaque AND high chroma (saturated R/Y/B stripes)
- Everything else (white interior, transparent BG) falls through to the void plasma

This is a cleaner separation than thresholding luminance alone, because the
white interior of the arc and the transparent background are both non-chromatic.

## Audio mapping

| Signal | Effect |
|---|---|
| `energyZScore` | speeds up plasma time + drop flare on rises |
| `bassZScore` (positive) | thickens plasma, pulses the photon ring, makes the scythes "writhe" outward |
| `pitchClassZScore` spikes | hue flash |
| `trebleZScore` | spectralRoughness adds to time advance; treble drives starfield twinkle outside the logo |
| `midsNormalized` | gentle lightness lift |
| `spectralCentroid` | continuous hue sweep |

## Knobs

| Knob | Use |
|---|---|
| `knob_1` | plasma swirl rate (SHAPE_TWIST) |
| `knob_2` | palette rotation (COLOR_SPIN) |
| `knob_3` | sin-fold packing (FRACTAL_DENSITY) |
| `knob_10` | lens strength (gravitational pull) |
| `knob_12` | photon-ring radius |
| `knob_16` | void darkness at background corners |

## Open it

```
http://localhost:6969/?shader=redaphid/wip/black-rainbow/1&image=images/black-rainbow.png
```

Jam version:
```
http://localhost:6969/jam.html?shader=redaphid/wip/black-rainbow/1&image=images/black-rainbow.png&audio=tab
```

## Iteration notes

- **1.frag**: First pass. Plasma centered per-scythe (not at image center) so
  the writhing motion reads as two black holes, not one global field. Rainbow
  kept intact with a gentle bass pump.
