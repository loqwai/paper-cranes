# starship-1 — Session Journal

## Status
Iter 7. Alien beacon added — blink rate + ray length scale with MIND_GLOW (first scenery element driven directly by the pilot's brain, per Aaron's directive). knob_12 wired = SEARCHLIGHT (sweeping nose beam). Muse gyro now steers gaze (head yaw/pitch → knob_20/21); z-scope immortal inside the fullscreen iframe with gyro row. Last unwired knob: 13.

## Old status
Iter 6. Wired knob_14 ASTEROID FIELD + knob_15 WORMHOLE (kids twisted both). Muse live + z-score scope drawn INSIDE the fullscreen iframe (top-layer lesson below). Aaron's standing directive: monitor brainwaves each tick, pick scene moves to match arousal. Unwired left: 12, 13.

## Hard-won lessons (this session)
- Fullscreen iframe = top layer: parent-page overlays can NEVER paint above it, z-index irrelevant. Inject overlays into the iframe's contentDocument (same origin) instead.
- chrome-devtools evaluate_script args[] only accepts element uids — inline data as JSON-escaped literals in the function body, or use the candidate-file flow (write _candidate.frag, fetch+GL-validate in page, mv over the live file).
- Old status:
Iter 5. Scenery: gas giant (~70s) + space whale (~130s, sonar song rings, treble shimmer). MIND LINK added: Aaron's Muse EEG bridge (public/muse-bridge.html, adapted from ~/Downloads/muse-bridge.html) posts knob_17..22 → psychic veil, starfield roll, veil hue, gaze drift, dream mist. Kid knobs 1..16 untouched by the brain. Still unwired: 12, 13, 14, 15.

## Ship-control contract (DO NOT REMAP)
- knob_1 WARP SPEED · knob_2 STEER L/R · knob_3 STEER U/D · knob_4 HYPERDRIVE · knob_5 SHIELDS · knob_6 NEBULA · knob_7 ENGINE COLOR
- knob_8 TRACTOR BEAM · knob_10 AFTERBURNERS · knob_11 GALAXY RIBBON (wired iter 2)
- knob_9 RADAR PING · knob_16 COMET STORM (wired iter 3)
- Still free: 12, 13, 14, 15 — ideas: landing gear, space-whale call, wormhole, alien beacon, cargo bay lights.

## Cool moments
- (iter 1) Warp trails via `max(col, prev * persist)` + radial pull — dotted comet-trail look, reads as flying. Zero feedback blowout risk.

## Todo
- [ ] Trails are dotted rather than continuous (pull step vs star size). If it bothers anyone, raise pull or add a 2-tap smear.

## History of changes
- Iter 1: brightened stars 2.2x, density 0.78→0.70, halo up — first render was too dim for a projector/kids.

## Forks
(none)

## Design hypotheses for v2
- Scenery events (planet flyby, comet) should spawn on a slow timer + beat gate so each one feels like a discovery, not wallpaper.
