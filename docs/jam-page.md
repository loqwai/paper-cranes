# Jam Page (`/jam.html`)

A lean visualization page for live sessions. Fullscreen shader + knob drawer, no editor overhead.

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
| **Cmd+Shift+D** | Toggle the knob drawer |

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
| Knob drawer | No | Yes | Yes |
| Code editor | No | No | Yes (Monaco) |
| Snapshot queue | No | Yes | No |
| MIDI support | Opt-in (`?midi=true`) | Always | Always |
| Hot-reload shaders | Full page reload | Hot-swap (no reload) | Hot-swap via editor |

## Hot-Swap Shader Updates

When a `.frag` file changes on disk, the jam page hot-swaps the shader code without reloading. This preserves tab audio sharing permissions — no need to re-pick the audio source tab after every shader edit.
