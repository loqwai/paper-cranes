# the-coat-14 — Session Journal

## Status
Fresh fork from the-coat-13 at iter 27, right after VJ CHAOS HALO removal. User's current knob config leans **tight-zoom + payoff-ready**: knob_1=0.858 (near-max zoom), knob_4=1 (eye-wash MAX), knob_6=0.976 (particle storm near max), knob_2=0.661 (climax mid-high). knob_3 is free for a future effect.

## Forks
- `the-coat-14 ← the-coat-13` (iter 27). Music during fork: *No Signal – Sully*.
- **Iter 34 swap-back**: user asked to "ease back to the original aesthetic" → reverted live jam tab to `the-coat-13` (the figure-first baseline). the-coat-14's edits (palette-shift wiring, inky BG, IS_DROP tightening, zoom regime flip, knob_5 wiring, eyes sustained-energy) are preserved in this .frag for future reference but not in active use. Knob values preserved across swap; knob_3 now latent on -13 since CHAOS HALO was removed before the swap back.

## Key lessons carried forward
(See `the-coat-3-cool-moments.md` → "Key lessons carried forward from prior VJ sessions" for the full corpus.)

**Fresh reminders for this fork:**
- CHAOS HALO fully removed. Don't re-add a concentric-rings-from-silhouette motif — user rejected it twice (once with characteristics, once outright).
- All prior vetoes still stand: CRYSTALLINE FACETS, MERCURY FLOW, RGB SPLIT, SCAN LINE, LIGHTNING, COSMIC SHOCKWAVE, INFINITY MIRROR, CONFETTI, VJ GRIT, TEARFALL.
- SUB RING, GROUND QUAKE, BLACK HOLE are drop_hit-gated — do not ungate.
- knob_3 is a free slot — wait for user direction before claiming it.

## Cool moments
(pending — capturing live)

## Todo
- `[ ] Pitch-change event detector — standing journal hypothesis across -6, -8, now here.`
- `[ ] Effect-region DSL hypothesis — standing.`
- `[ ] Live-test iter-21 VJ WARM HEARTH on *No Signal – Sully* (bass 0.68 + centroid 0.23 + mids 0.64 is exactly its corner). Log as cool moment if it reads well.`

## History of changes (post-fork)
- **Iter 28 (2026-04-22):** User nudged knob_3 to 0.189 (auto-wire signal — it had been free since CHAOS HALO removal). Rewired it as **global palette hue shift**: `HUE_BASE += knob_3` so 0 = no color change, 1 = full hue wheel. This revives the most-loved pattern from the-coat-11 (palette nav via knob_3 + knob_4). Chose this over inventing a new motif because the journal consistently shows users loving the "knob_3 = palette" affordance. User immediately cranked knob_3 to 0.992 — confirming the wiring was the right guess.
- **Iter 29 (2026-04-22):** Palette-cohesion polish: `HUE_DROP` now also includes `+ knob_3` so drop hits stay in the same palette region the user rotated to. Previously `HUE_DROP = fract(0.99 + centroid * 0.05)` was fixed near orange-red, and at knob_3 ≈ 1 with the base palette rotated to cyan/green, drop flashes snapped back to orange — dissonant. Now both base and drop hues rotate together with knob_3.
- **Iter 30 (2026-04-22):** User directive: "Assume if I'm changing a bunch of knobs at once that I want a greater change to the vibe of the shader." Encoded as a **many-knob heuristic** in SKILL.md §C.1 — 3+ knobs moved >0.05 since last snapshot = auto-promote that tick to dramatic. Applied it retroactively here (knob_2 +0.93, knob_5 -0.61, knob_3 +0.05). User pattern read: cranked climax back while killing drop-punch = "I want sustained climactic energy, not discrete drop hits." Dramatic move: flipped the zoom regime — `INTENSITY_ZOOM` coefficient raised from 0.3 → 0.55 AND added a `max(trebleZScore, 0.0) * 0.2` term so sustained-energy bright-trebly builds now push the camera in, not just bass-loud ones. Whole scene breathes harder with the music during long climactic passages. Audio was briefly 0.00 at tick start but came back live mid-tick; edit applied with fresh fingerprint.
- **Iter 31 (2026-04-22):** Many-knob heuristic triggered again — 5 knobs moved >0.05, all **downward** (knob_2 -0.72, knob_4 -0.44, knob_7 -0.46, knob_3 -0.20, knob_1 +0.17). User pattern read: global knob-down = "calm the scene, give the figure space." Dramatic move: tightened the fur-strand gate from `smoothstep(0.15, 0.55)` to `smoothstep(0.55, 0.90)` (strands only peak on truly chaotic passages, not every mid-busy track) and halved strand blend from 0.85 → 0.5 so the base coat color reads through even when they fire. Net: coat looks cleaner/less textured in most music, fibers still pop on genuinely chaotic moments. This is a **breathing-room** move that matches the knob-down pattern.
- **Iter 32 (2026-04-22):** Many-knob heuristic triggered (knob_2 +0.54, knob_5 +0.98, knob_3 -0.08). User pattern: climax cranked + drop-punch MAXED = "I'm expecting a drop and want everything to unload." Audio backs it up: energyZ 0.52 rising, energy 0.85, IS_DROP math was under-firing (smoothstep floor was 0.6, energyZ hadn't quite reached). Dramatic move: lowered the IS_DROP energyZ threshold floor from 0.6 → 0.35 and raised contribution from ×0.5 → ×0.75 so natural builds (energyZ 0.3-0.6 territory) now read as drop-confident earlier and harder. Cascades into every drop-gated effect: god rays, SUB RING, GROUND QUAKE, BLACK HOLE, rim width, drop-zoom, chest glow hue shift. Expected live effect: on *I'm the Truth*-style tracks with sustained high-energy + rising energyZ, the payoff now lands when the user feels the build, not a half-second late.
- **Iter 33 (2026-04-22):** Many-knob heuristic (7 knobs moved >0.05). User cranked several knobs DOWN (climax, zoom, drop-punch) + brought **knob_12 UP** from 0 (a knob that had NO wiring in this shader — twist was non-functional). Dramatic move: wired knob_12 as a **VJ INKY BG** block — dims L and mutes chroma outside the silhouette in oklab space, figure stays saturated and colorful, background goes inky/moody. Entropy modulator sharpens the effect so chaotic post-drop textures get crisper. Chroma-preserving operation in oklab avoids the gray-static feedback-loop pitfall from the-coat-11 outline block. User immediately cranked knob_12 from 0.236 → 1.0 — strong confirmation the wiring was the right guess and they wanted the inky affordance.

## Design hypotheses for v(next)
(carry forward from -12 / -13 journal)
