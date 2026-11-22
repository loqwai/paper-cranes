# clit-vibej

A live /vibej show fork of `clit-set/2` (the voyage), made 2026-11-22 for a show on Aaron's phone
(`cranes-local.hypnodroid.com`, phone mic at a techno venue).

```
?shader=claude/wip/clit-vibej/1&controller=clit-set&wavelet=true
```

Runs with the `clit-set` controller. Without it, every `cs_*` reads 0 and the knobs drive the camera
directly, as in clit-set/2.

The session journal is `journals/clit-vibej-cool-moments.md`. The vibej skill would name it
`journals/1-cool-moments.md` (after the file name `1.frag`), but "1" is ambiguous across shaders, so
it uses the folder name.

## Intent

clit-set/2's voyage, kept as it is, with the VJ adding music response one small move at a time.

- **Audio never moves the fractal.** A, B, C, zoom, pan, rotation and curl evolve one way only and
  never oscillate. Audio may drive colour, light on the lace, rim and ember, chroma, hue, local
  punch, twinkle and nebula.
- **The beat stays luminance-neutral.** The existing kick hue-step and chroma lift are scaled back to
  each pixel's luminance, so the show's flicker and shiver meters do not see them.
- **Visual limits.** No flashing or whole-frame strobe, no white-out, no grey, no hot magenta. Every
  knob at 0 still looks good.
- **Built for a quiet mic.** The phone mic sits at energy 0.01 to 0.07, so responses must read at
  that level. Prefer controller envelopes (`cs_punch`, `cs_thump`, `cs_treb`, `cs_beat`), which are
  normalised and presence-gated, over raw feature values.
- **At most ~6 overlay effects** at once.

## Audio mapping

Inherited from clit-set/2 (see `shaders/clit-set/clit-set.md` for the full table). Changes made
during the show are listed per iteration below.

## Iterations

- **1.frag**: copy of clit-set/2 at 0de6d953. Header retagged. Live edits follow, one per tick.
- **1.frag, iter 1** (03:28): `cs_mids` (mids z-score envelope, unused in clit-set/2) lifts lace and
  rim chroma: `CHROMA_GAIN = 0.85 + 0.3·BREATH + 0.25·MIDS_ENV·REACT`. Colour only. Audio:
  mid-dominant quiet mic (energy 0.015, mids 0.67).
