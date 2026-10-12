# sun lamp

The giant from the 2026-10-09 sun show (`sun/17`, the late-set close orbit), reworked as office light for a projector. It has no story and no audio. It drifts slowly by itself, and every dial at 0 gives the full-brightness look. The current lamp is `2.frag`. `1.frag` is kept as it was.

## Launch

```
https://visuals.beadfamous.com/?shader=sun/lamp/2&controller=sun-lamp&noaudio=true
```

For a warm room, try the sunset: `&knob_18=0.8&knob_4=0.35&knob_11=0.25`. For a wall of orange light, try `&knob_4=1&knob_11=0.5`.

`@fullscreen: true` stretches the frame to the projector without any extra parameter. The controller is required, because without it the clock sits at 0 and the scene does not move.

## Dials

| Knob | Name | 0 | 1 |
|---|---|---|---|
| K1 | DIM | full light | about 3% (linear light, exponential curve, so the dial feels even) |
| K2 | HUE SPIN | the designed palette | one full turn of the finished palette (0.5 is the opposite hues) |
| K3 | FAN | the show's full cyan fan | the fan fills the top of the frame |
| K4 | SUN SIZE | radius 1.1 half-heights | radius 5 on an exponential curve: about 0.6 fills the wall, and past 0.75 the whole projection is glowing surface. The granules are rescaled as the sun grows, so they stay crisp |
| K5 | COLOR TEMP | neutral | about 1900K candle, luminance kept (the brightest areas pale toward white rather than dim, since candle colour can't be that bright) |
| K6 | ERUPT | the show's surface and prominences | harder boiling, huge looping arcs, and past about 0.6, flare jets that fire from the limb every 15 to 30 seconds at calm SPEED |
| K7 | SPEED | calm drift, 0.15 × the show's pace | 3 × the show's pace (the show's pace is at about 0.63) |
| K8 | SKY SWAP | Van Gogh tile sky | deep-space nebula |
| K9 | FILL | no lift | background lifted about 3.5×, in its own blues |
| K10 | PAINT | clean | brush dabs over the whole frame |
| K11 | SUN COLOR | the designed gold | orange by 0.25 to 0.5, ember red by 0.75, crimson at 1. Lightness is capped as it reddens so the colour stays rich instead of going salmon |
| K12 | SPIRAL | straight fan | up to 0.6 the fan and sky twist into a log spiral round the sun. From 0.6 to 0.72 the frame folds into a six-way kaleidoscope round the sun centre, and past that it winds again. Centre the sun (K15, K16 at 0.5) for the full mandala |
| K13 | GLOW | the show's corona | a golden corona that washes the sky around the sun |
| K14 | DARK | full brightness | darks sink toward black |
| K15 | SUN X | home, lower right | 0.5 is centred, 1 is mirrored to the left |
| K16 | SUN Y | home, low | 0.5 is centred, 1 is mirrored to the top |
| K17 | WASH | full colour | near-white light that keeps the sun's light and dark pattern |
| K18 | DAY CYCLE | the space scene | a horizon, sea and sky come in, and the sun runs sunrise (about 0.15), noon (0.5), sunset (0.75 to 0.85) and night (1). Sunset turns the sun orange on its own. From 0.12 up, DAY CYCLE takes over the background: K15 and K16 are ignored, K8 SKY SWAP does nothing, K12 SPIRAL no longer twists the sky (it still curls the fan and folds the kaleidoscope), and the FAN is cut to 25% by day and to 0 at night |

Show knob numbers keep their meaning, so MIDI muscle memory carries over. The new dials use numbers the show freed: K1 was TRIP, K5 was STORY, K9 was REACT, and K17 and K18 are new. In lamp 2, K6, K11 and K12 changed jobs: REACH became ERUPT, WARMTH became SUN COLOR and SPARKLE became SPIRAL. FAN and GLOW are rebased so that 0 matches the show's photograph (`docs/shots/sun/17-moment-0221.png`), because the show's own 0 dimmed them. The photograph also ran PAINT 0.72 and DARK 0.80, so at 0 the lamp has no brush dabs and a brighter sky. K15 and K16 move away from home, so the sun reaches the centre at 0.5.

DIM, COLOR TEMP and WASH run in linear light after the show's OKLCH white-out knee, in this order: WASH, then COLOR TEMP, then DIM. They change the light without touching the look, and they never produce a negative value or NaN.

## Driving the dials

- **URL.** Add `&knob_N=value`, for example `&knob_1=0.4&knob_5=0.6` for a dim, warm room.
- **MIDI.** Plug in a controller and turn knobs. The first CC from a new device maps to `knob_1`, the next to `knob_2`, and so on. Manage the mapping at `/midi.html`. See `docs/midi-mapping.md`.
- **Phone.** With the dev server running (`npm run dev`), open the lamp with `&remote=display` and open `/vjpad.html` on the phone. The pads are labelled from the `@knob` lines in the shader. `edit.html?remote=control` also has sliders.

## Clock

`controllers/sun-lamp.js` returns `lp_u`, the integral of the SPEED rate, and `lp_e`, the eruption clock, which runs up to 4× faster as ERUPT rises. Each clock has its own dissolve, `lp_seam` and `lp_seamE`, and 1.frag reads only `lp_seam`, so lamp 1 never dissolves on an `lp_e` wrap. Every motion in the shader is a fixed multiple of one of these clocks, so turning SPEED or ERUPT changes rates and never jumps the picture. Both wrap at 8192. For `lp_u` that is about 45 minutes at full SPEED and 15 hours at rest. The wrap keeps float32 precise on a run of several days. At a wrap, that clock's own dissolve (`lp_seam` for `lp_u`, `lp_seamE` for `lp_e`) blends the previous frame over the new one, fading out over four seconds, so the change of pose reads as a dissolve instead of a cut.

## What was cut from the show, and why

- **The story engine** (acts, supernova, collapse, nebula veil, trip arc). It changed the scene on musical events, and a lamp has none. The lamp holds the main-sequence values: heat 1, size 1, power 1, no darkening.
- **All audio.** Every envelope is held at its resting value under average music (`SUN_BREATH` 0.4, mids sway 0.3, hats 0.25, z-score channels at their z = 0 value), and every transient (kick, snare, flux flare, drop, distortion wave) is 0. The frame looks the same with a mic or without one.
- **The binary companion, the black-hole eye, the old urchin rays and the nebula layer.** At the show's giant stage they were either faded out or hidden behind the giant, but they still cost GPU time.
- **Previous-frame lensing.** The wavefronts it carried came from audio. The only previous-frame read left is the wrap dissolve.
- **The orbit-row paint dabs and the CME plume.** The show had already faded out the first, and the second only fired on a drop.

## Iterations

- **1.frag.** The first lamp. The controller is shared, so since lamp 2, lamp 1's SPEED also tops out at 3× the show's pace (the show's pace is at about 0.63, not 1). In testing at 1920×1080 with headless Chrome on Metal, the median frame took about 6.3 ms, against about 12.9 ms for `sun/17` at the show preset.
- **2.frag.** Dials that play. SUN SIZE engulfs the wall, SUN COLOR replaces WARMTH, ERUPT replaces REACH, SPIRAL replaces SPARKLE, and DAY CYCLE (K18) is new. FAN, GLOW and SPEED got wider ranges. The SUN COLOR first pass turned a big sun salmon, so lightness is now capped as the hue reddens. The first kaleidoscope used 12 narrow wedges, which only showed rings, so it now uses 6. Its fade-in also rendered the scene twice (18.8 ms), so it now morphs the fold angle in one pass. During that 0.6 to 0.72 stretch, one seam runs along the ray opposite the fan. With the sun at home that ray is off screen. On the same harness, lamp 2 measured 6.7 to 7.0 ms with every dial at 0 and 9.1 ms in the heaviest maxed case, against 11.7 to 13.6 ms for `sun/17`.
