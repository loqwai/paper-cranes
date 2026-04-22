# the-coat-9

Forked from `the-coat-8.frag` at `/vj` iter 54. Purpose: iterate on coat texture. User flagged grain as not wanted; wanted *defined whorls and whorls* with knob-controllable wiggle/amplitude.

## What changed

Replaced the noise-based fur-strand block (fbm + sine ridges) with a **defined whorl system**:
- Coat space is tiled into an irregular grid; each cell holds one spiral whorl seed with hash-randomized center offset and phase.
- Each whorl is a logarithmic spiral (`sin(angle * 3 + log(r) * density + time + phase)`).
- Domain-warped coat coords sway the whole field with slow sines on two axes, so whorls drift/breathe without sliding.

## New knobs

| Knob | Role | 0 | 1 |
|---|---|---|---|
| knob_12 | Wiggle amplitude | Static whorls | Writhing/seasick |
| knob_14 | Whorl density | Sparse/loose | Packed/tight spirals |
| knob_15 | Wiggle speed | Stately | Fast swirl |

Seeded at (0.4, 0.5, 0.4) by the browser swap so you arrive with visible whorls.

## Keep from the-coat-8

All other knobs (1-11) stay as-is:
- knob_1: zoom
- knob_2: climax dampener
- knob_3: palette hue shift
- knob_4: palette chroma floor
- knob_5: hyperspace tunnel
- knob_6: particle storm
- knob_7: trails
- knob_8: saturation boost
- knob_9: star density
- knob_10: fog
- knob_11: aurora

## Preset URL

`?shader=redaphid/wip/the-coat-fur-coat/the-coat-9&controller=the-coat&knob_1=0.079&knob_2=0.811&knob_3=0.472&knob_4=0.976&knob_5=0.811&knob_6=0.134&knob_7=0.63&knob_8=0.5&knob_9=0&knob_10=0&knob_11=0&knob_12=0.4&knob_14=0.5&knob_15=0.4`

## Music during fork

*Sweat (Soulji Remix) – Karma Fields, Soulji* → *MIA – welcome2bishu, Bishu, vexx*.
