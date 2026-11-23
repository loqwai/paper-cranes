# lace-lab

A diagnostic fork of `clit-vibej/1`, made 2026-11-22 to find why the clit lace sparkles. Not a show shader.

Every `lab_*` query param defaults to 0, which renders clit-vibej/1 as it was before the LACE AA fix. Each
switch removes one suspect, so `scripts/sparkle-score.mjs` can score the frame with and without it:

| Param | Effect |
|---|---|
| `lab_coil=1` | no coil twist in the iteration |
| `lab_und=1` | no undulate ripple on the input domain |
| `lab_freeze=1` | the coil and undulate wave phase held at 0 |
| `lab_bass=1` | bass no longer thickens the lace threshold |
| `lab_treb=1` | treble no longer lights the braid, rim, twinkle and stars |
| `lab_zoom=<x>` | extra zoom into the lace |
| `lab_eps=<e>` | C scaled by 1+e (sensitivity of the orbit to a tiny change) |
| `lab_view=1` | lace mask only (R, B = lace, G = braid) |
| `lab_view=2` | unresolved-lace detector: R from the tracked derivative, G from `fwidth` |
| `lab_taa=1` / `2` | temporal accumulation where `fwidth` / the derivative says unresolved (prototype of the fix) |
| `lab_det=1` / `2` | derivative detector on all traps / on the x and y traps only |
| `lab_taamax=<f>` | accumulation weight (default 0.85) |
| `lab_nogate=1` | drop the iter 10/11/13 `fwidth` dimming gates |

Results are in [docs/sparkle-score.md](../../../../docs/sparkle-score.md). Every switch except more samples per
pixel lowered the score by 1% or less (freezing the wave phase raised it 11%), so the sparkle is aliasing.
