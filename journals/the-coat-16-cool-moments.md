# the-coat-16 — Session Journal

## Status
Fresh fork from the-coat-14 at iter 56 of the 2026-04-26 VJ run. Captures the **atmospheric-textured preset** (6th territory the user discovered) on a Dr. Fresch VIP track. Inherits ALL session-built reactivity from -14.

## Forks
- `the-coat-16 ← the-coat-14` (iter 56, 2026-04-26): atmospheric-textured.
- `the-coat-17 ← the-coat-16` (iter 57, 2026-04-26): palette-saturated drip. User forked twice in succession — cataloguing distinct preset territories on the same Dr. Fresch VIP track.

## Key features inherited from -14 (full Hypnosound coverage)

All 14 Hypnosound features map to at least one visual property:
- **bass / mids / treble / energy** + zScores → multiple effects each (heart pulse, hearth, ribbons, fog, etc.)
- **spectralCentroid / pitchClass** → multiple (warmth, hue cycle, eye-wash gating)
- **spectralFlux** → chrome cycle, gleam, drift
- **spectralRolloff** (iter 20 of -14) → gleam intensity (DJ filter sweep analog)
- **spectralSpread** (iter 21 of -14) → rim width (harmonic richness)
- **spectralSkew** (iter 18 of -14) → chrome hue tilt (dark vs bright distribution)
- **spectralKurtosis** → fur trigger
- **spectralRoughness** → fluff agitation, fur trigger
- **spectralEntropy** → twinkle, dread, fur trigger, vignette
- **spectralCrest** (iter 17 of -14) → RIM_BOOST (percussive spikes)
- **pitchClassZScore** (iter 7 of -15 → -14) → rim flash (melodic punctuation)
- **beat** → multiple (rim snap, beat zoom, strobe)

## DJ-able macro axes (inherited)

| Knob | Role |
|---|---|
| knob_1 | zoom (coarse) |
| knob_8 | VJ DARKNESS (multiplicative dim) |
| knob_9 | feedback / heavy smear (post-inversion-fix; high = heavy) |
| knob_10 | fine zoom trim (multiplicative ~0.6-1.4×) |
| knob_11 | **VJ FRY** (DJ-able tween toward hypersaturated style) |
| knob_12 | INKY BG (oklab darken outside silhouette) |
| knob_13 | BEAT STROBE intensity |
| knob_14 | SIGIL SWIRL (now COAT RIBBONS in -15+) |
| knob_15 | DRIP + DRIP POOL |
| knob_16 | **THEME_SHIFT** (palette rotation by knob_16 * 0.5) |

## Six preset territories user explored (inherited as design space)

1. **Monster baseline** — slow modulations dominant, low fry
2. **Full-fried** — knob_11 + knob_16 + feedback all maxed
3. **Lean+fogged** — fur low, fog high, light fry
4. **Tilt+tight** — max camera tilt + max fine zoom
5. **Stripped+drip** — most knobs zeroed, drip + tight zoom only
6. **Atmospheric-textured** ← **THIS FORK** — fog + fur high, fry mid, strobe off

## Cool moments
(pending — capturing live)

## Todo
- `[ ] (carried) Vocal-isolation effect target — when mids > 0.95 + entropy < 0.05, dedicated effect (per iter-33 of -14 cool moment)`
- `[ ] (carried) Track-name keyword detection for auto-preset-suggestion`
- `[ ] (carried) Pitch-change event detector — implemented in -14, watch for refinement opportunities`

## History of changes (post-fork)
(Live — to be appended each tick.)

## Design hypotheses for v(next)
**Carried forward from -14 session-end hypotheses (April 26 2026):**
1. Multi-channel routing into composite elements (rim takes 6+ orthogonal feature signals).
2. Sub-1Hz organism breath = monster/brooding; >5Hz = anxious.
3. DJ-able tween knobs (FRY, THEME, DARKNESS) are first-class user affordances.
4. User knob wiggle = explicit signal; auto-wire pattern works.
5. Multi-feature-domain coverage achievable in one session if pursued deliberately.
6. Targeted gates per audio corner (warm-bass, build-up, drop, melodic-stab, breakdown).

**New for -16:**
- **The shader supports more preset territories than the designer initially expects.** Six emerged organically when the user had room to explore. v(next) should treat preset-territory-count as an inverse measure of design-space rigidity (more territories = more flexible shader).
- **Dr. Fresch tracks book-end the session.** Three rotated through (Space, Fire, Take A Step Back VIP) — the dr-fresch-monster aesthetic recipe was validated by all three. Reusable corner.
