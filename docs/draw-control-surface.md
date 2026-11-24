# Draw as the show's control surface

A [draw](https://draw.hypnodroid.com) board on Aaron's phone can play the wall. He taps PANIC, drags a
fader, or pushes the XY dot, and the display responds. `scripts/vj/board-bridge.js` does the mapping,
and no model is involved. Storyboard: board `live-show-skills`, frame `ds` ("10 · Draw is the fader").
The live picture sits in frame `show` ("13 · Show surface"), and the controls are drawn around it.

## How fast it is

All figures were measured on 2026-11-24 against real draw and a local dev server. The phone was
headless Chromium emulating an iPhone 13. Every timestamp came from one clock. The harnesses are
`scripts/vj/board-bridge.measure.js` (taps) and `scripts/vj/board-fader.measure.js` (drags).

| path | median | p95 | n | bar |
|---|---|---|---|---|
| Send pressed → bridge hears it (listen long poll) | 128 ms | 145 ms | 40 | |
| Send pressed → knob applied on the wall | 155 ms | 197 ms | 40 | button < 300 ms: **passes** |
| whole button gesture (select tap + Send tap) → wall | 314 ms | 365 ms | 40 | about 300 ms |
| fader finger move → portal delta reaches the bridge | 151 ms | 197 ms | 64 | |
| fader finger move → wall, bridge writes on the display socket | 169 ms | 229 ms | 62 | fader < 100 ms: **misses** |
| fader finger move → wall, bridge writes with `set_params` | 236 ms | 448 ms | 58 | (why the socket is the default) |
| gap between fader updates on the wall | 106 ms | 168 ms | 60 | about 9.5 Hz |
| first update after the finger lands | 456 ms | 506 ms | 4 | |

- **Buttons work today.** A Send costs one long-poll answer and one MCP call.
- **Faders are usable, but they are not a dial.** The phone's draw client pushes a drag only every
  80 ms (`PUSH_MS` in draw's `frontend/src/board/sync.ts`), and each push still makes one round trip
  to draw and one back. That floor is about 150 ms. A drag never makes a Send, so no listener hears it;
  the bridge watches the frame on draw's portal socket instead. Use MIDI or the vjpad for moves that
  need to land on the beat.
- `set_params` waits for its read-back (about 300 ms), so writes queue behind each other. For that
  reason the bridge writes faders as `update-params` on the display's `/ws`, the path a dial takes,
  with `source: "board"`.

## Run it

1. Draw the controls once. `layout` prints the widgets skill and the draw ops. Knob names come from
   the shader's `knobs` in `shaders.json`, and each fader starts where the wall has that knob now:

   ```bash
   # around the live picture in Window's `show` frame (frame box, then picture box)
   node scripts/vj/board-bridge.js layout --shader clit-set/2 --frame show \
     --around 0,5600,1600,900 --picture 320,5780,960,540 > /tmp/controls.json
   # or a phone-width column frame of its own
   node scripts/vj/board-bridge.js layout --shader clit-set/2 --frame controls --x 0 --y 5860
   ```

   An agent then submits `skill` once with the draw MCP `skill` tool (board skill `vj-controls`) and
   applies `ops` with `draw`. Both are one-time costs. The bridge never draws controls.

2. Start the bridge. It needs a `listener` ticket minted for its own agent handle, such as
   `show-bridge`, so its Sends never land in an agent's inbox:

   ```bash
   DRAW_LISTEN_TICKET=<ticket> node scripts/vj/board-bridge.js --board <show board> --frame show \
     --panic clit-set/2 --setlist sun-set --status-link <status-card widget link>
   ```

   Ctrl-C or SIGTERM stops it cleanly: it closes the sockets and the MCP session, and sets the status
   card to "bridge stopped". Exit code 2 means the ticket expired: mint a new one and restart.

## The controls

There are three widgets in board skill `vj-controls` (`scripts/vj/board-controls.js`). Each one is a
single unit with a value.

| widget | instance id | the bridge reads | becomes |
|---|---|---|---|
| `vj-button` (tone `danger` / `go` / `plain`) | `ctl-panic`, `ctl-keep`, `ctl-prev`, `ctl-next`, `ctl-k<N>-<0..100>`, `prop-<id>-take` | a Send selecting `<id>-face` or `<id>-label` | the VJ MCP call in [the contract](live-show-contract.md#the-draw-board-bridge) |
| `vj-fader` | `fad-k<N>` | a portal delta moving `fad-k<N>-knob` along `fad-k<N>-track` | `update-params {knob_N}` with `source: "board"` |
| `vj-xy` | `xy-k<A>-k<B>` | a portal delta moving `xy-k<A>-k<B>-dot` over `-pad` | `update-params {knob_A: across, knob_B: up}` |

- The bridge ignores the whole frame that the portal sends when it connects. A reconnect therefore
  never yanks the wall back to where the board's knob was drawn.
- The bridge writes only knobs that move. When the board falls behind the wall, a single touch puts
  the fader back in charge.
- Status is a widget write through a link. It is never a Send or a chat line, so it wakes no agent.

## Who can play the wall

The bridge trusts the board. Anyone who can change the control frame drives the wall:

- **Buttons**: anyone who can Send on the board (its editors).
- **Faders and the XY pad**: any write that moves a knob part. That includes a person's drag, an
  agent's `draw`, and a script holding a frame `link` that covers the control frame.
- **Never shared**: the show board stays `access: user` (draw's default) with no editor but Aaron.
  Share it view-only, or not at all. Lane Back Door's unlisted boards will add a `controls` scope
  that allows only a Send and a knob drag; until that lands, an unlisted or shared link with edit
  rights is a link to the wall.
- **The ticket is a key**: the `listener` ticket reads the whole board for 8 h. Pass it in
  `DRAW_LISTEN_TICKET` rather than `--ticket`, and never paste it into a board, a chat or a doc.
- PANIC goes only to the fork given with `--panic` on the bridge's command line. The VJ MCP refuses a
  fork that is not a plain shader path, so a board cannot name what PANIC loads.

## What costs tokens, and what does not

- The bridge runs no model. Taps, drags, and status updates cost no tokens.
- A Send wakes every agent listening on the board unless it is addressed. Each control Send selects
  one small element, but a Send of the whole view lists every element in view. The bridge ignores
  view Sends; agents listening on the same board still receive them. **Keep the control frame on a
  board with no other agent listening**, or keep the agents' listeners on frames other than the
  controls, until draw can route a frame's Sends to one recipient by default.
- The layout is drawn once. Avoid redrawing the controls in a loop, because every draw reply is read
  by an agent.

## What draw needs (filed on redaphid/draw)

| gap | effect today | fix |
|---|---|---|
| Phones open on the hand tool | A tap pans the board and selects nothing, so a button takes three taps: tool, button, Send | open control frames, or boards marked as controls, on the select tool |
| No ticket route for a script to watch a frame | A script can watch drags only with a browser sign-in | `GET /api/listen/<board>/portal` with the listen ticket (draw PR from this lane) |
| `PUSH_MS` of 80 ms plus a round trip | Fader latency is about 150 ms, against a bar of 100 ms | widgets with a value that sends a compact control event at once, unthrottled |
| Small selected shapes get resize handles under the thumb | Dragging a knob can resize it instead | widget parts that move only along their slot |
| Control Sends wake every listener | Wasted tokens | a per-frame default Send recipient |
| Agent presence chips and camera-follow | Chips can cover controls; the camera may fly to an agent's write | keep chips off frames marked as controls; never follow a widget-value write |

Until draw has the ticket portal route, the bridge logs "faders off" once and retries every minute.
The buttons work regardless.

## KEEP onto the board, no model

`--kept-link <link to frame kept>` makes the bridge answer every page `keep` signal (vjpad, MIDI
pad, spacebar, `ctl-keep`) itself (`scripts/vj/board-kept.js`): a card in frame `kept` with the
time, shader and non-zero knobs, the picture saved to `.claude/vj-shots/keep-<time>.jpg`, and a
`-wip` or `-p<N>` shader copied to `.claude/keeps/`. No model sees the image. The picture stays
on disk until draw lets a link upload a file: a link takes ops only, and an image element needs a
file that only the draw MCP's `image` tool can upload (draw feedback 0cb3f01d, 2026-11-24).
