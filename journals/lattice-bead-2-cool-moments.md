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

## Gotchas found live (do not re-learn these)
- **`beat` fires at ~280 BPM** on a 122-128 BPM progressive set — 49 distinct onsets in 10.5s,
  roughly 2.2x the musical pulse (it catches hats, not kicks). Harmless in THIS shader because all
  four `beat` references are in COMMENTS and nothing consumes the uniform. Do not wire `beat` to a
  visible effect expecting a musical pulse without gating it on a bass-band onset first.
- **Polling rate hides single-frame flags.** Counting `beat` at a 140ms setInterval gave "1 beat in
  8.4s" — an undersampling artifact. Count per-frame with requestAnimationFrame, and count RISES
  (false->true) rather than true-frames.
- **z-scores do not reach +/-1 on real material.** Measured peaks 0.4-0.6 with a NEGATIVE mean.
  Always measure max AND mean before choosing a scale factor.
- **A flare with a >50% duty cycle is a glow, not a flare.** Square the drive to keep peaks and
  suppress the middle: duty above 0.2 went 53% -> 36% while max stayed 1.0 and corr(flare, contrast)
  IMPROVED 0.208 -> 0.291.

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

---

# FORKED TO 3.frag — 2026-09-04 ~05:00 (session continues in this file)

`2.frag` is frozen as the structure-run snapshot. `/vibej` now targets `3.frag`.
User went to sleep with the instruction: *"I need to sleep and want to come back to a large
variety of good visuals"* and *"Focus on not making those jitter/shudder mistakes we documented."*
Audio keeps playing (virtual mic) — live reactivity work stays valid, but no human judgement is
available, so the working rule is **fork distinct looks rather than mutate one file toward a
local optimum**.

## Verified: the onset fix holds on live audio

1289 frames sampled on the live jam tab (Prydz set, real music, `quietGate` mean 0.718):

| signal | jitter/frame | range |
|---|---|---|
| flare = `onsetEnvelope(0.012,0.16) * clamp(onsetStrength*1.8,0,1) * QGATE` | **0.0076** | 0 → 0.481 |
| `energyZScore` (the driver it replaced) | 0.0514 | −0.789 → 1.175 |
| frame luminance (0–255) | 0.63 | 74.1 → 92.8 |

The flare is **6.8× smoother** than the z-score, and whole-frame luminance never strobes.
`waveletBassSpring` alive at 0.128–0.674, so `?wavelet=true` is doing its job.

## NEGATIVE RESULT 1 — the mon axis is saturated, and it fails the recognition test

`beads-all.png` at the shipped framing: all 11 mon are **nearly indistinguishable**. The dominant
forms in frame (the pink clover lobes, the green blobs) are produced by the **lattice fold**, not
by the motif; the mon only ever reaches the fine panel detail. This is the visual confirmation of
the measured result in `kb/reference/lattice-bead-h7-motif-ranking.md`: departure % is **saturated
at 76.1% common effect with only 7.9pt between-motif spread**, so it cannot rank motifs — and,
more importantly, a viewer cannot *name the bead*, which is the project's whole acceptance test.

Corollary from the same note, worth not re-deriving: prior anchors **reversed** on re-measurement
(ume 91.4→71.8, kikko 46.6→72.0, tomoe 42.3→78.4); `tomoe` has the **highest** crossing count
(2.29/ray), not the lowest; all 11 motifs **brighten** (+30.1% to +43.5%), none darken; and
`hakkaku`/`kikko` read at least as well as `ume` but were never given a keeper run.

## NEGATIVE RESULT 2 — seed pitch is a dead lever at fixed framing

`recog-pitch.png`: `knob_169` swept 0.10 → 0.55 against `knob_168` 0.55/0.9/1.0 — **15 tiles, all
nearly identical**. Do not spend another session tuning seed pitch expecting recognition from it.

**Root cause of the flat sweep, found afterwards:** that sweep omitted `navZoom` *and* dropped
`controller=lattice-nav`, so framing was pinned at the default for every tile. `navZoom` is the
framing lever; `knob_169` only sets bead pitch *within* a framing. Any future recognition run must
vary `navZoom` and keep `lattice-nav` in the URL.

## Method note

`scripts/variety-sweep.mjs` (new) renders framing and theme×paletteShift grids;
`scripts/recog-sweep.mjs` (new) renders the pitch×amount and 11-mon recognition grids;
`scripts/montage.mjs` now takes `SHADER_N` so sheets follow the fork.

## RECOGNITION SOLVED — 4.frag, 2026-09-04 overnight

The acceptance test passes. All 11 mon individually nameable, confirmed live with audio and
autofly, not just on a frozen frame. See `shaders/redaphid/wip/lattice-bead/4.md` for the full
write-up. Short version:

**Cause was figure/ground, not size or framing.** 3.frag let the lattice texture survive inside
the motif, so interior and exterior carried the same contrast and the eye had no silhouette to
lock onto. Three sessions went into tuning size and framing when the blocker was *contrast
inside the silhouette*.

**Fix:** `legible` (knob_180 / `?legible=`, default 0 = 3.frag exactly) — interior flattens
toward bead ink, ground recede deepens 0.25–0.50 → 0.58–0.82, contour widens 4× → 16×.
All mask-bound and spatially structured (no global multiplier), hand knob (no geometry on audio),
and the flatten + contour are the recede's counter-ratchet in the same edit.

**Recipe:** `knob_169=0.60 navZoom=0.14 legible=1 knob_168=1.0`.
Cell pitch is a **window**, not a maximum — past 0.75 the camera sits *inside* one bead and the
silhouette is gone.

**Variety:** 11 mon × 5 palettes = 55 distinct good visuals, verified in
`journals/lab/shots/legible-palette.png`. 32 ship as presets in 4.frag.

**Bug caught by measurement:** LEGIBLE first used the house `LVK` "0 means unset" convention,
which cannot express zero — `?legible=0` silently became 0.55 and both rendered bit-identically
(lum 103.37 each). Now `clamp(max(knob_180, legible), 0, 1)`.

### Todo
- [ ] `autofly` drifts through zoom levels, so the bead alternates figure/ground. Both legible,
      but consider range-limiting autofly when `legible > 0`.
- [ ] The jam drawer registers `paletteShift` with `.min=0 .max=1` while the good values run to
      1.35 — same trap as `onset_refractory_ms`. Touching that slider loses the palette.
- [ ] `hakkaku` and `kikko` still never got their dedicated keeper run (flagged in the H7 note).

## The art critic, and three agents — 2026-09-04 overnight

### RETRACTION: recognition does not pass

4.md claimed all eleven mon are individually nameable. **That was wrong.** An art critic judging
the render grid cold: **4 clear, 2 arguable, 5 failed.** kikyo and ume are "the same picture";
suhama collapses into katabami; tomoe reads as "an egg with a scratch on it".

Two observations worth keeping permanently:

- **Every crest that passes has a straight line in it** (kikko, hakkaku, matsukawa, kiku). Blur
  eats corners first and curves last, so at distance every rounded silhouette collapses into
  every other rounded one.
- **Tomoe is structurally impossible in this engine.** It is defined by *rotational* symmetry —
  three commas chasing each other — and the lattice mirror-folds. Mirroring is the one operation
  that cannot produce a tomoe. Not a tuning problem.

### The second verdict: it does not dance

> "A car alarm responds to sound. This system is closer to the car alarm."

- quiet / loud / stage-loud are the same picture with the gain up — a **dimmer switch**
- the infinity zoom is perceptually **invisible**: a self-similar lattice has no landmark to
  pass, so 28s of dive gives six identical frames
- **mirror symmetry is a stillness operator** — every copy changes at once, so a hit reads as
  shimmer, never as a hit. "Kaleidoscopes are hypnotic and never percussive."
- legibility and motion were **mutually exclusive**: the crest resolves only in a knife-edge
  window of size and framing, so any audio touching zoom or size destroys recognition

Answered in `arrival.frag` — legibility becomes an EVENT. Verified deterministically (live
correlation is blind to a travelling local event): contrast 24.0 → **40.3** at 0.15s → 24.7.

### CORRECTION to a number quoted all session

The "onsetEnvelope is 6.8× smoother than energyZScore" claim compared **raw** per-frame jitter
across signals with very different spans (flare 0→0.48, z-score −0.79→1.18). Normalised by
range it is **0.0158 vs 0.0262, about 1.7×**. Still smoother — but the real argument for onsets
was never smoothness, it was **latency**. Corrected in the published gallery.

### Agent results (branches, not merged)

| branch | worktree | result |
|---|---|---|
| `lab/react-rhythm` | pc-lab-r1 | per-cell arrival times: one onset crosses the lattice as a ripple. Simultaneous rise&fall 0.010 → 0.19–0.24 (18–21×). `artic=0` bit-identical to 4.frag. |
| `lab/react-colour` | pc-lab-r2 | **found a real bug**: `lush()` hue has period 1, its chroma term has period **2**, so one hue renders at C 0.211 *or* 0.115 (1.84×) depending on unrelated state. That is what "fuzzy fuchsia" actually was. Gamut crush 2.14% → 1.21%. |
| `lab/react-chromadepth` | pc-lab-r3 | Spearman ρ(depth,hue) **0.9941 / 0.9956**, near-white **0.000%**. Two modes (SHELF/DOME). Collapses 4.frag's whole pipeline to one exposure scalar and repaints at the depth hue. |

### Gotchas found by the team

- **The SPA fallback returns 200 with `index.html`** for a missing shader path, so `curl` health
  checks cannot detect that you are talking to the wrong server. Two agents lost time measuring
  a sibling worktree's vite after a port collision. Use `--strictPort` and verify the *body*.
- `node_modules` is a **junction to the main tree**, so `rm -rf node_modules/.vite` in a worktree
  clears the main tree's vite dep cache. One agent did; it regenerated.
- Vite's watcher does not reliably pick up `controllers/` edits — the plain URL kept serving a
  stale transform while a cache-busted URL served the new file. A dev-server restart is the fix.

### Todo
- [ ] merge/renumber the three agent branches (all three named their fork `5.frag`)
- [ ] tomoe needs a rotational path or should be dropped from the mon set
- [ ] the `lush()` period-2 chroma bug should land on the base, not just the colour branch
- [ ] stray vite servers on 6974/6975/6977
