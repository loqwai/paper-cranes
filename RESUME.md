# Resume: Build the Jam Page

## What This Is

Build `jam.html` + `jam.js` — a lean visualization page with knob drawer and spacebar preset snapshots. No Monaco editor, no code editing. Just the shader, the knobs, and a keyboard shortcut to capture presets.

## Why

During live sessions, the user wants to:
1. See the visualization fullscreen(ish)
2. Have the knob drawer to tweak parameters
3. Hit spacebar to snapshot the current knob + audio state for Claude to process later

The current `edit.html` is too heavy (Monaco, multiplayer, save/publish buttons). The current `index.html` is too bare (no knobs). This page sits between them.

## Architecture

### What to reuse
- `index.js` — the full visualizer + audio pipeline. Don't rewrite this.
- `index.html` — the canvas setup, PWA manifest injection, install prompt. Start from this.
- The knob drawer UI from `edit.js` — it's built with Preact (htm/preact). The drawer is the `FeatureEditor` component that renders sliders for `knob_*` params.
- `src/params/ParamsManager.js` — unified params system (URL sync, remote sync)
- `src/midi/MidiMapper.js` — MIDI controller support (loaded via `src/midi.js`)

### What to build new
1. **`jam.html`** — like `index.html` but with a root div for the knob drawer and loads `jam.js`
2. **`jam.js`** — wires up the knob drawer (extracted from edit.js, minus Monaco/multiplayer/save) + spacebar snapshot shortcut
3. **Spacebar snapshot** — on keypress, gathers knob + audio state and POSTs to `/__snapshot-preset` endpoint

### The snapshot endpoint (already built)
The `/__snapshot-preset` endpoint is in `vite-plugins/editor-sync-plugin.js`. It:
- Accepts POST with `{ shader, knobs, audio, name, musicTab, userNote }`
- Writes a timestamped JSON file to `shaders/<shader>/docs/.snapshots/`
- Claude processes these snapshots later with `/preset` skill (adds musical interpretation, naming, etc.)

### Key files to study
- `edit.js` — the knob drawer UI is here. Look for the Preact component that renders knob sliders, the drawer toggle, MIDI learn buttons, `ParamNavigator` for keyboard nav. STRIP OUT: Monaco integration, save/publish/reset buttons, multiplayer, shader code syncing, remote control mode.
- `index.js` — the visualizer bootstrap. `jam.js` should load `index.js` alongside (like edit.html does with `<script type="module" src="./index.js">`).
- `index.html` — the minimal page structure to start from.
- `vite-plugins/editor-sync-plugin.js` — the `/__snapshot-preset` endpoint.
- `src/params/ParamsManager.js` — params management.

### Spacebar snapshot flow
```
User hits spacebar in browser
  -> JavaScript gathers:
    - All knob_* values from window.cranes.manualFeatures
    - All audio features from window.cranes.flattenFeatures()
    - The shader name from URL params
  -> POST to /__snapshot-preset
  -> Server writes JSON to shaders/<shader>/docs/.snapshots/<timestamp>.json
  -> Flash a toast "Snapshot saved"
```

### Toast feedback
Reuse the `flashToast` pattern from edit.js — a transient overlay that says "Snapshot saved" and fades.

## URL
```
http://localhost:6969/jam.html?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab
```

## User Preferences
- Fish shell
- No silent error handling — let things fail loud
- No unnecessary abstractions
- Arrow functions, no semicolons, latest ECMAScript
- Don't add features beyond what's described here

## Dev Server
- Runs on port 6969 (`npm run dev`)
- HMR pushes .frag changes automatically
- The snapshot endpoint is at `/__snapshot-preset` (POST)
