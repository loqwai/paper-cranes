# H8 — the reverse split: bead on the COARSE levels, hexagon on the FINE

Branch `lab/revsplit`. Port 6986 (6983 was already answering — another teammate's server; vite
ignores `PORT` and walks upward, so the assigned port was never mine. Every capture asserts 6986).

**Verdict: PARTIAL.** The perf half is a clear yes. The legibility half is a no — and the reason
it is a no is the most reusable thing this run produced.

## Orientation, verified in the source (not assumed)

`scale *= s` runs **before** `if (i < FIRST) continue;`, and `alias = aliasBase * 0.5 * scale`
widens with `i`. So **high `i` = FINE**. `ld = (i-FIRST)/(LEVELS-1-FIRST)`, `LEVELS 10`, `FIRST 4`
→ 6 drawn levels, i=4 (coarsest) .. i=9 (finest). H3 put the bead on i=7,8,9. H8 puts it on i=4,5,6.

Confirmed empirically as well: the `fwd-split` control changed only the *interior texture* and left
the straight-line lattice frame untouched — exactly H3's reported "warm dirty texture overlay".
`rev-split` changed the frame. The experiment was wired the right way round.

## Implementation — a real branch, not a `mix`

`mix(hexTerm, beadTerm, W)` evaluates both operands, so `beadDist()`'s dependent texture fetch runs
on every level regardless of `W`. `revsplit.frag` replaces it with a **uniform-invariant branch**
(`if (useBead) cellD = beadDist(...) else cellD = hexDist(...) - hexR_i`), so the fetch is genuinely
skipped on hexagon levels. `SPLIT_MODE` = `knob_162` (0 all-hex / 0.25 all-bead / 0.5 fwd / 0.75 rev),
`REV_SPAN` = `knob_163` (1..3 coarse levels). Both are GEOMETRY — hand knob only, no audio.

## The headline number

RMS luminance distance between arms, controller-off, seed-pinned, full resolution.
`RMS(all-hex, all-bead)` is the whole effect = 100%.

| arm | levels with the bead | kiku | ume |
|---|---|---|---|
| fwd-split (H3) | i=7,8,9 — FINE   | recovers **6.0%** | **6.8%** |
| rev-split (H8) | i=4,5,6 — COARSE | recovers **93.6%** | **91.7%** |

**Three coarse levels carry 92–94% of the entire bead effect. Three fine levels carry 6–7%.**

Split point, same metric — each successive coarse level adds about a third of what is left:

| rev span | kiku | ume |
|---|---|---|
| i=4 only | 62.4% | 62.6% |
| i=4,5    | 84.4% | 81.9% |
| i=4,5,6  | 93.4% | 91.9% |

**Settled on i=4,5,6** (`knob_163=1`): it is the 50/50 mirror of H3, and since ms/frame is flat
across all three spans there is no cost reason to take fewer levels.

## Perf — offscreen, 2048², 9 interleaved rounds × 60 draws, RTX 4090

| arm | ms/frame (median) | IQR |
|---|---|---|
| all-hex    | 0.390 | 0.380–0.393 |
| all-bead   | **0.483** | 0.477–0.490 |
| fwd-split  | 0.378 | 0.375–0.383 |
| rev-split (i=4,5,6) | **0.382** | 0.377–0.388 |
| rev-split i=4 / i=4,5 | 0.382 / 0.385 | — |

rev-split is **21% cheaper than all-bead** and statistically **indistinguishable from all-hex**.
So it buys 93% of the visual effect for none of the measured cost.

⚠ **Arm order aliases onto the result.** The first version ran arms in sequence with a 5-draw
warm-up and reported all-hex (0.410) as *slower* than the splits — GPU clock ramp, not shading cost.
Warm every arm first, then interleave rounds. Added to `lab-bench.mjs`.

## Lit coverage — the quantitative signature of the size mechanism

Full resolution, PIL/numpy, never canvas2D. n=3 (t=4/8/16 captures); spread ≤0.04 meanLum (0.3%).

| arm | meanLum kiku | lit >20 | bright >50 |
|---|---|---|---|
| all-hex   | 9.34 | 5.63% | 0.57% |
| fwd-split | 11.39 (+22.0%) | **6.68%** (+1.05pt) | 0.85% |
| rev-split | 12.58 (+34.7%) | 5.77% (+0.14pt) | **1.49%** |
| all-bead  | 12.81 (+37.1%) | 5.90% | 1.54% |

ume: 9.33 → fwd 11.35 (+21.6%) / rev 12.35 (+32.4%) / all-bead 12.64 (+35.6%).

The two splits move **opposite metrics**, and that is the mechanism in numbers:
- **fwd-split** raises *lit* coverage the most but *bright* coverage the least → many dim pixels
  spread everywhere. That is speckle: a motif shrunk below the size where it can hold a silhouette
  becomes texture.
- **rev-split** barely moves lit coverage but nearly **triples** bright coverage → fewer, larger,
  stronger marks. That is what a legible silhouette looks like on a histogram.

Every bead arm **brightens** (+22% to +37%), consistent with the corrected all-motif finding. The
counter-ratchet is therefore live, and per the channel hierarchy it belongs in relief / per-depth
bands / rim / fill thresholds — **never** the global multiplier. Not implemented here (one hypothesis).

## Why the legibility half is still NO

`rev-split` does **not** read more clearly than `all-bead`; it reads ~93% *identically* to it, and
where the two differ `all-bead` is marginally more coherent, because every scale agrees on one motif
whereas rev-split shows straight-line fine filigree inside curved coarse cells — two visual
languages at once.

And the brief's stated risk landed: **the coarse levels are also the lattice's structural skeleton.**
In the contact sheet the crisp straight-line hexagonal frame that makes `all-hex` readable is gone in
`rev-split`, exactly as it is in `all-bead`.

> **The reusable conclusion: the levels that carry the motif and the levels that carry the skeleton
> are the SAME levels.** No level-split can keep the familiar lattice frame *and* show the bead —
> that trade is not addressable by choosing which recursion depths get the bead. Anything that wants
> both has to separate them on a different axis than recursion depth (e.g. the `delt2` cross term,
> which is drawn on every level and is untouched by the bead swap — it is the only part of the
> skeleton that survives all four arms).

No arm is nameable as a chrysanthemum or a plum blossom, at any level. Expected: `fractal()` takes
`abs(p)` before the cell distance (4-fold mirror) and `beadDist`'s texture coordinate reaches ~1.68,
so `REPEAT` wrap pulls neighbouring copies in and a closed single motif is never presented whole.

## Method notes / traps hit

- Port 6983 was occupied; vite silently used 6986. Assert the port, never assume it.
- All my first-pass luminance numbers were captured with `lattice-nav` ON and are void — they said
  the bead arms were *darker*, the opposite of the controlled result. Controller-off + seed-pinned
  gives 0.3% spread. Visual judgement with the controller on, every number with it off.
- The controlled captures are software-rendered and very dim; judge form from a gamma-boosted copy
  (`scripts/lab-boost.py`, γ=0.40) and measure only from the raw ones.

## Files

- `shaders/redaphid/wip/lattice-bead/revsplit.frag`
- `journals/lab/shots/contact-revsplit-boosted.png` — the sheet the verdict was written from
- `journals/lab/shots/contact-revsplit-arms.png` — same tiles, unboosted
- `scripts/lab-lum.py`, `scripts/lab-boost.py`, patched `lab-bench.mjs` / `lab-capture.mjs`
