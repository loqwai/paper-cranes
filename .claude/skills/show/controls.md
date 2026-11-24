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
DRAW_LISTEN_TICKET=<ticket> PORT=$P node scripts/vj/board-bridge.js --board <board> --panic <boot shader> [--setlist <name>] --status-link <link>
```

The env var keeps the ticket (8 h read of the whole board) out of `ps`. One JSON line per tap.
`"status":"link refused"`: mint a link (they last an hour), restart. Exit 2: the ticket expired;
mint another.

- **Faders and an XY pad** (optional): `board-bridge.js layout --shader <name>` prints the
  `vj-controls` skill and draw ops; submit the skill once, `draw` the ops once. Drags ~170 ms.
  "faders off" in the log: draw lacks the ticket portal route; buttons still work.
  `docs/draw-control-surface.md`.
- **Whoever can edit the board plays the wall.** Show board `access: user`, no other editors, no
  other agent listening on it (each control Send wakes every listener).
- **Stickers**: the NFC smileys send KEEP, PANIC, NEXT/PREV, TAKE/DROP from the armed vjpad
  (`/vjpad?room=<room>&nfc_show=<show>`), no board or model in the path. Their NEXT/PREV cursor is
  the phone's, not the bridge's: use one or the other for beats. `docs/nfc-show-controls.md`.
