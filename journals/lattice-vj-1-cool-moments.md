# lattice-vj-1 — Session Journal

## Status
**RUN STOPPED at iter 28 (2026-08-18) — user: "that show didn't go well".** Post-mortem is in
`.claude/skills/vibej/SKILL.md` (bottom) and the skill was rewritten around it: pre-show checklist,
screenshot before/after every tick, feedback-triage table, hard guardrails, TAKE OVER rule. The
plasma scratch (`plasma-vj/1`) was deleted at the user's request. `lattice-vj/2.frag` is the fork.
**LIVE SHOW** from iter 7 (2026-08-18 ~11:30 MST). Iter 8: user said "pretty subtle still" → **moveStyle = dramatic** (a whole new motif per tick), "move the cursor off the screen" → park cursor bottom-right every tick, "100 more ticks" → target 107.
Iter 3/10 — run RESUMED 2026-08-18 11:20 (new job e473e876; the first session's cron and tabs
died with it). Display re-opened in a fresh tab **without `fullscreen=true`** — that param
ejects the tab from the MCP tab group, so the extension loses it. User can F11. Tab audio not
yet shared on the new tab (human click). Iter 3 was a backlog design move, not an audio-read one.
Previously: Iter 1/10 on a `/vibej 10` rehearsal run (job 7ba68067), 2026-08-18. Tab audio verified and the
quiet gate is genuinely open. Rig verified 2026-08-18. The loop is proven end to end against the
**display page** (`index.html?remote=display`), not the jam page — this rig drives a laptop
display from a phone, so there is no jam page in the topology. Waiting on music before the
first real tick: every reactive move this shader makes is audio-gated, and with a silent room
each tick would be inventing a musical intent that is not there.

## Rig notes (read this before the next run)

- **LOOK AT IT.** Iter 27 was the first screenshot of the run (user: "are you looking at the
  screenshots?"). Features said "fine"; the picture was a wall of clipped pink with no dark and
  no focus — 26 ticks of tuning on a frame nobody could read. Screenshot every tick, before AND
  after compositional edits, then re-park the cursor bottom-right.

- **Target**: `redaphid/wip/lattice-vj/1` — a byte-copy of `chromadepth-lattice/6`, which is a
  `@favorite`. Point /vibej here and never at the committed 6.frag. Standing instruction from
  the user.
- **Page**: the display page, not jam. It exposes `window.cranes.flattenFeatures()` and can
  reach `/__save-shader`, so the skill's tick works unchanged — but the skill's `list_pages`
  /`jam.html?shader=` matching does not apply, and the tools here are `mcp__claude-in-chrome__*`
  (`javascript_tool`), not chrome-devtools `evaluate_script`.
- **`javascript_tool` will not serialize an async IIFE** — it returns `{}` even on success. Do
  the work, then confirm with a SEPARATE synchronous read (check the file on disk, or read
  `window.cranes.shader`). A `{}` here is not a failure; assuming it is will send you chasing
  a bug that is not there.
- **Hot-swap is real now.** `index.js` used to `location.reload()` on any `shaders-changed`,
  which during a set meant a black frame, an audio-context restart and the loss of the whole
  500-frame feature history — once a minute, usually for a file that was not even on screen.
  It now compares the changed path to the `shader` URL param and reassigns
  `window.cranes.shader`. Verified: page state survived a save (`__vjValidate` still installed).
- **`document.hidden` throttles rendering to a stop.** A backgrounded tab freezes `frameCount`
  via requestAnimationFrame throttling. Do not read a frozen counter as a stalled renderer —
  check `document.hidden` first.
- **The validator gate works**: current source → `ok:true`; source + `this is not glsl` →
  `ok:false` with a real GLSL error. Trust it, and never save without it.

## Cool moments

### Iter 1 — `wubDepth` deepens the cell breathing
- **Audio fingerprint** — `wubDepth` avg 0.69 (live peaks 0.84) + `spectralEntropy` 0.67 +
  `spectralCrest` 0.60, mids-forward (0.56 vs treble 0.49, bass 0.43), `energyZScore` peaking
  2.74, `sectionMode` moving 2→4. Read as wobble-heavy bass music with real drops.
- **What worked** — `wubDepth` was computed by wavelet-ease every frame and **referenced nowhere
  in the shader**. The single most characteristic feature of this genre had no visual answer.
  `gHexR` (cell radius) was breathing on `waveletBand2Spring` alone. Now:
  `gHexR = 0.60 + waveletBand2Spring * 0.12 * quietGate * (1.0 + wubDepth * 0.8)`.
- **Why multiply, not add** — adding `wubDepth` would raise the BASELINE cell size, so a wubby
  track would just have permanently bigger cells. Multiplying scales the DEPTH of the existing
  breath: a non-wub track is bit-for-bit unchanged, a wubby one breathes up to 1.8× harder.
  This is the general rule for an "amplitude" feature — it belongs on the modulation, never on
  the base.
- **Design hypothesis** — audit every feature the controller exports against what the shader
  actually reads. An unreferenced uniform is a whole musical dimension the visual is deaf to,
  and it is invisible because nothing looks broken.

### Iter 2 — sparkle follows spectral brightness (and dodges the phone)
- **Audio fingerprint** — a hard section flip from iter 1: `treble` 0.83, `centroid` 0.91,
  `entropy` 0.92, `roughness` 0.87, but `bass` 0.09 / `energy` 0.028 / `wubDepth` 0.26, and
  `sectionMode` 2→**7** with `sectionMix` 1.0. Bright, hissy, chaotic, no low end.
- **What was missed** — the sparkle block is the natural answer to a hissy passage, but two of
  its three drivers (`waveletBand5Spring`, `spectralCrestSmooth`) are **faders on the phone**,
  and TAKE OVER was engaged (53 keys in `messageParams`). So the one effect that should have
  been reacting hardest was being held still by hand. Only `spectralRoughnessSmooth` — the
  smallest term at 0.12 — was still listening to the music.
- **What worked** — scaled the whole sparkle by `(0.55 + waveletCentroidSpring * 0.9)`. Roughly
  2× between a dark passage and a bright one, and `waveletCentroidSpring` is smoothed AND is not
  one of the phone's six music faders, so it cannot be pinned away.
- **Design hypothesis** — **an effect whose every driver is a VJ fader goes deaf the moment the
  VJ takes over.** Each effect wants at least one driver outside the controller's fader set.
  The phone's music faders are `energySpring`, `waveletBass/Band2/Band5Spring`, `melodyFlow`,
  `spectralCrestSmooth`; safe-by-construction drivers include `waveletCentroidSpring`,
  `spectralRoughnessSmooth`, `wubDepth`, `sectionMode/Mix`, `evoPhase`.

### Iter 3 — the bassline's NOTE tilts the palette (design move, no audio on the tab yet)
- **Why now** — HANDOFF listed the palette-hue journey as one of the effects that goes deaf
  under TAKE OVER: its drivers were `melodyFlow` (a phone fader) and `waveletCentroidSpring`.
  `bassNoteFlow` — WHICH bass note, not how much bass — was exported and read nowhere.
- **What changed** — `s += (bassNoteFlow - 0.5) * 0.16 * quietGate` in the palette sum.
  Centred on 0.5 so a mid bass note is neutral (no baseline shift), ±0.08 of hue at the extremes:
  a bassline that walks up tints the hue one way, a sub-drop the other. Not a fader.
- **To verify with music** — on a track with a moving bassline, `bassNoteFlow` should wander
  0.3–0.7 and the whole field should slowly re-tint with it. If it just sits at ~0.5, the low
  bands aren't resolving notes on tab audio and this term is inert (harmless).

### Iter 4 — every drop glides the palette forward (`sectionMix` finally used)
- **Audio fingerprint** — tab audio live again: raw energy 0.09, gate 1, no TAKE OVER. DnB
  (High Contrast, *Days Go By*): `wubDepth` **0.95**, treble 0.66, mids 0.51, bass 0.34,
  entropy 0.59, `sectionMode` 2, `bassNoteFlow` 0.53 (sitting near centre → iter 3's tilt is
  small on this track).
- **What changed** — `s += (sectionMode - (1.0 - sectionMix)) * 0.07`. At the instant of a drop
  `sectionMode` steps +1 and `sectionMix` resets to 0, so the term is continuous (no hue snap);
  over the ~4s crossfade it eases the palette 0.07 further round. Cumulative over the set, like
  `paletteShift` but for every drop the controller detects, not just the extreme ones.
- **Design hypothesis** — a step + a 0→1 crossfade pair should always be consumed together as
  `step - (1 - mix)`; using the step alone snaps, using the mix alone forgets where it is.

### Iter 5 — grit fattens the lattice lines
- **Audio fingerprint** — same DnB track, gritty stretch: roughness 0.68, treble 0.78, entropy
  0.20, crest 0.37, raw energy 0.17, `wubDepth` **pinned at 1.0** (reese bass saturates it —
  on this genre the iter-1 multiplier is a constant 1.8×, not a modulation), `bassNoteFlow`
  0.23 (walked low → the iter-3 tilt is visibly active), `evoPhase` 0.80 → 1.72 in a minute.
- **What changed** — `gBorder` gains `spectralRoughnessSmooth * 0.03 * quietGate` next to the
  fader-driven `waveletBand5Spring * 0.06`. Line thickness was the last structural parameter
  with a single phone-fader driver.
- **Note for v(next)** — `wubDepth` clips at 1.0 on sustained reese/DnB bass; consider
  `min(1, wubDepth*4)` → a softer curve in the controller, or read `wubPulse` for the waveform.

### Iter 7 — quiet breath (the gate closing is now visible as calm, not as a freeze)
- **Audio fingerprint** — track flip to soft piano-trio jazz (GoGo Penguin, *Ocean In A Drop*):
  raw energy **0.027** → `quietGate` **0.33**, mids 0.81, centroid 0.11, treble 0.21,
  `sectionMode` 2→3 with `sectionMix` 0.03 (the iter-4 palette glide caught mid-crossfade).
- **What changed** — `gHexR += 0.025 * sin(bTime*0.7) * (1.0 - quietGate)`: a ~27s cell
  breath that fades IN as the gate closes. On loud music the term is zero (bit-identical).
- **Design hypothesis** — the gate should crossfade between two behaviours (reactive ↔ idle
  breath), not between reactive and frozen. `(1 - quietGate)` is the idle-behaviour weight.

### Iter 8 — AURORA curtains (first dramatic motif)
- **Audio fingerprint** — GoGo Penguin tail: entropy 0.95, centroid 0.78, roughness 0.77,
  crest 0.12, energy 0.072 (gate open again); flipped to CamelPhat *NYP2* as the move landed.
- **What changed** — a screen-space aurora layer: sparse ribbons `smoothstep(0.35,1,band)` from
  two folded sines drifting with `bTime` + `evoPhase`, complement hue `lush(s+0.5+a.y*0.15)`,
  amplitude `0.30 * (0.35 + centroidSpring*0.6 + roughnessSmooth*0.3) * quietGate` (max ≈ 0.37
  additive; feedback steady-state ≈ 1×, no blowout).
- **Watch for** — if it washes the lattice, drop 0.30 → 0.18 or raise the smoothstep floor.

### Iter 9 — kick punch + kick twist (reaction moves into GEOMETRY)
- **Audio fingerprint** — CamelPhat *NYP2*: bass 0.64, centroid 0.84, mids 0.12, entropy 0.66,
  energy 0.19, `waveletBassZScore` 0.37 between kicks, `bassNoteFlow` 0.22.
- **What changed** — `uv *= 1 - gKick*0.05` (whole lattice tightens on each kick) and
  `gSpin = gKick*0.10` (fold torques a few degrees per level and unwinds). `gKick` is the raw
  bass z-score + bassHit, so this is transient and snappy by design.
- **Design hypothesis** — colour answers the SLOW music (key, section, set); geometry answers
  the FAST music (kicks, hits). Mixing them up reads as flashing.

### Iter 10 — bass ripple (concentric displacement rings)
- **Audio fingerprint** — CamelPhat, bass 0.74 / mids 0.74 / treble 0.16, crest 0.78,
  `waveletBassSpring` 0.53, energy 0.15.
- **What changed** — before the world pan, `uv += normalize(uv) * sin(r*18 - t*4) * amp`,
  `amp = (bassSpring*0.7 + wubDepth*0.3) * quietGate * 0.005 / navz`. The lattice bulges in
  rings rolling out from centre; ~8% displacement at full bass. Pure geometry.
- **Watch for** — if the rings fight the kick punch, slow `iTime*4` → `*2.5`; if too strong on
  a bass-pinned TAKE OVER, the wubDepth term keeps it alive at 30%.

### Iter 11 — shiver fix + slow shape evolution
- **Insight from plasma/coat journals** — sub-1Hz modulation = brooding, 5Hz+ = jittery; shape
  evolution as aperiodic sums of slow sines; monotonic phases (rate-not-angle); tonemap safety.
- **What changed** — (1) `gKick` dead-zoned + `wavelet_punch`; twist 0.10→0.06. (2)
  `shapeA = .5 sin(morphPhase*.23) + .5 sin(bTime*.031+1.7)`, `shapeB = .5 cos(morphPhase*.17+.6)
  + .5 cos(bTime*.019)`; `gSpin += shapeA*0.9` (up to ~44° per level at the extremes → very
  different lattices), `gHexR += shapeB*0.06`, `gCross += shapeA*0.04`.
- **Watch for** — if the fold-angle drift makes the pan axis feel wrong, cap `shapeA*0.9` → 0.5.

### Iter 12 — fold-ratio drift (first pure fractal permutation)
- **Audio fingerprint** — track gap (energy 0.015, gate 0.07) into a-ha/Kygo *Take On Me*.
  Wavelet snapshot: tilt 0.09 (tiltN 0.39), spread 0.82, punch 0.36, confirmedDrop 0.
- **What changed** — the mirror-fold `s = 2.0` became `gScale = 2.0 + 0.30*shapeB`. The fold
  `1 - |s·fract(p-.5) - s/2|` equals `1 - s/2` at both cell edges for ANY s, so the ratio can
  drift continuously without seams; the self-similarity of the whole lattice slowly changes.
- **Next permutations to try** — level window (which recursion depths draw) from
  `waveletCentroidSpring`; hex↔cross balance from `waveletTilt`; per-level twist sign flips on
  `sectionMode`; FIRST-level offset on `wavelet_confirmedDrop`.

### Iter 14 — level window (which recursion depths draw)
- **Audio fingerprint** — Kygo *Take On Me* breakdown: energy 0.048 (gate 0.74), bass 0.73,
  centroidSpring 0.44, spread 0.86, tilt 0.43. Flipped to Basilone *Dance with Me* as it landed.
- **What changed** — per-level `f *= mix(1 - ld*0.75, 0.25 + ld*0.75, gDepthFocus)`,
  `gDepthFocus = 0.5 + (centroidSpring - 0.5)*1.2 + shapeA*0.25`. Bright → filigree, dark →
  bold. A permutation of the fractal's visible scales, no screen-space anything.

### Iter 15 — rim light (lighting family begins)
- **Audio fingerprint** — Basilone *Dance with Me*: energy 0.18, treble 0.63, band5Spring 0.32.
- **What changed** — `n = normalize(∇lum)`, `rim = smoothstep(.02,.25,|∇lum|) * (0.5+0.5·n·L)²`,
  `L` at angle `flowPhase*0.8 + bTime*0.3`, colour `lush(s+0.33)`, gain
  `0.8*(0.30 + band5Spring*0.45 + roughness*0.25)*quietGate`. Bass pace spins the light.
- **Design hypothesis** — lighting is the missing reactivity axis for structure-first shaders:
  a light that MOVES with the music reads as alive without changing the palette.

### Iter 16 — shadow side (relief that embosses on kicks)
- **Audio fingerprint** — bright/wide (centroid 0.95, spread 0.93), bass 0.25, section 5;
  flipped to Riot Ten *i hate edm* (dubstep incoming) as it landed.
- **What changed** — `shade = edgeMask * (0.5 - 0.5·n·L)²`, `col *= 1 - shade*(0.22 +
  gKick*0.40 + bassSpring*0.18)*quietGate`. Rim + shadow together = one-sided lighting; the
  kick deepens the shadow so hits emboss the structure.

### Iter 17 — muted palette + the sun (focal point + legible lighting)
- **What changed** — palette → 3.frag's muted Oklch; drivers: melodyFlow .32→.15, centroid
  .14→.07, sectionMode .07→.03, accent offset .18→.12 (swing .05), aurora .22→.10, bg dark.
  Sun: `sunP = 0.30·(cos ang, sin ang)`, rim/shadow `L = normalize(sunP - suv)`, disc radius
  `0.030 + bassSpring·0.012 + gKick·0.008`, halo `smoothstep(0.22, r, d)·0.35`, colour = rimCol.
- **Design hypothesis** — a visible light source turns "lighting effects" into a STORY the eye
  can follow; it is also the natural anchor for drop events (flare, split, colour-temperature).

### Iter 20 — counter-rotation parity (drops re-wind the lattice)
- **What changed** — per level `sgn = ((i + sectionMode) even ? 1 : -1) * (2*sectionMix - 1)`
  multiplies the `gSpin` term. Alternate depths counter-rotate; each detected section change
  flips parity through zero over ~4 s → the lattice visibly resets and re-spins the other way.
- **Rig note** — one hot-swap didn't land after save; forcing `window.cranes.shader = src`
  (post-validate) works as a fallback. TAKE OVER engaged on the phone from ~iter 20.

### Iter 23 — guest bank 1 auto-wired (the user was riding a dead bank)
- **What was seen** — vjpad guest bank 1 (`knob_131–136`) values changing tick to tick while the
  shader read none of them. Wired: K131 fold ratio (±0.25), K132 depth focus (±0.5), K133 fold
  twist (±1.0 rad·level), K134 cell radius (±0.075), K135 light angle (full turn), K136 relief
  depth (0.4×–1.6×). `bank4 = step(0.001, ΣK)` gates it off when the bank is absent.
- Iter 24–25 completed the bank: K137 aurora amount, K138 line thickness, K139 hex↔cross
  balance (`gCrossBias ±0.06`), K140 flight range (0 = hold still … 1 = double).
- **Design hypothesis** — a controller-facing shader should ship with its guest banks pre-wired
  to STRUCTURAL levers; dead knobs on stage are the worst kind of silent failure.

### Iter 26 — de-shiver + live mixes (the TAKE OVER lesson, applied)
- **What was found** — with TAKE OVER on, `waveletBassSpring` etc. read back as constants; every
  bass/mids/treble/glow response in the shader was a constant. The only thing still moving was the
  kick — a raw z-score driving a whole-screen zoom, i.e. exactly the shiver.
- **Design hypothesis** — a stage shader must never have a music driver that a fader can fully
  pin: mix each fader-able spring 50/50 with an un-owned neighbour spring. And transients may
  touch shading/twist, never global scale or translation.

### Iter 27 — legibility pass (first look)
- **What the screenshot showed** — at navZoom 0.5 the finest levels were noise; `pow(col,0.8)*1.15`
  pushed every hue to clipped pink; bg at 0.55 meant no dark anywhere; vignette 0.12 = no centre.
- **What changed** — bg `lush(s+.5,.05)*.30`; gamma 0.92, gain 1.02; level window ±0.90 with
  coarse bias 0.35; vignette 0.38. Second screenshot: dark, structured, muted green/blue/orange,
  a warm centre. Reactivity finally has contrast to move against.
- **Design hypothesis** — a "muted palette" is mostly a TONEMAP question, not a hue-table one.

## Signals the controller exports but this shader ignores
Checked at iter 1 — candidates for future ticks:
- `wubDepth` — **now wired** (iter 1)
- `bassNoteFlow` — **now wired** (iter 3) into the palette hue
- `evoPhase` — **now wired** (iter 6): pulse-accent hue offset `0.18 + 0.10*sin(evoPhase*0.7)`. Observed pace ~0.8 units/min at energyLong ≈ 0.47, so one full swing ≈ 11 min. `energyLong` still unread.
- `sectionMix` / `sectionMode` — **now wired** (iter 4) into the palette

## Todo
- `[x] user iter 26: "still a little shivery"` — the kick ZOOM (whole-lattice 5% scale flick) was
  it; removed. Kick now = `smoothstep(.25,.9, bassHit*.6 + punch*.6)` (no z-score); twist 0.04.
- `[x] user iter 26: "more interesting audio reactivity"` — the vjpad LIVE bank with TAKE OVER
  pins waveletBass/Band2/Band5/energy springs (+melodyFlow, crestSmooth, quietGate) — exactly the
  drivers this shader used, so reactivity FROZE at fader values. Fix: `bassLive/midsLive/trebLive/
  glowLive` = 0.5·pinned spring + 0.5·Band1/3/3/4 spring (never pinned). Fader biases; music moves.
- `[x] user iter 22: "auto fly us around"` — `world += fly`, `fly = (0.6 sin(.070t) + 0.4 sin(.031t+1.3),
  0.5 cos(.053t) + 0.3 sin(.023t+.7))` on bTime. ~1/7 screen/s at zoom 1; phone pan still adds.
  This reverses 6.frag's "STILL geography" premise for the show — the user asked for travel.
- `[x] user iter 17: "something to focus on in the fractal"` — THE SUN: a coloured orb orbiting
  the centre (r 0.30, ~35 s/lap, faster with bass) that IS the rim/shadow light source (per-pixel
  L = normalize(sunP - suv)). Build future moves around it (it can lead the eye, flare on drops).
- `[x] user iter 17: "not change color palettes so extremely… muted lattice in the shaders"` —
  adopted `chromadepth-lattice/3.frag`'s palette (L 0.40+0.44·lit, C 0.09+seed2·0.06, dark bg
  `lush(s+.5,.08)*.55`) and halved every hue driver. Rule: hue drift ≤ ~0.03/min visible.
- `[ ] user iter 15: "let's get stuff like rim lighting etc, the reactivity isn't that interesting yet"`
  — rim light added iter 15 (sweeping directional edge light on the lattice gradient). Continue
  in the LIGHTING family: specular highlight that tracks kicks, shadow side darkening, glow that
  bleeds along lines with mids, light colour temperature from tilt. Not colour flashes.
- `[x] user iter 11: "it's shivery"` — raw `waveletBassZScore` on zoom+twist every frame. Fixed
  with a dead-zone `smoothstep(0.30, 1.0, …)` and `wavelet_punch` as a cleaner onset; twist 0.06.
  Rule: NEVER put an un-smoothed z-score on geometry without a threshold.
- `[x] user iter 13 (repeat of iter 11): "I need a time component"` — iter 11's 5–10 min clocks were
  invisible. Now: shape cycles ~2 min + continuous fold rotation `gSpin += bTime*0.08` (~1.3°/s
  deepest level). Rule: a "time component" must be perceptible within ~10 s of watching.
- `[x] user iter 11: "a time component so we slowly see different shapes"` — shapeA/shapeB
  aperiodic sines on `morphPhase` (wavelet band-3 accumulator) + bTime drive fold angle, cell
  radius, cross size (~5–10 min cycles).
- `[ ] user iter 11: "use the new wavelet stuff"` — wired `wavelet_punch` (kick) + `morphPhase`.
  Still unused: `waveletTilt` (0.88 seen: bass-heavy balance), `waveletSpread` (0.59),
  `wavelet_confirmedDrop`, `waveletBandNSlope`. Next dramatic ticks should spend these.
- `[x] user iter 9: "flashing colors a little much sometimes"` — cause: `bassNoteFlow` lerps
  10%/frame, so a bass-note change re-tinted the WHOLE field ±0.08 hue in ~0.3s. Cut to 0.05.
  Aurora 0.30 → 0.22. Rule: global-hue drivers must be slow (springs, evoPhase, sectionMix).
- `[ ] user iter 9: "more interesting when it reacts to music"` — direction: STRUCTURAL
  responses (zoom/twist/warp/ripple), not colour. Iter 9 added kick punch + kick twist. Next
  candidates: bass-driven radial ripple displacement, treble → line-fattening burst, drop →
  fold-count change, breakdown → lattice dissolve.
- `[ ] user: "pretty subtle still" (iter 8)` — dramatic mode on; each tick should now add a visible motif, not a coefficient.
- `[ ] confirm the microphone path under real volume` — every healthy reading so far
  (raw energy mean 0.098, peak 0.183, comfortably over the 0.065 gate) was captured with
  `&audio=tab`. On the mic, raw energy has only ever been observed below the gate, in a quiet
  room. `quietGate` is computed from RAW `energy` in `wavelet-ease.js:159`
  (`(energy - 0.015) / 0.05`), NOT from a normalized feature — so normalized features can swing
  0→0.9 and look reactive while the gate stays shut and 16 uses of it in the shader stay dead.
  Ten seconds of soundcheck on the mic settles it.
- `[ ] decide mic vs tab audio for the show` — tab audio measured strong; the mic is unproven
  under volume.

## History of changes
- **Removed THE SUN orb (iter 21, added iter 17)** — user: "I need that circle orbiting to stop"
  then "that circle needs to go now". No overlaid discs/orbs/circles. The rim/shadow/specular
  lighting it anchored stays, with a free-sweeping light direction. A focal point, if wanted,
  must be built FROM the fractal (distinguished centre cell / core level), not drawn on top.
- **Removed IRIDESCENT SPARKLE (iter 15)** — user: "I need whatever that white grid of stars is
  gone". It was a screen-space sin×sin dot grid with white tint. Never re-add dot grids or white
  glints; the palette is deliberately never-white.
- **Removed BASS RIPPLE (iter 12, added iter 10)** — user: "i didn't like the warping. stick to
  fractal permutations". Do not re-add screen-space uv displacement/warps of any kind. Moves
  should permute the FRACTAL: fold ratio, fold angles, which levels draw, hex/cross shapes.
- 2026-08-18: rig-check comment appended and reverted; file is byte-identical to the committed
  copy. No visual change has ever been made to this shader by /vibej.

## Forks
- `lattice-vj/2 ← lattice-vj/1` (iter 27, 2026-08-18 live): snapshot after the legibility pass; knob
  state in `lattice-vj/2.md`. The /vibej run then SWITCHED to the plasma shader (user request).
- `lattice-vj/1 ← redaphid/chromadepth-lattice/6` — scratch copy so the favourite survives a set.

## Design hypotheses for v(next)
- A gate derived from RAW loudness is correct (it is what stops quiet-room noise from driving
  the visual) but it is invisible when it fails: everything downstream still moves, so the
  failure reads as "a bit dull" rather than "broken". Worth surfacing `quietGate` somewhere a
  VJ can see it during soundcheck.
