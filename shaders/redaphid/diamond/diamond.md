# Diamond (ChromaDepth)

A faceted brilliant-cut gem engineered to **pop forward** through ChromaDepth glasses — the
refactor of the jumpy, vibe-coded chromadepth set, rebuilt with the `iris/1` discipline.

**Preview:** https://visuals.beadfamous.com/?shader=redaphid/diamond/1&wavelet=true&controller=wavelet-ease&fullscreen=true

## What makes it pop

ChromaDepth fuses depth from hue (red = near, violet = far). To maximise the pop:
- **Front-to-back gradient** — colour comes from ray-hit distance *across the stone*, so the
  nearest facet is red and the depth recedes to violet.
- **Hot red fresnel rim** on the silhouette throws the edge toward the viewer.
- **Blue inner depth** — where a facet faces you (low fresnel) you "see into" the stone toward
  blue, giving real near/far volume.
- **Forward kick-zoom** on the beat — the camera physically lunges in, then springs back.

## The refactor (vs the old chromadepth shaders)

| Old (vibe-coded) | Diamond |
|---|---|
| raw `bassZScore`/`beat` → geometry & colour | smooth `*Spring` + `spectralCrestSmooth` |
| `iTime*rate`, audio added to angle (rock-back) | monotonic `spinPhase`/`morphPhase` accumulators |
| `beat ?` one-frame flash | smooth `pop` (redward) + kick-zoom |
| no quiet protection | `quietGate` fades reactivity in silence |
| whole-frame brightness ×z-score | colour rides geometry; background stays violet/black |

## Audio mapping (all via `wavelet-ease`, quietGate-protected)

- **bass** (`waveletBassSpring`) → gem breathe + kick-zoom
- **low-mid** (`waveletBand2Spring`) → facet bloom
- **treble/air** (`waveletBand5Spring`) + **crest** (`spectralCrestSmooth`) → diamond "fire" sparkle
- **brightness** (`waveletCentroidSpring`) + **melody** (`melodyFlow`) → slow palette rotation
- **energy** (`energySpring`) → rim + facet glow
- **beat** (smoothed `pop`, raw `waveletBassZScore`/`wavelet_bassHit` for the transient zoom only)

Self-morphs with **no mic** (iTime base motion); springs add on top when audio is present.
License: CC0.
