# Relay room

A display opened with `?remote=display&room=<room>`, on production or a preview, joins
`wss://relay.beadfamous.com/ws/<room>`. Anything in the room (the vjpad, another laptop) can send it
knobs; keys that must stay pinned (`controller`, `relay`, `room`) are refused.

## Sub-features

- `room-join`: the display connects and the relay counts it in (`status`, `connectedClients`).
- `room-knob`: a peer's `update-params` `{knob_7: 0.42}` lands in `window.cranes.messageParams`.
- `room-pinned`: a peer's `controller` (or `relay`, `room`) is dropped from `messageParams` and from
  the mirrored URL.
- `room-signals`: a `?vj=1` display's `vj-signal` frames are not relayed to peers.

## How to get to it (user POV)

- Open `https://visuals.beadfamous.com/?shader=plasma&remote=display&room=<room>` on the wall and
  `https://visuals.beadfamous.com/vjpad.html?room=<room>` on a phone.

## Driving it with Playwright

Preconditions:

- Network access to production and the relay. A fresh random room per run
  (`verify-<random>`), never a show's room.

- **Display.** Open the display URL above with `noaudio=true`, in Chromium, and wait for frames.
- **Peer.** From Node, `new WebSocket('wss://relay.beadfamous.com/ws/<room>', { headers: { Origin: 'https://visuals.beadfamous.com' } })`
  (`ws` package), then send
  `{"type":"update-params","data":{"knob_7":0.42,"controller":"evil"}}`.
- **Read back.** After about 2 s:
  `page.evaluate(() => ({ mp: window.cranes.messageParams, href: location.href }))`. Expect
  `mp.knob_7 === 0.42`, no `controller` in `mp`, and no `controller=` in `href`.
- **Committed check.** The smoke suite's `e2e/relay.test.js` (branch `e2e/smoke-suite`) does all
  of this with `E2E_RELAY=1`; prefer it once it lands. Tonight's scratch versions were
  `verify.mjs` (remote block) and `live-relay.mjs` in the coordinator's scratchpad.
- **Proof.** The peer's received messages, the display's `messageParams` before and after, and a
  screenshot.

## Gotchas

- The room name is the only lock: anyone who knows it can join. Use a random one.
- A non-browser peer can send any `Origin`; the relay's display check stops web pages, not scripts.
- `update-params` is applied on arrival (no frame batching), so read back after a short wait,
  not in the same tick.
