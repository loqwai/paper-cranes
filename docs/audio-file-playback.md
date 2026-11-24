# Audio File Playback

Play a deterministic audio file through the analyzer instead of using a microphone or tab capture. Useful for e2e testing, shader development, and reproducible screenshots.

## Usage

```
http://localhost:6969/?shader=plasma&audio_file=test-audio/beat.mp3
```

The audio file loads, loops continuously, and feeds into `AudioProcessor` exactly like a live source.

## Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `audio_file` | — | URL or path to the audio file (required) |
| `audio_time` | `0` | Start playback at this offset (seconds) |
| `history_size` | `500` | Statistical history buffer size |
| `fft_size` | `4096` | FFT window size |
| `smoothing` | `0.85` | Weight of each new frame in the feature EMA. Higher is **less** smoothing (more responsive, more jitter); `1` is none. The live mic defaults to `0.15`, so a file is much less smoothed than the mic unless you pass `smoothing=0.15` |

## Combining with Other Test Params

For fully deterministic screenshots, combine with time and seed overrides:

```
?shader=my-shader&audio_file=test.mp3&audio_time=5.0&time=10.0&seed=0.5
```

This gives you the same visual frame every time — useful for regression testing and comparing shader changes.

## Which browser plays it

Measured 2026-11-24 on WSL: in Playwright's bundled Chromium, headless and headful, with or without
SwiftShader, `audioWorklet.addModule('/window-processor.js')` never resolves. The page then stays
on the no-audio stub, silently: the canvas renders and every audio feature is empty. Check
`Object.keys(window.cranes.measuredAudioFeatures).length > 0` before trusting an audio assertion.
What works: system Google Chrome (`channel: 'chrome'`, as `e2e/audio-file.test.js` uses),
Playwright Firefox, and the soul Playwright lanes with a CORS-OK file URL. See
`.claude/skills/verify-paper-cranes/features/shader-render.md`.

## Key Files

- `src/audio/audioFileSource.js` — file loading, decoding, and looping buffer source
- `e2e/audio-file.test.js` — e2e tests using deterministic audio. They assert sections of one
  track, `public/test-audio/imaginary-friends.mp3`, which is gitignored; without it the suite
  skips and prints the missing path, so `npm run test:e2e` passes on a fresh checkout.
