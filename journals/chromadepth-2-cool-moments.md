## Status
Iter 1 of /vibej run on `wooli/chromadepth-2`. Live mic input. Calm/vocal phase: bass 0.41, treble silent, mids 0.59, pitch 0.80. Aesthetic must stay chromadepth-faithful (HSL, red=near, blue=far).

## Constraints (chromadepth)
- Hue order is HSL not Oklch — `hue = t * 0.75` maps depth to red→violet.
- Line layer = warm (near). Don't push line hue past ~0.15 or it stops popping forward in 3D glasses.
- Edge glow = pure red (~hue 0.02). Don't drift this.
- Fractal exterior = blue/violet. Don't add warm tints to exterior.
- Beat: brightness pulse only, no hue shift.

## Cool moments
_(none yet)_

## Todo
_(none yet)_

## History of changes
- Iter 1: added subtle pitch-class hue drift to scrolling line (small amplitude, kept within warm range so chromadepth red=near is preserved).
- Iter 2: lifted LINE_GLOW_INT floor (0.04→0.07) and added trebleNormalized * 0.05 — line now visible during quiet/melodic stretches, breathes with hi-hats. Edit done static (jam tab was on a different shader); validated via scripts/validate-shader.js.

## Forks
_(none)_

## Design hypotheses for v(next)
- Pitch-class as a *secondary* color tint inside a chromadepth band might be a generally good pattern: lets melodic content tint the foreground without breaking the depth-from-color illusion.
