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


### Live Prydz set exposed THREE dead subsystems the bench could not see (iters 4-5)
- **Audio fingerprint** — Eric Prydz set, long progressive windup. `energySpring` 0.18-0.35 rising,
  `quietGate` 0.03-0.21 rising, `energyZScore` range 1.20, `sectionMode` = 3.
- **What worked** — sampling the live RANGE of every consumed uniform, then attacking whatever read 0.000.
- **What was missed (the findings)** —
  1. **All 7 wavelet springs read exactly 0.000** without `?wavelet=true`. `bassLive`/`midsLive`/`trebLive`
     are *defined* from them, so bass/mids/treble reactivity was entirely dead. The synthetic bench
     PINS these, so it can never catch it. After the param: bass 0.410, bands 0.350-0.463, centroid 0.329.
  2. **`quietGate` averaged 0.012** through the windup and multiplies 37 audio terms — the whole shader
     was gated off exactly when a progressive build is most interesting. Floored at 0.35 (`QGATE`, K178).
  3. **`energyZScore` had range 1.20 and ZERO references** — the strongest fast signal on the input,
     completely unused. Now drives a one-way contour flare (K179).
- **Design hypothesis** — before tuning any mapping, measure the live RANGE of every input it consumes.
  A mapping on a flatlined feature is invisible no matter how well tuned, and a bench that pins its
  inputs is structurally blind to it.

## Todo
- [ ] Judge the DROP: `energyZScore` only reached 0.63 during the build; the K179 contour flare is
      armed but unproven until a real drop lands.
- [ ] `evoWarp`/`evoPlasma`/`warpGrow` are section-hashed plateaus — constant within a section by
      design. Confirm they actually step on the next section change.
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
