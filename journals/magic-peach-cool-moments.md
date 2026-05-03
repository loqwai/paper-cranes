# magic-peach — Session Journal (Recap)

User's call: *"This is amazing btw. Journal what we did to get here. the colors, the reactivity is great."*

## What worked — the through-line

Across 14 ticks of /vibej during *PressureGENESI – Laherte*, we transformed nimitz's Ether plasma (a standalone swirly noise field) into an **event-horizon composition** with deliberate radial structure, perceptually-uniform color, and a knob bank tuned to the user's gestures. The keeper lives at `shaders/claude/wip/magic-peach/magic-peach.frag`.

## What got the colors right

1. **Migrated HSL → oklch** (iter 8). The orange-CORE / blue-CORONA gradient is the heart of the look. In HSL, mixing those passes through a desaturated greenish midpoint; in oklch, the hue circle is perceptually uniform so the gradient reads smooth. **Hue scaling: 1.0 → TAU**, **chroma scaling: 1.0 → ~0.4**, **L coefficients reduced** because oklch lightness is perceptually scaled.
2. **CORE_HUE 0.6 rad (orange-yellow) ↔ CORONA_HUE 4.2 rad (deep blue-violet)** blended by radial distance — gives the disk its emotional gradient: hot inside, cold outside.
3. **THEME_ROT (k5)** lets the user anchor the whole palette to a manual hue offset on top of the centroid-driven rotation. The "magic-peach" pink came from k5=0.268 + the audio-driven centroid offset.
4. **CALM_WARM gate** detects the dr-fresch corner (low energy + mid-dominant + dark centroid) and adds a +0.04 hue shift toward orange. On warm-bass passages the disk visibly warms.

## What got the reactivity right

1. **Bass owns the disk's mass.** `BASS_PUMP = max(bassZScore, 0) * 0.35` thickens the SDF density on kicks (less-negative offset = more visual material). `HORIZON_POWER` adds bass-Z pumping to the core glow. `RING_PULSE = bassZScore * 0.04` briefly pushes the photon ring outward on kicks. **One signal, three layers** — bass kicks read as a coherent gravitational shockwave through every layer.
2. **Energy pumps the saturation and the drop flare.** `SAT_BOOST = 0.15 + max(energyZScore, 0) * 0.35` saturates colors on rising energy. `DROP_FLARE = smoothstep(0.3, 1.0, energyZScore) * 0.8` brightens the photon ring on real builds. Both gated by `max(_, 0)` so falling energy doesn't desaturate (only positive z-scores fire).
3. **Treble Z accelerates time.** `T_ADVANCE` adds `max(trebleZScore, 0) * 0.6` so trebly transients push the disk's swirl forward. Bright passages feel faster than dark passages.
4. **Centroid drives hue rotation.** Brightness center maps directly to hue position around the oklch circle. Different songs sit at different hue zones automatically.
5. **PITCH_FLASH on melodic jumps.** `smoothstep(0.5, 1.0, abs(pitchClassZScore)) * 0.15` flashes hue on big pitch events. Rare but punctuates.
6. **Three slow modulations breathe at 0.4Hz.** BREATH, HEART_PULSE-style modulation, and warm-hearth all share the ~0.4Hz baseline so the disk reads as one organism, not three competing oscillators. (Lesson carried forward from the-coat-15 journal.)

## What got the shape right

1. **Aspect-aware centered UV** — `(fragCoord - iResolution * 0.5) / iResolution.y`. The radial composition only works when the disk is dead-center.
2. **Gravitational lensing with capped twist** — `lensSwirl = LENS_STRENGTH * smoothstep(0, 0.15, r) * smoothstep(0.9, 0.4, r)`. Twist is 0 at center, 0 at edges, peaks in the mid-band. Without the envelope, the central singularity created angular discontinuity wedges. Iter 13.
3. **SDF wander tamed to z-axis only** — original `vec3(sin(t*0.7))` drifted the disk along the diagonal up to ±1 unit and carved chunks where it crossed the photon-ring zone. Now `vec3(0, 0, sin(t*0.7) * 0.2)`. Iter 13.
4. **Evolving fractal** — three coprime sub-Hz oscillators (FRAC_EVO_A/B/C at 0.029-0.083 Hz) drive: (a) FRACTAL_DENSITY drift ±30%, (b) per-axis phase offsets in the nested-sin fold, (c) a secondary octave-2 fold layer with its own phase. The fractal STRUCTURE morphs over ~25-90 second aperiodic cycles — not just rotation. Iter 11.
5. **Continuous disk rendering** — switched the raymarcher's `cl = cl * l + ...` MULTIPLICATIVE accumulator to ADDITIVE `cl += smoothstep * 0.18 * l` and clamped the gradient to [0, 1]. The original Ether shader's silhouette came from multiplicative dark-compounding across raymarch iterations, but for an event-horizon disk we want continuous brightness. Iter 14 — took 3 attempts (overshooting first to a white blob) but landed it. **Lesson: always screenshot before guessing at visual-bug math.**

## What got the controls right

User wiggled knobs across the session. Each big gesture (>0.4 Δ) was auto-wired to a structural axis they were exploring:

| Knob | Wired (iter) | Why that knob |
|---|---|---|
| k5 → THEME_ROT | 2 | First strong unwired gesture |
| k4 → WARM_DEPTH | 3 | Second strong gesture |
| k1 SHAPE_TWIST, k3 FRACTAL_DENSITY, k7 WAVE_STRENGTH, k8 SOFTNESS | 4 | User explicitly asked for "knobs to alter shape, complexity, colors" — wholesale shape control bank delivered same tick |
| k2 → COLOR_SPIN, k11 → DRIFT_SPEED, k14 → BRIGHT_LIFT | 5 | Triple auto-wire on user's knob-grab spree |
| k10 → LENS_STRENGTH | 7 | Biggest wiggle, lensing was already audio-driven, just added knob anchor |
| k12 → PHOTON_RING_RADIUS | 9 | User in stripping mode → wired to STRUCTURAL axis (where the ring sits) not color/intensity |
| k16 → VOID_INNER | 10 | Single focused move on user's continued stripping signal |
| k9 → FRAC_EVO_RATE | 12 | User cranked k9 0→1.0 same tick I added the evolving fractal — gesture was "give me MORE of this lever" |

## Patterns that shaped the run

- **When user explicitly requests a feature ("evolving fractal"), AND in the same message reports a bug ("section cut completely"), ship both in one tick.** The bug fix often shows the feature working better than they expected.
- **When user is in stripping mode (knobs going to extremes), wire NEW knobs to STRUCTURAL controls** (positions, sizes, edges) rather than color/intensity. They want compositional levers, not more pumping.
- **When user backs off a knob right after I add a modulation, lighten the modulation** (silent feedback signal — observed iter 6 with INKY BG).
- **When user cranks a knob to extreme on the same tick I added a feature, that gesture means "amplify this lever"** — wire the knob to control the rate/intensity of that very feature (k9 → FRAC_EVO_RATE).
- **Always screenshot before guessing at visual-bug math.** I made 4 fix-attempts for "clipping" bugs without looking at the rendered output. Three of those were wrong because "clipping" meant three different artifacts (dark band ≠ angular wedge ≠ interior black voids).

## What this taught me about live VJ
The user's knob wiggling IS the design feedback loop — bigger than verbal feedback, more honest. Each knob movement narrates intent: "I want slower spin," "more brightness," "less manual color override." The auto-wire pattern (when a big gesture lands on an unwired knob, wire it that same tick) turned the knob bank from a static interface into a co-designed control surface.
