# lattice-bead/2 — Session Journal

## Status
Iter 2 of a `/vibej` run on port 6994 (worktree `pc-lab-sub2`, branch `lab/substrate2`, PR #139).
Audio source: user-shared Spotify **tab audio**. First session ever run against real music —
every previous number in this shader's history came from a frozen frame with synthetic audio.

## Cool moments

### Live audio finally exposed an inverted mapping (iter 1)
- **Audio fingerprint** — `energySpring` 0.014–0.457 over 8.4 s of real playback.
- **What worked** — nothing yet; the measurement itself was the win.
- **What was missed** — correlating `energySpring` against canvas brightness gave **−0.682**
  and against contrast **−0.579**. Louder music made the frame *darker and flatter*. The seed's
  ground-recede was a ratchet with no counter-ratchet. Synthetic quiet/drop testing could not
  see this: it measured *magnitude* of change (mean |delta|), not its **sign**.
- **Design hypothesis** — a reactivity metric that ignores sign will happily score an inverted
  mapping as "very reactive". Always correlate, don't just diff.

### Counter-ratchet (iter 1–2)
- Beads now GAIN (`lush(s,0.95) * cov * (0.05 + 0.58*pump)`) as the ground recedes.
- corr(energy, contrast) −0.579 → **+0.881**, then settled at +0.237 after rebalancing.
- corr(energy, brightness) −0.682 → **−0.109** (neutral).
- Canvas ranges widened: mean 93.9–110 → **65.3–91**, contrast 25–29 → **25.7–33.6**.

## Todo
- [ ] Correlations are measured over a single ~8 s window of one track — passage-dependent and
      noisy. Re-measure across several tracks before trusting any single number.
- [ ] Seed pitch (`K169`) is absolute and does not track the octave zoom; needs the non-audio
      section plateau (`0.60 + evoA*0.20`), NOT `gHexR` which carries a per-frame audio term.
- [ ] `fitGamut` maps onto the gamut *boundary*; a soft knee would let `K166` go higher without
      getting harsh.
- [ ] `1.frag` and `bright.frag` still carry the unfixed `SECH` hash.

## History of changes
- Seed depth was a FIXED 0.40 ground — a static mask over half the frame costing 29% of all
  visible reactivity. Made it breathe on `energySpring`. Do not re-fix it.
- `LV_RICH` 2.8 drove blue 2.6× hotter than R/G and clipped 13% of pixels into flat fuchsia.
  Back to 1.0 (lattice-9's chroma). Do not raise chroma without re-checking the clip number.
- Default theme changed vj9 → luminous: vj9 measures 21% under the lattice-vj/9 reactivity
  benchmark because its low lightness base leaves the ground no room to drop.

## Design hypotheses for v(next)
- Reactivity has a **sign**, and magnitude-only metrics hide inversions. Correlate against
  brightness *and* contrast; a good drop should raise both, or at minimum hold brightness flat
  while contrast climbs.
- Anti-clipping work costs dynamic range. `softClip` compresses exactly the loud passages that
  used to punch — budget headroom (higher L base) to buy it back.
