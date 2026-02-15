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

Each feature has 11 statistical variations:
- **Current value** (e.g., `bass`)
- **Normalized** (0-1 range, e.g., `bassNormalized`)
- **Mean** (historical average)
- **Median** (historical median)
- **Min/Max** (historical range)
- **StandardDeviation** (variability)
- **ZScore** (-1 to 1, for detecting anomalies/drops)
- **Slope** (linear regression slope over history window — is the feature rising or falling?)
- **Intercept** (predicted value at start of history window)
- **RSquared** (0-1, how well a linear trend fits — 1.0 = perfect trend, 0 = no trend)

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

### Statistical Variations (11 per feature)

Each audio feature provides 11 statistical variations calculated over a rolling window (default 500 frames):

1. **value** - Raw current value from the analyzer
2. **normalized** - Min-max normalized to 0-1 range (relative to history)
3. **mean** - Historical average (baseline character)
4. **median** - Historical median (robust center)
5. **min** - Historical minimum (lower bound)
6. **max** - Historical maximum (upper bound)
7. **standardDeviation** - Variability measure
8. **zScore** - Standardized score: `(value - mean) / (stdDev * 2.5)` → roughly -1 to 1
9. **slope** - Linear regression slope over history window (rate of change of the trend)
10. **intercept** - Y-intercept of the regression line (predicted value at window start)
11. **rSquared** - Coefficient of determination (0-1, how well a linear trend fits the data)

### When to Use Each Statistical Variation

- **zScore**: Detect anomalies, drops, spikes - "is this unusual?"
- **normalized**: Smooth 0-1 modulation - "where in the range?"
- **mean/median**: Baseline behavior, slow changes - "what's the average character?"
- **min/max**: Historical context - "what are the extremes?"
- **standardDeviation**: Detect stability vs volatility
- **slope**: Detect trends - "is this feature rising or falling over time?" Positive = rising, negative = falling
- **intercept**: Predict baseline - "where was this feature heading from?" Useful with slope for extrapolation
- **rSquared**: Detect confidence in trends - "is the change steady or chaotic?" High rSquared + high slope = confident build/drop
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

#### Trend Detection with Linear Regression
```glsl
// Slope tells you WHERE the music is heading
#define BASS_RISING (bassSlope > 0.0)
#define ENERGY_TREND (energySlope)           // Positive = building, negative = dropping
#define BRIGHTNESS_TREND (spectralCentroidSlope)  // Rising = getting brighter

// rSquared tells you HOW CONFIDENT that trend is
#define TREND_CONFIDENCE (energyRSquared)     // 1.0 = steady build/drop, 0.0 = chaotic
#define STEADY_BUILD (energySlope > 0.0 && energyRSquared > 0.5)  // Confident build-up

// Combine slope + rSquared for musical awareness
#define CONFIDENT_RISE(feature) (feature##Slope * feature##RSquared)
// High when rising steadily, low when chaotic or falling

// Intercept provides the trend's baseline
#define PREDICTED_BASELINE (energyIntercept)  // Where the trend started from
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

> **Full tutorial:** See [docs/MAKING_A_NEW_SHADER.md](docs/MAKING_A_NEW_SHADER.md) for the complete guide including utility functions, design patterns, and common pitfalls.

### Shader Structure
```glsl
// Use #define for audio-reactive parameters
#define CIRCLE_RADIUS (spectralCentroidZScore)
#define COLOR_SHIFT (bassNormalized * 0.5)

// In main code
vec3 position = vec3(CIRCLE_RADIUS, 0.1, 0.1);
```

### Available Uniforms
- `seed` - Persistent per-user random float (0-1), stored in localStorage. Override with `?seed=0.42`
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

### The #define Swap Pattern (Recommended)

Use `#define` to alias audio parameters so you can easily swap between audio-reactive and constant values during development:

```glsl
// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Active: audio-reactive
#define SCALE_MOD (-spectralEntropyZScore * 0.08)
// #define SCALE_MOD 0.0

// Active: audio-reactive
#define HUE_SHIFT (pitchClassNormalized * 0.3)
// #define HUE_SHIFT 0.0

// Active: constant (for testing)
// #define BRIGHTNESS (1.0 + bassZScore * 0.12)
#define BRIGHTNESS 1.0
```

**Benefits:**
- Comment/uncomment to switch between audio and static
- Test visuals without audio enabled (`?noaudio=true`)
- Tune constant values before mapping to audio
- Keep audio mapping documentation inline with the code

### Switching to Knob Mode
Replace audio features with knob controls:
```glsl
// Audio mode
#define PARAM (spectralFluxZScore)

// Knob mode
#define PARAM (knob_71)
```

### URL Parameters as Uniforms

Any numeric query parameter automatically becomes a float uniform:

```
?shader=my-shader&my_param=0.5&another=1.2
```

These are available in your shader as:
```glsl
// Automatically injected as uniforms
uniform float my_param;  // = 0.5
uniform float another;   // = 1.2
```

**Note:** Only numeric values work. Known params (`shader`, `noaudio`, `fft_size`, etc.) and `knob_*` params are excluded.

## Query Parameters

### Core Parameters
- `shader` - Shader file to load (e.g., `?shader=star`)
- `fft_size` - FFT window size (default: 4096)
- `smoothing` - Smoothing factor (default: 0.15)
- `history_size` - Statistical history buffer (default: 500)
- `noaudio` - Disable audio input (for testing)
- `embed` - Embed mode (disables audio)
- `fullscreen` - Start in fullscreen
- `remote` - Remote mode: `display` (receive commands) or `control` (send commands)

### Dynamic Override
All parameters can be overridden at runtime via:
```javascript
window.cranes.manualFeatures.smoothing = 0.2
window.cranes.manualFeatures.fft_size = 8192
```

## Remote Control Mode

The system supports controlling a remote display from another device (phone, laptop, etc.) via WebSocket.

### Setup
1. Start the dev server with WebSocket support: `npm run dev`
2. Open the **display** (TV/projector): `http://localhost:6969/?remote=display`
3. Open the **controller** (phone/laptop):
   - List page: `http://localhost:6969/list.html?remote=control`
   - Edit page: `http://localhost:6969/edit.html?remote=control`

### How It Works
- **Display mode** (`?remote=display`): Listens for commands via WebSocket
- **Control mode** (`?remote=control`): Sends commands to all connected displays

### List Page Remote Control
- Tapping a shader sends it to all connected displays
- Fullscreen button sends shader with fullscreen flag

### Edit Page Remote Control
- Saving shader code sends it to all connected displays in real-time
- Knob/slider changes are synced to displays automatically
- Shows connection status indicator (green = connected, displays count)

### Architecture
```
Controller (edit.html?remote=control)
    ↓ WebSocket
Dev Server (esbuild.dev.js WebSocket server)
    ↓ Broadcast
Display (index.html?remote=display)
```

### ParamsManager
The `ParamsManager` (`src/params/ParamsManager.js`) is the unified system for handling all shader parameters:
- Single source of truth for knobs, settings, and shader code
- Automatically syncs to URL (debounced)
- Automatically syncs to remote displays (when in control mode)
- Maintains compatibility with `window.cranes.manualFeatures`

```javascript
// Usage in edit.js
const paramsManager = createParamsManager({
    syncToUrl: true,
    remoteMode: true,  // Enable WebSocket sync
})

paramsManager.set('knob_71', 0.5)  // Syncs to URL + remote
paramsManager.setShader(code)      // Syncs shader to remote
```

## File Structure
```
/
├── src/
│   ├── audio/
│   │   ├── AudioProcessor.js    # Main audio processing
│   │   ├── WorkerRPC.js        # Worker communication
│   │   └── analyzer.js         # Worker analyzer loader
│   ├── params/
│   │   └── ParamsManager.js    # Unified params (URL, remote, features)
│   ├── remote/
│   │   ├── RemoteController.js # Sends commands to displays
│   │   ├── RemoteDisplay.js    # Receives commands from controllers
│   │   └── WebSocketClient.js  # WebSocket client wrapper
│   ├── Visualizer.js           # WebGL rendering
│   ├── shaderLoader.js         # Centralized shader loading
│   └── shader-transformers/     # Shader preprocessing
├── shaders/                     # GLSL visualization shaders
│   ├── wip/claude/             # Claude-created shaders go here
│   ├── plasma.frag
│   └── melted-satin/2.frag
├── index.js                     # Main entry point
├── edit.js                      # Editor interface
├── list.js                      # Shader list/gallery page
└── esbuild.dev.js              # Build configuration (includes WebSocket server)
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

## Claude-Specific Instructions

### Where to Put Your Shaders
**Always create shaders in `shaders/wip/claude/`**

```bash
shaders/wip/claude/my-shader.frag      # Good
shaders/wip/claude/experiment-1.frag   # Good
shaders/my-shader.frag                  # Bad - don't put in root
```

The `wip/` directory is filtered from the mobile list by default, so experimental shaders won't clutter the production list.

### Shader Metadata System
Add metadata comments at the top of shader files to control list page behavior:

```glsl
// @fullscreen: true    // Shader handles non-square aspect ratios well
// @mobile: true        // Shader performs well on mobile devices
// @favorite: true      // Show in favorites filter
// @tags: rave, ambient // Comma-separated tags
#version 300 es
precision highp float;
...
```

**Metadata tags:**
- `@fullscreen: true/false` - Shader handles non-square aspect ratios. When `true`, the shader **automatically stretches to fill the screen** without needing `?fullscreen=true` in the URL.
- `@mobile: true/false` - Is shader performant on mobile?
- `@favorite: true` - Mark as a favorite for quick access
- `@tags: tag1, tag2` - Categorization tags

Metadata is extracted at build time and included in `dist/shaders.json`.

**Important:** The `@fullscreen: true` metadata is the recommended way to enable fullscreen for shaders that support non-square viewports. It works in both normal mode and remote display mode.

### List Page Features
The list page (`/list.html`) has:
- **Tap-to-copy-and-navigate**: Tapping a shader copies the fullscreen URL and navigates to it
- **Favorites filter**: Toggle to show only `@favorite: true` shaders
- **Fullscreen filter**: Toggle to hide `@fullscreen: false` shaders
- **Search**: Filter shaders by name or preset parameters

### Good Example Shaders to Study
Look at these for reference:
- `melted-satin/1.frag` - #define swap pattern, frame feedback, HSL manipulation
- `wip/chromatic-flow.frag` - Mobile-optimized raymarching, #define pattern, zoom camera
- `plasma.frag` - Simple but effective
- `subtronics.frag` - Image-based with audio modulation
- `redaphid/zebra/tie-dye.frag` - Complex knob-based control

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
`?shader=plasma&fft_size=2048&smoothing=0.3`

### Ultra-smooth (more latency)
`?shader=plasma&fft_size=8192&smoothing=0.08`

### Balanced (default)
`?shader=plasma&fft_size=4096&smoothing=0.15`

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

## Shader Validation

Use the CLI to validate shader syntax before committing:
```bash
node scripts/validate-shader.js shaders/wip/claude/my-shader.frag
```

This will check for:
- GLSL syntax errors
- Missing required uniforms
- Common mistakes

## Mobile Optimization for Raymarching Shaders

Raymarching (fractals, SDFs) is expensive. Use these limits for mobile:

| Parameter | Desktop | Mobile |
|-----------|---------|--------|
| Raymarch steps | 100+ | 50 max |
| Fractal iterations | 15+ | 8 max |
| Surface threshold | 0.0005 | 0.002 |
| Max distance | 30+ | 20 |
| Normal epsilon | 0.0005 | 0.003 |

**Expensive operations to avoid/simplify on mobile:**
- Soft shadows (32 iterations) → remove or use 1-sample hack
- Ambient occlusion (5 samples) → reduce to 2 samples
- Multiple specular lights → single light
- High-precision normals → larger epsilon

**Example cheap AO (2 samples instead of 5):**
```glsl
float cheapAO(vec3 p, vec3 n) {
    float d1 = sdf(p + n * 0.1);
    float d2 = sdf(p + n * 0.3);
    return clamp(0.5 + (d1 + d2) * 2.0, 0.0, 1.0);
}
```

## Camera Movement Patterns

### Lateral Movement (drifting left/right/up/down)
```glsl
vec3 camOffset = vec3(
    spectralCentroidZScore * 0.04,  // X: left/right
    midsZScore * 0.02,               // Y: up/down
    0.0
);
vec3 ro = basePosition + camOffset;
```

### Zoom Effect (push in/pull out)
Move along the view direction, not world axes:
```glsl
vec3 toTarget = normalize(lookAt - baseRo);
float zoomAmount = spectralFluxZScore * 0.15;
vec3 ro = baseRo + toTarget * zoomAmount;  // Moves toward/away from target
```

### FOV Zoom (feels like zooming without moving)
```glsl
float fov = 1.8 * (1.0 - energyZScore * 0.1);  // Lower = zoomed in
vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);
```

## Common Shader Mistakes to Avoid

1. **Dividing by zero**: Always add small epsilon `max(value, 0.001)`
2. **White-out on loud audio**: Clamp values `clamp(intensity, 0.0, 1.0)`
3. **Not handling aspect ratio**: Use `uv.x *= iResolution.x / iResolution.y` for non-square viewports
4. **Too much feedback**: `mix(prev, new, 0.1)` can accumulate to white - use `mix(prev * 0.99, new, 0.1)`
5. **Hardcoded resolution**: Always use `iResolution`, never hardcode 1920x1080
6. **Metadata before #version**: If your shader has `#version 300 es`, it MUST be the first line. Put metadata comments (`// @fullscreen: true`) on line 2, not line 1. Shaders without `#version` (ShaderToy-style) can have metadata on line 1.

## Misc Notes
- Use far less time when running sleep than you ordinarily would; if it were 5 seconds, do 1 instead.