# lattice-interactive-3 — Session Journal

Target: `shaders/redaphid/lattice-interactive/3.frag`. Recipe: `shaders/redaphid/lattice-interactive/HANDOFF.md`
(read that first — §0 is the three bugs this session found, and the reason most of tonight's edits were
arithmetic rather than taste).

## Status
**Iter 18 (21:06).** USER: "it's still too white to project on to the tent right. i need outlines for now and then we'll build to hypercolor in the course of an hour". Pre-move read (10 samples): tonal/melodic — crest 0.63, melodyFlow 0.83, bass 0.48 level but 0 clear kicks (bassZ mean -0.46), treble 0.65, roughness 0.50, energySpring 0.17. Frame: lum 0.078, dark 0.769, clip 0, lumSpread 0.163, 61 fps. Diagnosis: lines reached L~0.86 (lumMax 0.859 last tick) and on fabric a bright line reads WHITE regardless of hue — an L-cap problem, not a hue problem. Move: SET ARC — global `gArc = clamp((iTime - T0)/3600, 0, 1)` (T0 = page age at save → arc 0 at 21:06, 1 at ~22:06) scaling every intensity-like term: lush() L cap `mix(0.50, 0.96, gArc)` (pure outlines now, whites only at hypercolor); chroma base 0.235→0.30 (deep colour, not white); halo weight × `mix(0.35, 1.0, gArc)`; rim standing gain `mix(0.40, 0.62, gArc)`; detail build × `mix(0.6, 1.0, gArc)`; trail decay `0.56 + (0.06 + 0.18*bassPulse)*gArc`. New meter: `whiteish` = fraction of pixels with lum>0.35 AND sat<0.25 (what reads white on the tent). Post-move (21:08, compiled → saved, T0 = 3038 s page age, 61 fps, 8-frame avg): lum 0.013, dark 0.971, black 0.835, clip 0, bright 0, lumMax 0.212 (160x90 under-reads thin lines), whiteish 0.000, lumSpread 0.017 (from 0.163). Deliberately on the dark side of the ask; the arc carries it up. Sanity: dark 0.971 < 0.99, not a black-out.
**Iter 17 (21:00).** USER: "pay close attention to the music and adjust as necessary" + "use Claude subagent teams. we're live. impress everyone". Music read first (16 samples / 6 s): treble 0.85, centroid 0.79, entropy 0.81, roughness 0.71, crest 0.07 (no clean tonal peaks), bass mean 0.13 spiking 0.82, bass spring 0.31, 2 clear kicks (bassZ>0.6) + 6 hits / 6 s, melodyFlow 0.12 (static), energySpring 0.63, raw quietGate 1.0. Read: treble/noise-dominant grit, sparse kicks. Pre-move frame: lum 0.139, dark 0.60, clip 0.0003, lumSpread 0.143, 61 fps. Move: IRIS edge-fuzz for this corner — `haze = spectralRoughnessSmooth * gGate`; halo width `bw*(1.6 + 2.4*haze)`, halo weight `0.07 + 0.10*haze` — neon tubes fog on gritty passages, snap crisp on clean ones (light lane, alpha-masked, smoothed feature). Post-move (21:02, compiled in-page → saved, 61 fps, 8-frame avg): lum 0.126, dark 0.704, black 0.656, clip 0, bright 0.078, lumMax 0.859, lumSpread 0.057 (from 0.143). Roughness 0.30–0.48 over the window — track turned bassier/cleaner right after the read (bass 0.45, treb 0.21, centroid 0.33, entropy 0.28) so haze sat ~half; opens on the gritty sections. Team: R&D candidate-moves agent → `.claude/vj-candidates/QUEUE.md`; post-show fixes agent in an isolated worktree (lattice-nav auto-pan + index.js resize noise); scribe.
**Iter 15 (20:52).** IRIS kick path: `bassPulse += 0.35*smoothstep(0.6,1.2,waveletBassZScore)` (thresholded z — the allowed form) so zoom lunge / rings / trails / tunnel all snap on a clear kick. dark 0.662, clip 0, lumSpread 0.052, 61 fps.
**Iter 16 (20:55).** IRIS research landed. BUG FOUND: `#define quietGate liveGate` lived inside mainImage, so `bandForDepth()` and `fractal()` (defined ABOVE it) read the raw gain-dependent `quietGate` all night — per-depth band lighting (iter 4) and treble-taut (iter 8) were dead on quiet passages. Fixed with a real global `gGate` set before fractal() runs; every use now goes through it. Also: IRIS `kickExcess = clamp((wavelet_bassHit-1)*0.5)` tier into gKick (bassHit measures 90–214 on hits here, so the tier is effectively binary — fine); removed `melodyFlow` from the spin ANGLE (Iris: audio in amplitude, never in phase — it rocked back). dark 0.672, black 0.575, clip 0, lumSpread 0.061, 62 fps. NOTE: raw quietGate read 1.0 during this loud window — it is gain-dependent, not always dead.

**Iter 14 (20:48).** USER: "use Iris series for inspiration re: reactivity". Applied the iris/wavelet TUNNEL PUSH (its knob_28, 'a big part of apparent SPEED'): previous frame sampled zoomed toward centre `tuv *= 1 - (0.006 + 0.022*bassPulse)` so trails streak radially = flying forward, harder on the kick. Bass spring 0.32–0.73. lum 0.134, dark 0.686, black 0.628, clip 0, lumSpread 0.148 (reactivity-driven, accepted), 62 fps. Iris research agent still running for the full mapping list.

**Iter 13 (20:43).** Read-first tick: lumSpread 0.147 from the detail-budget KNEE at energySpring 0.35 sitting right at track energy → fine levels flipping in/out. Softened to slope `(energySpring-0.22)*1.05`. Then USER: "more reactivity. zoom with it. definitely at first" → ZOOM LUNGE `navz *= 1 + 0.45*bassPulse` (bass SPRING only, gPix follows) + gReact floor 1.5→2.0. Directive change: reactivity now outranks the lumSpread<0.1 target; lum following the music is intended. Bass spring 0.26–0.84 → ~38% lunge. lum 0.163, dark 0.581, black 0.536, clip 0.001, lumSpread 0.126, 61 fps.

**Iter 12 (20:36).** Motion trails now that the lattice travels: feedback decay `0.62 + 0.18*bassPulse` (max 0.80) — lines streak on kicks, snap crisp between; rim standing gain 0.56→0.52 as the counter. Bass spring 0.67→0.10→0.49 over the window. lum 0.105, dark 0.673, black 0.598, clip 0, lumSpread 0.073, 62 fps.

**Iter 11 (20:27).** USER: "we need it to be moving forward, navigation wise, constantly" + shiver reminder. (1) FORWARD: lattice-nav has NO auto-pan (drag + friction glide only; knob_1 is drag sensitivity) — navX/navY measured exactly 0 all set. Added a seamless bass-paced drift in the shader: `world += vec2(0.80,0.55)*(bTime*0.03 + flowPhase*0.02)`. Touch hit-test on dial nodes is offset while on (MIDI unaffected). (2) SHIVER: `liveGate` was built from RAW per-frame energy/bass and multiplied ring radius, line width, spin, hue → swapped to `energySpring*1.7 / waveletBassSpring*1.4`. (3) hue span across depth widens with `build` (two-tone at peaks). First tick using the pending-file → in-page GL compile → /__save-shader protocol. Peak passage (energy 0.88): lum 0.135, dark 0.625, black 0.506, clip 0, lumSpread 0.079, 61 fps. Watch dark on the next normal passage; pull gate scale if < 0.65.
**Iter 11b (20:31).** Frame was too dense for the tent: `build = energySpring*1.4` pinned at 1.0 for any energy > 0.7 (most of a loud track). Recalibrated `build = clamp((energySpring-0.35)*1.6)`: opens above mid energy, full only at peaks. Normal passage (energySpring 0.33–0.54): lum 0.110, dark 0.721, black 0.669, clip 0, lumSpread 0.044, 61 fps.

**Iter 10 (20:21).** Dial-node rings glow on the kick: `hueC * (...) * (1 + grab + gKick*0.7)` in dialDistort. INCIDENT: first save failed to compile — `gKick` undeclared at line 933 (globals were declared AFTER dialDistort; the static linter cannot see forward references, the skill warns about exactly this). Page spammed ~1100 compile errors holding the last good frame for ~20 s. Fix: hoisted the globals line above every function. Recovered: 60 fps, lum 0.077, dark 0.755, black 0.686, clip 0, lumSpread 0.025. PROCESS FIX from iter 11 on: write to `.claude/vj-pending.frag`, GL-compile it in-page via __vjValidate, only then copy into 3.frag.

**Iter 9 (20:16).** Detail budget follows sustained energy: `build = clamp(energySpring*1.4)` widens the sub-pixel gate `res` upper edge 1.6→(1.6+1.2*build); counter-ratchet `lit *= 1 - 0.30*build*ldw` dims the admitted fine levels. energySpring 0.36–0.58 → build ~0.7. lum 0.066→0.083 while dark 0.817→0.75, black 0.70, clip 0, lumSpread 0.076: line count up, light nearly flat.

**Iter 8 (20:12).** Treble tightens FINE line width: `bw *= 1 - 0.35*ldw*clamp(waveletBand5Spring*quietGate)` (coarse outlines unchanged, floor 65%). Treble spring 0.38→0.04 over the window (energy 0.54, treb 0.76). lum 0.066, dark 0.817, black 0.718, clip 0, lumSpread 0.07. Width-not-light lane confirmed stable.

**Iter 7 (20:08).** Spin RATE from `flowPhase` (bass-paced monotonic accumulator; advanced 95.99→96.36 with no reversal); direct `melodyFlow` angle term halved 0.5→0.25. First try at 0.35 pushed lumSpread to 0.132 (second geometry mover stacked on iter-5's ring swell — exactly what the iter-5 note warned about); backed off to 0.18 → spread 0.045. Quiet passage: lum 0.028, dark 0.91, black 0.83, clip 0; lum followed the bass spring 0.15→0.02, i.e. lines dim in the quiet by design.

**Iter 6 (20:04).** Hue follows `waveletCentroidSpring` 0.14→0.30 (slow, smoothed colour lane). Spring 0.30–0.40 over the window (energy 0.72, centroid 0.79); lines blue-violet (line RGB 0.30/0.19/0.52). lum 0.050, dark 0.859, black 0.756, clip 0, lumSpread 0.048.

**Iter 5 (20:00).** Cell-centre rings SWELL on kicks: `gCross = 0.17 + bassPulse*0.11` (was a 0.05 shrink). Bass spring 0.37–0.57 over the window (energy 0.58, treb 0.89, centroid 0.87). lum 0.074, dark 0.80, black 0.72, clip 0, lumSpread 0.094 — at the edge of the <0.1 target because the swell moves line area; hold here, don't add another geometry mover this track.

**Iter 4 (19:56).** Per-depth band lighting flipped the right way round: bass→coarse outlines, mids→middle, treble→fine detail; band coefficient 0.35→0.75, standing gain 0.64→0.56. Music playing (energy 0.48, treb 0.75, centroid 0.74, bassHit spike 15.7); bass spring 0.12→0.58 across the 8-sample window. lumMax 0.26→0.60 while dark 0.873 / black 0.782 / clip 0 / lumSpread 0.03 — lines brighten with the music, frame does not pump.

**Iter 3 (19:52).** Cell-centre circles were FILLED pie-discs (`length(uv)-gCross` negative inside → whole interior 'on the line'); `abs()` makes them rings. Frame: lum 0.024, dark 0.904, black 0.809, clip 0, lumSpread 0.019, lumMax 0.262 (160x90 downsample under-reads thin lines). Quiet passage (energy 0.07, bass 0.89, centroid 0.19). Look = black wireframe; next: neon brightness ON THE LINES, then music-driven moves (hue/phase/spin-rate/per-depth bands).

**Iter 2 (19:47).** User: "black background, inside the lattice mostly black too"; venue = TENT WALL AT NIGHT, nothing overwhelming. Move: sub-pixel LEVEL FADE `res = smoothstep(bw*1.6, bw*0.5, alias)` on rim+halo, so a level that can't resolve as a line vanishes instead of smearing into haze. INCIDENT: first version sent the projector 100% BLACK (dark 1.0) because the shader's `alias` was `1/resY*scale` — it never included the `0.07/navz` zoom, so it was 3-14x the true pixel footprint (this is also why every zoom level had haze). Fixed with `gPix = (0.07/navz)/iResolution.y` as aliasBase. Result at navZoom 0.239: lum 0.043, dark 0.836, black 0.785, clip 0, bright 0, lumSpread 0.04.

**/vibej2-pw run started 19:38, iter 1/180, cron 6bcdfe4e, mic, Playwright fullscreen verified (outer 1440x900, chrome 0).** Brief: neon cyberpunk outline, rim only, mostly black. Iter 1: coarse rim factor 0.30→0.20, halo weight 0.18→0.07 → lum 0.206, dark 0.223, sat 0.968, clip 0, lumSpread 0.059 (all in target).

**2026-09-06, live set in progress.** Playwright MCP browser · mic audio · `remote=display` ·
`wavelet=true` · controllers `lattice-nav` + `lattice-controls` · `knob_1=0.21`. Branch
`vibej2-audio-source`.

**Look landed ~19:40:** black ground + thin near-opaque neon rims + a hue-travelling depth pulse. Last
8-frame measure: **lum 0.254–0.336** (spread 0.08), **clip 0** on all frames, **sat 0.89–0.94**,
**dark 0.06–0.18**, **bright 0.04–0.15**.

Commits tonight, in order:
- `b88d572` — gesture fullscreen (window-capture listeners) + `lumAcc` normalisation + floored gate
- `be504d9` — tendril floor → true black; rim opacity restored
- `2d3509c` — `HANDOFF.md`, the flow-state recipe
- `74ef410` — stop the depth-pulse flash; depth-scaled rim width

**User directives for this shader, verbatim, in the order given:**
1. *"make the background black, with kind of a neon vibe"*
2. *"Less flashy"*
3. *"No global brightness change"*
4. *"Make lattice mostly rim lighting"*
5. *"I need it to be black + rim lighting again"* — after a regression to a bright field

All five stand. #3 is absolute: audio may ride only spatially-sparse, alpha-masked layers (rim,
filaments, hue). #5 is the reminder that a regression is one edit away and the meter is what catches
it, not the eye.

## Cool moments
- **iter18 set arc (21:06):** user named a one-hour build ("outlines for now... hypercolor in the course of an hour"); answered with ONE monotonic scalar `gArc` hanging every intensity coefficient off it, instead of hand-brightening tick by tick. The "too white" complaint was an OKLCH L-cap problem (lines at L~0.86), not hue — capped L at 0.50 and pushed chroma. Design hypothesis: on fabric, neon = deep colour, never bright lines.
- **iter17 music-read-first (21:00):** user asked for close listening; the tick opened with a 16-sample feature window BEFORE choosing a move, and the read (roughness 0.71, crest 0.07, sparse kicks) picked the lane — texture, not kick. Design hypothesis: the move should be chosen from the music's dominant domain that window, not from the todo list; a treble-grit passage wants a halo/width move, a kick-heavy one wants camera/bass.
- **iter13 zoom lunge (20:43):** first geometry-of-camera move; on a spring it reads as a surge toward the viewer on every kick, no shiver. Design hypothesis: camera moves are the most legible reactivity of all and are safe on springs — reserve them for the bass.
- **iter4 per-depth bands (19:56):** the first move where the meters show music in the LINES and not the frame — lumMax doubled on a bass hit with lum/dark unchanged. Design hypothesis: this is the lane; keep adding audio to depth-indexed line properties (width, hue, ring radius), never to exposure.
- **The flash diagnosis (the night's real finding).** Three consecutive rounds of the screenshot and
  the meter *disagreeing* — a screenshot reading bright while the meter said the mean was fine, then
  the reverse — were not bad sampling and not a meter bug. **The frame was oscillating.** A single
  screenshot lands at a random phase of the depth pulse; a single meter sample does the same; two
  random phases disagree. The tell was that the disagreements kept flipping sign. Once the question
  became "how far apart are consecutive frames" instead of "what is this frame", an **8-sample time
  series** answered it in one shot: `lumSpread` (max − min of lum over 8 consecutive frames) is now
  the flash meter. The depth pulse's lightness swing was the flash; it was moved to **hue** (`s +=
  wave * 0.10`) and its lightness terms cut to `0.04 + gKick*0.08` and `0.14 + gKick*0.16 +
  gPop*0.08`. Spread after: **0.08** across 8 frames, clip 0. Directive #2, *"Less flashy"*,
  closed by measurement.
- **The look arriving (~19:40).** Black ground, thin near-opaque neon rims, hue-travelling pulse.
  The first frame all evening that satisfied directives #1, #3 and #4 at once, with the meter agreeing
  with the screenshot across all 8 samples.
- **Three arithmetic bugs found by refusing to believe the palette.** `lumAcc` never divided by alpha
  (frame pinned at one lightness); `quietGate` at 0.002 with music playing (every reactive term
  multiplied to zero); `leadTendril` glow baseline 1.0 with a mask covering the whole screen (a
  0.12–0.17 luminance floor nothing could get under). Each was preceded by rounds of palette edits
  that moved the needle by < 0.02. Full write-ups are HANDOFF §0.1–§0.3.

## Todo
- [ ] iter18: at ~21:25 (arc≈0.3) re-check `whiteish` and dark; if whiteish > 0.01 before arc 0.6, lower the L-cap ceiling 0.96→0.85. Expect dark to fall from 0.971 and lum to rise from 0.013 roughly linearly to 22:06.
- [ ] iter18: `gArc` is wall-clock from the save — if the page reloads, T0 resets and the arc restarts at 0 (outlines). If a reload happens mid-set, re-seed T0 or add a URL param. Check `whiteish` every tick from here; log the arc value alongside lum so the build is auditable (expect lum to climb ~monotonically toward 22:06).
- [ ] iter18: lumSpread 0.163 pre-move — highest of the night, on a tonal/no-kick passage (so not bass movers) — dropped to 0.017 with the arc at 0, i.e. it scales with intensity, so it WILL return as gArc climbs. Suspect halo width × haze (iter17) at mid roughness; re-check spread at arc≈0.3 alongside whiteish.
- [x] iter17: halo-fuzz post-move numbers confirmed — lumSpread 0.143→0.057, dark 0.60→0.704, clip 0. Still unverified: haze at full (roughness ≥0.7) — the window only reached 0.48. Re-measure on the next gritty passage; if spread > ~0.16 pull the weight term 0.10→0.06 before the width term.
- [ ] iter17: R&D queue at `.claude/vj-candidates/QUEUE.md` — pull from it, don't invent, while it has entries. Post-show worktree agent owns lattice-nav auto-pan + index.js resize noise (supersedes the older POST-SHOW bullet below; both wait for a break).
- [ ] POST-SHOW: move the forward drift into lattice-nav.js (auto-pan velocity) so dial touch hit-testing stays exact. Controllers are in Vite's watch-ignore, so this needs a reload — never mid-set.
- [x] Pre-save GL validation via the pending-file handoff — deviated from the skill for 10 ticks and it bit on iter 10. Mandatory from iter 11.
- [ ] **dark 0.06–0.18 is under the 0.20–0.29 target.** One more thinning of the coarse rims — `bw`
      coarse factor 0.30 → ~0.22 — if the user wants more black. Not before they ask; the current
      frame is on-directive.
- [ ] **lum ~0.28 vs the 0.15–0.20 target.** Acceptable for a neon rim look, where the target was
      written for a fuller field. Revisit only on request.
- [ ] **knob_6–16 exist only in `wip/lattice-interactive-vj/1.frag`, not in 3.frag.** Sending them
      does nothing here. Don't wire more knobs mid-set.
- [ ] **Playwright MCP restart needed** for the `--start-fullscreen` config
      (`~/mcp/playwright-mcp.config.json`, `viewport: null`) to take effect. Live workaround in use:
      `browser_resize` to 1440×900. Restart at a break, never mid-set — it drops the display.
- [ ] Sweep the family for the same two structural bugs: any accumulator channel not divided by its
      weight; any `col +=` after `mix(bg, col, alpha)` whose mask never reaches zero on screen.

## History of changes
- iter18: SET ARC `gArc` (0→1 over 60 min from 21:06) on L cap 0.50→0.96, halo weight, rim gain, build, trail decay; chroma 0.235→0.30. New `whiteish` meter. lum 0.078→0.013, dark 0.769→0.971, whiteish 0, spread 0.163→0.017. User: too white on the tent → outlines now, hypercolor by ~22:06.
- iter17: music-read-first tick; roughness→halo width/weight fuzz (`haze = spectralRoughnessSmooth*gGate`, width ×(1.6+2.4h), weight 0.07+0.10h). lumSpread 0.143→0.057, dark 0.704, clip 0. First subagent-team tick.
- iter15: Iris kick path into bassPulse (thresholded bassZ).
- iter16: gGate global (the #define scope bug — a #define inside mainImage does not reach functions above it); kickExcess tier; melodyFlow out of the spin angle.
- iter14: Iris tunnel push on the feedback sample (0.006 + 0.022*bassPulse).
- iter13: build knee→slope (0.22, 1.05); ZOOM LUNGE on bass spring 0.45; gReact 1.5→2.0. Spread target relaxed by user in favour of reactivity.
- iter12: bass-stretched motion trails (decay 0.62→0.80 on the kick), rim gain 0.56→0.52.
- iter11b: build recalibrated (energySpring-0.35)*1.6 — density only at true peaks.
- iter11: constant forward drift (bass-paced), liveGate → springs (shiver fix), depth hue-span × build. Protocol: pending → GL compile → save.
- iter10: dial rings + gKick*0.7 (local). Globals hoisted to the top of the file after a forward-reference compile failure.
- iter9: energy-driven detail window + counter-ratchet on fine-level gain. dark 0.82→0.75 at build≈0.7.
- iter8: treble→fine-line width (taut on hits). Spread 0.07.
- iter7: flowPhase*0.18 into gSpin (rate-not-angle), melodyFlow 0.5→0.25. 0.35 was too much with the ring swell active — spread 0.13; fix-in-tick to 0.18.
- iter6: centroid-spring hue lean 0.14→0.30. Colour-only; spread stayed 0.048.
- iter5: ring swell on bass (gCross 0.17 + bassPulse*0.11). lumSpread crept to 0.094 — geometry movers cost stability; one per track.
- iter3: cell-centre discs → rings via `abs(length(uv) - gCross)`. Filled discs were the last 'wall of colour' element and are on the vetoed orbs list.
- iter2: sub-pixel level fade (`res`) + TRUE pixel footprint `gPix` (the old `alias` ignored zoom). One-frame black-out on the projector while the gate was miscalibrated — always sanity-check `dark < 0.99` in the post-edit measure.
Each bullet carries the number that proved it.
- **`lumAcc` normalised** — `lumAcc * ia`, matching `fieldAcc`/`waveAcc`. `lit` had been arriving at
  ~2–4 and saturating the L ramp; lumAvg **0.634 → 0.306**, clip **27.7% → 4.9%**. (`b88d572`)
- **`quietGate` replaced** by a floored energy/bass gate: `clamp(0.45 + clamp(max(energyN*1.6,
  bassN*1.3) - 0.10, 0, 1) * 0.85, 0, 1.3)`. Shipped gate measured **avg 0.002 / max 0.016** on the
  mic **while music played** (bass swinging 0.23–0.75, `wavelet_bassHit` to 3.16). (`b88d572`)
- **rim / halo / body rebuilt; `body` removed.** Light confined to the cell edge + a tight halo;
  interiors near-black. Directive #4. (`b88d572`, `be504d9`)
- **Both global multiplies removed** — `col *= 1 + audio` pump and the trailing `col *= 1.10`.
  Directive #3. The `1.10` line stays in the file as `col *= 1.0` with the directive quoted, as a
  tombstone. (`b88d572`)
- **`lush()` L ramp → `pow(lit, 1.55)` with a zero floor;** chroma rolls off with L so near-black
  pixels don't go grey-tinted. The old `0.06 +` additive floor capped `dark` regardless of anything
  else. (`be504d9`)
- **`leadTendril` glow baseline 1.0 → 0.0.** `within` only masked along the tendril; every screen
  pixel sat inside some tendril's length → uniform floor. **lumMin 0.119 → 0.006, dark 0% → 83%**
  from one line, after five palette edits each moved lumMin < 0.02. (`be504d9`)
- **`gBorder` 0.10 → 0.034.** Coverage of interiors was the fat-rim problem, not a weight problem.
  (`be504d9`)
- **Rim weight 0.42 → 0.90.** In `fractal()` the weight *is* the alpha; 0.42 had dimmed every rim to
  42% opacity through `mix(bg, col, alpha)`. The "neon rims" measured at lumMax 0.9 earlier were the
  tendril filaments (≈4 × 0.22); real rims measured **lumMax 0.176** until this. (`be504d9`)
- **Rim width depth-scaled** — `bw = gBorder * (0.30 + 0.70 * ld)`: coarse levels get thinner lines,
  fine levels keep theirs, so the coarse cells stop flooding. (`74ef410`)
- **Wave pulse moved from lightness to hue** — `s += wave * 0.10`; lightness terms cut to
  `0.04 + gKick*0.08` and `0.14 + gKick*0.16 + gPop*0.08`. 8-frame lumSpread **→ 0.08**, clip 0.
  Directive #2. (`74ef410`)
- **sin-grid sparkle kept at 0** — `float spark = 0.0;  // VETOED`. Vetoed 09-05 (*"get that white
  dot grid gone"*); pinned deliberately, not dead code.
- **`gReact` floor raised to 1.5** — `knob_5` rode at 0 all night, pinning the old expression to 1.0
  and putting the reactivity dial's whole useful range above where the hand ever went. (`b88d572`)

## Forks
None tonight. `3.frag` was edited **in place** — the user chose that over a scratch fork. The
graduated design arc (1 → 2 → 3) lives in `shaders/redaphid/wip/lattice-interactive/lattice-interactive.md`.

## Design hypotheses for v(next)
- **Set arc.** When the user wants a build "over the course of an hour", make ONE monotonic arc scalar (`gArc = clamp((iTime-T0)/3600)`) and hang the intensity coefficients off it with `mix(now, later, gArc)` — never hand-brighten tick by tick (iter18). Every later tick tunes a shape, not a level; and the arc reads back as a number next to lum.
- **"Too white" on a projector is an L-cap problem, not a hue problem** (iter18). Lines at OKLCH L~0.86 read white on fabric whatever their hue; cap L (≤~0.5 for outlines) and push chroma. Add a `whiteish` meter (lum>0.35 AND sat<0.25) so the complaint has a number.
- **Read 6 s of features before choosing; the track profile, not the shader's wiring gaps, should pick the lane** (iter17 — first move chosen FROM a music read rather than from the wiring list). A 16-sample window (treble/centroid/entropy/roughness/crest + kick count + springs) names the dominant domain; one move from that lane, and write the passage profile next to the numbers so they have a context. Caveat measured the same tick: the track changed character within 2 min of the read (roughness 0.71→0.30–0.48), so a smoothed feature with a floor beats a hard-coded profile.
- A `#define` placed inside a function only renames text AFTER it. Never use #define to retarget a uniform for helper functions — use a global set at the top of mainImage. (Cost tonight: two 'proven' reactive moves were silently dead for 12 ticks; the meters attributed their motion to other terms.)
- Iris rule adopted: gate GEOMETRY hard, gate COLOUR softly with a floor. Iris rule adopted: audio in AMPLITUDE, never in PHASE/ANGLE.
- **Never trust one frame; measure a spread.** A screenshot and a single meter sample are both
  point samples of a moving signal, and their disagreement is *information about motion*, not about
  either instrument. Any "flashy" complaint should be answered with an N-frame spread before a single
  coefficient moves. Candidate: fold `lumSpread` into `aesthetic-meter.js` as a first-class metric
  next to `flicker`, which measures motion *jitter* and missed this because the pulse was smooth.
- **A mask has coverage, not just presence.** §0.3's `within` was a real mask that happened to cover
  the whole screen. Every `+=` layer deserves the question "where on screen does this multiplier
  reach zero" — if the answer is nowhere, it's a floor.
- **Weight-is-alpha accumulators need the SDF width as the subtlety knob.** When one scalar feeds
  both weight and alpha, "make it subtler" and "make it transparent" are the same edit. Reach for
  `gBorder`/`bw`, never the weight.
- **Audio → hue is the safest reactive channel this shader has.** The wave pulse reads as musical in
  hue and as a strobe in lightness. Where the next reactive term wants to go, try hue first.
- **A gate readout on the pad** would have made §0.2 a five-second diagnosis instead of an hour.
