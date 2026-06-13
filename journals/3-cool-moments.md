# handstand-portal/3 — Session Journal

## Status
Forked from `/2` at iter 17, 2026-06-13, mid-/vibej-run. **FOR A SUBDOCTA SHOW** (heavy dubstep). CHROMADEPTH-FOCUSED (red=near/green=mid/blue-violet=far). Audio via VIRTUAL MIC. Fully audio-reactive, no knobs. VJ run continues here; next tick = 18.

## Inherited state (carried from /2 — all chromadepth-safe)
Bass: FIGURE_BOUNCE, FIGURE_WOBBLE, FIGURE_SHAKE, bassSurge, BASS BLOOM, **BASS POP** (drives depth t→0, the pop-out-of-screen), DROP PUNCH.
Build: RISER (tension → DROP PUNCH release).
Mids: MID WARMTH. Treble: TREBLE SHIMMER, SCOOP HEAT, SCAN SWEEP, star sparkle.
Texture/palette: ENTROPY FRACTURE, RIM GRIT, CALM RECEDE, pitchTint.
Readability: crisp fwidth-based figure coverage.

## Todo
- `[x] quietGate is correct — when ~0 it IS genuinely quiet (user confirmed). Keep quietGate multipliers; never de-gate.`
- `[ ] effect stack is dense — favor balance/refinement over new overlays (>6 simultaneous = blowout). Watch for saturation when many gates overlap on a big drop.`

## Cool moments
- **Big peak holds clean (iter 18)** — Audio fingerprint: `energyZ +1.02 + entropy 0.90 + centroid 0.74 + quietGate 0.91` (massive chaotic peak/drop). What worked: ALL effects firing at once (bass interior, scan, grit, drop punch, field fracture) but PEAK ROLLOFF soft-kneed the hot pixels so it did NOT white out — verified via screenshot: crisp handstand silhouette, full red→green→violet chromadepth gradient survived, rim grit dotting the edge, cyan nebula intact. Design hypothesis: a brightness soft-knee gated on energyZ+entropy is the right safety net for a dense reactive shader — protects the look exactly on the biggest moments without dimming calm passages.

## History of changes
- iter 25: CRANKED RIM GRIT for mobile (USER: "make the fuzzing/jaggedness of the outline more prominent — this will be on a mobile phone"). Cells 2px→5px (phone-visible chunks), gate now max(roughness,entropy)*1.5 + product*0.8 (fires on EITHER, not both), step 0.55→0.4 (~60% lit), gain 0.7→1.6. ADDED edge-chew: col *= 1 - rim*grit*step(0.62,hash)*0.55 knocks jagged DARK bites near the outline so the edge frays, not just glowing dots. Verified via screenshot at entropy 0.38 — outline clearly buzzing/frayed, reads on small screen, no white-out, chromadepth intact.
- iter 24: refreshed the FEATURE MAPPING header doc — was stale (only described iter-1 mappings). Now lists all effects grouped by chromadepth band (bass→red, mids→warm, treble→green, far-field texture, safety). Preset URL was already correct (redaphid/handstand/1). Comment-only, compiles clean. (Shader was promoted out of wip to redaphid/handstand/1.frag at iter 23; dev port fixed to stable 6969 same tick.)
- iter 22: added DROP-TIGHTEN vignette — vigDrop = clamp(energyZ*0.5 + waveletBassZScore*0.5,0,1)*quietGate; vignette radius coeff 1.05 → 1.05+vigDrop*0.35 so corners darken HARDER on a drop, pulling focus to the figure as DROP PUNCH lunges it forward; relaxes between hits. Corner brightness only → chromadepth safe. Reinforces the drop arc (RISER→PUNCH→tighten). Fired at balanced mid-energy w/ wBassZ +0.31.
- iter 21: TUNED pitchTint — widened ±0.02 → ±0.035 (coeff 0.04 → 0.07) so the melody reads more in the palette. Still well under one depth band of the 0.75 gradient → red=near/violet=far order holds. A TUNE not an add — effect set is complete (21 iters), favoring refinement over new overlays now. Fired at pitch 0.91 (expressive). Re: user's "play with chromadepth more."
- iter 20: added HIGH-END SURGE — highEnd = clamp(centroid*energy,0,1)*quietGate; fieldLit += filament*highEnd*0.30. Screaming bright chaotic peaks (high centroid+energy, often bass-gone) energize the far nebula's filaments so the whole background comes alive with high-frequency madness. Far violet band → chromadepth safe; PEAK ROLLOFF backstops any blowout. Fired at treb 0.93 / centroid 0.83 / energy 0.94 / entropy 0.92 / bass 0.02 (all-treble peak). Covers the "high energy + no bass" gap — most bass effects mute there, so the field carries the intensity.
- iter 19: added QUIET BREATH — breath = (0.5+0.5*sin(iTime*0.8)) * (1-quietGate) * 0.08, added to figLit. In breakdowns/silence the figure gently swells so it's not frozen between sections; gated by (1-quietGate) so it fades the instant the music returns (no flash, it's a slow 0.8 rad/s cycle). NOTE: this is the FIRST effect gated by (1-quietGate) inverse — fills the dead-air gap that all the quietGate-gated effects leave. Added during a quiet transitional passage (quietGate 0.06).
- iter 18: added PEAK ROLLOFF — peak = clamp(clamp(energyZScore,0,1)*0.6 + entropy*0.4, 0,1)*quietGate; knee = mix(1.0, 0.86, peak*smoothstep(0.7,1.0,mx)) applied to col (mx = max channel). Soft-knees ONLY the hottest pixels on big chaotic peaks so the stacked additive effects don't clip to flat white — color + chromadepth depth read survive the drop. Safety refinement (addresses the dense-stack blowout risk). Verified clean on a energyZ+1.02 peak.

## History of changes
(forked clean from /2 — see journals/2-cool-moments.md iters 15–17 and journals/1-cool-moments.md iters 1–14)

## Forks
- `handstand-portal/3 ← handstand-portal/2` (iter 17, 2026-06-13).

## Design hypotheses for v(next)
- CHROMADEPTH POP = animate the depth coordinate t (push t→0 on bass), not just color — the literal 3D pop-out. Highest-impact chromadepth lever found this run.
- Hue-reactivity on chromadepth: tiny GLOBAL shift << depth-gradient span → depth order preserved.
- Never feed dilated interior `fill` into figure COVERAGE — coverage tracks real silhouette m for a crisp edge.
- Effects declare their feature-space band (bass→red interior/depth, treble→green limbs, far→violet) so alignment is deliberate.
- Build→drop arc: pair a RISER (flux+energy build) with a release punch (energy+kick) for the dubstep payoff.
