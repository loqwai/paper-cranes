# Jam Page (`/jam.html`)

A lean visualization page for live sessions. The shader and nothing else: no drawer, no toasts, no indicators, no pointer. It is what gets projected, so nothing on it may draw over the visual. MIDI knobs stay live (mappings are managed at `/midi.html`) and mirror into the URL so a refresh keeps the set's state.

## Usage

```
http://localhost:6969/jam.html?shader=my-shader&audio=tab
```

Append any knob params to pre-load values: `&knob_1=0.5&knob_3=1.0`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Spacebar** | Snapshot current knob + audio state to the preset queue |
| **Backspace / Delete** | Undo (delete) the most recent snapshot |

## Snapshot Queue

Each spacebar press captures:
- All `knob_*` values the user has set
- Structured audio features (normalized, zScore, slope, rSquared) for 14 audio features
- The browser tab title (music source)
- Timestamp

Snapshots are written as JSON to `shaders/<shader>/docs/.snapshots/` and processed later with `/preset process` — Claude reads each snapshot, interprets the musical moment, generates a name, and writes it to `presets.md`.

## How It Differs from Other Pages

| | `index.html` | `jam.html` | `edit.html` |
|---|---|---|---|
| Shader canvas | Yes | Yes | Yes |
| Knob drawer | No | No (MIDI / vjpad / URL) | Yes |
| Code editor | No | No | Yes (Monaco) |
| Snapshot queue | No | Yes | No |
| MIDI support | Opt-in (`?midi=true`) | Always | Always |
| Hot-reload shaders | Full page reload | Hot-swap (no reload) | Hot-swap via editor |

## Hot-Swap Shader Updates

When a `.frag` file changes on disk, the jam page hot-swaps the shader code without reloading. This preserves tab audio sharing permissions — no need to re-pick the audio source tab after every shader edit.

## Picking the Audio Input

`&audio_device=<label substring>` opens the input whose label contains it (case-insensitive), e.g.
`&audio_device=USB Audio CODEC`. A name that matches nothing leaves the page silent rather than
quietly opening another device; `window.cranes.audioInputLabel` reports what was opened. Without
the param the page opens the OS default input.

## Live Shows

Project it from the show browser, not your everyday Chrome: `node scripts/vj/show.js launch '<jam url>'`
spawns a dedicated fullscreen Chrome with no automation bar, no extension, and mic + MIDI
pre-granted. See `/vibej2`.
