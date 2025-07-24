# 🦇🌙 Vampire Rave Testing System

A comprehensive testing system for shaders that simulates audio-reactive behavior through musical parameter animations.

## Overview

This system allows you to test shaders with pre-defined musical sequences that simulate real audio features like bass, kick detection, melodic content, and more. Screenshots are captured with a dramatic "vampire rave" naming convention that tells a story with each frame.

## Key Components

### 1. Audio Feature Mappings
Each shader now includes audio-meaningful #defines:
```glsl
#define BASS_INTENSITY knob_1        // 0-1, low frequency power
#define KICK_DETECTION knob_2        // 0-1, kick drum transients
#define MID_PRESENCE knob_3          // 0-1, melodic content
#define HIGH_SPARKLE knob_4          // 0-1, hi-hat energy
// ... and more
```

### 2. Musical Sequences
Pre-defined test sequences in `scripts/test/musical-sequences.js`:
- **the-drop**: Classic EDM buildup and drop
- **vampire-waltz**: Gothic 3/4 time signature
- **melodic-journey**: Progressive house emotional peaks
- **techno-hammer**: Relentless industrial techno
- **ambient-drift**: Slow evolving textures
- **drum-and-bass-rush**: Fast 174 BPM breaks

### 3. Screenshot Naming
Files use vampire-themed emoji separators:
```
2025-01-24T12:34:56.789Z🦇🌙bass🩸0.8🪦kick🩸1.0🪦energy🩸0.7.jpg
```
- 🦇🌙 = Time transforms into the night
- 🩸 = Parameter drinks its value (like blood)
- 🪦 = Tombstones separate parameters

### 4. Test Runner
Run musical tests with:
```bash
node scripts/test/run-musical-tests.js

# Test specific shader
node scripts/test/run-musical-tests.js --shader tech_house_pulse

# Test specific sequence
node scripts/test/run-musical-tests.js --shader futuristic_combinator --sequence the-drop
```

### 5. Media Processing
- Automatic PNG → JPEG conversion
- Image resizing to 800x800 max
- esbuild plugin for automatic processing
- Screenshots served from `/screenshots/`

### 6. Film Strip Viewer
Enhanced viewer at `film-strip-viewer.html`:
- Video playback for each test session
- Parameter values on hover
- Musical context descriptions
- Timeline-based navigation

## Workflow

1. **Define Musical Behavior**: Update shader #defines to map audio features
2. **Run Tests**: Execute musical sequences on shaders
3. **Process Media**: Images are automatically resized and converted
4. **View Results**: Use film strip viewer to analyze animations
5. **Iterate**: Adjust parameters based on visual output

## File Structure
```
screenshots/
  {shader-name}/
    {session-id}/
      timeline.json         # Parameter animation data
      images/
        {vampire-named}.jpg # Screenshots at 5s intervals
      videos/
        capture.webm       # Full animation video
```

## Musical Theory

The system is designed around key concepts in electronic music visualization:

- **Bass** (20-250Hz): Controls size, scale, and foundation elements
- **Kick Detection**: Triggers shape explosions and pulses
- **Mids** (250Hz-4kHz): Drives color transitions and melodies
- **Highs** (4kHz+): Creates sparkles, rim lighting, and detail
- **Energy**: Overall intensity affecting saturation and brightness
- **Spectral Centroid**: Maps tonal brightness to visual brightness
- **BPM Sync**: Locks animations to musical tempo

## Example Usage

```javascript
// Create a custom sequence
const customSequence = {
    duration: 30000,
    description: "Custom bass-heavy pattern",
    musicalContext: "Emphasizes sub-bass with minimal highs",
    keyframes: [
        { time: 0, params: { bass: 0.2, kick: 0, energy: 0.3 } },
        { time: 0.5, params: { bass: 1.0, kick: 0.8, energy: 0.9 } },
        { time: 1, params: { bass: 0.2, kick: 0, energy: 0.3 } }
    ]
};
```

## Tips

1. **Screenshot at 5s intervals**: Captures key moments without overwhelming storage
2. **30-second sequences**: Long enough to show evolution, short enough to iterate quickly
3. **Use timeline.json**: Contains full parameter evolution data for analysis
4. **Watch the videos**: Best way to see smooth parameter transitions
5. **Check film strips**: Quick visual validation of parameter effects

The vampire's rave continues through the night, each frame a moment of digital ecstasy frozen in time! 🦇🎉