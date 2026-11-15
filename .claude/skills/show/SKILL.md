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
  input: the line feed (BlackHole 2ch on macOS; Voicemeeter or VB-Cable on Windows) or a mic.
  Don't pass `audio_device` otherwise, unless step 3 shows Chrome opened something else: with the
  Background Music app installed, Chrome's default input can differ from the macOS default
  (2026-10-10). Then relaunch with `audio=BlackHole`.
- **`gain=<x>`:** appends `&audio_gain=<x>`. Needed on a microphone: the gates are tuned for a
  line feed and a mic hearing the room arrives 10–30× quieter. Calibrate per /vibej2 setup step 3.
- **`check`:** run step 1 only, then stop.
- **`panic <fork>`:** run the Panic section only.

## 1. Preflight: run these, then print a ✅/❌ table

Same commands on macOS, Windows (Bash tool / Git Bash) and Linux; see "Runs on macOS, Windows
and Linux" in `/vibej2` for the per-OS table. Read `.claude/skills/local-rig/SKILL.md` first if
this machine has one.

```bash
node scripts/vj/context.js                     # platform, port, dev server, show browser
P=$(./scripts/dev-port)
curl -s "http://localhost:$P/shaders/<shader>.frag" | cmp -s - shaders/<shader>.frag && echo "serving this checkout" || echo "SERVING ANOTHER CHECKOUT"
git branch --show-current; git fetch -q origin && git status -sb | head -1
grep -n "'\*\*/controllers/\*\*'" vite.config.js && grep -n "chokidar.watch('controllers'" vite-plugins/editor-sync-plugin.js
node scripts/vj/show.js displays
```

| Check | ✅ when |
|---|---|
| Dev server | HTTP `200`. If not, start `npm run dev` in a background Bash, then recheck. |
| Server checkout | `serving this checkout`: the served `.frag` is byte-identical to the one on disk here. Edits in any other checkout never reach the wall (2026-10-09: the server ran from the main checkout while edits went to `peter-show`). |
| Branch | The show branch and not `behind`. If behind, ask before running `git pull --ff-only`. |
| No-reload controller fix (PR #144) | Both greps hit: `vite.config.js` ignores `**/controllers/**`, and `editor-sync-plugin.js` runs its own `chokidar.watch('controllers')` |
| Projector | `displays` lists more than the built-in panel. `launch` uses the **last** display, so confirm with the user if there's only one. |
| Input | Verified after launch in step 3: the label is the line feed or mic you expect, and `energy` reaches 0.02+ on loud music (else set `gain=`). |

Any ❌ means fix it or tell the user before launching. Never launch past a wrong-input ❌.

## 2. Out-of-band reminders: say these to the user in one line

No command can check these: **Do Not Disturb on** (macOS Focus; Windows Win+N), any **overlay,
break-reminder or screen-dimming app quit** (one dimmed the wall in rehearsal; on Windows also
Xbox Game Bar, Discord, Steam and GeForce overlays), the **OS input** set to the line feed with
music routed into it (or the mic, with `gain=`), and on **Windows, the show window kept in
front**: Windows stops painting a covered window. Any `show.js` timeout there: `show.js focus`.

## 3. Launch and verify

```bash
node scripts/vj/show.js stop
node scripts/vj/show.js launch "http://localhost:$P/jam.html?shader=<shader>&controller=<controller>&wavelet=true&vj=1&remote=display"
node scripts/vj/show.js eval 'async () => { await new Promise(r => setTimeout(r, 2000)); return { input: window.cranes.audioInputLabel ?? null, energy: window.cranes.flattenFeatures().energy, meter: typeof window.__vjMeter, validate: typeof window.__vjValidate } }'
node scripts/vj/show.js eval 'async () => { const a = window.cranes.controllerFeatures?.bs_time; await new Promise(r => setTimeout(r, 1000)); return { before: a, after: window.cranes.controllerFeatures?.bs_time, keys: Object.keys(window.cranes.controllerFeatures || {}).length } }'
```

| Check | ✅ when |
|---|---|
| Input | `input` is the expected device and `energy > 0`. If not, stop and fix the OS input. On a mic, calibrate `gain` (/vibej2 setup step 3). |
| Runtime | `meter` = `object` and `validate` = `function` |
| Controller | `after > before`, with keys present. If the time doesn't advance, the controller is throwing; see playbook section 7, "Picture frozen". |
| Shader gate | With music playing, the shader's own quiet gate (`smoothstep` on `energyMean` × `bs_presence`, or `quietGate`) sits near 1. If it sits low, the input is quieter than the line feed the gates were tuned for, and the scene reads as silence: dim and nearly frozen. `energy > 0` alone doesn't prove this. Fix the **level**, not the shader, in this order: (1) raise the OS input volume (macOS mic at 27% barely registered, 80% worked, 2026-11-14); (2) `audio_gain`, live via `window.cranes.inputGain` (/vibej2 setup step 3); (3) only if neither reaches it, rescale the gate thresholds in the `-wip` copy, and note it in the shader doc, since a line feed then holds the gates open. The meter's `gate` is `quietGate` when the controller provides it, else the same energy formula, so it also reads low at a low input level. |

Then take one look with `node scripts/vj/show.js shot .claude/vj-shots/show-start.png`, and Read it.
A black frame while `energy` moves is a poisoned feedback buffer: `node scripts/vj/show.js unstick`.

## 4. Arm the watchers

Three always-on Monitors, each with a 30-minute timeout and re-armed whenever it expires.

The page writes `.claude/vj-signals.jsonl`, and the critic logs to `.claude/vj-critic.md`, in the
**serving checkout**: the dev server's cwd from the preflight. Point both tails there. A tail on a
different checkout never fires.

Health alerts:

```bash
tail -n 0 -F .claude/vj-signals.jsonl | grep -E --line-buffered '"type":"(clip|too-dark|boot)"|"type":"flicker","flicker":([2-9]|[1-9][0-9])'
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

**Dial releases:** one line each time the user lets go of a dial, naming the knobs that moved
and their old and new values. It polls over CDP, so it needs no `vjtrack=1`.

```bash
while true; do node scripts/vj/watch-dials.js 2>&1 | grep --line-buffered RELEASE; sleep 2; done
```

The loop matters: one failed CDP poll kills `watch-dials.js`. The health grep leaves out `shiver`
because the detector reads 0.9–1.0 constantly; recalibrate it before trusting it again.

**Stray pages:** on macOS, Chrome is often the default browser, so any link opened anywhere on the
laptop (an OAuth login, a Slack link) can land in the show Chrome, on the wall. (On Windows the
show Chrome is a separate profile and links open in the normal one, but the guard is harmless.) Arm a guard that closes them:

```bash
node .claude/skills/sun-set/stray-guard.mjs 2>&1
```

## 5. Write the recovery snapshot

Write `.claude/vj-state.json`:
`{ shaderPath, showUrl, audioDevice, room: "show", port, moveStyle: "default", mode: "live-loop", startedAt }`

## 6. Hand off

Tell the user in one line: the wall is up, the input label, and all three watchers are armed.
Then invoke `/vibej2` with the shader path. This is required: the show always runs the live loop,
which listens for dial releases and steers the visual from them. (`/show check` is the
preflight-only path.)

**Scratch copy:** edits go to a `-wip` copy of the boot shader (for example `sun-1-wip`),
hot-swapped in. The boot shader itself stays untouched as the panic fallback. Check `git status`
first: if the `-wip` file is already tracked, it holds an earlier set's live state, so don't copy
over it. Start the session from it, or make a fresh copy under a new name. At wind-down, save the
session's result as the next numbered fork rather than leaving it in the `-wip` file.

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
