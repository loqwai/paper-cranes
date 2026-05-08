# the-coat-24 — Session Journal

## Status
Iter 6+ on /loop 1m run. FORCED FULL-KNOB MODE (audio bypassed). Audio override layer routes every audio feature through k20-k42. Tonemap added. VJ FRY ported from balanced-punch.frag onto k55. Layout reshuffled so dramatic features sit on k1-k10 (user has limited physical knobs).

## Knob layout (current)
**Primary (k1-k10):**
- k1 AURA (CHAOS HALO concentric rings)
- k2 PRISM (chromatic R/G/B rim split + chrome hue-cycle speed boost)
- k3 GOD RAYS + PALETTE (combined: brightens god rays AND rotates hue)
- k4 DRIP (chest pour + ground pool)
- k5 PALETTE WARP (hue + sat + time wobble; complex)
- k6 INKY VOID
- k7 FEEDBACK
- k8 DOOM RED (BG tint + nebula warm-shift + hearth boost)
- k9 FUR thickness
- k10 EYE WASH override

**Secondary (k11-k18):** STEP RIPPLE, NEBULA, BEAT STROBE, SIGIL SWIRL, ZOOM (inverted: 1=wide), DROP ZOOM, CAMERA TILT, GROUND QUAKE.

**Audio override (k20-k42):** k20=bass, k21=bassN, k22=bassZ ... k42=beat-trigger. (knob_18 originally master blend but FORCED to full-knob in code; knob_18 has no effect now.)

**Advanced (high knob numbers):**
- k50 LIGHTNING (branching forks)
- k51 TIME ECHO (ghost imprints)
- k55 VJ FRY (hypersat/hue-cycle drift) ← ported 2026-05-02

## Cool moments
### 2026-05-02 — FRY at k55=0.6 + AURA k1=1 + PALETTE k5=1 = acid-green psychedelic silhouette
Track: *Pressure - GENESI, Laherte* (real audio, not playing — full knob mode).
Knob fingerprint: k1=1, k2=0.512, k3=0.906, k5=1, k7=1, k9=1, k15=0.913, k55=0.6.
Composition: figure becomes a dark silhouette inside acid-green AURA concentric rings, prismatic green god rays through head, soft chromatic rim. Heavy feedback (k7=1) softens the rings into smear-glow.
Why it worked: the FRY hue-drift pushed the warm palette hard into one extreme color, but tonemap kept it from blowing out. The dark silhouette + bright surroundings reads as the requested "shadow form with lots going on".
Design hypothesis: **Maxing FRY + a couple of high-saturation effects + dark figure = signature "shadow form" aesthetic.** The shader doesn't need to make the figure bright — it can let FRY dominate and let the silhouette be the negative-space anchor.

### 2026-05-02 — Aesthetic inversion: BG-off + body-as-painting
Track: *Pressure - GENESI, Laherte* (knob mode).
Knob fingerprint: k1=0.157 (AURA almost off), k3=0 (god rays/palette OFF), k5=0.961 (PALETTE WARP maxed), k7=1.0 (FEEDBACK maxed), k10=0 (eye wash off), k55=0.6 (FRY), k56=0.5 (INNER GLOW), k15=0.913 (wide).
Composition: black BG with dark-red god rays barely visible. Figure becomes the entire painting — head iridescent green/yellow/orange chrome, chest cyan-purple gradient, body green-magenta. INNER GLOW + heavy FEEDBACK make the silhouette interior shimmer with cycling color, while FRY hue-drift keeps the palette moving across the body surface.
Why it worked: PRISM chrome rim provides edge color. INNER GLOW pulls that color INTO the body. FEEDBACK at max smears the color across previous frames inside the silhouette. FRY pumps saturation. Together: figure-as-painted-prism.
Design hypothesis: **Inverting (k1, k3, k4, k10 OFF + k5, k7, k55, k56 ON) flips from "max-energy aura+rays" to "minimal BG + lit-up figure". Both modes coexist within the same shader — this is THE knob configuration that turns the dubstep daddy into a painterly subject rather than a silhouette.**

### 2026-05-02 — Tonemap was the unlock for max-knob compositions
Before tonemap: maxing k1+k4+k8+k10 simultaneously gave a pure yellow-white wash with no figure visible. After Reinhard-extended tonemap (white-point=2.5): same knob values render legibly with full body silhouette + rim + halo all showing. **The user's preference is to MAX knobs; the shader needs to be tonemap-defended.**

## Todo
- [ ] Update knob header docs to include k55 = VJ FRY
- [ ] Audit if k50 LIGHTNING or k51 TIME ECHO ever get engaged — if not after a few sessions, retire
- [ ] Consider porting AURORA VEILS from -23 (theme-shift-aware version) on a fresh knob if user wants more BG variety. **Past flag**: -12 user said "auras overpower the scene" — so any aurora must be opt-in via knob, not always-on.
- [ ] Knob 2 (PRISM) currently runs both static R/G/B chromatic split AND angular hue-cycle. Possibly redundant — see if one or the other reads better in isolation.

## History of changes
- 2026-05-02: forked from the-coat-22 to start /vibej run. Kept painterly-groove baseline.
- 2026-05-02: leather lightness floor lifted 0.06→0.14 (figure was invisible in shadow form without audio).
- 2026-05-02: CHAOS HALO aura revived from the-coat-3 (was REMOVED iter-27 in earlier line, re-introduced per user request "I want the version with auras").
- 2026-05-02: AUDIO→KNOB override layer added (k18 master + k20-k42 per-feature). Later FORCED to full-knob in code.
- 2026-05-02: Knob layout reshuffled — old k1/k2/k5/k6/k10 (zoom/nebula/drop-zoom/tilt/quake) moved to k15-k18; dramatic effects (AURA, PRISM, god-rays-palette, DRIP, EYE WASH) promoted to k1-k10.
- 2026-05-02: ZOOM inverted (k15=1=wide, k15=0=tight) + power curve `pow(k15, 0.5)` for finer wide-end control.
- 2026-05-02: GODRAY_INTENSITY capped — audio defaults were dominating, eyes were filling the frame at zoom-out.
- 2026-05-02: Reinhard-extended tonemap added (white=2.5) just before vignette.
- 2026-05-02: VJ FRY ported from balanced-punch.frag → k55. PRISM (k2) upgraded with chrome hue-cycle speed boost + second harmonic.

## Forks
- the-coat-24 ← the-coat-22 (2026-05-02): painterly-groove baseline preserved as starting canvas.

## Design hypotheses for v(next)
- Tonemap should be present from the start in every coat fork — it's the difference between "blown out white" and "legible at max".
- Forced full-knob mode is more reliable than audio for live-driven sessions. Audio override layer should be standard equipment.
- "Shadow form with lots going on" = dark silhouette + bright psychedelic surrounds. Don't try to also light the body when surrounds are maxed.
- Most-impactful single ports from the production set: VJ FRY (k55) is the "fried" knob; PRISM (k2 chrome speed) is the "complex coloring" knob; tonemap is the safety net.
