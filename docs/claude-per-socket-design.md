# One Claude per socket: design

Status: design only, nothing built. Written 2026-11-22.

Aaron's order: "No 'tokens'. We'll just spawn a Claude code process per WebSocket. Read up on how
relay does it." The goal: "a Claude mod that will tldr let people communicate with you and you dj
it live, with Claude instances per user connect. Optional chat. Each with their own visuals. Using
this phone to start."

The design copies relay's working parts. Relay runs one long-lived `claude -p` process per tab.
Its host process (`tools/autoseat.js`) feeds that process turns on stdin and tails its stream-json
output from a file. It resumes the session by id after a death, and it closes stdin to retire an
idle process. Relay is keyed by tab over HTTP and SSE, not by WebSocket. Paper Cranes keys the same
machinery by socket. Relay's citations are in the vault note
`kb/research/relay-claude-per-socket-research-2026-11.md`.

## 1. Data shape

```
phone tab ──wss /ws (Access cookie)──► dev server (remote-ws-plugin = the broker)
                                          │ one Seat per socket that says seat-hello
                                          ▼
                                    Seat { seatKey, email, ws, proc, sessionId, queue, log }
                                          │ stdin: stream-json user turns
                                          ▼
                                    claude -p (Sonnet), one per Seat
                                          │ MCP tool calls (stdio server, child of claude)
                                          ▼
                                    unix socket $XDG_RUNTIME_DIR/cranes/<seatKey>.sock ──► broker ──► that same ws
```

- **Connection to process: 1 to 1.** Each process has exactly one display: the page on the
  socket that spawned it. There is no display id, no `to`, and no `--display`.
- **seatKey.** It is a UUID that the page creates once per tab and keeps in `sessionStorage`. A
  reload or a reconnect in the same tab sends the same key, so the socket reattaches to the same
  process. A new tab gets a new key, a new process and its own visuals.
- **Identity** comes from the WebSocket upgrade request. Cloudflare Access adds
  `Cf-Access-Authenticated-User-Email` and `Cf-Access-Jwt-Assertion` to every request it passes
  through `cranes-local.hypnodroid.com`. The broker verifies the JWT against the team's certs and
  the app's AUD, then takes the email from it. A socket with no Access headers is accepted only
  from loopback, with the identity `local` (this machine's own tabs and tests).
- **Who gets a process.** Only emails in `CRANES_CLAUDE_USERS` (default: Aaron's). Any other
  Access user still gets the visuals, with no seat.
- **Persisted per seatKey** in `~/.local/state/paper-cranes/seats/state.json`: `{ email,
  sessionId, pid, startedAt, lastActiveAt, costUsd }`. It is written before the spawn, as relay does
  (`tools/autoseat.js:1370-1386`).

## 2. The process

```
claude --bare -p \
  --input-format stream-json --output-format stream-json --verbose \
  --model sonnet \
  --session-id <uuid>            # or --resume <uuid> when state.json has one for this seatKey
  --system-prompt-file=<repo>/scripts/seat/system-prompt.md \
  --add-dir=<repo>               # loads .claude/skills/remote-vj
  --tools ""                     # no Bash, Read, Edit or WebFetch
  --strict-mcp-config --mcp-config=<json: cranes → node <repo>/scripts/seat/mcp.js, env CRANES_SEAT_SOCK>
  --allowedTools=mcp__cranes \
  --permission-mode dontAsk --permission-prompts none \
  --max-budget-usd 2
```

- **cwd:** `~/.local/state/paper-cranes/seats/<seatKey>/`. It is an empty folder, so no
  repository `CLAUDE.md` or project settings are loaded.
- **`--bare`** skips Aaron's user `CLAUDE.md`, his hooks and auto-memory. Without it, every seat
  would load the vault, draw and orchestration rules. `--bare` needs `ANTHROPIC_API_KEY`, because
  it never reads OAuth. This is open question 1.
- **Flags use the `=` form.** `--add-dir`, `--mcp-config` and `--settings` are variadic, and the
  spaced form swallows following arguments (relay `tools/autoseat.js:155-158`).
- **stdout and stderr go to a log file, not a pipe:** `seats/<seatKey>/claude-<ts>.jsonl`. The
  broker tails the file. With a pipe, a Vite restart would kill the turn in progress with EPIPE
  (relay `tools/autoseat.js:1235-1244`). stdin stays a pipe on purpose: its EOF is what retires
  the process.
- **Tools.** The process has no shell. It has one MCP server, `scripts/seat/mcp.js`, whose tools
  only reach its own socket:

| Tool | What it does |
|---|---|
| `look` | status, features with meters, and a screenshot, returned as an image block |
| `act {action, args}` | `nudge`, `gain`, `release_time`, `swap`, `reload`, `panic`, `undo`. Every call runs `checkAct` (`vj-rules.js:199`) and is logged |
| `say {text}` | sends a chat line to the person on this socket. It is the only way to reach them |
| `logs {n}` | the page's recent console errors |

  There is no `eval` and no raw `code` swap for seats. Those stay on Aaron's local CLI.

### System prompt (`scripts/seat/system-prompt.md`, draft)

```
You are the live VJ for one screen: {email}'s paper-cranes display. You can only change that screen.
Follow the remote-vj skill (.claude/skills/remote-vj/SKILL.md). Its guarded menu is the vj-tick
verdict: none, nudge, gain, release_time, swap, reload, tell_aaron.

Turns arrive from the broker:
  [tick]  an observation plus the rules' verdict. Apply the verdict with `act` unless the
          screenshot clearly contradicts it. A refused act is final for this tick.
  [chat]  a line from the person. Answer with `say` in one short sentence, and change the visual
          only through `act`.
  [queued] a request that was held earlier and is now allowed.

Ending your turn is how you wait. Never ask to sleep, poll or schedule; the broker wakes you.
Short replies. No reasoning in `say`.
```

## 3. Message framing

All traffic for a seat uses the socket that opened it. The plugin's broadcast loop
(`remote-ws-plugin.js:74-79` on #187) skips every type below, and the broker drops any `inspect`
or `seat` frame that a client sends. That filter is the security boundary that replaces the HMAC
signature.

**Page to broker**

| type | data | handling |
|---|---|---|
| `seat-hello` | `{seatKey, href, audio}` | attach to the seat or spawn one |
| `chat` | `{text}` | appended to the request queue, delivered as a `[chat]` turn |
| `inspect-reply` | `{id, ...}` | resolves the pending MCP call with that id |
| `midi-event` | `{type, number, value}` | ring buffer, summarised in the next tick turn (never one turn per event) |

**Broker to page**

| type | data |
|---|---|
| `inspect` | `{id, cmd, args}`, the existing `inspect.js` handlers, unsigned |
| `chat` | `{from: 'claude', text}`, from the `say` tool |
| `seat` | `{state: starting, ready, busy, idle, queued, gone, reason?}`, which drives a small badge |

**Broker to Claude:** a stream-json user turn, `{type:'user', message:{role:'user', content:[text,
image?]}}`, exactly as relay writes it (`tools/autoseat.js:1174`). The broker writes no turn while
a turn is in progress. A `result` event in the log ends the turn (`tools/autoseat.js:1281`).

**Claude to page:** MCP tool call, then `mcp.js`, then the unix socket (mode 0600, unreachable
through the tunnel), then the broker, then `inspect {id}` on the seat's own socket. The reply
returns the same way.

**Ticks.** The broker runs one tick per seat every 60 s, and that tick is the scheduler. It
observes (two status calls 1 s apart, then features, then a screenshot), runs `decide()`, and logs
the result. It writes a turn only when one of these is true:

- the verdict is not `none`
- a queued request is now allowed
- 5 minutes have passed since Claude last looked

Otherwise the tick costs no tokens. A tick that comes while Claude is busy is skipped, and the
skip is logged.

## 4. Lifecycle and limits

| Event | Broker action | Relay precedent |
|---|---|---|
| `seat-hello`, no live process for the key | spawn; `--resume` when the key has a sessionId | `autoseat.js:1359-1410` |
| `seat-hello`, live process for the key | reattach the new socket; no spawn | per-tab dedupe, `autoseat.js:86-92` |
| `--resume` fails (`No conversation found`) | one fresh session, same pending turn | `autoseat.js:1500-1520` |
| socket closes | a 2 min grace period, then close stdin; the session id is kept | `closeCoordinator`, `autoseat.js:1463` |
| no chat for 30 min and no non-`none` verdict | close stdin (idle); ticks continue without a process, and the next turn resumes | `idleMs`, `autoseat.js:1960` |
| process still alive 60 s after EOF | SIGTERM | `CLOSE_GRACE_MS`, `autoseat.js:1113` |
| dies mid-turn | the turn's requests are re-offered once (max 2 attempts) | `MAX_ATTEMPTS`, `autoseat.js:1116, 1524` |
| broker (Vite) restarts | children read EOF, finish their turn and exit; on reconnect the page resumes | `shutdown`, `autoseat.js:1908` |
| broker start finds a live pid in state.json | check its identity through `/proc/<pid>/cmdline` holding the session id; adopt it, never double-spawn | `pidAlive`, `autoseat.js:1016` |

**Limits**

- At most 1 live process per email and 3 in total. At the cap, the least recently active idle
  process is evicted. A process in the middle of a turn is never evicted (`autoseat.js:794-807`).
- The process runs with `--max-budget-usd 2`. The broker also adds up `total_cost_usd` from each
  `result` event per email per day, and stops spawning at `CRANES_CLAUDE_DAILY_USD` (default 10).
  It then sends `seat {state: gone, reason: 'budget'}`. Relay has no dollar cap.
- Chat is limited to 1 turn per 10 s per seat. Extra lines join the queue and are not dropped.

## 5. What to delete or keep from #182 and #187

**Recommendation: close both PRs unmerged.** The milestone-1 PR, cut from `origin/main`, copies
the parts to keep and leaves the rest behind. Merging them first and deleting later would put a
token system on main only to tear it out.

| Item | Verdict | Why |
|---|---|---|
| HMAC token: `scripts/remote/token.js`, `src/remote/inspectAuth.js`, `/__remote-inspect/token` | **delete** | the socket is the credential, and Access is the identity |
| signed `to`, `displayId`, `--display`, `R displays`, `pick-display` | **delete** | one process per socket has nothing to address |
| broadcast of `inspect`, `inspect-reply`, `midi-event` | **delete** | replies go to the requesting seat only |
| `.claude/vj/<display>/` state | **replace** | per seat, in `~/.local/state/paper-cranes/seats/<seatKey>/` |
| `T()`/`R()` setup, port 6977 and `KIT` path in the skill | **delete** | the skill names MCP tools instead |
| `src/remote/inspect.js` handlers (status, features, shot, logs, set, time, shader, controller, navigate, reload) | **keep** | the page side of every tool, unchanged |
| `inspect.js` `eval` and `code` | **keep, local only** | Aaron's CLI only, never in seat tools |
| `inspectClient.js` HMR self-accept and `keepAudioAlive` | **keep** | becomes `seatClient.js`: seat-hello, chat and the seat badge |
| `scripts/remote/vj-rules.js` (`decide`, `checkAct`, `parseRequest`) and its 41 tests | **keep** | pure and tested; the broker and `act` call them |
| `scripts/remote/vj-config.js` known-good list and limits | **keep** | |
| `vj-tick.js` observe, apply, panic and undo | **move** | into `scripts/seat/` as broker functions; the CLI shell goes |
| `cranes-remote.js` | **keep, retarget** | it connects to a seat's unix socket (`--seat <key or email>`) for Aaron's debugging |
| `docs/show-quickstart.md`, the CLAUDE.md `npm ci` note, `src/midi.js` event | **keep** | unrelated to the token |
| the old unauthenticated `update-params` broadcast | **narrow** | broadcast only between sockets with the same Access email |

## 6. The Sonnet run's blockers (#187 @1c2ff0c2, "not unattended yet")

| # | Blocker | Resolution |
|---|---|---|
| 1 | Live port 6977 and an absolute kit path are hardcoded; no sandbox or test mode | **Gone by construction.** Tools reach only their own socket through `CRANES_SEAT_SOCK`. A test server spawns its own seats, so a test never touches the phone. |
| 2 | The `T()`/`R()` shell functions don't persist between calls | **Gone by construction.** There is no shell (`--tools ""`); the actions are MCP tools. |
| 3 | A rate-limited chat request is silently dropped | **Queued.** A request refused by `minChangeGapS` stays in the seat's queue with `retryAt`. The broker sends one `say` ("next change in 42 s") and delivers a `[queued]` turn when it is allowed. Max 3 per seat, the newest wins per intent, and a request expires after 5 min with a line telling the person. |
| 4 | No synthetic-audio path (audioWorklet hangs in headless Chromium on WSL) | **A fake page.** `scripts/seat/fake-page.js` is a node client that speaks the socket protocol and answers `inspect` from recorded features and screenshots. Tests of the broker and a real Sonnet seat need no browser. |
| 5 | Drop-hold silently swallows requests | **Same queue as 3**, with the reason `drop`. One `say` ("holding for the drop"), released on the first tick after the drop ends. |
| 6 | The display id changes on every page load, which breaks `--display` | **Gone by construction.** There are no display ids. The `seatKey` lives in `sessionStorage`, so a reload reattaches to the same process. |
| 7 | Tick-level blocks are not in the log | **Every tick writes a log row**, including blocked and skipped ticks, in `seats/<seatKey>/ticks.jsonl`: `{t, verdict, rule, why, blocked, queued, turn, busySkip, costUsd}`. `act` refusals go to the same log. |
| 8 | No scheduler; the model improvises "wait 60 s" | **Gone by construction.** The broker's tick timer and the socket's events produce the turns. Ending a turn is waiting (relay `autoseat.js:867`). |

## 7. Milestone 1: Aaron's phone as the single connection

**Scope**

- `scripts/seat/`: the broker (Seat registry, spawn, tail, tick, queue, state), `mcp.js`,
  `system-prompt.md` and `fake-page.js`.
- `remote-ws-plugin.js` routes seat messages to the broker and no longer broadcasts them.
- `src/remote/seatClient.js` sends seat-hello and shows the seat badge. Chat is a one-line input
  behind `?chat=1`.
- The `remote-vj` skill is rewritten for the MCP tools. The limits are 1 process total, the daily
  cap and `--max-budget-usd`.

**Done when** each of these is shown on `cranes-local.hypnodroid.com` from the phone:

1. Opening the page spawns one Sonnet process. The log shows `SPAWN <email> <seatKey> pid ...`.
2. "make it wilder" in chat changes `knob_12` within about 10 s, and the change log row shows the
   values before and after.
3. A second request within 60 s is queued, the phone shows "next change in N s", and the request
   is applied after the gap.
4. Reloading the tab reattaches to the same pid, with no second process.
5. Closing the tab ends the process after about 2 min. Reopening it resumes the same session id.
6. A run against `fake-page.js` passes in CI with no browser and no phone.

## 8. Open questions (one word each)

1. Bill seats to an API key (`--bare`) or to the subscription? **key / subscription**
2. Verify the Access JWT in milestone 1, or trust the header for now? **verify / header**
3. Who besides Aaron gets a Claude seat? **nobody / list**
4. Daily dollar cap per person? **number**
5. Is chat on by default, or behind `?chat=1`? **on / param**
6. Should the broker live in the Vite plugin (milestone 1), or later in its own process so a Vite
   restart doesn't recycle every seat? **plugin / separate**
7. Close #182 and #187 unmerged, as recommended? **yes / no**
