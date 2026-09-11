# bear — Session Journal

Shader: `claude/wip/bear/3` (scratch fork of `2.frag`, which is FROZEN — never edit 2).
Started 2026-09-11 via `/vibej2`. Display: `http://localhost:6969/?shader=claude/wip/bear/3&image=images/bear.png&vj=1`
(tab 1753245613, port 6969, main paper-cranes worktree, branch `bear-charm`).

## Status
Beat 1 in progress. Bear reads well (phosphor green silhouette, beam charge band, rim, dark blacklight
exterior). Meter: clip 0, flicker 0.66, dark 0.79, lum 0.06, rResid ≈ 0. `meter.gate` reads 0 because
`quietGate` is not exported on this build — not a track boundary.

## User directives
- 2026-09-11: avoid onset for now.
- 2026-09-11: copy some of the effects from the-coat sessions.
- 2026-09-11: look at the iris controller (= `controllers/wavelet-ease.js`, needs `?wavelet=true`).
- 2026-09-11: "Currently the audio reactivity is simplistic. These needs to sell my system." → port the coat's feature-space corner channels (warm hearth on the mids-dominant corner, mouth as a multi-channel lamp, god rays on drops, ground quake on low-centroid bass) so distinct musical situations get distinct responses.
- 2026-09-11: "Let's use some of the camera shaking like we do in subtronics-eye"
- 2026-09-11: camera shake — "only do that in extreme cases"
- 2026-09-11: "We need something to make this more recognizably a bear - maybe add some of the facial features back or something"
- 2026-09-11: "Let's use an image that as close as possible to the 3d model we made". The mask, relief and features are to be baked from the printed r4b keychain mesh (an existing front render or a fresh orthographic render), not from the 2D reference cutout.
- 2026-09-11: "go back to the previous bear actually and stop that subagent. Things are worse"
- 2026-09-11: "Actually just commit both versions. What I see now and the one with the good bear"
- 2026-09-11: "not PLAIN bear. The image". The good bear is the PHOTO-image face version, not the plain silhouette.
- 2026-09-11: "This 3d bear has grown on me. Commit both"

## Cool moments
(pending)

## Todo
- [done] mouth as multi-channel lamp (coat :558-562 pattern): bright-sustained, calm-vocal, chaotic-bright corners
- [done] warm hearth halo gated on the mids-dominant / low-centroid / low-energy corner (coat :661-684)
- [done] god rays from the mouth on drops, cyan on high centroid (coat :564-577), port the fan rotation as a phase not iTime
- ground quake rings from the plinth on low-centroid bass (coat :887-911) — seed into the existing advected exterior field rather than a fract() ring
- build detection: energySlope × energyRSquared → beam sweep rate / charge tension
- NOTE meter.gate is quietGate which is absent/pinned 0 here — ignore gate; `wavelet_bassHit` is not exported, only `wubPulse`
- STANDING NOTE: Shake is a peak-only effect. Never widen SHAKE_GATE without the user asking.
- [done] beat 12 kept as two versions: 3.frag = photo-image face bear (image=images/bear-face.png, the user's "good bear"), 4.frag = model-image bear baked from the printed r4b mesh render (image=images/bear-model.png). The user first said the model version made things worse, then that it "has grown on me". Both are kept as equals: 3.frag = photo image, 4.frag = printed-mesh image.
- 3.frag was reconstructed from 4.frag by restoring the photo image's constants (IMG_ASPECT 556/945, MOUTH (0.505,0.867), eyes (0.446,0.917)/(0.559,0.918), header and preset). The helper's intermediate photo-stage file was not recoverable, so any body tweak it made only for the model stage now also lives in 3.frag. Eyeball 3.frag against the user's memory of "the good bear".

## History of changes
- beat 1: replaced hash21 with an integer-lattice-safe hash12 for motes and beam dust — motes rendered as a regular grid at 1:1.
- beat 2: removed `if (beat) col *= 1.06` — a global brightness multiplier (strobe channel) fed by a `beat` flag that fires on hats; brightness never lives in the global multiplier.
- beat 3: motes no longer hard re-roll at 6 Hz across the exterior (read as whole-frame flicker: meter 0.66–0.81). Now a fixed set of 2 px cells, each with its own slow cosine twinkle (0.35–0.85 Hz, random phase), squared so they mostly sit dark.
- beat 4 (iris discipline): chained `?wavelet=true&controller=wavelet-ease`. Continuous drivers moved to springs — MOTION/LOUD ← energySpring, bear scale ← waveletBassSpring (+ sustained-energy lean), beam power mids ← waveletBand2Spring, sparkle/rim treble ← waveletBand5Spring, crest ← spectralCrestSmooth, phosphor hue drift ← sin(melodyFlow·TAU)·0.25. Geometry is now springs only; z-scores remain only inside KICK/SNARE/HAT/DROP. Measured live: energySpring 0.07–0.96 jitter 0.0031/frame vs energyNormalized 0.0108; waveletBassSpring 0.21–0.73 jitter 0.0028 vs bassZScore 0.0283. Preset URL in the header now carries the controller; without it the springs read 0 and the bear rests.
- beat 5 WARM HEARTH (the-coat-23 :661-684): amber elliptical halo behind the charm, gated on the WARM corner = mids spring high x centroid spring low x energy spring low. The first pass at L 0.42 read as brown. Retuned to L 0.60, chroma 0.16, falloff 3.5. Verified by pinning the corner with messageParams. Live duty in a 6 s window was 0 (max 0.146), so it only shows up in pad or vocal passages.
- beat 6 GOD RAYS (the-coat-23 :564-577): a 6-lobe fan from the mouth, pow(|cos|,14), biased upward, spinning on the controller's monotonic spinPhase (audio sets the rate, never the angle). It is gated on the BRIGHT corner = energy spring high x centroid spring high, and boosted by DROP. Hue slides from phosphor to cyan as the centroid rises. Verified pinned; it reads as a crown of cyan rays over a violet halo.
- beat 7 LIFT: lift = smoothstep(0.06,0.22, energySpring - energyLong). The print's layer lines deepen with build tension (0.06 up to 0.24), and hot charge (prev.a) washes them back to 0.04, so the drop smooths what the build sharpened. Live duty was 4.5%.
- beat 8 CAMERA SHAKE (subtronics-eye2.frag :10,142-155, per user request): the original is a hard ternary gate (bassN+energyN > 1.2) x smoothstep(0.3,1,roughness) x 0.01, with direction from fract(sin(iTime)). Ported with SHAKE_GATE = smoothstep(0.9,1.35, waveletBassSpring+energySpring) x smoothstep(0.3,0.8, spectralRoughnessSmooth). Amplitude is 0.007 uv, plus 0.004 x KICK inside the gate. Direction is value noise at 11-13 Hz, not a per-frame hash. Only the geometry lookup (img, mask, edge) moves; the feedback reads stay on the unshaken grid, so charge trails the jolt as afterglow.
- OPEN ISSUE: over 12 s live, the BRIGHT and SHAKE gates both had 0 duty. Thresholds may be tuned for material this input never reaches, or loud and bright may be anti-correlated here (bass-heavy loud passages have a low centroid). A longer joint sample is being taken next.
- beat 8b SHAKE → EXTREME ONLY (user directive): at the first gate, the pinned corner showed a dark double outline around the silhouette. That came from the jolt plus the afterglow trail, too much for anything but a peak. SHAKE_GATE now needs all three conditions: smoothstep(1.2,1.55, waveletBassSpring+energySpring), smoothstep(0.5,0.85, spectralRoughnessSmooth), and smoothstep(0.25,0.45, energySpring-energyLong), meaning energy far above its own long-term average. All three are smooth springs. There is still no z-score on position.
- beat 9 SHUTTER FIX: the inherited 2.frag used raw z-scores as continuous drivers. KICK was clamp(bassZScore)*0.8 and DROP was smoothstep(energyZScore). They fed whole-bear charge, edge-glow width, the mouth flare and afterglow keep, and the meter sat at flicker 0.75. With onsets off, both now come from springs. KICK = smoothstep(0.55,0.72, waveletBassSpring)*MOTION. DROP = smoothstep(0.22,0.45, energySpring-energyLong)*MOTION. Result over 30 s live: flicker 0.75 → 0.67, kick jitter 0.0031/frame (was 0.028), kick duty 10.7% with max 1.0, drop duty 2.4%. Same edit, gate retunes fitted to live percentiles. SHAKE moved to the p99s (duty 6.4% → 0 in a quieter passage). WARM loosened (duty 0.5% → 2.0%, max 0.29 → 0.63).
- NOTE: the meter's dark 0.86 / lumMin 0.005 is by design here, a glowing object on blacklight black. Do not "fix" it by lifting the ground.
- beat 10 MOUTH LAMP (the-coat-23 :558-562): the mouth is now lit by the kind of passage, not only by hits. Emission only, not fed into stored charge. BRIGHT_GATE gives cyan-white (L .80), WARM_GATE gives an amber ember (L .62, hue 1.25), and chaos gives UV violet. Chaos = smoothstep(.55,.85, spectralEntropySmooth) × smoothstep(.40,.55, waveletCentroidSpring) × MOTION. The sum is clamped to 0.6, and the glow radius is 0.085 in mask space. Live 25 s (quiet passage): chaos duty 2.4% max 0.90, bright 0, warm max 0.12, zero frames with two corners active at once. spectralEntropySmooth p05/p50/p90/p99 = .35/.74/.88/.92, so entropy sits high most of the time. If chaos fires too often on busy tracks, raise its low end toward .80 — but judge across a whole track, not one window.
- beat 11 RIM MOAT FIX: at 1:1 there was a black 1-2 px hairline between the body and the rim glow. rim*(1-inside) faded the rim across the same soft mask transition where the phosphor was only half mixed in. Under camera shake this doubled into the dark outline seen in the pinned shake still. Now rim*(1 - smoothstep(.5,1,inside)).
- beat 12: facial features baked into image channels (R = mask byte-identical to bear.png, G = relief, B = features) plus an eye lamp and a rake of the UV beam across the relief. The first bake came from the reference photo (bear-face.png, 556x945, eyes (0.446,0.917)/(0.559,0.918)); the second came from a front orthographic z-buffer render of the printed mesh (bear-model.png, 563x945, mouth (0.501,0.840), eyes (0.412,0.905)/(0.590,0.905)); the printed mesh has no modelled eyes. The user first said the model version made things worse, then that it "has grown on me". Both are kept as equals: 3.frag = photo image, 4.frag = printed-mesh image.
