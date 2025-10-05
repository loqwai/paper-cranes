# Paper Cranes / Beadfamous - Music Visualization System

## Project Overview
A real-time browser-based music visualization system that:
- Performs advanced audio analysis from microphone input
- Drives GPU-accelerated WebGL visualizations 
- Controls LED lights through screen scraping
- Works on mobile devices
- Supports physical bead bracelets that link to specific visualizations

## Architecture

### Audio Processing Pipeline
```
Microphone → MediaStream → AudioContext → WindowNode (Hanning) → FFT Analyzer → Workers → Features → Shader
```

### Key Components

#### 1. AudioProcessor (`src/audio/AudioProcessor.js`)
- **FFT Size**: 4096 (optimized from 32768 for ~85ms latency)
- **Smoothing**: 0.15 exponential smoothing factor
- **Analyzer Smoothing**: 0.2 time constant
- Uses Web Workers for parallel feature extraction
- Extracts 15 audio features from hypnosound library

#### 2. WorkerRPC (`src/audio/WorkerRPC.js`)
- Manages worker communication with 30ms timeout
- Handles feature calculation in parallel
- Returns smoothed default values on timeout

#### 3. Visualizer (`src/Visualizer.js`)
- WebGL2 context with frame buffer ping-ponging
- Passes audio features as uniforms to shaders
- Supports previous frame access for feedback effects
- Dynamic resolution scaling for performance

## Audio Features Available

Each feature has 8 statistical variations:
- **Current value** (e.g., `bass`)
- **Normalized** (0-1 range, e.g., `bassNormalized`)
- **Mean** (historical average)
- **Median** (historical median)
- **Min/Max** (historical range)
- **StandardDeviation** (variability)
- **ZScore** (-1 to 1, for detecting anomalies/drops)

### Core Features:
- SpectralCentroid, SpectralFlux, SpectralSpread, SpectralRolloff
- SpectralRoughness, SpectralKurtosis, SpectralEntropy, SpectralCrest
- SpectralSkew, PitchClass
- Bass, Mids, Treble
- Energy
- Beat detection

## Audio Features Reference (Hypnosound)

### The 14 Core Features

| Feature | Range | Measures | Musical Meaning | Independence |
|---------|-------|----------|-----------------|--------------|
| **bass** | 0-1 | 0-400Hz energy | Low-end power | Independent from treble |
| **mids** | 0-1 | Mid-range energy | Body/warmth | Semi-independent |
| **treble** | 0-1 | High freq energy | Brightness/air | Independent from bass |
| **energy** | 0-1 | Total amplitude | Loudness | Correlates with bass |
| **pitchClass** | 0-1 | Note (0-11)/12 | Which note playing | Independent from timbre |
| **spectralCentroid** | 0-1+ | Center of mass | Brightness/pitch center | Semi-correlates with pitchClass |
| **spectralSpread** | 0-1+ | Frequency variance | Harmonic width | Independent from centroid |
| **spectralSkew** | varies | Distribution tilt | Dark vs bright tilt | Independent from spread |
| **spectralKurtosis** | 0-1 | Peakedness | Focus vs diffuse | Independent from skew |
| **spectralFlux** | 0-1+ | Rate of change | Timbral motion | Semi-correlates with energy |
| **spectralRolloff** | 0-1+ | High freq cutoff | Where highs die | Independent from others |
| **spectralRoughness** | 0-1+ | Dissonance | Grittiness/beating | Independent from pitch |
| **spectralEntropy** | 0-1+ | Unpredictability | Chaos vs order | Independent from most |
| **spectralCrest** | 0-1+ | Peak/mean ratio | Spiky vs smooth | Independent from others |

### Statistical Variations (8 per feature)

Each audio feature provides 8 statistical variations calculated over a rolling window (default 500 frames):

1. **value** - Raw current value from the analyzer
2. **normalized** - Min-max normalized to 0-1 range (relative to history)
3. **mean** - Historical average (baseline character)
4. **median** - Historical median (robust center)
5. **min** - Historical minimum (lower bound)
6. **max** - Historical maximum (upper bound)
7. **standardDeviation** - Variability measure
8. **zScore** - Standardized score: `(value - mean) / (stdDev * 2.5)` → roughly -1 to 1

### When to Use Each Statistical Variation

- **zScore**: Detect anomalies, drops, spikes - "is this unusual?"
- **normalized**: Smooth 0-1 modulation - "where in the range?"
- **mean/median**: Baseline behavior, slow changes - "what's the average character?"
- **min/max**: Historical context - "what are the extremes?"
- **standardDeviation**: Detect stability vs volatility
- **value**: Raw analysis (less common in shaders)

### Feature Independence Matrix

**Highly Covariant (avoid pairing):**
- `energy` + `bass` (both increase with loud low frequencies)
- `energy` + `spectralFlux` (big changes often involve energy changes)
- `spectralCentroid` + `pitchClass` (both relate to pitch)
- `spectralSpread` + `spectralKurtosis` (both describe distribution shape)
- `spectralSpread` + `spectralEntropy` (wider often means more complex)

**Independent Pairings (good for variety):**
- `bass` vs `treble` (opposite frequency ranges)
- `spectralCentroid` vs `spectralRoughness` (pitch center vs dissonance)
- `spectralEntropy` vs `spectralCrest` (chaos vs peakiness)
- `spectralFlux` vs `spectralRolloff` (change rate vs cutoff)
- `spectralSkew` vs `energy` (harmonic tilt vs loudness)
- `pitchClass` vs `spectralKurtosis` (pitch vs distribution shape)

### Feature Domains (for choosing independent features)

Group features by domain and pick from DIFFERENT domains for variety:

**Frequency Bands:**
- `bass`, `mids`, `treble` (0-400Hz, mid-range, high freq)

**Spectral Shape:**
- `spectralCentroid` (center), `spectralSpread` (width)
- `spectralSkew` (tilt), `spectralKurtosis` (peakedness)

**Spectral Quality:**
- `spectralRoughness` (dissonance), `spectralEntropy` (chaos), `spectralCrest` (peakiness)

**Temporal:**
- `spectralFlux` (rate of change)

**Tonal:**
- `pitchClass` (which note), `spectralRolloff` (harmonic cutoff)

**Energy:**
- `energy` (total loudness)

### Shader Design Patterns

#### Simple Frequency Reactivity
```glsl
// Respond to different frequency bands
#define LOW_ENERGY (bassNormalized)
#define MID_ENERGY (midsNormalized)
#define HIGH_ENERGY (trebleNormalized)
```

#### Complex Timbral Analysis
```glsl
// Respond to spectral characteristics
#define BRIGHTNESS (spectralCentroidNormalized)
#define HARMONIC_WIDTH (spectralSpreadNormalized)
#define DISSONANCE (spectralRoughnessNormalized)
#define CHAOS (spectralEntropyNormalized)
```

#### Musical Structure Detection
```glsl
// Detect drops, builds, transitions
#define IS_DROP (energyZScore > 0.5)
#define IS_BUILDING (spectralFluxZScore > 0.3)
#define TIMBRAL_SHIFT (spectralFluxZScore)
```

#### Creating Visual Variety
```glsl
// Choose independent features from different domains
#define RIBBON_1 (bassZScore)           // Frequency domain
#define RIBBON_2 (trebleZScore)          // Frequency domain (opposite)
#define RIBBON_3 (spectralCentroidNormalized)  // Spectral shape
#define RIBBON_4 (spectralKurtosisZScore)      // Spectral shape (different aspect)
#define RIBBON_5 (spectralRoughnessNormalized) // Spectral quality
#define RIBBON_6 (pitchClassNormalized)        // Tonal
```

## Performance Optimizations

### Latency Reduction (from ~1000ms to ~100ms)
1. **FFT Size**: Reduced from 16384 to 4096 
   - Query param: `?fft_size=4096`
2. **Smoothing**: Reduced from 0.8 to 0.05-0.2
   - Query param: `?smoothing=0.15`
3. **Worker Timeout**: Optimized to 30ms

### Jitter Reduction
- Exponential smoothing on all features
- Different smoothing factors for z-scores vs raw values
- Smart initialization to prevent jumps

### Browser-Specific Fixes
- Firefox: Automatic microphone reconnection every 5 seconds
- Chrome: Proper async initialization of audio worklet

## Shader Development

### Shader Structure
```glsl
// Use #define for audio-reactive parameters
#define CIRCLE_RADIUS (spectralCentroidZScore)
#define COLOR_SHIFT (bassNormalized * 0.5)

// In main code
vec3 position = vec3(CIRCLE_RADIUS, 0.1, 0.1);
```

### Available Uniforms
- All audio features (see above)
- `iTime` - Time in seconds
- `iResolution` - Screen resolution
- `iFrame` - Frame number
- `iChannel0-3` - Texture samplers
- `beat` - Boolean beat detection

### Utility Functions
- `rgb2hsl(vec3)` / `hsl2rgb(vec3)` - Color space conversion
- `getLastFrameColor(vec2 uv)` - Previous frame access

### Best Practices
1. Use z-scores for detecting drops/beats
2. Use normalized values for smooth modulation
3. Use mean/median for baseline behavior
4. Avoid divide-by-zero and white-out
5. Center visuals in viewport
6. Maintain 60fps on mobile

## Knob/MIDI Control System

### Available Knobs
- `knob_3` to `knob_11`
- `knob_14` to `knob_22`
- `knob_30` to `knob_37`
- `knob_40`, `knob_41`
- `knob_43` to `knob_47`
- `knob_60`
- `knob_71` to `knob_79`

### Switching to Knob Mode
Replace audio features with knob controls:
```glsl
// Audio mode
#define PARAM (spectralFluxZScore)

// Knob mode  
#define PARAM (knob_71)
```

## Query Parameters

### Core Parameters
- `shader` - Shader file to load (e.g., `?shader=star`)
- `fft_size` - FFT window size (default: 4096)
- `smoothing` - Smoothing factor (default: 0.15)
- `history_size` - Statistical history buffer (default: 500)
- `noaudio` - Disable audio input (for testing)
- `embed` - Embed mode (disables audio)
- `fullscreen` - Start in fullscreen

### Dynamic Override
All parameters can be overridden at runtime via:
```javascript
window.cranes.manualFeatures.smoothing = 0.2
window.cranes.manualFeatures.fft_size = 8192
```

## File Structure
```
/
├── src/
│   ├── audio/
│   │   ├── AudioProcessor.js    # Main audio processing
│   │   ├── WorkerRPC.js        # Worker communication
│   │   └── analyzer.js         # Worker analyzer loader
│   ├── Visualizer.js           # WebGL rendering
│   └── shader-transformers/     # Shader preprocessing
├── shaders/                     # GLSL visualization shaders
│   ├── star.frag
│   ├── plasma.frag
│   └── graph/drop-detector/paint.frag
├── index.js                     # Main entry point
├── edit.js                      # Editor interface
└── esbuild.dev.js              # Build configuration
```

## Development Workflow

### Local Development
```bash
npm install
npm run dev  # Serves on localhost:6969
```

### Creating Visualizations
1. Create new `.frag` file in `shaders/`
2. Access via `?shader=filename` (without .frag)
3. Use audio features as uniforms
4. Test with different music styles

### Deployment
- Auto-deploys to visuals.beadfamous.com
- PRs to `shaders/<github-username>/` auto-merge
- No backend required (static hosting)

## Code Style Guidelines
- Use arrow functions
- Early returns (single line when possible)
- No semicolons
- Latest ECMAScript features
- Follow .eslintrc configuration

## Common Issues & Solutions

### Audio Not Working
1. Check microphone permissions
2. Ensure not muted in OS
3. Try `?noaudio=false` explicitly
4. Check browser console for worker errors

### Visualization Stuttering
1. Reduce FFT size: `?fft_size=2048`
2. Increase smoothing: `?smoothing=0.25`
3. Check GPU performance in dev tools

### Graph Showing Solid Color
- Audio features not flowing (check workers)
- NaN/undefined values (check console)
- Missing audio input (check permissions)

## Testing Different Configurations

### Ultra-responsive (more jittery)
`?shader=star&fft_size=2048&smoothing=0.3`

### Ultra-smooth (more latency)
`?shader=star&fft_size=8192&smoothing=0.08`

### Balanced (default)
`?shader=star&fft_size=4096&smoothing=0.15`

## Advanced Topics

### Frame Feedback Effects
```glsl
vec4 prev = getLastFrameColor(uv + offset);
fragColor = mix(prev, newColor, 0.1);
```

### Beat-Reactive Transitions
```glsl
if (beat) {
    // Instant change on beat
    color = vec3(1.0, 0.0, 0.0);
} else {
    // Smooth transition
    color = mix(oldColor, targetColor, 0.1);
}
```

### Multi-Feature Correlation
```glsl
// Combine multiple features for complex behavior
float intensity = bassNormalized * energyZScore;
float complexity = spectralEntropyNormalized * spectralFluxZScore;
```

## Key Insights for AI/LLM Development

1. **Audio-Visual Latency**: The system prioritizes low latency (~100ms) over perfect smoothness. This is critical for live performance.

2. **Statistical Context**: Z-scores and historical statistics provide semantic meaning to raw audio data, enabling musically-aware visualizations.

3. **Performance Balance**: Every optimization involves tradeoffs between latency, smoothness, and computational load.

4. **Browser Differences**: Firefox and Chrome handle Web Audio differently, requiring browser-specific mitigations.

5. **Worker Architecture**: Parallel processing via Web Workers is essential for real-time performance with 15+ audio features.

6. **Shader Philosophy**: Shaders should be artistic, reactive, and performant - avoiding dead zones while maintaining visual coherence.
- use far less time when running sleep than you ordinarily would; If it were 5 seconds, do 1 instead.