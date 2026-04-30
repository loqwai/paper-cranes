# MIDI Controller Mapping

Physical MIDI controllers (knobs, sliders, buttons) can drive shader parameters in real time. The system auto-maps MIDI CC messages to `knob_1`–`knob_200` uniforms and persists profiles per device in `localStorage`.

## Mapping Page (`/midi.html`)

Open `/midi.html` to manage mappings visually. Three columns:

- **Devices** — every profile in `localStorage`, with a green dot for any device sending CCs in the current session
- **CC → Knob** — every mapping for the selected device. Edit the knob index inline, watch live value bars when CCs fire, click `×` to unmap
- **Knobs** — `knob_1`..`knob_N` grid. Click a tile to learn-bind: the next CC from any controller maps to that knob, replacing any prior mapping

Mappings persist to the same `cranes-midi-profiles` localStorage key the rest of the app reads, so changes apply on the next shader page load.

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

## Key Files

- `src/midi/MidiMapper.js` — profile storage, auto-assignment, and learn mode
- `src/midi.js` — Web MIDI API integration and CC event handling
