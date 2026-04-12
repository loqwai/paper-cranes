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
| `smoothing` | `0.85` | Smoothing factor (higher default than live audio for stability) |

## Combining with Other Test Params

For fully deterministic screenshots, combine with time and seed overrides:

```
?shader=my-shader&audio_file=test.mp3&audio_time=5.0&time=10.0&seed=0.5
```

This gives you the same visual frame every time — useful for regression testing and comparing shader changes.

## Key Files

- `src/audio/audioFileSource.js` — file loading, decoding, and looping buffer source
- `e2e/audio-file.test.js` — e2e tests using deterministic audio
