# AVOID — mappings vetoed by the user, by the Iris series, or measured badly tonight. Never re-add.

Sources: `shaders/redaphid/lattice-interactive/HANDOFF.md` §0–§5, `shaders/redaphid/wip/lattice-vj/HANDOFF.md`,
`journals/lattice-vj-{1,2,7}-cool-moments.md`, `journals/iris-wavelet-cool-moments.md`,
`journals/lattice-interactive-3-cool-moments.md` (tonight), `.claude/vj-state.json` brief.

## User-vetoed on sight (their words)
- Global brightness pump — any `col *= 1 + audio`, incl. a trailing `col *= 1.10` at the tonemap ("no global brightness change"; rejected every time it has been tried). Grep EVERY `col *=` before declaring it gone.
- White anything — sin×sin dot-grid sparkle ("I need whatever that white grid of stars is gone"), white glints, white tint, `mix(…, vec3(1.0), k)`. Palette is never-white. `spark` stays pinned at 0.
- Overlaid discs / orbs / circles / suns ("I need that circle orbiting to stop… that circle needs to go now"). Focal points must be built FROM the fractal.
- Screen-space uv warps / bass ripples ("i didn't like the warping. stick to fractal permutations"). `lensBulge` is legal only because it warps the fractal's INPUT coords.
- Path ribbons and landmark towers (removed 08-20 by request).
- Auto-scroll / auto-flight as a separate translation ("I don't like the scrolling"). Tonight's single bass-paced forward drift is accepted — do not add a second translation or a flyby.
- Filled pie-discs at cell centres (iter 3 tonight) — a wall of colour; rings only.
- Body / interior fill — "black cell interiors"; `body` weight is 0 for a reason.
- Washed-out pastel — the L ramp saturating (HANDOFF §0.1). Neon on black, not fog.
- "Too white" (21:06) — L uncapped rims + white mixes. Let `gArc` carry brightness; do not manually brighten during the outlines phase.
- "Shivery" / "twitchy" / "bouncing" / "shaking back and forth" (five escalations across lattice-vj) — every one of the mechanisms below.

## Shiver mechanisms (geometry lane)
- Raw z-scores (`waveletBassZScore`, `spectralFluxZScore`, `energyZScore`) on zoom, twist, radius, width, translation. Spring them, accumulate them, or dead-zone them (`smoothstep(0.3,1.0,z)`).
- Whole-lattice kick-zoom on a raw onset (5 % scale flick) — "still a little shivery". Transients may touch shading or twist, never global scale/translation.
- `kickExcess` / `wavelet_bassHit` directly on geometry — binary per frame on this mic (bassHit 90–214), releases instantly.
- Kick twist (0.04 rad/level on onsets) — removed in lattice-vj-2.
- Gates built from RAW per-frame energy/bass multiplying geometry (tonight iter 11 `liveGate` shiver) — gates on springs only.
- Wub-rate springs on geometry — `gHexR * (1 + wubDepth)`, treble→`gBorder` 0.06, bass→`gCross` 0.05 all chased the 2–4 Hz wobble. A critically-damped spring is a ~2 Hz low-pass: fine for shading, too fast for large geometry. Geometry wants ≤ 0.5 Hz drivers.
- Any sine / oscillator on fold params or angles ("kaleidoscope sections breathing"; iters 138–142). Fold-ratio error compounds as scale^i.
- Audio in an ANGLE (direct `melodyFlow` on `gSpin`) — rocked back on every dip (tonight iter 16). Audio drives RATE into an accumulator, never the angle.
- `quietGate` (or any gate) applied to an accumulated angle — snaps when the gate moves. Gate the rate going in.
- Stacking a second geometry mover in the same track (iter 7 gSpin 0.35 + ring swell → lumSpread 0.13; iter 5 warned).
- `bTime - accumulator * k` without a structural clamp (`min(evoPhase*25, bTime*0.6)`) — the perpetual dive ran toward reverse as the room got louder.
- A KNEE at track energy (`build` knee at 0.35 sat exactly at energySpring) — fine levels flip in/out; lumSpread 0.147. Use slopes.
- `build = energySpring*1.4` — pinned at 1.0 for any loud track, frame too dense for the tent (iter 11b).

## Brightness-in-disguise (light lane)
- Depth pulse in LIGHTNESS — the 19:40 "flash"; moved to hue. Lightness terms stay at `0.04 + gKick*0.08` / `0.14 + gKick*0.16 + gPop*0.08`.
- Additive floors: `L = 0.06 + …` in `lush()` (caps `dark` forever); `leadTendril` glow baseline 1.0 with a mask covering the whole screen (0.12–0.17 luma floor). Every `col +=` after `mix(bg, col, alpha)` must have a mask that reaches zero somewhere on screen.
- Un-normalised accumulator channels (`lumAcc` returned raw) — pins every lit pixel to one L; palette edits then do nothing.
- Lowering the rim WEIGHT to fix coverage — in `fractal()` the weight IS the alpha; it makes rims transparent. Thin `bw`/`gBorder` instead.
- Fast whole-frame hue rotation (`paletteShift` at 7.7 turns/min) — hues differ in luminance, reads as a brightness pump with every `col *=` clean. Keep `hueDriftPerMin` ≤ ~0.03.
- HSL hue spin — luma yellow 0.634 vs blue 0.066 at equal HSL lightness. Hue moves go through OKLCH `lush()` only.
- Fixing a saturation / "too neon" complaint by raising L — chroma is the knob.
- `alias` without the zoom (`1/resY*scale`, no `0.07/navz`) — 3–14× the true pixel footprint; sent the projector 100 % black once and hazed every zoom level. `gPix` is the footprint.
- Trusting `motionVsEnergy` for musicality — a strobing frame scores a beautiful r ("the 0.67 I celebrated WAS the user's complaint").

## Dead / untrustworthy features on a live room mic
- The shipped `quietGate` (raw-energy, gain-dependent: 0.002 avg with music playing). Use the floored `gGate`; a `#define` inside `mainImage` does NOT reach functions above it (iter 16 — two "proven" moves were dead for 12 ticks).
- The `beat` uniform (32 BPM against a real 120). Never.
- `bass_pump` / `wubDepth` (`min(1, wubDepth*4)` pins at 1.0 on mic) — a constant, not a pulse (Iris iter 8 root cause of "flicker not breath").
- All `*Slope` and `*RSquared` (drift smoothly; spuriously correlate with any sweep) and `pitchClassNormalized` (needs clean tonal content). `melodyFlow` read 0.12 static tonight.
- Iris `entropy_env` (= 1 − tonalStrength) understated a wash at 0.62 vs true 0.954 — key on `spectralEntropySmooth`/`Normalized` directly.
- `monsterBass` on this track — centroid 0.79 zeroes it.
- Level-only gates on quiet-but-punchy passages (Iris iter 10: bassZ 1.25 + bassHit 2.1 while spring 0.05 → gate 0 suppressed the beat zoom). OR in a thresholded bassZ term.

## Process traps (cost a tick each)
- Creating ANY `.frag` file anywhere under the project root during the show (scratch copies, candidate outputs) — the Vite shader plugin watches `.frag` and full-reloads the jam page (arc + nav reset at 21:24). Write `.frag.txt` or use the scratchpad; no new directories under the root either.
- Under the palette LOCK, any whole-frame term on `s` is a colour STROBE, not a hue drift: the binary orange/purple selector flips k% of all lines per k offset. Keep per-frame features off `s` unless masked (filaments) or arc-gated.
- Editing `index.js` or controllers mid-set — full reload drops fullscreen and every accumulator.
- Hot-swapping a `time * k` constant (`bTime * 0.012` on the hue sum) — a visible hue snap. Colour-coefficient changes that are 1.0 at the current gate value are safe.
- Wiring new knobs mid-set (knob_6+ are not in 3.frag).
- Saving without the in-page GL compile — a forward-referenced global (`gKick` before the globals line) spammed ~1100 compile errors for 20 s (iter 10). Globals go in the top-of-file `float gSpin, …;` line.
- Reading one frame / one screenshot as truth — measure an 8-frame `lumSpread`. Discard the first window after any audio interruption; check `visibilityState` before trusting a black frame.
- Taking a metric-driven move while the knobs are sweeping.
