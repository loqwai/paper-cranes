# Live-show contract: page <-> agents

The live-show redesign (board [live-show-skills](https://draw.hypnodroid.com/b/live-show-skills),
frames f5-f8, approved by Aaron 2026-11-24: "Yes to all. And also: the skills should integrate with
draw") splits the show in two:

- **The page** does everything that must be instant: the HANDS lock, PANIC, KEEP, proposal cards.
  No model is in any of those paths.
- **The agents** (`/show`, `/partner`, `/keep`, the draw board bridge) watch the page's signals and
  propose. `/partner` PROPOSES changes to Aaron's dials; KEEP applies them. Agents apply only health
  fixes directly, and even those wait for the HANDS lock to end.

The page half lives in `src/vj/live.js` (the state machine) and is wired by
`src/remote/RemoteDisplay.js` (any `?remote=display` page: jam, show, index). The agent half is the
VJ MCP (`vite-plugins/vj-mcp/server.js`, served by the dev server and by the relay room).

## Who wrote it: `source`

Every `update-params` message may carry a top-level `source` beside `type` and `data`:

| source | sent by | held by HANDS? | turns HANDS on? |
|---|---|---|---|
| (none) | Aaron's own controls: vjpad, MIDI, edit page, list page, `remote-send.js` | never | yes, for knob keys |
| `"board"` | the draw board bridge (`scripts/vj/board-bridge.js`), via `set_params {source:"board"}` | never | yes, for knob keys |
| `"agent"` | any VJ MCP write (`set_params`, `set_shader`, `write_shader`), the default | yes | no |

`source` is read only to decide holding. A forged `"agent"` makes a write wait; it can never make a
write skip the lock, so it grants nothing.

## Page -> agents: signals

Emitted as vj-signals (`{type, ...}`) when the page has `?vj=1`. They reach agents through the VJ MCP
`wait_for_event` (dev: `POST /__vj-signal`; relay: the room socket). Filter with
`wait_for_event {types:["hands","release","keep","panic","pad-alive","proposal-taken","proposal-dropped"]}`.

| signal | payload | when |
|---|---|---|
| `hands` | `{on: boolean, knob: "knob_N"\|null}` | `on:true` at the first dial/pad/MIDI/board move; `on:false` 8 s after the last move (`?hands_ms=` overrides). `knob` is the knob that started it (null on off). |
| `release` | `{knob, value}` | a dial or pad went still for ~50 ms (`?release_ms=` overrides) |
| `keep` | `{shader, params, t}` | Aaron pressed KEEP. `params` = every knob and pinned param now on screen. The page also saves a snapshot through the page's own snapshot path (jam: `/__snapshot-preset`; show: dev server or localStorage). |
| `panic` | `{fork}` | PANIC was pressed; the page has already swapped to `fork` |
| `pad-alive` | `{alive: boolean, pads: n}` | `true` when a vjpad connects; `false` when the last one has been silent more than 5 s |
| `proposal-taken` | `{id}` | KEEP on a proposal card; its params are already applied |
| `proposal-dropped` | `{id, why}` | `why`: `"dismissed"`, `"timeout"` (30 s), `"replaced"` (same id proposed again), `"panic"` |

## Agents -> page

### HANDS gate

While `hands` is on, `source:"agent"` writes are HELD in the page:

- `set_params` values: held, newest-wins per key, applied in one message when the lock ends.
- `set_shader` / `write_shader` (shader name or code): held, newest wins, applied when the lock ends.
  A shader write is never applied mid-lock.
- Aaron's own writes (no source, or `"board"`) apply synchronously on arrival, exactly as before
  (CLAUDE.md "Hot-path rule"). The gate adds nothing to that path but a timestamp.
- PANIC clears everything held.

An MCP write that was held answers `{held: true}` (set_params/set_shader) instead of a read-back,
since the page has not applied it yet.

### VJ MCP tools (new or changed)

| tool | args | does |
|---|---|---|
| `set_params` | `{display?, params, source?: "agent"\|"board"}` | as before; `source` defaults to `"agent"` (held by HANDS). The board bridge passes `"board"`. |
| `propose` | `{display?, id, label, params, shader?}` | shows a one-line proposal card on every connected vjpad (and a chip on the display only with `?vj=1&show_proposals=1`). Times out after 30 s. |
| `answer_proposal` | `{display?, id, take: boolean}` | the card's KEEP (`take:true`) or dismiss (`take:false`), for the board bridge |
| `keep` | `{display?}` | presses KEEP on the display |
| `panic` | `{display?, fork?}` | presses PANIC; `fork` overrides the boot fork for this press |

Every one of these reaches the page as one message on the display's own socket; the page then acts
exactly as for the on-screen/vjpad/MIDI control.

### Proposals

- The page owns them. It keeps at most one card per `id`, broadcasts `proposal` /
  `proposal-clear` to the room so every vjpad shows the same cards, and times each out after 30 s.
- KEEP on a card applies its `params` (and `shader`, if given) as Aaron's own write (not held), then
  emits `proposal-taken`. Dismiss emits `proposal-dropped {why:"dismissed"}`.

### PANIC

- Swaps to the **boot fork** in-page: no reload, no agent. The boot fork is `?panic=<fork>` when
  given, else the `shader` the page loaded with. Its source is fetched at boot so the press does no
  network work when the fetch already succeeded.
- Drops held agent writes and open proposals.
- Controls: the big PANIC on vjpad, a MIDI CC or note (`?midi_panic=cc:N` / `note:N`, persisted),
  the VJ MCP `panic` tool, and `Escape` twice within 1 s on jam/show.

### KEEP

- Controls: the KEEP button on vjpad, a MIDI CC or note (`?midi_keep=cc:N` / `note:N`, persisted),
  the VJ MCP `keep` tool, and `k` on jam/show (Space still saves a plain snapshot).

## Wire messages (room/dev `/ws`, for anyone writing a new control)

| type | direction | data |
|---|---|---|
| `update-params` | any -> display | params; envelope may carry `source` |
| `vj-keep` | pad/MCP -> display | `{}` |
| `vj-panic` | pad/MCP -> display | `{fork?}` |
| `proposal` | MCP -> display; display -> room | `{id, label, params, shader?, expiresAt}` |
| `proposal-answer` | pad/MCP -> display | `{id, take}` |
| `proposal-clear` | display -> room | `{id, why}` |
| `pad-hello` | vjpad -> room, every 2 s | `{pad}` (a per-tab id) |
