# rezz-3

Forked from `rezz-1` on 2026-10-03 during a `/vibej2` run (VJ iteration 5, mid audio-wiring), ambient
laptop mic, dark brooding synthwave playing. Snapshot of the frame on the projector when the user called `/fork`.

## Lineage
`moody-octopus2` → `rezz-1` → `rezz-2` (iter 4: spiral + Julia-textured arms, barely audio-reactive)
→ **`rezz-3`** (same look, now wired to 12 audio features)

## Audio mapping
Every driver passes through `D_()`, which scales it by `QUIET_GATE` so silence rests at the calm look.

| Visual role | Feature | Mapping |
|---|---|---|
| master gate | `energy` (raw) | `smoothstep(0.005, 0.012, energy)` |
| red rim glow + thickness | `bassNormalized` | `smoothstep(0.30, 0.80)` |
| arm texture brightness | `midsNormalized` | `smoothstep(0.45, 0.95)` |
| violet trailing rim | `trebleNormalized` | `smoothstep(0.25, 0.80)` |
| texture flash on hits | `spectralFluxZScore` | dead-zoned `smoothstep(0.30, 1.00)` |
| Julia c morph (real) | `spectralCentroidNormalized` | centred offset |
| Julia c morph (imag) | `spectralSpreadNormalized` | centred offset |
| texture scale (Julia zoom) | `spectralKurtosisNormalized` | `smoothstep(0.20, 0.90)` |
| filament line width | `spectralCrestNormalized` | `smoothstep(0.20, 0.90)` |
| glow under the filaments | `spectralRoughnessNormalized` | `smoothstep(0.20, 0.85)` |
| texture slides across the arm | `spectralEntropyNormalized` | centred offset |
| hue tilt red → violet | `spectralRolloffNormalized` | `smoothstep(0.25, 0.85)` |

## Knobs
None. No knobs set, no controller active.

## Preset URL
`/jam.html?shader=redaphid/wip/moody-octopus/rezz-3`

See `journals/rezz-1-cool-moments.md` for the iteration history.
