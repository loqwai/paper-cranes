# Line-Dance Shader Iteration Log
*Started: 2025-10-05*

## Initial Problem
User feedback: "blurry and ugly still", "looks too much like noise", "passable but not good"

## Iteration History

### V1 - Initial UV Distortion (FAILED)
- Added UV distortion: bassZScore * 0.01, spectralFluxZScore * 0.008
- Added dynamic thickness and glow based on zScore intensity
- Result: Too much distortion, created vertical streaking noise
- Screenshot: line-dance-redesign-v1.png

### V2 - Reduced Distortion (FAILED)
- Reduced distortion: bassZScore * 0.002, spectralFluxZScore * 0.0015
- Adjusted fade to 0.94
- Result: Still too noisy, lines not clear
- Screenshot: line-dance-redesign-v2.png

### V3 - No Distortion, Bold Lines (IMPROVED)
- Removed UV distortion entirely for clean scrolling
- Increased LINE_THICKNESS to 0.020 (thicker lines)
- Added shimmer effect: sin(time * 3.0 + value * 10.0) * intensity * 0.15
- Dynamic thickness pulses with intensity
- Result: Cleaner but still dim
- Screenshots: line-dance-v3-bold.png, line-dance-v3-evolution.png

### V4 - Brightness Boost (IMPROVED BUT SHORT TRAILS)
- Increased brightness: line * 3.5 + glow * shimmer * 1.5
- Increased fade retention to 0.97 (longer trails)
- Added intensity multiplier: (1.0 + intensity * 0.5)
- Result: Distinct colored lines but only visible on right 5% of screen
- User feedback: "line graph is only visible for the first say 5% on the right!"
- Screenshots: line-dance-v4-brighter.png, line-dance-v4-trails.png

### V5 - Slow Fade for Full Screen (SUCCESS!)
- Changed fade from 0.97 to 0.995 (much slower)
- Result: Lines now visible across FULL screen
- Clear crossing patterns showing musical structure
- Distinct colors: red (energy), yellow (centroid), orange (mids), blue (bass), cyan (spread), magenta (flux)
- Intensity peaks clearly visible
- Good temporal history
- Screenshots: line-dance-v5-slowfade.png, line-dance-v5-fullscreen.png

## Current Status - V5
✅ Lines visible across entire screen
✅ Distinct colors clearly separated
✅ Crossing patterns show musical complexity
✅ Dynamic glow shows intensity changes
✅ Temporal evolution visible in trails
✅ Beautiful and representative of audio features

## Key Technical Learnings
1. UV distortion creates noise - avoid entirely for this style
2. Thick lines (0.020) essential for clarity
3. High brightness (3.5x line, 1.5x glow) required for visibility
4. CRITICAL: Fade rate determines trail length
   - 0.92-0.97 = trails disappear in 5% of screen
   - 0.995 = trails persist across full screen width
5. zScore-based intensity perfectly shows musical peaks

## Implementation Details - V5
```glsl
#define LINE_THICKNESS 0.020
Fade: prev * 0.995
Brightness: color * (line * 3.5 + glow * shimmer * 1.5) * (1.0 + intensity * 0.5)
Shimmer: 1.0 + sin(time * 3.0 + value * 10.0) * intensity * 0.15
Intensity: zScore * 0.5 + 0.5 (normalized to 0-1)
```

## Audio Feature Mapping
- Cyan (spectral spread) - harmonic width
- Magenta (spectral flux) - timbral change
- Orange (mids) - body/warmth
- Blue (bass) - low frequency foundation
- Yellow (spectral centroid) - brightness/pitch
- Red (energy) - overall dynamics

## Success Criteria Met
✓ Visual-audio mapping is obvious
✓ Shows musical structure clearly
✓ Aesthetically beautiful with vibrant colors
✓ Lines cross and weave dynamically
✓ Full screen coverage shows temporal evolution
✓ Ready for demo video

## Next Steps
- Create video recording to verify musical responsiveness
- Test with looping song to verify pattern repetition
- Consider subtle enhancements (chromatic aberration, etc.)
