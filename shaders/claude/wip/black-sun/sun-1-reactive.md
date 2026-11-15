# sun-1-reactive

Scratch variant of `sun-1-wip.frag` + `controllers/black-sun-reactive.js` (copy of `black-sun.js`) for the
2026-11-14 sun show dry run. Intent: make the music obviously visible from across the room on the MacBook
internal mic, without pulsing the sun itself (2026-10-09: "Stop pulsing the sun to the beat").

URL: `jam.html?shader=claude/wip/black-sun/sun-1-reactive&controller=black-sun-reactive&wavelet=true&vj=1&remote=display`

## Moves (2026-11-14 dry run)

- **REACT-KICK-1** (shader): every kick flashes the tendril/ray light, `1.8 × bs_kickS` on top of the old
  bass/mids breath (now 0.4). Light only; geometry untouched.
- **REACT-BASS-1** (shader): bass sustain breathes the *lit* sky gas/tiles, up to +90% on brights only
  (`smoothstep(0.04, 0.25, skyL)`), so loud raises contrast and the dark ground stays put.
- **REACT-NOSHIVER-1** (controller): barycentre wobble removed (it rocked the main sun back and forth).
  Did NOT clear the shiver meter (still 0.6–0.8; radial period 3–14 s). Root cause still open.
- **REACT-MICGATE-1** (shader + controller): gates moved from the line-in `0.003/0.015` to `0.017/0.026`
  (`MIC_LO/MIC_HI`). At 80% input gain the mic's quiet-room floor is energy 0.014–0.018, which held the
  old gate fully open, so noise drove every audio term. **If the show uses line-in, set these back.**

## Measured

- Laptop-speaker test beat: energy 0.022–0.025 vs room 0.014–0.018 (the mic only gives ~1.5× headroom here).
- Real music in the room: energy 0.035–0.066, bs_bassS up to 0.92, bs_kickS 0.5–0.7, motionVsBass 0.77.
- Shiver stays 0.6–0.8 in both sun-1-wip and this variant; clip 0 throughout.

## Known issues

- ORBIT act's giant limb renders hot pink/magenta (inherited from sun-1-wip), against "no hot magenta, ever".
- Shiver unresolved (see above).

## Pass 2 (2026-11-14, fork #2)
- REACT-NOMAGENTA-1: the ORBIT giant's limb took the PAINT-1a broken-colour hue patches (masked only around HOLE_R), which landed it in hot pink. Masked them off the giant (r 1.6–2.0, × gOrb), and made the toward-pink damping continuous so the patch edges no longer stair-step. Verified: preview shots `.claude/vj-shots/f2-orbit-before.png` vs `cool-orbit-gold-limb.png`.
- Shiver bisect (in-page A/B, 20–25 s windows, interleaved): turning off feedback, kick waves, the kick swell, the sky warp's time noise, and halving the kick flash all left the score inside its normal swing (0.14–0.9). It reads 0.64 in silence (gate shut) and follows the story's state and amount of motion, not audio. The score saturates on `(1 − zoomDirectionality)` because zoomAbs ≫ 0.05: the meter's log-radial profile is centred on the *screen*, but this scene's rings and bodies are centred on a sun that sits off-centre. That points at a metric artifact, not a visible oscillation. It's unproven; checking it needs a sun-centred profile, a scripts/vj edit, so post-show only.
