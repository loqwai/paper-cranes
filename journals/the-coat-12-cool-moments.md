# the-coat-12 — Session Journal

## Status
Fresh fork from the-coat-3 at iter 22. Preserves the full "iterate toward craziness" session state: DRIP/POOL (knob_15), SIGIL SWIRL (knob_14), BEAT STROBE (knob_13), CHAOS HALO (knob_2-gated, radiating auras), WARM HEARTH (mid-dominant amber), and CRYSTALLINE FACETS + MERCURY FLOW removed. All 15 knobs wired. Outline block in oklab L (gray-static-proof).

## Forks
- `the-coat-12 ← the-coat-3` (iter 22): live-set crystallization. Music during fork: *bitches – LŪN*.
- `the-coat-13 ← the-coat-12` (iter 25): "figure-first" baseline — captures the cleaned-up state after removing 4 vetoed background blocks and gating 3 ring/aura effects to drop_hit. Knobs near zero = just the dubstep daddy silhouette + coat + fur + eyes + rim. Safe landing point.

## Key lessons carried forward
(see `the-coat-3-cool-moments.md` → "Key lessons carried forward from prior VJ sessions" — same corpus applies here)

**Fresh reminders for this fork:**
- knob_2 is **dual-purpose**: climax dampener (god rays/eye wash/eye punch) AND CHAOS HALO amount/visibility. This was intentional — both are "VJ intensity" payoff channels.
- Do NOT re-add: lightning, cosmic shockwave, scan line, RGB split, tearfall, crystalline facets, mercury flow, infinity mirror, confetti, VJ GRIT.
- Warm-dark-instrumental hypothesis is now implemented via VJ WARM HEARTH — fires on `smoothstep(mids) * smoothstep(low-centroid) * smoothstep(low-energy)`.
- Pitch-driven hue used in: chrome rim, DRIP color, HUE_BASE, CHAOS HALO. Any new color-driven effect should pitch-hook for consistency.

## History of changes (post-fork)
- **Iter 23 (2026-04-22):** User: "Ok I turned a knob to a low value. That knob has to control the presence and characteristics of the auras." Iter 22's knob_2 guess was wrong — the biggest-delta heuristic mislabeled climax-dampener as the halo knob. User corrected by lowering knob_3 to 0 while keeping knob_2 at 1. Rewired CHAOS HALO to **knob_3** as primary. Also expanded knob_3 into a "characteristics" control (not just amount): ring count scales 1→5 with knob, phase speed scales 0.15→0.7, ring-width bloom inversely, pitch hue-coupling 0.2→1.2, time hue-cycle 0→0.08. So knob_3 = 0 means no rings; knob_3 = 0.33 sparse slow single; knob_3 = 1 dense fast rainbow bloom. knob_2 is back to pure climax-dampener duty.

**Lesson:** knob-delta heuristic for inferring user intent is fragile — use it as a hint, not as authority. When the user clarifies by twisting a specific knob AND talking about a specific effect, wait for the correction signal before finalizing the wiring.

- **Iter 24 (2026-04-22):** Wired previously-latent **knob_5** into the zoom expression. Documentation claimed knob_5 = "drop zoom override" since pre-session but no expression referenced it — twisting it did nothing. Now: `zoomAmount += drop_hit * DROP_ZOOM * (knob_5 * 2.0)` so knob_5=0 kills drop punch, 0.5 matches old behavior, 1.0 doubles the punch. User twisted knob_5 to 0.331 this tick (delta from 0.055) — wiring fulfills the twist-to-effect expectation. User also validated iter-23's halo rewire: knob_3 went up to 1.0 (testing max), knob_2 dropped to 0.055 — confirms knob_3 = halo, knob_2 = climax.
- **Iter 25 (2026-04-22):** Two user flags in one tick:
  1. "I've dialed everything I can down to 0 and there's still very prominent auras that overpower the scene" — audited: SUB RING was firing continuously (`bassZ > 0.3` gate too permissive, fires during any ambient bass activity, reading as a perpetual halo/aura below figure). Also AURORA VEILS firing on borderline centroid. CHAOS HALO properly gated to knob_3, not the culprit.
  2. "Let's return focus to the figure. The other stuff is starting to drown out the base 'dubstep daddy'" — same root cause: too many background effects firing on weak audio gates.

  Applied a combined cleanup: **REMOVED** four vetoed-on-the-coat-11-but-still-present-on-the-coat-3 blocks: VJ RGB SPLIT, VJ SCAN LINE, VJ LIGHTNING, VJ COSMIC SHOCKWAVE. **GATED** three ring/rings-type effects to `drop_hit` so they only fire during real drops, not ambient bass passages: VJ SUB RING, VJ GROUND QUAKE, VJ BLACK HOLE. Net result: figure (body + coat + eyes + rim + fur) is the baseline scene; background motifs are the payoff layer that activates on real drops. Journal lesson reinforced: **when forking from an earlier shader, carry forward its previous session's removals**, not just its code.

## Cool moments
(pending — track live-set results here)

## Todo
- `[ ] Verify that the CHAOS HALO opacity at knob_2=1 doesn't compete visually with god rays (also knob_2-scaled). If they stack too brightly together, cap one of them.`
- `[ ] Prototype the pitch-change event detector — windowed pitchClass + emit pulse on discrete jumps. Journal hypothesis standing since iter 51 on -8.`
- `[ ] Effects-declare-their-region DSL idea (journal hypothesis) — would let multi-effect alignments be intentional rather than accidental. Worth sketching.`

## History of changes
(See the-coat-3-cool-moments.md for iters 13-22 that produced this fork.)

## Design hypotheses for v(next)
- Effect-region DSL: each VJ block declares `{features: [...], region: "fingerprint"}` → runtime alignment registry so you can see "what overlaps here?" in one place.
- Pitch-change event channel.
- Payoff-intensity channel as a first-class concept (currently `knob_2 * drop_hit` is implicit).
