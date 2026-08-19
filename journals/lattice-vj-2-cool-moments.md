# lattice-vj-2 — Session Journal (unguided exploration run, 2026-08-18 afternoon)

Parent journal: `journals/lattice-vj-1-cool-moments.md` (all rules, vetoes and the post-mortem live
there — read it first). This file is the NOTES-AS-WE-GO log the user asked for: "unguided exploration
vibej… I need notes as you go so we can have a good show next time."

## Status
Iter 1/180. Rig: display tab (localhost:6969, `remote=display`, room `r017686ce73`), tab audio from
Spotify tab (energy 0.105, gate 1.0 — verified), no TAKE OVER (messageParams empty), cursor hidden
via CSS, validator installed. moveStyle subtle, mode = unguided exploration.

## Pre-show notes (what setup cost this time)
- Tab audio + Spotify tab both needed a human. Two prompts before the first real tick. NEXT SHOW:
  open Spotify FIRST, start music, then open the display, then click Share tab audio — one pass.
- The 2.md preset URL comes up legible immediately (structured, saturated, vignetted). No legibility
  emergency at tick 1 — the iter-27 legibility pass holds on a different track (dubstep vs choral).

## Observations log (per tick, honest)
### Iter 1 — Dirt Monkey *LIGHTYEARS* (dubstep)
- Features: energy 0.105, bass 0.25 / mids 0.19 / treble 0.92, centroid 0.62, roughness 0.59,
  wubDepth **1.00 (pinned, as predicted on reese/dub)**, sectionMode 0, bassNoteFlow 0.23,
  waveletTilt raw −0.37 (bright) while waveletTiltNormalized read 0.78 — **normalized and raw
  tilt disagree in sign-meaning; use raw/median for semantics, normalized only for range**.
- B0 screenshot: legible lattice, green/cyan/magenta, decent vignette, but the frame is uniformly
  mid-bright — the dark floor is thin (darkest areas are olive borders, no true black).
- MOVE: `gCrossBias -= clamp(waveletTiltMedian,-1,1)*0.05*quietGate` — spectral tilt (bass-heavy
  vs bright) permutes the cell shape (cross vs hex). Structural, slow (median), TAKE-OVER-proof.
- D2 screenshot ~90 s later: **the whole palette had swung green/blue → orange/yellow/red.** Not
  from my edit (structural only). Some palette driver moves FAST enough to re-tint the whole field
  inside two minutes — candidates: melodyFlow term, sectionMode/Mix glide, bassNoteFlow tilt,
  paletteShift. TODO next tick: read `s` drivers and clock the hue rate. User previously asked for
  ≤ ~0.03 hue/min. This is a real "flashing colours" risk on the projector.
- Also seen: fine speckle grain inside the bright yellow cells — the finest recursion levels
  showing through the level window as texture. Not offensive at this zoom, watch it.

## Cool moments
(none yet)

## Todo
- `[ ] clock the palette hue rate` — full-field green→orange in < 2 min at iter 1. Find the driver.
- `[ ] deepen the dark floor a touch` — no true darks in the frame; consider bg 0.30 → 0.22 or
  gamma 0.92 → 1.0. Do it only after looking again; not urgent.
- `[ ] wubDepth pins at 1.0 on dubstep` — the iter-1 (vj1) breath multiplier is a constant here.
  Controller-side softening (`wubDepth` curve) is the real fix; shader can't see the waveform.

## History of changes
- iter 1: + waveletTiltMedian → gCrossBias (cross↔hex by spectral balance).

## Design hypotheses for v(next)
- Take the tilt SIGN semantics from the raw/median value; the normalized one is range-only.

### Iter 2 — user: "It's twitchy. and I don't like the scrolling right now" (Dirt Monkey → Zeds Dead *Sweet Memories*)
- DIAGNOSIS (not an addition): the wavelet-ease springs are stiff 120 / damp 22 → settle in ~0.4 s,
  so on dubstep they CHASE the 2–4 Hz wobble. Every geometry term fed by a `*Live` spring therefore
  pulsed at wub rate: `gHexR` mids·0.12·(1+wubDepth·0.8) with wubDepth pinned at 1.0 = a 0.22 cell
  breath at wobble speed; `gBorder` treb·0.06 flicked line thickness on every hi-hat; `gCross`
  bass·0.05; kick twist 0.04 rad/level on continant hits.
- FIX (subtractions): gHexR mids 0.12·(1+wub) → 0.05 (wub multiplier gone from geometry); gBorder
  treb .06→.025 / bass .04→.02; gCross .05→.02; gFill .035→.02; kick twist .04→.015. Music stays
  fully in SHADING (lit, rim, shadow, gPop) which is where fast signals belong.
- SCROLLING: `#define FLIGHT 0.0` multiplies the iter-22 auto-flight to zero. Phone pan intact.
  The continuous fold rotation (`bTime*0.08`) is left in — that is rotation, not translation; if
  the user still says "scrolling", THAT is next.
- RULE (for the skill): "springs" are not automatically slow. A critically-damped spring at ω≈11
  rad/s is a ~2 Hz low-pass — fine for shading, TOO FAST for geometry on wobble bass. Geometry
  wants ≤ 0.5 Hz drivers (means/medians, phases, section state) or dead-zoned onsets.
- Screenshot after: green/purple lattice, calm; fine speckle "filigree" inside the pink cells is
  the finest recursion levels — could read as micro-twitch when centroid pushes the level window
  to fine. Watch; if twitch persists, bias gDepthFocus coarser or freeze it to a slower driver.
- Palette swung again (orange → green/purple) but this time coincident with a TRACK CHANGE
  (melodyFlow / bassNoteFlow re-settle) — so the iter-1 swing may also have been intra-track section
  movement in Dirt Monkey. Still want to clock it.

## User asks (running list, verbatim-ish)
- "unguided exploration… I need notes as you go so we can have a good show next time" → this file.
- "It's twitchy" → iter 2 fix.  "I don't like the scrolling right now" → FLIGHT 0.
- "test out novel ways of determining if an animation is aesthetic, or good for music, as you go.
  Send me screenshots" → build in-page METRICS (frame-diff motion, luminance histogram, hue drift,
  motion↔energy correlation) and attach screenshots to tick summaries from iter 3 on.

## Aesthetic meter (novel-judgement experiment, started iter 2)
Script: `scripts/vj/aesthetic-meter.js` (paste into the display tab; `window.__vjMeter.summary(60)`).
Samples the WebGL canvas at 10 Hz (64×36) and reports lum / dark / clip / sat / motion / flicker /
motion↔energy r / motion↔bass r / hue drift per min / hue concentration. Hypotheses to test this run:
- H1 **motion↔energy r > 0.3 means "reacts to music"**; r ≈ 0 while motion > 0 means "moves regardless"
  (the plasma-VJ failure mode); r > 0.3 with flicker < 0.5 = musical AND smooth.
- H2 **flicker** (|2nd diff| of motion / mean motion) is the number for "twitchy". Track it across
  the de-twitch edit: expect it to fall.
- H3 **hueDriftPerMin** is the number for "flashing colours / palette changing too much". Target
  ≤ 0.03–0.05 turns/min sustained; spikes at track changes are acceptable.
- H4 **dark ≥ 0.10 and clip ≈ 0** = a projector-legible frame (the iter-27 lesson, quantified).

Baseline right after the iter-2 edit (30 s, mid track-gap, mean gate 0.46):
lum 0.25 · dark 0.052 · clip 0.003 · sat 0.76 · motion 0.040 (sd 0.029) · flicker 0.40 ·
motion↔energy **0.42** · motion↔bass −0.18 · hueDrift **0.19/min** · hueConc 0.54.
Reading: reacts to music (H1 pass), not clipped, dark floor thin (5% < 10%), palette drifting ~6×
faster than the user's stated tolerance (H3 FAIL — investigate which `s` term).

### Iter 3 — Zeds Dead *Miracle Man* → Ganja White Night *Ego Death*
- Meter over the previous 60 s (in-track): lum 0.30, **dark 0.014**, clip 0.014, sat 0.81, motion
  0.029, flicker 0.53, motion↔energy **0.50**, hueDrift **0.001/min**. So: hue is STABLE inside a
  track — the big palette swings are at TRACK CHANGES (melodyFlow/bassNoteFlow re-settle to a new
  key). The 0.19/min at iter 2 straddled a track gap. Reframed todo: slow the palette's response
  to a KEY change (a few-second whole-field re-tint), not the steady-state drift.
- MOVE: tonemap gamma 0.92 → 1.18, gain 1.02 → 1.00. Meter 8 s after: dark 0.014 → **0.078**,
  clip 0, lum 0.29, sat 0.96 (gamma>1 also deepens saturation — watch for "too neon").
- Screenshot: real darks, red accent cells POP against dark green, blue filigree cells read as
  depth. Best-looking frame of the run so far. Structure > brightness.
- User (mid-tick): "the output of this session should be notes and maybe some shaders in a
  dedicated subfolder for reference" → `shaders/redaphid/wip/lattice-vj/explore-2026-08-18/`
  (README, NOTES.md, meter script, iterNN-*.frag snapshots).

### Iter 4 — Ganja White Night *Ego Death* (drop) → Effin *Dreams Come True*
- B0 screenshot: BRIGHT neon (green/cyan/pink/orange), sat 0.86, dark back to 3.3% — the drop
  lifted everything. Meter 60 s: hue 0.46 → 0.61 INSIDE the track (0.17/min), lum swinging
  0.20↔0.44 on a 5-s trace (drop/breakdown), flicker 1.16, motion↔energy only 0.11.
- ROOT CAUSE of the in-track hue swing: `melodyFlow` slews 0.03/frame → a melodic leap moves it
  0.5 in ~0.3 s, and it drove hue at ×0.15 → whole field re-tints 0.075 in a third of a second.
  Sum of hue movers over that minute: melody 0.075 + centroid 0.025 + sectionMode 0.03 +
  bassNote 0.012 ≈ 0.14 — matches the meter.
- MOVE: `melodyFlow*0.15` → `melodyFlow*0.05 + pitchClassMean*0.10` (pitchClassMean = ~8 s
  rolling key estimate; the fast tracker keeps 1/3). Whole-field colour now follows the KEY,
  not the NOTE.
- Meter idea validated: a 5-s hue/lum TRACE (not just the summary) is what exposed this — the
  60-s hueDrift alone had read 0.001 one tick earlier because that track sat in one key.
- Screenshot after (new track, purple/red/gold): legible, real darks, gold filigree reads as depth.

## Todo (added iter 4)
- `[ ] lum swings 0.20↔0.44 on drops` — probably fine (drops SHOULD brighten) but if the user says
  "flashing", cap the lit gain: `col *= 1 + bassPulse*0.12 + dropGlow*0.13 + gKick*0.10` and the
  `lit` scale in fractal().
- `[ ] motion↔energy fell to 0.11 during the drop` — hypothesis: motion saturates when everything
  is moving; the metric needs a normalised variant (motion / lum?) — try next tick.

### Iter 5 — Effin *Dreams Come True* (2 min in) → HEXED *Take A Trip*
- B0: SAME track as iter 4, yet purple/red/gold → green/blue/red in two minutes. Meter 90 s:
  hueDrift 0.29/min, hue trace (10 s steps) 0.49 .45 .54 .62 .49 .67 .56 .57 .57.
- Two findings:
  1. **The meter's whole-frame mean hue is confounded by LIGHTING** — which cells are lit decides
     the mean when the frame holds 3 hues (hueConc 0.72). Trace wobble ±0.1 on 10 s is partly that.
     Fix for the meter: measure hue at STRUCTURAL anchors, or histogram-mode hue, or hue of the
     brightest 20% only. (todo)
  2. **The single biggest palette mover was a CLOCK**: `s += bTime*0.012` with bTime = iTime/3 →
     0.004 turns/s = **0.24 turns/min** — a full hue cycle every ~4 minutes, regardless of music.
     Everything music-driven added ≈ 0.06/min on top at section/track changes. The user's
     "palettes changing too extremely" was mostly this one line.
- MOVE: bTime*0.012 → 0.002 (one turn per ~25 min). Note: hot-swapping a `time*k` term JUMPS the
  value once (bTime is hundreds of seconds) — accept the one-off jump, or phase-match it. Next
  time change such constants BEFORE the show.
- After: new track, wide orange field with a horizontal band of cyan/magenta cells — the level
  window went coarse (dark passage) and the fold ratio is at a wide-zigzag point. Legible, strong
  focal band. Cells look horizontally stretched here — check aspect handling next tick if it recurs.

## Todo (added iter 5)
- `[ ] meter: lighting-independent hue` (anchors / brightest-20% / histogram mode)
- `[ ] confirm the lattice is isotropic on a 2:1 viewport` (iter-5 shot looked stretched)

### Iter 6 — HEXED *Take A Trip* (lit passage) → Sub Focus *On & On (Taiki Nulight rmx)*
- Meter 90 s after the iter-5 clock fix: hueDrift **−0.08/min**, trace flat at 0.49 ±0.03 for
  the first 60 s → the palette now HOLDS inside a track. Music hue-term delta over 90 s: −0.024.
  (Driver deltas: mel +0.20, pcm +0.20, centroid −0.56, bassNote −0.30, section 0.) H3 now passes.
- B0 screenshot: pastel/bright again on the lit passage — dark **2.4 %**, lum 0.30, sat 0.85.
  The iter-3 gamma bought floor on quiet passages; on lit ones `lush()`'s L range 0.40–0.84 fills
  the frame with mid-lightness.
- MOVE: `lush()` L = 0.33 + 0.40·lit (max 0.73). Meter 10 s after: dark **0.186**, lum 0.17,
  clip 0, sat 0.91. Screenshot: blue/violet lattice with green ribs, deep shadows between cells —
  reads as DEPTH now, not wallpaper. H4 (dark ≥ 0.10) passes for the first time.
- Watch: lum 0.17 may be too dark on a weak projector; if the user says "dim", go 0.36+0.40.

### Iter 7 — Dirt Monkey *Flow* → Seth David *Moon*
- New meter tools: `hueHist()` (12-bin saturation-weighted hue histogram + top modes — a
  lighting-independent PALETTE IDENTITY: this frame = 0.67/0.58/0.75 blue-violet, red < 2 % of
  weight though the red rosettes are what the eye sees → the eye weights CONTRAST, not area) and
  `onsetResponse()` (mean motion in the 300 ms after each `wavelet_bassHit` vs the 200 ms before).
- FINDING: onset gain **1.07** — after the iter-2 de-twitch the picture barely acknowledged kicks
  (7 % more motion), motion↔energy 0.01. We had thrown out the punch with the twitch. `gKick` was
  a 1-frame raw spike (`wavelet_bassHit`) so its shading response was invisible at 60 fps.
- MOVE: kick = `max(bassHit, bassHitSmooth·1.3)` → instant attack + ~0.2 s tail (an envelope, not
  a spike); shading gains up (`col *= 1+gKick·0.20`, relief `gKick·0.65`). Geometry twist stays
  0.015. Onset gain after: **1.48** (25 kicks / 20 s). Dark 0.23, clip 0.
- Metric caveat learned: **flicker (1.25 now) counts musical punches as jitter.** It needs to be
  computed OUTSIDE kick windows to mean "twitchy". Todo for the meter.
- Screenshot: red/blue on *Moon*, deep shadows, strong. sat 0.94 — the reds are intense; if the
  user says "too neon", drop chroma `0.09+seed2·0.06` a notch rather than L.

## Design hypotheses (added iter 7)
- Punch lives in SHADING with an ENVELOPE (attack fast, tail 150–300 ms). A raw trigger on a 60 fps
  render is invisible; a spring on geometry is twitchy; the envelope on relief/brightness is the
  musical middle.
- The right pair of numbers for "good for music AND not twitchy": onset gain > 1.3 AND
  off-kick flicker < 0.5.

## Cool moments (vj2 run)
### Iter 8 — Ganja White Night *Bassline Don* — the reference frame
- **Audio fingerprint** — energy 0.146–0.155, gate 1, sectionMode 8, centroidSpring 0.22 (dark
  timbre → coarse level window), bassHit firing 2.2/s (wobble), no TAKE OVER.
- **What worked** — deep green field (L 0.33 floor + gamma 1.18), embossed cells with cyan
  filigree, red accent cells; relief lighting reads as real emboss; dark 0.205, clip 0, lum 0.19,
  sat 0.86. This is the frame to aim for. Saved: `explore-2026-08-18/iter08-good-frame-bassline-don.jpg`
  and the shader state is `iter07-kick-envelope.frag` (no edit this tick — a good frame is left alone).
- **Design hypothesis** — coarse level window + low centroid + one accent hue = the "muted lattice"
  the user asked for. Bright/hissy passages push the window fine and the frame toward wallpaper.

### Iter 8 — meter notes
- `onsetResponse` collapses on wobble bass: 133 "hits"/min means the pre/post windows overlap
  and gain → 1.0 (1.03 here) even though the punch is visible. `wavelet_bassHit` is a bass ONSET
  detector, not a kick detector, on dubstep. Use it only when hits < ~1.2/s, or gate by
  `wavelet_punch`. `offKickFlicker` (new): 0.67 with only 102/600 samples off-kick — same problem.
- `hueHist` is saturation-WEIGHTED → vivid accents dominate (this frame reads "red" 0.27+0.22+0.16
  though it is mostly green); the area mean hue is lighting-dominated. Both views are needed:
  hist = "what pops", mean = "what fills".

### Iter 9 — BLAAP/Of The Trees *MUSHROOMS* (quiet intro)
- B0: near-BLACK frame — energy 0.074, gate 1 (so not the gate), glowLive 0.32, band3 0.13. The
  `lit` scale `(0.7 + glow·0.4 + band·0.7 + bass·0.6)` spans 0.7→2.4; on a quiet passage lum
  accumulates to ~0.1 and with L 0.33 base + gamma 1.18 + vignette that is black on a projector.
  Iter 3/6 fixed "too bright" and over-corrected the QUIET end. Both ends must be checked.
- MOVE: lit scale → `(0.95 + glow·0.35 + band·0.55 + bass·0.45)` (0.95→2.3). Meter 8 s after:
  lum 0.18, lumMin 0.11 / lumMax 0.26, dark 0.18, clip 0. Screenshot: olive/blue lattice, moody
  but readable.
- Meter: added `lumMin`/`lumMax` to `summary()` — a 60-s MEAN lum of 0.17 hid a black instant.
  Rule: judge legibility on lumMin (want ≥ ~0.10) and clip on max, never on the mean.
- The tension to design for next time: one tonemap has to serve a quiet intro AND a drop. A
  compressed music→lightness range (≈2.4× not 3.4×) with the floor ≈ 0.95 does it here.

### Iter 10 — Ghastly *Hold Me One More Time* → INZO *Nexum*
- Meter (60 s, Ghastly): motion↔energy **0.60**, hueDrift −0.003/min, dark 0.12, clip 0,
  lumMin 0.08 / lumMax 0.34, sat 0.94. Healthiest full set of numbers so far — the picture moves
  WITH the music, holds its palette, keeps a floor. Blue/teal field with dark cells; a bit flat.
- MOVE (structural, since the frame is healthy): `waveletSpreadMedian` (unused until now) → fold
  ratio `gScale += (spreadMed − 0.6)·0.5·quietGate` (±0.15). Spread median read 0.91 on this
  material → ratio +0.15 = a more OPEN lattice on dense spectra. Slow, structural, TAKE-OVER-safe.
- After (new track *Nexum*): vivid red/cyan/magenta, sat high — a neon frame; palette jump was the
  track change. If "too neon" comes up, chroma is the knob (`0.09 + seed2·0.06`), not L.
- Palette-jump-at-track-change is now the remaining colour behaviour. Options for v(next): slew the
  KEY estimate over ~20 s (pitchClassMean is ~8 s), or crossfade the palette through a dark dip on
  a detected track boundary (a deliberate "blink" instead of a smear).

### Iter 11 — INZO *Nexum* → Effin *Ups and Downs* → ALLEYCVT *FALL INTO YOU*
- **SHOW HAZARD found**: a yellow "Reconnecting..." badge (`#remote-status-indicator`, from
  `RemoteDisplay.js`) sat top-right ON THE PROJECTED FRAME. The relay socket was actually OPEN
  (`readyState 1`) — the badge was STALE (status callback didn't fire 'connected' after the
  reconnect). Hidden it via the injected style (`#remote-status-indicator{display:none}`), which
  the cursor-hygiene CSS now carries. NEXT SHOW: bake a `?hud=0` (or `remote=display` implies no
  badge) into RemoteDisplay before the show — do NOT edit src mid-show (HMR would reload the
  display and drop tab audio).
- Meter (60 s, INZO): sat 0.93, dark 0.22, clip 0, lumMin 0.07, motion↔energy 0.51. Neon.
- MOVE: chroma `0.09+seed2·0.06 ±0.05` → `0.075+seed2·0.05 ±0.04`. Low L + same C sat at the
  sRGB gamut edge = neon; the user wants MUTED. Meter after: sat 0.86–0.87.
- Meter hiccup: one 8-s window sampled at 1 Hz with motion 0 → looked like a frozen renderer.
  `document.hidden` was false by the time I checked; likely a transient tab-visibility/resize
  throttle (the next screenshot came back at a different pixel size with black bars — the user was
  resizing/moving the window). Rule stays: check `document.hidden` and re-measure before diagnosing.
- After (ALLEYCVT): violet field, red rosettes, green ribs — but very DENSE/fine (bright track →
  level window fine). Busy. If it stays busy on bright material, bias gDepthFocus coarser
  (0.35 → 0.30) or lower the centroid weight (1.0 → 0.8).

## Todo (added iter 11)
- `[ ] RemoteDisplay: hide the status badge on displays` (`?hud=0`) — badge went stale on the projector.
- `[ ] fine-level busyness on bright tracks` — consider gDepthFocus bias 0.35→0.30.

### Iter 12 — Ganja White Night *Mask Off* → Mersiv *Ghosts*
- B0: dense violet/red filigree, busy; the extension screenshot showed an ARROW cursor mid-frame
  though `cursor:none` was computed on body+canvas and the style element was intact — likely the
  extension's own virtual pointer overlay, not the OS cursor. Re-parked anyway. (Verify next show
  by looking at the projector, not the screenshot.)
- Meter (60 s, mostly a track gap: gate 0.35): dark 0.31, lumMin 0.06, clip 0, motion↔energy 0.42.
- MOVE: level window bias `gDepthFocus` 0.35/centroid·1.0 → 0.30/centroid·0.8 — bright tracks were
  filling every cell with fine speckle. After: bold red lattice with blue cells, coarse and clean.

### Iter 13 — display tab HIDDEN (Desren *FAIRYTALE* → Dirt Monkey *Heads Will Roll*)
- `document.visibilityState = 'hidden'`, 0 rAF/s, meter sampling at 1 Hz with motion 0, screenshot
  came back at a different pixel size with black bars — the display tab is backgrounded (window
  minimised / another tab in front). The renderer is frozen; nothing on any projector. No edit.
- Rule for the loop: if `document.hidden` (or rAF/s == 0) → skip the tick, say so in one line, do
  NOT tune against a frozen frame. The iter-11 "hiccup" was the same thing for a few seconds.
- The rAF probe (`count frames for 1 s`) is a cheaper, unambiguous liveness check than reading the
  meter — added to the tick preamble from here on.

### Iter 14 — still hidden (SoDown *Everybody GetDown*)
- `document.hidden` true, 0 rAF/s; `energy` frozen at exactly the iter-13 value (0.147) → with the
  tab hidden the AUDIO pipeline freezes too (features come from the render loop). No edit.

### Iter 15 — display tabs GONE
- `tabs_context_mcp`: "No tab group exists for this session" — the display + Spotify tabs (or the
  whole MCP window) were closed. Not recreating a window unprompted; the loop idles until the user
  says go (then: re-open the display URL from the state's preset, re-inject cursor/badge CSS,
  re-install `__vjValidate` + meter, re-share tab audio — the full pre-show list again).

### Iter 17 — rig rebuilt after Chrome restart (Of The Trees *Honeydust*, track gap at tick)
- Rebuild took one tick: display + Spotify reopened, cursor/badge CSS + validator + meter
  reinstalled from `scripts/vj/aesthetic-meter.js`, user re-clicked Share tab audio. All 16 iters
  of shader changes were safe on disk — **the .frag being the single source of truth is what makes
  the loop restart-proof.**
- Found: the saved meter script lacked the extensions added live (hueHist / onsetResponse /
  offKickFlicker / lumMin-Max) — they existed only in the dead tab's memory. Baked all of them
  into `scripts/vj/aesthetic-meter.js` (+ explore-folder copy). RULE: anything installed into a
  page during a run must be written back to the repo the same tick.
- Frame check (mid-gap): dark 0.23, clip 0, sat 0.78, motion↔energy 0.36, lumMin 0.075. Healthy.
  Salmon field + teal cells reads nicely. No shader edit this tick.

## Forks
- `lattice-vj/3 ← lattice-vj/2` (vj2 iter 17, 2026-08-18): snapshot of the exploration run's
  metric-verified state (tonemap, key-palette, de-twitch, kick envelope, tilt/spread structural
  drivers). Knob state in `lattice-vj/3.md`. The /vibej run CONTINUES ON 3.frag; 2.frag is frozen as the exploration snapshot.

### Iter 18–19 — waiting on tab audio re-share (post-fork reload)
- The /fork hot-swap should not have reloaded the page, but the page HAD reloaded between iter 17
  and the fork (validator was gone) — most likely the copy of `2.frag → 3.frag` triggered the
  shader-manifest HMR path. LESSON for the skill: creating a NEW .frag file can reload the display
  → tab audio dies. Do forks/copies BEFORE the show, or accept a re-share.
- 3.frag live and rendering; gate 0 until the user clicks Share tab audio. No edits.

### Iter 107 (2026-08-18, resume): tab audio re-shared by user
- Gated iters ~18–106 (~88 min). User note: **the tab reload (from /fork's HMR) killed the audio flow** — confirmed root cause, already journaled as "fork before the show".
- On resume: gate 0.98, frame healthy (dark 0.19, clip 0, sat 0.80, lumMin 0.10) — the tuned tonemap held across an ~90-min-later, totally different track (INZO – Hideaway).
- Meter lesson: the first summary window after a gate reopen is garbage — hueDrift −0.73/min and onset gain 0.95 were resume transients, not real. **Rule: discard the first meter window after any audio interruption; wait one clean 60s window before editing.**

### Iter 108–109 (active): kick boost + lagCorr probe
- Iter 108 (Lotis Eater, Boogie T): kick shading 0.20→0.34, relief 0.65→0.95. r rose −0.01→0.11; onset gain stuck ~1.0 but the metric is BLIND at 2.1 hits/s wobble (post-window overlaps next hit). flicker 0.60→0.75 — punch budget spent, don't stack more.
- Iter 109: NEW METER PROBE `lagCorr()` — motion×bass cross-correlation at 0–600ms lags. Found peak r at **300ms lag**: the 2Hz springs delay the visual by ~70% of a 140BPM wobble inter-hit interval, so spring-driven response reads as off-beat. **Design rule: attacks from raw onsets (bassHit), springs only for sustained level.** Baked into scripts/vj/aesthetic-meter.js.

### Iter 110: USER FLAG — "I don't like the global brightness flickering"
- Root cause: iter-108 kick boost on the GLOBAL colour multiplier (`col *= 1 + gKick*0.34`) — at 2 hits/s wobble that's a full-frame brightness strobe. My own flicker metric warned (0.60→0.75) and I ignored it.
- Fix: global mult cut to `bassPulse*0.06 + gKick*0.05`; kick now reads ONLY through local directional relief (`shade * gKick*0.95`) — spatial depth-pump, not a flash.
- **Rule (add to guardrails): the global colour multiplier is effectively a strobe channel — fast envelopes there are capped ~0.1 total. Kicks belong in LOCAL terms (relief, per-cell lit, twist). Meter flicker >0.7 = act, don't rationalize.**
- Todo: `[ ] verify user is happy with kick visibility after de-globalization; if too subtle, raise relief 0.95 → 1.2 (still local)`

### Iter 111: de-globalization VERIFIED — flicker down AND musicality up
- Post-fix meter (Marshmallows, Dirt Monkey): flicker 0.75→0.57, motionVsEnergy r 0.11→**0.36** (session best), lum 0.19/lumMin 0.075/clip 0 intact.
- **Cool insight: the global brightness flash was DECORRELATING the meter's motion signal — full-frame luma pumping swamps the spatially-structured relief response. Moving the same energy into local relief raised measured musicality while removing the thing the user hated. "Louder" ≠ "more musical"; localized ≻ global for both aesthetics and metrics.**
- Design hypothesis for v(next): reserve the global multiplier for section-scale swells only (10s+ envelopes); all beat-scale response lives in local terms (relief, per-cell lit, twist).

### Iter 114: USER FLAG — "I need to actually see the parameters of the fractal changing"
- Diagnosis: the de-twitch pass (vj2 iter 2) cut structural amplitudes so far the geometry effectively froze — all life was in shading. Twitchy ≠ static: the fix for jitter was removing FAST drivers, but slow amplitude got cut too.
- Fix: slow-shape amplitudes ~3× (gHexR ±0.06→±0.17, gCross ±0.04→±0.11), cycles ~2min→~70s (shapeA/B rates up). All on morphPhase+bTime sines — slow by construction, no jitter possible.
- **Rule: after any de-twitch, re-CHECK that slow structural motion is still visible within ~30s of watching. Jitter lives in driver SPEED, not amplitude — cut speed, keep (or raise) slow amplitude.**

### Iter 115 COOL MOMENT — best state of the run (Ignition, Levity)
- **Metrics: r=0.55 (session best), flicker 0.54 (session low), dark 0.24, clip 0, lumMin 0.082.**
- The stack that got here (iters 110→114): (1) kick OFF global multiplier → local relief 0.95, (2) relief sustained-bass 0.30, (3) slow structural sweep amplified 3× (~70s cycles). Between two ticks the lattice went dense-red-tapestry → big blue rosettes with rust connectors: the "fractal parameters visibly changing" ask, delivered.
- **Audio fingerprint**: melodic bass ~140BPM, gate 1.0, steady energy.
- **Design hypothesis (the big one for v-next): the musicality recipe is [local relief for beats] + [3× slow structural sweep for form] + [global mult ≈ constant]. Each user complaint fixed this session made r go UP.**

### Iter 117: floor fix verified + snapshot
- lumMin 0.068→0.132 after lit floor 0.95→1.03 (Ego Death, loud): quiet floor lifted, loud end unchanged (clip 0, dark 0.147).
- Snapshot saved: explore-2026-08-18/iter116-musicality-recipe.frag — the post-recipe state (local-relief beats, 3× structural sweep, flat global, floor 1.03). This is the reference build of the session's findings.

### Iter 118: USER FLAG — "always going FORWARD, no oscillating back to previous positions"
- The sin/cos shape cycles (shapeA/B) visibly retrace — cells grow then shrink back = perceived ping-pong.
- Fix: monotonic fold rotation now DOMINATES (bTime 0.08→0.18, ~3°/s at depth), oscillating shapeA contribution demoted 0.9→0.35. The lattice always turns one way; sines are secondary texture.
- **Design principle (v-next, important): FORWARDNESS. Prefer monotonic accumulators (rotation, phase wraps, hue advance) as the dominant motion; bounded oscillators may only season. A bounded parameter can't go forward forever, but perception follows the dominant motion — make that one-way. Remaining candidates if user still sees ping-pong: gHexR breath (shapeB ±0.17), gCross (shapeA ±0.11) — could convert to slower drift or asymmetric attack/decay cycles.**
- Todo: `[ ] ask/observe whether radius+cross oscillation still reads as backtracking after rotation dominates`

### Iter 119: screenshot letterbox false alarm
- Screenshots suddenly showed black bars right+bottom. Diagnosis chain: canvas fills viewport exactly (1218×602 @ 0,0), but outerWidth (1128) < innerWidth (1218) → claude-in-chrome viewport EMULATION differs from the real window; the bars are a capture-pipeline artifact, not on the wall.
- **Ops note: when screenshot dims suddenly change or grow bars, check `{innerWidth, outerWidth, dpr, canvas.getBoundingClientRect()}` BEFORE touching the page. outer < inner = emulated viewport = trust the DOM, not the screenshot.** 3 fix attempts (resize event, CSS stretch, resize_window) were no-ops because nothing was broken.

### Iter 122: second silent reload — tooling reinstalled (audio survived)
- Page reloaded again (cursor CSS + validator + meter wiped); audio kept flowing this time (gate 1.0) — reload source unclear (window-resize dance at iter 119 suspected).
- Ops note: **the reinstall block (cursor CSS + validator + repo meter eval) is now a routine; consider baking it into the display page behind ?vj=1 so reloads self-heal.** → added to Todo.
- Todo: `[ ] bake VJ tooling (cursor hide, __vjValidate, meter) into display page behind a query flag so reloads self-heal`

### Iter 123: cursor-arrow CORRECTION + transition behavior confirmed
- **Correction: the arrow in screenshots is claude-in-chrome's synthetic cursor overlay (drawn into captures at the last hover point), NOT the real wall cursor.** CSS cursor:none governs the wall. Reload detection must use tool presence (typeof __vjMeter), never the arrow. (Iter 122's reload WAS real — tools were gone — but the arrow was coincidence.) Park the synthetic cursor bottom-right so captures stay clean.
- Track-transition window (Soul Call → Headband, gate avg 0.54): frame dimmed with the fade and recovered — rRaw 0.54 across a transition, flicker 0.35 (session low). The energy→lightness chain handles fades gracefully; lumMin 0.055 during actual silence is intended (quiet breath).

### Iter 131–134 — wub-breathing relief: hypothesis → verified → guarded
- **Iter 131 move:** rResid was ~0.045 on GWN wobble (beat-scale coupling nearly flat). Deepened sustained-bass term in the LOCAL relief line 0.30 → 0.48 (global mult untouched, per the flicker rule).
- **Iters 132–133:** two track-boundary windows in a row (gate 0.79, 0.82) — held, no edit, per the caveat catalogue. Boundary windows also produced a spurious rRaw 0.58; don't trust r across gates.
- **Iter 134 verdict (clean window, gate 0.97):** rResid 0.045 → 0.115 on *Dear Weed Man*. The wub now measurably breathes the shadow depth. Flicker stayed in band (0.59–0.65).
- **Cost found & fixed same tick:** kick (0.95) + wub (0.48) stacking crushed lumMin to 0.063 (< 0.08 floor). Clamped combined relief at `min(0.85, …)` — breathing preserved, floor bounded.
- **Cool moment (iter 133–134 frames):** *Dear Weed Man* drop state — hot pink/red petal clusters inside near-black navy frames on a bright blue field, star-shaped inter-cells. Best-looking sweep state of the session; the deep relief gives the frames real depth. Audio fingerprint: GWN wobble, drop section, gate ~1.
- **Rule reinforced:** measure → verify on a clean window → then tune the side-effect. Don't stack a second experimental edit onto an unverified first one.

### Iter 137 — USER FLAG: "never looking at the center, like I'm off to the side"
- **Root cause:** nav was parked at (2.495, −0.818) from an earlier drag; the lattice's visible mirror axes (which come from DEEP fold levels + per-level rotation, NOT the integer world grid) all landed off screen-center. Analytic snapping to the fold grid is wrong — rotations move the axes.
- **Fix (empirical, closed-loop):** measured the nearest strong symmetry center in the screenshot (≈390,340 px), converted px → world via uv scale (0.07/navZoom = 0.162 world/uv-unit), applied `world += vec2(-0.0590, -0.0105)` as a CENTER TRIM constant. Verified by screenshot: bilateral axis now through screen center.
- **Rule:** "off to the side" on a kaleidoscopic shader = composition's symmetry center offscreen. Fix by measuring pixels, not by reasoning about the fold grid.
- `[ ] watch: slow monotonic gSpin rotation may walk the axis off-center again over ~10s of minutes — re-measure and retune the CENTER TRIM constant if the user repeats the complaint (or proactively re-check every ~15 ticks).`
- **For v(next):** consider a controller-side "recenter" action (double-tap?) that snaps nav so a symmetry center lands at screen center — this is a live-show need, not a one-off.

## Forks
- `lattice-vj/4 ← lattice-vj/3` (/vibej iter 137, 2026-08-18): snapshot of the verified musicality-recipe state (local relief + clamp, flat global, visible sweep, forwardness, center trim) right after the user confirmed the recenter ("better"). 4.frag is the live /vibej target from iter 138; 3.frag preserved as the recipe snapshot.

### Iter 138 — USER FLAG: "primary animation is shaking back and forth, without progression — need a ratcheting mechanism" (+ "we fixed a similar problem in the iris series")
- **Root cause:** iter 114's big STANDING oscillators — shapeB×0.17 on gHexR, shapeA×0.11 on gCross, shapeB×0.30 on gScale (fold ratio!), shapeA×0.25 on gDepthFocus. All sin/cos of monotonic phases, but a standing sine still ROCKS the parameter back and forth. That rocking was the primary visible motion.
- **Fix (the ratchet):** converted the radius breath into a **wave traveling through recursion depth** — `hexR_i = gHexR + 0.13*sin(gShapePhase − i*1.1)` with `gShapePhase = morphPhase*0.85 + bTime*0.30` strictly increasing. Each level swells as the wave passes coarse→fine: motion has a DIRECTION, reads as continuous inward progression, never a rebound. No fract wrap → no seam (iris doc §2). Standing amplitudes demoted: gHexR 0.17→0.05, gCross 0.11→0.04, gScale 0.30→0.09, gDepthFocus 0.25→0.10.
- **Iris/1 connection (user's pointer, docs/advanced-shader-techniques.md §1):** "audio modulates RATE/SHAPE, never the ANGLE — adding to an angle makes it rock backward." Generalization learned today: **a bounded parameter can't ratchet monotonically, so give its modulation a propagation direction instead (standing wave → traveling wave).** That's the ratchet for radii/ratios/windows.
- **Tension resolved:** iter 114 ("must SEE parameters change") vs iter 138 ("no back-and-forth"). Answer: visibility comes from traveling modulation + monotonic spin, not from large standing sweeps.
- `[x]` closes the iter-118 todo "observe whether radius+cross oscillation still reads as backtracking" — it did; fixed.

### Iters 139–142 + SHUTDOWN (2026-08-18) — the oscillation saga, ended mid-experiment
Session ended at iter ~142/180 ("shutting down for the night"). Cron deleted, state file removed.

**The feedback sequence (read this first next session):**
1. Iter 138: user — "primary animation is shaking back and forth, without progression. Need a ratcheting mechanism." → I built a depth-traveling radius wave. **FAILED**: recursion depth is not a visible axis; all levels overlap at every pixel, so each scale just pulsed in place.
2. Iter 141: user — "still oscillating, not ratcheting. Push all of our stuff to a branch." → I built the self-similar perpetual zoom (fract-wrapped octave + rotation compensation). **BUG**: compensation used gSpin·0.05 — an unbounded accumulated angle — so the frame spun fast. User then: "I'm watching it shiver." Live shader at that moment was the buggy spin version (never got the 141b hotfix hot-swapped before interrupts) — **the shiver report is partly confounded by that bug.**
3. User's sharpest diagnosis: "It's as if sections are cut out, overlapping, like a kaleidoscope. But those overlapping sections move in and out in a breathing motion. **I want the pattern to evolve.**"
4. Root cause finally found by reading, not patching: **audio and oscillators on FOLD-GEOMETRY params**. gScale carried a spectral-width term (±0.25, seconds-scale) — the fold ratio moves EVERY mirror seam at EVERY level (error compounds as scale^i) = the "overlapping sections breathing". gDepthFocus carried the centroid SPRING (±0.4, settles ~0.4 s) — whole detail-levels faded in/out with brightness = sections appearing/vanishing. Plus residual shapeA/B rocks and the QUIET BREATH sine.

**Iter 142 pass (IN FILE, validated, NEVER SEEN LIVE — verify first thing next session):**
- Geometry (gHexR, gCross, gScale, gDepthFocus, gSpin) now takes ZERO audio and ZERO oscillators.
- Structure EVOLVES: each detected drop (sectionMode) eases all four params to new hash-derived plateaus over ~4 s (sectionMix) and stays — one-way transformations, exactly "I want the pattern to evolve".
- Continuous motion = perpetual self-similar zoom (fract octave ~60 s, fixed base 2.0, thetaStep = PI/8 only) + monotonic gSpin. Zoom is centered on the (center-trimmed) symmetry point and applied before `uv += world`, so pan stays screen-consistent.
- Audio lives ONLY in shading/light (kick/wub relief, band lighting, gBorder/gFill texture ±0.03).

## Todo (next session, in order)
- `[ ] VERIFY iter 142 live: load 4.frag, watch 2+ minutes. Check (a) no breathing seams, (b) the zoom seam at each ~60 s octave wrap — if it snaps, tune/flip the PI/8 compensation or slow the zoom, (c) a drop actually steps the plateaus (needs wavelet-ease sectionMode firing).`
- `[ ] With geometry frozen between drops, the frame may feel too static on long no-drop stretches — if so, add SLOW plateau drift via evoPhase (monotonic set clock), not sines.`
- `[ ] bake VJ tooling into display page behind ?vj=1 (meter, validator, cursor CSS survive reloads).`
- `[ ] controller-side "recenter" action — snap nav so a symmetry center lands at screen center (iter 137 was a hand-measured one-off).`
- `[ ] re-measure CENTER TRIM after any nav change.`
- `[ ] CALIBRATE the shiver probe (see explore-2026-08-18/NOTES.md addendum) — do this alongside the iter-142 live verification; the probe is the tool that turns 'is it still shivering?' into a number.`
