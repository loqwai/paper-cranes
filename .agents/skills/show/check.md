# /show check: what each ❌ means and how to fix it

Read this for `/show check`, or when a `scripts/vj/preflight.js` line is ❌. The script runs every
check; this file is only the fixes.

```bash
P=$(./scripts/dev-port)
node scripts/vj/preflight.js --shader <shader>            # before launch
node scripts/vj/preflight.js --after --shader <shader>    # after launch (VJ MCP: list_displays, get_state twice)
```

| ❌ | Fix |
|---|---|
| server | `npm run dev` in a background Bash, then rerun. |
| checkout | The server runs from another checkout; edits here never reach the wall (2026-10-09). Restart it from this one. |
| branch | Behind the show branch. Ask Aaron before `git pull --ff-only`. |
| projector | Only the built-in panel. Plug it in as an extended display; `launch` uses the last display. On Linux, install `xrandr`. |
| display | No `?remote=display` page, or `shaderError` set: relaunch, or `panic` to the boot fork. |
| audio | `state` not `running`: the page needs a click or the mic permission. `energy` low: raise the OS input level first (a macOS mic at 27% barely registered, 80% worked, 2026-11-14), then `gain=` (a mic is 10-30x quieter than a line feed). Wrong `input`: fix the OS default input; never launch on it. |
| runtime | `?vj=1` is missing from the URL. |
| controller | Its clock (`cs_time`, `bs_time`) stands still: it is throwing. Playbook section 7, frozen picture. |
| gate | With music playing, the quiet gate (`cs_presence`, `quietGate`) sits low: fix the level, not the shader. |
| pad | No vjpad connected (`get_state.live.pads` 0). Open `/vjpad.html` on his phone. |
| stickers | Only when he uses the NFC smileys (not in the script): the vjpad chip reads **NFC ●** and **AWAKE** is on. [docs/nfc-show-controls.md](../../../docs/nfc-show-controls.md) |
| board | The bridge never printed `{"bridge":"up",…}` or `st-wall` shows no number: see controls.md. |

**On the board.** One card per line in frame `check` (controls.md). Look at the frame, then
`viewport` him there with a note ("2 red: projector, audio"). When he selects a red card and sends
it, rerun that check, fix it if you can, repaint the card.

Any ❌: fix it or tell him before launch.
