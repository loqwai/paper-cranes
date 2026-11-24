---
name: show
description: "Run a live show: start the wall (\"start the show\", \"show time\", \"put it on the projector\"), check it is ready (\"preflight\", \"are we ready\"), get a safe look back when the wall goes wrong (\"panic\", \"it's black\", \"it froze\", \"get it back\"), play a setlist (\"play the sun set\", \"next beat\"), jam with no partner (\"just jam\", \"lite\"), or wrap up (\"end the show\", \"we're done\"). Puts the show on a draw board as Aaron's phone status board and control surface."
allowed-tools: Bash Read Write Edit Grep Glob Agent Monitor TaskStop
---

# /show: the one door for a live show

| Say | Does |
|---|---|
| `/show [shader] [audio=<label>] [gain=<x>] [board=<name>]` | launch: check, wall, board, bridge, then the `/partner` lane |
| `/show check` | preflight only, as ✅/❌ cards on the board |
| `/show lite [shader] [audio_file=<url>]` | a jam: wall, status and controls; no partner, critic or setlist |
| `/show panic [fork]` | a known-good look now, no reload |
| `/show setlist <name> [list\|next\|prev\|<n>\|auto]` | play `setlists/<name>.json` |
| `/show end` | stop lanes, process keeps, tell the set's story on the board |

Default shader: `clit-set/2` with `controller=clit-set` (knobs: `shaders/clit-set/clit-set.md`).
Load a reference file only when its step comes up:
[check.md](check.md) (preflight), [board.md](board.md) (board, controls, bridge),
[setlists.md](setlists.md) (setlists, the sun set), and
[docs/show-playbook.md](../../../docs/show-playbook.md) (runbook, failure fixes).

## Rules

- **Only the VJ MCP touches the page**: `PORT=$P node scripts/vj/mcp-call.js <tool> '<json>'` or the
  registered `paper-cranes-vj` tools. `scripts/vj/show.js` only for `launch`, `stop`, `status`,
  `displays`, `focus`, `move`, `shot`, `unstick`. Never `show.js eval`, devtools or
  claude-in-chrome (its cursor reaches the wall: "unacceptable for live shows", 2026-10-06).
- **Events, not polling**: `PORT=$P node scripts/vj/watch-events.js <types…>` as a Monitor.
- **You are the door, not the VJ.** You stay free for Aaron. Shader moves belong to `/partner`.
- **Spend few tokens.** No screenshot unless you must judge a picture (`screenshot {"width":256}`
  first); no board redraw when nothing changed; answer in one line.

## Launch

1. **Check** ([check.md](check.md)), then launch:
   ```bash
   P=$(./scripts/dev-port)
   node scripts/vj/show.js stop
   node scripts/vj/show.js launch "http://localhost:$P/jam.html?shader=<shader>&controller=<controller>&wavelet=true&vj=1&remote=display[&audio_device=<label>][&audio_gain=<x>]"
   ```
   Run check.md's page checks. Edits go to a `-wip` copy; the boot shader stays the PANIC fork.
2. **Write `.claude/vj-state.json`**: `{shaderPath, showUrl, audioDevice, audioGain, board, port, panic, setlist, startedAt}`.
3. **Board and bridge** ([board.md](board.md)): board `show-<yyyy-mm-dd>`, frames `check`,
   `status`, `controls`, `proposals`, `kept`; then `scripts/vj/board-bridge.js` in the background
   so his taps reach the page with no model. Fly his tab to `controls`.
4. **Watch** (Monitors, re-armed on expiry):
   ```bash
   PORT=$P node scripts/vj/watch-events.js keep panic pad-alive boot
   node scripts/vj/stray-guard.mjs
   ```
   - `keep`: put its screenshot in frame `kept` (board.md, "KEEP").
   - `pad-alive` false: paint `st-wall` blocked, tell him in one line.
   - `panic`: tell `/partner` to drop its move.
5. **Start `/partner`** (not in lite) as one background `Agent` with the shader, board and port.
   Tell Aaron in one line: wall up, input label, board link.

## Panic: `/show panic [fork]`

His PANIC (vjpad, its MIDI pad, `Esc Esc` on the jam page, the board) is faster; use this when
he asks you. `PORT=$P node scripts/vj/mcp-call.js panic '{"fork":"<fork>"}'` (no fork: the boot
fork). Pick a fork that reads the running controller: `clit-set/2` on clit-set, `sun/7` on the sun
line. Confirm with `screenshot {"width":256}`. Frozen picture: playbook section 7. Never `goto`.

## Lite: `/show lite`

Launch as above with the board's `status` and `controls` only; no partner, critic or setlist.
Away from a line feed, play a real file: `&audio_file=<url>` (docs/audio-file-playback.md), or
`&audio=tab` (docs/tab-audio.md). KEEP or spacebar saves moments for `/keep process`.

## End: `/show end`

1. Tell `/partner` to stop and wait for its last line. Stop the bridge, Monitors and your listener.
   Leave the wall up unless asked.
2. Run `/keep process` in a background agent.
3. Story on the board ([board.md](board.md), "Story"): frames `story-setlist`, `story-kept`,
   `story-forks`, Present path `show-story`; give Aaron the path link.
4. Journal `journals/<yyyy-mm-dd>-<show>.md`: what played, what was kept, what broke and the fix,
   his words verbatim, the board link.
5. Paint every status card `done`, stop every listener, delete `.claude/vj-state.json`.
