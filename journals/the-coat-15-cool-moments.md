# the-coat-15 — Session Journal

## Status
Iter 65 (2026-04-27). Forked from the-coat-14 at iter 64 mid-`/vj` run during *Temptation – SIDEPIECE*. Captures the "painterly groove + cool palette + heavy feedback" config. /vj run continues on -15 from here. Track at fork: *Temptation – SIDEPIECE*. First post-fork tick on *ØUT ØF THE WØRLD – Marten Hørger*.

## Forks
- `the-coat-15 ← the-coat-14` (iter 64, 2026-04-27): live painterly-groove preset captured. Bakes 27 ticks of -14 refinement (iters 38-64) including 6-system pitch_change subscription, async shader compile, Z-TRAIN/EMBER RISE/STEP RIPPLE/GROOVE BREATH motifs, 4-channel eye system, RIM_BOOST chaos+energyZ+zoom+pitch_change extensions, WARM HEARTH HUE_BASE-link + widened energy gate, nebula warm-shift + star occlusion. Knob preset bakeline in `the-coat-15.md`.
- `the-coat-16 ← the-coat-15` (iter 66, 2026-04-27): "inky-dramatic chaos drop" preset captured during *Comments (feat. KE) – Claude VonStroke*. Includes the iter-65 Z-TRAIN extreme-bass amplifier + iter-66 chaotic-bright eye coefficient bump. /vj run continues on -16 from iter 67. See `the-coat-16-cool-moments.md`.

## Key lessons carried forward
(See `the-coat-14-cool-moments.md` for the full corpus and `the-coat-3-cool-moments.md` for the cross-fork lessons. Especially: gray-static rules, hash-pattern grain, additive-bright-strobe-direction, oklab-luminance-ops, vetoed motifs list.)

**Fresh reminders for this fork:**
- Composition is at the ~6-overlay ceiling. Refining > adding.
- pitch_change is wired into 6 visual systems. Adding more is past saturation.
- Z-TRAIN gate saturates at bass=0.85; iter 65 extreme-bass amplifier pushes it further at peak.
- All prior vetoes carry over: CRYSTALLINE FACETS, MERCURY FLOW, RGB SPLIT, SCAN LINE, LIGHTNING, COSMIC SHOCKWAVE, INFINITY MIRROR, CONFETTI, VJ GRIT, TEARFALL, CHAOS HALO.

## Cool moments
(continuing from -14)

## Todo
- `[ ] Effect-region DSL hypothesis — standing across -3, -6, -8, -14.`
- `[ ] Pitch-change event detector — IMPLEMENTED iter 38; consider higher-order detectors (sustained-rising-pitch, octave jumps separately).`
- `[ ] Formal event/subscription system for v(next) — pitch_change manually wired into 6 systems is the smoking gun.`
- `[ ] Audit other hard-coded hues besides WARM HEARTH (which was fixed iter 56).`

## History of changes (post-fork)
- **Iter 66 (2026-04-27, MANY-KNOB):** *ØUT ØF THE WØRLD* (track shifted to *Comments (feat. KE) – Claude VonStroke* mid-save). Audio FLIPPED to chaos-bright drop: `bass 0.15 (LOW) + treb 0.74 + trebZ 2.04 (PEAK SPIKE) + entropy 0.90 + centroid 0.85 + roughness 0.89 + flux 0.79 + beat=true`. Total dynamic-range opposite of last tick's bass-only. **8+ knobs moved**: knob_12 → 1.0 (INKY BG MAX), knob_5 0→0.47 (drop-zoom on), knob_10 0.29→0.47 (ground-quake up), knob_11 0.61→0.33 (STEP RIPPLE down), knob_3 1→0.54 (palette pulled back to mid), knob_8 +0.10. Pattern: **"INKY DRAMATIC"** — dark BG framing chrome figure on chaos drop. **Move:** bumped iter-53 chaotic-bright eye gate `* 0.6` → `* 0.9`. At peak chaos (entropy/centroid both > 0.85), eyes now contribute +0.81 (instead of +0.54) to intensity. Track hits both gates at 1.0, plus SNAP from trebZ 2.04 → +0.9, plus baseline 0.25 → eye intensity ~2.5x. Eyes BLAZE on this exact drop signature. **Lesson:** when a multi-channel eye gate fires repeatedly without feeling impactful, the per-channel coefficient was probably tuned for moderate firing — peak audio needs a higher coefficient.
- **Iter 65 (2026-04-27):** *ØUT ØF THE WØRLD – Marten Hørger*. **Z-TRAIN at MAX gate strength** — `bass 0.97 + entropy 0.09 + centroid 0.02 + roughness 0.09` — cleanest bass-only signature of the run. **5 knobs moved → many-knob dramatic.** Diagnosed: Z-TRAIN's `smoothstep(0.6, 0.85, bass)` saturates at bass=0.85, so bass values 0.85-1.0 produced no extra response despite being in extreme territory. **Move:** added `* (1.0 + smoothstep(0.85, 1.0, bassNormalized) * 0.5)` to the Z-TRAIN beam emission. Above bass=0.85 the beam ramps brighter, hitting 1.5x at bass=1.0. At current bass 0.97: ~1.4x boost. Cascades: future "subwoofer-only" passages will pop the headlight visibly more. **Insight:** smoothstep ranges should sometimes have a separate "extreme" amplifier rather than one wide range — narrow gates with overflow boosters preserve mid-range stability while letting peaks fire.

## Design hypotheses for v(next)
(carry forward from -14)
- **Event/subscription system**: 6 visual systems hand-coded for pitch_change is too much hand-coding. Formalize.
- **Convergence_score**: detect when 3+ feature-region gates fire simultaneously, expose as a uniform other effects can amplify on.
- **Effect-region DSL**: each effect declares its feature-space region; v(next) shader engine reasons about overlaps.
- **Eye-system as first-class subsystem**: 4 audio-region channels currently as smoothstep stack; should be declarative emotion-corner gates.
- **Pitch-change higher-order**: distinguish pitch-arrival types (stepwise vs jump vs octave) for nuanced visual responses.
- **Smoothstep-with-overflow-amplifier pattern** (iter 65 lesson): keep middle-range gates stable while letting extremes amplify further.
