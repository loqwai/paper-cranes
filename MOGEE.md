# `mogee` — the collected visuals for MOGEE FEST (2026-09-06)

Branched from `lab/substrate2` on 2026-09-04. This branch gathers every *working* visual produced by
the lattice-bead lab wave into one tree, each as **its own file**, so nothing has to be recovered
from a scratch branch during the show.

Sixteen `lab/*` branches were surveyed. They all share one base and each adds essentially **one**
unique shader; `lab/substrate2` was already the superset (86 commits, and it had already absorbed
the three reactivity agents' forks as `5/6/7.frag`). So this branch is `lab/substrate2` plus the
unique shader from each remaining branch.

## What is here — `shaders/redaphid/wip/lattice-bead/`

Screened headlessly at fixed seeds, `noaudio`, `time=8`, `image=mon-hakkaku`, with the
controller-supplied uniforms passed as URL params. `lum` / `sd` are frame luminance and its standard
deviation out of 255.

| Shader | From | lum / sd | Notes |
|---|---|---|---|
| `1.frag` | substrate2 | 57.8 / 22.3 | the shared substrate |
| `2` `3` `4` `5` `6` `7` | substrate2 | ~104 / ~25 | `4` is the LEGIBLE figure/ground keeper (33 presets). `5/6/7` are the rhythm / colour / ChromaDepth agent forks |
| `arrival` `bright` `detail` `negative` | substrate2 | 104–137 | palette + entrance work; `detail` carries the five quiet channels and per-bead breathing |
| **`hero`** | substrate2 | 58.2 / 60.5 | **hero bead + satellites. Has a known defect — see below.** |
| `hero-folded` | `lab/hero` | 81.2 / 59.8 | the earlier fold-based hero attempt. **Renamed** — it collided with substrate2's `hero.frag`, which is a different architecture |
| `tile` `grid` | `lab/tile` | 137 / 46, 94 / 99 | `grid` has by far the highest contrast in the family |
| `nfold` | `lab/nfold` | 137 / 46 | |
| `whole` `onelevel` | `lab/whole` | 57.8 / 22.3, 11.2 / 16.2 | `onelevel` is much darker (32% ink) |
| `split` `split-branch` | `lab/split` | 57.8 / 22.3 | |
| `revsplit` | `lab/revsplit` | 57.8 / 22.3 | |
| `fill` | `lab/fill` | 57.8 / 22.3 | |
| `tomoe` | `lab/tomoe` | 57.8 / 22.3 | |

**23 of 24 compile and render.**

## What was left out, and why

- **`kiku.frag` (`lab/kiku`) — excluded, it is dead.** Renders black (lum 1.1, **0% ink**) in all four
  configurations tried: bare, with its baked preset knobs, with `lattice-nav`, and with its own
  `mon-kiku.png`. No GLSL errors — it compiles and draws nothing.
- **`ume.frag` (`lab/ume`) — excluded as a duplicate.** It is **byte-identical** to
  `lab/tomoe`'s `tomoe.frag` (md5 `0e787676…`). Those two branches varied the `?image=` motif, not
  the shader, so the variation is a URL preset and not a second file.
- **`probe.frag`, `tomoe-probe.frag` — excluded.** Diagnostic instruments, not visuals.

## ⚠ Two things to know before relying on this at the show

1. **`hero.frag` has a measured defect: the background flashes on the beat** — driving the fast
   channels repaints **53% of the frame**, which violates the "no shuddering background" constraint.
   The cause and the three-line fix are written up in `HANDOFF-substrate2.md` §3. **It is not ready
   to project.** Everything else in the table is unaffected.

2. **Several shaders render *identically at default parameters*.** `fill`, `revsplit`, `split`,
   `split-branch`, `tomoe` and `whole` all produce exactly `1.frag`'s frame (57.79 / 22.27), and
   `bright`, `nfold` and `tile` all produce the same frame as each other (136.69 / 46.20). The files
   genuinely differ — their distinguishing features are gated behind knobs and presets that default
   to off, and the screen ran with flat audio. **Do not expect variety from flipping through them at
   default URLs**; they need their knobs. This screen proves each shader *compiles and draws*, which
   is what it was built to prove — it does **not** rank them or establish that they look different.

See `HANDOFF-substrate2.md` for the full state of the work, the open decisions, and the traps.
