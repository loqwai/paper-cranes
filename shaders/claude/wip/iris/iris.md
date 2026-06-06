# iris — series

Saved snapshots of the green/gold human-iris look that emerged live during an Of The Trees
set (forked from `claude/wip/dodeca-bloom/1`). The iris is built from a kaleidoscopic dodecahedron
SDF: infinity-tunnel center = pupil, kaleidoscope spokes = stroma fibers, with anatomical layers
(heterochromia palette, limbal ring, collarette, crypts of Fuchs, contraction furrows, pupillary
ruff) and a light infinity-mirror recursion in the background (subtronics-eye style — eye masked out).

**Requires the controller:** append `&controller=dodeca-bloom` to the URL. The controller provides the
monotonic phase accumulators (spin/morph/flow/hue), smoothed band envelopes, fast bass pump, and
drop/pitch events. Color follows the fractal SDF (not screen uv); knobs 2/3/4 mix the palette.

## Iterations

### iris/1 — green-gold heterochromia iris
First snapshot. Gold/amber lipochrome core (central heterochromia) → green ciliary stroma, full
anatomy + light background infinity mirror. Knob preset that produced the saved frame:

```
?shader=claude/wip/iris/1&controller=dodeca-bloom&fullscreen=true&knob_1=0.354&knob_2=0.378&knob_3=0.78&knob_4=0.835&knob_5=0.732&knob_6=0.142&knob_7=0.661&knob_8=1&knob_9=0.811&knob_10=0.26&knob_11=1&knob_12=0.819&knob_13=0.024
```

Knob roles: 1 zoom · 2 hue base · 3 hue freq · 4 chroma · 5 spin speed · 6 drop sustain ·
7 facet size · 8 arm spread · 9 depth · 10 kaleido twist · 11 bass reactivity · 12 line weight · 13 ripple.

### iris/2 — copper-core green iris
Green ciliary stroma with a **copper-orange sunburst pupillary core** (warmer/redder than iris/1's gold),
defined crypt petals, anemone-like fibers. Smaller facets (knob_7 up).

```
?shader=claude/wip/iris/2&controller=dodeca-bloom&fullscreen=true&knob_1=0.606&knob_2=0.425&knob_3=0.449&knob_4=0.835&knob_5=0.732&knob_6=0.181&knob_7=0.827&knob_8=1&knob_9=0.811&knob_10=0.74&knob_11=1&knob_12=0.819&knob_13=0.024
```

### iris/3 — flaming-eye (fire sunburst pupil)
The pupillary core ignites into a **fiery orange-red sunburst** (oklch ember push at the tips,
crackling with treble — `knob_16`) ringed by the green ciliary stroma and a deep green limbal ring.
Emerged on *I See A Fire* (Of The Trees). The most dramatic of the series — reads as a flaming eye /
small sun. Mirror halo at full (`knob_15=1`), chroma maxed (`knob_4=1`).

```
?shader=claude/wip/iris/3&controller=dodeca-bloom&fullscreen=true&knob_1=0.307&knob_2=0&knob_3=0.52&knob_4=1&knob_5=0.307&knob_6=0.37&knob_7=0.449&knob_8=0.409&knob_9=0.811&knob_10=0.937&knob_11=1&knob_12=0.748&knob_13=0.37&knob_14=0.449&knob_15=1&knob_16=0.559&knob_21=0.35
```

New knob since iris/1-2: **15** background mirror strength · **16** ember (fire tips).

### iris/4 — open-pupil flame eye
The final anatomical piece: a **dark dilating pupil** (`knob_14`) carved at the very center, ringed by
a fiery orange-gold flame-petal iris (crypts read as flame tips). Reads unmistakably as a living eye —
dark aperture + blazing stroma. Emerged during *Look Into My Eyes* (Of The Trees). knob_14 dilates the
pupil from nothing (0) to wide (~0.16 radius).

```
?shader=claude/wip/iris/4&controller=dodeca-bloom&fullscreen=true&knob_1=1&knob_2=0&knob_3=0.78&knob_4=0.961&knob_5=0.299&knob_6=0.85&knob_7=0.598&knob_8=1&knob_9=0.811&knob_10=0.732&knob_11=0&knob_12=0.748&knob_13=0.409&knob_14=0.693&knob_15=1&knob_16=0.197&knob_21=0.35
```

New knob since iris/3: **14** pupil dilation (black aperture, 0 = none).

## Notes
- Built from dodeca-bloom; full development history + lessons in `journals/dodeca-bloom-cool-moments.md`.
- Color must stay Oklch (user pref). Background mirror is gated OUT of the iris so the eye reads clean.
- Save further interesting variants here as iris/2, iris/3, … with their knob presets.
