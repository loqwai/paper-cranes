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
- **iter 2** (03:30): bass thump (`BASS_ENV`) leans the nebula dust toward deep ember red at the
  same lightness (`lchGamut(0.30, 0.12, 29°)`, up to 60%). Audio: bass 0.78, centroid 0.12.
- **iter 3** (03:31): magenta guard. The luminance-neutral beat rotation (`0.5·punch + 0.2·kick +
  0.35·wave`) could turn violet forward, or red backward on the signed wave, into the hot-magenta arc.
  Now the rotated hue is clamped to the arc's edge (OKLab atan -1.25..0.45 rad, 288° to 26°). Seen at
  bass 0.77 / bZ 0.9 / thump 0.99 with mids lifting chroma (iter 1): hot-pink specks in the dense lace.
- **iter 4** (03:35, Aaron: "We need it to undulate and coil much more"). Two traveling waves on one
  one-way phase, `WAVE_PHASE = cs_flow·TAU·3 + cs_drift·20` (measured 1.82 rad/s at energy 0.04; about
  0.6 rad/s silent and 3 loud). Audio sets only the rate; the amplitudes are constant.
  - **COIL**: a barber-pole twist inside the iteration, `rot(0.22·w_k·sin(1.3·log|V|² − 1.1·phase))`,
    with `w_k` ramping in over iterations 1 to 6, so the silhouette holds and the filaments coil. Bounded,
    and the pattern only travels one way.
  - **UNDULATE**: crossed traveling waves on the input domain, `p += 0.045·(sin(5.5y − φ), sin(4.7x − 0.83φ + 1.7))`.
    Directional, not radial, so there are no zoom rings.
  - Fades in over the first 10 s after page load. No controller change, so prod clit-set/2 is untouched.
  - Census after it: hot pink 0.18 to 0.28 of vivid pixels (baseline 0.15), grey 5 to 6%, white 0.
