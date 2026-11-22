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
- **iter 5** (03:38): a final hot-magenta guard. A census split by lightness showed the excess was
  orchid lace at 300–330° (OKLab), mid lightness. Three things fed it: the trails blending red over
  violet once the filaments moved (iter 4), the mids chroma lift (iter 1), and the per-channel output
  gamma (R 0.88, B 0.95) leaning violet toward pink. At the output, hues inside the arc between 288°
  and 26° are now squeezed toward the arc's two edges with a cubic curve, and the arc's middle loses up
  to 45% chroma. L is kept. Result: hot-pink share 0.18–0.28 → 0.06–0.13, white 0, grey ≤ 4%.
- **iter 6** (03:40): every kick surges the coil and undulate waves forward: `WAVE_PHASE += cs_beat·TAU·0.35` (~0.24 rad per full kick, eased 0.12 s, never back). Rhythm in the motion, not the light.
- **iter 7** (03:43): pearls are back. `PEARL` (spectral crest) was defined but unused. It now drives sparse soft pinpoints on the braid: fractal-space cells that ride the geometry and shimmer as the waves pass, each on its own twinkle phase, at density 5%·PEARL/0.3 and gain 0.55.
- **iter 8** (03:44): treble (`TREB_ENV`) cools the rim hue toward teal (palette t 0.66, up to 50%), the mirror of a build warming it to red. Colour only.
- **iter 9** (03:47): a timbre shift (`cs_shift`, spectral flux and entropy change, unused before) turns the lace palette up to 0.6 rad. Colour only.
- **iter 10** (03:48): the braid (`lace_fine`, which carries the treble sparkle, punch and pearls) now fades where it changes faster than a pixel (`fwidth(lx+ly)` 1.5 to 4) at any depth, not only past 3x. The dense lace at home was churning into chalky speckle on the 408 px phone canvas. Grey 8.6% → 2.8%.
- **iter 11** (03:50): the main lace also dims, by up to half, where it is sub-pixel (`fwidth(min(lx,ly))` 2 to 6) at any depth. At voyage 2.25 the bass-thickened, coil-churned lace mass filled the frame as chalky speckle (grey 9%, vivid 0.26). After: grey 3%, vivid 0.39.
- **iter 12** (03:52): treble brings out stars in the voids. Near and far star density rise by +0.15 and +0.10 × `TREB_ENV`, and star brightness becomes `max(neb, 0.35 + 0.5·TREB_ENV)`. At voyage 3.0 half the frame was an empty black void with ~1 px stars at 0.35.
- **iter 13** (03:54): fixed an artefact from iters 10 and 11. `lx` and `ly` are logs of trap distance and run to −∞ on the thread cores, so `fwidth` spiked there and the gates dotted the cleanest threads dark (chains of dark dots along ribbons). Both gates now measure `fwidth` on the logs clamped to the lace's transition band `[lace_hi − 0.5, lace_lo + 0.5]`.
- **iter 14** (04:03): roughness (`cs_grit`) adds a fine grain to the nebula dust that drifts on the flow clock: `dust *= 1 + 0.9·GRIT·(noise − 0.35)`. It is subtle, because the darkness pass holds the voids near black.

## 2.frag: the roller coaster (fork of 1.frag, 04:11)

Aaron: "It's been pretty samey for a while. Give me a 'roller coaster' view going down the fractal
tube." A dramatic move, so it is a fork. 1.frag stays as the fallback.

```
?shader=claude/wip/clit-vibej/2&controller=clit-set&wavelet=true
```

- **The tube.** The screen becomes log-polar around a vanishing point: `u = log r − TRAVEL` and
  `θ = atan + NAV_ROT + ROLL`. The fractal is sampled at
  `C = home + (0.23, 0.33) + 0.30·e^{i·u} + 0.15·e^{2iθ}`. That is periodic in both u and θ, so the
  tube has no seam and never ends. The walls repeat twice around, and the scale is conformal
  (R1·K = 2·R2), so the wall shows rings and not radial streaks.
- **Travel** (one-way): `cs_flow·TAU·1.6 + cs_beat·1.2 + cs_jump·0.8`. That is a cruise of about
  0.2 u/s in silence that runs faster on loud passages, a 0.13 u surge per full kick and a 0.8 u lunge
  per drop.
- **Banking**: `ROLL = cs_drift·2.5`, the music-rate spin integral, so the roll's rate swells and eases
  but never reverses (a corkscrew).
- **The curve**: the vanishing point circles a small ellipse (0.08 × 0.22), always the same way, at
  `cs_flow·TAU·0.4`.
- **Depth**: the far core is dark (`smoothstep(0.02, 0.16, r)`), which hides the singularity, and the
  light runs 0.12 → 1 from far to near (log r −2.6 → 0.1).
- **The track**: two amber rails on the tube floor, banked by 0.6·ROLL, and dark-red cross-ties every
  half e-fold of depth. Equal steps in log r are perspective-correct in a tube.
- 1.frag's coil, undulate, pearls, magenta guard and speckle gates all carry over.
- Checked with a local headless render (`noaudio`, 408 × 997) before the phone saw it.
