# the-coat-13

Forked from `the-coat-12.frag` (iter 25) — clean "figure-first" state after surgical background cleanup. The fork captures the moment where dubstep daddy is back in focus: four prior-vetoed background blocks removed (RGB SPLIT, SCAN LINE, LIGHTNING, COSMIC SHOCKWAVE), and three ring/aura effects gated to `drop_hit` so they only fire on real drops (SUB RING, GROUND QUAKE, BLACK HOLE).

Companion session journal: `journals/the-coat-12-cool-moments.md`.

## Baked knob state at fork time

| Knob | Value | Role |
|---|---|---|
| knob_1 | 0.165 | zoom |
| knob_2 | 0.630 | climax dampener |
| knob_3 | 0.000 | VJ CHAOS HALO amount + characteristics (off) |
| knob_4 | 0.000 | eye wash override (off) |
| knob_5 | 0.000 | drop-zoom punch scale (0 kills) |
| knob_6 | 0.016 | camera tilt swagger (off) |
| knob_7 | 0.000 | fur thickness / trails (off) |
| knob_8 | 0.400 | (unused) |
| knob_9 | 0.000 | feedback amount (off) |
| knob_10 | 0.330 | (unused) |
| knob_11 | 0.500 | (unused) |
| knob_12 | 0.000 | outline/shadow (off) |
| knob_13 | 0.000 | VJ BEAT STROBE intensity (off) |
| knob_14 | 0.000 | VJ SIGIL SWIRL intensity (off) |
| knob_15 | 0.031 | VJ DRIP + DRIP POOL intensity (nearly off) |

User has most knobs near zero — essentially "baseline figure only" state — which is exactly the config the fork captures.

## Preset URL

`?shader=redaphid/wip/the-coat-fur-coat/the-coat-13&controller=the-coat&knob_1=0.165&knob_2=0.63&knob_3=0&knob_4=0&knob_5=0&knob_6=0.016&knob_7=0&knob_8=0.4&knob_9=0&knob_10=0.33&knob_11=0.5&knob_12=0&knob_13=0&knob_14=0&knob_15=0.031`

## Music during fork

*Nobody Else (with Kaleena Zanders) – GRiZ, Kaleena Zanders*.

## Notes on the fork

- This is the **"figure-first" baseline**. Nearly every knob at 0 — confirms the scene reads well as just body/coat/eyes/rim/fur. Background effects are opt-in per knob.
- Removed (do NOT re-add): RGB SPLIT, SCAN LINE, LIGHTNING, COSMIC SHOCKWAVE, plus the older CRYSTALLINE FACETS + MERCURY FLOW.
- Gated to `drop_hit` (so ambient music doesn't fire them): SUB RING, GROUND QUAKE, BLACK HOLE.
- Safe landing point if a future iteration goes wrong; knobs-at-0 gives a clean silhouette you can build up from.
