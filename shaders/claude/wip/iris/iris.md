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

## Notes
- Built from dodeca-bloom; full development history + lessons in `journals/dodeca-bloom-cool-moments.md`.
- Color must stay Oklch (user pref). Background mirror is gated OUT of the iris so the eye reads clean.
- Save further interesting variants here as iris/2, iris/3, … with their knob presets.
