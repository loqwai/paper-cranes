# carpet — darkwave fork

Forked from `shaders/redaphid/wip/carpet.frag` after a 16-iteration `/vibej` session that pivoted from psychedelic HSL to darkwave oklab.

## Visual intent

Recursive triangle-wave fractal carpet, reframed for darkwave music: deep purples / blood reds / midnight blues / blacks, perceptual color in oklab, continuous reactive complexity layered with cinematic post-effects.

## Knob map

- `knob_1` — X pan (uv.x offset, centered at 0.5, range ±1.0)
- `knob_2` — Y pan (uv.y offset, centered at 0.5, range ±1.0)
- `knob_3` — zoom (centered 0.5; exp scale, ±3 stops in/out, applied before pan)
- `knob_4` — palette hue offset (0..1 wraps full circle in oklab)
- `knob_5` — rotation speed (0=still, 0.5=normal, 1=2x)
- `knob_6` — fractal scale (1.2..2.0; reshapes recursion pattern)

## Audio mapping

- **bass** → L pump in oklab + echo trail bloom + (inverse) breathing mist
- **bassZ** → L lift on kicks
- **mids** → hue angle + radial twist
- **treble / trebleZ** → chroma + chromatic aberration on echo trail
- **centroid** → radial twist + chroma
- **entropy** → fractal warp_scale + chroma kick (smoothstep 0.5→0.9)
- **flux** → fractal warp_scale + iter count + chroma
- **pitchClass** → hue identity (each note shifts palette by ~7°)
- **roughness** → film grain in dark areas
- **energy / energyZ** → L pump + iter count + drop flash (smoothstep 0.3→0.8)
- **beat** → c1 punch (1.18×) inside fractal loop

## Post-effects (in order)

1. **Frame feedback echo** — prev-frame contracted UV, bass-bloom amplified, max-blended (no runaway accumulation)
2. **Chromatic aberration** — radial RGB split on the echo, scaled by `trebleZScore`
3. **Breathing mist** — soft additive halo, inverse-coupled to bass (fills the void on quiet sections)
4. **Film grain** — hash noise weighted toward dark areas, scaled by spectralRoughness

## Color space

Oklab (perceptual). Hue from time + position + lum + mids + pitchClass + knob_4. L floor 0.12, ceiling 0.78 (stays moody). Chroma 0.11 base + reactive boosts.

## Iteration log (carpet.frag → 1.frag)

- iter 1: pulled aggressive psychedelic mappings (loop iters, warp scale, beat punch) per "much less reactive" feedback
- iter 2: added autonomous `time*0.01` hue drift
- iter 3: wired knob_1/2 → XY pan
- iter 4: wired knob_3 → zoom
- iter 5: hue synthesized from position+time (was greyscale because `rgb2hsl(grey)` returns y=0)
- iter 6: wired knob_4 → hue offset
- iter 7: wired knob_5 → rotation speed
- iter 8: wired knob_6 → fractal scale
- iter 9: **darkwave/oklab pivot** per user request
- iter 10: position-rich hue spread so multi-hue darkwave palette appears simultaneously across screen
- iter 11: frame feedback echo (max-blended)
- iter 12: chromatic aberration on echo, treble-driven
- iter 13: centroid+mids radial twist on UV before fractal
- iter 14: pitchClass added to hue identity
- iter 15: breathing mist (inverse-bass-coupled)
- iter 16: film grain (roughness-scaled, dark-weighted)

## Known issues / cleanup pass before forking next iter

- The `drop` flash logic landed but had an ordering bug; current state declares `drop` correctly but the L/chroma assignment ordering is fresh — verify it reads cleanly in isolation
- A lot of post-effects layered: composition can feel busy on high-energy + high-entropy frames. May want a "calm mode" knob that scales aberration + mist + grain together
