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
- **The room name is the lock, unless the room has a display secret.** Anyone who knows the
  name can join `/ws/<room>` and relay knobs. In a room with no secret, a non-browser client
  (which can send any `Origin`) can also register a fake display. A fake display cannot touch the
  real one, but what it reports (state, screenshots, logs, events) reaches the agent as if real.
  `display_secret {action: "rotate"}` locks the room so a display registers, and its `?vj=1`
  signals count, only with the secret from the link it returns (see "Display secret" below). The
  tool descriptions of `list_displays`, `get_state`, `screenshot` and `wait_for_event` still say
  their output is untrusted data: anyone holding the display link can run a display.
- `display-hello` registers a display, only from a socket whose page Origin is the site, a show
  repo, a Pages preview, a hypnodroid.com tunnel or localhost. It is never relayed. This check
  stops web pages in a browser, not scripts: a non-browser client sets any `Origin` it likes.
- `inspect-reply` resolves the one pending request it answers, and only from the socket that was
  asked. It is never relayed.
- `inspect`, `display-welcome` and `display-rekey` from any client are dropped. Only the hub sends
  them, point to point. A room peer that forges `inspect` reaches nobody.
- `vj-signal` (a `?vj=1` page's boot beacon, alerts and pulses; `src/vj/signals.js`) becomes a
  `vj-signal` event for `wait_for_event`, in the dev hub's shape, only from a socket whose page
  may be a display, at most 64 KiB. It is never relayed. A production page has no `/__vj-signal`,
  so on a room this is the only way its signals reach an agent; a dev page sends both.
- The display registry lives in each socket's attachment (a hello is trimmed to what
  `list_displays` shows),
  so it survives the object hibernating between messages. Pending requests and the event ring live
  in memory; event `seq` is a clock, so a `since` an agent holds stays valid after a hibernation
  (events that happened while nobody was waiting can be lost then; `list_displays` is the truth).
- A duplicated tab is told to rekey after the hub pings the first tab with an `inspect` (any
  reply, even "unknown cmd" from an older page, counts as alive).

**The page side.** A production page loads `src/remote/inspect.js` only when it has `?room=` and its
relay is one we run: `relay.beadfamous.com` (the default) or a loopback relay (`src/remote/relay.js`,
`inspectorAllowed`). A link with `?relay=<any other host>` still relays knobs as before, but the
page never answers `inspect` there, so a stranger's relay cannot welcome it and read its canvas,
audio features, knobs or console.
Where the socket goes is fixed when the page loads: `WebSocketClient` reads its URL once and every
reconnect reuses it, and `update-params` can never set `relay` or `room`, or any other boot-time
key in `PINNED` (`withoutPinned`), not into the page's params and not into the URL mirror. Without that, a room peer could send
`update-params {relay}`, the mirror would write it into the URL, and the next reconnect would take
the still-inspectable display to the peer's relay (found in the #221 re-review; the e2e test
reproduces it with a stand-in relay). As a second layer the page judges the socket actually open
(`inspectorAllowedOn`, its parsed host) on every connect and on every welcome and `inspect`.
It answers `inspect` only after its broker has answered its hello with `display-welcome`. A relay
that predates the broker never welcomes, so on it the inspector stays silent to a forged `inspect`
(checked 2026-11-24 against the live relay: 0 replies). That old relay does relay the hello itself,
so a peer already in the room could read the display id and forge a welcome too. **Deploy the
Worker before the site build that carries this page code**; after that, the room drops client
welcomes and the gap is closed.

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

## Ask the server: `guide`, workflows, instructions

The server answers questions about how to use it, so an agent never needs this page. Everything
it says comes from one file, **[vj-mcp-guide.md](vj-mcp-guide.md)**, which holds the tool table,
the workflows (numbered tool-call recipes with real argument shapes) and the reference topics.
Edit that file; never copy its text into JS.

| What the agent sees | Where it comes from |
|---|---|
| server `instructions` on initialize | the guide's `# Orientation`, plus this host's one-line venue note |
| `guide {}` / `guide {topic}` / `guide {question}` | contents / one section verbatim / the best section for a question in full, plus the ids of up to 2 close matches and its see-also ids (one section per answer keeps it under ~800 tokens), ranked by BM25 term overlap with a few synonyms, how-to questions favouring workflows, what-is questions favouring topics, and `> Status:` (not live yet) sections demoted. No model, no embeddings: the same question always gets the same answer. |
| `prompts/list`, `prompts/get` | one prompt per workflow, named by its id |
| `resources/list`, `resources/read` | `vj://guide` (contents), `vj://guide/workflows/<id>`, `vj://guide/topics/<id>`, and `skill://paper-cranes-vj/SKILL.md` (the whole guide as one skill file, as draw serves `skill://draw/SKILL.md`) |

`vite-plugins/vj-mcp/guide.js` parses the markdown and registers all of it; `server.js` calls it
when its host passes `guide`. The dev server reads the file on each request (an edit shows without
a restart); the relay Worker imports it as a string through the `Text` rule in
`workers/remote-relay/wrangler.jsonc`. A workflow whose section starts `> Status:` is listed as
"coming soon" and never answers a question first (none today).

## Tools

The table of tools and their arguments is the guide's `tools` topic
([vj-mcp-guide.md](vj-mcp-guide.md#tools-every-tool-and-its-arguments)). Details that matter to
people changing the server, not to agents using it:

- `write_shader` on the dev server writes through the same helper as `/__save-shader`. A display
  that `set_shader` moved counts as showing the new shader: pages match HMR events with
  `shaderOnScreen()` (`src/shaderLoader.js`), which reads `?shader=` when the event arrives, never
  the value from boot.
- The live show's tools (`propose`, `answer_proposal`, `keep`, `panic`) and `source` on
  `set_params` / `set_shader` follow the [live-show contract](live-show-contract.md). Every MCP
  write goes out with `source: "agent"` on the `update-params` envelope (`hub-core.js` `send`'s
  `extra`), which is what the page's HANDS gate holds. Mid-lock a write answers `held: true`
  instead of a read-back. `write_shader` on dev first sends `vj-agent-shader {shader, hash}` so the
  page's HMR handler holds exactly that code; Aaron's own editor saves still swap at once.

`display` is optional when one display is connected, and otherwise any unique prefix of an
id. An id is the first 6 hex characters of a key kept in the tab's `sessionStorage`, so it
survives reloads of that tab. A duplicated tab (Chrome's Duplicate tab, `window.open`) starts
with a copy of that key. When a second live socket says hello with an id already in use, the hub
pings the first one. If the first answers, the newcomer gets `display-rekey`, mints its own key
and says hello again, so both tabs are listed. If it does not answer (a phone that dropped off
wifi), the newcomer takes over the id.

The typical loop and every other recipe are the guide's workflows: ask the server, `guide {}`.

## Driving it from a draw board

A [draw](https://draw.hypnodroid.com) board can drive the same tools from a phone.
`scripts/vj/board-bridge.js` listens to the board and turns a Send of one control (PANIC, KEEP,
◀ ▶, a knob preset, a proposal's TAKE) into one tool call with `source: "board"`, no model in the
path: median 0.8 s from tap to the page confirming (2026-11-24). `/show` sets it up; see
`.agents/skills/show/controls.md`. We maintain draw as well, so gaps found here become draw work.

## How it works

```
MCP client ──POST /mcp──► vj-mcp-plugin ──► tools.js ──► hub ──inspect {id,cmd}──► display page
                                                          ▲      (its own /ws socket)    │
                                                          └──── inspect-reply {id} ◄─────┘
                          set_params / set_shader ──► update-params on that socket ──► RemoteDisplay.applyParams
                          write_shader ──► shaders/<x>.frag ──► chokidar ──► HMR hot-swap
                          /__vj-signal or room vj-signal (?vj=1 page) ──► hub event ring ──► wait_for_event
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
  filesystem path: `write_shader` there never persists. A room locked with `display_secret` takes
  displays only with its secret; see "Display secret (relay)".
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

## Display secret (relay)

Without a secret, the room name is the only lock on who may be a display. A script that knows
the room can forge `Origin`, register a fake display and feed the agent made-up state,
screenshots and events. `display_secret` closes that for rooms that want it:

1. An agent signed in through Access calls `display_secret {action: "rotate"}`. The room's Durable
   Object mints 256 random bits (`ds_` + base64url), stores only their SHA-256 hash in its storage,
   and returns a display link:
   `https://visuals.beadfamous.com/?shader=<s>&remote=display&room=<room>#display_secret=ds_…`.
   The secret exists outside the display only in that one reply. Lost the link? Rotate again.
2. The secret is in the URL **hash**, which a browser never sends to a server, so it stays out
   of the site's and Cloudflare's request logs. `?display_secret=` in the query also works, but
   it reaches those logs, so use the hash.
3. The page reads the secret once, at load (`src/remote/relay.js` `displaySecretFrom`, called in
   `RemoteDisplay`), the same way it pins `relay` and `room`. `display_secret` is in `PINNED`, so
   a room peer's `update-params` can neither set nor delete it, and the URL mirror never writes it.
   The page puts it in its `display-hello` (`displaySecret`) only on a socket to a relay room we
   run (`secretFor`: relay.beadfamous.com or a loopback relay), never on the dev server's `/ws`
   and never through another `?relay=` host.
4. The room checks the hello: it hashes what the page sent and compares the two digests in
   constant time (`crypto.subtle.timingSafeEqual` on Workers). Right secret: welcomed and listed,
   as before. No secret or a wrong one: the page gets `display-refused {reason}` and is never
   listed. The reason never contains the secret.
5. `?vj=1` signals from a socket that has not proven the secret wait (up to 5, in memory) for
   its hello, then count or are dropped with it. The boot beacon usually beats the hello.
6. `rotate` again drops every registered display at once: each gets `display-refused` and leaves
   `list_displays` until it opens the new link. A refused display stays an ordinary room peer, so
   knobs from a phone keep reaching it. `clear` opens the room again.

Rooms with no secret behave exactly as before, so every existing link keeps working.

**Where the secret never appears.** Every href the page reports goes through `withoutSecret`
first: the hello's `href` (so `list_displays`), `get_state`'s `href`, and the `?vj=1` boot
beacon's `url` and `flags`. The relay also redacts `display_secret=` and any `ds_…` token from
hellos and signals before it stores or forwards them, for a page that predates this. The Worker
logs only who called which tool, never arguments. `display-refused` is a hub-only message type:
a peer cannot forge one to a display.

**Limits.** The secret proves the page was opened from the link; anyone who has the link can run
a display. The page keeps the secret in its URL hash, so a screenshot of the address bar carries
it, and so will a PWA installed from that page once the manifest's `start_url` keeps the hash
(#216; today `index.html` builds it from the path and query only). The `?display_secret=` query
form also lands in the site's request logs, the service worker's cache keys, and, through a
same-origin `document.referrer`, the list page's remembered params in `localStorage`; use the
hash. Rotate if a link leaks.

**Reviewed** in the #236 security review (2026-11-24): encoding and case tricks, signals before,
between and after hellos, a no-Origin socket, a refused socket answering another display's
`inspect`, a peer reusing the display's key, old-secret replays and hellos racing `rotate` were
all refused on `wrangler dev`; no MCP reply but `rotate`, and no Worker log line, held the secret.
A `relay.beadfamous.com` link has no `relay=`; a link minted through any other relay host names
that host, and the page sends its secret only to `relay.beadfamous.com` or loopback, so mint
links on `relay.beadfamous.com`.

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

- `npx vitest run vite-plugins/vj-mcp/guide.test.js`: the guide through a real MCP client (every
  workflow and topic parsed, See also ids real, instructions, `guide` with no args, a topic, an
  unknown topic, eight how-to questions each landing on the right section first, prompts,
  resources, and the dev host reading `docs/`). `workers/remote-relay/src/guide-bundle.test.js`
  builds the real Worker bundle (`wrangler deploy --dry-run`) and finds the guide text in it. Both
  e2e suites below ask the live server for its instructions, a prompt, a resource and a `guide`
  answer.
- `npx vitest run workers/remote-relay`: the room broker with fake sockets (relay verbatim, a
  forged `inspect` dropped, point-to-point routing, the registry surviving hibernation, rekey and
  takeover, every attachment under the 16 KiB limit even for a non-ASCII hello, display origins, shader fetches) and the Access JWT check
  (valid, wrong AUD, wrong issuer, expired, forged, the loopback-only local bypass, 503 when
  unconfigured).
- `npx vitest run --config vitest.e2e.config.js e2e/vj-mcp-relay.test.js`: `wrangler dev` running
  the real Worker and Durable Object, a display and the real vjpad on one `?room=`, and an MCP
  client on `/mcp/<room>`. It checks vjpad still drives the display byte for byte, a knob turns
  the screen red (decoded from the tool's own screenshot), a forged `inspect` reaches nobody,
  `write_shader` turns the display green with `persisted: false` and the file untouched,
  `set_shader` loads from the display's own site, and join/leave events.

`npx vitest run --config vitest.e2e.config.js e2e/live-show.test.js` (port 7142): a display and a vjpad, the pad's moves turn HANDS on and an agent `set_params` is held then applied when the 300 ms test lock (`?hands_ms=300`) ends; `propose` then KEEP on the pad's card applies the param and signals `proposal-taken`; PANIC on the pad swaps to the boot fork with no page load. `src/vj/live.test.js` covers the state machine, `vite-plugins/vj-mcp/live-tools.test.js` the new tools.

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

## Follow-ups from the #221 security review

Fixed in #221: the inspector answers only through `relay.beadfamous.com` or a loopback relay (a
`?relay=` link elsewhere cannot read the display, and a room peer cannot move the page's socket
with `update-params {relay, room}`); the read tools mark display output as
untrusted; a room that is not valid percent-encoding gets 400; vitest skips `dist/`.

Fixed after #221 (the relay bug hunt): an unknown `kid` refetches the Access certs at most once
every 30 s, and concurrent misses share one fetch; `?vj=1` signals reach the relay's
`wait_for_event` (see the room broker above); `wrangler.jsonc` records the `v1` SQLite migration the account already
has. Not a bug after all: the attachment caps count UTF-16 units, but the attachment limit is
16 KiB, not 2 KiB, and the largest hello `pack` keeps is about 3 KiB even in non-ASCII (a 200 x
`光` hello lists on workerd).

Fixed in bughunt/remote: `update-params` can no longer set or delete any key the page reads once
at boot (`controller`, which imports JavaScript, plus `image`, `audio_file`, `remote`, `vj`,
`midi`, `audio_send` and the rest of `PINNED` in `src/remote/relay.js`), so a room peer cannot
plant one in the URL mirror for the next reload; and `screenshot` caps the long side at 960 px.

Built after #221: the room-secret handshake, as `display_secret` (see "Display secret").

Left for later:
- **Display origins are too wide** (`workers/remote-relay/src/room.js`, `DISPLAY_ORIGIN`): every
  `*.hypnodroid.com` origin may register as a display, draw.hypnodroid.com included. That matters
  only if one of those hosts serves content someone else can write. Narrow it to the hosts that
  serve paper-cranes.

## Open questions

- **Persistence of live shader edits** on the relay (see write_shader without a disk).
- **Service tokens** for headless agents (Sonnet VJ seats from #188): the Access app admits only
  Aaron's email domains through OAuth. Adding a service-token policy, and which token, is Aaron's
  call.
