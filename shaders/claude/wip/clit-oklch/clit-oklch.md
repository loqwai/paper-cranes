# clit-oklch

Phase-1 prototype of the clit series' colour rebuilt on the repo's OKLCH harmony kit
([docs/oklch-palettes.md](../../../../docs/oklch-palettes.md)). Aaron, 2026-11-22: "We also need to
reinplement using oklh like this repo currently recommends with a thematic color palette".

- `vibej2.frag` is `clit-vibej/2` and `set2.frag` is `clit-set/2` (both at `fix-clit-sparkle` 202edecd, LACE AA),
  with only the colour code changed. Both are generated, not hand-edited:

  ```
  python3 shaders/claude/wip/clit-oklch/port.py shaders/claude/wip/clit-vibej/2.frag shaders/claude/wip/clit-oklch/vibej2.frag
  python3 shaders/claude/wip/clit-oklch/port.py shaders/clit-set/2.frag shaders/claude/wip/clit-oklch/set2.frag --guard
  ```

  (then the `preset:` line is pointed at the scratch path). `kit.glsl` is the kit block copied verbatim from the doc.
  `port.py` fails loudly when an anchor is missing, so it re-applies onto whatever lace code lands.

```
?shader=claude/wip/clit-oklch/vibej2&controller=clit-set&wavelet=true
?shader=claude/wip/clit-oklch/set2&controller=clit-set
```

## Theme: EMBER & NEBULA

A warm body adrift in a cold galaxy. The lace is the body (ember red, burnt amber); the galaxy is cool (teal,
indigo velvet). Warm = near and cool = far, so the theme agrees with ChromaDepth even with K_DEPTH at 0.

| key | hue (turns) | at THEME_H 0.095 | role |
|---|---|---|---|
| ember | `THEME_H` | 34 deg | dominant: lace, ties, the bass lean of the dust |
| amber | `+0.04` | 49 deg | lace, rails |
| teal | `+5/12` (kit split complement) | 184 deg | accent: braid, rim |
| indigo | `+0.68` | 279 deg | velvet: darkest lace, pale star tint |

- One base hue. The per-device seed turns `THEME_H` within 0.075..0.115 turns (27..41 deg) only, so indigo stays
  272..286 deg: never in the magenta arc.
- Knobs and audio (`HUE_TURN`, `cs_hue`, `cs_jump`, `cs_shift`, `TONE_LEAN`) move the position along the palette
  (`pal_t`), never the hues: no dial can take the series off-theme.
- Ramp: the kit's `ramp4` (OKLab mix) behind `themeHold`, which holds each key for the outer quarters of each leg.
- Lightness band 0.13..0.70 for the lace (true OKLab L). The old palette wrote the wrapper's linear-sRGB OKLab output
  straight to the screen, so its displayed lightness was this band; the kit's 0.45..0.85 is for brighter shaders.
- Chroma is requested past the kit's 0.13 cap and `okFit` takes it to the sRGB edge at constant L and hue. That is
  where every lace pixel was before (HSV saturation ~1), and the series rule is never grey.

## Hard-won rules: kept or obsolete

- Never grey: kept, measured (below).
- Never hot magenta / the magenta guard (vibej iters 3 and 5): kept. The palette alone cannot reach magenta now, but
  the pink on clit-set/2 is made after the palette, by the beat's hue rotation turning violet into the arc
  (0.27 of lit pixels with the rotation, 0.04 with it off). `--guard` copies the vibej guard into clit-set/2.
- New, same shape: the beat rotation also may not turn amber into the green gap (90..160 deg). With the beat off,
  old and new palettes both show 2% green; the kick's +0.45 rad pushed the new amber there.
- `paletteHue`'s ping-pong (never wrap violet -> red): kept as `pal_t` ping-pong. `paletteHue`/`lchGamut` themselves
  are replaced by the kit (`themeCol`, `oklch2rgb(L,C,h)`, `okFit`).
- Chromadepth and K_DEPTH: kept, rebuilt on the kit's `oklch2rgb` with display-correct L. Physics, not theme:
  the seed does not turn it.
- Lace lightness from orbit luma: kept. Nothing in the palette changes L with `pal_t`.

## Numbers (phone 408x816 and desktop 1280x720, synth trace, warmup 240 frames, seeds 0.5)

`colormeter.py` in the lane scratchpad: lit = max channel > 60; grey = lit and HSV sat < 0.25; hot magenta =
lit, OKLab C > 0.06, hue 310..15 deg.

| | sat | grey | OKLab C | hot magenta | green 90..150 | mean luma |
|---|---|---|---|---|---|---|
| vibej/2 phone, before | .656 | 0.74% | .139 | 1.1% | 4% | 77.8 |
| vibej/2 phone, after | .674 | 0.51% | .142 | 1.1% | 3% | 79.2 |
| set/2 phone, before | .651 | 0.39% | .154 | 20.2% | 6% | 84.5 |
| set/2 phone, after (+guard) | .656 | 0.22% | .147 | 7.7% | 3% | 87.6 |
| vibej/2 desktop, before | .721 | 0.46% | .141 | 0.4% | 8% | 66.9 |
| vibej/2 desktop, after | .749 | 0.35% | .139 | 0.4% | 3% | 68.0 |
| set/2 desktop, before | .739 | 0.58% | .151 | 13.1% | 8% | 59.3 |
| set/2 desktop, after (+guard) | .747 | 0.41% | .144 | 4.2% | 6% | 62.2 |
