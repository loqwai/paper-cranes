---
name: remote-vj
description: "Remote-VJ paper-cranes on Aaron's phone (or any display on the cranes-local tunnel) by running one guarded tick script and doing exactly what its JSON verdict says. Written so a smaller model (Sonnet) can run it without judgment calls. Use for 'remote vj', 'vj my phone', 'connect to my phone', 'what is my phone showing', 'watch my midi', or a chat request about the visual."
allowed-tools: Bash Read Monitor TaskStop
---

# remote-vj

You keep a visual healthy on a screen you cannot touch. **A script decides. You run it and do what
it says.** Do not invent changes. Do not edit files.

Aaron is often at a show. He cannot tap or reload anything. Every reload costs him fullscreen.

## Setup (once per session)

Run these commands exactly. `T` is the tick script, `R` is the low-level CLI.

```bash
KIT=/home/hypnodroid/Projects/paper-cranes-sonnet-prep      # or any checkout that has scripts/remote/vj-tick.js
T() { PORT=6977 node $KIT/scripts/remote/vj-tick.js "$@"; }
R() { PORT=6977 node $KIT/scripts/remote/cranes-remote.js "$@"; }
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:6977/   # must print 200
T displays                                                         # lists connected screens
```

- `200` and one display id: continue.
- Not `200`: the dev server is down. **Stop.** Tell Aaron: "The cranes-local server is down." Do not
  start it yourself (starting it is in `kb/reference/paper-cranes-live-tunnel.md`, for the coordinator).
- No display ids: tell Aaron "Open the cranes-local link and keep it in front", with the URL from the
  table below. Then run `T displays` again in 60 s.
- Several display ids: use the one you were assigned. Add `--display <id>` to **every** `T` and `R`
  command. Without it the scripts refuse.

| What | URL |
|---|---|
| Phone, remote-controllable | `https://cranes-local.hypnodroid.com/?shader=clit-set/2&controller=clit-set&wavelet=true&vj=1` |

`vj=1` turns on the meters. Without it the tick can only check connection, audio and freezes.

## The loop (every 60 s)

1. Run `T` (add `--display <id>` if you have one). It prints one JSON object.
2. Read the screenshot at `shot` with the Read tool.
   - If it is solid black, one flat colour, or shows text or an error page: run `T act panic` and tell
     Aaron "Swapped to the safe visual." Skip steps 3 and 4.
3. Look at `run`.
   - `run` is a command: run it **exactly as printed**. Then send Aaron one line: what changed and
     the `verdict.reason`.
   - `run` is `null`: run nothing.
4. Look at `say`. If it is not `null`, send it to Aaron (or to the person who made the `request`).
   Send the same `say` only once, not every tick.
5. Wait 60 s (use your scheduler or Monitor, not a busy loop). Go to 1.

The `next` field repeats this in one sentence. When in doubt, do what `next` says.

## Decision table (what the script already decided for you)

| `verdict.rule` | `verdict.action` | What it means | Your job |
|---|---|---|---|
| `disconnected` | `tell_aaron` | No reply from the page | Send `say` |
| `pick-display` | `none` | Several screens | Re-run with `--display <id>` |
| `hidden` | `tell_aaron` | Tab in background or screen off | Send `say` |
| `frozen` | `reload` | Frame counter stuck | Run `run` |
| `audio-suspended` | `tell_aaron` | Browser paused audio | Send `say` (he taps once) |
| `shader-error` | `swap` | Shader failed to compile | Run `run` |
| `time-held` | `release_time` | A `time=` param froze motion | Run `run` |
| `no-audio` | `tell_aaron` | Mic gives nothing | Send `say` |
| `no-wavelet` | `tell_aaron` | URL lacks `wavelet=true` | Send `say` |
| `drop-hold` | `none` | A drop is playing | Nothing |
| `input-quiet` / `input-hot` | `gain` | Input level wrong | Run `run` |
| `no-meter` | `none` | No `vj=1` | Nothing (mention once that `&vj=1` enables more checks) |
| `black` | `swap` | Screen is black | Run `run` |
| `clip` | `nudge` | Highlights clipping | Run `run` |
| `flicker` | `nudge` | Flicker over the limit | Run `run` |
| `still` | `nudge` or `swap` | Music plays, picture still | Run `run` |
| `request-*` | any | A person asked for something | Run `run` if present; send `say` |
| `healthy` | `none` | All good | Nothing |

If `blocked` is not `null`, a guardrail refused the change (too soon, in a drop, too big). Run
nothing. That is correct behaviour, not an error.

## Chat requests (optional)

When a person asks for something ("make it wilder", "too much flashing", "change it", "more colour"),
pass their words to a tick:

```bash
T request "make it wilder" --from Sam      # add --display <id> when you have one
```

It saves the line as that display's `request.json` and runs a normal tick. Follow the output exactly
like any tick: run `run` if present, send `say` to the person.

The tick maps the line onto the same fixed menu (wilder, calmer, smoother, colour, swap). Anything
else gets "I can do: ..." in `say`. Health rules still win: a frozen page is fixed first, and a drop
holds every request.

## Commands you may run

Only these. Every change goes through the guardrails and is logged with before/after in
`$KIT/.claude/vj/<display>/log.jsonl`.

```bash
T                         # observe + verdict (never changes anything)
T act panic               # safe visual, time released, the loop's knobs released (no reload)
T act undo                # revert the last change
T log 10                  # last 10 changes
R status                  # raw status, read-only
R logs 20                 # console errors on the page, read-only
```

Plus whatever `run` prints. Nothing else changes the page.

## Never do

1. **Never move geometry.** Knobs k1 to k8 (X, Y, VOYAGE, ZOOM, TURN, POWER, BODY, CURL) are refused by
   the script. Never oscillate anything back and forth.
2. **Never reload during a drop unless frozen.** `R reload` and `T act reload` refuse unless the frame
   counter is frozen. Never add `--force` unless Aaron asks for a reload in those words.
3. **Never edit `index.js` or `src/*.js` in `/home/hypnodroid/Projects/paper-cranes-live`**, and never
   restart its Vite server. Either one reloads Aaron's phone. You do not edit files at all.
4. **Never weaken Cloudflare Access**, never bind a dev server to `0.0.0.0`, never put the token
   (`~/.config/paper-cranes/remote-inspect-token`) in a URL, a message or a commit.
5. Never run `R eval`, `R code`, `R navigate` or `R shader` yourself. Never put a test shader on the wall.
6. Never run `npm ci` or `npm install` in a worktree whose `node_modules` is a symlink.

## Smoke test (run once at the start)

1. `T displays` prints exactly the ids you expect.
2. `T` prints JSON with `status.connected: true` and a `shot` path.
3. Read the `shot` file. You see the visual (not black).
4. `T act reload` prints `"ok": false` with "refusing reload" (the page is not frozen). This proves the
   guardrail works. If it says `"ok": true`, stop and tell Aaron.
5. `T log 3` shows that refusal.

## Panic

The wall looks broken, or Aaron says "panic", "go back", or "safe":

1. `T act panic`
2. `T` and Read the `shot`.
3. Still broken and `verdict.rule` is `frozen`: run the `run` command (a reload).
4. Still broken after that: tell Aaron "Open https://2cb.pw/clit-now and tap once." Stop changing
   things.

## Known gaps (for whoever builds the multi-user version)

- **One shared token.** Every agent with this machine's token can drive every display. Each person
  needs their own token, scoped to their display.
- **Replies are broadcast.** Status, features, screenshots and logs go to every `/ws` client. Each
  person's replies need to be routed only to their agent.
- `--display` targeting is enforced by pages that run this branch's `src/remote/inspect.js` (requests
  carry `to`). An older page executes every request and only the reply is filtered.
- The chat hook is a file (`request.json`) per display. There is no chat transport yet.

## Reference

Protocol, security model and every CLI command: [docs/remote-inspect.md](../../../docs/remote-inspect.md).
Rules and thresholds: `scripts/remote/vj-rules.js`, `scripts/remote/vj-config.js`; tests:
`npx vitest run scripts/remote/`. Tunnel: vault `kb/reference/paper-cranes-live-tunnel.md`. Show
quickstart: `docs/show-quickstart.md`.
