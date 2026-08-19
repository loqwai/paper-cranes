# lattice-vj HANDOFF — consolidated notes (2026-08-18 run, iters 107–142)

The one file to read before resuming. Sources it consolidates (kept for detail):
`journals/lattice-vj-2-cool-moments.md` (beat-by-beat + todos) · `explore-2026-08-18/NOTES.md`
(meter caveats + general findings + shiver probe) · `3.md` / `4.md` (per-shader docs).

## Where we left off
- **Live target: `redaphid/wip/lattice-vj/4.frag`** (forked from 3 at iter 137; 3.frag = frozen
  recipe snapshot; committed art `chromadepth-lattice/6` untouched all night).
- 4.frag carries the **iter-142 "EVOLVE, DON'T BREATHE" pass — GL-validated but NEVER SEEN
  LIVE.** That verification is the first job of the next run.
- Old 1-minute cron loop is dead and gone; **/vibej2** (responsive burst loop) is the way back in.

## Standing user directives (each cost a live complaint — never regress)
1. No global-brightness flicker — kick/bass never touch the global multiplier (strobe channel).
2. Fractal parameter changes must be VISIBLE… (iter 114)
3. …but NEVER oscillate back — "always going forward" (iter 118), and after three escalations:
   "shaking back and forth" → "sections breathing like a kaleidoscope" → **"I want the pattern
   to EVOLVE"** (iters 138–142).
4. Composition centered — "never looking at the center" fixed by measured CENTER TRIM (iter 137,
   user: "better").
5. Older vetoes still standing: no auto-scroll/flight, no screen-space object overlays, no
   uv warps, muted palette, hue drift ≈ 0 in-track.

## The channel hierarchy (the session's core finding — applies to ALL structure-first shaders)
1. **GEOMETRY only EVOLVES**: monotonic accumulators (spin), perpetual self-similar zoom, or
   one-way ~4 s eased plateau steps on drops (sectionMode/sectionMix). NO sines, NO audio —
   however smoothed — on fold params. (Fold-ratio errors compound per level; the ±0.25
   spectral-width term on gScale WAS the "breathing kaleidoscope sections".)
2. **LIGHT/SHADING takes all the audio**: local relief (kick 0.95 + wub 0.48, stack clamped at
   0.85), per-depth band lighting, ±0.03 texture. Verified musical: rResid 0.045→0.115.
3. **COLOR follows the slowest music only**: key median, set clock, permanent drop mutations.

What ratchets: monotonic rotation · self-similar zoom (fixed base 2.0, PI/8 twist comp — NEVER
an accumulated angle like gSpin in the compensation) · plateau steps. What doesn't: standing
sines at any period · "traveling waves" through recursion depth (not a visible axis — it pulses).

## Meter kit (page installs it via ?vj=1)
`__vjMeter.summary/residR/lagCorr/onsetResponse/hueHist` + **`shiver(secs)`** (UNCALIBRATED —
see todo 2). Thresholds: clip 0 · flicker >0.7 act · dark 0.1–0.3 · lumMin ≥0.08 · shiverScore
>0.45 = shivering (provisional). Discard gate <0.9 windows and first 60 s after resume/reload.
The ?vj=1 watchdog now POSTs these breaches to /__vj-signal on its own.

## Todo, in order
1. **VERIFY iter 142 live** — watch ≥2 min: no breathing seams; zoom-wrap seam at each ~60 s
   octave (if it snaps: tune/flip the PI/8 comp or slow the zoom); a real drop steps the
   plateaus (needs wavelet-ease sectionMode firing).
2. **Calibrate the shiver probe** — deterministic A/B via `?audio_file=`: 90 s on
   `explore-2026-08-18/iter116-musicality-recipe.frag` (known breather) vs `4.frag` (plateau
   geometry); set real thresholds from the pair.
3. If long drop-less stretches feel too static → slow plateau drift from evoPhase (monotonic),
   never sines.
4. Controller-side "recenter" gesture (snap nav so a symmetry center hits screen center — iter
   137 was hand-measured); re-measure CENTER TRIM after any nav change.

## Resume command
Display URL (preset from 4.md + the new `vj=1` runtime — reshare tab audio after opening):
```
http://localhost:6969/?shader=redaphid/wip/lattice-vj/4&remote=display&controller=lattice-nav&wavelet=true&audio=tab&room=r017686ce73&vj=1&knob_1=0.627&knob_131=0.162&knob_132=0.483&knob_133=0.59&knob_134=0.507&knob_135=0.876&knob_136=0.57&knob_137=0.485&knob_138=0.505&knob_139=0.216&knob_140=0.537&navX=2.495&navY=-0.818&navZoom=0.432&paletteShift=0.6&warpGrow=0.95
```
Then: `/vibej2 redaphid/wip/lattice-vj/4` — its setup reads this HANDOFF + the journal, and its
first beats are todos 1–2 above.
