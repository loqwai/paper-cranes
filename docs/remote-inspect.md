# Remote inspect: look at and change a running page from the dev machine

Paper Cranes can run on a phone at a show while an agent on the dev machine samples its audio
features, takes screenshots, reads its console errors, streams its MIDI, and changes knobs,
shaders, controllers and time without reloading. The agent skill that drives this is
[`.claude/skills/remote-vj/SKILL.md`](../.claude/skills/remote-vj/SKILL.md).

## How it fits together

```
phone tab (cranes-local.hypnodroid.com, Cloudflare Access)
   └─ src/remote/inspectClient.js ── wss://cranes-local…/ws ─┐
                                                              ├─ Vite dev server /ws (remote-ws-plugin broadcast)
dev machine: scripts/remote/cranes-remote.js ── ws://127.0.0.1:<port>/ws ─┘
```

- **Page side.** `index.js` imports `src/remote/inspectClient.js` in dev builds only. The client
  turns itself on when the page is on a `cranes-local.*` host or has `?inspect=1`. `?inspect=0`
  turns it off, and so does a `room` param (a room would route `/ws` to the public relay). It
  fetches the session token from `/__remote-inspect/token`, opens its own `/ws` connection, and
  answers signed `inspect` requests with `inspect-reply` messages. When a socket connects it
  sends `inspect-hello`. Local Web MIDI events go out as `midi-event`.
- **HMR.** `inspectClient.js` self-accepts. Editing it, `inspect.js` or `inspectAuth.js`
  hot-swaps the new code into a running page without a reload. Editing `index.js` or any other
  module the page loaded triggers a **full reload of every open tab**, the show phone included.
- **CLI side.** `scripts/remote/cranes-remote.js` signs each request with the same token, read
  from `~/.config/paper-cranes/remote-inspect-token`.

## The phone URL

No extra params are needed on the tunnel host:

```
https://cranes-local.hypnodroid.com/?shader=clit-set/2&controller=clit-set&wavelet=true
```

Add `&midi=true` to forward a MIDI controller. Android Chrome asks for MIDI permission once.
Add `&vj=1` for the aesthetic meter, which `features` then reports.

To test locally, start a dev server on a free port and open
`http://127.0.0.1:<port>/?shader=…&inspect=1`.

## CLI

Run it from any checkout. `PORT` (or `CRANES_PORT`, or `--port`) selects the dev server. The live
show server is **6977**.

```bash
R() { PORT=6977 node scripts/remote/cranes-remote.js "$@"; }
R status                          # shader, controllers, fps, canvas, audio {state, running, energy}, shader error
R features                        # core audio features (value/Normalized/ZScore), controller cs_* outputs, knobs, meter
R features --keys 'bass*,cs_kick' # glob filter over every uniform
R features --all                  # every measured feature and statistic, plus wavelet features
R shot /tmp/phone.jpg --width 480 # downscaled JPEG of the canvas; Read the file to look at it
R logs 30                         # recent console errors/warnings and uncaught errors on the page
R watch features 1s --keys 'energy*,cs_*'   # one JSON line per sample
R watch midi                      # one JSON line per CC / note: {device, type, channel, number, value, t}
R set knob_12 0.8 knob_3 0.2      # writes manualFeatures (same slot the MIDI knobs use); "null" releases
R time 12.5 | R time off          # freeze / release time and iTime
R shader clit-set/1               # hot-swap shaders/clit-set/1.frag; reports the compile result
R code ./my.frag                  # hot-swap raw GLSL from a local file
R controller clit-set             # replace the controller chain (no args clears it)
R navigate '?shader=clit-set/2&controller=clit-set&wavelet=true&knob_5=0.4'
R navigate '/?shader=x&audio_gain=4' --reload   # force a real navigation
R reload                          # full reload (see caveats)
R eval '() => window.cranes.inputGain.gain.value = 8'
R token / R token rotate          # show / rotate the token
```

`navigate` resolves its argument against the page's current URL. When only `shader`,
`controller`, `knob_*`, `time`, `midi` or numeric uniform params change, it applies the change
**in place**: no reload, and audio keeps running. Anything read at boot, such as `wavelet`,
`audio*`, `fft_size`, `image`, `vj` or a different path, needs a real navigation. The reply then
says `reloading` and gives the reason.

`R displays` lists the connected display ids. With one display connected, every command targets
it. With several, every command except `watch midi` refuses until you pass `--display <id>`. A
targeted request carries `to: <id>` inside the signed payload, and pages ignore requests addressed
to another display (pages older than this change execute every request; only the reply is
filtered).

`reload` and `navigate --reload` refuse unless the page's frame counter is frozen (two `status`
samples a second apart, tab visible). Pass `--force` only when Aaron asked for a reload.

## The guarded VJ loop

`scripts/remote/vj-tick.js` wraps this CLI for agents that should follow rules instead of
improvising (the `remote-vj` skill). One tick observes the page, saves a screenshot, and prints a
JSON verdict from a fixed menu (`none`, `nudge`, `gain`, `release_time`, `swap`, `reload`,
`tell_aaron`) with the exact command to run. `vj-tick.js act …` applies a change through the
guardrails in `scripts/remote/vj-rules.js`: one change a minute, reload only when frozen, no geometry
knobs, knob steps of at most 0.1, no back-and-forth within 5 minutes, nothing during a drop, and
swaps only to the known-good list in `scripts/remote/vj-config.js`. State and the before/after
change log live per display under `.claude/vj/<display>/`. A chat line can be passed with
`vj-tick.js request "<words>"`; it maps onto the same menu.

## Reload caveats

- After a script-initiated reload or same-origin navigation, Chrome keeps the tab's earlier user
  gesture ("sticky activation before navigation"). An AudioContext created without a new tap can
  then still start, and the client retries `resume()` every 2 s. This was verified under
  `--autoplay-policy=document-user-activation-required` on desktop Chromium with Pixel 7
  emulation, but not on a real Android phone. After any reload, run `status`: `audio.running`
  must be `true`, otherwise `audio.note` says it is suspended.
- A reload exits HTML fullscreen, which cannot be re-entered without a tap. Prefer `navigate` in
  place.
- A Vite restart (for example after a `vite-plugins/` or `vite.config.js` change) reloads every
  open tab once it reconnects.

## Security

- **Reachability.** The only way in from outside is `cranes-local.hypnodroid.com`, behind the
  default "Protect hypnodroid.com" Cloudflare Access app. The live dev server must bind
  `127.0.0.1`. The page connects to `wss://` on its own host, so the Access cookie covers the
  socket.
- **Token.** It is created on first use in `~/.config/paper-cranes/remote-inspect-token` (mode
  600, outside the repo and anything Vite serves). `/__remote-inspect/token` returns it to
  loopback peers only: cloudflared and this machine's own tabs and CLI. A dev server started with
  the default `host: 0.0.0.0` therefore does not hand it to the LAN.
- **Signing.** Requests are `{payload, sig}` with `sig = HMAC-SHA256(token, payload)`, so the
  token never crosses the socket. Each payload carries a single-use id and a timestamp that must
  be within ±120 s. The CLI corrects for clock skew automatically.
- **Eval.** `eval` and shader hot-swaps run code in the page, so they exist only in dev builds and
  only behind a valid signature. A production build (visuals.beadfamous.com) contains none of
  this.
- **What is not protected.** Replies (features, screenshots, logs) and `midi-event` messages are
  broadcast to every `/ws` client, so anything that can reach `/ws` can read them. The older
  `update-params` remote-control messages stay unauthenticated, as they were before.
