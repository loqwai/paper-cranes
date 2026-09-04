# lattice-bead-vj/chroma.frag — ChromaDepth bead lattice, TUNNEL mode

Forked 2026-09-04 from `lattice-bead/7.frag` (the measured ChromaDepth fork of `4.frag`: hue spent
only on depth, exposure carries all the audio, bead-masked onset pop, 0% near-white by construction).
Everything 7.frag established stays; this file adds **mode 2, TUNNEL**, and makes it the default.

## The look
- **The outline is the nearest thing in the frame** — a thin, brilliant red line (`rimT`, exposure forced to 0.94).
- **The interior steps BACK in terraces** toward a dark green well: orange, olive, green, dark green. Terrace
  spacing grows toward the centre (sqrt warp) and every step is darker (exposure ladder 0.72 → 0.26), so
  the crest reads as a funnel/staircase into shadow through the glasses and as a relief without them.
- **Ripples leaving the crest step out to violet**: cyan just outside, blue, violet far, on the same terrace
  mechanism, so cell-to-cell interaction is the crest's own outline receding.
- **Terrace edges travel one way** on `flowPhase*0.12 + bTime*0.05`, emitted by the outline in both
  directions (inward to the centre, outward to the neighbours). The terrace is a bounded periodic correction
  of the true distance, so every point's mean depth is its true distance: nothing drifts, nothing snaps.
- **Per-bead depth**: each crest is pushed back by 0..0.16 (golden-ratio spread over the seed tile, crossfaded
  with the seed octave so it never steps; rims stay nearest), so neighbours sit at different depths.
- **Beat**: 7.frag's bead-masked onset pop, baked ON at 0.6 (`?cdpop=0.001` to disable). Local shading only.
- No audio anywhere in depth. Echo lines are exposure only; their amplitude takes `bassLive` (a spring).

## Knobs
K184 CD MODE (0 shelf / 0.5 dome / 1 tunnel; `?cdmode=0.001|1|2`), K188 TERRACE SPACING, K189 ECHO LINES,
K190 BEAD DEPTH SPREAD, plus 7.frag's K181 off, K182 pop, K183 exposure, K185 dome, K186 gap, K187 texture.

## Measured (headless, stubbed audio, hakkaku, 1100x900)
| framing | lum | dark<20 | bright>50 | near-white |
|---|---|---|---|---|
| close (navZoom0 0.14) | 52 | 35% | 41% | 0% |
| wide (navZoom0 0.075, 9 crests) | 58 | 22% | 52% | 0% |
| tall 700x1100 | 61 | 24% | 55% | 0% |
Aspect: uv is divided by `iResolution.y` only (unchanged from 4.frag); the crest keeps its shape at 700x1100.
Critic round 1 (equal bands): still 7 / motion 7 → "thin brilliant rim, bands wider and darker inward" → done.

## URLs
Close: `?shader=redaphid/wip/lattice-bead-vj/chroma&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls&image=images/beads/mon-hakkaku.png&knob_161=1&knob_168=1.0&knob_169=0.60&legible=1&navZoom0=0.14&wavelet=true&onset_refractory_ms=380`
Wide: same with `navZoom0=0.075`. Tomoe: `image=images/beads/mon-tomoe.png` (a rainbow comma, chirality kept).
Render: `node scripts/lab/chroma-shot.mjs <prefix> [frames] [gapMs]` with env `PIN=1`, `IMG=`, `NAVZ=`, `W=`, `H=`, `EXTRA=`.
