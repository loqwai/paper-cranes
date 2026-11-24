---
name: show
description: "Run a live show: start the wall (\"start the show\", \"show time\", \"put it on the projector\"), check it is ready (\"preflight\", \"are we ready\"), get a safe look back when the wall goes wrong (\"panic\", \"it's black\", \"it froze\", \"get it back\"), play a setlist (\"play the sun set\", \"next beat\"), jam with no partner (\"just jam\", \"lite\"), or wrap up (\"end the show\", \"we're done\"). Puts the show on a draw board as Aaron's phone status board and control surface."
allowed-tools: Bash Read Write Edit Grep Glob Agent Monitor TaskStop
---

# /show: the one door for a live show

This skill gets the wall up, keeps it honest, and puts the show on a draw board that Aaron can
see and tap from his phone. The runbook, knob maps, story and failure fixes are in
**[docs/show-playbook.md](../../../docs/show-playbook.md)**. Brief every agent with
**docs/vj-preferences.md**.

| Sub-command | What it does |
|---|---|
| `/show [shader] [audio=<label>] [gain=<x>] [board=<name>]` | **launch** (the default): check, launch, board, bridge, then start the `/partner` lane |
| `/show check` | the preflight only, on the board as ✅/❌ cards |
| `/show lite [shader] [audio=…\|audio_file=<url>]` | a jam: launch plus status and controls, no partner, no critic, no setlist (what `/jam` did) |
| `/show panic [fork]` | a known-good look on the wall now, no reload |
| `/show setlist <name> [list\|next\|prev\|<n>\|auto]` | play a setlist from `setlists/<name>.json` |
| `/show end` | stop the lanes, process what was kept, tell the set's story on the board |

No shader given: the clit-set voyage, `clit-set/2` with `controller=clit-set` (knob map at the
end). `audio=<label>` adds `&audio_device=<label>`; leave it out to use the OS default input.
`gain=<x>` adds `&audio_gain=<x>` for a microphone (a mic hearing the room arrives 10-30x quieter
than the line feed the gates were tuned for).

## One control plane

- **Everything that touches the page goes through the VJ MCP** (`docs/vj-mcp.md`): the registered
  `paper-cranes-vj` MCP, or `node scripts/vj/mcp-call.js <tool> '<json>'` from a shell
  (`PORT=<port>` picks the dev server). Read with `get_state`, `screenshot`, `wait_for_event`;
  act with `set_params`, `set_shader`, `write_shader`, `propose` (when the page has it).
- **`scripts/vj/show.js` is only for what needs the OS:** `launch`, `stop`, `status`, `displays`,
  `focus`, `move`, `shot`, `unstick`. Never `show.js eval`, never devtools, never claude-in-chrome
  (its cursor and infobar end up on the wall; "unacceptable for live shows", Aaron, 2026-10-06).
- **Watch events with `node scripts/vj/watch-events.js [types…]`**, one line per event, as a
  Monitor. It replaces tailing `.claude/vj-signals.jsonl` and the CDP dial poll.

## The board

Every show gets a draw board (https://draw.hypnodroid.com, the draw MCP): `show-<yyyy-mm-dd>`
unless `board=<name>` is given. It is a **status board and a control surface**: Aaron reads the
wall's health and taps controls from his phone, and the taps reach the page with no model in the
path. Tests use a scratch board (`live-show-skills-test`), never a show board.

Draw rules for every agent on a show board (from `~/.claude/CLAUDE.md`):

- **Name yourself and listen.** In your first minute: `open` the board with your own `agent`
  handle, `name` yourself (a short story-tip name) with an honest intent ("checking the input",
  "waiting on your answer"), and run your `listener` command in the background (cache the script
  at the path it gives and check its sha256). Update the intent on every state change. Answer
  Aaron's chat with `say`. Presence is what you are actually doing, never a fake cursor.
- **Look before you read, and look at what you drew.** `screenshot` the frame before you add to
  it and after; fix what does not read at a glance; `read` only for exact ids and numbers.
- **Pictures, not sentences.** Big shapes, 1-3 word labels, colour carries state (green ok,
  red broken). Frames are 420 wide so a phone shows one at a time.
- **Live numbers expire.** Every status item gets `expires` (2-10 m) and `source`.
- **Move his camera when there is something to see:** `viewport` on the frame with a short
  `note`.
- **File draw `feedback`** the moment the board surprises you (an unclear error, a layout that
  breaks, a missing feature for live control). We maintain draw; feedback becomes draw work.
- **Leave it true.** At the end, every status says its final state and every listener is stopped.

Frames on a show board, top to bottom:

| Frame | Holds | Written by |
|---|---|---|
| `check` | one card per preflight check, ✅ green or ❌ red | `/show check` |
| `status` | status card `st-wall`: shader, fps, hands, pad; `st-partner`: what the partner is doing | the bridge (`st-wall`), `/partner` |
| `controls` | `ctl-panic`, `ctl-keep`, `ctl-prev`, `ctl-next`, knob buttons `ctl-k<N>-<0..100>`, `ctl-k<N>-off` | `/show` once; the bridge acts on them |
| `proposals` | one card per open proposal: `prop-<id>` with `prop-<id>-take` and `prop-<id>-drop` | `/partner` |
| `kept` | one card per KEEP: the screenshot, time, shader, knobs | `/show` lane on each `keep` |
| `story-*` | the set's story after `/show end`, with the Present path `show-story` | `/show end` |

**How a tap works.** Aaron selects one control on his phone and presses **▶ Send to Claude**.
`scripts/vj/board-bridge.js` listens on the board as the agent `show-bridge`, sees a Send that
selects exactly one control, and makes one VJ MCP call: `panic`, `keep`, `answer_proposal`, or
`set_params` / `set_shader` with `source: "board"` (his hands, never held by the HANDS lock).
A Send of the whole view, a chat line, or a selection with two controls fires nothing. The
page side and the bridge's id table are in `docs/live-show-contract.md`. Measured on
2026-11-24 (7 real clicks, headless browser on the draw board, dev server and headless display on
one machine): Send to bridge **168-226 ms**, tap to the page confirming the value **523-1490 ms**
(median 805 ms; `set_params` reads the value back, and that read samples fps for 300 ms). So a
board tap is for "next beat", "keep", "panic", a knob preset; his dials and the vjpad stay the
instrument (one frame, ~16 ms).

## 1. Check (`/show check`, and the first step of every launch)

```bash
node scripts/vj/context.js                       # platform, port, dev server, show browser
P=$(./scripts/dev-port)
curl -s "http://localhost:$P/shaders/<shader>.frag" | cmp -s - shaders/<shader>.frag && echo "serving this checkout" || echo "SERVING ANOTHER CHECKOUT"
git branch --show-current; git fetch -q origin && git status -sb | head -1
node scripts/vj/show.js displays
```

After launch (step 2), the page checks, all through the VJ MCP:

```bash
PORT=$P node scripts/vj/mcp-call.js list_displays
PORT=$P node scripts/vj/mcp-call.js get_state '{"features":"core"}'      # twice, 2 s apart
```

| Check | ✅ when |
|---|---|
| Dev server | HTTP 200. Else start `npm run dev` in a background Bash and recheck. |
| Server checkout | `serving this checkout`: edits in any other checkout never reach the wall (2026-10-09). |
| Branch | the show branch, not behind. Ask before `git pull --ff-only`. |
| Projector | `displays` lists more than the built-in panel; `launch` uses the last one. |
| Display | `list_displays` shows the show page, `get_state.shaderError` is null. |
| Audio | `audio.state` is `running` and `audio.energy` reaches 0.02+ on loud music (else `gain=`, or raise the OS input level first: a macOS mic at 27% barely registered, 80% worked, 2026-11-14). |
| Runtime | `get_state.meter` is present (the `?vj=1` runtime booted). |
| Controller | a controller clock (`controller.cs_time` on clit-set, `bs_time` on the sun line) is higher on the second read. If not, the controller is throwing: playbook section 7. |
| Gate | with music playing, the shader's quiet gate (`cs_presence`, or `quietGate`) sits near 1. Low means the input is too quiet: fix the level, not the shader. |
| Pad | a `pad-alive` event with `alive: true` within 10 s of opening the vjpad (`watch-events.js pad-alive`). |
| Board | the bridge printed `{"bridge":"up", …}` and `st-wall` shows a number. |

**Put the checklist on the board.** One rectangle per check in frame `check` (id `chk-<key>`,
`role: "healthy"` with `✅ <key>` or `role: "error"` with `❌ <key>`), each with `expires: "30m"`
and its `source` (the command above). Screenshot the frame, then `viewport` Aaron to it with a
note such as "2 red: projector, audio". When he selects a red card and sends it, your listener
wakes you: re-run that check, fix it if you can, repaint the card.

Say the out-of-band reminders in one line, since nothing can check them: Do Not Disturb on, any
overlay, break-reminder or dimming app quit (on Windows also Game Bar, Discord, Steam and GeForce
overlays), the OS input set to the line feed or mic, and on Windows the show window kept in front
(Windows stops painting a covered window; `show.js focus`).

Any ❌ means fix it or tell Aaron before launching. Never launch past a wrong-input ❌.

## 2. Launch

```bash
node scripts/vj/show.js stop
node scripts/vj/show.js launch "http://localhost:$P/jam.html?shader=<shader>&controller=<controller>&wavelet=true&vj=1&remote=display"
```

Then run the page checks above and look once: `node scripts/vj/show.js shot .claude/vj-shots/show-start.png`,
and Read it. A black frame while `energy` moves is a poisoned feedback buffer: `show.js unstick`.

**Scratch copy.** Edits go to a `-wip` copy of the boot shader (`clit-set/2-wip`), never the boot
shader itself, which stays the PANIC fallback. If the `-wip` file is already tracked it holds an
earlier set: start from it, or copy to a new name.

Write `.claude/vj-state.json`: `{ shaderPath, showUrl, audioDevice, audioGain, board, port, panic, setlist, startedAt }`.

## 3. The board and the bridge

1. `open` the show board as agent `show`, `name` yourself, start your listener (rules above).
2. Draw frames `check`, `status`, `controls`, `proposals`, `kept` (420 wide, stacked). The
   controls: `ctl-panic` (red) and `ctl-keep` (green) as the two biggest shapes, `ctl-prev` /
   `ctl-next` under them when a setlist is loaded, then a row of 4 buttons for each of 2-3 named
   knobs Aaron uses most (`ctl-k<N>-0`, `-33`, `-66`, `-100`, plus `ctl-k<N>-off` to hand it back
   to the dial). Knob names come from `list_shaders` / `read_shader` (`// K4 ZOOM` comments).
   Draw the `st-wall` status card with a `widget` op (`status-card`, `expires: "10m"`).
3. Mint the bridge's ticket and the status link: `listener` with `agent: "show-bridge"`, and
   `link` with `target: "st-wall"`.
4. Start the bridge in the background, and put a Monitor on its output:
   ```bash
   PORT=$P node scripts/vj/board-bridge.js --board <board> --ticket <show-bridge ticket> \
     --panic <boot shader> [--setlist <name>] --status-link <st-wall link>
   ```
   It prints one JSON line per action (`{sent, control, ok, ms}`). On `"status":"link refused"`
   (links last an hour) mint a new `st-wall` link and restart it. Exit code 2 means the ticket
   expired (8 h): mint another.
5. Screenshot `controls` and `status`, then `viewport` Aaron onto `controls`.

## 4. Watch, then hand off

Monitors, each re-armed when it expires:

```bash
PORT=$P node scripts/vj/watch-events.js boot clip too-dark keep panic pad-alive   # health and moments
node scripts/vj/stray-guard.mjs                                                   # closes stray pages on the wall
```

- **`keep`** (the vjpad's KEEP, its MIDI note, `k` on the jam page, or the board's KEEP through
  the bridge): take `screenshot` through the VJ MCP, place it in frame `kept` with the draw
  `image` tool, with a 1-line label (time, shader, the knobs that differ from 0). The page has
  already saved the moment to the snapshot queue (`shaders/<shader>/docs/.snapshots/`), which
  `/keep process` turns into forks and presets after the set.
- **`pad-alive` with `alive: false`**: the pad's socket dropped. Paint `st-wall` blocked, tell Aaron
  in one line. Idle must never look the same as broken (2026-08-20: the pad was dead for 4 min).
- **`clip`, `too-dark`, `boot`**: the partner lane fixes these. You only tell Aaron if it cannot.

Then start the **`/partner` lane** (not in `lite`): one background `Agent` that runs `/partner`
with the shader, board and port. You stay in Aaron's session, answering him. You never make
shader moves yourself; you are the door, not the VJ.

## Panic: `/show panic [fork]`

Gets a known-good look on the wall without a reload. **Never `goto` mid-set.**

1. The page's own PANIC (vjpad button or its MIDI pad) is the fastest; use this only when he
   asks you.
2. If the VJ MCP lists a `panic` tool, call it. Otherwise:
   `PORT=$P node scripts/vj/mcp-call.js set_shader '{"shader":"<fork>"}'`. The default fork is
   `.claude/vj-state.json`'s `panic` (the boot shader). The running controller stays, so pick a
   fork that reads it: `clit-set/2` (or `/1`) on clit-set; `sun/7` on the sun line.
3. Tell the partner lane to stop its current move; screenshot to confirm.
4. If the picture is frozen (the controller is throwing), see the playbook's failure runbook.

## Setlists: `/show setlist <name> …`

A setlist is `setlists/<name>.json`: `{ name, about, shader, controllers, url, panic?, driver?, cue?, beats: [{ n, name, shader, params?, cue? }] }`.
Notes for playing it, beat by beat, sit in `setlists/<name>/SETLIST.md` when it has them; read
them before the first beat.

- **Launch** with the setlist's `shader`, `&controller=` for each of `controllers` in order, and
  its `url` extras, then `--setlist <name>` on the bridge so ◀ and ▶ on the board play beats.
- **`list`**, **`next`**, **`prev`**, **`<n>`**: a beat is `set_shader {shader, params}` through
  the VJ MCP. A setlist with a `driver` plays a beat by running it instead
  (`node <driver> <n>`), because it needs more than a swap. The current beat is in
  `.claude/setlist-state.json` (shared with the bridge).
- **`auto`** (setlists with a `cue` script): put a Monitor on `node <cue> <beat's cue> --max <hold>`;
  on its line, play the next beat. A dial Aaron holds at an extreme pauses auto.

**The sun set** (`setlists/sun-set.json`): the 2026-10-09/10 set, 13 beats from the pre-party
tile sky to the OG sky return, under `controller=black-sun&controller=sun-set`. Its driver
`setlists/sun-set/swap.mjs` re-anchors each fork's clocks so new layers fade in, and
`controllers/sun-set.js` eases Aaron's own dial moves back in. Read
`setlists/sun-set/SETLIST.md` first. The driver still applies the swap through `show.js eval`;
porting it to `write_shader` is open work.

## Lite: `/show lite`

What `/jam` did, without claude-in-chrome. Launch as in step 2 (shader and its controller), the
board with `status` and `controls` only, and the bridge. No partner, no critic, no setlist. For
audio-reactive work away from a line feed, play a real file through the analyzer:
`&audio_file=<url>` (docs/audio-file-playback.md), or `&audio=tab` (Chrome, docs/tab-audio.md).
Snapshots: the jam page's spacebar, or KEEP; `/keep process` turns them into forks and presets.

## End: `/show end`

1. Tell the partner lane to stop and wait for its final line. Stop the critic, the bridge, the
   watchers and your listener. Leave the wall up unless Aaron asks (`show.js stop` closes it).
2. Run `/keep process` in a background agent; it returns the forks and presets it made.
3. Tell the set's story on the board, one frame each, 420 wide: `story-setlist` (the beats that
   played, in order, with times), `story-kept` (the kept moments' screenshots, from frame `kept`
   by `portal` rather than copies), `story-forks` (each fork and preset made, with its preview
   link). Make the Present path `show-story` over them and give Aaron its link.
4. Write `journals/<yyyy-mm-dd>-<show>.md`: what played, what was kept, what broke and how it was
   fixed, Aaron's words verbatim. Link the board.
5. Paint every status card final (`done`), stop every listener, delete `.claude/vj-state.json`.

## clit-set: the default series

`clit-set/2` is a slow, knob-steered voyage through the clit/2 fractal. Every dial at 0 is the
autopilot: six waypoints, home every 10 minutes, so a reload (all dials read 0) still looks right.
Full doc: `shaders/clit-set/clit-set.md`.

| Row | Dial 1 | Dial 2 | Dial 3 | Dial 4 |
|-----|--------|--------|--------|--------|
| 1 navigate | k1 X | k2 Y | k3 VOYAGE | k4 ZOOM |
| 2 shape | k5 TURN | k6 POWER | k7 BODY | k8 CURL |
| 3 colour | k9 HUE | k10 NEBULA | k11 TRAILS | k12 REACT |
| 4 light | k13 GLASSES | k14 EMBER | k15 SPOT | k16 LACE |

- k1, k2 and k3 at 0 are the autopilot; manual control blends in over the first 8% of the dial.
- k4 to k8 add on top of the voyage. Zoom stops at 3x; past that the lace turns to speckle.
- Audio never moves the camera. It drives lace breath, rim, stars, the ember and the drop spotlight.
- `&voyage0=<0..6>` starts the autopilot at another waypoint (the NFC variants use it).

For any other shader, add `&controller=` only when a matching `controllers/*.js` exists: `sun/N`
pairs with `controller=sun-N` (`sun/1` with `sun`), `claude/wip/black-sun/sun-1` with `black-sun`.
