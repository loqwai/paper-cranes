# MIDI Controller Mapping

Physical MIDI controllers (knobs, sliders, buttons) can drive shader parameters in real time. The system auto-maps MIDI CC messages to `knob_1`–`knob_200` uniforms and persists profiles per device in `localStorage`.

## Turning MIDI on

`src/midi/midiPolicy.js` decides, from the URL alone:

| Page | MIDI | When it asks for the permission |
|---|---|---|
| `index.html` | off; `?midi=true` turns it on | at load |
| `index.html` in live mode (`?remote=display`, `?wall=1` or `?vj=1`) | on; `?midi=false` turns it off | granted: at load. Would prompt: on the first tap (the tap that starts audio). Denied or no Web MIDI (Safari, Firefox without the add-on): never, one console line |
| `jam.html`, `show.html` | always; `?midi=false` turns it off | as `index.html`: at load, or gated in live mode |
| `vjpad.html`, `mirror.html` | never: the pad sends knobs over its socket or link, the mirror only watches | |

An explicit `?midi=true` always asks at load, live mode or not. The show browser
(`scripts/vj/show.js`) grants MIDI over CDP and in its profile, so a wall there connects at load
with no prompt. `window.cranes.midiState` says what happened: `requested` (asked at load),
`connected`, `waiting` (for a tap), `denied` or `unsupported`.

## Mapping Page (`/midi.html`)

Open `/midi.html` to manage mappings visually. Three columns:

- **Devices** — every profile in `localStorage`, with a green dot for any device sending CCs in the current session
- **CC → Knob** — every mapping for the selected device. Edit the knob index inline, watch live value bars when CCs fire, click `×` to unmap
- **Knobs** — `knob_1`..`knob_N` grid. Click a tile to learn-bind: the next CC from any controller maps to that knob, replacing any prior mapping

Mappings persist to the same `cranes-midi-profiles` localStorage key the rest of the app reads. A shader page already open in another tab picks the change up at once (it listens for the `storage` event), and its own auto-assignments never overwrite what you set here.

## Auto-Assignment

Plug in a MIDI controller and turn a knob. The first CC message from a new device gets assigned to `knob_1`, the second to `knob_2`, etc. Assignments persist across page reloads via `localStorage` under the key `cranes-midi-profiles`.

## Learn Mode

To map a specific MIDI CC to a specific knob index:

1. Enter learn mode for the target knob (via `/midi.html` or the editor's knob UI)
2. Move the physical knob/slider on your controller
3. The CC is mapped to that knob index, replacing any previous mapping

Learn mode reassigns cleanly — if the CC was previously mapped elsewhere, the old mapping is removed.

## Multi-Device Support

Profiles are keyed by MIDI device name. Different controllers maintain independent mappings, so switching between devices preserves each one's layout.

## Using Knobs in Shaders

Knobs are injected as float uniforms (0–1 range):

```glsl
// Direct knob control
#define BRIGHTNESS (knob_1)

// Swap between audio and knob
#define BRIGHTNESS (spectralCentroidNormalized)
// #define BRIGHTNESS (knob_1)
```

Knobs can also be set via URL query params (`?knob_1=0.5`) or the ParamsManager API.

## PANIC and KEEP buttons

One CC or note can be bound to each of the live show's two buttons
([contract](live-show-contract.md)). A bound control fires once per press (a note-on, or a CC
crossing up through 64) and never reaches the knob mapper.

- **From the URL**, persisted in `localStorage['cranes-midi-actions']`:
  `?midi_panic=cc:64`, `?midi_keep=note:36`; add `:<channel>` to pin a channel (`cc:64:2`).
- **Learn**: in the console, `cranes.midiActions.learn('panic')`, then press the button.
- **Change or clear**: `cranes.midiActions.set('keep', 'cc:20')`, `cranes.midiActions.set('keep', null)`.

They act on the page MIDI is plugged into: the display's live show (`?remote=display`, or show
with `?room=`), where PANIC swaps to the boot fork in place and KEEP saves a snapshot and signals
`keep`. On a page with no live show, KEEP saves a plain snapshot and PANIC does nothing. Every
mapped knob move also turns the display's HANDS lock on.

## Key Files

- `src/midi/MidiMapper.js` — profile storage, auto-assignment, and learn mode
- `src/midi.js` — Web MIDI API integration and CC event handling
- `src/midi/MidiActions.js` — PANIC / KEEP bindings, learn and edge detection
