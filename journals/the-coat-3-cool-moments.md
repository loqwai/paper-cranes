# the-coat-3 — Session Journal

## Status
Iter 14. User reverted to the-coat-3 from the-coat-11 after stripped-down approach went the wrong direction. Strategy: "iterate toward craziness from here" instead of stripping back from a maximalist fork. moveStyle switched to "dramatic" (add motifs, not just nudge coefficients). Live DJ set. User twisting knobs.

## Key lessons carried forward from prior VJ sessions (the-coat-6, -8, -11)

**Audio-pattern → visual-response lessons** (from cool-moments entries)
- **Five-way alignments read as *place*, not stack**: iter 39 (*Odds & Ends*, warm dark instrumental, `bass 0.69 + mids 0.85 + centroid 0.10 + entropy 0.07`) had mercury, quake, aurora, fog-pulse, black-hole all firing simultaneously — read as one coherent liquid-chrome-pouring-in-a-green-sky scene, not layered overlays. The alignment was accidental; effects happened to share a centroid band. **Hypothesis**: v(next) should declare feature-space regions explicitly so these alignments are intentional.
- **Warm mid-dominant corner is still under-served**: `mids > 0.7 AND centroid < 0.3 AND entropy < 0.2` = "warm dark instrumental." Only gets hue drift today. Wants its own **slow amber inner glow radiating *from* the silhouette** — distinct from the bass-ring transient system. (Partially addressed: warm-breath chest glow in -7.)
- **Pitch-driven color always felt intentional**: confetti tints, chrome hue, mouth glow, beam color — every time pitchClass drove a hue channel, the user read it as "the music chose that color." Keep doing this.
- **Pitch-change event is a missing signal**: windowed pitchClass (∆ over ~2s, emit pulse on major-3rd/5th/octave jump) would give a "harmony changed" cue distinct from rhythmic ones. Would let visuals respond to musical structure.
- **Climax dampener knob was the biggest live-control win**: user pulled it back during chill, pushed for drops. v(next) should bake this in: one "payoff intensity" channel that scales all drop-effects uniformly, keyed to a user knob AND to `IS_DROP`. Don't let effects each do their own drop-gating.

**Craft lessons** (what breaks and how to avoid it)
- **Gray static = prev-frame desaturation under feedback**: RGB-space multiplicative dimming (`col *= 0.86`) and dark-color mixes leak chroma every feedback cycle. Any block that reads prev-frame + darkens must operate in **oklab L** only (preserving a/b chroma). Helpers `rgb2oklab / oklab2rgb / oklabmix / rgb2oklch / oklch2rgb` are auto-injected by `shader-wrapper.js`.
- **Multiple prev-frame readers compound**: budget them. If adding a new feedback-reading effect, audit what else already reads prev-frame. GHOST ECHO, RGB SPLIT, OUTLINE, MERCURY FLOW, TIME-ECHO all can read prev-frame in the-coat-3 — stacking three+ of them in one frame produces the bleeding-gray-static signature.
- **Silhouette-blackening on audio transients is a trap**: BLACK HOLE block locks into silhouette-only mode when combined with heavy trails — the blackness persists across frames and never recovers. Any "darken the silhouette on a bass spike" effect must either (a) not feed back, or (b) decay to 0 within <0.5s guaranteed.
- **Outline/shadow passes**: edge smoothstep must be strict (≥ 0.14 floor) or low-gradient noise becomes next frame's gradient source → feedback loop of gray ink. Luminance sampling must use oklab L, not `dot(rgb, vec3(0.33))`. Max-knob dim must preserve ≥ 75% luminance.
- **Hash-based patterns on animated UVs = grain**: fur strands, particle cells, always-on starfields compound to read as grain. Gate with strict thresholds (`smoothstep(0.45, 0.85, trigger)`), slow time coefficients, cut blend strength. Default starfield OFF behind a knob.
- **Avoid sine-cross-product patterns on silhouettes**: `sin(uv.x*18) * sin(uv.y*4)`-style patterns produce visible diamond lattices that read as artifacting. Use fbm or domain-warped noise instead. Mercury-flow, crystalline-facets were both hit by this.
- **Orthogonal knob design**: no knob should do `col *=` globally — it compounds with other darkening knobs. Scale per-effect.
- **Strobe direction matters**: default BRIGHT with dark punches, NOT dark with bright punches. The iter-17 VJ BEAT STROBE gets this right (additive-only pulse, never subtracts).
- **Feedback placement**: effect blocks that shouldn't persist across frames must sit AFTER the `col = mix(prev, col, feedback_amt)` step.

**User-vetoed motifs (do not re-add)**
- Lightning (vertical bolts) — user flag iter -11 fork
- Cosmic shockwave (large white ring) — user flag iter -11 fork
- Scan line (cyan CRT sweep) — user flag iter -11 fork
- RGB split (chromatic aberration) — iter -5 fork: "rgb checkerboard on coat"
- Tearfall (vertical white streaks) — iter 35
- Crystalline facets (rainbow diamond grid) — iter 37 on -6, re-flagged iter 19 on -3 ("terrible flashing flannel-like diamonds and colored squares on the jacket"). REMOVED from the-coat-3 iter 19.
- Mercury flow (sine-cross-product vertical stripes reading as diamond lattice) — prior flag on -6, re-flagged iter 19 on -3. REMOVED from the-coat-3 iter 19.
- Infinity mirror (spinning kaleido tiles) — pre-fork -7
- Confetti — iter 45
- VJ GRIT (always-on noise) — iter 52 ("let's not have that grittiness at all")

## Cool moments
(pending)

## Todo
- `[ ] DRIP motif added iter 13: watch for how it reads on actual bass hits. May need to tighten the phase reset so the drop feels triggered, not just advected by time.`
- `[ ] Audit the-coat-3 for known gray-static offenders (RGB split block? prev-frame luminance sampling?) — if user flags gray static on this shader, check line-by-line against -11 lessons above.`
- `[ ] knob_13 still unwired. knob_14 still unwired. Auto-wire when twisted.`

## History of changes
- **Iter 13 (2026-04-22):** User reverted from the-coat-11 back to the-coat-3 ("iterate toward craziness instead of working our way back"). No code change this tick — just the shader swap. Switched moveStyle to "dramatic".
- **Iter 14 (2026-04-22):** Added VJ DRIP block (thematic to *DRIP – EMSKI*). Smooth teardrop SDF descending from chest, bass-gated, knob_15-intensity. Zero hash/noise → should not create grain. Placed between HEART PULSE and chest_glow composite.
- **Iter 15 (2026-04-22):** Added VJ DRIP POOL block below drip — rippling puddle at bottom of frame that catches the drops. Same knob_15 gate so drip+pool scale together. Ellipse SDF + radial sine ripples (bass-synced speed). Pure smooth math, no hash. Track switched to *Wurk – Shlump* mid-save.
- **Iter 16 (2026-04-22):** Added VJ SIGIL SWIRL — radial iridescent spiral across the coat surface, gated by knob_14 and boosted by mids (groove-dominant signal). Pattern = sin(angle*5 + radius*14 - time) cubed, hue cycles with angle+time+pitchClass. Only paints on `coat * (1-curls)` so it stays on the jacket, never the hair/background. Smooth math only — defense against prior gray-static pitfalls. knob_14 removed from unwiredKnobs on this iter. knob_13 still free.
- **Iter 17 (2026-04-22):** Added VJ BEAT STROBE (safe-bright) — full-frame warm cream/peach bump (1.0, 0.85, 0.65) on each beat, decays via `(1.0 - BEAT_PHASE)^3`. Additive only — cannot dim. Gated by knob_13 which completes the 15-knob wiring. All knobs 1-15 now wired in the-coat-3. unwiredKnobs is now empty — every user twist from here on will move an already-mapped knob.
- **Iter 18 (2026-04-22):** User asked me to read prior journals and use those lessons to inform the loop. Consolidated cross-session lessons into the "Key lessons" section above. Applied: added **VJ CHAOS HALO** gated on `entropy > 0.78` (high-entropy is an under-served signal per the-coat-8 hypotheses), with **pitchClass-driven hue** (journal lesson: pitch-driven color always feels intentional). Three concentric outward-pulsing rings around the silhouette using `d` (signed distance to body). Pure smooth math — no hash, no prev-frame read (respects the gray-static rule). Calmer tracks unaffected because gate is strict.
- **Iter 19 (2026-04-22):** User: "We need to remove the terrible flashing flannel-like diamonds and the colored squares on the jacket sometimes." Immediately recognized both from prior journals: **CRYSTALLINE FACETS** (colored squares, `hash(fcell)` cells + `abs(ffrac.x)+abs(ffrac.y)` diamond metric, high-entropy gated) and **MERCURY FLOW** (flashing diamond lattice, `sin(uv.x*18 + sin(uv.y*4)*2.5)` — the exact sine-cross-product that produces visible diamonds on silhouettes). Both pulled entirely from the-coat-3. These are the same effects vetoed on -6 and -11; journal-guided removal eliminated both on first flag without debug guessing.
- **Iter 20 (2026-04-22):** Subtle tick — capped VJ GHOST ECHO feedback (0.55 → 0.35) to keep trails clean after the mercury removal. Switched moveStyle to "subtle" (effects plenty, curation time).
- **Iter 21 (2026-04-22):** Implemented the long-standing **warm-dark-instrumental hypothesis** from prior journals (iter 39 on -6, iter 51 on -8 noted that `mids > 0.7 + centroid < 0.3 + entropy < 0.2` deserves its own effect). Current fingerprint hit that corner (`mids 0.62 + centroid 0.27 + energy 0.10`) so the hypothesis was testable live. Added **VJ WARM HEARTH** block: amber glow radiating outward from silhouette (`exp(-max(d, 0.0) * 8.0)`), slow breathing oscillator (0.4Hz sine), gate = `smoothstep(mids) * smoothstep(low-centroid) * smoothstep(low-energy)` so it only activates during warm calm passages. Relaxed thresholds slightly (mids 0.45-0.75) so it fires on more than just the rare corner. Zero hash, zero prev-frame — safe under feedback.
- **Iter 22 (2026-04-22):** User: "The knob I've been twirling should control the amount and visibility of those radiating auras." User said they'd keep twirling to disambiguate — next tick's knob diff showed knob_2 with |Δ|=0.52 (by far the largest delta; knob_5 was 0.26, knob_7 was 0.22, knob_6 didn't move at all). Rewired **VJ CHAOS HALO** from `entropy > 0.78` strict gate to `knob_2 * entropy_mod` where entropy_mod is a 0.4→1.0 secondary modulator. knob_2 now drives both AMOUNT and VISIBILITY of the rings. Coexists with knob_2's existing climax-dampener role — both scale with the same "VJ intensity" semantic, which is coherent (halo is a payoff effect, like god rays). Opacity coefficient bumped 0.45 → 0.9 so halo reads strongly at max knob_2.

## Forks
- `the-coat-3 ← (original baseline)` — this is the live-set base shader, re-used after the-coat-11 experiment.
- `the-coat-11 ← the-coat-3` (pre-session): full 15-knob rewrite; user abandoned iter 12 in favor of iterating on the-coat-3 directly.
- `the-coat-12 ← the-coat-3` (iter 22, 2026-04-22): snapshot of the "iterate toward craziness" session state. Includes DRIP/DRIP POOL/SIGIL SWIRL/BEAT STROBE/CHAOS HALO/WARM HEARTH additions, CRYSTALLINE FACETS + MERCURY FLOW removals, knob_2-driven halo gate, GHOST ECHO cap tightened to 0.35. See `the-coat-12.md` for full knob bake.

## Design hypotheses for v(next)
- New motifs should always be smooth (SDF-based), not hash-based — hashes create grain when animated.
- A "theme-of-the-track" hook per tick (match motif to track-name keyword) gave the most satisfying reads in the -11 session.
- Dramatic-mode additions should declare their own knob gate from the start, not borrow an existing one.
