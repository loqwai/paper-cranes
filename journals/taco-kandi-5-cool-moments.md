# taco-kandi-5 — Session Journal

## Status
Iter 34 of /vibej run. **All feedback paths use bounded `mix()` blends — banding is mathematically impossible regardless of knob position.** Branded VJ set for filibertos. Logo recognition is sacred (sharp ink overlay at end-of-main guards it).

## Forks
- `taco-kandi/5 ← taco-kandi/4` (iter 34, 2026-05-09, music: *Better Place — Twin Diplomacy*): "banding mathematically impossible" checkpoint. See `journals/taco-kandi-3-cool-moments.md` for iters 27-34 history.
- `taco-kandi/6 ← taco-kandi/5` (iter 38, 2026-05-09, music: *Windhorse — Of The Trees*): "user rejection list applied" checkpoint — green flash, scanline, drip all removed. See `journals/taco-kandi-6-cool-moments.md` for iter 39+.

## Active effect inventory
- **Outline-aware**: julia-warped feedback, logo-shaped echo, wooli scrolling line, outline edge glow, prismatic R/G/B split, sharp ink overlay
- **Coat finale**: VJ FRY (oklch-clean), inner glow, time-echo, fringe (capped), heart pulse, warm hearth, calm breath, sigil swirl, fur fibers, drip, photon ring, lens, kaleidoscope (seam-fixed)
- **Atmospheric**: starfield, nebula fog
- **Plasma core**: raymarched accretion disk + event horizon

## Cool moments
(pending — capturing live)

## History of changes
- **Iter 38 (2026-05-09) — *Windhorse / Of The Trees* — REMOVALS: green flash, scanline, drip + knob_4 → outline glow** — User flag: "I don't like the green flash, the horizontal 'scanline' or the sphere that's dropping down from the taco over time." **Three removals + one wiring:**
  (1) **Beat flash REMOVED** — was multiplying silhouette by 1.25 on each `beat_pulse` (the green/cyan plasma palette × the brighten-multiply read as "green flash"). Gone entirely.
  (2) **Rim zap REMOVED** — white-cyan `vec3(0.85, 1.0, 1.2)` flash on the ink lines per beat could also have read as the green flash. Replaced with stable `chrome * ink * rim_boost * 0.4`.
  (3) **Horizon scan bar REMOVED** — the iter-37 thin horizontal sweep. User explicitly rejected.
  (4) **Drip REMOVED** — the iter-20 liquid-drop falling from taco_center on bass. Wrapped in `if (false && ...)` so the code is preserved as a learning record but disabled. knob_15 stays in URL but does nothing now.
  Plus: **knob_4 → outline edge glow intensity** (auto-wired iter 38). Was hardcoded `0.7 + drop_glow*0.5`. Now `(0.3 + knob_4 * 1.5) + drop_glow*0.5` — full subtle→hero range. Closes the journal-flagged "knob_4 underused" todo.
  **Pattern recorded:** when user calls out specific effects, cut them with extreme prejudice — even if other changes pile up. Logo-aware effects > random additive overlays.
- **Iter 37 (2026-05-09) — *Focus (feat. CLOVES) - Alok Remix* — HORIZON SCAN BAR (coat-23 port)** — Audio: `treb 0.75, entropy 0.95 (extreme!), centroid 0.84 (very bright), energyZ 0.43 (rising), rough 0.73`. Bright/chaotic peak with rising energy. **Move:** ported coat-23 horizon scan bar (lines 474-486) — thin horizontal bar that sweeps on `smoothstep(0.70, 0.92, centroid) * smoothstep(-0.1, 0.6, energyZ)` gate. Y position tracks centroid, with sin wobble. Confined to exterior (1-silhouette). Color in oklch CORONA family. Audio fingerprint matches current track exactly — should fire visibly. **Pattern:** track archetype "high treble + high centroid → scan line" now properly covered alongside prism (chromatic aberration) and starfield (twinkle).
- **Iter 36 (2026-05-09, on taco-kandi/5) — *Focus (feat. CLOVES) - Alok Remix / John Summit* — REMOVE bipolar split, make pulse always-on** — User: "I am not seeing that zoom happening" + "The knob works - just not reacting to the audio." **Debug:** verified audio is firing (bassNormalized swings 0→0.6 over kicks, drop_glow latches at 1.0). Root cause: my iter-35 bipolar split required knob_7 > 0.5 for ANY pulse. User's k7 was 0.488 — just below threshold. Plus the cubic ease-in was crushing intensity 0.91 → 0.001. **Fix:** removed bipolar split — knob_7 is now monotonic with pulse ALWAYS on (`PULSE_DEPTH = 0.4 + knob_7 * 0.7` so even at k7=0 there's baseline pulse). Doubled the coefficient (0.45→0.55), removed cubic ease (linear smoothstep). Net effect: at k7=0.5 + bass kick, taco grows ~30%. At k7=1.0 + bass kick, taco grows ~50%. **Pattern:** when user says "I don't see it," the threshold is too high. Default to ALWAYS visible, knob just scales how big.
- **Iter 35 (2026-05-09, on taco-kandi/5) — *HERE I IS / BLAAP, Of The Trees* — knob_7 BIPOLAR zoom (base + pulse depth)** — User: "Make sure we're pulsing the zoom with the beat (not the beat uniform; the latching bass stats thing we made earlier), but also let me control it with knob_7." **Move:** made knob_7 bipolar — `[0, 0.5]` controls ZOOM_BASE (tight → wide), `[0.5, 1.0]` controls PULSE_DEPTH (no pulse → heavy pulse). Pulse driver is the latched controller signals (`bass_smooth + drop_glow * 0.3` from `taco-kandi.js`) — NOT the raw `beat` uniform. At k7=0.5 the visual is still; cranking past 0.5 introduces increasingly heavy bass-driven contraction. **Pattern:** bipolar knobs are great when the user wants ONE knob to control TWO related aspects of the same effect.

## Todo
- `[ ] knob_2 wiggling — currently fed into COLOR_SPIN with tiny coefficient; consider repurposing if user shows another use pattern.`
- `[ ] knob_4 (RIM_GLOW) currently underused; user keeps at low values. Could be re-wired to a more impactful effect.`
- `[ ] Test all knobs at extremes for the live set — make a "scene presets" doc with URL params for known good states.`

## Design hypotheses for v(next)
- Bounded `mix(col, prev, gain<0.5)` is the right pattern for ALL feedback effects in future shaders. Never use `col += prev * gain` — feedback resonance is inevitable.
- HSL hue rotation is banned in favor of oklch (radians, no fract wrap).
- Logo-aware effects (outline-traced, silhouette-shaped echoes) are visually richer than center-radial waves AND brand-aligned.
