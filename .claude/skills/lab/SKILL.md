---
name: lab
description: "Silent shader lab — test ONE visual hypothesis on a shader with no audio, deterministic frames, and screenshot judgement, via Claude-in-Chrome. Built for FAN-OUT: many teammates each run /lab on their own hypothesis, in their own worktree, on their own port, and write verdicts to a shared ledger a coordinator can compare. Usage: `/lab \"<hypothesis>\" [shader-path]`, `/lab report`, `/lab stop`."
allowed-tools: Bash Read Write Edit Grep Glob ScheduleWakeup mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__tabs_create_mcp mcp__claude-in-chrome__tabs_close_mcp mcp__claude-in-chrome__navigate mcp__claude-in-chrome__javascript_tool mcp__claude-in-chrome__computer mcp__claude-in-chrome__read_page mcp__claude-in-chrome__read_console_messages
---

# /lab — the silent shader lab

`/vibej` is the *performance* loop: music playing, one shader, one operator, judgement paced by the
beat. **`/lab` is the opposite**: no audio, no clock, no crowd. One teammate, one hypothesis, frames
that are reproducible to the pixel, and a written verdict another agent can act on.

It exists so a **coordinator can fan out N teammates over N hypotheses at once** and get back N
comparable answers instead of N opinions.

## Context

Arguments:
!`echo "$ARGUMENTS"`

This worktree / branch:
!`git rev-parse --show-toplevel 2>/dev/null; git branch --show-current 2>/dev/null`

My port (see Isolation — you MUST set PORT yourself):
!`echo "PORT=${PORT:-unset}"`

Dev server on my port:
!`curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT:-6969}/" 2>/dev/null || echo "not running"`

Ledger so far:
!`tail -20 journals/lab/LEDGER.jsonl 2>/dev/null || echo "(none yet)"`

---

## 1. Isolation — read this before anything else

Everything below assumes **you are the only agent touching your page, your port, and your `.frag`.**
Four things must be true, and one of them is a live trap:

| Thing | Rule |
|---|---|
| **Worktree** | You work in your own git worktree, on your own branch. Never edit a file in another teammate's worktree. |
| **Port** | **You MUST export `PORT` explicitly.** |
| **Shader file** | You get your own `.frag`, named for your hypothesis. Never edit a shader another teammate is testing. |
| **Browser tab** | Your own tab. Re-discover ids with `tabs_context_mcp`; never reuse an id from another session. |

### ⚠ The port trap

`scripts/dev-port.js` is **not** branch-derived, whatever `/vibej2`'s docs say. It is:

```js
const DEFAULT_PORT = 6969
export const getPort = () => process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT
```

`vite.config.js` calls `getPort()` at config time. So **every teammate who does not set `PORT`
starts a server on 6969** — and the second one either fails to bind or, worse, you end up
screenshotting *someone else's shader* and confidently reporting a verdict about it. This is the
single most likely way a fan-out produces garbage.

**Start your server like this, every time:**

```bash
PORT=<your-port> npm run dev &
```

Coordinator assigns ports (e.g. 6970, 6971, 6972…). Put the port in your ledger entries. If your
first screenshot doesn't look like the shader you think you're testing, suspect the port first.

---

## 2. Determinism — the reason this is not just /vibej with the music off

The whole value of a silent lab is that **two screenshots differ only because your edit differed.**

```
http://localhost:<PORT>/?shader=<path>&noaudio=true&time=8.0&fullscreen=true
```

- **`noaudio=true`** — no mic, no permission prompt, every audio uniform sits at its default. No
  audio-driven variation between shots.
- **`time=<seconds>`** — holds `iTime` constant. Without this, animation alone changes the frame
  and you cannot tell your edit's effect from the clock's.
- **Fix the viewport too.** Same window size for every shot in a comparison, or the aspect
  correction changes the composition and the diff is meaningless.

**Shoot a small time ladder, not one frame.** A single held frame can flatter or libel an edit.
Three shots at `time=4`, `time=8`, `time=16` catch "looks great at t=8, degenerates by t=16".

Audio-reactive `#define`s read their defaults under `noaudio`, so a hypothesis about *reactivity*
cannot be tested here — that is `/vibej`'s job. `/lab` tests **form**: shape, composition,
legibility, palette, structure.

---

## 3. The loop

One hypothesis per `/lab` run. If you find a second one, write it in the ledger as `spawned` and let
the coordinator hand it to someone else — do not chase it yourself.

### 0. Frame the hypothesis
One falsifiable sentence, in the ledger, **before** you edit: *"Replacing `hexDist` with the `kiku`
SDF keeps the lattice legible at fold levels 4–9."* Not *"try the kiku bead."*

### 1. LOOK first
Screenshot the unmodified shader at your time ladder. **This is your baseline** — without it you
cannot claim your edit changed anything. Save to `journals/lab/shots/<slug>-base-t<N>.png`.

**Park the cursor in the same tool batch as every screenshot.** Move it to a dead corner *before*
capturing, and again immediately after. The Chrome extension's synthetic cursor is drawn in an
isolated world that page CSS cannot touch, and it lands in the middle of the frame — which ruins
exactly the before/after comparison this skill exists to produce. Prefer `javascript_tool` over
`computer` for anything that isn't literally pixels; a JS call never summons the overlay.

### 2. Validate, then edit
GL-compile before you write. A save that doesn't compile leaves the page black and wastes a cycle:

```javascript
async () => {
  const mod = await import('/src/shader-transformers/shader-wrapper.js');
  const gl = Object.assign(document.createElement('canvas'), {width:4,height:4}).getContext('webgl2');
  const sh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(sh, mod.shaderWrapper(SRC)); gl.compileShader(sh);
  const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
  return { ok, info: ok ? null : gl.getShaderInfoLog(sh) };
}
```

Then edit the `.frag` on disk (HMR hot-swaps it). **Change one thing.** A two-variable edit produces
a verdict nobody can reuse.

### 3. LOOK again
Same time ladder, same viewport, same everything. Save as `<slug>-<variant>-t<N>.png`.

### 4. Judge, side by side — never from memory
```bash
node scripts/compare-shots.mjs journals/lab/shots/<slug>-sheet.png \
  base=journals/lab/shots/<slug>-base-t8.png \
  variant=journals/lab/shots/<slug>-v1-t8.png
```
Headless Playwright, inlines the bytes as base64, and **fails loudly if a tile doesn't decode** —
so the sheet cannot silently show you empty boxes. Look at the sheet before you write a verdict.

### 5. Record the verdict
Append one line to `journals/lab/LEDGER.jsonl` (§4). **Do this even when the answer is no** — a
disproved hypothesis is the whole point of fanning out, and an unrecorded one gets re-tried by the
next teammate.

Then stop. One hypothesis, one verdict. Don't drift into a second experiment in the same run.

---

## 4. The ledger — how the coordinator reads N teammates at once

`journals/lab/LEDGER.jsonl`, append-only, one JSON object per line. **Append with `>>`, never
rewrite the file** — several teammates write to it concurrently and a read-modify-write will eat
someone's result.

```json
{"ts":"2026-09-03T21:40:00Z","agent":"teammate-3","branch":"lab/kiku-cell","port":6972,
 "shader":"shaders/redaphid/wip/lattice-bead/kiku-1","hypothesis":"kiku SDF as the cell keeps the lattice legible at levels 4-9",
 "verdict":"no","confidence":"high","evidence":"journals/lab/shots/kiku-cell-sheet.png",
 "why":"reads as mush past level 6 - 12 petals at that scale alias into a ring",
 "next":"try levels 4-6 only, hex on the fine levels","spawned":["3-fold tomoe may survive deeper"]}
```

- **`verdict`** — `yes` / `no` / `partial` / `inconclusive`. `inconclusive` is honest and useful;
  a fabricated `yes` poisons every downstream decision.
- **`confidence`** — `high` / `low`. Low is fine. Say which.
- **`evidence`** — path to the contact sheet. A verdict with no sheet is an opinion.
- **`why`** — the mechanism, not the feeling. *"12 petals alias into a ring at that scale"* is
  reusable; *"looks bad"* is not.
- **`spawned`** — hypotheses you noticed but did **not** test.

`/lab report` reads the ledger and prints a grouped summary (by verdict, then by shader) for the
coordinator. It makes no edits.

---

## 5. Rules carried over from the performance loop

These were paid for live and still bind, because a shader tuned silently will eventually be run
with music:

1. **Geometry only EVOLVES.** No sines and no audio on fold-geometry params, however smoothed —
   fold error compounds as `scale^i` and reads as "kaleidoscope sections breathing". Under
   `noaudio` you will **not see this failure**; the frame is static. So it is a *rule*, not
   something the screenshot can catch. Do not wire audio to geometry just because it looks fine
   held still.
2. **Light/shading may take all the audio; the global multiplier may not** — that is the strobe
   channel and it has been rejected every time.
3. **Colour follows the slowest music only.**
4. **A ratchet needs a counter-ratchet.** If your change adds structure or removes lit area, the
   brightness compensation belongs in the *same* edit.
5. **Diagnose before you add.** The fix for a bad frame is usually a subtraction.
6. **Never edit committed art.** Work on a scratch copy named for your hypothesis.

---

## 6. Arguments

- `/lab "<hypothesis>" [shader-path]` — run one experiment. Shader defaults to the most recently
  modified `.frag` in your worktree.
- `/lab report` — grouped ledger summary for the coordinator. Read-only.
- `/lab stop` — `ScheduleWakeup(stop: true)`, close your tab, leave the server running.

## 7. Setup checklist

1. `export PORT=<assigned>` — **not optional** (§1).
2. `PORT=$PORT npm run dev &`; wait for a 200 on `/`.
3. `tabs_context_mcp` → `tabs_create_mcp` your own tab. Record the id in-context, not on disk.
4. `mkdir -p journals/lab/shots`.
5. Baseline screenshots at the time ladder, cursor parked (§3.1).
6. Write the hypothesis line to the ledger with `"verdict":"running"`, then begin.
