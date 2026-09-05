# satellites-chroma.frag — hero + satellites for ChromaDepth glasses (2026-09-04)

`satellites.frag` with its colour pipeline replaced by the ChromaDepth discipline `chroma.frag` established:
**hue is a function of depth and nothing else; the music arrives as exposure.** Geometry (spin on
`spin_angle`, isotropic breath, pump via the second SDF, orbit, portrait fit) is unchanged.

## Run
```
?shader=redaphid/wip/lattice-bead-vj/satellites-chroma&controller=dodeca-bloom&image=images/beads/mon-hakkaku.png&satellites=6&knob_1=0.75&knob_2=0.7&knob_3=0.6&wavelet=true&onset_refractory_ms=380
```
`?cddebug=1` paints the depth field as grey (what `scripts/lab/cd-measure.mjs` checks the hue against).

## The scene (depth 0 = red = near, 0.75 = violet = far)
| layer | depth | reads as |
|---|---|---|
| hero contour | 0.00 | hot red line, nearest (fresnel) |
| hero body | 0.00 → 0.12 core → edge | a shallow dome, red falling to orange |
| satellites | 0.28 (bottom of orbit) → 0.56 (top) | a ring **tilted toward the viewer**; each bead swims through depth as it orbits; size 0.88–1.12× agrees |
| ground | 0.74 beside the hero → 0.96 at the corners | blue to violet, with the hero's outline echoes as a travelling staircase (±0.03, zero-mean) |
| drop ring | 0.00 | the hero's outline runs outward **red** — it comes at you |

Beat pop: `bass_pump`/`drop_glow` pull a bead's depth toward the viewer, clamped, masked to the bead — the
guide's "shift toward red on the beat" made local so it cannot strobe. Compositing is front-most (mix by
coverage), never additive. L ≤ 0.55 at saturation 0.97: white is unreachable by construction.

## Knobs
K1 IMPACT, K2 PUMP, K3 RING, K4 GLOW, K7 SIZE, K8 SPARK, K10 ORBIT as `satellites.frag`.
K9 **DEPTH SPREAD** (was HUE SPREAD) and K11 **POP** (was TILT): both originals rotated hue, forbidden here.
K5/K6 belong to dodeca-bloom.

## Measured (headless, `cd-measure.mjs`, 384², pinned phases, hakkaku)
Spearman ρ(depth, hue) **0.9994**; mean |hue − 0.75·depth − seed2·0.03| 0.0009 (8-bit quantisation);
near-white **0.000%**; mean lum 36, dark 48% (vignetted violet corners), bright 21%.
Reactivity (`react-stat.mjs`, synthetic 128 BPM track, knobs 0.75/0.7/0.6): centre swing 42.5, drop 74 → 106,
corner swing 6.2, corner-vs-bass 0.04. Lower absolute swing than the Oklch original because L is capped at 0.55.
