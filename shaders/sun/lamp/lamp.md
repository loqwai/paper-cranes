# sun lamp

The giant from the 2026-10-09 sun show (`sun/17`, the late-set close orbit), reworked as office light for a projector. It has no story and no audio. It drifts slowly by itself, and every dial at 0 gives the full-brightness look.

## Launch

```
https://visuals.beadfamous.com/?shader=sun/lamp/1&controller=sun-lamp&noaudio=true
```

`@fullscreen: true` stretches the frame to the projector without any extra parameter. The controller is required, because without it the clock sits at 0 and the scene does not move.

## Dials

| Knob | Name | 0 | 1 |
|---|---|---|---|
| K1 | DIM | full light | about 3% (linear light, exponential curve, so the dial feels even) |
| K2 | HUE SPIN | the designed palette | one full turn of the finished palette (0.5 is the opposite hues) |
| K3 | FAN | the show's full cyan fan | brighter, longer arms |
| K4 | SUN SIZE | radius 1.1 half-heights | radius 2.2, so the sun fills most of the wall |
| K5 | COLOR TEMP | neutral | about 1900K candle, luminance kept (the brightest areas pale toward white rather than dim, since candle colour can't be that bright) |
| K6 | REACH | the show's prominence height | taller prominences |
| K7 | SPEED | calm drift, 0.15 × the show's pace | the show's pace |
| K8 | SKY SWAP | Van Gogh tile sky | deep-space nebula |
| K9 | FILL | no lift | background lifted about 3.5×, in its own blues |
| K10 | PAINT | clean | brush dabs over the whole frame |
| K11 | WARMTH | as designed | the giant and its corona lean to gold |
| K12 | SPARKLE | the show's glints | brighter lattice glints, filaments and spicules |
| K13 | GLOW | the show's corona | corona and chromosphere much brighter (8.5× before the soft limit) |
| K14 | DARK | full brightness | darks sink toward black |
| K15 | SUN X | home, lower right | 0.5 is centred, 1 is mirrored to the left |
| K16 | SUN Y | home, low | 0.5 is centred, 1 is mirrored to the top |
| K17 | WASH | full colour | near-white light that keeps the sun's light and dark pattern |

Show knob numbers keep their meaning, so MIDI muscle memory carries over. The new dials use numbers the show freed: K1 was TRIP, K5 was STORY, K9 was REACT, and K17 is new. FAN, REACH, SPARKLE and GLOW are rebased so that 0 matches the show's photograph (`docs/shots/sun/17-moment-0221.png`), because the show's own 0 dimmed them. The grade is not rebased: the photograph also ran PAINT 0.72, WARMTH 0.92 and DARK 0.80, so at 0 the lamp has no brush dabs, no gold lean and a brighter sky. Set those three to get the photograph back. K15 and K16 move away from home, so the sun reaches the centre at 0.5.

DIM, COLOR TEMP and WASH run in linear light after the show's OKLCH white-out knee, in this order: WASH, then COLOR TEMP, then DIM. They change the light without touching the look, and they never produce a negative value or NaN.

## Driving the dials

- **URL.** Add `&knob_N=value`, for example `&knob_1=0.4&knob_5=0.6` for a dim, warm room.
- **MIDI.** Plug in a controller and turn knobs. The first CC from a new device maps to `knob_1`, the next to `knob_2`, and so on. Manage the mapping at `/midi.html`. See `docs/midi-mapping.md`.
- **Phone.** With the dev server running (`npm run dev`), open the lamp with `&remote=display` and open `/vjpad.html` on the phone. The pads are labelled from the `@knob` lines in the shader. `edit.html?remote=control` also has sliders.

## Clock

`controllers/sun-lamp.js` returns `lp_u`, the integral of the SPEED rate. Every motion in the shader is a fixed multiple of it, so turning SPEED changes rates and never jumps the picture. `lp_u` wraps at 8192. That is about 2.3 hours at full speed and 15 hours at rest. The wrap keeps float32 precise on a run of several days. At the wrap, `lp_seam` blends the previous frame over the new one, fading out over four seconds, so the change of pose reads as a dissolve instead of a cut.

## What was cut from the show, and why

- **The story engine** (acts, supernova, collapse, nebula veil, trip arc). It changed the scene on musical events, and a lamp has none. The lamp holds the main-sequence values: heat 1, size 1, power 1, no darkening.
- **All audio.** Every envelope is held at its resting value under average music (`SUN_BREATH` 0.4, mids sway 0.3, hats 0.25, z-score channels at their z = 0 value), and every transient (kick, snare, flux flare, drop, distortion wave) is 0. The frame looks the same with a mic or without one.
- **The binary companion, the black-hole eye, the old urchin rays and the nebula layer.** At the show's giant stage they were either faded out or hidden behind the giant, but they still cost GPU time.
- **Previous-frame lensing.** The wavefronts it carried came from audio. The only previous-frame read left is the wrap dissolve.
- **The orbit-row paint dabs and the CME plume.** The show had already faded out the first, and the second only fired on a drop.

## Iterations

- **1.frag.** The first lamp. In testing at 1920×1080 with headless Chrome on Metal, the median frame took about 6.3 ms, against about 12.9 ms for `sun/17` at the show preset.
