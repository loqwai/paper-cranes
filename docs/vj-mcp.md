# VJ MCP: VJ a display from any agent harness

The dev server serves an MCP server at `/mcp`. Any MCP client (Claude Code, Codex, a
per-socket Claude process, an Agent SDK script) can then read a running display, turn its
knobs, switch or rewrite its shader, screenshot it and wait for its health signals.

- **Transport:** streamable HTTP, stateless, plain JSON responses. No SSE: `GET /mcp` answers
  405.
- **Where:** a Vite plugin (`vite-plugins/vj-mcp-plugin.js`) on the dev server, the same
  process as the `/ws` broker. It exists only under `npm run dev`; the static production build
  has no `/mcp`.
- **A display** is any page opened with `?remote=display` on that dev server, for example the
  show page `jam.html?shader=clit-set/2&controller=clit-set&wavelet=true&vj=1&remote=display`.
  A phone on the Cloudflare Access tunnel counts too: everything goes over its own `/ws` socket.

## Register it

Start the dev server first (`npm run dev`, port 6969 unless `PORT` is set).

**Claude Code**

```bash
claude mcp add --transport http paper-cranes-vj http://localhost:6969/mcp
```

**Codex** (`~/.codex/config.toml`)

```toml
[mcp_servers.paper-cranes-vj]
url = "http://localhost:6969/mcp"
```

**Any shell** (no harness): `node scripts/vj/mcp-call.js` lists the tools, and
`node scripts/vj/mcp-call.js get_state '{"screenshot":true}'` calls one. It writes images to a
temp file and prints the path. `PORT` or `MCP_URL` picks the server.

**Over the tunnel, from another machine.** Cloudflare Access sits in front of the tunnel host,
so a CLI client needs an Access service token sent as headers:

```bash
claude mcp add --transport http paper-cranes-vj https://<tunnel-host>/mcp \
  --header "CF-Access-Client-Id: <id>" --header "CF-Access-Client-Secret: <secret>"
```

The service token and an Access policy that admits it do not exist yet. Creating them is
Aaron's call, because they widen who can reach the dev server.

**claude.ai app.** A custom connector must reach a public HTTPS URL from Anthropic's servers,
and it authenticates with OAuth only, never with custom headers. The Access-protected tunnel
refuses it. Making that work means changing the tunnel's auth, which is not done here.

## Tools

| Tool | Contract |
|---|---|
| `list_displays` | Connected displays: `id`, shader, user agent, canvas, audio state, plus the event `seq`. |
| `list_shaders {query?, include_wip?, limit?}` | Shaders from `shaders.json`, newest first, with the knobs each reads and their names. |
| `get_state {display?, features?, screenshot?}` | Shader and its source hash, compile error, fps, audio state, knob values with names, pinned params, controller outputs, core audio features, the `?vj=1` meter and jank summaries, recent console errors. `screenshot: true` adds a JPEG. |
| `screenshot {display?, width?}` | JPEG of the canvas, captured on the page. |
| `set_params {display?, params}` | Sends `update-params` down that display's socket (the vjpad / `remote-send.js` path), then reads the values back from the page. A value is pinned above MIDI and controllers; `null` releases it. |
| `set_shader {display?, shader, params?}` | Switches in place (no reload, audio history kept), waits until the page runs that exact source, and reports whether it compiles. |
| `read_shader {shader}` | Source, knobs and hash of `shaders/<shader>.frag`. |
| `write_shader {shader, code, display?, validate?}` | Compiles on a display first and refuses to write on an error. Then writes the file (the same helper as `/__save-shader`), lets HMR hot-swap it, and reports which displays picked it up. |
| `wait_for_event {since?, types?, timeout_s?}` | Blocks up to 55 s until `display-joined`, `display-left` or a `vj-signal` (`boot`, `clip`, `flicker`, `too-dark`, `shiver`, `gate-drop`, `pulse`, `confirm-learn`) arrives after `since`. |

`display` is optional when one display is connected, and otherwise any unique prefix of an
id. An id is the first 6 hex characters of a key kept in the tab's `sessionStorage`, so it
survives reloads of that tab.

A typical loop: `list_displays`, then `get_state {screenshot:true}`, then `set_params`, then
`get_state` again to see the change. Between moves, `wait_for_event` waits for the page to
report something instead of polling.

## How it works

```
MCP client ──POST /mcp──► vj-mcp-plugin ──► tools.js ──► hub ──inspect {id,cmd}──► display page
                                                          ▲      (its own /ws socket)    │
                                                          └──── inspect-reply {id} ◄─────┘
                          set_params / set_shader ──► update-params on that socket ──► RemoteDisplay.applyParams
                          write_shader ──► shaders/<x>.frag ──► chokidar ──► HMR hot-swap
                          /__vj-signal (?vj=1 page) ──► hub event ring ──► wait_for_event
```

- `vite-plugins/vj-mcp/hub.js` holds the data: `Display { id, key, ws, info, connectedAt,
  lastSeenAt }`, pending requests by id, and a ring of the last 500 events. Nothing is
  persisted. After a dev-server restart, every display announces itself again when it
  reconnects.
- `src/remote/inspect.js` is the page side. It runs only in a dev build, and only when the page
  has no `?room=`, because on the public relay no broker filters who may send `inspect`. Its
  commands are read-only (`state`, `shot`, `logs`) plus `validate`, a scratch compile that
  changes nothing on screen. It has no `eval`.
- `remote-ws-plugin.js` routes `display-hello` and `inspect-reply` to the hub and never
  broadcasts them. It drops any `inspect` a client sends, so only the hub can question a display.
  `e2e/vj-mcp.test.js` asserts this.

## Security

- Dev server only. No write tool exists in the production build, and `inspect` handling is
  removed from it.
- A request with an `Origin` header must come from a loopback origin, or from a host listed in
  `VJ_MCP_ORIGINS` (comma-separated). CLI clients send no `Origin`. This blocks a web page, or a
  DNS-rebinding page, from driving the display through your browser.
- The dev server binds `0.0.0.0` with `allowedHosts: true`. Anyone on the LAN can reach `/mcp`,
  as they already can reach `/__save-shader`. On untrusted wifi, bind to localhost and use the
  tunnel. Changing that default is a recommendation, not done here.
- Any `/ws` client can claim to be a display. A fake display only receives requests and
  `update-params`, and it can lie in its answers. It cannot reach another display.

## Relation to the one-Claude-per-socket design (PR #188)

This server is the tool surface that design needs, built so it can be scoped down rather than
rewritten:

- **Same page side.** #188 keeps #182/#187's `inspect.js` handlers, unsigned, answered on the
  requesting socket only. This PR does that, keeping `state`, `shot`, `logs` and `validate`.
- **Same trust model.** The socket is the credential. The broker filters `inspect` frames, and
  there is no HMAC token.
- **Divergence: display ids.** #188 has no display ids, because each Claude owns exactly one
  socket. A general MCP used from Claude Code needs to pick a display, so ids come back. They are
  broker-side and derived from a per-tab key, so they stay stable across reloads (#187's blocker
  6). A per-seat server binds `createVjMcpServer` to one display and drops the `display`
  argument.
- **Divergence: tool granularity.** #188's seat tools are `look`, `act`, `say` and `logs`, with
  `checkAct` guards from `vj-rules.js`. This server exposes the primitives (`get_state`,
  `set_params`, `set_shader`, `write_shader`). The seat's guarded `act` belongs on top of them,
  restricted for Sonnet seats. Aaron's own harness keeps the raw tools.
- **Divergence: transport.** #188 reaches its tools through a stdio MCP server and a 0600 unix
  socket. This server is HTTP on the dev server, because "any harness" includes ones that cannot
  spawn a child process next to the broker.

## Tests

`npx vitest run --config vitest.e2e.config.js e2e/vj-mcp.test.js` starts a dev server and a
headless Chromium display, then calls every tool through an MCP client. It checks the knob by
decoding the tool's own screenshot (blue at `knob_1=0`, red at `knob_1=1`) and by reading the
uniform in the page. It also checks that a compile error leaves the file untouched, that a write
hot-swaps the display to green, that a shader switch happens in place, and that join, leave and
point-to-point routing behave as described above.
