# E2E Visual Stability Testing — Audio File Playback

## Goal

Test that shaders remain visually stable when fed real audio, by loading an MP3 file instead of a live microphone. You will take consecutive screenshots at specific moments in the song and compare them to detect unwanted jitter, zoom drift, and color instability.

## Prerequisites

- Dev server running (`pnpm dev`)
- Chrome DevTools MCP connected
- The test MP3: `/Users/hypnodroid/THE_SINK/paper-cranes/original/imaginary-friends.mp3`
- Analysis JSON (for reference): `/Users/hypnodroid/THE_SINK/paper-cranes/analysis/imaginary-friends-analysis.json`

## Step 1: Implement Audio File Loading (if not already done)

Check if `?audioFile=` query param support exists in `index.js`. If not, implement it:

In `index.js`, modify `setupAudio()` to support loading an audio file instead of mic input. The mechanism:

1. Accept a `?audioFile=<path>` query parameter
2. Create an `<audio>` element, set its `src` to the path
3. Use `audioContext.createMediaElementSource(audioElement)` instead of `getUserMedia`
4. Expose `window.cranes.audioElement` so you can seek via `audioElement.currentTime = <seconds>`
5. The audio element should NOT autoplay — wait for user interaction or start paused
6. Add a `?audioTime=<seconds>` param that seeks to a specific time after loading

The audio element approach lets you seek, pause, and control playback via the console or Chrome DevTools evaluate_script.

Example integration in `setupAudio()`:

```javascript
const audioFilePath = params.get('audioFile')
if (audioFilePath) {
    const audioContext = new AudioContext()
    await audioContext.resume()
    const audio = document.createElement('audio')
    audio.src = audioFilePath
    audio.crossOrigin = 'anonymous'
    audio.loop = true
    document.body.appendChild(audio)
    window.cranes.audioElement = audio

    const sourceNode = audioContext.createMediaElementSource(audio)
    const historySize = parseInt(params.get('history_size') ?? '500')
    const fftSize = parseInt(params.get('fft_size') ?? '4096')
    const smoothing = parseFloat(params.get('smoothing') ?? '0.85')
    const audioProcessor = new AudioProcessor(audioContext, sourceNode, historySize, fftSize)
    audioProcessor.smoothing = smoothing

    // Seek if requested
    const audioTime = parseFloat(params.get('audioTime') ?? '0')
    audio.currentTime = audioTime

    await audioProcessor.start()
    audio.play()
    return audioProcessor
}
```

Put the MP3 in `public/test-audio/` or serve it from the dev server's public directory so it's accessible via URL.

## Step 2: Testing Protocol

### Test Shader

Use `subtronics-eye2` with: `?image=images/subtronics.jpg&shader=subtronics-eye2&audioFile=<path>`

### Key Timestamps in imaginary-friends.mp3

| Section | Time (seconds) | What to expect |
|---------|---------------|----------------|
| Silence (intro) | 0–2 | Near-zero energy. Shader should be **rock stable** — no zoom drift, no color shift |
| Build-up | 0.4–2.0 | Energy rising. Some movement is OK, should be smooth not jittery |
| Full energy | 27–30 | Loud section. Shader should be reactive but not flickering |
| Drop | 76–78 | Energy suddenly drops. Should transition smoothly, not snap |
| Quiet→Loud transition | 419–422 | Goes from near-silence to full energy over ~3s. Good responsiveness test |

### How to Run Each Test Point

For each timestamp:

1. **Navigate** to the shader with the audio file and timestamp:
   ```
   http://localhost:<port>/?image=images/subtronics.jpg&shader=subtronics-eye2&audioFile=test-audio/imaginary-friends.mp3&audioTime=<seconds>
   ```

2. **Wait 3 seconds** for the audio processor stats to stabilize

3. **Sample the feature values** (10 samples at 100ms intervals):
   ```javascript
   // Use evaluate_script in Chrome DevTools MCP
   () => {
     const samples = []
     return new Promise(resolve => {
       let count = 0
       const interval = setInterval(() => {
         const f = window.cranes.flattenFeatures()
         samples.push({
           eN: +f.energyNormalized?.toFixed(4),
           bN: +f.bassNormalized?.toFixed(4),
           r2: +f.energyRSquared?.toFixed(4),
         })
         count++
         if (count >= 10) {
           clearInterval(interval)
           resolve(samples)
         }
       }, 100)
     })
   }
   ```

4. **Take 5 consecutive screenshots**:
   ```
   /tmp/e2e-<section>-frame-01.png through 05.png
   ```

5. **Read all 5 screenshots** and compare visually

### What to Look For

**PASS criteria (quiet/silence sections):**
- All 5 frames should be nearly identical in zoom level, color palette, and composition
- energyNormalized swing < 0.05 over the 10 samples
- bassNormalized swing < 0.05 over the 10 samples

**PASS criteria (loud/active sections):**
- Frames may differ (music is playing!) but changes should look intentional, not noisy
- No random flickering between dramatically different zoom levels
- Color changes should flow smoothly, not jump between unrelated palettes

**PASS criteria (transitions):**
- Seek to 2s before the transition, take frames across the transition
- The shader should smoothly transition from quiet to active
- No sudden snap or jitter at the moment music kicks in

**FAIL indicators:**
- Zoom level jumps between frames on silent sections
- Background color changes from blue to purple to green on silent sections
- Feature values swinging > 0.3 range on ambient/quiet audio
- Frame feedback artifacts (ghosting, washout) appearing randomly

## Step 3: Report Results

After testing, report a table like:

| Section | eN swing | bN swing | Visual stability | Pass/Fail |
|---------|----------|----------|-----------------|-----------|
| Silence (0-2s) | 0.03 | 0.02 | Frames identical | PASS |
| Loud (27-30s) | 0.45 | 0.38 | Smooth movement | PASS |
| Drop (76-78s) | 0.20 | 0.15 | Clean transition | PASS |

If any test fails, investigate which audio feature is causing the instability and whether the adaptive smoothing parameters need adjustment.

## Step 4: Iterate

If tests fail:
1. Try adjusting `?smoothing=<value>` (higher = smoother, 0.85 is default)
2. Check `src/audio/adaptiveSmoothing.js` — the scale formula controls how much rSquared affects dampening
3. Check `src/audio/AudioProcessor.js` — `smoothingTimeConstant` on the AnalyserNode controls raw FFT smoothing
4. Re-run the failing test point to verify the fix
5. Run ALL test points to ensure you didn't break responsiveness

## Files Reference

| File | Purpose |
|------|---------|
| `src/audio/adaptiveSmoothing.js` | Converts user-facing smoothing + rSquared → internal alpha |
| `src/audio/adaptiveSmoothing.test.js` | Unit + e2e tests (vitest, run with `npx vitest run`) |
| `src/audio/AudioProcessor.js` | Main audio pipeline, applies smoothing per-frame |
| `src/audio/WorkerRPC.js` | Worker communication, fire-and-forget model |
| `index.js` | Entry point, reads query params, sets up audio |
| `vitest.config.js` | Vitest config (separate from vite.config.js to avoid plugin crashes) |
| `shaders/subtronics-eye2.frag` | Good test shader — zoom driven by energyNormalized with huge range (0.6→3.5) |

## Current Smoothing Architecture

```
MP3 → AudioContext → AnalyserNode (smoothingTimeConstant=0.8)
    → FFT data → Workers (compute stats: normalized, zScore, rSquared, etc.)
    → AudioProcessor.updateCurrentFeatures:
        rSquared = energy worker's rSquared
        alpha = computeAdaptiveSmoothing({ smoothing, rSquared })
        smoothedValue = prev * (1 - alpha) + new * alpha
    → shader uniforms
```

The `smoothing` query param (0-1, default 0.85) controls how smooth vs responsive. Higher = smoother. The adaptive system modulates around this based on signal coherence (rSquared).
