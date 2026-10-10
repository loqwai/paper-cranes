# Twister · sun-1

All dials at **0** give the show look.

## Layout

|        | 1           | 2           | 3          | 4          |
|--------|-------------|-------------|------------|------------|
| **R1** | 🟠 HOLE     | 🩷 HUE SPIN | 🔵 LATTICE | 🟠 ZOOM    |
| **R2** | 🟢 STORY    | 🟢 REACH    | 🟢 KISS    | 🔵 CALM    |
| **R3** | 🟡 REACT    | 🔴 FADE     | 🩷 WARMTH  | 🩵 SPARKLE |
| **R4** | 🩵 GLOW     | 🟣 DARK     | 🟠 SUN X   | 🟠 SUN Y   |

🟠 sun · 🩷 colour · 🔵 sky · 🟢 story · 🟡 audio · 🔴 fade · 🩵 light · 🟣 dark

## Dials

| K  | Name       | Turn up to…                                       |
|----|------------|---------------------------------------------------|
| 1  | HOLE       | grow the sun's core                               |
| 2  | HUE SPIN   | rotate the whole palette (1 = full turn = 0)      |
| 3  | LATTICE    | strengthen the spiral lattice                     |
| 4  | ZOOM       | scale the sun, rays and lens (0.55× → 1.5×)       |
| 5  | STORY      | force an act: act = floor(k × 7)                  |
| 6  | REACH      | force the huge-ray mode                           |
| 7  | KISS       | past 0.5 calls a companion kiss (10 s guard)      |
| 8  | CALM       | fade the patchwork clouds back to blue tiles      |
| 9  | REACT      | more reaction to the music (1× → 2.5×)            |
| 10 | FADE       | fade the wall to black                            |
| 11 | WARMTH     | pull every colour toward sun gold                 |
| 12 | SPARKLE    | stars and lattice glints (1× → 3×)                |
| 13 | GLOW       | corona brightness (1× → 2.5×)                     |
| 14 | DARK       | push the darks toward black                       |
| 15 | SUN X      | place the sun left → right                        |
| 16 | SUN Y      | place the sun bottom → top                        |

## Remember

- **SUN X / Y at 0 = automatic drift.** Manual control blends in over the
  first 8% of the dial. To pin the sun hard left or at the bottom, turn
  just past 0.08.
- **STORY above 0 locks an act.** Back to 0 for the automatic story.
- **FADE** is the safe exit at the end of the set.
- **First touch can jump.** The Twister is absolute: a dial lands on
  wherever its ring sits.
- **Replug resets the ring colours.** Ask Claude to resend them.
- **Hold a dial at an extreme** and Claude builds that direction into the
  shader.

## Escape hatch

Tell Claude `/show panic sun/7`. It hot-swaps a known-good fork without a reload. The controller keeps running.
