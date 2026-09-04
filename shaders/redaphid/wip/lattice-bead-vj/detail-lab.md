# detail-lab.frag — cells enhancer lab notes (2026-09-04)

Base: shaders/redaphid/wip/lattice-bead/detail.frag -> lab copy shaders/redaphid/wip/lattice-bead-vj/detail-lab.frag
Unified diff: detail-lab.diff (this folder). Shots: detail-lab-*.png (this folder).
Renderer: scripts/lab/detail-lab-shot.mjs <name> "<extraQuery>" [--tall] [--twice]  (PORT env; lab used a private 6999)

## Pinned-time method (proven)
`?time=8` holds iTime (index.js pinnedTime), `noaudio=true`, seeds pinned (seed/seed2/seed3), and EVERY
controller-output uniform the shader declares passed as a URL param (URL params win every frame).
Two shots 3 s apart: identical stats (lum 59.6 / sd 47.7 / bright 38.9). Frame feedback converges in ~3 frames.
Trap: `arrive=0`, `detail=0` etc. are "unset" and fall back to defaults — use 0.001.

## Accepted (ranked)
1. FRAMING navZoom=0.065 (+knob_169=0.60): 4x3 whole crests, every one nameable (1a). Preset 0.14 = one crest.
2. INTERIOR FROM THE OUTLINE negative=0.7 (knob_181 live): two inset copies of each crest's own contour (1c).
3. RIM AS BRIGHTEST rimboost=1 (code): ink lit 0.62-0.80 -> 0.48-0.66, flatten 0.72 -> 0.86, rim gain
   0.22/0.45 -> 0.38/0.60. Contour is now the crispest brightest element (3c vs 3a).
4. BOLD LEVELS knob_132=0.25 with knob_131/133/134/135/136=0.5 (bank4 must be fully set): coarser ground cells (2d).
5. CALM INTERIOR detail=0.001 (grain/haze/trend rings off) + evoPhase low: evoPhase 6 opens every fold level
   (gLevelOpen 0.39) = the speckle. Untested code idea: cap gLevelOpen at 0.25.
6. RINGS rings=0.9 (code, exterior contour copies on a monotonic phase, sin-windowed fract): reads as a soft
   second halo, not distinct travelling rings — the star's points reach the tile edge so the gap is narrow.
   Harmless, optional. Phase 3.0 vs 4.2 moved it outward one-way, no seam (3a vs 3b).

## Rejected
- theme=3 (H10 curve): pastel wash, lum 64 -> 84 (1b).
- knob_176 5-tap filter: vertical/horizontal streak artefacts at tile edges (3d).

## Aspect
uv = (fragCoord - 0.5*iResolution.xy) / iResolution.y: square units. 1200x900 and 900x1200 keep the
8-point star's proportions (0-tall, 4a-tall). Nothing to fix.

## Not done (time)
Wavelet stub sweep (springs 0.2 vs 0.7) for line lighting; rings use midsLive (band 2/3 springs) only.
