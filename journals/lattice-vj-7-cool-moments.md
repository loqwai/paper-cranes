# lattice-vj-7 — Session Journal

## Status
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
