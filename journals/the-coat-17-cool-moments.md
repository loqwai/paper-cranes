# the-coat-17 — Session Journal

## Status
Fresh fork from the-coat-16 at iter 57 of the 2026-04-26 VJ run, mid *Take A Step Back - Dr. Fresch VIP*. **Palette-saturated drip preset** — fork #3 of the session captures distinct preset territory from -16's atmospheric-textured.

## Forks
- `the-coat-17 ← the-coat-16` (iter 57, 2026-04-26): palette-saturated drip preset. knob_3=0.976, knob_15=0.827, knob_14=0.677, knob_10=1.0.

## Key features inherited
Full -14 + -16 lineage. All 14 Hypnosound features mapped. All 6 DJ-able macro axes (FRY, THEME_SHIFT, DARKNESS, FEEDBACK, INKY, STROBE) functional.

## Cool moments
(pending — capturing live)

## Todo
- `[ ] (carried) Vocal-isolation effect target`
- `[ ] (carried) Track-name keyword detection`
- Capture more preset variations as the user explores.

## History of changes (post-fork)
- **Iter 60 of run, iter 3 of -17 (2026-04-26) — GHOSTED-DRIP preset:** Track: still *Cardio*. User dialed back from iter-59 extremes: knob_2 0.984→0.622 (fog moderate), knob_6 0.976→0.622 (tilt moderate), knob_5 → 0 (drop-zoom OFF), knob_4 = 0.165 (eye-wash low), knob_15 still 0.835 (drip high), knob_7 still 0 (fur off), knob_11 still 0.087 (fry low). **Suggested name: "ghosted-drip"** — lean figure, all-moderate, drip-led, low-drama. Distinct from prior 4 territories. **Hold tick.** Worth fork? — judgment call: it's noticeably different from iter-59's "fog-tilt-portrait" because of the drama dial — both lean-fur but iter-59 was max-fog/max-tilt, this is moderate everything + drip-led.
- **Iter 59 of run, iter 2 of -17 (2026-04-26) — DISTINCT-FROM-FORKS preset detected:** Track: *Cardio – Glass Petals, Drew Ray Tanner*. Audio balanced. **User in preset-cataloguing mode** — moved into a preset that's clearly distinct from the three forks: knob_7=0.024 (fur OFF — vs -17's 0.803), knob_11=0.087 (fry low — vs -17's 0.488), knob_6=0.976 (tilt MAX — much higher than any prior fork), knob_12=0.047 (inky off — vs -16's 0.480). **Suggested name: "fog-tilt-portrait"** — lean figure framed in heavy tilted fog. Recommend fork to capture. **No edit, hold tick.**
- **Iter 58 of run, iter 1 of -17 (2026-04-26):** Track shifted to *Stop Me – MNNR*. Audio: high-energy chaotic-bright `bass 0.16 + treble 0.73 + entropy 0.91 + centroid 0.78 + energy 0.73 + energyZ 0.38 (rising)`. User cranked knob_3 to **1.0** (palette nudge MAX, up from 0.976), knob_2 to 1.0 (fog max again), knob_15 stays at 0.929 (drip near max). The palette-saturated drip preset is now even more saturated — palette nudge fully maxed. **No edit, hold tick.** User actively dialing on -17.

## Design hypotheses for v(next)
**Carried from -14 / -16 plus this fork-twice-in-succession lesson:**
- When the user forks twice within ~1 minute on the same track, they're cataloguing distinct preset territories. v(next) should ship with a **named-preset save system** (e.g. "save current knob state as preset 'palette-drip'") so users don't need to fork the whole shader just to save a knob configuration.
- The existing `/preset` skill (per CLAUDE.md) likely solves this — but only if the user remembers to use it. Forking is heavier but the user reaches for it. v(next) might benefit from an inline "save preset" button visible during jam mode.
