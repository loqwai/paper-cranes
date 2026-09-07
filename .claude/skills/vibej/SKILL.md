---
name: vibej
description: "VJ a shader live at a party — auto-mutates the shader every minute to match the track. Reads audio features + Spotify track name from the jam page, edits the .frag via /__save-shader (HMR hot-swaps). Invoked as `/vibej` or its alias `/vj`. Usage: `/vibej [N-iterations] [shader-path-or-name]` (default 180, most-recent .frag). `/vibej stop` ends early. `/vibej tick` runs one iteration (what the cron fires)."
allowed-tools: Bash Read Write Edit Grep Glob CronCreate CronList CronDelete mcp__chrome-devtools__list_pages mcp__chrome-devtools__new_page mcp__chrome-devtools__select_page mcp__chrome-devtools__navigate_page mcp__chrome-devtools__evaluate_script mcp__chrome-devtools__take_screenshot mcp__chrome-devtools__wait_for mcp__chrome-devtools__list_console_messages mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__tabs_create_mcp mcp__claude-in-chrome__navigate mcp__claude-in-chrome__javascript_tool mcp__claude-in-chrome__computer
---

# vibej — Live Auto-VJ Loop for the Jam Page

Run Claude as the VJ: every minute, read the current audio features + track name, make ONE meaningful edit to the shader, move on. Non-destructive by default (edits `.frag` via `/__save-shader`, HMR hot-swaps).

> **Aliases:** `/vibej` is the canonical name; `/vj` is the legacy alias and behaves identically. Examples below use `/vibej` — substitute `/vj` freely. The state file is still `.claude/vj-state.json` for backward compatibility with in-progress sessions.

## Philosophy

- **LOOK before you touch, LOOK after you touch.** A screenshot is the only ground truth. Audio
  features and a green compile tell you nothing about whether the frame is a wall of clipped pink,
  a mushy blob, or shivering. (2026-08-18: 26 ticks tuned blind on an unreadable frame.)
- **Diagnose before you add.** When the user says "still subtle / not interesting / shivery /
  washed out", the first move is a screenshot + root cause, then a *fix* — usually a subtraction
  or a tonemap — not a new motif. Adding on top of a broken frame is how three effects got vetoed
  in a row.
- **Match the music, structurally.** Colour follows SLOW music (key, section, set); geometry and
  lighting follow FAST music (kicks, hits). Mixing them reads as flashing.
- **One focused move per tick**, and it must be *visible on the projector* from across the room.
- **Respect the user's hands.** Don't smash their knobs, don't rewrite their code wholesale, and
  know which uniforms their controller is currently PINNING (see TAKE OVER below).
- **Fail loud, not silent**: GL-compile before every save; if it breaks, fix or revert.

## Pre-show checklist (do ALL of this before tick 1 — it is the show)

1. **Read the shader's journal(s)** and the last HANDOFF. Todo + History-of-changes = your rules.
2. **Screenshot the display as it stands and judge it** (dark floor? focal point? clipping? noise?).
   If it does not read, the first ticks are legibility (tonemap / floor / level window / vignette).
3. **Audio verified**: raw `energy` > gate (0.065 for wavelet-ease), `quietGate` computed not pinned.
4. **Know the controller state**: `Object.keys(window.cranes.messageParams)` — every key there is
   PINNED by the phone. If the shader's music drivers are in that list, they are dead. Fix in the
   shader (mix each pinned spring 50/50 with an un-owned neighbour) or ask the user to release.
5. **Cursor hidden via CSS** on the display page (Cursor hygiene). Verify with a screenshot.
6. **Target is a SCRATCH COPY**, never committed art. `/vibej` rewrites the file every minute.
7. **State the room/relay/URL** the display is on so the user can control it. Ask which room.

## Context

Arguments:
!`echo "$ARGUMENTS"`

Dev server port (from `scripts/dev-port` — branch-derived, `PORT` env overrides):
!`./scripts/dev-port`

Dev server status:
!`PORT=$(./scripts/dev-port); curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null || echo "not running"`

Existing state file (if a run is in progress):
!`cat .claude/vj-state.json 2>/dev/null || echo "(none)"`

## Arguments

The skill parses `$ARGUMENTS` by looking for these tokens in any order:

- **No args** → 180 iterations (3 hours), 1 per minute, shader = most recently modified `.frag`
- **Integer N** → N iterations instead of 180
- **`stop`** → read `.claude/vj-state.json`, `CronDelete` the stored job ID, remove the state file
- **`tick`** → single iteration (what the cron fires)
- **A shader path** → use this shader for the run. Accepted forms:
  - `shaders/redaphid/wip/the-coat-fur-coat/the-coat-6.frag` (full path from repo root)
  - `redaphid/wip/the-coat-fur-coat/the-coat-6.frag` (relative to `shaders/`)
  - `redaphid/wip/the-coat-fur-coat/the-coat-6` (no extension, same format `/__save-shader` accepts)
  - Absolute path anywhere under the repo
  - A bare shader name if unique: `/vibej the-coat-6` resolves by find-matching under `shaders/`
  - A URL containing `?shader=...`: extract the param
  Normalize to the no-extension form before saving to `vj-state.json` as `shaderPath`.

Examples:
- `/vibej` — 180 iters on the most-recent .frag
- `/vibej 30` — 30 iters
- `/vibej redaphid/wip/the-coat-fur-coat/the-coat-6` — 180 iters on this shader
- `/vibej 60 the-coat-6` — 60 iters, resolving `the-coat-6` by name
- `/vibej stop` — end the run
- `/vibej tick` — what cron fires; reads state, runs one iteration
- `/vj …` — legacy alias, all forms above work identically

If a shader arg is passed mid-run (skill re-invoked while state exists), treat it as a shader-swap: update `shaderPath` in state, `select_page` the jam page, and `navigate_page` to the new shader URL (`type: "url"`, full jam URL with new shader path). For lossless hot-swaps without reloading, use `evaluate_script` to set `window.cranes.shader = <code>` plus `history.replaceState`.

## Setup (once, at start)

### 1. Read the port

```fish
set PORT (./scripts/dev-port)
```

### 2. Ensure dev server is running

If `localhost:$PORT` isn't responding:
```fish
npm run dev &
```
Poll with curl (max 10 seconds).

### 3. Ensure jam page + Spotify tabs exist

- Call `list_pages` to enumerate open pages.
- **Jam page** — match by URL substring `jam.html?shader=`. If none exists, `new_page` with `http://localhost:$PORT/jam.html?shader=<path>&controller=<name>`.
  - Default shader: most recently modified `.frag` in the worktree, else `redaphid/wip/the-coat-fur-coat/the-coat-3`
  - Default controller: match shader name (e.g. `the-coat-3` → `the-coat`) if a matching `controllers/*.js` exists
- **Spotify page** — match by URL substring `open.spotify.com`. If none, `new_page` with `https://open.spotify.com`.

Record the **jam pageId** and **spotify pageId** — you'll `select_page` to switch between them each iteration.

> chrome-devtools is **page-stateful**: every `evaluate_script` / `take_screenshot` / `navigate_page` runs against the currently selected page. Always `select_page` before doing per-page work, even if you think the right one is already active.

### 4. Schedule the minute cron

```
CronCreate({
  cron: "* * * * *",
  prompt: "/vibej tick",
  recurring: true
})
```

Record the returned **job ID**.

### 5. Persist state to `.claude/vj-state.json`

```json
{
  "jobId": "<from CronCreate>",
  "iteration": 0,
  "target": 180,
  "shaderPath": "redaphid/wip/the-coat-fur-coat/the-coat-3",
  "jamPageId": 0,
  "spotifyPageId": 1,
  "port": 4788,
  "startedAt": "<ISO timestamp>"
}
```

> Field names are `jamPageId` / `spotifyPageId` (not `jamTabId` / `spotifyTabId`) since chrome-devtools uses `pageId`. Existing in-progress state files from the claude-in-chrome era using the old field names should be migrated on first read — if you see `jamTabId`, treat it as stale and re-discover via `list_pages` (pageIds are not stable across browser restarts anyway).

### 6. Run iteration 1 immediately (don't wait for first cron fire)

Then each subsequent minute the cron re-enters the skill with `/vibej tick`.

## Per iteration (`/vibej tick`)

### A. Load state

Read `.claude/vj-state.json`. If missing, print "no VJ run in progress" and exit.

If `iteration >= target`, call `CronDelete(jobId)`, delete the state file, print "VJ run complete", exit.

### B0. LOOK at the output (mandatory — every tick, before deciding)

Take a screenshot of the display/jam tab **before** picking a move, and **judge it visually**:
is anything clipped to white/pink, is there any dark left, is there a focal point, is the
structure legible or noise, is anything shivering / flashing? Features lie by omission — the
first 26 ticks of the 2026-08-18 show were tuned against a frame that was a wall of clipped
pink, and nobody could tell from `flattenFeatures()`. If the picture is unreadable, the tick's
move is a legibility fix (tonemap / floor / level window / vignette), not a new effect.

**Immediately re-park the cursor bottom-right after the screenshot** (see Cursor hygiene).

### B. Read state from browser

`select_page` → jam pageId, then `evaluate_script`:

```javascript
() => {
  const f = window.cranes.flattenFeatures();
  return {
    bass: f.bassNormalized?.toFixed(2), bassZ: f.bassZScore?.toFixed(2),
    treb: f.trebleNormalized?.toFixed(2), trebZ: f.trebleZScore?.toFixed(2),
    mids: f.midsNormalized?.toFixed(2),
    energy: f.energyNormalized?.toFixed(2), energyZ: f.energyZScore?.toFixed(2),
    flux: f.spectralFluxZScore?.toFixed(2),
    entropy: f.spectralEntropyNormalized?.toFixed(2),
    centroid: f.spectralCentroidNormalized?.toFixed(2),
    pitch: f.pitchClassNormalized?.toFixed(2),
    beat: f.beat,
  };
}
```

`select_page` → spotify pageId, then `evaluate_script`:

```javascript
() => document.querySelector('[data-testid="now-playing-widget"]')?.textContent?.trim().slice(0, 100) ?? null
```

> Differences vs the old `javascript_tool`:
> - `evaluate_script` takes a **function declaration string** (`() => {...}`), not a raw expression.
> - You must explicitly `return` a value (no implicit last-expression return).
> - The return value must be **JSON-serializable** — return plain objects/arrays/primitives, not Promises (use `async () => {...}` if you need to `await`).

### C. Pick ONE move

**If the user said anything since last tick, triage it FIRST (this outranks everything below):**

| They said | It means | Do |
|---|---|---|
| "too subtle / not interesting" | the frame has no contrast or the drivers are pinned/dead | screenshot; fix legibility or dead drivers; THEN one big structural motif |
| "shivery / jittery" | a per-frame raw value (z-score, unsmoothed feature) is on geometry/scale/position | find and REMOVE it — dead-zone or smoothed spring only; never global scale/translate from a transient |
| "flashing colours" | a fast signal is on hue/lightness | move it off colour; hue drivers must be springs/phases/sections only |
| "washed out / too bright" | tonemap: no dark floor, gain > 1, additive stacks | cap L (~0.7–0.8), soft shoulder `x/(1+kx)`, gamma > 1, dark bg, lower additive gains |
| "get rid of X" | do it THIS tick, log under History of changes, never re-add |
| "I need X" repeated twice | your first attempt was invisible — make it 3–5× stronger, then screenshot to prove it |

Then let the features + track name guide it. Some reliable archetypes:

| Signal | Move |
|---|---|
| Track-name theme (e.g. "Starlight", "Volcano", "Lights Out") | Palette/motif shift toward the theme |
| High bass + low centroid | Heart pulse, kick flash, ember floor pulse, subwoofer rings |
| High treble + high centroid | Scan line, chromatic aberration, electric hiss, twinkle-speed boost |
| High entropy + roughness | Crystalline shards, RGB split, glitch |
| Beat=true, flux spike | Beat ring, rim zap, snap |
| Low energy / calm | Breathing hue cycle, mist, subtle glow |
| Drop / energyZ rising | Ghost echo coat, bass bloom, zoom punch |

**Avoid stacking more than ~6 simultaneous overlay effects** — the composition blows out. If adding something heavy, reduce or remove something else.

**Hard guardrails (each cost a live veto on 2026-08-18):**
- No screen-space overlays that read as objects: orbs, discs, circles, dot grids, white glints.
- No screen-space uv warps/displacements/ripples on a structure-first shader — permute the
  fractal itself instead (fold ratio, fold angles, level windows, cell shapes, mirror parity).
- Never scale or translate the whole frame per-frame from a transient (kick zoom = shiver).
- Never put a raw z-score or unsmoothed feature on geometry. Transients may touch shading/twist
  only, through a dead-zone (`smoothstep(0.25, 0.9, …)`), preferably from onset detectors
  (`wavelet_bassHit`, `wavelet_punch`).
- Audio in AMPLITUDE/GATE, never inside a `sin()` phase argument (strobe). Rate changes go
  through monotonic phase accumulators (controller `flowPhase/morphPhase`), not `iTime*rate`.
- Palette never reaches white; hue drift slow (≤ ~0.03/min visible); one hue-tilt term max per
  fast feature.
- A "time component" the user asks for must be perceptible within ~10 s of watching (~2-min
  cycles + a continuous slow rotation), not 5–10-min cycles.
- Prefer subtract/fix over add when the frame is not yet legible.

### C.1 Move style: dramatic vs. subtle

`vj-state.json` holds a `moveStyle` field — `"subtle"` (default: parameter nudges, coefficient tweaks) or `"dramatic"` (new visual motifs per tick: black-hole silhouette, lightning strikes, aurora, tearfall, rotor gear, crystalline facets, time-echo, water pool). Dramatic mode adds a whole feature each tick instead of adjusting one. Switch modes when user says "more variation" or "less busy". Save the choice.

### C.2 Auto-wire knobs the user is twisting

`vj-state.json` holds `knobSnapshot` (previous values) and `unwiredKnobs` (knob indices with no shader reference). Each tick, diff current knob values vs snapshot. If an **unwired** knob moved by >0.02, wire it to something interesting (fog density, palette tint, an existing-effect intensity knob). Update `knobSnapshot` every tick, and remove the knob from `unwiredKnobs` once mapped.

To find which knobs are already in the shader, grep the `.frag` for `knob_N`. Exclude comment-only references.

### D. Apply the edit via the jam tab

**Validate BEFORE saving** — never write a broken shader to disk. The static linter doesn't catch forward-reference or type errors; only the real GLSL compiler does. Use `window.__vjValidate` installed on the jam tab.

**One-time install per jam-page reload** (`select_page` jam, then `evaluate_script`):
```javascript
async () => {
  if (typeof window.__vjValidate === 'function') return 'already installed';
  const mod = await import('/src/shader-transformers/shader-wrapper.js');
  const wrap = mod.shaderWrapper;
  const canvas = document.createElement('canvas');
  canvas.width = 4; canvas.height = 4;
  const gl = canvas.getContext('webgl2');
  window.__vjValidate = (src) => {
    const wrapped = wrap(src);
    const sh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(sh, wrapped);
    gl.compileShader(sh);
    const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
    const info = ok ? null : gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    return { ok, info };
  };
  return 'installed';
}
```

Then each tick (also `evaluate_script` on the jam page). Note: instead of inlining the edited source into a long string-replacement chain in JS, prepare the edited shader text in Claude's context first via `Read` + `Edit`, then pass the final source as an argument:

```javascript
// function:
async (shaderPath, editedSrc) => {
  const v = window.__vjValidate(editedSrc);
  if (!v.ok) return { ok: false, reason: 'COMPILE FAIL', info: v.info };
  const res = await fetch('/__save-shader', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shader: shaderPath, code: editedSrc }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}
// args: ["redaphid/wip/the-coat-fur-coat/the-coat-3", "<full edited shader source>"]
```

The `evaluate_script` `args` array passes through to the function — use it for any input that would otherwise have to be string-escaped into the function body. The function still needs to be JSON-serializable in its return (no Promises directly, but `async` is fine because the result is awaited before serialization).

Note: the `/__save-shader` `shader` field takes the path WITHOUT `.frag`.

**Confirm it went live.** After saving, check `window.cranes.shader.includes('<marker from your
edit>')`. HMR hot-swap occasionally does not land; if false after ~1.5 s, force it:
`window.cranes.shader = <validated src>`. Editing the file on disk directly (python/sed) is fine
on the dev server — the editor-sync plugin hot-swaps it — but ALWAYS GL-validate the result via
`__vjValidate(fetch('/shaders/<path>.frag').text())` in the same tick, and re-check `typeof
window.__vjValidate` first: the page reloads whenever the phone loads a shader.

**TAKE OVER (vjpad LIVE bank)** pins `waveletBassSpring / Band2 / Band5 / energySpring /
melodyFlow / spectralCrestSmooth / quietGate` as constants. Any effect driven only by those is
deaf. Safe (never pinned) drivers: `waveletBand1/3/4Spring`, `waveletCentroidSpring`,
`spectralRoughnessSmooth`, `spectralEntropySmooth`, `wubDepth`, `bassNoteFlow`,
`sectionMode/Mix`, `evoPhase`, `flowPhase/morphPhase`, `wavelet_punch/bassHit`. Rule: every music
driver = 0.5·fader-able spring + 0.5·un-owned neighbour spring.

### D2. LOOK again (mandatory after any compositional edit)

If the edit changed palette, tonemap, background, vignette, level window, or added/removed a
motif, take a second screenshot after the hot-swap lands and confirm it did what you meant.
Compare against the B0 shot. If it made things worse, revert or retune in the same tick.
Re-park the cursor afterwards.

### E. Post-save sanity check (optional)

```fish
node scripts/validate-shader.js <shader-path>.frag 2>&1 | grep -E "^ERROR" | head -5
```

The static linter is a secondary check — pre-save GL compile (step D) is the primary gate.

If a broken edit somehow slipped through (e.g. validator install failed silently), revert with `git checkout -- <file>`, bump `failCount` in state. After 3 consecutive failures, stop the cron and tell the user.

### F. Increment + persist

Bump `iteration` in `.claude/vj-state.json`.

### G. One-line summary to the user

`**Iteration N/total** — <track> — <what changed>.`

Keep it tight. Do not attach the screenshots to the summary — the user is watching the shader live; the screenshots are for YOUR judgement (B0/D2), not for the message.

### H. Read + update the per-shader journal (every session, every cool moment, every user flag)

The **per-shader journal** is the session-memory of the VJ run. It lives at:

```
journals/<shader-filename-without-dir-or-ext>-cool-moments.md
```

e.g. `shaders/redaphid/wip/the-coat-fur-coat/the-coat-8.frag` → `journals/the-coat-8-cool-moments.md`.

**Two purposes:**
1. **Resume the VJ session** later — a new `/vibej` run should pick up with full awareness of what's already been explored with this shader: which audio-features-to-visual mappings worked, which the user flagged for removal/fix, which track types were in rotation.
2. **Refine this shader** — between sessions we can return with a "todo" list: issues to fix, tweaks to try, effects that were close-but-off.

**When to read:**
- **At `/vibej` setup** (step 3/4/5 in the session start) — if `journals/<shader-name>-cool-moments.md` exists, read it first. Its contents should shape the session: don't re-introduce effects the user already rejected, prioritize the Todo section's unfixed items when planning early ticks.
- **Before each tick that proposes a dramatic move** — so we don't re-add a motif that was already vetoed.

**When to write:**
- **Cool moment** — visual + audio combo landed well. Add a dated entry under `## Cool moments`.
- **User flag** — user called something out (remove, fix, nudge). Add an entry under `## Todo` with enough context to act on it later.
- **Removal / major change** — record what was pulled and why under `## History of changes` so future-you knows not to re-add it.
- **Fork** — note the fork under `## Forks` on both the source and the destination journal.

**Journal structure** (create sections on first write, append after that):

```markdown
# <shader-name> — Session Journal

## Status
One-line current state. Updated each tick or as often as meaningful.
e.g. "Iter 47 on /vibej run. User approves everything except mercury-flow diamonds."

## Cool moments
Entries for (audio-fingerprint → visual-response) wins. Each entry:
- **Audio fingerprint** — precise ranges, not vague. e.g. `bass 0.65-0.75 + centroid < 0.15 + entropy < 0.1`.
- **What worked** — which blocks fired, how their gates overlapped.
- **What was missed** — signal that should have provoked a response but didn't.
- **Design hypothesis** — one line for the next shader.

## Todo
Unresolved user requests. Ordered by how much they matter.
- `[ ] fix mercury-flow diamond lattice (user: "flannel-like, moves quickly, artifacting")`
- `[ ] warm breath intensity feels low at mids > 0.7 — try 0.45 → 0.7 scale`
Tick off with `[x]` when fixed, don't remove — history is useful.

## History of changes
Brief bullets of removals + reasons. Don't re-add these.
- "Removed CONFETTI (iter 45 after fork to -8) — user request."
- "Removed RGB-SPLIT (iter pre-fork -5) — user: 'rgb checkerboard on coat'."

## Forks
- `the-coat-8 ← the-coat-7` (iter 45): confetti removed.

## Design hypotheses for v(next)
Accumulated one-liners from cool moments. Read this when designing the next shader.
- "Dedicated mid-dominant warmth effect for mids > 0.7 AND centroid < 0.3 AND entropy < 0.2."
- "Effects should declare their feature-space region so alignments are deliberate, not emergent."
```

Skip the journal only on totally ordinary parameter nudges with nothing learned. Otherwise write.

## Cursor hygiene (LIVE-SHOW RULE)

**Best method (2026-08-18): hide it with CSS on the display page** — a corner-parked hover still
shows a pointer on the projector. Run this on the display/jam tab (and again after every reload,
since it does not survive navigation):
```javascript
document.documentElement.style.cursor = 'none'; document.body.style.cursor = 'none';
let st = document.getElementById('__vj-nocursor'); if (!st) { st = document.createElement('style'); st.id='__vj-nocursor'; st.textContent = '*{cursor:none !important}'; document.head.appendChild(st); }
```
Then ALSO park with hover (below) — belt and braces.


**At the start of every tick, and after every screenshot/hover, park the cursor at the extreme bottom-right corner** (`hover` to coords near `(viewportWidth-1, viewportHeight-1)` — e.g. `(1517, 809)` on a 1518×810 viewport). The user is projecting the jam page; a visible mouse pointer on the projected output is distracting. The user has asked for this multiple times — bake it into the loop.

Notes:
- `mcp__claude-in-chrome__computer` action: `hover` to the bottom-right corner is the right call. It clamps to viewport (it's a synthetic DOM hover, not a real OS-level mouse move), but corner-clamped is acceptable — the cursor sits in the corner instead of over content.
- If you need the cursor literally off-screen, only the user's physical mouse can do that. State this explicitly when relevant.
- Apply this rule for ALL jam-projecting sessions, not just /vibej. Park the cursor before any screenshot you take during the show.

## Stop conditions

- `iteration >= target` → `CronDelete(jobId)`, delete state file
- User invokes `/vibej stop` → same
- 3 consecutive validation failures → same, tell user
- MCP disconnects → skip the tick gracefully; cron will re-fire next minute

## Shader swap (optional, when requested)

If the user says "switch shaders":
1. Pick a different base shader from `shaders/<user>/` or `shaders/wip/`.
2. `select_page` jam → `navigate_page` with `type: "url"`, url=`http://localhost:$PORT/jam.html?shader=<new-path>&controller=<match>`.
3. Update `shaderPath` in `.claude/vj-state.json`.
4. Read the new shader's structure first (don't blind-edit), then continue iterations.
5. **Never point the loop at committed art** — copy to `shaders/<user>/wip/<name>-vj/1.frag`.
6. **Bring it up with a known preset AND screenshot it before the crowd sees three states.** A
   preset baked for one track can be a clipped white disc on another (plasma-event-horizon/4 on
   a quiet choral track, 2026-08-18). Load, look, fix the tonemap, THEN announce the switch.
7. Runtime knob tweaks (`window.cranes.manualFeatures.knob_N = …`) and the cursor CSS are lost on
   reload — re-apply them, or bake them into the URL.

## Common pitfalls (learned the hard way)

- **GLSL reserved words**: `active`, `sample`, `input`, `output`, `common`, `filter`, `using` — pick a different var name or the compile fails.
- **Feedback accumulation blowouts**: effects that add to `col` feed back each frame. If a frame looks white, clamp `bg` or reduce the feedback multiplier (e.g. `prev * 0.78` → `* 0.66`).
- **Strobe direction matters**: default BRIGHT with dark punches, not the other way around.
- **Bass pulse stacking**: ember floor × sunburst × bass bloom × kick pulse all firing on the same bass spike → saturation. Pick one primary bass visualizer per session.
- **Kaleidoscope tiling persists via feedback**: even after disabling kaleido, the backdrop keeps the tile pattern until feedback decays. Lower `prev *` for a few iterations to shake it off.
- **Port is branch-derived**: main = 6969, other branches hash to 1024–65534. Always use `./scripts/dev-port` — never hardcode 6969.
- **chrome-devtools is page-stateful**: every action runs on the currently selected page. Always `select_page` before `evaluate_script` / `take_screenshot` / `navigate_page` even if you think the right one is selected — a `select_page` is cheap and prevents reading audio features off the Spotify tab by accident.
- **`evaluate_script` returns must be JSON-serializable**: don't return DOM nodes, Promises (raw), Maps, or class instances. Return plain objects with primitive fields. For Promises, declare the function `async` so chrome-devtools awaits before serializing.
- **`fullscreen=true` in the display URL ejects the tab from the claude-in-chrome MCP tab group** — you lose the tab. Leave it out and let the user press F11.
- **claude-in-chrome variant**: tools are `tabs_context_mcp` / `navigate` / `javascript_tool` (REPL semantics, top-level `await` OK, last expression returned) / `computer` (screenshot, hover). Cron jobs, tab groups and `window.__vjValidate` all die with the session — on resume, re-create all three and keep the iteration count.
- **A corner-parked hover still shows a pointer.** Use the CSS `cursor:none` injection (Cursor hygiene) and re-apply after every reload.
- **The `/vibej tick` message is not the place for screenshots or long text.** One line. The user is watching the wall, not the terminal.
- **pageIds are not stable across browser restarts**. If the state file has a `jamPageId` that no longer resolves (or `list_pages` returns a different URL for that id), re-discover from `list_pages` rather than trusting the cached id.

## Example `/vibej tick` output

> **Iteration 52/180** — *Love Spell* — Prism rainbow rim on the coat (rim hue now angular around head + time). Pink shoulder / green chest / cyan hem.

## Post-mortem: 2026-08-18 live show (read this before the next one)

What went wrong, in order of damage:
1. **26 ticks without a screenshot.** The frame was a wall of clipped pink the whole time; every
   "reactivity" edit was invisible under it. Features and compile-OK said everything was fine.
2. **Feedback was answered with additions.** "Not interesting → add aurora", "shivery → dead-zone
   one term", "focus → add a sun orb". Three additions were vetoed live (bass ripple, sparkle
   grid, sun orb). Look → diagnose → subtract/fix would have solved each in one tick.
3. **TAKE OVER pinned the shader's music drivers for ~10 ticks** while the HANDOFF and my own
   iter-2 note both said it would. Check `messageParams` every tick.
4. **The shiver survived four partial fixes** because it was never observed — a whole-frame zoom
   flick on kicks. One careful pass (remove every per-frame transient from scale/position) fixes it.
5. **The shader switch was rushed**: a preset tuned for another track came up white, then
   over-dark, then mushy — three states in five minutes on the projector.
6. **Plumbing happened mid-show**: cursor visible ~20 ticks, room/relay change, fork — all of it
   belongs in the pre-show checklist.

