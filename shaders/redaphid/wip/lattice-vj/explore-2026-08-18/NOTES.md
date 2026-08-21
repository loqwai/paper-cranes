# Notes for the next show (living document — updated every few ticks)

## Setup order that actually works (do this before anyone is watching)
1. `npm run dev`; open **Spotify first**, start music.
2. Open the display: `/?shader=<scratch>&remote=display&controller=lattice-nav&wavelet=true&audio=tab&room=<fresh>` + preset knobs from `2.md`. NOT `fullscreen=true` (kills the MCP tab); F11 by hand.
3. Click **Share tab audio** → Spotify tab → tick "Share tab audio". Verify `energy > 0.065`, `quietGate` 1.
4. Inject `cursor:none` CSS; install `__vjValidate` + `aesthetic-meter.js`.
5. Only then start `/vibej`. Every tick: screenshot → judge → meter → ONE move → screenshot.

## What the user reacts to (verbatim → root cause → fix that worked)
- "twitchy" (dubstep) → the wavelet-ease springs settle in ~0.4 s (stiff 120/damp 22) so any
  geometry term on a `*Spring` chases the 2–4 Hz wobble. Fix: geometry gains ÷2–3, wub multiplier
  off geometry, kick twist 0.04→0.015. Music stays in shading. **Springs ≠ slow.**
- "I don't like the scrolling" → auto-flight (`fly`). `#define FLIGHT 0.0`. Rotation kept.
- "palettes change too extremely" (previous show) → mostly `s += bTime*0.012`, a hue CLOCK doing a
  full turn every 4 min, plus melodyFlow (0.3-s note tracker) at ×0.15 on hue. Fixes: clock 0.002,
  melody → 1/3 melodyFlow + 2/3 pitchClassMean (8-s key). Hue must follow KEY/SECTION, never NOTE/CLOCK.
- (from the previous show) no orbs/discs/dot grids/white glints; no screen-space warps; no kick
  zoom; palette never white; hue drift slow.

## Meter thresholds (provisional, being calibrated this run)
| metric | good | seen |
|---|---|---|
| motion↔energy r | > 0.3 | 0.42–0.50 |
| flicker | < 0.5 | 0.40–0.53 |
| dark fraction | > 0.10 | 0.014–0.05 before; **0.19 after gamma 1.18 + lush L 0.33+0.40·lit** (iter 3/6) |
| clip fraction | ≈ 0 | 0.003–0.014 |
| hue drift /min | < 0.05 sustained | 0.19–0.29 with the hue clock; **−0.08 after iter 5** (clock 0.002, melody→key) |

## Meter additions (iter 7)
- `__vjMeter.hueHist()` — 12-bin hue histogram (palette identity, lighting-independent).
- `__vjMeter.onsetResponse(secs)` — motion after each bass hit vs before → **onset gain**.
  1.07 = kicks invisible; 1.48 after the kick-envelope fix. Target > 1.3.
- Caveat: `flicker` counts musical punches; measure it off-kick before calling something twitchy.

## Tonemap must be checked at BOTH ends (iter 9)
Quiet intro (energy 0.07) went near-black after the "too bright" fixes. Judge on `lumMin` ≥ 0.10 AND
`dark` ≥ 0.10 AND `clip` ≈ 0 across a loud + a quiet passage before the show. Current values that
satisfy both: gamma 1.18, lush L = 0.33+0.40·lit, lit scale 0.95+glow·.35+band·.55+bass·.45.

## Projector overlays (iter 11)
The display page draws a "Reconnecting..." / "Disconnected" badge top-right (`#remote-status-indicator`)
and it can go STALE after a relay reconnect. Inject `#remote-status-indicator{display:none !important}`
with the cursor CSS, or add a `?hud=0` to RemoteDisplay before the show. Never edit `src/` mid-show —
HMR reloads the display and kills tab audio.

## Run summary so far (iters 1–15, written while the display was closed)
What the exploration produced, in order of value for the next show:
1. **The tonemap that reads on a projector at BOTH ends**: gamma 1.18, `lush()` L = 0.33+0.40·lit,
   lit scale 0.95+glow·.35+band·.55+bass·.45, chroma 0.075+seed2·.05±.04, bg 0.30, vignette 0.38.
   Meter targets met: dark 0.12–0.30, clip 0, lumMin ≥ ~0.08, sat ~0.86.
2. **Palette follows KEY/SECTION, never NOTE/CLOCK**: hue clock 0.012 → 0.002; melodyFlow×0.15 →
   melodyFlow×0.05 + pitchClassMean×0.10. In-track hue drift went from 0.19–0.29/min to ≈0.
3. **Geometry follows SLOW music, shading follows FAST**: springs (~2 Hz LPF) off geometry gains,
   kick = envelope (raw hit + 0.2 s smoothed tail) on relief/brightness only, twist 0.015.
   Onset gain 1.07 → 1.48. Auto-flight OFF (`FLIGHT`).
4. **New structural drivers** (all median/slow, TAKE-OVER-proof): waveletTiltMedian → cross↔hex,
   waveletSpreadMedian → fold ratio, level window biased coarser (0.30 / centroid·0.8).
5. **The meter** (`aesthetic-meter.js`) and what each number means — see table above + iter notes.
6. **Ops hazards found**: stale "Reconnecting…" badge on the projector; hidden tab freezes render AND
   audio features; window resize transiently mismatches canvas; extension screenshots may draw a
   virtual pointer (verify cursor on the projector, not the screenshot).
Reference shader = `iter12-coarser-window.frag` (latest); best-looking frame = `iter08-good-frame-bassline-don.jpg`.

## Meter caveat catalogue (updated iter 113)
Conditions that make a metric window LIE — check before reacting:
1. **Audio resume/interruption in window** → hueDrift, onset gain, r all garbage. Discard first 60s.
2. **Track boundary in window** (gate avg < ~0.9 while music "playing") → r goes negative because nav drift continues through the silence gap while energy drops. Don't chase it.
3. **Wobble >1.2 hits/s** → onsetResponse gain pins near 1.0 regardless of actual kick visibility (post-kick window overlaps next hit). Use lagCorr + flicker + eyes instead.
4. **Flicker counts musical punches** — but empirically: flicker >0.7 correlated with the user complaining ("global brightness flickering", iter 110). Treat 0.7 as a hard ceiling, not noise.

## Metric trade-off: forwardness vs motionVsEnergy r (iter 120)
Boosting constant one-way rotation (user: "always going forward") raised baseline motion and
diluted r (0.24–0.55 → ~0.14). **r penalizes deliberate music-independent motion** — a shader
with beautiful constant drift scores worse than a static one that only twitches to music.
Future meter idea: compute r on the motion RESIDUAL (motion minus its own rolling median) so
constant drift cancels and only music-locked deviations count. Aesthetic ≠ any single number:
forwardness (user preference) and r (musicality) pull against each other; the user wins.

## Two-timescale musicality (iter 121, residR probe)
rRaw (phrase-scale) 0.41 vs rResid (beat-scale) −0.10 on the same window: the shader couples to
music at the PHRASE level (sustained relief + level windows follow song energy) while beat-level
whole-frame coupling is near zero because kick response is spatially local. Both by design.
**Meter kit now: summary() basics + lagCorr() latency + residR() timescale split + onsetResponse()
(non-wobble only) + hueHist() palette identity. This five-probe kit is the session's reusable
aesthetic-measurement deliverable — all baked in scripts/vj/aesthetic-meter.js.**

## hueHist resolution limit (iter 125)
Screenshot showed a red-dominant tapestry; hueHist(50) reported modes 0.58/0.67/0.50 (blue-violet)
with ZERO weight in red bins. Cause: the meter samples a 64×36 downscale — finely interleaved
red+blue cells average to violet before binning. **hueHist is trustworthy for broad fields, not
for high-frequency palette interleave. For palette identity on detailed frames, sample at higher
res or histogram per-pixel before downscaling.**

---

## SESSION WRAP-UP (2026-08-18, iters 107–142) — general findings for this visual and others

### The one-sentence version
Everything the user vetoed this session was, at bottom, the same defect — **bounded parameters
visibly retracing their path** — and everything that landed was one of two things: **motion with a
direction** (monotonic spin, perpetual self-similar zoom, one-way plateau steps) or **audio
confined to shading**.

### The hierarchy that emerged (strongest finding)
A structure-first visual has three channels, and they must not trade jobs:
1. **GEOMETRY** (fold ratio, radii, level windows, symmetry) — may only EVOLVE: monotonic
   accumulators, or one-way eased steps on musical events (drops/sections). NO sines, NO audio,
   however smoothed. A "slow, safe" oscillator on geometry is still an oscillator; the user
   noticed a ±0.09 fold-ratio rock and a spring-driven level window as "kaleidoscope sections
   breathing". Fold-ratio errors compound per recursion level (scale^i), so even tiny wiggles
   are large on screen.
2. **LIGHT/SHADING** — where ALL audio belongs: local relief (never the global multiplier —
   that's the strobe channel), per-depth band lighting, texture on line thickness. This is where
   beat-scale musicality lives (verified: rResid rose when we deepened wub→shadow coupling).
3. **COLOR** — follows the slowest music only (key ~8 s median, set clock, permanent drop
   mutations). Hue drift within a track ≈ 0.

### Ratcheting: what actually works and what doesn't
- ✗ Standing sine on a parameter — reads as shaking, regardless of period (70 s cycles still
  got flagged).
- ✗ "Traveling wave through recursion depth" — depth is NOT a visible axis; every level overlaps
  every pixel, so it reads as pulsing. Travel must be along an axis the eye can see.
- ✓ Monotonic rotation (angle wraps invisibly).
- ✓ **Perpetual self-similar zoom** — the natural ratchet for a fractal: magnification ramps one
  fold-octave and wraps where the lattice maps onto itself. Center it on the composition's
  symmetry point. (Caveat found the hard way: compensate the per-level twist with the FIXED step
  only — never with an accumulated angle like gSpin, which is unbounded and spins the frame.)
- ✓ One-way plateau steps on drops (hash target + ~4 s ease) — this is what "the pattern
  evolves" means operationally: irreversible transitions, stillness between them.

### Composition
- "I'm never looking at the center" on any kaleidoscopic shader = the fold's symmetry center is
  off screen-center. Fix empirically: measure the nearest strong symmetry center in a screenshot,
  convert px→world via the uv scale, trim. Don't reason from the fold grid — per-level rotations
  move the visible axes off it.

### Working method (for the next VJ run)
- User feedback in plain words maps to precise defects; triage it first, and prefer ONE decisive
  pass over serial partial fixes (the oscillation survived four partial fixes across 3 sessions
  of complaints before the full "no audio on geometry" pass).
- Verify each experiment on a CLEAN meter window (gate ≈ 1) before tuning its side effects;
  discard boundary/resume windows.
- Meter thresholds that proved out: clip = 0 always; flicker > 0.7 = act (0.6s fine); dark
  0.1–0.3; lumMin ≥ 0.08 (clamp stacked darkeners: min(0.85, …)); rResid is the beat-scale
  musicality needle (0.045 → 0.115 across the wub-relief fix).
- Hot-swap confirmation matters: the "I'm watching it shiver" report happened while a buggy
  version was still live because the fix landed on disk but never got swapped — always confirm
  the marker is in window.cranes.shader, especially across interrupts.

### State at shutdown
- Live target was `lattice-vj/4.frag` (fork of 3 at iter 137, preset in 4.md).
- **iter 142 pass is in the file, GL-validated, but was never observed live** — first task next
  session is to load it and watch: seams at the ~60 s zoom wrap, plateau steps on drops, and
  whether long drop-less stretches feel too static (if so: slow drift from evoPhase, not sines).
- Cron deleted, vj-state.json removed. All work committed to `live-show-rig`.

## Addendum (post-shutdown): the SHIVER PROBE
"Shivering" now has a number: `window.__vjMeter.shiver(secs)` (scripts/vj/aesthetic-meter.js,
bottom block). Operational definition: **oscillation without progression**, measured on
STRUCTURAL scalars (pixels can't tell shiver from healthy translation/zoom):
- edge density (cell-size breathing) and radial brightness centroid (sections in/out) →
  detrended, scored by the worst ANTI-PHASE autocorrelation lobe (+ its period, which
  fingerprints the guilty oscillator: 0.5–2 s = audio-rate spring on geometry, 5–15 s = shape
  clock) and by a retrace ratio (path ÷ range; trend ≈ 1–2, k oscillations ≈ 2k).
- log-radial profile shift per step → signed zoom velocity; **zoomDirectionality** = |net|/Σ|step|
  (1 = one-way ratchet, ~0 = pure in-out breathing). This is the ratchet needle.
- combined `shiverScore` gated by motion; provisional verdicts: >0.45 SHIVERING · 0.25–0.45
  suspect · <0.25 progressing/still. Better/worse = compare across windows / A-B across an edit.
UNCALIBRATED as of shutdown (browser closed before a live run). First task next session:
deterministic A/B with ?audio_file= — 90 s on iter116-musicality-recipe.frag (known breather)
vs 4.frag iter-142 (plateau geometry); set real thresholds from that pair.
