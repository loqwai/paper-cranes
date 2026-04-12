# Changelog

All notable non-shader feature changes to this project will be documented in this file.

## 2026-04-11

### Features

- **[Multiplayer editor](multiplayer-editor.md) with live cursors** — Multiple people can edit the same shader simultaneously with real-time cursor presence. Built on top of the Monaco editor with WebSocket sync. ([#98](https://github.com/loqwai/paper-cranes/pull/98))
- **[Bidirectional editor-filesystem sync](editor-filesystem-sync.md)** — In dev mode, saving in the editor (Ctrl+S) writes shader code to disk via a Vite plugin, and external file changes push updates back into the editor via HMR. ([#103](https://github.com/loqwai/paper-cranes/pull/103))
- **[Tab audio capture](tab-audio.md) (`?audio=tab`)** — Visualize audio from any browser tab (Spotify, YouTube, etc.) using `getDisplayMedia` instead of the microphone. No loopback driver needed. Chrome/Edge desktop only. ([#97](https://github.com/loqwai/paper-cranes/pull/97))
- **List page query param forwarding** — The list page now forwards all current URL params when navigating to a shader, with current URL params taking precedence over preset values. This lets you set knobs or overrides on the list page URL and have them carry through.
- **Quality-of-life navigation improvements** — Better navigation between edit, list, and remote views. ([#96](https://github.com/loqwai/paper-cranes/pull/96))

### Fixes

- **Suppress multiplayer broadcast for HMR disk changes** — Vite HMR file updates no longer get relayed through [multiplayer](multiplayer-editor.md), preventing full buffer replacements that stomp concurrent edits.
- **Build fix for Cloudflare Pages** — Removed `optimize-images.sh` from the build command, which required `cwebp`/`gif2webp` not available in the Cloudflare Pages build environment. This had been silently aborting the entire build.
- **WebGL context restore without reload** — Reinitialize WebGL resources in-place on context restore instead of reloading the page. Also fixed cascading reloads on tab focus regain. ([#88](https://github.com/loqwai/paper-cranes/pull/88), [#87](https://github.com/loqwai/paper-cranes/pull/87))
- **Preserve drawing buffer across desktop switches** — Fixed WebGL context attributes to prevent visual glitches when switching virtual desktops. ([#89](https://github.com/loqwai/paper-cranes/pull/89))
- **List page no longer forces fullscreen on shader tap** — Tapping a shader/preset on the list page navigates without forcing fullscreen mode. ([#91](https://github.com/loqwai/paper-cranes/pull/91))

### Developer Experience

- **[Deterministic audio file playback](audio-file-playback.md) for e2e testing** — New `?audio_file=<url>` param plays a deterministic audio file through the analyzer for reproducible e2e tests. ([#94](https://github.com/loqwai/paper-cranes/pull/94))
- **[MIDI mapper](midi-mapping.md) refactor** — `MidiMapper` extracted into its own module (`src/midi/MidiMapper.js`) with improved knob mapping, auto-assignment, and learn mode.
- **Knob remap script** — New `scripts/remap-knobs.js` utility for remapping knob assignments in shader files.
- **Monaco editor reverted to AMD loader** — ESM migration was reverted due to missing worker support causing editor lag. AMD loader with pinned Monaco 0.52.2 restores fast language services via real Web Workers. ([#100](https://github.com/loqwai/paper-cranes/pull/100))
- **Vibe-palette buttons and cursor fix** — Styled editor buttons and fixed oversized Monaco cursor.

## 2026-04-03

### Features

- **Shader presets** — Shaders can now define presets (pre-configured knob values) that appear on the list page for quick access. ([#71](https://github.com/loqwai/paper-cranes/pull/71))

### Fixes

- **Flash diagnostics reverted** — Removed flash diagnostics logging that was added for debugging. ([#90](https://github.com/loqwai/paper-cranes/pull/90))

### Developer Experience

- **Snake_case params** — Query parameters standardized to snake_case.
- **[Audio file playback](audio-file-playback.md) over speakers** — Audio file playback now routes through speakers for monitoring during testing.

## 2026-04-01

### Fixes

- **WebGL context stability** — Fixed WebGL context attributes and drawing buffer preservation across desktop switches. ([#89](https://github.com/loqwai/paper-cranes/pull/89))
- **Context restore without page reload** — WebGL resources are re-initialized in-place on context restore. ([#88](https://github.com/loqwai/paper-cranes/pull/88))
- **Focus reload cascade fix** — Stopped cascading page reloads triggered by tab focus regain. ([#87](https://github.com/loqwai/paper-cranes/pull/87))
