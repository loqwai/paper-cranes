# handstand-portal/2 — Session Journal

## Status
Forked from `/1` at iter 14, 2026-06-12, mid-/vibej-run. **FOR A SUBDOCTA SHOW** (heavy dubstep/riddim — wobble bass, gnarly drops). CHROMADEPTH-FOCUSED (red=near/green=mid/blue-violet=far). Audio via VIRTUAL MIC — read live features off jam page. Fully audio-reactive, no knobs. VJ run continues here; iteration counter carried over (next tick = 15).

## Inherited state (carried from /1, all chromadepth-safe)
Bass: FIGURE_BOUNCE, FIGURE_WOBBLE, FIGURE_SHAKE, bassSurge, BASS BLOOM, DROP PUNCH.
Mids: MID WARMTH. Treble: TREBLE SHIMMER, SCOOP HEAT, star sparkle.
Texture/palette: ENTROPY FRACTURE, CALM RECEDE, pitchTint.
Readability: crisp fwidth-based figure coverage (blur fixed iter 13).

## Todo
- `[x] quietGate is correct — when it reads ~0 it IS genuinely quiet (user confirmed). Keep quietGate multipliers; never de-gate.`

## Cool moments
(none yet on /2)

## History of changes
- iter 17: added SCAN SWEEP — scanBright = treble*smoothstep(0.4,0.8,centroid)*quietGate; a thin band fract(uv.y*1.5 - iTime*(0.6+scanBright*1.2)), smoothstep(0.96,1.0) races UP through figMask, brightness-only. Bright treble passages "scan" the body's energy; sweep speeds up with treble. Confined to figure, depth untouched → chromadepth safe. The skill's high-treble+high-centroid scan-line archetype. Fired at treb 0.88 / centroid 0.64 / quietGate 0.91. NOTE: effect count getting dense — next ticks should lean toward balance/refinement over new overlays (>6 simultaneous = blowout risk).
- iter 16a: added RIM GRIT — grit = clamp(roughness*entropy*1.6,0,1)*quietGate; fast spatial hash buzz (step(0.55, hash21(floor(uv*res/2)+floor(iTime*40)))) breaks the rim into dissonant flickering fragments on gnarly textured leads. Brightness-only on red rim, NO channel split (would muddy chromadepth) → depth order clean. Fired at roughness 0.65 / entropy 0.66 / quietGate 0.94.
- iter 16b: added BASS POP (USER: "play with chromadepth more — bass should make it pop OUT of the screen more"). figT -= bassPop where bassPop = (waveletBassSpring*0.18 + waveletBassZScore*0.22 + wavelet_bassHit*0.16)*quietGate, clamped figT=max(figT,0). Drives the whole figure toward RED (chromadepth near, t→0) on bass — through 3D glasses the dancer punches out of the screen. ~4x stronger than the old -0.05 swell. The headline chromadepth-depth bass response. KEY chromadepth lever: animate the depth COORDINATE t (not just color) — pushing t→0 = pop forward, the literal 3D effect.
- iter 15: added RISER — riser = clamp(spectralFluxZScore*0.6 + clamp(energyZScore,0,1)*0.6, 0,1)*quietGate; pumps a fast flicker (sin(iTime*(24+riser*40))) into the rim so the figure "charges up" during a build, releasing into the DROP PUNCH. Near-band red flicker → chromadepth safe. Fired on a build (energyZ +0.70, flux +0.45, treble surging). Pairs build-tension (RISER) with drop-release (DROP PUNCH) — the Subdocta build→drop arc.
(forked clean from /1 — see journals/1-cool-moments.md for the 1–14 history that built this state)

## Forks
- `handstand-portal/2 ← handstand-portal/1` (iter 14, 2026-06-12).
- `handstand-portal/3 ← handstand-portal/2` (iter 17, 2026-06-13): captured iters 15–17 (RISER, RIM GRIT, BASS POP, SCAN SWEEP). VJ run now continues on /3.

## Design hypotheses for v(next)
- Effects declare their feature-space band (bass→red interior, treble→green limbs, far→violet) so chromadepth alignment is deliberate, not emergent.
- KEY: never feed the dilated interior `fill` into figure COVERAGE — coverage must track the real silhouette m for a crisp edge.
- KEY: make hue music-reactive on a chromadepth shader by applying a tiny GLOBAL hue shift (<< the depth gradient span), same offset to every depth t → depth order preserved.
