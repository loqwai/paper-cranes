# Controls and the bridge (launch only)

- `check`: per preflight line a card `chk-<key>`, `role` healthy `✅ <key>` or error `❌ <key>`,
  `expires: "30m"`, `source` = the command.
- `status`: `st-wall` as a `widget` op, `status-card`, `expires: "10m"`; the bridge refreshes it.
- `controls`: `ctl-panic` (error) and `ctl-keep` (healthy), the biggest; `ctl-prev` / `ctl-next`
  with a setlist; for his 2-3 top knobs `ctl-k<N>-0`, `-33`, `-66`, `-100`, `-off` (names from
  `read_shader`, `// K4 ZOOM`).

**Bridge** (no model in the path; ids in `docs/live-show-contract.md`): mint `listener` with
`agent: "show-bridge"` and `link` with `target: "st-wall"`, then run in the background under a
Monitor:

```bash
PORT=$P node scripts/vj/board-bridge.js --board <board> --ticket <ticket> --panic <boot shader> [--setlist <name>] --status-link <link>
```

One JSON line per tap. `"status":"link refused"`: mint a link (they last an hour), restart.
Exit 2: the ticket expired (8 h); mint another.
