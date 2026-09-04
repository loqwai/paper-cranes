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

## Iter 10 — the reactivity was gated OFF upstream, and the flash was the ground

Two faults, both upstream of anything shader-side. User: *"The audio reactivity is almost
nonexistent!!"* then *"it's full-screen flashy in a bad way. Read the journals re: the coat"*.

### Fault 1 — the feature stream had FROZEN

`energy` / `bass` / `mids` / `treble` each stuck at ONE value, identical to 5 decimals across
300 frames (`energy` 0.01205, `bass` 0.10198, `mids` 0.35362, `treble` 0.54218). A live analyser
never does that. The wild `Normalized` swings that made it *look* alive were the tell, not the
counter-evidence: Normalized divides by a recent range, and with a frozen input that range
collapses to zero, so pure noise reads as full-scale motion. A page reload revived it.

**Check absolutes, not Normalized, when judging whether audio is present.**

### Fault 2 — quietGate used an ABSOLUTE threshold and never opened

```js
gateTarget = clamp((energy - 0.015) / 0.05, 0, 1)   // 0 below 0.015, 1 by 0.065
```
Measured live with music clearly playing and the spectrum healthy (mids mean 0.603, treble
0.249, 700+ distinct values per feature): **energy mean 0.01637 → gateTarget 0.027 → quietGate
5.1e-8.** The gate never opened. It multiplies nearly every audio term, so everything pinned at
the QGATE floor and stopped modulating. **That was the "almost nonexistent" reactivity, and no
shader tuning could ever have fixed it.**

Fixed in `wavelet-ease.js`: the gate is now RELATIVE to a slowly-decaying peak of the input's own
energy, so it self-calibrates to any mic gain or stream.

| | before | after |
|---|---|---|
| quietGate | 5.1e-8 (pinned) | **0.521 – 1.0, mean 0.906** |
| energySpring | constant | 0.204 – 0.517 |
| waveletBassSpring | constant | 0.048 – 0.591 |

### Fault 3 — the full-screen flash was the GROUND term

`col *= mix(1.0, 1.0 - seedDepth, (1.0 - cov) * seedAmt)` multiplies the ground BETWEEN beads —
most of the frame — and I had wired the onset event into it. Every hit darkened half the screen:
a full-frame strobe wearing a mask as a disguise.

**The coat journals had already settled the correct shape** (this is why they are worth reading):
VJ RADIAL BARS were *"strictly masked to `silhouette < 0.02` so the jacket is never touched"*, and
*"the rim is a great composite target because it's a high-contrast EDGE — multiple independent
signals can route into different rim properties without overlap."*

So: the ground now follows only `pump` (a smoothed spring) and the hand knob — **no event over a
large area** — and all the fast audio moved onto the bead contour, with three signals from three
domains at non-overlapping properties (arrival→brightness, pitchClassMedian→hue tilt,
trebLive→texture).

| | before | after |
|---|---|---|
| **corr(onset envelope, contrast)** @0.15s lag | ~0.00 | **+0.468** |
| contrast mean | 15.95 | **22.82** (+43%) |
| temporal luminance SD (the flash metric) | 4.6 | **4.34** |

First genuinely onset-locked response of the whole run. Luminance span widened 16.2 → 24.4, but
as a few sharp arrival peaks rather than continuous swinging; the dial if it still reads flashy
is the rim gain (2.2 → 4.0 this tick).

### Todo
- [ ] the viewport is now 1118x1092, not 2560x1249 — cursor park updated
- [ ] rim gain 4.0 may be too hot; it is the one dial for "still too flashy"

## Iter 11 — detail.frag: the quiet channels, and an unverified feature

User asked for (a) subtle detail keyed to lesser-known audio features, and (b) per-bead slow
scaling driven by slow uniforms, different for each bead.

### Measure before wiring — this is now a hard rule

Last tick I keyed the rim hue to `pitchClassMedian`. It measures **range 0.000** on this rig, so
that channel did nothing. Before writing a line this time, 9s of live sampling:

| alive | range | | dead |
|---|---|---|---|
| `spectralEntropySmooth` | 0.821 | | **the entire `*Slope` family is ABSENT** — |
| `spectralCrestSmooth` | 0.818 | | every `energySlope` / `bassSlope` / |
| `spectralRoughnessSmooth` | 0.776 | | `spectralCentroidSlope` returns no value, |
| `waveletBassSpring` | 0.530 | | despite CLAUDE.md documenting them |
| `waveletCentroidSpring` | 0.403 | | |
| `spectralSpreadRSquared` | **0.291** | | `pitchClassMedian` — range 0.000 |
| `spectralSpreadMedian` | 0.049 | | `sectionMix` — constant |

**The R-SQUARED family is the find.** It is trend *confidence* — "is this change steady or
chaotic" — idling near 0.04 and climbing to 0.29 when a feature travels in a straight line.
Nothing in this shader family had ever used it. It is the right gate for detail that should
appear only when the music is *going somewhere*.

### Five quiet channels (verified subtle)

TREND RINGS ← `spectralSpreadRSquared` · GRAIN ← `spectralRoughnessSmooth` · RIM WIDTH ←
`spectralCrestSmooth` · HAZE ← `waveletBand5Spring` · HUE TILT ← `waveletCentroidSpring`
(replacing the dead `pitchClassMedian`). All smoothed or regression statistics — no raw values,
no z-scores — so none can shudder. Measured on/off: contrast 24.85 → 23.94, **a 4% change**,
which is the brief. Flash unchanged (3.49 → 3.44). Compiles clean, no console errors.

### NOT VERIFIED: per-bead audio keying

Deterministic harness (lattice-nav REMOVED — it accumulates per-frame state and put the noise
floor at 15.5%; without it the floor is **exactly 0.000**):

| | changed |
|---|---|
| breathe on vs off | 16.3% |
| move ALL drivers | 61.2% |
| move ONE driver (`spectralEntropySmooth`) | **0.0%** |
| move one MEDIAN (`spectralSkewMedian`) | **0.1%** |

The breathing is real, but the 61.2% is dominated by the *other five* channels, which consume
the same signals. **The per-bead audio keying is not demonstrably working** — what is visibly
breathing is the always-on phase sine. Going from 8 to 11 buckets did not change it, so
"too few beads per bucket" is probably not the whole story.

Candidates not yet eliminated: the `(slow - 0.5)` term is exactly 0 when a driver sits at its
centre, so a mid-pinned harness cannot see it; the ±8% scale may move too few pixels to cross
the diff threshold; or `id` inside `seedDist` may be poorly distributed through `hash11` at the
scales the two zoom octaves produce.

### Todo
- [ ] per-bead audio keying unproven — instrument `slowDriver` bucket occupancy directly rather
      than inferring it from pixel diffs
- [ ] the deterministic harness MUST drop `lattice-nav` (noise 15.5% → 0.000). Bake that in.

## Iter 12 — CORRECTION: the per-bead breathing does work

Iter 11 recorded the per-bead audio keying as "not demonstrably working". **That was wrong**, and
the error was in the measurement, not the shader. Three checks close it:

1. **Plumbing verified.** Loading the deterministic harness and reading `flattenFeatures()` back:
   every driver arrives with exactly its URL value — `spectralEntropySmooth` 0.875,
   `spectralSpreadRSquared` 0.222, `spectralSkewMedian` 0.515, `spectralCrestSmooth` 0.333,
   `waveletCentroidSpring` 0.444. Hand-declaring a uniform does **not** stop it being set;
   `getQueryParamUniforms` only emits declarations.
2. **Bucket occupancy verified.** Replaying `hash11` over the on-screen id range in JS: all 11
   buckets populated even at 49 beads (counts 5,4,3,5,7,4,4,4,3,5,5). Not a distribution problem.
3. **The arithmetic closes.** One driver owns ~1/11 of beads and moves them 8%, measuring
   **0.055 mad**. Times 11 buckets ≈ 0.6 total audio contribution. The always-on sine covers
   *all* beads at half amplitude ≈ 5.5× that ≈ **3.3** — and measured breathe-on/off is **3.24**.

So a single driver *must* have a tiny whole-frame footprint; that is what "different for each
one" means. The metric was wrong, not the feature.

**Also corrected:** `ALL_drivers_moved` = 60.2% even with `detail=0` is NOT breathing — it is
`energySpring`, which drives `pump` (ground depth and both gains) regardless of DETAIL. Moving
all drivers at once moves that too, so that number was never a breathing measurement.

### Method lesson
A whole-frame pixel metric cannot see an effect that touches 1/11 of the beads by 8%. Either
isolate a driver with no other consumer (`spectralEntropySmooth` is the only one here), or
predict the magnitude first and check the measurement can resolve it. "Zero change" is a claim
about the instrument until the instrument's resolution is known.

### Todo
- [x] per-bead audio keying — verified by plumbing readback + bucket census + magnitude arithmetic
- [ ] `energySpring` has global reach via `pump`; exclude it from any future isolation test

## Iter 13 — a directional sweep, which failed first and had to be fixed

The art critic's sharpest **unaddressed** point:

> "Mirror symmetry is a STILLNESS OPERATOR — when a symmetric field changes, every copy changes
> at once, so a hit reads as an overall shimmer... there is not one directional element anywhere
> in this entire folder. A beat needs one thing to move, in one place, in ONE DIRECTION."

**Where a direction can survive:** the seed grid is the only layer drawn in **world space** rather
than fold space. Anything inside the fold is mirrored into its own opposite and cancels. So the
sweep lights beads in world space along a per-device axis, phased by `melodyFlow` — a monotonic
wrapped accumulator (steps clamped to ±0.03, then mod 1), which is the rate-not-angle discipline:
tempo changes how fast the light travels, never rewinds it.

### The first version failed, and the metric caught it

| | off | on |
|---|---|---|
| left/right asymmetry sd | 0.0782 | **0.0548** ← *more symmetric* |
| flash sd | 3.49 | **4.85** ← *worse* |

The opposite of its purpose on both counts. Cause: the band was **periodic** at `proj * 0.42`, a
~2.4-unit period, shorter than the visible frame. Several bands on screen at once, both halves
always lit, no net direction — a moving stripe pattern, not a travelling light.

### The fix

Period lengthened to ~10 world units so **at most one band is ever in frame**; amplitude cut
0.30 → 0.18 because flashing is the thing called out twice.

| | off | on |
|---|---|---|
| left/right asymmetry sd | 0.0144 | **0.0364 (2.5×)** |
| flash sd | 3.82 | **3.47 (lower)** |
| contrast | 18.28 | 15.62 (−2.7, the cost) |

### Method note
Asymmetry needed its **own** metric. Whole-frame luminance and contrast are blind to direction —
a mirrored field and a directional one can have identical means. Measuring `(L−R)/(L+R)` over
time is what made the failure visible; without it the broken version's +29% contrast would have
read as success.

### Todo
- [ ] sweep costs ~2.7 contrast; consider recovering it on the rim rather than the interior
- [ ] a repo hook blocks commits by scanning the SESSION cwd (`D:/Projects/paper-cranes`), where
      the user's uncommitted `tools/` and `docs/stream-audio.md` carry absolute paths with the
      username. Nothing in `pc-lab-sub2` matches — use `git -C` and avoid `cd`.

## Iter 14 — the frame had no top end

Tone histogram over 9s of live audio, in eighths of the 0–255 range:

```
0-31   32-63  64-95  96-127  128-159  160-191  192-223  224+
28.4   51.7   17.5    2.2      0.2       0        0       0
```

**98% of the frame in the bottom three buckets; 0.01% of pixels above 160.** Deep blacks were
already there (5.3% true black) but there were **no highlights at all** — the picture lived
entirely in the shadows. That is the critic's "murk", and it is why contrast stayed low no matter
how the midtones were pushed. *Value contrast needs both ends, and only one end existed.*

### The move: a hairline specular, not more brightness

More brightness is the dimmer switch the critic already rejected. What was missing was **a small
area at a high value**: `pow(rim, 7.0)` keeps only the very centre of the contour band — a
hairline a pixel or two wide — and drives it hard. Deep blacks plus a thin specular *is* value
contrast, and because the area is tiny it cannot lift frame luminance much, so it buys contrast
without buying flash.

| | spec off | spec on |
|---|---|---|
| p99.9 luminance | 121.8 | **132.6** |
| max luminance | 149.6 | **161.7** |
| contrast | 22.49 | **23.37** |
| flash sd | 3.84 | **3.77** (lower) |

### Two measurement lessons

1. **Sampling resolution hid it.** At 90×90 the effect measured as nothing (contrast +0.1, bright
   pixels *down*). The canvas is 1278px, so a 1–2px hairline is averaged across a ~14×14 block and
   diluted ~200×. At 360×360 it is clearly there. This is the same class of error as the breathing
   measurement two ticks ago: **check the instrument can resolve the effect before believing a
   null result.**
2. **My `above160_pct` metric was broken** — `findIndex` on an ascending sorted array returns −1
   when nothing exceeds the threshold, which made the percentage read ~100%. The numbers in that
   column are garbage; percentiles (p99/p999/max) are the trustworthy ones. Recorded so the
   figure is not reused.

### The remaining ceiling
Even with the specular, the brightest pixel in frame is only ~162/255. The binding constraint is
the palette's own lightness cap (`LV_LCEIL` plus `softClip`'s roll-off above 0.75), not the
highlight term. That is the next lever for the value-contrast complaint — but it changes every
colour in the frame, so it wants its own fork rather than a tick.

### Todo
- [ ] frame ceiling ~162/255; raising `LV_LCEIL` for the specular path only would give true
      highlights without repainting the whole palette

## Iter 15 — the ceiling, settled with a proper instrument (and a revert)

Chased the "no top end" finding from iter 14. Two of my own claims were wrong and both cost a
measurement to disprove.

**Wrong claim 1: "softClip's roll-off is the binding constraint."** Its knee is at 0.75 (191/255)
and the frame's brightest pixel was 162. Nothing ever reaches the roll-off. softClip is not
involved at all.

**Wrong claim 2: "LV_LCEIL is the cap, so mix the specular toward neutral to escape it."** Tried
it — a specular is the *light's* colour, not the surface's, so in principle it should not be bound
by the surface palette. Measured:

| | before | after neutral mix |
|---|---|---|
| max | 153.7 | 160.1 (+6.4) |
| flash sd | 3.22 | **4.11 (+0.89)** |
| contrast | 24.58 | **23.95 (−0.63)** |

Bought +6 luminance for +0.89 flash and −0.63 contrast. **Reverted** — flashing is the one thing
the user has called out twice, so that trade is not available.

### Settled with a 1:1 native crop

Every previous read downsampled (90×90, then 360×360) on a **1278px** canvas, so a 1px hairline
was averaged across a block and its peak diluted — 200× at 90px, ~12× at 360px. A 420×420 crop
drawn **1:1** preserves it:

| | spec off | spec on |
|---|---|---|
| p99.99 | 144.1 | 149.3 |
| brightest pixel ever | 172 | **179** |

So the ceiling is **real, not an artifact**: this shader genuinely never emits a pixel above
~179/255. No single clamp causes it — it is the sum of the additive terms, and scaling those up
buys flash, as the revert showed. **True highlights need a separate mechanism, not a bigger gain.**

### Method
Three ticks in a row a null or weak result turned out to be the instrument. The rule that now
applies to every visual measurement here: **read 1:1 when the effect is thin.** Downsampling is
a low-pass filter, and every interesting thing in this shader — contour, hairline, ring, gap — is
high-frequency.

### Todo
- [x] ceiling question — settled: real peak is 179/255, not a metric artifact
- [ ] true highlights need their own mechanism (a separate pass), not larger coefficients

## Iter 16 — kikyo vs ume is a SOURCE ART bug, not a shader bug

Re-ran the critic's failing pairs on `detail.frag`, which has since gained the eroded-band gaps
and trend rings. Separation measured 1:1 on a 420px native crop:

| pair | mad | % pixels differing |
|---|---|---|
| **kikyo vs ume** (failed) | **6.15** | **15.9%** |
| suhama vs katabami (failed) | 11.95 | 30.6% |
| kikko vs hakkaku (both PASSED — control) | 14.89 | 36.5% |

**suhama/katabami is fixed** — the interior structure lifted it to control levels.
**kikyo/ume is not**, at under half the separation of a pair that reads as distinct.

### Why no shader change can fix it

Erosion rings follow the outline, so they cannot separate two shapes whose outlines already
match. Measuring the **baked source art** directly — rotation-aligned radial profile distance,
before any shader runs:

| pair | profile distance |
|---|---|
| **kikyo vs ume** | **0.0193** |
| suhama vs katabami | 0.0786 (4× more different) |
| kikko vs hakkaku | 0.1409 (7× more different) |
| kikyo vs kikko | 0.0924 |

**kikyo and ume are 4–7× more alike than any other pair in the artwork itself.** kikyo's max
radial sharpness is **0.0175** against ume's **0.0150** — the "pointed" petals are no sharper
than the round ones.

### The generator says so itself

`nfc-bead/beads/glow-set/japanese.py::kikyo` documents widening the shoulders to 0.30R and
opening the tip angle to ~67° so it reads as a crest rather than a generic five-pointed star,
and states outright that *"the difference from ume is now only the tip"*. The softening was
deliberate; measurement says it went far enough to erase **the only feature** distinguishing the
two crests.

**This affects the printed beads as well as the visuals**, so it is a decision for the artist,
not a shader fix. Sharpening the tip (67° → ~45°) or narrowing the shoulders would restore it.

### Method
Measure the SOURCE when two rendered things won't separate. Three ticks of shader work could
never have fixed this; the radial-profile comparison settled it in one measurement.

### Todo
- [x] suhama/katabami — fixed by the interior structure
- [ ] kikyo tip angle is an ARTIST decision in japanese.py (affects printed beads)
- [ ] tomoe remains structurally impossible (rotational symmetry vs a mirror fold)
