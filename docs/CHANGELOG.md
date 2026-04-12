# CHANGELOG

All notable non-shader feature changes to this project will be documented in this file.

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
