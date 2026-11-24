# VJ pad, MIDI and jam pages

The control-surface pages: `vjpad.html` builds touch pads from `vjpad-layouts.json` plus the knobs
the shader declares; `midi.html` maps MIDI CCs to knobs; `jam.html` is canvas only, with MIDI and
spacebar snapshots.

## Sub-features

- `vjpad-pads`: the pad page draws `.pad` elements for the active shader.
- `vjpad-send`: pressing a pad sends `update-params` to the displays on `/ws` or in the room.
- `midi-status`: the MIDI page settles its `#status` (headless has no MIDI permission, so it says
  so rather than hanging).
- `jam-canvas`: the jam page renders the shader with no on-screen UI.

## How to get to it (user POV)

- Phone: `/vjpad.html?shader=<path>` (dev) or `/vjpad.html?room=<room>` (production).
- Desktop: `/midi.html` with a controller plugged in; `/jam.html?shader=<path>&controller=<name>`.

## Driving it with Playwright

Preconditions:

- Any target for loading; a dev instance or a room for `vjpad-send`.

- **Pads.** `$B open "vjpad.html?shader=plasma" --viewport 390x844 --name vjpad --feature vjpad --eval "document.querySelectorAll('.pad').length"`.
  Expect more than 0.
- **Pad to display.** Hold a display open in the background (`$B open "?shader=plasma&remote=display&noaudio=true" --wait 25000 ... &`),
  open the vjpad on the same instance, press a `.pad` with `page.mouse` (down, move, up), then read
  the display's `window.cranes.messageParams` (or `get_state` through the VJ MCP). Not yet driven
  end to end by this skill: report it as unverified until a run records it.
- **MIDI.** `$B open midi.html --name midi --feature midi --wait 3000 --eval "document.querySelector('#status').textContent"`.
  Expect text that is not `Requesting MIDI access`.
- **Jam.** `$B open "jam.html?shader=plasma&noaudio=true&time=5" --canvas --name jam --feature jam`;
  expect a lit canvas.
- **Proof.** The screenshots and `.json` from each `open`.

## Gotchas

- Real MIDI cannot be exercised headless; `src/midi.test.js` covers the CC mapping in unit tests.
- The vjpad remembers its last shader in localStorage; a fresh Playwright context starts clean.
- `jam.html` adds `?controller=`s as a left-fold pipeline; a missing controller module fails the
  import, so check page errors.
