# the-coat-2 — Fully Audio-Reactive Dubstep Daddy

## Origin

Forked from `the-coat-fur-coat-reactive.frag` on 2026-04-14. That shader had 28 knobs for manual control during live sessions. This variant bakes in the personality learned from 6+ preset sessions (lost-lands, closeup-texture, full-send, wooli-drop, wide-blaze, living-coat, golden-wash, griz-sizzle, and others) so it plays well with any music — no knobs needed.

Named after a GRiZ Lost Lands set that was playing during the jam session that inspired this fork.

## Design Philosophy

**The coat is the star, not the eyes.** The living-coat preset was the most striking discovery: eyes and god rays OFF, fur fibers going wild from spectral entropy. The coat *dances* when the music is harmonically complex. This shader makes that the default behavior — the fractal fur fibers have a lower trigger threshold and are visible during most non-silent passages.

**Drops are spectacle, texture is substance.** Eyes + rays + zoom punch on energy drops (wooli-drop personality), but during sustained passages the coat texture, color warmth, and body movement carry the visual.

**Different audio features drive different visual layers:**
- Bass = body (pump, chest breathing, shoulder shrug, fur puff)
- Treble = gesture (snap, sleeve flare, god ray bloom)
- Mids = groove (sway, body movement)
- Energy = global state (zoom, eye wash, drop detection, fur thickness)
- Spectral entropy + roughness = coat texture (fractal fur fibers)
- Spectral centroid = color brightness + warp speed
- Spectral flux = rim light + gleam + warp agitation
- Pitch class = hue shift (subtle, different notes tint the palette)

## Key Parameter Choices and Why

### Zoom
```glsl
#define BASE_ZOOM (1.0 + energyNormalized * 0.4)
```
Previous: static 1.0 with knob override. Now breathes with energy — quiet passages show the full figure, loud passages push in slightly. Range 1.0-1.4 is subtle enough not to be nauseating.

### God Rays
```glsl
#define GODRAY_INTENSITY (1.0 + clamp(trebleZScore, 0.0, 1.5) * 2.0 + spectralFluxNormalized * 1.5)
```
Insight from ray-bloom preset: during buildups, treble and centroid rise together. Rays should grow with brightness. Added flux component so timbral changes also make rays flicker. Base of 1.0 means there's always a hint of rays (unlike the knob version which could be 0).

### Eye Wash
```glsl
#define EYE_WASH_STRENGTH (energyNormalized * 0.5 + clamp(energyZScore, 0.0, 1.0) * 0.3)
```
Golden-wash preset insight: eye wash at 0.945 during sustained high energy was beautiful. This isn't just a drop effect — it's a sustained energy glow. The normalized component gives a warm baseline proportional to loudness, the zScore component adds extra on spikes.

### Fractal Fur Trigger
```glsl
#define FUR_TRIGGER clamp(spectralEntropyNormalized * 0.7 + spectralRoughnessNormalized * 0.5 + clamp(spectralKurtosisZScore, 0.0, 1.0) * 0.2, 0.0, 1.0)
```
Living-coat preset: entropy 0.927 + roughness 0.757 made the fibers go absolutely wild. Weights bumped from 0.6/0.4 to 0.7/0.5 so the fibers appear at a lower audio complexity threshold. The coat should be alive during most non-silent music.

### Drop Detection
```glsl
#define IS_DROP clamp(BUILD + smoothstep(0.6, 1.0, energyZScore) * 0.5, 0.0, 1.0)
```
Added an energy z-score component on top of the slope-based BUILD signal. The original only detected confident trends (slope * rSquared), which misses sudden spikes. Now a sudden loud moment (energyZScore > 0.6) also triggers partial drop state.

### Hue
```glsl
#define HUE_BASE (0.78 + pitchClassNormalized * 0.15)
```
New: pitch class modulates the base hue. Different notes in the music shift the color palette slightly. Range of 0.15 is subtle — won't swing wildly, but you'll notice the coat tint track the melodic content.

### Pump
```glsl
#define PUMP (bassNormalized * 0.6 + clamp(bassSlope * bassRSquared, 0.0, 0.5) * 3.0)
```
Increased bass coefficient from 0.5 to 0.6 — presets consistently had pump at 0.6+ (living-coat: 0.669, wide-blaze: 0.669, wooli-drop: 0.669). The body should bounce harder with bass.

## What to Tweak

If the shader feels too busy: lower `FUR_TRIGGER` weights (back toward 0.6/0.4) and reduce `GODRAY_INTENSITY` base from 1.0 to 0.5.

If drops don't punch hard enough: increase `DROP_ZOOM` from 0.9 to 1.2, increase `SUSTAIN_GAIN` from 1.2 to 1.5.

If the color feels too static: increase pitch class range from 0.15 to 0.3, or add spectralCentroid to the hue calculation.

If the coat isn't textured enough: lower the `smoothstep(0.3, 0.7, fur_trigger)` threshold in mainImage (line ~590) to `smoothstep(0.15, 0.5, fur_trigger)`.
