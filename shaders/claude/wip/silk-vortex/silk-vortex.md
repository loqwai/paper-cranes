# silk-vortex

The worked example of the `shader` skill (`.agents/skills/shader/SKILL.md`). It was written from
the skill alone, then put through the skill's gate until every check passed. No controller.

Preview: https://skill-shader.paper-cranes-visuals.pages.dev/?shader=claude/wip/silk-vortex/1

## Intent

Ember and teal silk ribbons line a vortex that you drift down forever. Music lights the silk; it
never moves the geometry.

## Structure

- **Log-polar vortex.** Depth is `log(r)`, angle wraps. Noise is periodic in both, so the tube has no
  seam.
- **Silk.** A domain-warped height field (a 2-octave warp, then a 4-octave fbm) cut into ribbon bands.
  A second height sample along the light direction gives rim relief (the `plasma.frag` trick).
- **Colour.** Two spiral arms carry the two halves of the scheme: ember/gold and teal. Each ribbon's
  rim is the other half. The void is a faint violet veil.
- **Output.** Composited in linear light through the OKLCH kit's `okFit`, then one hue-preserving
  soft knee and a single sRGB encode.

## Clocks

All clocks are one-way and constant-rate, and every period divides the 1000 s `iTime` wrap:

| Clock | Period |
|---|---|
| TRAVEL (inward) | 200 s per tile |
| ROLL | 250 s per turn |
| WEAVE | 500 s |

K1 FLOW snaps to 1x, 2x or 3x so the wrap stays seamless.

## Audio map

Every term is presence-gated (`smoothstep(0.0008, 0.006, energy)`) and has a constant twin for the
`#define` swap.

| Input | Drives | Channel |
|---|---|---|
| `bassNormalized` | ribbon thickness | light / coverage |
| `onsetKick` | rim flare | light |
| `onsetSnare` | sparks on crests | light |
| `onsetHat` | glints on rims | light |
| `midsNormalized` | silk chroma | light |
| `spectralEntropyNormalized` | weight of the finest fbm octave | texture |
| `spectralRoughnessZScore - 0.3 energyZScore` | fixed canvas grain | texture |
| `trebleZScore - energyZScore` | stars in the void | light |
| `spectralCrestNormalized` | pearl density | light |
| `energySlope * energyRSquared` | rim reach on a confident build | light |
| `spectralCentroidMedian`, `pitchClassMedian`, `seed` | base hue | colour (slow) |

## Knobs

All knobs at 0 give the home look.

| Knob | Name | Range |
|---|---|---|
| K1 | FLOW | 1x, 2x, 3x |
| K2 | DENSITY | 3 to 6 ribbon tiles around |
| K3 | HUE | amber to gold to lime base |
| K4 | REACT | audio light gain, 1x to 2.5x |

## Iterations of 1.frag (before first ship, so in place)

The gate runs `bin/shader-check.mjs` on a virtual clock at 390x844. It covers silence at 3, 37 and
400 s, each knob at 1, and phone-level quiet, loud and kick.

1. **First version.** One analogous ember palette, base hue 0.04 to 0.12 turns, shading by an RGB
   multiply.
   - All 7 audio checks PASS: quiet to loud diff 7.31, kick 6.35, loud/quiet luminance 1.10,
     kick/loud 1.16, silent motion 8.17.
   - Stills WARN: `hotPink` 0.17 to 0.21 (the 0.04 base reads pink in OKLab), `colours` 287 to 290.
   - A per-frame `iTime` grain was replaced with a fixed canvas grain before the run, because it
     would flicker.
2. **Base to 0.11, alternate ribbons teal, shading in OKLab L, violet veil, kick rim 1.6.**
   - `hotPink` dropped to 0.10 or less and `colours` rose to about 700.
   - The frame read mostly teal: the parity of `floor(h * 3)` lands on one value because fbm clusters
     near 0.5.
   - `kick/loud` 1.30 WARN.
3. **Hue split by a coarse noise.** The whole frame went ember: `hueConc` 0.90 to 0.96 WARN on
   10 of 11 stills, and `kick/loud` 1.27.
4. **Hue split by two spiral arms (geometry, periodic), kick rim 0.8.** Every check PASS:

   | Check | Value |
   |---|---|
   | silence `lit` | 0.23 to 0.36 |
   | `grey` | 0.005 to 0.008 |
   | `hotPink` | 0.03 or less |
   | `hueConc` | 0.37 to 0.55 |
   | `colours` | 2500 to 2950 |
   | quiet to loud diff | 9.2 |
   | loud to kick diff | 9.4 |
   | loud/quiet luminance | 1.27 |
   | kick/loud luminance | 1.22 |
   | silent motion over 1 s | 7.29 |

   - sparkle-score (synth trace, 90 frames, 408x816): `flipMean` 0.116, `motion` 0.66,
     `sparkleFrac` 0.002, `greyFrac` 0.016.
5. **Cost.** The headful sweep drew 31 frames in 8 s on SwiftShader against plasma's 120.
   - The warp went to 2 octaves and is now shared by the rim sample: 24 noise calls per pixel down
     to 12.
   - Bench (`sparkle-score --bench 20`, 408x816, SwiftShader, ms per frame): silk-vortex/1 51.0,
     plasma 19.6, clit-vibej/2 with its controller 194.9 (that one ran the 11-22 show on a phone).
   - Gate re-run: `loud/quiet` luminance rose to 1.30 (WARN), so bass thickening went from 0.12
     to 0.09.
6. **Final.** All 17 checks PASS:
   - quiet to loud diff 7.15, loud to kick diff 7.44
   - loud/quiet luminance 1.23, kick/loud 1.19
   - silent motion over 1 s 6.67
   - sparkle-score: `flipMean` 0.116, `motion` 0.64, `sparkleFrac` 0.002

## Real audio

Firefox, `audio_file=/test-audio/verify-beat.mp3`, after 8 s:

- 193 feature keys, energy 0.015, onsetKick 0.11, 460 frames, no page errors.
- Canvas: `~/paper-cranes-proof/20261126T042022Z-97e5d884/open/silk-audio-canvas.png`.

## Not verified

- Frame rate on a real phone. Only the SwiftShader ranking above was measured.
- Minutes-long drift with `?vj=1`.
- Aaron's eye.
