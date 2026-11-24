# VJ MCP: VJ a display from any agent harness

An MCP server that reads a running display, turns its knobs, switches or rewrites its shader,
screenshots it and waits for its health signals. Any MCP client can use it: Claude Code, Codex, a
per-socket Claude process, an Agent SDK script. It runs in two places with the same tools:

| | Dev server | Live, on the relay |
|---|---|---|
| URL | `http://localhost:6969/mcp` | `https://relay.beadfamous.com/mcp/<room>` |
| A display is | a `?remote=display` page on that dev server | any `?remote=display&room=<room>` page, production or dev |
| Broker | the dev server's `/ws` (`remote-ws-plugin.js`) | the room's Durable Object (`workers/remote-relay`) |
| Auth | loopback / LAN, Origin check | Cloudflare Access (managed OAuth), JWT checked again in the Worker, plus the room name |
| `write_shader` | compiles on the display, writes `shaders/<x>.frag`, HMR hot-swaps | compiles on the display, applies the code live on it, saves nothing (`persisted: false`) |
| Shaders read from | disk | the site the display was served by (else `SITE_ORIGIN`, visuals.beadfamous.com) |

- **Transport:** streamable HTTP, stateless, plain JSON responses. No SSE: `GET` answers 405 in
  both places.
- **Shared code:** the tools are `vite-plugins/vj-mcp/server.js` and the display hub is
  `vite-plugins/vj-mcp/hub-core.js`. The dev server wraps them in `tools.js` and `hub.js`; the
  relay wraps them in `workers/remote-relay/src/room.js`. Neither host forks the tool set.

## Live, on the relay (`/mcp/<room>`)

Decided 2026-11-24 (coordinator; Aaron: "I want that MCP to work _deployed_ live"): the MCP lives on
the relay Worker, the room's Durable Object is the broker, and Cloudflare Access managed OAuth
guards it. Change this only by asking first.

**Register it** (once per room; the room is the same secret as the display page's `?room=`):

```bash
claude mcp add --transport http paper-cranes-live https://relay.beadfamous.com/mcp/<room>
```

Then run `/mcp` in Claude Code and sign in: Access answers the first request with `401` and an
OAuth challenge, Claude Code opens the Access login in a browser, and after that it holds a token
(15-minute access tokens, refreshed for up to 14 days). The claude.ai app can add the same URL as a
custom connector; Access's dynamic client registration allows the claude.ai and claude.com
callbacks.

**Open a display** on any page of the site with `remote=display` and the room, for example
`https://visuals.beadfamous.com/?shader=clit-set/2&remote=display&room=<room>`, or a show repo's
page, or `http://localhost:6969/jam.html?...&remote=display&room=<room>` on the show laptop. The
vjpad on `vjpad.html?room=<room>` keeps working beside it, unchanged.

**How a request flows:**

```
Claude Code ──POST /mcp/<room>──► Cloudflare Access (OAuth; 401 + challenge if not signed in)
                                     │ Cf-Access-Jwt-Assertion
                                     ▼
                                  Worker: verify JWT (team, AUD, RS256, exp), refuse any Origin,
                                     │    POST only, strip Access headers and cookies
                                     ▼ RPC
                                  RelayRoom DO for <room> ── server.js tools ── hub-core
                                     │ inspect {id} on ONE display socket       ▲ inspect-reply
                                     ▼                                          │
                                  display page (?remote=display&room=<room>) ───┘
```

**The room broker** (`workers/remote-relay/src/room.js`, `routeMessage`):

- Any message that is not a hub type is relayed to every other socket verbatim, as before. The
  relay stays byte-compatible: `e2e/vj-mcp-relay.test.js` drives a display from the real
  `vjpad.html?room=` and checks the display applied exactly what a third socket saw relayed.
- `display-hello` registers a display, only from a socket whose page Origin is the site, a show
  repo, a Pages preview, a hypnodroid.com tunnel or localhost. It is never relayed.
- `inspect-reply` resolves the one pending request it answers, and only from the socket that was
  asked. It is never relayed.
- `inspect`, `display-welcome` and `display-rekey` from any client are dropped. Only the hub sends
  them, point to point. A room peer that forges `inspect` reaches nobody.
- The display registry lives in each socket's attachment (at most 2 KiB, so a hello is trimmed),
  so it survives the object hibernating between messages. Pending requests and the event ring live
  in memory; event `seq` is a clock, so a `since` an agent holds stays valid after a hibernation
  (events that happened while nobody was waiting can be lost then; `list_displays` is the truth).
- A duplicated tab is told to rekey after the hub pings the first tab with an `inspect` (any
  reply, even "unknown cmd" from an older page, counts as alive).

**The page side.** A production page loads `src/remote/inspect.js` only when it has `?room=`.
It answers `inspect` only after its broker has answered its hello with `display-welcome`. A relay
that predates the broker never welcomes, so on it the inspector stays silent even if a peer forges
`inspect`. Deploy the Worker before (or with) the site build that carries this page code.

**write_shader without a disk.** On the relay, `write_shader` compiles the code on the target
display (the one named, else the ones showing that shader, else the only one) and refuses on an
error. Then it sends `update-params {shaderCode}` to those displays and waits until they run that
exact source. It reports `persisted: false`: nothing is saved, and a reload brings back the shader
named in the URL. Where an agent's live edits should be kept is an open question, not designed
here (a commit to a branch, a KV draft per room, or copying from `get_state` by hand).

**Local relay.** `npx wrangler dev --config workers/remote-relay/wrangler.jsonc --ip 127.0.0.1
--port 8787 --var VJ_MCP_LOCAL:1 --local-upstream 127.0.0.1:8787` runs the real Worker and Durable
Object. Pages reach it with `?room=<room>&relay=127.0.0.1:8787` (a loopback relay speaks plain
`ws`). `VJ_MCP_LOCAL=1` skips Access only when the request's hostname is loopback, which is why
`--local-upstream` is needed: without it wrangler dev rewrites the URL to relay.beadfamous.com.

**Cloudflare setup** (done 2026-11-24 through the API): Access application "paper-cranes VJ MCP
(relay /mcp, managed OAuth)", id `eb818752-c50f-4183-a769-97a4152c2ff4`, on
`relay.beadfamous.com/mcp` and `/mcp/*`. Managed OAuth on, dynamic client registration for the
claude.ai/claude.com callbacks and loopback, the reusable policy "allow aaronherres/hypnodroid
emails". No service-token policy. Its AUD is `ACCESS_AUD` in `workers/remote-relay/wrangler.jsonc`
(public, not a secret). `/ws/*` and `/` are not covered, so the venue relay is unchanged.

## Dev server (`/mcp`)

- **Where:** a Vite plugin (`vite-plugins/vj-mcp-plugin.js`) on the dev server, the same
  process as the `/ws` broker. It exists only under `npm run dev`; the static production build
  has no `/mcp`.
- **A display** is any page opened with `?remote=display` on that dev server, for example the
  show page `jam.html?shader=clit-set/2&controller=clit-set&wavelet=true&vj=1&remote=display`.
  A phone on the Cloudflare Access tunnel counts too: everything goes over its own `/ws` socket.

### Register it

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
refuses it. Use the relay URL above instead, which has managed OAuth.

## Tools

| Tool | Contract |
|---|---|
| `list_displays` | Connected displays: `id`, shader, user agent, canvas, audio state, plus the event `seq`. |
| `list_shaders {query?, include_wip?, limit?}` | Shaders from `shaders.json`, newest first, with the knobs each reads and their names. |
| `get_state {display?, features?, screenshot?}` | Shader and its source hash, compile error, fps, audio state, knob values with names, pinned params, controller outputs, core audio features, the `?vj=1` meter and jank summaries, recent console errors. `screenshot: true` adds a JPEG. |
| `screenshot {display?, width?}` | JPEG of the canvas, captured on the page. Width is at most 960 px, because the encode runs on the render thread. |
| `set_params {display?, params}` | Sends `update-params` down that display's socket (the vjpad / `remote-send.js` path), then reads the values back from the page. A value is pinned above MIDI and controllers; `null` releases it. |
| `set_shader {display?, shader, params?}` | Switches in place (no reload, audio history kept), waits until the page runs that exact source, and reports whether it compiles. If the page never picks the source up, `loaded` is false and `compiles` is null. |
| `read_shader {shader}` | Source, knobs and hash of `shaders/<shader>.frag`. |
| `write_shader {shader, code, display?, validate?}` | Compiles on a display first and refuses on an error. Dev: writes the file (the same helper as `/__save-shader`), lets HMR hot-swap it, and reports which displays picked it up (`persisted: true`). Relay: applies the code live on the display and saves nothing (`persisted: false`). |
| `wait_for_event {since?, types?, timeout_s?}` | Blocks up to 55 s until `display-joined`, `display-left` or a `vj-signal` (`boot`, `clip`, `flicker`, `too-dark`, `shiver`, `gate-drop`, `pulse`, `confirm-learn`) arrives after `since`. |

`display` is optional when one display is connected, and otherwise any unique prefix of an
id. An id is the first 6 hex characters of a key kept in the tab's `sessionStorage`, so it
survives reloads of that tab. A duplicated tab (Chrome's Duplicate tab, `window.open`) starts
with a copy of that key. When a second live socket says hello with an id already in use, the hub
pings the first one. If the first answers, the newcomer gets `display-rekey`, mints its own key
and says hello again, so both tabs are listed. If it does not answer (a phone that dropped off
wifi), the newcomer takes over the id.

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

- `vite-plugins/vj-mcp/hub-core.js` holds the data (`hub.js` is its dev-server host): `Display { id, key, ws, info, connectedAt,
  lastSeenAt }`, pending requests by id, and a ring of the last 500 events. Nothing is
  persisted. After a dev-server restart, every display announces itself again when it
  reconnects.
- `src/remote/inspect.js` is the page side. It runs in a dev build, and in production only on a
  `?room=` page (the relay is its broker). It answers nothing until its broker sends
  `display-welcome`. Its commands are read-only (`state`, `shot`, `logs`, `ping`) plus
  `validate`, a scratch compile that changes nothing on screen. It has no `eval`.
- `remote-ws-plugin.js` routes `display-hello` and `inspect-reply` to the hub and never
  broadcasts them. It drops any `inspect`, `display-welcome` or `display-rekey` a client sends,
  so only the hub can address a display. `e2e/vj-mcp.test.js` asserts this; the relay room does
  the same (`workers/remote-relay/src/room.js`).

## Security

- **Relay:** see "Live, on the relay" above. Two locks on `/mcp/<room>`: Access (OAuth, Aaron's
  email domains) and the Worker's own check of the Access JWT (`workers/remote-relay/src/access.js`:
  issuer, AUD, RS256 signature against the team certs, expiry). With no `ACCESS_AUD` configured the
  Worker answers 503, not open. Any request with an `Origin` header is refused, so a web page in a
  signed-in browser cannot drive a show. The room name is still required. The relay has no
  filesystem path: `write_shader` there never persists.
- **Dev server** (the rest of this section): no write tool exists in the production build.
- A request with an `Origin` header must come from a loopback origin, or from a host listed in
  `VJ_MCP_ORIGINS` (comma-separated). CLI clients send no `Origin`. This blocks a web page, or a
  DNS-rebinding page, from driving the display through your browser.
- The dev server binds `0.0.0.0` with `allowedHosts: true`. Anyone on the LAN can reach `/mcp`,
  as they already can reach `/__save-shader`. On untrusted wifi, bind to localhost and use the
  tunnel. Changing that default is a recommendation, not done here.
- **Only this server's own pages can register as displays.** The broker accepts
  `display-hello` only on a `/ws` socket whose upgrade request carries an `Origin` whose host
  equals the `Host` it connected to (or `X-Forwarded-Host`). Real display pages are served by
  this dev server, so they pass, on the tunnel too, where both are the tunnel hostname. Another
  web page open in the same browser can still open `/ws`, but it cannot pose as a display and
  feed text such as `recentErrors` to an agent that may hold a shell. Ordinary `/ws` traffic
  (`update-params`, `audio-features`) is authorized exactly as before. A non-browser client can
  forge `Origin`, but such a client already has the LAN or tunnel access that would let it do
  more.
- **Shader names from an agent are refused, not repaired.** `read_shader`, `set_shader` and
  `write_shader` reject names with `..`, a leading `/`, a drive letter, a backslash or NUL. The
  editor's `/__save-shader` keeps its old sanitising, plus the shared check that the result stays
  inside `shaders/`.

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
- **On the relay** the same rules hold: the room's Durable Object is the broker, the socket is the
  credential for a display, and the Access JWT names the caller (`who`, logged with each tool
  call), which is the identity a per-socket seat needs. A seat bound to one display would pass that
  display's id and the room; nothing here assumes a single agent per room.
- **Divergence: transport.** #188 reaches its tools through a stdio MCP server and a 0600 unix
  socket. This server is HTTP on the dev server, because "any harness" includes ones that cannot
  spawn a child process next to the broker.

## Tests

- `npx vitest run workers/remote-relay`: the room broker with fake sockets (relay verbatim, a
  forged `inspect` dropped, point-to-point routing, the registry surviving hibernation, rekey and
  takeover, the 2 KiB attachment cap, display origins, shader fetches) and the Access JWT check
  (valid, wrong AUD, wrong issuer, expired, forged, the loopback-only local bypass, 503 when
  unconfigured).
- `npx vitest run --config vitest.e2e.config.js e2e/vj-mcp-relay.test.js`: `wrangler dev` running
  the real Worker and Durable Object, a display and the real vjpad on one `?room=`, and an MCP
  client on `/mcp/<room>`. It checks vjpad still drives the display byte for byte, a knob turns
  the screen red (decoded from the tool's own screenshot), a forged `inspect` reaches nobody,
  `write_shader` turns the display green with `persisted: false` and the file untouched,
  `set_shader` loads from the display's own site, and join/leave events.

The dev-server suite:

`npx vitest run --config vitest.e2e.config.js e2e/vj-mcp.test.js` starts a dev server and a
headless Chromium display, then calls every tool through an MCP client. It checks the knob by
decoding the tool's own screenshot (blue at `knob_1=0`, red at `knob_1=1`) and by reading the
uniform in the page. It also checks that a compile error leaves the file untouched, that a write
hot-swaps the display to green, that a shader switch happens in place, and that join, leave and
point-to-point routing behave as described above. It also checks the hardening:
- a `display-hello` from a foreign `Origin` is not listed;
- a socket that says hello again under a new key leaves no stale entry;
- a duplicated tab carrying the same key is listed alongside the original, and closing it leaves
  the original in place;
- shader names that climb out of `shaders/` are refused.

## Proposed, not built: ticketed URLs for scripts and remote audio

Aaron, 2026-11-24: "Use mindmeld to remember how we use urls with tickets etc in the Draw board mcp,
to make it easier to write scripts that agents write to update data. This might potentially be
useful for remote mic data". draw's `link` tool (draw `src/link.ts`, `src/linkRoutes.ts`; vault
`kb/tools/draw-link-tickets.md`) mints a one-hour URL scoped to one frame or widget, the path
being the only credential, 60 uses a minute, 50 live links, revocable, with a curl line and a node
script in the reply.

The paper-cranes equivalent would be one more tool on this server:

- **`link {scope, display?, keys?, ttl_min?}`** mints `https://relay.beadfamous.com/l/<id>`. Only an
  Access-signed-in MCP caller can mint, so the room secret never has to leave the agent.
- **The ticket** is a random 128-bit id stored in the room's Durable Object storage with
  `{scope, display, keys, expires, by}`, prefixed with the room's DO id so the Worker can route it
  without knowing the room name. Storage, not an HMAC, so `revoke` ends it early.
- **Scopes**, each a whitelist of what the holder may send, never anything it may read:
  `params` (only the listed knob keys, relayed as `update-params`, optionally to one display),
  and `audio-features` (relayed as `audio-features`, which `audio=remote` pages already consume).
  Never `shaderCode`, never a hub type, no `inspect`, no screenshot.
- **Transport:** POST with `{"protocol":"params","values":{...}}` for scripts; a ticketed WebSocket
  upgrade on the same URL for a stream (a stranger's phone mic sending features at frame rate).
  GET describes the link; `/openapi.json` gives the schema.
- **Lifetime and limits:** 1 hour by default, 8 hours at most (one show); 60 POSTs a minute;
  a stream capped at 60 messages a second and 4 KB a message; 50 live links a room.
- **A leaked ticket** lets its holder move the listed knobs, or feed audio features, in that one
  room until it expires or is revoked. It cannot read the display, change the shader, learn the
  room name or mint more links.
- **Where it fits:** a stranger's own mic or audio reaching the visual (the phone page opened from
  the link streams features into the room), the in-chat widget joining its room without holding
  the room secret, and agent scripts that should not need an MCP session.

## Open questions

- **Persistence of live shader edits** on the relay (see write_shader without a disk).
- **Service tokens** for headless agents (Sonnet VJ seats from #188): the Access app admits only
  Aaron's email domains through OAuth. Adding a service-token policy, and which token, is Aaron's
  call.
- **`?vj=1` signals in production:** `wait_for_event` on the relay only sees joins and leaves,
  because the page posts its signals to the dev server's `/__vj-signal`, which production lacks.
