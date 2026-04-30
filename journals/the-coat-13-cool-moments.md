# the-coat-13 — Session Journal

## Status
Fresh fork from the-coat-12 at iter 25. "Figure-first" baseline — user had knobs nearly all at 0 when we forked, confirming the scene reads well without background effects piling on. This is the safe landing point for future iterations.

## Forks
- `the-coat-13 ← the-coat-12` (iter 25). Music during fork: *Nobody Else (with Kaleena Zanders) – GRiZ, Kaleena Zanders*.
- `the-coat-14 ← the-coat-13` (iter 27, 2026-04-22): post-CHAOS-HALO-removal + dialed-in live-set config (knob_1=0.858 tight zoom, knob_2=0.661, knob_4=1 eye-wash max, knob_6=0.976 particles). Music: *No Signal – Sully* (warm-dark-bass corner). knob_3 free.

## Key lessons carried forward
(see `the-coat-3-cool-moments.md` → "Key lessons carried forward from prior VJ sessions" — same corpus applies)

**Fresh reminders for this fork:**
- This shader has been through a "figure-first" pass. The base scene (body, coat, fur, eyes, rim) is the primary; everything else is opt-in per knob or drop-gated.
- **All prior-vetoed blocks are removed from this lineage**: CRYSTALLINE FACETS, MERCURY FLOW, RGB SPLIT, SCAN LINE, LIGHTNING, COSMIC SHOCKWAVE, INFINITY MIRROR, CONFETTI, VJ GRIT, TEARFALL. Do NOT re-add.
- **Drop-hit-gated effects (only fire on real drops)**: SUB RING, GROUND QUAKE, BLACK HOLE. Do not ungate — that regresses the iter-25 figure-focus fix.
- **Knob map wired**:
  - knob_2: climax dampener
  - knob_3: CHAOS HALO amount + characteristics (ring count 1→5, phase speed, hue cycling)
  - knob_5: drop-zoom punch scale
  - knob_7: fur thickness / trails
  - knob_9: feedback amount
  - knob_12: outline/shadow (oklab-safe)
  - knob_13: BEAT STROBE intensity
  - knob_14: SIGIL SWIRL intensity
  - knob_15: DRIP + DRIP POOL intensity

## Cool moments

### iter 37 — *What's In Your Heart* — Effin — DROP LANDING

**Audio fingerprint:** `energy 0.81 + energyZ 0.71 (strong rising) + flux 0.21 + treble 0.60 + trebZ 0.04 + entropy 0.61 + centroid 0.60 + pitch 1.00 + bass 0.17 (low)`. Classic trebly-house drop landing with strong positive energy slope, low bass, pitch near top-of-wheel.

**What worked:** Full-finale knob config (knob_2=1 climax, knob_3=1 palette rotation full-wheel to teal/green, knob_5=0.88 drop-punch, knob_6=1 particles, knob_7=0.88 trails, knob_15=1 drip-pool, knob_13=0.2 laser curtain on). All iter-32+ shader upgrades firing in concert: lowered IS_DROP floor makes this energyZ 0.71 read as peak-drop-confident, RIM_BOOST amplified rim with the iter-36 sustained-energy term pops the icon, VJ RADIAL BARS fire on the background masked safely outside the silhouette, drop-punch zoom scales with knob_5. Journal-anchored finale aesthetic: icon locked, background unloaded, no gray static because RADIAL BARS use zero prev-frame sampling.

**What was missed:** No pitch-change event channel (still a standing hypothesis). Pitch hit 1.00 at drop landing — might have been a chord resolution — but visuals didn't flag it as a discrete "harmonic arrival" beyond continuous hue drift.

**Design hypothesis for v(next):** The iter-30 many-knob-heuristic → dramatic-tick pipeline made the finale run land on-beat with the user's intent. This is the session's most important craft-lesson of the whole run: **user knob activity is itself a signal** that should promote tick importance, separate from audio signals. v(next) should bake this in as a first-class input (maybe even drive a one-frame "flash" on moments where many knobs move, since that IS the user's performance gesture).

## Todo
- `[ ] Audit: VJ ROTOR GEAR and AURORA VEILS are currently audio-only gated. If either reads as competing with the figure, consider drop_hit-gating them too.`
- `[ ] Pitch-change event detector — standing journal hypothesis.`
- `[ ] Effect-region DSL hypothesis — standing.`

## History of changes (post-fork)
- **Iter 26 (2026-04-22):** Gave the eyes a sustained-energy channel. Previously they only woke on `drop_hit + SNAP(treble)` — bright vocal passages and sustained-high-energy moments left them sitting dim. Added `smoothstep(0.5, 0.85, energyNormalized) * smoothstep(0.4, 0.8, spectralCentroidNormalized) * 0.9` so the eyes light up during bright sustained sections (GRiZ vocals, house builds) without stepping on the drop-only hit feel. Centroid gate keeps dark low-centroid tracks from getting bright eyes (those rely on WARM HEARTH). User was exploring from the figure-first baseline this tick, knob_5 maxed to pre-load drop-punch.
- **Iter 27 (2026-04-22):** User: "Remove that aura effect entirely." VJ CHAOS HALO pulled from the-coat-13 — it had gone through knob_2 (iter 22, wrong), knob_3 rewire (iter 23), characteristic-expansion (iter 23), and a "still prominent at knob_3=0" diagnostic panic (iter 25, which had located the real culprits — SUB RING/GROUND QUAKE/BLACK HOLE). Despite the iter-23 knob_3 gate working correctly, the user didn't want the motif in the shader at all. Lesson: "the effect reads as an aura" ≠ "the user wants an aura effect" — removing trumps gating when the underlying shape isn't desired. knob_3 is now free again for a new effect.
- **Iter 34 (2026-04-22):** User: "Let's ease back to the original aesthetic." Swapped jam tab from the-coat-14 back to the-coat-13 (figure-first baseline). the-coat-14 had accumulated several live experiments (palette-shift on knob_3, INKY BG on knob_12, IS_DROP tightened, zoom regime flipped, eyes sustained-energy, knob_5 wired). Those stay saved in the-coat-14.frag as a reference checkpoint. -13 is the simpler clean fork. knob_3 is again latent here.
- **Iter 35 (2026-04-22):** **FINALE TICK.** User: "This is the finale! Let's get technical and crazy but still keep the icon" + "Definitely none of that terrible gray static in the jacket." Added **VJ RADIAL BARS** — 128 thin rotating spears radiating from chest-center outward, pitch-tinted HSL, treble-Z twisted rotation, per-spear hash amplitude for live chaos. **Strictly masked to `silhouette < 0.02` so the jacket is never touched**. Zero prev-frame sampling — pure procedural sin/cos/pow math — no feedback loop can create gray static. Energy-gated (`smoothstep(0.3, 0.75, energyNormalized)`) so calm passages stay clean. knob_13 scales intensity alongside beat strobe (finale channel). Track at time of edit: *What's In Your Heart – Effin*, fingerprint `treble 0.76 + trebZ 0.46 + entropy 0.92 + energyZ 0.44 rising` — exactly the "build into finale" shape.
- **Iter 36 (2026-04-22):** Many-knob heuristic (6 knobs moved, 5 UP — full finale unload: knob_2 +0.99 to max, knob_3 +0.16 to max, knob_4 +0.06, knob_5 +0.51, knob_7 +0.29). User wants icon to POP during the finale. Amplified **RIM_BOOST** with two new terms: `smoothstep(0.4, 0.9, energyNormalized) * 1.5` (sustained-energy boost) + `max(trebleZScore, 0.0) * 0.8` (treble-spike boost). Rim now reads hotter during builds + bright spikes, not only on flux or bass transients. Icon's signature chrome edge pops harder exactly when the user cranks the payoff knobs.
- **Iter 37 (2026-04-22):** Drop landing on *What's In Your Heart*. Logged as first cool-moment entry for -13. Tick edit: vignette thresholds now shift outward by `drop_hit * 0.3` so corners stay bright during the peak, giving a "scene engulfs the frame" feel. Calm passages still tighten normally.

## Design hypotheses for v(next)
(carry forward from -12 journal)
