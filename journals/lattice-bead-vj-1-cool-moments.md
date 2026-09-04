# lattice-bead-vj/1 — Session Journal

## Status
2026-09-04 vibej2 live run (MOGEE prep). Live target `shaders/redaphid/wip/lattice-bead-vj/1.frag`
= copy of `lattice-bead/4.frag` + beats below. Wall: user's fullscreen jam tab (out of MCP reach after
fullscreen); edits hot-swap from disk via editor-sync. Monitor: `node scripts/lab/live-shot.mjs <prefix>`
(headless, audio stubbed). Critic round 3 on the wall: still 8/10 ("neon sheriff's badge, keep this
palette"), motion 5/10 (glide-lurch-glide on drops) → beat 3.

## Cool moments
- **Beat 4 rings** — inset copy of the crest's own outline inside each star, star-shaped ripples between
  crests travelling one-way on flowPhase. Every visible cell interaction is the bead. Crest centred at
  rest (navX/Y=0), neighbours peek in. `live-b4-*.jpg`.

## Todo
- `[ ]` user: "center the bead silhouette in many cases; drift and repetition fine" — at rest it is
  centred; consider navZoom0≈0.09 on the next reload so neighbours show whole (cells-lab: 0.065 = 4x3 grid).
- `[ ]` user: "slower features (medians, slopes) on palette and slow shapes" — beat 2 hue done; beat 5 ring spacing.
- `[ ]` user: "no sudden 1-frame camera changes" — beat 3 cut drop plateaus ~3x; verify on a real drop.
- `[ ]` per-bead golden-ratio tint (lab keeper, small).
- `[ ]` hero centred variant: `2.frag` (hero-folded copy) + hero-lab patch pending; user may switch to it:
  `?shader=redaphid/wip/lattice-bead-vj/2&image=images/beads/mon-hakkaku.png&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls&navZoom0=0.218&knob_1=0.429&knob_134=0.507&wavelet=true`

## History of changes
- Beat 1 (knobs, not code): K173 light base 0.10, K174 slope 0.55 (1.2 washed out), K175 bg 0.25, K164 ceiling 0.35.
- Beat 2: SLOWHUE-B2 — hue += key/centroid/entropy medians (slow). `uniform spectralCentroidMedian` added.
- Beat 3: drop plateau amplitudes cut — twist step 0.16→0.05, fold ratio 0.14→0.05, level window 0.35→0.12,
  warpGrow 0.04→0.012, paletteShift ×0.35. Reason: user + critic saw a one-frame lurch on drops.
- Beat 4: OUTLINE-ECHO RINGS (lab patch), K182 ECHO AMOUNT, baked 2.5 / spacing 0.09.
- Dropped: bead-shaped fold skeleton (speckle at show framing, lab verdict).

## Traps this run
- Fullscreen (canvas click) ejects the jam tab from the MCP group; a second tab in the same window steals
  the foreground and freezes the wall. Monitor headlessly instead.
- The Playwright MCP is the user's PERSONAL browser — never use it.
- A temp `.frag` created+deleted under `shaders/` crashed the dev server's shader plugin (ENOENT).
- `patch` fails on CRLF/LF mismatch; use `git apply` with a patch built against the current file.

## Forks
- `lattice-bead-vj/1 ← lattice-bead/4` (this run). `2 ← lattice-bead/hero-folded`. `spiral` new (hearts-style).
