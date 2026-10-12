# The trip story (K1 ≥ 0.5)

The trip is a second arc for an audience that already knows the first one (born, red giant, supernova, companion kiss). It subverts those tropes. The sun becomes a creature of Julia arms, the camera dives into the arms, the explosion becomes a bloom, and the ending is a lucid recolouring.

The same engine runs it:
- **Earned exits only.** Every exit is a build, drop, calm or low moment, plus the gentle 7-minute fallback.
- **Morph, not cut.** Every parameter glides with its act's ease, so a change of act is a morph.
- **Classic frozen, not reset.** While the trip runs, the classic act holds still. Flip K1 back below 0.5 and the classic story resumes.
- **K5 forces trip acts.** With K1 on, K5 forces a trip act: act = floor(K5 × 7).

| # | Act | Role | Visual verbs | Palette family (OKLCH hue, counter) | Moves on when |
|---|---|---|---|---|---|
| 0 | HATCHLING | main | The sun is an egg. The Julia arms curl tight around it (\|c\| 0.70 gives a filled blob). Painterly and small. | amber 45°, teal counter | build for 30 s → UNFURL; low for 45 s → LUCID |
| 1 | UNFURL | main | The arms uncoil into octopus reach (\|c\| 0.7885, full Julia weight). Rays lengthen. | gold 75°, indigo counter | **drop** → DIVE; calm for 60 s → GARDEN |
| 2 | DIVE | collapse | The camera falls into an arm: self-similar zoom at full rate, fractal sky at 0.7, the sun shrinks to a seed, and an inward shudder runs on entry. | teal 200°, amber counter | **drop** → BLOOM; calm → GARDEN; low → LUCID |
| 3 | GARDEN | nebula | A fractal sky interlude. The Julia garden fills the sky and the dive slows to a drift. The scene goes abstract and the companion leaves. | violet-indigo 270°, gold counter | build for 45 s → TWIN |
| 4 | TWIN | main | The companion orbits close (radius 0.5, not 0.78) and the two stars waltz. Arms are near full. | ice blue 220°, ember counter | **drop** → BLOOM; low for 45 s → LUCID |
| 5 | BLOOM | supernova | This replaces the supernova. On the drop the star turns inside out: the arms flare into petals (\|c\| 0.79), the detonation front runs as a distortion, and the companion is flung. | gold-coral 40°, indigo counter | after 25 s → LUCID |
| 6 | LUCID | rebirth | Slow return in a new key. The hue comes from the 20-second key median, folded into 0–300°. The companion re-forms and a reach window may open. | follows the key (never magenta) | build for 45 s → UNFURL; calm for 60 s → HATCHLING |

Two kinds of control:
- **Shape.** Geometry only moves forward. `bs_dive` and `bs_jTurn` are clocks whose rate the music sets, and `bs_jR` steps to a new value once per act, easing in.
- **Colour.** Colour follows only slow music. Each act's palette family glides over about 30 s, in degrees kept to 0–300, so a glide can never pass through magenta.

## Testing

Run `node .claude/vj-tools/story-trip/test.mjs`. It feeds 20,000 frames of synthetic music (30 minutes) and checks:

- **Classic unchanged.** With K1 = 0, all 135 outputs match the live classic controller exactly, frame for frame.
- **Trip run.** With K1 flipped on and off, the test reached 24 transitions, every one music-earned:
  - 6 on a build, 4 on a drop, 8 on calm, 3 on low, and 3 BLOOMs that ran their course.
- **Sanity.** Every output is finite, both clocks only move forward, and the hue stays within 0–300°.
