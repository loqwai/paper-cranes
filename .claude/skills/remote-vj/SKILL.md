---
name: remote-vj
description: "Remote-VJ with Aaron while paper-cranes runs on his phone or another device: bring up the dev server behind the cranes-local.hypnodroid.com Cloudflare tunnel, then use the cranes-remote CLI to sample live audio features, screenshot the canvas, stream his MIDI, set knobs, hot-swap shaders/controllers, freeze time, navigate or reload, and eval. Use for 'remote vj', 'remote dj', 'connect to my phone', 'inspect the phone', 'what is my phone showing', 'watch my midi', or debugging a visual running on another device."
allowed-tools: Bash Read Write Edit Grep Glob Monitor TaskStop
---

# remote-vj: inspect and change paper-cranes on Aaron's device

Aaron runs the page on his phone, often at a show, and **cannot tap or reload anything**. You work
from this machine through the dev server's `/ws`. Mechanics, protocol and security model:
[docs/remote-inspect.md](../../../docs/remote-inspect.md). Tunnel ids, ingress and teardown:
vault note `kb/reference/paper-cranes-live-tunnel.md`.

## 1. Bring it up

The live checkout is `/home/hypnodroid/Projects/paper-cranes-live` (its own worktree; never the
primary checkout). The soul cloudflared container already routes
`cranes-local.hypnodroid.com` to `host.docker.internal:6977` behind the default
"Protect hypnodroid.com" Access app, so only the dev server needs starting. On a new or rebuilt machine run
`scripts/remote/setup-cranes-local.sh --check` first; it reports every missing piece
(see `docs/cranes-local-setup.md`).


```bash
cd /home/hypnodroid/Projects/paper-cranes-live
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:6977/   # 200 = already up
# else (MUST bind 127.0.0.1; vite.config.js defaults to 0.0.0.0):
PORT=6977 nohup npx vite --port 6977 --strictPort --host 127.0.0.1 > /tmp/cranes-dev.log 2>&1 &
curl -sI https://cranes-local.hypnodroid.com/ | head -1           # 302 to Access login = gated
```

Phone URL (Access login on first visit, then one tap to allow the mic):

```
https://cranes-local.hypnodroid.com/?shader=clit-set/2&controller=clit-set&wavelet=true
```

Add `&midi=true` for his MIDI controller (Chrome asks for MIDI permission once) and `&vj=1` for
the aesthetic meter. No token goes in the URL: the page fetches it from the dev server.

## 2. The CLI

```bash
R() { PORT=6977 node /home/hypnodroid/Projects/paper-cranes-live/scripts/remote/cranes-remote.js "$@"; }
R status                               # audio.running must be true; shaderError must be null
R features                             # core features + controller cs_* + knobs (+ meter with vj=1)
R features --keys 'energy*,bass*,cs_*' # glob filter
R shot /tmp/phone.jpg                  # then Read /tmp/phone.jpg to SEE it
R logs                                 # console errors on the phone
R watch features 1s --keys 'energyZScore,cs_kick'   # run in background / Monitor
R watch midi                           # his knob turns: {device,type,channel,number,value,t}
R set knob_12 0.8                      # "null" releases
R time 30 / R time off                 # freeze / release the clocks
R shader clit-set/1                    # hot swap, reports compile result; bad GLSL keeps the old one
R code ./x.frag                        # hot swap a local file
R controller clit-set
R navigate '?shader=clit-set/2&controller=clit-set&wavelet=true&knob_5=0.4'   # in place when it can
R reload                               # last resort, see 4
R eval '() => window.cranes.inputGain.gain.value = 6'
```

## 3. Debug loop

1. **Sample**: `R status`, `R features`, `R shot /tmp/a.jpg`, then Read the jpg. Note the numbers
   you will judge by, such as energy, a ZScore and `cs_*`.
2. **Change one thing**: a knob (`set`), the shader (`code`/`shader`), or a time freeze to
   isolate audio from clock motion.
3. **Re-sample** the same way with `/tmp/b.jpg` and compare. Keep or revert (`set k null`,
   `shader <previous>`).
4. Shader edits on disk in the live checkout also hot-swap, but only for the `.frag` on screen.

Tell Aaron what you changed in one line. He is watching the screen.

## 4. Reloads: avoid them

- Editing `index.js` or any `src/*.js` the page loaded in the live checkout **reloads his
  phone**, and so does a Vite restart (vite.config.js, vite-plugins/). `shaders/**`,
  `controllers/**` and `src/remote/inspect*.js` do not: they hot-swap or are ignored. Batch
  reload-causing merges and ask the coordinator to time them.
- After any reload: fullscreen is lost (needs a tap). Audio usually resumes by itself, because
  Chrome keeps the earlier tap across a same-origin reload. Confirm with `R status` that
  `audio.running` is true. If it says suspended, tell Aaron he needs one tap.
- Use `navigate` instead of `reload`: shader, controller, knobs, time and numeric params apply in
  place.

## 5. Pitfalls from the 2026-11-22 show

- **`wavelet=true` is required for clit-set**: the controller reads wavelet band/onset features.
  Without it the visual barely moves.
- **A phone mic is about 10x quieter than a line input.** Absolute gates (`energy > 0.1`) never
  open. Gate on relative levels instead (`*ZScore`, `*Normalized`), or raise
  `window.cranes.inputGain.gain.value` with `eval`, or use `&audio_gain=` (boot param, needs a
  reload).
- **`time=` freezes the clocks** (`time` and `iTime`). A page that "stopped moving" may just be
  frozen: check `R features --keys time,iTime` and run `R time off`.
- **Meters**: with `vj=1`, `features` includes `meter` (`__vjMeter.summary`: flicker, clip,
  motion, lum) and `residR`. Without `vj=1` those keys are absent.

## 6. Stop

```bash
pkill -f 'cranes-remote.js watch'                     # your streams
pkill -f 'paper-cranes-live/node_modules/.bin/vite --port 6977'   # hostname then 502s behind Access
```

Leave the tunnel route alone unless asked. Teardown steps are in the vault note.

## 7. Security

- Access is the only way in from outside. Never bind the live dev server to 0.0.0.0, never add a
  bypass policy, never expose `/ws` elsewhere.
- The token lives in `~/.config/paper-cranes/remote-inspect-token` (`R token rotate` rotates it)
  and is served only to loopback peers. Requests are HMAC-signed, single-use and time-boxed.
- `eval`, `code` and `shader` run code in his browser, so they exist only in dev builds and only
  with a valid signature. Never paste the token into a URL, a chat or a commit.
