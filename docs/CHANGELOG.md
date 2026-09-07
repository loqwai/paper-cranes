# CHANGELOG

All notable non-shader feature changes to this project will be documented in this file.

## 2026-08-20

### Performance

- **Remote display no longer stutters while a fader moves** — The knob→uniform path had three
  per-message costs on the display, running at up to 60/second (vjpad coalesces its sends to one
  per animation frame). The URL mirror parsed and re-serialised a ~700-char URL carrying 30+ knobs
  and called `history.replaceState` on **every** message; it is now debounced to 750ms and flushed
  on `pagehide`, since it exists only so a refresh preserves state. The per-message "Remote" flash
  was removed outright — it did `getElementById`, four style writes and a fresh `setTimeout` per
  message (stacking ~60 timers/second), to draw an overlay that `?vj=1` hides with CSS anyway.
  Params are still applied **synchronously on arrival**: batching them into a
  `requestAnimationFrame` was tried and reverted, because it added up to a full frame (~16ms) of
  lag to a surface people play in time with music. `updateStatusIndicator` is untouched — it fires
  on connection state changes only.

### Features

- **[VJ telemetry](vj-telemetry.md) (`?vj=1`, `?vjtrack=1`)** — The display page volunteers its own
  numbers so the auto-VJ loop can judge a page it cannot screenshot (a tab opened by an earlier
  session is outside the current browser tab group and cannot be scripted at all). `?vj=1` installs
  the GL validator, aesthetic meter, a frame-time jank probe, and cursor hygiene, and POSTs a boot
  beacon, a 20s `pulse`, and watchdog health alerts (`clip`, `flicker`, `too-dark`, `shiver`,
  `gate-drop`/`gate-clean`) to `/__vj-signal`. Boot beacons now carry a parsed `flags` object —
  with 30 knobs in a URL, the parameters that matter fall past any truncation limit.
  `?vjtrack=1` additionally logs every knob move at 10Hz with the full ~184-channel feature vector;
  it is **off by default** as it is a ~17KB serialise plus a fetch every 2s on the render thread.

### Developer Experience

- **Fader-imitation analysis (`scripts/vj/`)** — Tooling to answer "which audio feature was that
  gesture imitating?". `watch-release.js` fires the moment a fader is released; `knob-correlate.js`
  segments the log into gestures and correlates each knob against every feature; `remote-send.js`
  pushes `update-params` to a display from a shell (the lever on a tab that cannot be scripted).
  The correlator carries three guards, each added because its absence produced a confident wrong
  answer: correlate **inside one gesture** (across idle time everything reads r≈0.3), a Bartlett
  **effective-N** test (a 7s sweep reads r=0.9 on ~3 independent points), and **detrending** (a
  steady sweep matches every monotonic accumulator in the engine — the tell is many unrelated
  channels tying at one r, and `n_eff` does not catch it).
- **Signal log rotation** — `.claude/vj-signals.jsonl` rotates on dev-server start, keeping one
  `.prev`. It was an unbounded `appendFileSync` that reached 7.3MB while the GET endpoint only ever
  serves the last 50 lines.
- **~54MB of dead artifacts dropped** — `.playwright-mcp/` (48MB, already matched by `.gitignore`
  but committed before the ignore existed), ~20MB of screenshot PNGs under `scripts/*-screenshots/`
  (the capture harnesses in those directories are kept), a root `images/` directory superseded by
  `public/images/`, and four one-off scripts with no references.

## 2026-06-07

### Features

- **[Wavelet (DWT) audio analysis](wavelet-analysis.md) (`?wavelet=true`)** — Opt-in multiresolution analysis running alongside the FFT pipeline. A Daubechies-4 wavelet transform gives octave bands at their own time resolution (smooth bass, sharp treble) for better deep-bass-drop detection and frequency-motion features. Bands are first-class features with the full 11 stat variations (`waveletBand0ZScore`, etc.), plus derived axes (`waveletCentroid`/`waveletSpread`/`waveletTilt`), a sharp `wavelet_bassHit` drop trigger, and FFT×wavelet combinations (`wavelet_punch`, `wavelet_confirmedDrop`). Uses a 128-sample sliding window for ~3ms-latency updates. ([#123](https://github.com/loqwai/paper-cranes/pull/123))

### Developer Experience

- **Headless wavelet feature harnesses** — `scripts/wavelet-harness2.mjs` and `scripts/wavelet-fft-cross.mjs` score audio features for animation quality and cross-domain independence from ffmpeg-decoded PCM, running the exact `createWaveletAnalyzer` that runs live. ([#123](https://github.com/loqwai/paper-cranes/pull/123))

## 2026-04-30

### Features

- **[MIDI mapping page (`/midi.html`)](midi-mapping.md#mapping-page-midihtml)** — Dedicated visual UI for managing controller mappings: device list, live CC→knob table with inline knob-index editing, and a knob grid you click to learn-bind the next incoming CC. Replaces the per-knob learn flow buried in the editor. ([#121](https://github.com/loqwai/paper-cranes/pull/121))

## 2026-04-25

### Features

- **`/vibej` skill (renamed from `/vj`)** — The live auto-VJ loop is now invoked as `/vibej`. The legacy `/vj` alias still works identically — same arguments, same `.claude/vj-state.json`, same per-shader journal. Disambiguates "vj" (often "video jockey" generally) from this specific shader auto-mutation loop.
- **`/jam`, `/fork`, `/record` skills** — Streamlined live-jam workflow. `/jam` opens jam page + Spotify + tab audio sharing in one shot. `/fork` snapshots the current shader + knob state as a new numbered iteration. `/record` captures a video of the current visualization with auto-stop. ([#115](https://github.com/loqwai/paper-cranes/pull/115))
- **`/vibej` (`/vj`) skill + live VJ session infrastructure** — Claude runs as the VJ: every minute, reads audio features + Spotify track name from the jam page, makes one focused edit to the shader (validated pre-save against a real GL compile), HMR hot-swaps. Per-shader journal accumulates "cool moments", todos, removals, and forks so future sessions resume with full context. Subtle vs dramatic move styles, auto-wires knobs the user is twisting. ([#116](https://github.com/loqwai/paper-cranes/pull/116))
- **Tab audio capture title in snapshots** — Snapshots now record the shared tab title (via `MediaStreamTrack.label`), so the queue knows which Spotify/SoundCloud track was playing when each preset was captured.
- **Controller hot-reload** — Edits to `controllers/*.js` now hot-reload on the jam/edit pages without losing the audio stream or knob state.

### Developer Experience

- **`scripts/dev-port`** — Branch-derived dev server port (main = 6969, other branches hash to 1024–65534). All skills and tooling read from this script; never hardcode the port. Means multiple worktrees can run `npm run dev` simultaneously without colliding.
- **Pre-save GL validation in `/vibej`** — Each shader edit is compiled in a tiny offscreen WebGL2 context on the jam tab BEFORE writing to disk, catching errors the static linter misses (forward refs, type errors).

## 2026-04-14

### Features

- **[Jam page](jam-page.md) (`/jam.html`)** — Lean visualization page for live sessions: fullscreen shader + knob drawer, no editor. Spacebar snapshots the current knob + audio state to a queue for batch processing. Backspace undoes the last snapshot. ([#114](https://github.com/loqwai/paper-cranes/pull/114))
- **Preset snapshot queue** — Snapshots capture structured audio features (normalized, zScore, slope, rSquared for 14 features) alongside knob values. Process the queue offline with `/preset process` — no live browser needed. ([#114](https://github.com/loqwai/paper-cranes/pull/114))
- **`?audio=none` param** — Explicitly disable audio input. Cleaner than `?noaudio=true`. ([#107](https://github.com/loqwai/paper-cranes/pull/107))
- **MIDI on index page** — Opt-in MIDI controller support on the viewer page with `?midi=true`. ([#113](https://github.com/loqwai/paper-cranes/pull/113))

### Fixes

- **No more black flashes on tab switch** — Eliminated black frames when hiding/showing the browser tab or switching desktops. ([#101](https://github.com/loqwai/paper-cranes/pull/101))
- **Wake lock on user gesture** — Screen stays on during live sessions without needing manual settings. ([#112](https://github.com/loqwai/paper-cranes/pull/112))
- **Editor save no longer reloads** — Ctrl+S in the editor saves to disk without triggering a full page reload. ([#109](https://github.com/loqwai/paper-cranes/pull/109))
- **Audio warm-up ramp** — Prevents visual spikes when audio first connects. ([#110](https://github.com/loqwai/paper-cranes/pull/110))
- **Hot-swap shader updates on jam page** — `.frag` file changes apply without page reload, preserving tab audio sharing permissions.

### Developer Experience

- **Compact list page layout** — Desktop list page uses space more efficiently. ([#108](https://github.com/loqwai/paper-cranes/pull/108))

## 2026-04-11

### Features

- **[Multiplayer editor](multiplayer-editor.md) with live cursors** — Edit the same shader with multiple people simultaneously, with colored cursors and real-time sync over WebSocket. ([#98](https://github.com/loqwai/paper-cranes/pull/98))
- **[Tab audio capture](tab-audio.md) (`?audio=tab`)** — Visualize Spotify, YouTube, or any browser tab's audio without installing a loopback driver. Just append `?audio=tab` and pick a tab. Chrome/Edge only. ([#97](https://github.com/loqwai/paper-cranes/pull/97))
- **[Editor-filesystem sync](editor-filesystem-sync.md)** — Ctrl+S in the editor writes to disk; external file changes push back into the browser via HMR. Works alongside multiplayer without stomping edits. ([#103](https://github.com/loqwai/paper-cranes/pull/103))
- **Shader presets** — Define presets (pre-configured knob values) per shader that appear on the list page for one-tap access. ([#71](https://github.com/loqwai/paper-cranes/pull/71))
- **List page param forwarding** — All current URL params carry through when navigating from the list page, so knob overrides and settings stick. Current params take precedence over preset values.
- **Quality-of-life navigation** — Smoother navigation between edit, list, and remote views. ([#96](https://github.com/loqwai/paper-cranes/pull/96))

### Fixes

- **WebGL context restore without reload** — GPU resources re-initialize in-place on context loss instead of reloading the page. Also fixed cascading reloads on tab focus and drawing buffer loss when switching desktops. ([#87](https://github.com/loqwai/paper-cranes/pull/87), [#88](https://github.com/loqwai/paper-cranes/pull/88), [#89](https://github.com/loqwai/paper-cranes/pull/89))
- **Build fix for Cloudflare Pages** — Removed `optimize-images.sh` which required tools unavailable in the Pages build environment, silently aborting the entire build.
- **List page no longer forces fullscreen on tap** — Tapping a shader/preset navigates without forcing fullscreen mode. ([#91](https://github.com/loqwai/paper-cranes/pull/91))

### Developer Experience

- **[Deterministic audio file playback](audio-file-playback.md)** — New `?audio_file=<url>` param plays a specific audio file through the analyzer for reproducible e2e tests and screenshots. ([#94](https://github.com/loqwai/paper-cranes/pull/94))
- **[MIDI controller profiles](midi-mapping.md)** — Plug in any MIDI controller and knobs auto-map. Profiles persist per device in localStorage with a learn mode for manual assignment.
- **Knob remap script** — `scripts/remap-knobs.js` utility for remapping knob assignments across shader files.
