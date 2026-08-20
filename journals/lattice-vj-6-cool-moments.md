# lattice-vj-6 — Session Journal

## Status
Beat 1, 2026-08-19. **`6.frag` forked from `5.frag` as the EXPLORE fork.** 20 previously-hardcoded
fractal constants are now centred faders on two vjpad banks (EXPLORE A = knob_141–150 geometry,
EXPLORE B = knob_151–160 colour field); 0.5 reproduces 5.frag exactly. Running `noaudio=true` on
purpose — the user is hand-flying constants to find which deserve an audio feature. `vj=1` runtime
confirmed live (meter + validator + cursor-hide). Frame judged legible: no clip, real dark floor,
focal point present.

## Forks
- `lattice-vj-6 ← lattice-vj-5` (2026-08-19): explore faders added, look otherwise identical at centre.

## Todo
- [ ] Watch which of knob_141–160 the user settles on, then propose an audio feature per the channel
      hierarchy (geometry ⇒ monotonic/plateau only; light ⇒ free to take audio; colour ⇒ slow music).
- [ ] EXPLORE B (151–160) untouched so far — bank gate off, contributing nothing. Confirm it bites
      once the user selects that bank.
- [x] ~~`paletteShift` runaway inherited from 5.md (fired ~330× in 20 min, reached 90.3).~~ **STALE —
      already fixed in commit 41f0afb** (`controllers/lattice-nav.js:104-129`), clean in the working
      tree. Trigger is now `sectionStepped || ez > 2.6 || hit > 0.97` behind a 25 s cooldown, versus
      the old `ez > 1.4 || hit > 0.85` behind 2 s. Verified the anchor is not itself dead: `lattice-nav`
      **statically imports `wavelet-ease`** (line 20) and merges its output, and `wavelet-ease`'s
      section detector uses only `energyZScore` + `quietGate` — **no `wavelet_*` features** — so
      `sectionMode` still steps on a real breakdown→drop even though this run's URL carries neither
      `wavelet=true` nor `controller=wavelet-ease`. Only the `wavelet_bassHit > 0.97` fallback leg is
      inert without `wavelet=true`; `sectionStepped` and `ez > 2.6` both remain live.

## History of changes
- **Measurement lessons from the fader-imitation loop (each cost a wrong answer first):**
  1. **Correlate INSIDE one gesture.** Across idle time everything reads r~0.3 mush.
  2. **`performance.now()` resets on reload.** knobtrack `ms` is page-relative, so sorting on it put
     post-reload moves *before* older ones and "the last gesture" was always the stale pre-reload
     one. Re-anchor to the server-stamped batch time (`scripts/vj/knob-correlate.js`).
  3. **Effective-N is mandatory.** A 7 s fader sweep vs any smooth feature reads r=0.9 on ~3
     independent points. Bartlett-adjusted n_eff + t>3 killed `spectralRoughnessSmooth` r=0.895
     (n_eff=3) and kept `spectralRoughnessZScore` r=0.78 (n_eff=11). History aggregates
     (Mean/Median/Min/Max/StdDev/Slope/Intercept/RSquared) are excluded outright — they drift
     smoothly so they spuriously match any sweep, and they are poor wiring targets regardless.
  4. **Watch for many features tying at one r.** Eight unrelated channels (spinPhase, huePhase,
     paletteShift, mutation, flowPhase...) all reading r=0.605 was a common TIME TREND, not signal:
     a fader swept steadily for a minute tracks every monotonic accumulator in the engine. Levels
     are now linearly detrended before correlating. n_eff does NOT catch this.
  5. **The `knob_1`/`knob_103`/`knob_104` gestures never yielded a stable feature** across ~10
     gestures — their top hits are dominated by phases/time-trend. The one clean result came from
     the deliberate `knob_105`/`knob_106` baton pass. Long steady sweeps are bad evidence; shorter
     gestures with direction changes are good evidence.
  6. **`beat` is unusable on a quiet mic feed** — it reported 1.90 s / 32 BPM while every spectral
     feature independently autocorrelated at 0.5 s / **120 BPM**. Trust feature periodicity, not the
     beat flag. `wavelet=true` enabled to get `wavelet_bassHit` as a real onset channel.
- **Tooling added this run:** `scripts/vj/remote-send.js` (shell → display `update-params`),
  `scripts/vj/knob-correlate.js` (gesture segmentation + significance), `scripts/vj/watch-release.js`
  (fires the instant the user lets go). `src/vj/runtime.js` gained 10 Hz knobtrack with the full
  feature vector (184 channels incl. wavelet + controller outputs) and a parsed `flags` field on the
  boot beacon — the raw href truncates behind 30 knobs and hid `wavelet`/`noaudio` twice.
- **2026-08-19 (vibej2 run 2): the loop lost its eyes and grew new ones.** The display tab was opened
  by a previous session, so it sits outside this session's Chrome tab group and is **undrivable** — no
  screenshots, no `evaluate_script`, so the skill's "LOOK before you touch" step is unavailable and
  every call this run is made from numbers. Two pieces of tooling closed the gap:
  - `src/vj/runtime.js`: added a **`pulse`** signal (20 s) carrying the full meter summary + `residR`,
    plus the **knob vector whenever it changes** — which is exactly what this fork exists to watch.
    Also widened the boot beacon 200→600 chars; at 200 the URL was truncated mid-knob-list and the
    EXPLORE bank was invisible.
  - `scripts/vj/remote-send.js`: the display has no `?room`, so it is on the **local dev-server
    WebSocket** and `remote-ws-plugin` rebroadcasts to it. This pushes `update-params` from the shell —
    a real lever (knobs, shader code, params) on a tab that cannot be scripted. `null` releases a
    param AND deletes it from the display URL via `syncParamsToUrl`.
- **Audio turned back on** by remote-sending `{noaudio:null, embed:null, audio:null}`; the reload my
  own edit triggered made it take effect. Now on **mic**, not the `audio=tab` of the 5.frag run.
  Gate climbed 0 → 0.04 → 0.52 → **1.0**, energy 0 → 0.208.
- vjpad.js: the three "GUEST n — KNOBS ONLY" banks are gone. Bank 4 is now **LATTICE** (knob_131–140
  with the shader's real names + 5.frag's baked defaults); banks 5/6 are **EXPLORE A/B**. The old
  labels were actively wrong — lattice-vj has read knob_131–140 since iter 22.
- vjpad.js SHADERS strip: `VJ6` and `VJ5` added at the head; the stale `lattice-vj/1` entry removed.

## Cool moments
- **2026-08-19 — first fader-imitation wiring (`vj2-r1 GRIT RELIEF`).** The user rode an *unwired*
  fader as a conductor's baton — deliberately: the point was for the loop to name what the hand was
  tracing. Measured: their motion tracked **`spectralRoughnessZScore` at ~1.2 s lag**, r=0.78
  (n_eff=11) on knob_105 and r=0.74 (n_eff=9) on knob_106 — two independent faders in one gesture
  agreeing. Wired into SHADOW/relief depth (shading channel; geometry untouched). Frame after:
  lumMin 0.118, clip 0, flicker 0.05-0.07 — the pre-existing `min(0.85,…)` clamp held.
  **The gap it filled:** roughness was already in the shader three times but *only* as
  `spectralRoughnessSmooth`, a slow level. The hand traced the deviation shape, which the smoothed
  level throws away — so grit transients had no visual channel at all until now.
  **Coefficient corrected 0.22 -> 0.10 the same session.** A `too-dark lumMin=0.059` alert fired at
  21:26. The iter-134 comment on this *exact* relief stack already records kick+wub crushing lumMin
  to .063 — so this stack has a documented history of exactly this failure and 0.22 walked straight
  back into it. Read the clamp comments before adding to a stack that has one.
  **Survives detrending (re-checked, `--back=3`):** knob_105 `spectralRoughnessZScore` r=0.68
  n_eff=23 SIG @1.2s; knob_106 `spectralRoughnessNormalized` r=0.68 n_eff=13 SIG @1.5s. Two faders,
  two roughness variants, consistent lag — the finding is real, not a trend artifact.
  **Caveat kept honest:** `morphPhase` also survives on both knobs. It is a monotonic phase, so it
  is likely residual curvature detrending cannot remove; roughness was preferred because it is
  physically meaningful, appears in multiple variants, and recurred across earlier gestures too.

## Design hypotheses for v(next)
- K143 INTERLEAVE is the manual twin of iter150's `spectralSkewMedian` term. Flying it dry is the
  cheapest way to find out whether that feature was ever doing anything visible.
