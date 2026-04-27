# the-coat-19 — Session Journal

## Status
Fresh fork from the-coat-18 at iter 60 of the 2026-04-26 VJ run, *All Eyez On Me – Capozzi*. **Tilt-eyes preset** — fork #5 of session, preset cataloguing mode.

## Standing user preferences (apply to ALL future presets)

> **Pinwheel (knob_14 / SIGIL SWIRL): USER HATES IT. Always knob_14 = 0.** ESCALATED iter 65 (2026-04-26): user "i hate the pinwheel". Iter 61 said "occasional only," but iter 65 made it stronger: don't bring it back ever. Default-zero in all forks. If user explicitly cranks knob_14 themselves, fine — but never set it to anything > 0 in code/edits/forks. **The iter-65 fork attempt at "pinwheel-show" was wrong** and was deleted.
>
> **Forks captured BEFORE this rule have knob_14 too high:**
> - -15: knob_14 = 1.0
> - -16: knob_14 = 0.276 (acceptable)
> - -17: knob_14 = 0.677 (too high)
> - -18: knob_14 = 0.677 (too high)
> - -19: knob_14 = 0.677 (too high — should be revised post-rule)
>
> **Action:** when re-visiting these forks, consider dialing knob_14 down. -16 is the only one currently respecting the rule.

## Forks
- `the-coat-19 ← the-coat-18` (iter 60, 2026-04-26): tilt-eyes preset.

## Cool moments
(pending — capturing live)

## Todo
- `[ ] (carried) Vocal-isolation effect target`
- `[ ] (carried) Track-name keyword detection`
- `[ ] Re-fork lower-pinwheel variants of -15, -17, -18, -19 — they all have knob_14 high.`

## History of changes (post-fork)
- **Iter 63 of run, iter 3 of -19 (2026-04-26) — preset variation evolving (no fork):** Track: still *All Eyez On Me – Capozzi*. User dialing on -19 with pinwheel respecting the new rule (knob_14 stays 0). Current state: knob_3=0.921 (palette near-max), knob_6=0.85 (high tilt), knob_5=0.551 (drop-zoom mid), knob_7=0.378 (mid fur — partial), knob_2=0.551 (fog mid). Reads as an intermediate variant between fully-ghosted (-18) and tilt-eyes (-19): partial fur, high palette saturation, no pinwheel. Distinct enough to merit a future fork if user signals — but no flag yet, so just observing.
- **Iter 61 of run, iter 1 of -19 (2026-04-26) — PINWHEEL DEMOTED to occasional-only:** User flagged that the pinwheel pattern on the coat (knob_14 / VJ SIGIL SWIRL) is too prominent for a default. Set knob_14 = 0 live. Standing rule recorded above. Future presets should respect this.

## Design hypotheses for v(next)
**Carried from prior journals plus this session's:**
- Pinwheel/spiral-on-figure patterns are **occasional accents**, not baselines. Default-off, knob-cranked-on for specific moments.
- This generalizes beyond pinwheel: **any visual that reads "decorative pattern overlaid on the figure" should default-off**. The figure's own form (rim, eyes, fur, ribbons-flowing) carries the visual weight; decorative-on-top features fatigue when always-on.
