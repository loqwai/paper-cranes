# Twister · sun-1-show (giant orbited sun)

Remapped 2026-10-10 (KNOB-MAP) so every dial changes the giant scene. Dials marked * still need the
staged fix (`.claude/vj-tools/sun-1-show.knobs-fix2.frag`) to read strongly.

## Layout

|        | 1           | 2           | 3          | 4          |
|--------|-------------|-------------|------------|------------|
| **R1** | 🟢 TRIP     | 🩷 HUE SPIN | 🩵 FAN     | 🟠 ZOOM    |
| **R2** | 🟢 STORY    | 🟠 REACH    | 🟠 SPEED   | 🔵 SKY SWAP* |
| **R3** | 🟡 REACT    | 🎨 PAINT    | 🩷 WARMTH  | 🩵 SPARKLE |
| **R4** | 🩵 GLOW     | 🟣 DARK*    | 🟠 SUN X   | 🟠 SUN Y   |

🟠 giant · 🩷 colour · 🔵 sky · 🟢 story · 🟡 audio · 🩵 light · 🟣 dark · 🎨 brush

## Dials

| K  | Name       | Turn up to…                                                              |
|----|------------|--------------------------------------------------------------------------|
| 1  | TRIP       | past 0.5 switches to the trip story (fades in ~6 s, starts at HATCHLING)  |
| 2  | HUE SPIN   | turn the whole finished palette (1 = full turn = 0); magenta is guarded  |
| 3  | FAN        | cyan Julia fan brightness 0.15×→1.4× and reach (was LATTICE)             |
| 4  | ZOOM       | giant radius 0.75→1.60 half-heights                                      |
| 5  | STORY      | force an act: act = floor(k × 7); 0 = automatic story                    |
| 6  | REACH      | prominence (plasma arch) height 0.4×→1.8×                                |
| 7  | SPEED      | giant surface turn + boil rate 1×→4× (rate only, never jumps; was KISS)  |
| 8  | SKY SWAP   | flip the act's backdrop (day tiles ↔ deep space) and clear the nebula veil; works in every act |
| 9  | REACT      | every audio reaction 1×→3.5×                                             |
| 10 | PAINT      | irregular brush dabs + broken colour along the orbit, surface and sky    |
| 11 | WARMTH     | pull the giant, corona and arches toward gold (90%); the sky and backdrop stay blue at any setting |
| 12 | SPARKLE    | stars (count + brightness, round), glints, fan filaments, spicules 1×→4× |
| 13 | GLOW       | corona + chromosphere 0.4×→3.4×                                          |
| 14 | DARK       | sink the darks toward black (hard, below L 0.62)                         |
| 15 | SUN X      | slide the giant (and the companion's path) left ↔ right                  |
| 16 | SUN Y      | slide the giant up ↔ down                                                |

## Remember

- **SUN X / Y at 0 = automatic drift.** Manual control blends in over the
  first 8% of the dial. To pin the sun hard left or at the bottom, turn
  just past 0.08.
- **STORY above 0 locks an act.** Back to 0 for the automatic story.
- **PAINT** (K10) sets brushwork strength. There is no fade knob: the wall stays 100% bright.
- **SPEED** (K7) no longer calls a kiss; kisses come only from the music.
- **HUE SPIN** at 0 and at 1 look the same (a full turn).
- **Turn STORY fully left before the show.** Its ring may sit near 1, and
  the first nudge would lock the last act.
- **First touch can jump.** The Twister is absolute: a dial lands on
  wherever its ring sits.
- **Replug resets the ring colours.** Ask Claude to resend them.
- **Hold a dial at an extreme** and Claude builds that direction into the
  shader.

## Escape hatch

Tell Claude `/show panic sun/7`. It hot-swaps a known-good fork without a reload. The controller keeps running.
