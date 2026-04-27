# CHANGELOG

All notable non-shader feature changes to this project will be documented in this file.

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
