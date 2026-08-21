# lattice-vj-7 — Session Journal

## Status
**SET ENDED 2026-08-20 ~22:55.** Final shader: `redaphid/wip/lattice-vj/9` (the learned fork).
Nine hours of wall clock, ~12 beats, two forks (7→8→9), two LEARNED mappings wired from measured
gestures, and one user verdict of "a great flow state". Loop stopped, monitors stopped, dev server
left running. Resume with the URL in `9.md` + `/vibej2 redaphid/wip/lattice-vj/9`; read
`shaders/redaphid/wip/lattice-vj/HANDOFF.md` FIRST — it is the flow-state recipe.
**Open at close:** (1) the b1 symmetry plateau has still never been seen — `sectionMode` never fired
all night, the mic never produced a detected drop; (2) the complexity ratchet constant wants
0.05-0.10 instead of 0.33 for a whole-night arc — change it at set START, never mid-flow;
(3) the zoom×loudness coefficient is calibrated to a quiet room mic and must come down at venue
volume; (4) apply `docs/vj-auto-learn-patch.md` to `src/vj/runtime.js` BETWEEN sets so the
sub-second LEARN answer survives reloads.

## Status (during the run)
Beat 1, 2026-08-20. **`7.frag` forked from committed `6.frag` — the STRUCTURE run.** User brief:
"concentrate on the structural elements of the fractal itself — shapes dancing — algorithmically
add complexity." Live MIC audio (no tab share, no noaudio). Display tab 397815 is in THIS
session's tab group — fully drivable (screenshots + evaluate_script), unlike the 08-19 blind run.
`vj=1` runtime booted (beacon on monitor b5ggw9kdk). Frame judged legible at start: no clip, real
dark floor, focal contrast good. Room quiet at start (gate-drop 0.54 @ 17:11) — plateau moves
won't express until music + a first drop.

## Planned structural program (in hierarchy-legal channels only)
1. ✅ b1: SYMMETRY PLATEAU — drop steps `gThetaStep` to new hashed value (re-tiling dance).
2. ☐ INTERLEAVE plateau or evoPhase-ratchet — lattice gradually splits into two interleaved
   systems over the set (algorithmic complexity growth).
3. ✅ b2: Audio-rated spin — `gSpin` rate from flowPhase (bass-paced monotonic) + reduced bTime,
   so rotation speed follows the low end (rate-not-angle).
4. ☐ Depth-window widening on evoPhase — detail budget grows monotonically over the night.

## Forks
- `lattice-vj-7 ← lattice-vj-6` (2026-08-20): byte-identical fork, then b1.

## History of changes
- **b1 vj7-b1 SYMMETRY PLATEAU** (17:12): `evoT = mix(SECT(secPrev), SECT(sectionMode), sectionMix)`
  with `SECT(n) = SECH(n, 53.7) * step(0.5, n)`; `gThetaStep = PI*(0.125 + evoT*0.16 + EXA(K141))`.
  ±PI*0.08 swing per section; section 0 gated to the tuned PI/8 so boot == 6.frag look. Compiled +
  live-verified via atomic macro (`ok:true, live:true`). NOT yet seen across a real drop — first
  drop verification is the next milestone.

- **b2 vj7-b2 SPIN FOLLOWS THE LOW END** (17:16, room still quiet — deliberate: the swap's one-time
  re-orientation snap lands while nobody's watching): `gSpin += bTime*max(0, 0.10 + K146) +
  flowPhase*0.05` (was bTime*0.18). flowPhase is the bass-paced monotonic accumulator (freezes at
  silence), NOT quietGate'd — gating an accumulated angle would snap it when the gate moves.
  Verified live (`ok, live, b1 intact`). sectionMode still 0 — b1's plateau still unexpressed.

- **b3 THE LEARN BUTTON** (17:22–17:29, built live at the user's ask: "I need to click some button
  to 'confirm' the learning — sometimes I'm just playing with the knobs" + "a little feedback area
  where you can tell me what features were mapped"). Four pieces:
  1. `vjpad.html`/`vjpad.js`: footer **LEARN** button → stamps `vjConfirm` (epoch s) via
     update-params; `#learnfeed` strip renders `vj-learn-result` WS messages (+ buzz).
  2. `src/vj/runtime.js` §7b: always-on gesture-gated 10 Hz in-memory ring (knobs + 184-channel
     featSnap, samples only while a knob moved <3 s ago — none of vjtrack's serialize cost). On
     vjConfirm change: freeze last 90 s → `window.__vjLearnWindow`, post SMALL `confirm-learn`
     signal (never the window — a Monitor emits whole lines).
  3. `scripts/vj/learn-correlate.js` (fetch-eval like aesthetic-meter): `__vjLearn(samples)` —
     detrend both series, lags 0–2 s, Bartlett n_eff, t>3 ∧ |r|>0.4, aggregates excluded,
     null-gaps forward/back-filled (pinning/RELEASE add/delete keys mid-window — the unfilled
     version returned zero knobs on a real window).
  4. `scripts/vj/remote-send.js` now takes a message type arg → the loop answers the pad:
     `node scripts/vj/remote-send.js '{"text":"…"}' vj-learn-result`.
  **Verified end-to-end twice**: WS press → 406-sample window + signal + monitor wake; direct
  press → 594 samples/66 s, 4 EXPLORE-A knobs segmented, 176/184 feature channels genuinely
  varying, **no match found — correctly**: the gesture was free geometry exploration, not
  music-tracing, and the t>3 gate said so. Honest "reads as free play, nothing wired" delivered
  to the pad's feedback strip.
- **Also this window:** vjpad strip had no VJ7 (pad kept forcing the display back to 6 — root
  cause of the 17:23 shader regression) → VJ7 added + defaultShader=7 + EXPLORE A/B match 7;
  clip 0.281/flicker 0.89 storm attributed to the user's own zoom/gain gestures (bassHit/punch
  measured flat 0; clip back to 0 at rest); vibej2 SKILL.md hardened per user: synthetic cursor
  off the wall ASAP — park in the same batch, prefer javascript_tool during shows.

- **b4 vj7-b4 SPATIAL PERMUTATIONS + PATH REMOVED** (17:31, both at the user's explicit ask):
  (1) PATH ribbon + DESTINATION landmark towers deleted (also `wpos`). (2) The fold parameters
  are now smooth functions of WORLD POSITION — `gThetaStep` (±~0.09π over 3 incommensurate
  freqs), `gInterleave` (±0.11), `gTwistFall` (±0.055), `gScale` (±0.09), all seed3-phased —
  so panning continuously re-tiles the lattice through new symmetry configurations. Hierarchy
  intact: the drive is the user's own navigation, not audio/time; stand still and it stands
  still. Placed AFTER the centre-trim world computation and BEFORE the zoom-wrap comp, so the
  comp shares the spatially-shifted theta. Verified live (path gone, b1/b2 intact); frame at
  wide zoom reads as a rich quilt, no clip, floor present. User was riding K141/K142 during
  verification — the permutation field composes with the EXPLORE faders (both are additive).

## Todo
- [ ] **POST-SHOW ONLY — gate the flicker watchdog on knob movement** (`src/vj/runtime.js`, the
      5 s watchdog): every flicker alert tonight (~12 of them) was the user's own fader sweeps
      moving the whole frame. Suppress the alert when a knob changed in the last ~3 s (the LEARN
      ring already tracks exactly that). **Deliberately NOT done live: editing runtime.js triggers
      HMR, a reload resets `evoPhase` to 0, and that would destroy the 97%-complexity flow state
      the user just called out. Alert noise is cheaper than the set clock.**
- [ ] Verify the first real drop: re-tiling should be a ~4 s one-way glide, no snap; watch the
      zoom-wrap seam during the glide (theta comp shifts while zoomP mid-cycle — if the seam
      flashes during crossfade, consider freezing evoT's effect on the wrap comp to plateau values).
- [ ] Items 2–4 of the structural program, one per beat, LOOK after each.

## Cool moments
- **2026-08-20 17:37 — FIRST REAL LEARN PRESS.** 481 samples / 65 s, FLIGHT-bank gesture. The
  analyzer worked exactly as designed on its first live use: rejected knob_1/103's evo* triple-tie
  at r~0.88 as a time-trend artifact (three slow channels tying — journal rule 4 firing on real
  data), and surfaced the one defensible signal: **navY tracked quietGate (r=0.62, t=4.6,
  n_eff=36, lag 0) — the user pans UP when the music opens.** Nothing wired (nav controls aren't
  shader params); honest verdict delivered to the pad's feedback strip.

- **b5 vj7-b5 LEARNED: SUSTAINED LOUDNESS SLOWS THE ZOOM** (17:44, from the 17:41 confirmed
  gesture): K147 tracked `energyLong` r=-0.75 t=4.96 n_eff=21 — ahead of the accumulator-artifact
  tie (flowPhase/evoPhase/warpGrow ≈ -0.71; margin is thin, caveat kept honest, but energyLong is
  the physically meaningful channel and the sign matches the hand: they pulled zoom rate DOWN as
  energy sustained). **Implementation trick worth keeping: you cannot scale `bTime * rate` by a
  per-frame audio value (phase scrubs), but subtracting a monotonic energy-weighted accumulator
  INSIDE the product — `(bTime - evoPhase * 12.0) * rate` — is ∫energy slowing the zoom:
  continuous, silence-frozen, and never reverses while 12·evoRate < 1/3.** K148 OCTAVE (range
  0.9) had no match = free play, not wired. Verdict sent to pad feedback strip.

- **b6 SESSION CALIBRATION + vjpad LOOP STRIP** (17:50): user: "I don't see the shader reacting
  to the learn." Measured evoRate 0.007/s on the quiet mic → the ×12 wire was a near-CONSTANT 25%
  zoom slowdown = invisible (a rate mapping only shows at sustained-energy TRANSITIONS). Raised to
  ×25 (~53% swing tonight) with a loud caveat in-source: **reverses the zoom if evoRate > 0.0133,
  so drop toward 10 at real volume or emit a normalized sustained-energy rate from the controller.**
  Lesson: a statistically-correct wire can be visually null — check the DERIVATIVE of the driving
  channel at current signal levels before believing a mapping will read.
  Also shipped vjpad-v2 **Phase 1** (from the fork's design, docs/vjpad-v2-design.md): `vj-status`
  protocol + loop strip + tap-open drawer (last 20, replace-by-id, severity edges, per-kind buzz);
  `vj-learn-result` kept as alias. First status line sent 17:50.

- **b7 vj7-b7 COMPLEXITY RATCHET** (21:5x-22:0x, closes the user's ORIGINAL brief "algorithmically
  add complexity"): `gComplex = 1 - exp(-evoPhase*0.33)` — saturating, monotonic, silence-frozen,
  so complexity only ever accrues (legal geometry channel, same class as the zoom ratchet). Two
  payoffs: `gLevelOpen = gComplex*0.45` dissolves the recursion-level WINDOW inside fractal() so
  more generations draw at once (bounded so the finest levels can never take over into speckle),
  and `gInterleave += gComplex*0.05` separates the two sub-lattices further. Verified live at
  evoPhase 2.25 (52%): clip 0, dark 0.201, lumMin 0.154, flicker 0.09, jank clean (p95 16.8,
  zero frames >32ms) — richer nested ornament inside the coarse cells, bold forms intact.

- **b8 vj8-b8 RATCHET FLOOR COMPENSATION** (22:11, first beat on the forked `8.frag`): b7's own
  side effect, caught by trend rather than by a single reading — dark fraction climbed 0.372 ->
  0.469 over five minutes, lum 0.151 -> 0.131, **lumMin 0.078, under the 0.08 floor**. Cause: the
  ratchet draws finer generations as the set runs, and finer means thinner lines with more unlit
  gap between them. Fix on the SAME monotonic clock that causes it — `bg *= (0.30 + EXB(K159) +
  gComplex*0.14)`. Verified: **lumMin 0.078 -> 0.096**, clip 0, lum steady 0.138, detail intact;
  frame reads as bold ribbons over dense ornament. Colour channel, slowest clock, not the global
  multiplier — directive #1 untouched.
  **Pattern worth keeping: a ratchet needs a counter-ratchet.** Anything that monotonically adds
  structure also monotonically changes the luminance budget, so pair the growth term with its
  compensation at the moment you add it, not after the meter complains.
- **Flicker alerts 0.66-0.89 during this window were the user's own K147/K148 (ZOOM RATE/OCTAVE)
  gestures** — clip stayed 0 throughout and the alerts track knob movement, same diagnosis as the
  17:22 storm. Gesture-caused flicker is not a shader defect; check the knob vector before acting.

- **b9 vj8-b9 ONE-WAY CLAMP — the learned mapping nearly broke a standing directive** (22:14).
  Followed up the b6 caveat with a measurement instead of trusting it: **evoRate had drifted
  0.0070 -> 0.0093/s as the room got louder**, so `evoPhase*25` was eating 0.233 of bTime's
  0.333/s — the perpetual dive was down to **30% speed, and reverses above evoRate 0.0133**. At
  swap time the raw term (216.9) had ALREADY passed 60% of elapsed bTime (~203.9), i.e. it was
  heading for stall, not merely close to it. Fixed STRUCTURALLY, not by re-tuning:
  `bTime - min(evoPhase*25.0, bTime*0.6)` — the subtraction can never exceed 60% of elapsed time,
  so net time advances at >=0.133/s no matter how loud the room gets. Learned behaviour unchanged
  below the cap; only the failure mode is gone. Verified after: lumMin 0.125, dark 0.344, clip 0,
  jank perfect (zero frames >32ms), rResid back to 0.198.
  **Two lessons: (1) an unbounded accumulator in a rate term is a time bomb — its coefficient is
  only valid at the signal level where it was measured, and rooms get louder. Clamp against a
  quantity that grows the same way (here bTime) so the guarantee is structural. (2) When you leave
  a caveat in a comment, come back and MEASURE it; this one was 70% of the way to a live failure
  within 25 minutes of being written.**

- **2026-08-20 22:20 — THE FLOW STATE, unprompted from the user:** *"the visual has been in a
  great flow state for a while now."* State at that moment: evoPhase 10.89 (**97% complexity**),
  paletteShift **3.655** (earned — the URL preset was 1.716, so the set moved it +1.94 on its own),
  warpGrow maxed at 2, navZoom 0.218. Meter: clip 0, lum 0.189, dark 0.274, lumMin 0.144, sat 0.943,
  rResid 0.125, jank perfect. All eight markers live (b1,b2,b4,b5,b6,b7,b8,b9).
  **What the flow actually was:** nothing on screen oscillates (every motion one-way), the picture
  never resets (complexity + palette + warp all accrue permanently), the music is legible in RELIEF
  rather than brightness, and the loop never fought the user's hands. Recipe written up in
  `shaders/redaphid/wip/lattice-vj/HANDOFF.md` — including the catch that **evoPhase cannot be
  seeded from a URL**, so a fresh boot is the tuned look, not the flow look; the flow needs a set's
  worth of time (past evoPhase ~4) to arrive.

- **The COLOUR pad can override the night's earned mutation** (observed 22:22): FLIGHT-bank pad 3
  maps x->paletteShift, y->warpGrow, so touching it PINS those params — paletteShift dropped from
  the accumulated 3.655 to the pad's 0.407 mid-set. The accumulation itself is not lost (lattice-nav
  keeps its own value; RELEASE hands it back), but while the pad holds them, the "the picture never
  resets" property of the flow is suspended for the two params that carry it. Not a bug — it is the
  point of a manual override — but worth knowing when the look suddenly feels 'younger' than the set.
  If this bites during a show: RELEASE the FLIGHT bank rather than trying to dial 3.655 back by hand.

- **The complexity ratchet SATURATES in ~20 minutes of loud music** (measured 22:28: evoPhase
  16.58 => **99.6%** of the curve, up from 46% at 21:59). With `gComplex = 1-exp(-evoPhase*0.33)`
  the structural evolution is effectively over within one long set-opening; after that the picture
  is rich but no longer *becoming* richer, and the only remaining evolution is drops (which never
  fired tonight) and the user's navigation. **For a whole-night arc the constant wants to be ~0.05-0.10,
  not 0.33** (0.08 => ~50% at evoPhase 8.7, ~75% at 17, still climbing past an hour).
  NOT changed live: lowering the constant would drop current complexity 99.6% -> ~74% as a visible
  step down in the middle of a flow state the user just praised. Change it at the START of the next
  set, when evoPhase is near 0 and the curve shape is all that differs.
- **paletteShift kept accumulating underneath the pad's pin** (controller at 5.58 while the pad held
  the uniform at 0.407) — confirms the earlier finding: the pin is an override, not a reset. Release
  returns the full earned value.

- **2026-08-20 22:28 — SECOND STRONG LEARN: the hand was tracing SPECTRAL FLUX.** 246 samples /
  35 s, EXPLORE-A + SURFACE pads. **Three independent faders agreed on one feature** — the same
  corroboration pattern that validated the 08-19 roughness finding:
  · K147 ZOOM RATE  `spectralFluxNormalized` r=+0.57, lag 0,  n_eff 58.8, t=5.22
  · K150 WARP       `spectralFluxNormalized` r=+0.57, lag 2s, n_eff 49.3, t=4.77
  · K149 FILL       `spectralFluxNormalized` r=-0.45, lag 2s, n_eff 50.8, t=3.49 (inverse — they
    hollowed the cells as churn rose while speeding the zoom and deepening the warp)
  Also K1/K103 PAN SPEED vs `bass` r=-0.58 lag 2s (weaker, and pan speed is a nav control).
  Musically coherent: flux = rate of timbral change, and they put it on the two RATE/AMPLITUDE
  params of motion. **Deliberately NOT wired live**, for two reasons worth keeping:
  1. Both targets are GEOMETRY. Flux is a per-frame jittery feature and the shiver class took
     iters 11-26 to eliminate; a raw flux term on fold geometry walks straight back into it.
  2. The legal form — flux driving a RATE — needs a flux-paced MONOTONIC accumulator (the
     `flowPhase` trick), which only the controller can produce, and a controller edit forces a
     page reload that would reset `evoPhase` and kill the flow state.
  **Proposal for next set:** have `wavelet-ease` emit `fluxPhase` (monotonic, flux-weighted,
  silence-frozen) alongside `flowPhase`, then add it inside the zoomP time term exactly like
  flowPhase, and let FILL take flux directly (it is a shading/coverage param, not a fold param).

- **22:32 LEARN — a textbook FALSE POSITIVE, correctly rejected.** 312 samples over **87 s**, and
  every top hit was a monotonic accumulator: K148 -> evoWarp/paletteShift/mutation all r~-0.61..-0.64,
  K147 -> evoFlow/evoWarp/evoPlasma all r~0.70, each with huge n_eff (48-89) and t up to 7.7. High
  t and high n_eff did NOT make it real: **three unrelated slow channels tying at one r is the
  time-trend signature** (08-19 rule 4), and detrending removes the linear part but not the
  curvature of a minute-and-a-half sweep. No genuine audio channel appeared at all. The contrast
  with the 22:28 window is the lesson: **35 s with direction changes produced three faders agreeing
  on spectralFlux; 87 s of steady sweep produced nothing but clocks.** Gesture length is the
  variable that decides whether LEARN can learn anything — coached back to the user on the pad.

- **22:36 — I RESET THE FLOW STATE MYSELF, and how it was recovered.** Editing
  `scripts/vj/learn-correlate.js` mid-set triggered HMR -> full page reload -> `evoPhase` 16.58 ->
  0.17, i.e. complexity 99.6% -> 5%, plus the pending LEARN window lost. **The runtime.js reload
  warning I had written 20 minutes earlier applies to EVERY file the page fetches, including the
  analysis scripts under `scripts/vj/` — I scoped the warning too narrowly and walked into it.**
  Recovery that worked: `remote-send '{"evoPhase":16.6}'` — **the pad-pin path (messageParams)
  overrides controller outputs, while `window.cranes.manualFeatures` does NOT** (tested: manual set
  to 16.6, controller kept writing 0.41 over it). Complexity back to 100% instantly. Caveat: a pin
  FREEZES the clock, so evolution stops until released with `null`; acceptable here only because
  the ratchet had already saturated. **The b9 zoom clamp saved this** — with a pinned evoPhase of
  16.6 the raw slowdown term is 415, which without `min(.., bTime*0.6)` would have stalled the zoom
  outright; the clamp held it at 40% speed.
- **LEARN never refuses any more** (user: *"just best fit _anything_. don't refuse"*).
  `learn-correlate.js` significance gate became a CONFIDENCE LABEL: every moved knob returns a
  `bestGuess` + `strong`/`weak`/`guess`, clocks demoted 0.6x rather than excluded, and
  `timeTrendSuspect` flagged when three clocks tie. The uncertainty is reported, not used as a
  reason to stay silent.

- **b10/b11 — THE LEARN PATH FINALLY DOES SOMETHING VISIBLE** (22:38-22:46, user: *"the most
  important thing is for me to see the learn path do anything. i still haven't seen it take
  effect"*). Two measured gestures wired, both in the SHADING lane, both ADDING light:
  · **CHURN** (spectralFlux composite: 0.70*normalized + 0.55*max(0,zScore), range-fitted (x-0.10)*4)
    -> line weight +0.035 and rim flare +0.80.
  · **WUB** (wubDepth, floor-trimmed (x-0.18)*1.25) -> travelling accent +0.9, specular glint +0.55.
  Four failures on the way there, each one a rule:
  1. **First wiring was invisible** — raw CHURN only spanned 0.111..0.319 live. Range-fit every
     feature to its OWN measured span; a coefficient borrowed from another signal is a coin flip.
  2. **FILL was a DEAD CHANNEL in the live preset** — the hand traced FILL going down with churn,
     but the user's own K149 sat at 0, so the subtractive term had nothing to remove and drove
     `gFill` NEGATIVE: cell interiors unlit, lumMin 0.051, three too-dark alerts. **Check the target
     has headroom in the CURRENT preset before wiring the sign the gesture showed.**
  3. **A subtractive audio term needs an OUTER clamp**, or it walks past the floor its manual
     control already sits on (`max(0.0, max(0.0, base) - CHURN*k)`).
  4. **Gap light**: bg lightness now lifts 0.05 -> 0.105 only when gFill is at/near zero, so the
     hollow-cell look keeps a floor without erasing iter-27's "there must be real dark somewhere".
  One compile error on the way (doubled paren) — caught by the validator, never reached the wall.
- **b12 FORK 8 -> 9 (22:47).** 9.frag = the learned fork: first iteration in the series whose
  changes came from MEASURING the user's hands rather than my taste. Swapped live with no reload,
  evoPhase survived (6.04, 84%+). 9.md carries the correlation tables and the four rules above.

- **22:44-22:47 — THE PAD WENT SILENT AND EVERYTHING LOOKED FINE.** The user pressed LEARN
  repeatedly and got nothing; their reaction — *"WHY HAVEN'T YOU REACTED TO THE LEARN BUTTON YET"* —
  was correct, and the loop had no way to know. **The phone's WebSocket had dropped** (dev server log:
  `[WS] Client disconnected (1 remaining)`, the one remaining client being the display), so the
  presses never left the phone: `vjConfirm` on the display stayed frozen at the 22:43 value while
  HTTP `pulse` POSTs kept flowing normally. Every health signal said the show was fine, because it
  was — the CONTROLLER was gone, not the display.
  **Lesson: a monitor that only fires on ARRIVING messages cannot distinguish "the user is quiet"
  from "the user's controller is offline".** Silence is ambiguous and must be interrogated, not
  assumed benign. Needed: a pad-liveness check in the beat — if no `vjpad-peer` announcement has
  arrived in ~30 s (the pad announces every 3 s) while knobs moved recently, say so out loud.
  Probable trigger is the phone screen locking; `wakeLock` needs a secure context and the pad is
  served over plain http on a LAN address, so it silently does nothing.
- **ARCHITECTURE CHANGE — the parent loop is now a DISPATCHER** (user: *"maybe everything else you
  do, you do in a subagent. the parent Claude needs to always be responsive to user feedback"*).
  Root cause of the 3-minute LEARN delay was never detection: notifications only reach the loop
  BETWEEN turns, so every long parent turn (edits, 20 s browser-side verification waits) is dead air.
  Encoded in `.claude/skills/vibej2/SKILL.md` as "Parent stays responsive; delegate everything else":
  the parent triages, reads the meter, decides ONE move and delegates execution to a fork; it never
  runs verification waits, multi-step analysis, or doc writing itself. One page-touching subagent at
  a time (concurrency token held by the parent).
- **LEARN IS NOW ANSWERED BY THE PAGE, NOT THE LOOP.** A poller injected into the running display
  (no reload — `window.__vjAutoLearn`) watches the frozen gesture window, runs `__vjLearn`, and
  sends the verdict straight to the pad over the hub. **Measured latency 56 ms** from WS delivery to
  the answer posted; worst case ~450 ms (250 ms confirm watcher + 200 ms analysis poller) versus
  ~3 minutes before. First real auto-answered press, 22:52:38:
  `LEARN 17.6s · K148→waveletBand1 r=-0.472 strong · K147→melodyFlow r=+0.596 weak`.
  Verdicts also land in the signals file as `learn-answered`, so the loop can read what the user was
  already told without re-running anything. Permanent runtime.js version prepared but deliberately
  NOT applied (`docs/vj-auto-learn-patch.md`) — applying it reloads the page and resets `evoPhase`;
  it goes in between sets.
- **Latent bug found and fixed in the skill itself:** the flicker-filter one-liner used `awk` with
  `$0`, and **the skill loader substitutes `$0` at render time** — it rendered as the literal word
  "lattice" (the skill's own argument), producing a monitor that silently matched nothing. Replaced
  with a `grep -E` numeric alternation, anchored to `"type":"flicker"` because `pulse` lines carry a
  nested `flicker` field that would otherwise leak a false alert every 20 s. Both forms tested
  before arming.

## Watch
- **2026-08-20 ~21:50 SESSION RESTART.** Tab group + monitors + dev server all torn down. Two
  lessons baked in: (1) **Monitor the signals file with `tail -F`, never `-f`** — the dev server
  RECREATES `.claude/vj-signals.jsonl` at boot, which silently killed both monitors; (2) a display
  tab opened while its window is backgrounded is `document.hidden`: **0 fps, no audio, setInterval
  throttled to 1/min** — the meter reads lum 0 / dark 1 and looks like a black frame that is
  actually a paused one. Check `document.visibilityState` before believing a black meter.
- **Reload loop (~35 s) after the restart, self-resolved.** Ruled OUT by measurement: service
  worker (none registered, no caches), the `remote=<wsHost>` navigate path (not our mode).
  `navType` confirmed genuine reloads; a `location.reload` trap + beforeunload recorder was
  installed and caught NOTHING once the loop stopped. If it recurs, the trap is still armed:
  read `sessionStorage.__vjReloadTrap` on the display.
- **Dev server SIGTERM'd at 17:37** (clean "Terminated" in task output, no crash trace) — killed
  the WS hub + /__vj-signal mid-set; restarted within ~30 s, clients auto-reconnected. If it
  recurs, suspect OOM/system, not Vite.
