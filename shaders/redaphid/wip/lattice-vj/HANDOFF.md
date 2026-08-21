# lattice-vj HANDOFF — how to get back into the evolving flow

Rewritten 2026-08-20 after the live-mic `/vibej2` structure run (beats b1–b9). The 08-18 version
of this file (iters 107–142, target `4.frag`) is superseded; its still-valid rules are folded in
below. Read this one file before resuming.

Detail lives in: `journals/lattice-vj-7-cool-moments.md` (beat-by-beat, with the failures) ·
`8.md` (the current shader) · `7.md` (the run's scratch) · `docs/vjpad-v2-design.md` (pad roadmap).

---

## 1. What "the flow" was

The user's verdict, unprompted, after ~5 hours: *"the visual has been in a great flow state for a
while now."* It is worth being precise about what was true at that moment, because the flow is a
**property of the channel assignment, not of any one number**:

- **Nothing on screen oscillates.** Every motion is one-way: monotonic spin, a perpetual inward
  zoom, one-way plateau steps on drops, a saturating complexity ratchet. Nothing rocks, breathes,
  or returns. This is the single most load-bearing fact — four separate iterations of "shaking
  back and forth" complaints (iters 138–142) were all cured by removing oscillators from geometry.
- **The picture is never the same twice, and never resets.** Complexity accrues on the set clock,
  the palette rotates permanently on drops, and panning re-tiles the lattice continuously. After
  five hours the look had travelled somewhere it can't travel back from (paletteShift 3.66,
  warpGrow maxed, complexity 97%).
- **The music is legible in light, not in brightness.** Relief, per-depth band lighting, rim and
  specular take the audio. The global multiplier does not. A frame that pumps with the kick reads
  as a cheap strobe and the user has rejected it every time.
- **The hands are never fought.** The loop makes at most one move per beat and takes no
  metric-driven move while knobs are sweeping.

## 2. The channel hierarchy (do not violate; every violation cost a live complaint)

1. **GEOMETRY only EVOLVES.** Monotonic accumulators, perpetual self-similar zoom, one-way eased
   plateau steps on drops, or *the user's own navigation*. **No sines. No audio on fold params,
   however smoothed** — fold-ratio error compounds as scale^i and reads as "kaleidoscope sections
   breathing".
2. **LIGHT/SHADING takes ALL the audio.** Local relief, per-depth bands, texture. Never the global
   multiplier (that is the strobe channel, directive #1).
3. **COLOUR follows the slowest music only.** Key medians, the set clock, permanent drop mutations.
   In-track hue drift ≈ 0.

Standing vetoes: no auto-scroll/flight · no screen-space object overlays · no uv warps · no
brightness flicker · **no path ribbons or landmark towers** (removed 08-20 by request) · keep the
composition centred (`CENTER TRIM`, re-measure after any nav change).

## 3. Resume command

```
http://localhost:6969/?shader=redaphid/wip/lattice-vj/8&remote=display&controller=lattice-nav&wavelet=true&vj=1&knob_1=0.627&knob_131=0.162&knob_132=0.483&knob_133=0.59&knob_134=0.507&knob_135=0.876&knob_136=0.57&knob_137=0.485&knob_138=0.505&knob_139=0.216&knob_140=0.537&knob_141=0.324&knob_142=0.44&knob_147=0.395&knob_148=1&knob_149=0.246&knob_150=0.158&navZoom=0.218&paletteShift=1.716&warpGrow=2
```

Then `/vibej2 redaphid/wip/lattice-vj/8`, and pick up the Todo in the journal.

**The flow needs TIME, not just the URL.** `evoPhase` (the energy-weighted, silence-frozen set
clock) drives the complexity ratchet, and it starts at 0 on every page load. A fresh boot is the
*tuned* look, not the flow look; the flow arrived somewhere past evoPhase ≈ 4 (~78% complexity) and
deepened from there. **To start a set already deep, raise `paletteShift`/`warpGrow` in the URL —
but `evoPhase` cannot be seeded from the URL. If future-you wants an instant deep start, that is
the feature to build: a `?evoSeed=` the controller adds to its clock.**

## 4. The rig that made the loop able to see (all of it earned this run)

- **`?vj=1`** — the page installs its own runtime at boot: cursor-hide, GL validator, aesthetic
  meter, jank probe, and POSTs health signals to `/__vj-signal` → `.claude/vj-signals.jsonl`.
- **Monitors must use `tail -F`, never `-f`.** The dev server RECREATES the signals file at boot,
  which silently killed both monitors mid-set.
- **`scripts/vj/remote-send.js <json> [type]`** — the shell's lever on a display tab that can't be
  scripted (extension down, tab outside the group). Also the loop→pad feedback channel.
- **LEARN button** (pad) → `vjConfirm` → runtime freezes the last 90 s of gesture+features into
  `window.__vjLearnWindow` → `scripts/vj/learn-correlate.js` ranks which audio feature the hand was
  imitating. Only confirmed gestures count — "sometimes I'm just playing with the knobs".
- **Loop strip on the pad** (`vj-status` messages) so the user never tabs back to the chat.

## 5. Hard-won rules from this run (each one cost a real failure)

1. **A ratchet needs a counter-ratchet.** Anything that monotonically adds structure also
   monotonically shifts the luminance budget. b7's complexity growth drove dark 0.37→0.47 and
   lumMin under the floor within five minutes; the compensation belongs in the same edit.
2. **An unbounded accumulator inside a rate term is a time bomb.** Its coefficient is only valid at
   the signal level where it was measured, and **rooms get louder**. b6's `evoPhase*25` was 70% of
   the way to running the zoom BACKWARD 25 minutes after it was written. Clamp against something
   that grows the same way (`min(evoPhase*25, bTime*0.6)`) so the guarantee is structural.
3. **A statistically correct mapping can be visually null.** Check the *derivative* of the driving
   channel at tonight's signal level before believing a wire will read.
4. **Measure the caveats you write down.** Both of the above were flagged in comments and both were
   nearly live failures within the hour.
5. **Gesture-caused flicker is not a defect.** Before acting on a flicker alert, check whether the
   knob vector is moving; clip stays 0 through hand-driven flicker.
6. **A hidden tab lies.** `document.hidden` ⇒ 0 fps, no audio, intervals throttled to 1/min — the
   meter reports a black frame that is really a *paused* one. Check `visibilityState` first.
7. **Correlation discipline** (from 08-19, re-validated live): correlate inside one confirmed
   gesture, detrend both series, use Bartlett effective-N with t>3, exclude history aggregates.
   A three-way tie among slow accumulators is a time trend, not a finding.

## 6. Where to go next

- Journal Todo: first-drop verification of the b1 symmetry plateau (`sectionMode` never fired this
  run — the mic never produced a detected drop, so **the plateau dance is still unseen live**).
- `?evoSeed=` for instant deep starts (see §3).
- vjpad-v2 Phases 2–4 in `docs/vjpad-v2-design.md`: veto buttons on wired mappings, config-driven
  pad types, auto-banks from shader knob metadata.
