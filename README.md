# Beadfamous.

Welcome to the Beadfamous project! This repo is an open-source project I made to do advanced audio analysis from a microphone in the browser, and drive arbitrary music visualizations with the data. The project can run on mobile phones, and is designed to make it easy to create new visualizations and share them with others.

### Visualize Spotify (or any tab) — no loopback driver, no install

Append **`?audio=tab`** to any visualization URL and Beadfamous will ask to share a browser tab instead of using the mic. Pick your Spotify (or YouTube, SoundCloud, Bandcamp…) tab in the picker, check **"Share tab audio"**, and the track streams directly into the FFT analyzer. Clean, full-fidelity audio — with none of the mic noise, room reverb, or virtual-cable setup that music visualizers usually demand.

Try it now: [`visuals.beadfamous.com/?shader=plasma&audio=tab`](https://visuals.beadfamous.com/?shader=plasma&audio=tab)

Works in Chrome and Edge on desktop. Firefox/Safari don't yet expose tab audio through `getDisplayMedia`, so on those browsers you'll still need the mic or the loopback setup below.

For a permanent system-wide setup (projector rigs, live shows, OBS-style routing) see [using virtual audio loopback](docs/professional-audio.md) for BlackHole (macOS) and Voicemeeter (Windows). But for "I just want to see my Spotify react to a shader" — `?audio=tab` is all you need.

Visuals made by this project can be seen [here](https://visuals.beadfamous.com/list.html). This includes many works in progress, that may be twitchy or broken.

The other half of the project is a sort of "art project" where you make bead bracelets, and flash the visualizations onto them. This is a fun way to share your visualizations with others, and to make a physical object that represents your music. Scanning the bracelet with a phone will take you to a specific visualization - even when offline!

## Usage

If you've done web development before, the following steps should be pretty familiar.

1. `npm install`
2. `npm run dev`

This will serve beadfamous on localhost:6969

## Viewing the visualizations

Pick a shader from `shaders/` and load it via the `?shader` param — e.g. [localhost:6969/?shader=star](http://localhost:6969/?shader=star) loads `shaders/star.frag`. Browse the full gallery at [visuals.beadfamous.com](https://visuals.beadfamous.com/list.html).

## Fun developer features

- **Any URL param is a shader uniform** — add `?myParam=0.5` to the URL and it's instantly available as `uniform float myParam` in your GLSL. Override audio features the same way (`?bassNormalized=0.8&energyZScore=1.2`) to simulate different musical conditions without needing a microphone, making iteration fast and deterministic.
- **Live remote control via WebSocket** — open `edit.html?remote=control` on your laptop and `?remote=display` on a TV or projector. Every shader edit and knob change broadcasts in real-time to all connected displays. Write code on your laptop and watch it update on the big screen instantly, mid-performance.
- **[MIDI controllers](docs/midi-mapping.md) for live tweaking and debugging** — physical knobs (mapped to `knob_1`–`knob_200`) are injected as shader uniforms in real-time. Controllers auto-map and profiles persist per device. Swap out any audio feature for a knob with a one-line `#define` change (`#define BRIGHTNESS (knob_71)`) to tune constants by hand before wiring them back to audio, or to take live control of a visualization on stage without touching the keyboard.
- **165 audio uniforms with musical intelligence** — 15 audio features (bass, treble, spectral entropy, pitch class, etc.) each expose 11 statistical variations including `zScore` (is this a drop?), `slope` (is energy building?), and `rSquared` (how confident is that trend?). Shaders can reason about where the music is _going_, not just where it is right now.
- **[Multiplayer editor](docs/multiplayer-editor.md)** — Multiple people can edit the same shader simultaneously with live cursors and real-time sync. Each tab gets a random identity with a colored cursor.
- **[Editor-filesystem sync](docs/editor-filesystem-sync.md)** — In dev mode, Ctrl+S writes to disk and external file changes push back into the editor via HMR. Works alongside multiplayer without stomping edits.
- **[Deterministic audio for testing](docs/audio-file-playback.md)** — Use `?audio_file=<url>` to play a specific audio file through the analyzer. Combine with `?time=10.0` for reproducible screenshots.

## Query Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `shader` | `?shader=plasma` | Shader file to load (without `.frag`) |
| `audio` | `?audio=tab` | Audio source: `tab` to capture from a browser tab instead of the mic |
| `audio_file` | `?audio_file=test.mp3` | Play a deterministic audio file through the analyzer |
| `noaudio` | `?noaudio=true` | Disable audio input entirely (for visual testing) |
| `fft_size` | `?fft_size=4096` | FFT window size (default: 4096) |
| `smoothing` | `?smoothing=0.15` | Smoothing factor (default: 0.15) |
| `history_size` | `?history_size=500` | Statistical history buffer size (default: 500) |
| `fullscreen` | `?fullscreen=true` | Start in fullscreen mode |
| `remote` | `?remote=display` | Remote mode: `display` (receive) or `control` (send) |
| `embed` | `?embed=true` | Embed mode (disables audio) |
| `knob_1`..`knob_200` | `?knob_1=0.5` | Set knob values directly (0-1 range) |
| `seed`, `seed2`, etc. | `?seed=0.5` | Override deterministic seed values |
| `time` | `?time=10.0` | Hold time constant (useful for screenshots/testing) |
| *any name* | `?myParam=0.5` | Any numeric param becomes a `uniform float` in GLSL |

## Making your own visualizations

Making your own visualization is easy, but requires some knowledge of GLSL shading language.
Lucky for you, I'm hosting a hackathon with HeatSync Labs next month, in which we go from nothing to a working visualization and bracelet in a couple of hours next month! Stay tuned for more details.

**See [docs/MAKING_A_NEW_SHADER.md](docs/MAKING_A_NEW_SHADER.md) for the full guide** - covers audio features, utility functions, design patterns, and common pitfalls. For recent changes, see the [changelog](docs/changelog.md).

To make your own visualizations, you can create a new file in the `shaders/` directory, and then load it by specifying the 'shader' query param in the url. For example, to view the 'my_new_shader' visualization, you would go to [localhost:6969/?shader=my_new_shader](http://localhost:6969/?shader=my_new_shader)

You can copy and paste any of the existing files in the `shaders/` directory to get started. Or ya know, wait until the Hackathon and I'll walk you through it.

If you want to deploy a visualization you made, PR me and I'll add it to the deployed site!

## Documentation

| Guide | Description |
|-------|-------------|
| [Making a New Shader](docs/MAKING_A_NEW_SHADER.md) | Full tutorial: audio features, utility functions, design patterns, common pitfalls |
| [Tab Audio Capture](docs/tab-audio.md) | Visualize Spotify/YouTube without a loopback driver (`?audio=tab`) |
| [Professional Audio Setup](docs/professional-audio.md) | BlackHole (macOS) and Voicemeeter (Windows) for permanent rigs |
| [Multiplayer Editor](docs/multiplayer-editor.md) | Live collaborative shader editing with cursors |
| [Editor-Filesystem Sync](docs/editor-filesystem-sync.md) | Bidirectional sync between browser editor and disk |
| [MIDI Mapping](docs/midi-mapping.md) | Controller profiles, auto-assignment, and learn mode |
| [Audio File Playback](docs/audio-file-playback.md) | Deterministic audio for testing and screenshots |
| [Unique Feature Guide](docs/unique-feature-guide.md) | Choosing independent audio features for multi-element shaders |
| [Changelog](docs/changelog.md) | Recent feature changes |

## Deploying your visualization to visuals.beadfamous.com

Beadfamous has no backend. But you can still host your shader there.
Any pull request that only touches files under the shaders/<YOUR_GITHUB_USERNAME> will be automatically merged to main and deployed to Beadfamous. If this is your first commit, it will require manual approval. Afterwards, all your shaders will be automatically deployed.

Making a pull request will usually mean you need to fork the repo, make your changes, and then make a pull request from your fork to the main repo. If you're not familiar with this process, here's a [tutorial](https://guides.github.com/activities/forking/).

If you want to quickly make a pull request without cloning the repo down, you can add your shader through the Github UI. Here's a quick guide:

1. Start creating a new file in the `shaders/` directory of the paper-cranes repo [here](https://github.com/loqwai/paper-cranes/new/main/shaders).

This will automatically fork the repo to your account, and create a new file in your fork.

2. After the fork is created, you can add your shader to the project. The shader must be added to `shaders/<YOUR_GITHUB_USERNAME>/`. For example, if your github username is `loqwai`, you would add your shader to `shaders/loqwai/`. You can create the directory by adding a `/` to the end of the path in the file creation dialog.

3. After you've added your shader, you can create a pull request to the main repo. This will automatically trigger a deployment to [visuals.beadfamous.com](https://visuals.beadfamous.com). For example if your shader is file located at `shaders/loqwai/my_new_shader.frag`, the visualization will be available at `visuals.beadfamous.com/?shader=loqwai/my_new_shader`
