---
name: show
description: "Show-day launcher: preflight checklist (✅/❌), launch the show browser on the show shader + controller, verify audio and runtime, arm the health and art-critic monitors, then hand off to /vibej2. Usage: `/show [shader-path] [audio=<label>]`, `/show check` (preflight only), `/show panic <fork>` (hot-swap to a known-good fork, no reload)."
allowed-tools: Bash Read Write Edit Grep Glob Agent Monitor TaskStop
---

# show: show-day launcher

This skill gets the wall up correctly and quickly. The runbook, knob map, story table, fork
library and failure fixes live in **[docs/show-playbook.md](../../../docs/show-playbook.md)**.
Read it once, and use it for anything this skill doesn't cover. Brief every agent you start with
**docs/vj-preferences.md**.

## Arguments

- **No args:** the live line, `shader=claude/wip/black-sun/sun-1` + `controller=black-sun`.
- **`<shader-path>`:** for a fork, `sun/N` pairs with `controller=sun-N`, and
  `sun/1` pairs with `controller=sun`. For any other shader, add `&controller=` only if
  a matching `controllers/*.js` exists.
- **`audio=<label>`:** appends `&audio_device=<label>`. Without it, the page uses the OS default
  input, which should be BlackHole 2ch. Don't pass `audio_device` otherwise.
- **`check`:** run step 1 only, then stop.
- **`panic <fork>`:** run the Panic section only.

## 1. Preflight: run these, then print a ✅/❌ table

```bash
P=$(./scripts/dev-port); echo "port $P"
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:$P/"
lsof -a -p "$(lsof -nP -iTCP:$P -sTCP:LISTEN -t | head -1)" -d cwd -Fn | tail -1   # which checkout serves the wall
git branch --show-current; git fetch -q origin && git status -sb | head -1
grep -n "'\*\*/controllers/\*\*'" vite.config.js && grep -n "chokidar.watch('controllers'" vite-plugins/editor-sync-plugin.js
node scripts/vj/show.js displays
system_profiler SPAudioDataType | grep -i -A2 'BlackHole'
```

| Check | ✅ when |
|---|---|
| Dev server | HTTP `200`. If not, start `npm run dev` in a background Bash, then recheck. |
| Server checkout | The cwd is the checkout you'll edit. Edits in any other checkout never reach the wall (2026-10-09: the server ran from the main checkout while edits went to `peter-show`). |
| Branch | `peter-show` and not `behind`. If behind, ask before running `git pull --ff-only`. |
| No-reload controller fix (PR #144) | Both greps hit: `vite.config.js` ignores `**/controllers/**`, and `editor-sync-plugin.js` runs its own `chokidar.watch('controllers')` |
| Projector | `displays` lists more than the built-in panel. `launch` uses the **last** display, so confirm with the user if there's only one. |
| BlackHole present | It appears in the audio device list. It's verified as the active input after launch in step 3. |

Any ❌ means fix it or tell the user before launching. Never launch past a wrong-input ❌.

## 2. Out-of-band reminders: say these to the user in one line

No command can check these: **Do Not Disturb on**, any **break-reminder or screen-dimming app
quit** (one dimmed the wall in rehearsal), and the **macOS input set to BlackHole 2ch** with music
routed into it.

## 3. Launch and verify

```bash
node scripts/vj/show.js stop
node scripts/vj/show.js launch "http://localhost:$P/jam.html?shader=<shader>&controller=<controller>&wavelet=true&vj=1&remote=display"
node scripts/vj/show.js eval 'async () => { await new Promise(r => setTimeout(r, 2000)); return { input: window.cranes.audioInputLabel ?? null, energy: window.cranes.flattenFeatures().energy, meter: typeof window.__vjMeter, validate: typeof window.__vjValidate } }'
node scripts/vj/show.js eval 'async () => { const a = window.cranes.controllerFeatures?.bs_time; await new Promise(r => setTimeout(r, 1000)); return { before: a, after: window.cranes.controllerFeatures?.bs_time, keys: Object.keys(window.cranes.controllerFeatures || {}).length } }'
```

| Check | ✅ when |
|---|---|
| Input | `input` contains `BlackHole` and `energy > 0`. If not, stop and fix the OS input. |
| Runtime | `meter` = `object` and `validate` = `function` |
| Controller | `after > before`, with keys present. If the time doesn't advance, the controller is throwing; see playbook section 7, "Picture frozen". |

Then take one look with `node scripts/vj/show.js shot .claude/vj-shots/show-start.png`, and Read it.

## 4. Arm the watchers

Health alerts: a Monitor with a 30-minute timeout, re-armed whenever it expires.

```bash
tail -n 0 -F .claude/vj-signals.jsonl | grep -E --line-buffered '"type":"(clip|too-dark|shiver|boot)"|"type":"flicker","flicker":([2-9]|[1-9][0-9])'
```

**The art critic:**

1. Start one background `general-purpose` agent that reads and adopts `.claude/agents/art-critic.md`.
   Don't use the `art-critic` type itself: it is Read/Glob/Grep only, so it can't take shots or
   append to the log (confirmed in the 2026-10-09 test drive).
2. Allow it read-only access only: `show.js shot`, plus `show.js eval` to read
   `__vjMeter`/`controllerFeatures` and for its waits.
   Have it summarise `__vjMeter` in the browser (e.g. average the last 100 samples): returning the
   raw object prints its whole 900-sample buffer, about 330KB.
3. It loops about every 2.5 min for ~40 min. Each cycle it takes a shot pair and the meter, and
   appends a `### critic #N — <time> — <score>/10` verdict with a `**Fix next:**` line to
   `.claude/vj-critic.md`.
4. Restart it when it finishes.
5. Put a Monitor on the critic's log:

```bash
touch .claude/vj-critic.md; tail -n 0 -F .claude/vj-critic.md | grep -E --line-buffered '^### critic|^\*\*Fix next|^1\.|WALL DOWN'
```

Weigh the critic's fixes against the user's words and docs/vj-preferences.md; the user always
wins.

## 5. Write the recovery snapshot

Write `.claude/vj-state.json`:
`{ shaderPath, showUrl, audioDevice, room: "show", port, moveStyle: "default", mode: "live-loop", startedAt }`

## 6. Hand off

Tell the user in one line: the wall is up, the input label, and both watchers are armed. Then
invoke `/vibej2` with the shader path for the live loop, unless the user only wanted the wall up.
In that case, say that it's ready, and that `/vibej2` starts the loop and `/show panic <fork>` is
the escape hatch.

## Panic: `/show panic <fork>`

This gets a known-good look on the wall without a reload. **Never use `goto` mid-set.** Pick a
fork from the playbook's fork library; `sun/7` is the healthy default.

```bash
node scripts/vj/show.js eval 'async (path) => {
  const src = await fetch("/shaders/" + path + ".frag?t=" + Date.now()).then(r => r.text())
  const v = window.__vjValidate(src); if (!v.ok) return { ok: false, info: v.info }
  window.cranes.shader = src
  const u = new URL(location.href); u.searchParams.set("shader", path); history.replaceState({}, "", u)
  return { ok: true }
}' '["<fork-path>"]'
```

- **The controller stays:** the live controller keeps running, and the fork reads its `bs_*`
  uniforms.
- **Wait first if needed:** if an editing agent holds the page token, stop it before swapping.
- **Confirm:** take a shot afterwards.
- **If the picture is frozen** (the controller is throwing), fix the state first. See the
  playbook's failure runbook.
