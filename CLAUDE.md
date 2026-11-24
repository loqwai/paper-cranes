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
- **Smoothing**: the EMA weight on each new worker value (`?smoothing=`; default 0.15 for both the mic and `audio_file`). Higher is more responsive and more jittery; lower is smoother and later. `*Normalized`/`*ZScore` use 1.5x that weight, capped at 1
- **Analyzer Smoothing**: 0.4 `smoothingTimeConstant`
- **Onsets**: `OnsetProcessor` reads the raw spectrum every display frame, outside the workers and the EMA, and publishes `onsetKick`/`Snare`/`Hat`/`Full` plus `Trigger`, `Strength` and `Age`. Its detector is hypnosound's `makeOnsetDetector`/`makeOnsetEnvelope` (2.1.0 on). It counts frames, so triggers misfire more on 120/144 Hz displays. See [docs/onset-detection.md](docs/onset-detection.md)
- Uses Web Workers for parallel feature extraction
- Extracts 16 audio features from hypnosound 2.1.0. The browser loads it from esm.sh, pinned in `src/audio/analyzer.js` (workers) and the `vite.config.js` `hypnosound` alias (main thread). Bump both pins and `package.json` together; a mismatch once left the main thread on 1.10.2 while the workers ran 1.14.0

#### 2. WorkerRPC (`src/audio/WorkerRPC.js`)
- One worker per feature, fire-and-forget: each frame posts the FFT, and `getResult()` returns the latest reply
- No timeout: a slow or dead worker leaves its last value in place
- Replaces any non-finite stat with 0 before it reaches the shader

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
- Energy, Rms, Dbfs
- Beat detection (`beat`: `spectralFlux` zScore above 0.9; never true while the history is flat, as in silence)

## Audio Features Reference (Hypnosound)

### The Core Features (16)

| Feature | Range | Measures | Musical Meaning | Independence |
|---------|-------|----------|-----------------|--------------|
| **bass** | 0-1 | 0-400Hz energy | Low-end power | Independent from treble |
| **mids** | 0-1 | Mid-range energy | Body/warmth | Semi-independent |
| **treble** | 0-1 | High freq energy | Brightness/air | Independent from bass |
| **energy** | 0-1 | Total amplitude | Loudness | Correlates with bass |
| **rms** | 0-1 | Root mean square of the spectrum | Loudness | Correlates with energy |
| **dbfs** | 0-1 | rms in dB, -100..0 dB mapped to 0..1 | Perceived loudness | Correlates with energy |
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
4. **median** - Historical median (robust center). Exact from hypnosound 2.1.0; before that it was wrong on most frames once the window filled
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
2. **Smoothing**: `?smoothing=0.15` (mic default) is the weight on the newest value, so raising it cuts lag and adds jitter
3. **No worker wait**: features come from each worker's latest reply; nothing awaits a round trip

### Jitter Reduction
- Exponential smoothing on all features
- Different smoothing factors for z-scores vs raw values
- Smart initialization to prevent jumps

### Browser-Specific Fixes
- Mic watchdog (`src/audio/micWatchdog.js`): resumes a suspended AudioContext and re-acquires an ended or frozen mic; `?debug_audio=true` shows its state
- Chrome: Proper async initialization of audio worklet

## Shader Development

> **Full tutorial:** See [docs/MAKING_A_NEW_SHADER.md](docs/MAKING_A_NEW_SHADER.md) for the complete guide including utility functions, design patterns, and common pitfalls.
>
> **Advanced techniques:** See [docs/advanced-shader-techniques.md](docs/advanced-shader-techniques.md) for the hard-won stuff — signal conditioning (the iris/1 discipline: smoothed features, monotonic phases, rate-not-angle, quietGate), discontinuity fixes (fract-wrap windowing, no transients in phases), making ChromaDepth POP (and the hue-locked-to-depth + no-averaging rules), bass-you-can-feel, drag/pinch navigation (pan units, per-area rotation inverts the axis, "no idle pan"), breaking tiling (incommensurate domain warp seeded by slow audio), per-device seeds, spatial paths/landmarks, and the screenshot/feature-injection verification workflow.

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
- `onsetKick`, `onsetSnare`, `onsetHat`, `onsetFull` (plus `…Trigger`, `…Strength`, `…Age`) - onset envelopes from hypnosound's `makeOnsetDetector`/`makeOnsetEnvelope`. See [docs/onset-detection.md](docs/onset-detection.md)

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

## Controllers (JavaScript Companions to Shaders)

Controllers are JavaScript modules (`controllers/*.js`) that run once per frame with persistent state. They fill gaps GLSL can't: exponential decay, accumulators, state machines, double-precision math. Loaded via `?controller=<name>`. **Default to shader logic** — only use a controller when the shader literally cannot hold the state you need. Controller outputs become shader uniforms (must be explicitly declared with `uniform float`). See [docs/controllers.md](docs/controllers.md) for the full guide.

**Chaining (repeat `?controller=`):** controllers run as a **left-fold pipeline** (`src/controllerChain.js`). Each gets `{ ...base features, ...everything earlier stages added this frame }` and returns the features it adds; **URL order = pipeline order, last wins on key clash**; a cross-cutting controller (smoother/recorder/clamp) goes **last**. NOT deduped — each `?controller=` is its own stage with its own `make()`/state (so a controller listed twice runs twice, and one that attaches global listeners does so once per instance). `make()` may be `async` (awaited before joining the loop). **Prefer chaining over wrapping** — compose at the URL (`?controller=wavelet-ease&controller=my-fx`) instead of importing one controller inside another. (A few existing controllers — `lattice-nav`, `gesture-knobs` — still self-import `wavelet-ease`; leave them, but write new ones to be chained.)

## Knob/MIDI Control System

### Available Knobs
- `knob_1` through `knob_200` — all are available as float uniforms (0-1 range)
- Set via URL query params (e.g., `?knob_1=0.5`), MIDI controllers, or the ParamsManager API
- MIDI controllers auto-map CCs to knobs with per-device profiles persisted in localStorage. Manage mappings visually at `/midi.html`. See [docs/midi-mapping.md](docs/midi-mapping.md)
- The phone touch surface at `/vjpad.html` builds its pads from `vjpad-layouts.json` plus whatever knobs the shader declares. See [docs/vjpad.md](docs/vjpad.md)
- NFC smiley stickers on the arm are show controls: the vjpad reads them with Web NFC (Android Chrome) and sends KEEP, PANIC, NEXT, TAKE or a favourite look down its room socket, with no model in the path. Tags hold only an id; `nfc-show-controls.json` says what each does; write them at `/nfc-writer.html#show`. See [docs/nfc-show-controls.md](docs/nfc-show-controls.md)
- Phone plugged into a projector (USB-C DP Alt Mode): PROJECT on the vjpad opens the visuals on the external display and keeps the phone as the pad; the two talk over a BroadcastChannel or PresentationConnection, no network needed, and HANDS/KEEP/PANIC/proposals/NFC work unchanged. See [docs/phone-wall.md](docs/phone-wall.md)

### Naming a knob in the shader (convention)

Give a knob a name on the line that uses it and the tooling picks it up — no
separate config, no restating:

```glsl
gThetaStep = PI * (0.125 + EXA(knob_141, 0.20));   // K141 TWIST STEP (PI*0.025 .. PI*0.225)
// @knob: 141 TWIST STEP        // explicit form; wins over the K-comment
```

`vite-plugins/shader-plugin.js` extracts every referenced `knob_N` plus its name
into a `knobs` field in `shaders.json` (`"1|131:FOLD RATIO|…"`). The name is the
leading run of ALL-CAPS words after the K-number — it stops at the first
lowercase word, so the rest of the comment stays free for explanation. The VJ pad
uses this to label pads for any shader with no setup step.

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

**Note:** Only numeric values work. Known params (`shader`, `noaudio`, `fft_size`, etc.) and `knob_*` params are excluded. A hyphen becomes an underscore (`?my-param=0.5` is `uniform float my_param`), a name that is not a legal GLSL identifier (`?3d=1`, `?gl_x=1`, `?a__b=1`) is skipped, and a name the shader already declares is not declared again (`src/shader-transformers/shader-wrapper.js`).

## Query Parameters

### Core Parameters
- `shader` - Shader file to load (e.g., `?shader=star`). A path the host does not have plays the default shader with a small `shader not found: <path>` note
- `fft_size` - FFT window size (default: 4096)
- `smoothing` - Smoothing factor (default: 0.15)
- `history_size` - Statistical history buffer (default: 500)
- `noaudio` - Disable audio input (for testing)
- `embed` - Embed mode (disables audio)
- `fullscreen` - Start in fullscreen
- `remote` - Remote mode: `display` (receive commands) or `control` (send commands)
- `audio=tab` - Capture audio from a browser tab instead of mic. Chrome/Edge only. See [docs/tab-audio.md](docs/tab-audio.md)
- `audio_send=true` - Broadcast this page's audio features over the remote WebSocket (works with mic, `audio=tab`, or `audio_file`)
- `audio=remote` - Take audio features from a machine running `audio_send=true` instead of the local mic. Same dev server or `room=`
- `audio_file=<url>` - Play a deterministic audio file through the analyzer. Smoothing defaults to 0.15, the same as the mic. See [docs/audio-file-playback.md](docs/audio-file-playback.md)
- `wavelet=true` - Enable opt-in wavelet (DWT) analysis alongside FFT. Adds `wavelet*` uniforms (octave bands, centroid/spread, bassHit trigger, FFT×wavelet combos). See [docs/wavelet-analysis.md](docs/wavelet-analysis.md)
- `audio_device=<label substring>` - Open the mic input whose label contains this (e.g. `USB Audio CODEC`); no match means no audio, never a different device. Omitted → the OS default input
- `audio_time=<seconds>` - Start audio file playback at this offset (default: 0)
- `time=<seconds>` - Hold time constant (useful for deterministic screenshots/testing)
- `vj=1` - Install the VJ runtime on the display: cursor-hide, GL validator, aesthetic meter, frame-time probe, and health signals (POSTed to `/__vj-signal` on the dev server; on a `?remote=display&room=` page, production included, also sent down the room socket to the relay MCP's `wait_for_event`). This is how the auto-VJ loop sees a page it cannot screenshot. See [docs/vj-telemetry.md](docs/vj-telemetry.md)
- `hands_ms=<ms>` - The live show's HANDS lock: how long after Aaron's last dial/pad/MIDI move agent writes stay held (default 8000). See [docs/live-show-contract.md](docs/live-show-contract.md)
- `release_ms=<ms>` - How long a dial must be still before the `release` signal (default 50)
- `panic=<shader>` - The fork PANIC swaps to (default: the shader the page loaded with)
- `show_proposals=1` - With `vj=1`, show a small chip on the display naming open proposals (they live on the vjpad otherwise)
- `wall=1` - This display is a phone wall: it also hears a vjpad on the same phone over a local link (no network), opens a room socket only for `room=` or the dev server, and never shows the reconnect badge. The vjpad's PROJECT opens it. See [docs/phone-wall.md](docs/phone-wall.md)
- `wall_url=<same-origin path>` - On the vjpad: the page PROJECT opens as the wall (default `/`)
- `midi_panic=cc:N|note:N[:ch]`, `midi_keep=…` - Bind a MIDI control to PANIC / KEEP (persisted). See [docs/midi-mapping.md](docs/midi-mapping.md)
- `vjtrack=1` - With `vj=1`, also log every knob move at 10Hz with the full audio-feature vector, for working out which feature a fader is imitating. **Off by default and not for use during a show** — it is a ~17KB JSON serialise + fetch every 2s on the render thread

### Dynamic Override
Two audio parameters can be changed at runtime:
```javascript
window.cranes.manualFeatures.smoothing = 0.2      // next frame
window.cranes.manualFeatures.history_size = 1000  // restarts every feature's stats history
```
`fft_size` is read once at startup; changing it needs a reload with `?fft_size=`.

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

### Multiplayer Editor
Multiple people can edit the same shader simultaneously with live cursors via WebSocket. Each tab gets a random identity. No CRDT — edits apply in arrival order. See [docs/multiplayer-editor.md](docs/multiplayer-editor.md)

### Editor-Filesystem Sync (dev mode only)
Ctrl+S in the editor writes to disk via `/__save-shader` endpoint. External `.frag` changes push back via HMR. HMR updates suppress multiplayer broadcast to avoid stomping concurrent edits. See [docs/editor-filesystem-sync.md](docs/editor-filesystem-sync.md)

### Architecture
```
Controller (edit.html?remote=control)
    ↓ WebSocket
Dev Server (Vite + remote-ws-plugin WebSocket server)
    ↓ Broadcast
Display (index.html?remote=display)
```

**Hot-path rule (`src/remote/RemoteDisplay.js`):** inbound params are applied **synchronously on
arrival**. This is the knob→uniform path for a control surface someone plays in time with music,
so nothing may be deferred into it — batching applies into a `requestAnimationFrame` adds up to a
full frame (~16ms) of lag whenever the renderer's rAF is queued first. The genuinely expensive
per-message work has been moved out instead: the URL mirror is debounced to 750ms (it only exists
so a refresh preserves state) and per-message DOM work was removed outright.

### VJ MCP (any agent harness)
An MCP server (streamable HTTP, stateless, never SSE) whose tools read and drive every display:
`list_displays`, `list_shaders`, `get_state`, `screenshot`, `set_params`, `set_shader`,
`read_shader`, `write_shader`, `wait_for_event`, `guide`, the live show's `propose`, `answer_proposal`, `keep`, `panic`
(docs/live-show-contract.md), plus `display_secret` on the relay only. It runs in two places with
the same code (`vite-plugins/vj-mcp/server.js` + `hub-core.js`):
- **Ask the server how to use it:** `guide` (no args: contents; `{topic}`: one section;
  `{question: "how do I ..."}`: the best matching section plus close-match ids, keyword-ranked, no model). Its
  workflows (pick a display, change knobs, hot-swap a shader, watch signals, judge a screenshot,
  run a relay room, partner on a live show) are also MCP prompts and `vj://guide/...` resources,
  and its orientation is the server `instructions`. All of it comes from one file,
  [docs/vj-mcp-guide.md](docs/vj-mcp-guide.md): edit that, never the JS.
- **Live:** `https://relay.beadfamous.com/mcp/<room>` on the relay Worker. Displays are any
  `?remote=display&room=<room>` page; the room's Durable Object is the broker. Cloudflare Access
  managed OAuth in front (`claude mcp add --transport http paper-cranes-live
  https://relay.beadfamous.com/mcp/<room>`, then sign in from `/mcp`), the JWT checked again in the
  Worker. `write_shader` there applies code live and saves nothing (`persisted: false`). The room
  drops any `inspect` a client sends; everything else is relayed verbatim as before.
  **Display secret:** `display_secret {action: "rotate"}` locks the room and returns a display link
  ending `#display_secret=ds_…`; from then on only a page opened from that link registers as a
  display (others get `display-refused` and stay plain room peers). The room stores only its
  SHA-256; `rotate` again drops every display, `clear` reopens the room, and a room never locked
  behaves as before. The page never reports the secret and a peer cannot set it.
- **Dev:** `http://localhost:6969/mcp` on the dev server (`claude mcp add --transport http
  paper-cranes-vj http://localhost:6969/mcp`), displays are `?remote=display` pages there, and
  `write_shader` writes `shaders/<x>.frag` and hot-swaps.

Knobs go out as `update-params` on the display's own socket; reads come back over a point-to-point
`inspect` channel the broker never broadcasts, answered only after the broker welcomed the page.

**Live show ([docs/live-show-contract.md](docs/live-show-contract.md)):** the page owns everything
that must be instant (`src/vj/live.js`, wired in `RemoteDisplay.js`). While Aaron's hands are on a
dial, pad, MIDI or board control (`hands` signal), agent writes (`update-params` marked
`source: "agent"`, which every MCP write is) are HELD and land 8 s after his last move; his own
writes are never held and still apply synchronously (hot-path rule). Agents change his look with
`propose` (a card on the vjpad; he presses KEEP), never by setting his dials. PANIC (vjpad, MIDI,
Escape twice on jam/show, `panic` tool) hot-swaps to the boot fork with no reload; KEEP (vjpad, MIDI,
`k` on jam/show, `keep` tool) saves a snapshot and signals `keep`. The draw board bridge
(`scripts/vj/board-bridge.js`) maps board taps to these calls with `source: "board"`, and board
faders/XY (draw widgets from `scripts/vj/board-controls.js`) to `update-params` on the display's
socket, no model in the path: [docs/draw-control-surface.md](docs/draw-control-surface.md)
(buttons ~155 ms Send→wall; faders ~170 ms, draw's push throttle is the floor).
See [docs/vj-mcp.md](docs/vj-mcp.md).

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
│   │   ├── analyzer.js         # Worker analyzer loader
│   │   ├── tabAudioSource.js   # ?audio=tab capture via getDisplayMedia
│   │   ├── tabAudioButton.js   # Tab audio overlay UI
│   │   ├── micWatchdog.js      # Re-acquires the mic after a phone lock / OS takeover (?debug_audio=true)
│   │   └── audioFileSource.js  # ?audio_file= deterministic playback
│   ├── midi/
│   │   └── MidiMapper.js       # MIDI CC→knob mapping with profiles
│   ├── multiplayer/
│   │   ├── MultiplayerEditor.js # Live collaborative editing
│   │   ├── identity.js         # Random per-tab identity generation
│   │   └── multiplayer.css     # Cursor and peer chip styles
│   ├── params/
│   │   └── ParamsManager.js    # Unified params (URL, remote, features)
│   ├── phone-wall/             # One phone, two screens: pad + wall over a local link (docs/phone-wall.md)
│   │   ├── link.js             #   BroadcastChannel / PresentationConnection link, hello + TTL
│   │   ├── pad.js              #   vjpad client (room + link) and the PROJECT / WALL / NO WALL bar
│   │   ├── wall.js             #   ?wall=1 display client for RemoteDisplay
│   │   ├── project.js          #   find the second screen, open the wall on it
│   │   └── state.js            #   none / available / connecting / presenting / lost
│   ├── remote/
│   │   ├── RemoteController.js # Sends commands to displays
│   │   ├── RemoteDisplay.js    # Receives commands from controllers
│   │   ├── inspect.js          # Display side of the VJ MCP (state, shot, logs, validate)
│   │   ├── relay.js            # Which relay a page may answer on; PINNED boot-time keys update-params cannot set
│   │   └── WebSocketClient.js  # WebSocket client wrapper
│   ├── vj/
│   │   ├── runtime.js          # ?vj=1 page runtime (validator, meter, jank probe, signals)
│   │   └── signals.js          # where ?vj=1 signals go: /__vj-signal (dev) and/or the relay room socket
│   ├── Visualizer.js           # WebGL rendering
│   ├── shaderLoader.js         # Centralized shader loading
│   ├── listStore.js            # list page's localStorage (cranes-list-*), shape-checked reads
│   └── shader-transformers/     # Shader preprocessing
├── shaders/                     # GLSL visualization shaders
│   ├── wip/claude/             # Claude-created shaders go here
│   ├── plasma.frag
│   └── melted-satin/2.frag
├── setlists/                    # /show setlist <name>: beats as hot-swaps (sun-set.json, clit-set.json)
├── controllers/                 # JS companions to shaders (frame-persistent state)
│   ├── example.js              # Documented example
│   └── the-coat.js             # Drop sustain with exponential decay
├── scripts/
│   ├── remap-knobs.js          # Utility to remap knob assignments in shaders
│   ├── validate-shader.js      # Compile one shader through the real wrapper
│   ├── production-shaders.test.js # npm test: every shader outside wip/ must compile
│   └── vj/                     # Live-VJ tooling — see docs/vj-telemetry.md
│       ├── show.js             #   the show browser: fullscreen Chrome driven over CDP (launch/eval/shot)
│       ├── aesthetic-meter.js  #   dev fetches it by URL, a build bundles it (src/vj/runtime.js); do not move
│       ├── remote-send.js      #   push update-params to the display from a shell
│       ├── mcp-call.js         #   call one VJ MCP tool from a shell
│       ├── watch-release.js    #   emit a line when a fader is released
│       ├── watch-events.js     #   one line per page signal (keep, panic, release, …): a Monitor's feed
│       ├── stray-guard.mjs     #   closes any page in the show Chrome that isn't the wall
│       └── knob-correlate.js   #   which audio feature was that gesture imitating?
├── public/
│   └── service-worker.js        # The only service worker (Vite copies public/ as-is)
├── workers/
│   └── remote-relay/            # relay.beadfamous.com: /ws/<room> broker + live VJ MCP (Durable Object)
├── jam.js                       # Jam page: canvas only, MIDI + spacebar snapshots, no on-screen UI
├── index.js                     # Main entry point
├── edit.js                      # Editor interface
├── list.js                      # Shader list/gallery page
├── vite.config.js               # Vite build configuration
└── vite-plugins/
    ├── remote-ws-plugin.js      # WebSocket server for remote control
    ├── editor-sync-plugin.js    # Bidirectional editor↔disk sync (dev only)
    ├── same-origin.js           # 403 for cross-site POSTs to the dev write endpoints (/__save-shader, /__vj-signal, ...)
    ├── vj-signal-plugin.js      # /__vj-signal endpoint; writes .claude/vj-signals.jsonl (dev only)
    ├── vj-mcp-plugin.js         # /mcp: VJ MCP server, streamable HTTP (dev only) — docs/vj-mcp.md
    ├── vj-mcp/server.js, hub-core.js  # the tool set and display hub, shared with the relay Worker
    ├── vj-mcp/hub.js, tools.js  #   their dev-server hosts (Node ws sockets, shaders on disk)
    ├── vj-mcp/guide.js          #   guide tool, workflow prompts, vj://guide resources, from docs/vj-mcp-guide.md
    └── shader-plugin.js         # Shader discovery, metadata, and manifest generation
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
- Auto-deploys to visuals.beadfamous.com via Cloudflare Pages
- PRs to `shaders/<github-username>/` auto-merge
- No backend required (static hosting)
- **Images and static assets must go in `public/`** — see [docs/errata.md](docs/errata.md)

### Branch Preview URLs
Every branch gets a Cloudflare Pages preview deployment at:
```
https://<branch-name>.paper-cranes-visuals.pages.dev/
```

For example, a branch called `webcam-background` is accessible at:
```
https://webcam-background.paper-cranes-visuals.pages.dev/?shader=my-shader
```

Use this to link to specific shaders: append `?shader=<path>` (without `.frag`).

### PR Shader Links
When creating a PR that adds shaders, **always include preview links** in the PR body using the branch preview URL convention. For example:

```markdown
| Shader | Link |
|--------|------|
| my-shader | [preview](https://<branch>.paper-cranes-visuals.pages.dev/?shader=path/to/my-shader) |
```

This lets reviewers click through and test each shader directly.

## Claude-Specific Instructions

### Where to Put Your Shaders

Shaders go under `shaders/<github-username>/wip/<shader-name>/`. Iterations are numbered files. Each shader in `wip/` gets a single markdown doc named `<shader-name>.md` in the same directory.

```
shaders/claude/wip/cosmic-bloom/
├── 1.frag              # First iteration
├── 2.frag              # Second iteration
└── cosmic-bloom.md     # Design intent, audio mapping, iteration notes
```

```bash
shaders/claude/wip/cosmic-bloom/1.frag           # Good
shaders/claude/wip/cosmic-bloom/cosmic-bloom.md   # Good — one doc per shader
shaders/wip/claude/my-shader.frag                 # Old convention, still works
shaders/my-shader.frag                             # Bad - don't put in root
```

**Document as you iterate.** The `<shader-name>.md` should include:
- Visual intent and design concept
- Which audio features drive what and why
- What changed between numbered iterations (e.g. "2.frag: switched from spectralFlux to spectralEntropy for the color shift — less jittery on sparse tracks")

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

`vite-plugins/shader-plugin.js` also derives, per shader:
- `modified` — last-commit date, used by the list page's "newest first" sort.
  **Cloudflare Pages clones shallow (depth 1)**, so a live `git log` there returns the
  single build commit for every file — 346 identical dates, a sort that does nothing,
  and no visible symptom because every shader still *has* a date. So real history is
  baked into a committed **`shader-dates.json`** (`scripts/shader-dates.js`), and the
  build prefers it whenever live history is shallow or degenerate. Live git still wins
  when it is genuinely usable (local dev). The baked file holds only shaders that still
  exist, keyed in code-point order, and is written only when its text changes. A
  dev-server start, a `.frag` save or a build refreshes it only while the tree has
  uncommitted `.frag` changes, so the refresh rides with that commit and a clean
  checkout stays clean. That refresh reads committed history, so it cannot see the
  commit it rides in: a shader you add or edit gets its baked date at the next refresh.
  Until then the live site shows a new shader with no date (it sorts last under
  "newest first") and an edited one at its previous date. After committing shader work,
  run `npm run shader-dates` and commit `shader-dates.json`. The build never writes
  the baked file from a shallow clone, `npm run shader-dates` refuses to run on one, and
  the build logs a loud warning if the result has fewer than 2 distinct dates. If no
  shader has a usable date, the list page hides ages and removes the "newest" sort
  rather than showing a fabricated order.
- `presets` — preset URLs read from the shader source. The list page used to fetch all
  345 `.frag` files (6.5MB) on every load to find these; it now ships in `shaders.json`.
- `prettyName` — display name, and `tags` normalised to always be an array (a single
  `@tags: foo` used to come through as a bare string).

`images.json` (from `public/images/`) is generated alongside it to power the list
page's image picker.

**Important:** The `@fullscreen: true` metadata is the recommended way to enable fullscreen for shaders that support non-square viewports. It works in both normal mode and remote display mode.

### List Page Features
The list page (`/list.html`) is the live-performance tool: designed for one thumb,
a phone, and a dark room. All controls sit in a fixed **bottom bar** (thumb zone):
`FIND / SORT / FAVS / TAGS / SET / ROLL`.

- **Tap-to-copy-and-navigate**: Tapping a row copies the URL and opens the shader.
  Fullscreen-on-tap is on by default (toggle in the Sort sheet).
- **Sort**: newest-modified (default), recently shown, A→Z, or shuffled.
  `modified` comes from git history at build time — see below.
- **Tag filter**: chips built from `@tags`, plus per-device tags you add yourself.
  Tap a chip to include, again to exclude, again to reset. Multiple includes are OR.
  Top-level folders appear as chips too.
- **Search**: fuzzy — matches names, tags and folders, ignores case and punctuation,
  and allows skipped letters (`chrmdpth` finds chromadepth).
- **Favorites**: `@favorite: true` from the file, merged with stars you tap.
- **Setlist**: `+` on any row queues a shader; `GO` plays the queue in the perform
  overlay where **NEXT is a single tap**.
- **Perform overlay**: runs the shader in a same-origin iframe so the list never
  unloads. Also gives an **image picker** (replaces hand-editing `?image=`) and
  runtime tagging.
- **Remembered params**: returning from a shader page captures that page's URL via
  `document.referrer`, so anything hand-edited over there (knobs, `image`,
  `controller`) is reused next time. Rows with saved settings show a `saved` badge.
- **Roll**: weighted random — favourites and never-played shaders float up, anything
  played in the last couple of hours sinks.

Per-device state (stars, your tags, recents, remembered params, setlist, scroll
position) lives in `localStorage` under `cranes-list-*`. That is deliberate: at a
party the site is static and there is no server to write to. The `.frag` metadata
stays the permanent, shareable, in-repo truth and these merge on top of it.

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

## PWA App Install

Shaders can be installed as standalone apps (Add to Home Screen) on mobile and desktop.

### How It Works
1. Each shader gets a pre-built manifest at `/manifests/<shader-name>.json` (generated by `vite-plugins/shader-plugin.js`)
2. At page load, the manifest is fetched and its `start_url` is overridden with the current page URL — so the installed app preserves all query params (`image=`, knobs, etc.)
3. Tapping/clicking 7 times within 1 second triggers the browser's native install prompt (no visible UI)

### App Naming
- Manifest `name`: `"Paper Cranes - <display name>"`
- Manifest `short_name`: the display name (max 12 chars)
- Display name comes from `@name` metadata if set, otherwise from the shader path
- When the last path segment is numeric or very short (e.g. `wooli/2`), the parent folder is included → `"wooli 2"`
- Names are lowercase

### Query Param Preservation
The installed PWA opens with whatever URL the user was on when they installed. For example, installing from `?shader=wooli/2&image=images/wooli.png` means the app always opens with that image.

### Relevant Files
- `index.html` — manifest link injection + 7-tap install trigger
- `vite-plugins/shader-plugin.js` — `prettifyShaderName()`, `makeManifest()`, `generateManifests()`
- `public/icons/` — shared PWA icons (all shaders use the same set)
- `public/service-worker.js` — offline caching (the only copy; Vite ships public/ as-is)

## ChromaDepth Shader Variants

ChromaDepth 3D glasses create depth from color: red=near, green=middle, blue/violet=far. To create a chromadepth version of an existing shader:

1. Replace the color palette with HSL-based depth mapping: `hue = t * 0.75` (0=red, 0.75=violet)
2. Use `seed2` to shift the hue mapping so each device is unique
3. Map fractal interior → red (near), boundary → green (mid), exterior → blue (far)
4. Make edge glow red/orange (pops forward), background elements blue/violet (recedes)
5. On beat, shift hue toward red (`hue -= 0.05`) for a "pop forward" effect
6. Use HSL not Oklch — chromadepth needs raw spectral hue order
7. Keep saturation high (~0.9+), lightness moderate (0.05-0.55), no white

**Full guide:** See [docs/MAKING_A_NEW_SHADER.md](docs/MAKING_A_NEW_SHADER.md#creating-chromadepth-versions-of-existing-shaders)

**Reference shaders:** `wooli/chromadepth-1.frag`, `wooli/chromadepth-2.frag`, `claude/chromadepth-julia.frag`

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

## Testing

Full guide: [docs/testing.md](docs/testing.md).

- `npm test` - unit tests (vitest, node).
- `npm run test:smoke` - builds, serves `dist/` like Cloudflare Pages on :7129, and drives every page in
  headless Chromium (Playwright): plasma paints real pixels, a missing shader shows the default plus
  `shader not found: <name>`, the list fills on a phone, the editor holds GLSL, no service-worker
  reload loop, `?vj=1` runtime, vjpad, midi.
- `npm run test:smoke:prod` - the same against https://visuals.beadfamous.com, plus `e2e/relay.test.js`
  (a peer in a live `?room=` sets a knob but cannot set `controller`; `vj-signal` is not relayed).
  Point it at a Pages preview with `E2E_BASE_URL=<url>`; record videos with `E2E_VIDEO_DIR=<dir>`.
- `npm run test:e2e` - every `e2e/*.test.js`, including the dev-server VJ MCP suites.
- Smoke checks wait on conditions, never sleeps, and pin `time=` + `noaudio=true`. Run the smoke
  suite against the Pages preview before merging a change to a page.

## Shader Validation

Use the CLI to validate shader syntax before committing:
```bash
node scripts/validate-shader.js shaders/wip/claude/my-shader.frag
```

This will check for:
- GLSL syntax errors
- Missing required uniforms
- Common mistakes

`npm test` also compiles every shader outside `wip/` through the same wrapper
(`scripts/production-shaders.test.js`), so a broken production shader fails the suite.

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
6. **Metadata before #version**: If your shader has `#version 300 es`, keep it on the first line and put metadata comments (`// @fullscreen: true`) on line 2. The wrapper hoists a `#version` that only `//` comments precede, so such a shader still compiles, but any other code above `#version` is an error. Shaders without `#version` (ShaderToy-style) can have metadata on line 1.

## Claude Code Skills

| Skill | Purpose |
|-------|---------|
| `/show` | The one door for a live show: `check` (preflight as ✅/❌ cards on the show's draw board), launch (the wall, the board as status board and phone control surface, the no-model board bridge, then the `/partner` lane), `lite` (a jam: what `/jam` was), `panic [fork]`, `setlist <name>` (e.g. the sun set), `end` (story on the board, journal). See [docs/show-playbook.md](docs/show-playbook.md). |
| `/partner` | Aaron's VJ partner while he plays the dials: its own background lane, one step per event, PROPOSES changes he takes or dismisses (KEEP on the pad or board), applies only health fixes, never while his hands are on. The art critic runs between tracks. Was `/vibej2`. |
| `/keep` | KEEP lives in the page (vjpad, MIDI, `k`, the board); `/keep process` turns kept moments into numbered forks and named presets with docs. Was `/fork` + `/preset`. |
| `/jam` | Alias: use `/show lite`. |
| `/record` | Record a music video from the shader canvas (MediaRecorder). Studio and post-show only: it drives Chrome through claude-in-chrome. |
| `/solo` | Toggle a shader between knob mode and audio mode. Auto-detects current mode and switches. Use `/solo knobs` or `/solo audio` to force a mode. Defaults to the modified `.frag` in the worktree. |
| `/changelog` | Update docs/CHANGELOG.md and README with recent features. |
| `/pr` | Create a PR, request review, and open in browser. |
| `/show-repo` | One show, one repo: strip to one shader + controller (shared git history), build, verify headless, then publish to `<show>.beadfamous.com` on Aaron's go-ahead. Its front page is `show.html`: canvas only, MIDI, `?room=` remote jamming, snapshots. See [docs/show-repos.md](docs/show-repos.md). |
| `/verify-paper-cranes` | Prove a change in the real app: launch an instance on a free port (never 6969/6977/6978/6991), doctor it, drive a mapped feature with Playwright, keep screenshots, pixel stats, logs and a headful video in `~/paper-cranes-proof/`, then clean up. Feature map in `.claude/skills/verify-paper-cranes/features/`. |

Retired 2026-11-24 (board [live-show-skills](https://draw.hypnodroid.com/b/live-show-skills), Aaron: "Yes to all"): `/vibej`, `/vj`, `/live-session` (deleted), `/vibej2` (now `/partner`), `/fork` and `/preset` (now `/keep`), `/sun-set` (now the setlist `setlists/sun-set.json`, played by `/show setlist sun-set`), `/remap` (now the "Forget all mappings" button on `/midi.html`).

## Live Sessions: the Parent Stays Responsive

**Show day:** run `/show`. It does the preflight, launch, board, watchers and hand-off to the
`/partner` lane. Follow [docs/show-playbook.md](docs/show-playbook.md) for the runbook, knob map,
story, fork library and failure fixes.

**The show's phone surface is a [draw](https://draw.hypnodroid.com) board** (`show-<date>`): the
wall's status, the preflight, `/partner`'s proposal cards, kept moments, and big PANIC / KEEP /
beat / knob buttons whose taps reach the page through `scripts/vj/board-bridge.js` with no model
in the path. The page owns the instant parts (HANDS lock, KEEP, PANIC, proposal cards):
[docs/live-show-contract.md](docs/live-show-contract.md).

**Getting a set into "explore it for hours" depth:** [docs/vj-deep-voyage-recipe.md](docs/vj-deep-voyage-recipe.md), from the [2026-11-22 clit coaster show](journals/2026-11-22-clit-coaster-show.md).

During any **live session** — a show (`/show`), a jam (`/show lite`), anything where the
user has a hand on a controller — the main Claude session is a **dispatcher, not a worker**. It
triages what the user says, reads the meter, makes the ONE decision, and hands execution to a
subagent (`Agent` tool, `subagent_type: "fork"` — a fork inherits the full session context). Then
it goes back to listening.

**The parent NEVER does inline:** browser-side verification waits (`await new Promise(r =>
setTimeout(...))`), multi-step analysis, journal or doc writing, repo archaeology, long
edit-then-verify cycles, batch screenshot review. All of it goes to a fork.

**"However trivial they seem to you"** is the operative clause, inherited from the Relay
coordinator role: every violation feels individually too small to delegate — one `curl` to check a
claim, one quick file read, one 20-second wait. Each is defensible alone; together they are the
whole failure. *The judgement "this one is small enough" is itself the thing to stop making.*

**Why, mechanically:** a `<task-notification>` only reaches the parent **between turns**. A long
parent turn is dead air — monitors fire, the user presses a button, and nothing is heard until the
turn ends. On 2026-08-20 a LEARN press waited **~3 minutes** for a reply purely because the parent
was mid-turn running verification waits.

**The corollary that actually fixed it:** when work must be *instant*, push it out of the agent
loop entirely and into the page. The `?vj=1` runtime now runs the LEARN correlation in-browser and
answers the phone over the WebSocket in **tens of milliseconds** — 56 ms measured from WebSocket
delivery to the answer being posted, ~180 ms end-to-end including the confirm-watcher poll, worst
case bounded at ~450 ms by the two poll intervals — with no model in the path.
**Delegate work that needs a model; put work that needs to be instant in the page.**

**Concurrency:** only ONE subagent at a time may drive the display page or the target `.frag`. The
parent holds that token and must not spawn a second page-touching fork while one is running.
Doc-only forks can run in parallel, but give each one distinct files — two agents editing the same
file is a lost edit.

Full treatment, including the failure modes that produced these rules:
[docs/live-session-architecture.md](docs/live-session-architecture.md).

## Misc Notes
- Use far less time when running sleep than you ordinarily would; if it were 5 seconds, do 1 instead.
- When creating a PR or pushing to one, consider whether the changes include features a user would be excited about. If so, ask the user if they'd like you to run `/changelog` to update the docs.