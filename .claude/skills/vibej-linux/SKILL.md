---
name: vibej-linux
description: "Live auto-VJ on Linux: the /vibej2 live loop (one move per beat, show browser over CDP, page-as-sensor wakes, dial-release wakes, ScheduleWakeup heartbeat) for an X11 or XWayland desktop with Chrome or Chromium. Usage: `/vibej-linux [duration|count] [shader-path-or-name] [audio=<input name>]`, `/vibej-linux stop|pause|tick`."
allowed-tools: Bash Read Write Edit Grep Glob Agent ScheduleWakeup Monitor TaskOutput TaskStop
---

# vibej-linux: live auto-VJ loop on Linux

You are the VJ. A shader runs fullscreen on the projector. Each **beat** you look at the frame,
read the meter, listen to the user, and make **at most one** visible change to the shader.
This is `/vibej2` (`.claude/skills/vibej2/SKILL.md`) adapted for Linux. When the two disagree
about a command, this file wins on Linux.

## Context

Arguments: `$ARGUMENTS`

!`node scripts/vj/context.js`

## Hard rules (read these first, they override everything below)

1. **Run every command in this skill with the Bash tool.** Paths are relative to the repo
   root: if the shell (or a Monitor) may start elsewhere, prefix the command with
   `cd <repo root> &&`.
2. **Touch the display ONLY through `node scripts/vj/show.js`.** Never use the claude-in-chrome
   extension or any chrome-devtools MCP on the show page. Their cursor, glow and infobar end
   up on the wall.
3. **Never `show.js goto` mid-set.** It reloads the page and resets all audio history. Change
   shaders by hot-swap (see Arguments).
4. **Edit a scratch copy, never committed art.** Setup copies the shader to a `-wip` path
   (e.g. `sun/7.frag` → `sun/7-wip.frag`) and the whole loop runs on the copy.
5. **One move per beat.** A healthy frame with no user input is a correct no-move beat.
6. **Every beat ends with `ScheduleWakeup` (or the stop procedure).** A beat that ends without
   one silently kills the loop.
7. **User words come first.** If the user said anything since the last beat, that is the move.
8. **Stay responsive.** Anything slow (journal writing, analysis, multi-step edit-and-verify)
   goes to `Agent` with `subagent_type: "fork"`. Only ONE agent at a time may touch the show
   page or the target `.frag`; you hold that token.
9. **Never write a dollar sign followed by a digit in an `eval` source.** This file is a skill
   template; that sequence gets substituted.

## Arguments

`/vibej-linux [duration|count] [shader-path-or-name] [audio=<input name>]`

- **No args:** run until stopped, on the most recently modified `.frag`.
- **Shader:** full path, `shaders/`-relative, no extension, or a unique bare name. Normalize to
  the no-extension path under `shaders/` (e.g. `claude/wip/black-sun/sun-1-show`).
- **`audio=<substring>`:** pick the input by label substring; becomes `&audio_device=<substring>`.
  Omitted: the PulseAudio/PipeWire default source. Add no `audio_device` param then. To take
  the computer's own audio output instead of a mic, pass the sink's monitor source, e.g.
  `audio=Monitor` (list sources with `pactl list short sources`).
- **Duration** (`90m`, `2h`) or a bare integer (beat count): a soft budget. Wrap up when reached.
- **`stop`:** `ScheduleWakeup(stop: true)`, TaskStop every vibej monitor, final journal line,
  delete `.claude/vj-state.json`, one-line wrap-up. Leave the show browser up unless asked.
- **`pause`:** `ScheduleWakeup(stop: true)` only.
- **`tick [shader]`:** run exactly one beat, then return. Shader: the one given, else
  `shaderPath` from `.claude/vj-state.json`, else the most recently modified `.frag`. If
  the show browser is down or shows another shader, run Setup first.

Mid-run with a new shader arg = hot-swap (no reload). Then take a shot:

```bash
node scripts/vj/show.js eval 'async (path) => {
  const src = await fetch("/shaders/" + path + ".frag?t=" + Date.now()).then(r => r.text())
  const v = window.__vjValidate(src); if (!v.ok) return { ok: false, info: v.info }
  window.cranes.shader = src
  const u = new URL(location.href); u.searchParams.set("shader", path); history.replaceState({}, "", u)
  return { ok: true }
}' '["<new-path>"]'
```

## Setup (once, at start)

1. **Dev server.** The Context block above shows `dev server: 200` when it is up. If not, start
   it with the Bash tool, `run_in_background: true`, from the repo root:
   `PORT=6969 npx vite --port 6969 --strictPort`. Edits only reach the wall if this server runs
   from the checkout you are editing.
2. **Make the scratch copy** (hard rule 4): `cp shaders/<path>.frag shaders/<path>-wip.frag`
   unless it already exists. From here on, `<path>` means the `-wip` path.
3. **Pick the display.** `node scripts/vj/show.js displays` lists screens primary first, then
   left to right. `launch` uses the **last** one. It needs `xrandr` (X11 or XWayland);
   if it is missing, ask the user to install their distro's xrandr package. With a single screen it covers the user's
   desktop, so say so before launching. Pass `--display N` to override.
4. **Launch the show browser** on the scratch copy. Always `stop` first (a leftover show browser blocks every
   other command):
   ```bash
   node scripts/vj/show.js stop
   node scripts/vj/show.js launch "http://localhost:6969/jam.html?shader=<path>&vj=1&remote=display"
   ```
   Add `&controller=<name>` only if `controllers/<name>.js` exists. Add `&audio_device=<x>`
   only if the user passed `audio=`.
5. **Verify audio, runtime and controller** in one call:
   ```bash
   node scripts/vj/show.js eval 'async () => { await new Promise(r => setTimeout(r, 2000)); const f = window.cranes.flattenFeatures(); return { input: window.cranes.audioInputLabel ?? null, ctx: window.cranes.audioContext?.state ?? null, energy: f.energy ?? null, meter: typeof window.__vjMeter, validate: typeof window.__vjValidate, controllerKeys: Object.keys(window.cranes.controllerFeatures || {}).length } }'
   ```
   Pass when: `input` is the expected device, `ctx` is `"running"`, `energy` is a number,
   `meter` is `"object"`, `validate` is `"function"`.
   Then check the GPU:
   ```bash
   node scripts/vj/show.js eval '() => { const c = document.createElement("canvas").getContext("webgl2"); const e = c && c.getExtension("WEBGL_debug_renderer_info"); return c ? (e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : "webgl2") : null }'
   ```
   `null`, `llvmpipe` or `SwiftShader` means software rendering, too slow for a show. Stop and
   relaunch with `SHOW_CHROME_FLAGS='--ignore-gpu-blocklist'` (add `--use-angle=vulkan` on
   NVIDIA's proprietary driver if that still fails), then check again. If `input` is null, list the inputs and
   **stop and tell the user**. Never run beats on the wrong input:
   ```bash
   node scripts/vj/show.js eval '() => navigator.mediaDevices.enumerateDevices().then(d => d.filter(x => x.kind === "audioinput").map(x => x.label))'
   ```
6. **Tell the user, in one line:** the input label, the GPU renderer, the display, and the
   Linux checklist: notifications off (GNOME: `gsettings set org.gnome.desktop.notifications
   show-banners false`; KDE: Do Not Disturb), night light off, any screen-dimming app closed.
   No command can check these.
7. **Read `docs/vj-preferences.md`** (the user's standing taste) and the shader's journal
   (`journals/<name>-cool-moments.md`) if it exists. Never re-add a vetoed motif. Brief every
   subagent with `docs/vj-preferences.md`.
8. **Write `.claude/vj-state.json`:**
   `{ "shaderPath", "showUrl", "audioDevice", "port": 6969, "mode": "live-loop", "startedAt" }`.
   Update it only when one of these changes.
9. **Arm two Monitors** (Monitor tool, `timeout_ms: 1800000`, re-arm on expiry):
   - Health alerts:
     ```bash
     tail -n 0 -F .claude/vj-signals.jsonl | grep -E --line-buffered '"type":"(clip|too-dark|boot)"|"type":"flicker","flicker":([2-9]|[1-9][0-9])'
     ```
   - Dial releases (the loop restarts the watcher if a poll fails):
     ```bash
     while true; do node scripts/vj/watch-dials.js 2>&1 | grep --line-buffered RELEASE; sleep 2; done
     ```
10. **Say the cadence** in one line: "Live loop: I check every ~90 s while tuning, up to ~5 min
    when healthy, and I see your messages immediately."
11. Run **beat 1** now.

## The beat

A beat runs when the wakeup fires, a Monitor event arrives, or the user speaks. Steps, in order:

1. **Runtime check** (did the page reload since last beat?):
   ```bash
   node scripts/vj/show.js eval '() => { const fresh = window.__vjSeen !== true; window.__vjSeen = true; return { fresh, meter: typeof window.__vjMeter, validate: typeof window.__vjValidate } }'
   ```
   Beat 1 always returns `fresh: true`; ignore it. On any later beat, `fresh: true` means the
   page reloaded: make no metric-driven move this beat.
2. **Look.** `node scripts/vj/show.js shot .claude/vj-shots/beat-<n>.png`, then Read the PNG.
   Judge: clipping to white? floor too dark? a focal point? legible from across the room?
   shivering? The shot goes over CDP; nothing on the wall moves.
3. **Meter:**
   ```bash
   node scripts/vj/show.js eval '() => ({ s: window.__vjMeter.summary(50), r: window.__vjMeter.residR(50) })'
   ```
   Targets: `clip` 0, `flicker` under 0.7, `dark` 0.1 to 0.3, `lumMin` at least 0.08.
   `rResid` is how musical the motion is (higher is better). If `gate` is under 0.9 (track
   change or silence), make no metric-driven move. If it is still under 0.9 after one ~20 s
   wait, tell the user the music may not be reaching the input, and until it recovers make
   only moves the user asked for.
   Before acting on flicker, check the user's hands. If knobs moved, the flicker is theirs;
   do nothing:
   ```bash
   node scripts/vj/show.js eval 'async () => { const kv = () => JSON.stringify(Object.fromEntries(Object.entries({...window.cranes.manualFeatures, ...window.cranes.messageParams}).filter(([k]) => /^knob_|^nav/.test(k)))); const a = kv(); await new Promise(r => setTimeout(r, 6000)); return a !== kv() }'
   ```
   `true` means their hands, not a defect.
4. **Triage input.** User words, then `RELEASE` lines (a dial held at an extreme asks you to
   bake that direction into the shader), then health alerts. A repeated complaint means the
   last fix failed: make one decisive change 3 to 5 times stronger, not another nudge.
5. **Pick at most one move.** House rules: geometry only evolves (monotonic accumulators, no
   audio on fold geometry); light and shading take the audio; color follows only the slowest
   music. No overlays, no screen-space warps, no transients in phase arguments, no clipping or
   washout. Prefer removing or fixing over adding.
6. **Apply with the atomic edit macro** (below). Never edit and swap as separate steps.
7. **Check the result.** Run the browser-side wait with `[20]`, then take an `-after` shot and
   Read it. **Revert in the same beat** if `clip` rose above 0, `flicker` crossed 0.7 when it
   was below before, or the shot looks worse: undo your Edit, give the restored line a new
   marker comment, and run the macro with that marker. Hue alone changing between shots is
   normal drift, not a regression.
8. **Journal** notable moments, user flags and removals in `journals/<name>-cool-moments.md`
   (delegate long entries to a fork).
9. **One-line summary:** `**Beat <n>: <what changed / why holding>.**` No images in chat.
10. **Chain or idle:**

| Situation | Do |
|---|---|
| Edit in flight, verifying | Stay in the turn: browser-side wait 15 to 30 s, re-meter, next beat |
| Gate under 0.9 | Stay in the turn: wait ~20 s, re-check |
| User actively giving feedback | Stay in the turn, chain beats |
| Healthy 3+ beats and user quiet | End the turn: `ScheduleWakeup(240 to 420 s)` |
| Short pause wanted | End the turn: `ScheduleWakeup(60 s)` (the minimum) |

Browser-side wait (returns the meter for the window it waited through):

```bash
node scripts/vj/show.js eval 'async (secs) => { await new Promise(r => setTimeout(r, secs * 1000)); return { s: window.__vjMeter.summary(secs), r: window.__vjMeter.residR(secs) } }' '[20]'
```

Pass the original `/vibej-linux ...` text as the ScheduleWakeup `prompt`, so a wakeup after
context compaction re-enters this skill.

### Atomic edit macro

Edit the scratch `.frag` with Read + Edit, and put a unique comment on the changed line as the
marker. Wait for the Edit to succeed, then, in one call:

```bash
node scripts/vj/show.js eval 'async (shaderPath, marker) => {
  const src = await fetch("/shaders/" + shaderPath + ".frag?t=" + Date.now()).then(r => r.text())
  if (!src.includes(marker)) return { ok: false, stage: "disk", info: "edit not on disk" }
  const v = window.__vjValidate(src)
  if (!v.ok) return { ok: false, stage: "compile", info: v.info }
  if (!window.cranes.shader.includes(marker)) window.cranes.shader = src
  return { ok: true, live: window.cranes.shader.includes(marker) }
}' '["<shaderPath>", "<marker>"]'
```

- `live: true` is required before the beat continues.
- `stage: "disk"`: the dev server is serving a different checkout than the one you edited.
  Stop and tell the user.
- `stage: "compile"`: undo your Edit (the scratch copy is untracked, so not `git checkout`)
  and count a failure. Three failures in a row:
  stop the loop and tell the user.

## Linux pitfalls

- **Chrome binary.** `show.js` takes the first of `google-chrome-stable`, `google-chrome`,
  `chromium`, `chromium-browser` on `PATH`. Set `SHOW_CHROME=/path/to/chrome` for anything
  else. Flatpak and Snap browsers are sandboxed away from the debugging port; use a native
  package.
- **The show Chrome is its own browser** (profile `~/.config/paper-cranes-show`, CDP port 9333).
  Links clicked elsewhere open in the user's normal browser, not on the wall.
- **Display placement.** `launch` moves the window in Chrome's own screen coordinates, matched
  to `xrandr` by left-to-right order. Confirm with
  `node scripts/vj/show.js eval '() => [screenX, screenY, innerWidth, innerHeight]'`. A tiling
  window manager may ignore the move: float the window or move it by hand.
- **Keep-awake** uses `systemd-inhibit` (logind) while the show Chrome lives, plus the page's own
  screen wake lock. Without logind, turn the screensaver off by hand.
- **Slow compiles.** If a macro or hot-swap call takes more than ~2 s, the page's main thread is
  blocked compiling. Tell the user before swapping anything else in.
- **`show.js` refuses to act** if the show browser has anything but exactly one page. Run
  `show.js stop` and relaunch.
- **Editing files the page imports** (`src/**`, `scripts/vj/*.js`) triggers a reload, which
  resets audio history. Do that between sets.
- **A `<task-notification>` is not the user.** It never authorizes a bigger move than the
  evidence supports.

## Recovery after a crash or compaction

Read `.claude/vj-state.json` and the journal. Check `node scripts/vj/show.js status`; relaunch
with the snapshot's `showUrl` only if it is down. Check which of your markers are actually in
`window.cranes.shader` before the next move. Discard the first meter window.
