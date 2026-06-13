# Tab Audio Capture

Visualize audio from any browser tab — Spotify, YouTube, SoundCloud, Bandcamp — without installing a loopback audio driver.

## Quick Start

Append `?audio=tab` to any visualization URL:

```
http://localhost:6969/?shader=plasma&audio=tab
```

A "Share tab audio" overlay appears. Click it, pick the tab playing music in the browser's share picker, and **check "Share tab audio"** in the dialog. The audio streams directly into the FFT analyzer.

## How It Works

Uses the browser's `getDisplayMedia` API to capture audio from a shared tab. Chrome requires `{ video: true }` to surface audio — the video track is immediately dropped after acquisition.

Audio processing settings are disabled to preserve fidelity:
- `echoCancellation: false`
- `noiseSuppression: false`
- `autoGainControl: false`

The captured `MediaStream` is wired into `AudioProcessor` exactly like a microphone stream.

## Re-sharing

If the user clicks "Stop sharing" in the browser chrome, the system automatically re-prompts for a new tab — no page reload needed.

## Browser Support

| Browser | Tab Audio | Notes |
|---------|-----------|-------|
| Chrome | Yes | Full support |
| Edge | Yes | Full support (Chromium-based) |
| Firefox | Falls back to mic | `getDisplayMedia` doesn't expose audio tracks |
| Safari | Falls back to mic | `getDisplayMedia` doesn't expose audio tracks |

Desktop only. Mobile browsers do not support `getDisplayMedia`.

### Microphone Fallback

When `?audio=tab` is requested in a browser that can't capture tab audio (Firefox,
Safari, mobile — anywhere `getDisplayMedia` is unavailable), the system falls back
to **microphone input** instead of leaving the visualizer silent. A warning is
logged to the console, and the visualization reacts to whatever the mic picks up.
This is detected up front via `isTabAudioSupported()`, so no "Share tab audio"
overlay appears in unsupported browsers.

## vs. Virtual Audio Loopback

For "I just want to see my Spotify react to a shader," `?audio=tab` is all you need. For permanent system-wide setups (projector rigs, live shows, OBS routing), see [professional-audio.md](professional-audio.md) for BlackHole (macOS) and Voicemeeter (Windows).

## Key Files

- `src/audio/tabAudioSource.js` — `getDisplayMedia` capture and `AudioContext` wiring
- `src/audio/tabAudioButton.js` — overlay UI and user gesture handling
- `index.js` — dynamic import when `?audio=tab` is set
