# The show board: status board and control surface

Every show gets a draw board (https://draw.hypnodroid.com, the draw MCP): `show-<yyyy-mm-dd>`,
or `board=<name>`. Aaron reads the wall's health there and taps controls from his phone; the taps
reach the page with no model in the path. Tests use a scratch board (`live-show-skills-test`),
never a show board.

## Rules for every agent on it

- **Name yourself and listen.** First minute: `open` the board with your own `agent` handle,
  `name` yourself (a short story-tip name) with an honest intent ("checking the input", "waiting
  on your answer"), run your `listener` command in the background (cache the script where it says,
  check its sha256). Update the intent when your state changes. Answer chat with one `say` line.
  Presence is what you are doing, never a fake cursor.
- **Look, draw, look.** `screenshot` the frame before and after you draw; `read` only for ids
  and numbers.
- **Pictures, 1-3 word labels**, colour for state (green ok, red broken). Frames 420 wide: one
  per phone screen.
- **Live numbers expire**: `expires` (2-10 m) and `source` on every status.
- **Redraw only what changed.** A widget op with the changed value, never the whole frame.
- **Move his camera** with `viewport` and a short `note` when there is something to see.
- **`feedback`** on any surprise. We maintain draw; feedback becomes draw work.
- **Leave it true**: final states painted, listeners stopped.

## Frames

| Frame | Holds | Written by |
|---|---|---|
| `check` | one card per preflight check (check.md) | `/show check` |
| `status` | `st-wall` (shader, fps, hands, pad), `st-partner` (taken/made) | bridge, `/partner` |
| `controls` | the buttons below | `/show`, once |
| `proposals` | the open proposal: `prop-<id>`, `prop-<id>-take`, `prop-<id>-drop` | `/partner` |
| `kept` | one card per KEEP: screenshot, time, shader, knobs | `/show` |
| `story-*` | the set's story, Present path `show-story` | `/show end` |

## Controls

Draw in frame `controls` (`role` colours): `ctl-panic` (error) and `ctl-keep` (healthy), the two
biggest; `ctl-prev` / `ctl-next` when a setlist is loaded; then for each of the 2-3 knobs he uses
most, a row `ctl-k<N>-0`, `-33`, `-66`, `-100` and `ctl-k<N>-off` (back to the dial). Knob names
come from `read_shader` (`// K4 ZOOM`). Draw `st-wall` in frame `status` with a `widget` op:
`status-card`, `expires: "10m"`.

**A tap**: he selects one control and presses **▶ Send to Claude**. The bridge sees a Send that
selects exactly one control and makes one VJ MCP call: `panic`, `keep`, `answer_proposal`, or
`set_params` / `set_shader` with `source: "board"` (his hands: never held). A Send of the whole
view, a chat line, or two controls fires nothing. Ids and calls: `docs/live-show-contract.md`.

Measured 2026-11-24, 7 real clicks (headless browser on draw, dev server and display on one
machine): Send to bridge **168-226 ms**; tap to the page confirming the value **523-1490 ms**,
median 805 ms (the `set_params` read-back samples fps for 300 ms). So the board is for beats,
KEEP, PANIC and knob presets; the dials and the vjpad stay the instrument (~16 ms).

## The bridge

1. Mint its ticket: `listener` with `agent: "show-bridge"`. Mint the status link: `link` with
   `target: "st-wall"`.
2. Run in the background, with a Monitor on its output:
   ```bash
   DRAW_LISTEN_TICKET=<show-bridge ticket> PORT=$P node scripts/vj/board-bridge.js --board <board> \
     --panic <boot shader> [--setlist <name>] --status-link <st-wall link>
   ```
   One JSON line per tap: `{sent, control, ok, ms}`. On `"status":"link refused"` (links last an
   hour) mint a new link and restart it. Exit 2: the ticket expired (8 h); mint another.
3. **Faders and an XY pad** (optional): `board-bridge.js layout --shader <name>` prints the
   `vj-controls` skill and draw ops; submit the skill once, `draw` the ops once. Drags reach the
   wall in ~170 ms (buttons ~155 ms); "faders off" in the log means draw lacks the ticket portal
   route, and buttons still work. Guide: `docs/draw-control-surface.md`.
4. **Whoever can edit the board plays the wall.** Keep the show board `access: user`, no other
   editors, and no other agent listening on it (each control Send wakes every listener).

## KEEP

On each `keep` event: `screenshot {"width":480}` through the VJ MCP, place it in frame `kept` with
the draw `image` tool, label it in one line (time, shader, the knobs that differ from 0). If the
shader is a `-wip` or a partner candidate (`-p<N>`), copy its file now to
`.claude/keeps/<time>-<name>.frag`, since that file keeps changing. The page has already queued
the snapshot for `/keep process`.

## Story (`/show end`)

Three frames, 420 wide: `story-setlist` (beats in order, with times), `story-kept` (a `portal`
onto frame `kept`, not copies), `story-forks` (each fork and preset `/keep process` made, with its
preview link). Then `present` with `name: "show-story"` over them, and give Aaron its link.
