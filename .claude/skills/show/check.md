# /show check: the preflight

Before launch:

```bash
node scripts/vj/context.js                       # platform, port, dev server, show browser
P=$(./scripts/dev-port)
curl -s "http://localhost:$P/shaders/<shader>.frag" | cmp -s - shaders/<shader>.frag && echo "serving this checkout" || echo "SERVING ANOTHER CHECKOUT"
git branch --show-current; git fetch -q origin && git status -sb | head -1
node scripts/vj/show.js displays
```

After launch, through the VJ MCP:

```bash
PORT=$P node scripts/vj/mcp-call.js list_displays
PORT=$P node scripts/vj/mcp-call.js get_state '{"features":"core"}'      # twice, 2 s apart
```

| Check | ✅ when |
|---|---|
| Dev server | HTTP 200. Else `npm run dev` in a background Bash, then recheck. |
| Server checkout | `serving this checkout`. Edits in another checkout never reach the wall (2026-10-09). |
| Branch | the show branch, not behind. Ask before `git pull --ff-only`. |
| Projector | `displays` lists more than the built-in panel; `launch` uses the last one. |
| Display | `list_displays` shows the page; `get_state.shaderError` is null. |
| Audio | `audio.state` `running`; `audio.energy` reaches 0.02+ on loud music. Low: raise the OS input level first (a macOS mic at 27% barely registered, 80% worked, 2026-11-14), then `gain=` (a mic is 10-30x quieter than a line feed). |
| Runtime | `get_state.meter` is present (`?vj=1` booted). |
| Controller | its clock (`controller.cs_time` on clit-set, `bs_time` on the sun line) rises between the two reads. Else it is throwing: playbook section 7. |
| Gate | with music playing, the shader's quiet gate (`cs_presence`, `quietGate`) sits near 1. Low: fix the level, not the shader. |
| Pad | `get_state.live.pads` is 1 or more. (`pad-alive` fires only when the count changes, so a pad opened before the watcher never prints it.) |
| Stickers | only when he will use the NFC smileys: the vjpad's chip reads **NFC ●** (armed) and **AWAKE** is on. [docs/nfc-show-controls.md](../../../docs/nfc-show-controls.md) |
| Board | the bridge printed `{"bridge":"up",…}` and `st-wall` shows a number. |

`get_state` does not report the input device's label. Read it on the wall's machine (the OS
input setting), and say it to Aaron in the launch line.

**On the board.** One rectangle per check in frame `check`: id `chk-<key>`, `role: "healthy"` and
text `✅ <key>`, or `role: "error"` and `❌ <key>`; `expires: "30m"`, `source` = the command. Look
at the frame, then `viewport` him there with a note ("2 red: projector, audio"). When he selects a
red card and sends it, re-run that check, fix it if you can, repaint the card.

**Say in one line** what nothing can check: Do Not Disturb on; overlay, break-reminder and
dimming apps quit (Windows: Game Bar, Discord, Steam, GeForce overlays too); the OS input on the
line feed or mic; on Windows the show window kept in front (a covered window stops painting;
`show.js focus`).

Any ❌: fix it or tell him before launch. Never launch past a wrong-input ❌.
