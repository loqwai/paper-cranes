---
name: vibej-pw
description: "VJ a shader live at a party using the Playwright MCP browser — auto-mutates the shader every minute to match the track. Reads audio features + Spotify track name from the jam page, edits the .frag via /__save-shader (HMR hot-swaps). Playwright variant of /vibej (which uses chrome-devtools). Usage: `/vibej-pw [N-iterations] [shader-path-or-name]` (default 180, most-recent .frag). `/vibej-pw stop` ends early. `/vibej-pw tick` runs one iteration (what the cron fires)."
allowed-tools: Bash Read Write Edit Grep Glob CronCreate CronList CronDelete mcp__playwright__browser_tabs mcp__playwright__browser_navigate mcp__playwright__browser_evaluate mcp__playwright__browser_take_screenshot mcp__playwright__browser_wait_for mcp__playwright__browser_console_messages mcp__playwright__browser_snapshot mcp__playwright__browser_hover mcp__playwright__browser_close
---

# vibej-pw — Live Auto-VJ Loop for the Jam Page (Playwright MCP)

Run Claude as the VJ: every minute, read the current audio features + track name, make ONE meaningful edit to the shader, move on. Non-destructive by default (edits `.frag` via `/__save-shader`, HMR hot-swaps).

> **Which VJ skill do I want?**
> - `/vibej` (and `/vj`) — drives the user's **Chrome** via the `chrome-devtools` MCP. Page-stateful, `pageId`-addressed.
> - `/vibej-pw` (this one) and `/vibej2-pw` — drive a **Playwright-managed browser** via the `playwright` MCP. Tab-index-addressed, its own browser instance.
>
> Everything about the VJ *loop* is identical. Only the browser-driving primitives differ; this file spells those out in full so it stands alone.

## Philosophy

- **Match the music**: read audio state before each edit, let track name / pitch / energy guide the move.
- **One focused move per tick**: add/change a single feature (palette, effect, geometry tweak). Don't rewrite.
- **Respect the user**: the user might be twiddling knobs or watching the editor — don't smash their knobs, don't rewrite their code wholesale.
- **Fail loud, not silent**: validate each edit against the real GLSL compiler before saving; if it breaks, fix or revert.

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
  - A bare shader name if unique: `/vibej-pw the-coat-6` resolves by find-matching under `shaders/`
  - A URL containing `?shader=...`: extract the param
  Normalize to the no-extension form before saving to `vj-state.json` as `shaderPath`.

Examples:
- `/vibej-pw` — 180 iters on the most-recent .frag
- `/vibej-pw 30` — 30 iters
- `/vibej-pw redaphid/wip/the-coat-fur-coat/the-coat-6` — 180 iters on this shader
- `/vibej-pw 60 the-coat-6` — 60 iters, resolving `the-coat-6` by name
- `/vibej-pw stop` — end the run
- `/vibej-pw tick` — what cron fires; reads state, runs one iteration

If a shader arg is passed mid-run (skill re-invoked while state exists), treat it as a shader-swap: update `shaderPath` in state, select the jam tab, and `browser_navigate` to the new shader URL. For lossless hot-swaps without reloading, use `browser_evaluate` to set `window.cranes.shader = <code>` plus `history.replaceState`.

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

- Call `browser_tabs` with `action: "list"` to enumerate open tabs. The result lists tabs **by index**, with URL and title.
- **Jam page** — match by URL substring `jam.html?shader=`. If none exists, `browser_tabs` with `action: "new"` and `url: "http://localhost:$PORT/jam.html?shader=<path>&controller=<name>"`.
  - Default shader: most recently modified `.frag` in the worktree, else `redaphid/wip/the-coat-fur-coat/the-coat-3`
  - Default controller: match shader name (e.g. `the-coat-3` → `the-coat`) if a matching `controllers/*.js` exists
- **Spotify page** — match by URL substring `open.spotify.com`. If none, `browser_tabs` with `action: "new"`, `url: "https://open.spotify.com"`.

Record the **jam tab index** and **spotify tab index** — you'll `browser_tabs action:"select"` to switch between them each iteration.

> Playwright MCP is **tab-stateful**: `browser_evaluate`, `browser_take_screenshot`, `browser_navigate`, `browser_snapshot` all run against the **currently selected tab**. Always `browser_tabs action:"select"` before doing per-tab work, even if you think the right one is already active.

> **Tab indices shift.** Unlike chrome-devtools `pageId`s, Playwright tab indices are positional — closing or opening a tab renumbers everything after it. Re-run `browser_tabs action:"list"` and re-match by URL substring whenever a tick's read looks wrong (e.g. `window.cranes` is undefined, meaning you're on Spotify).

### 4. Schedule the minute cron

```
CronCreate({
  cron: "* * * * *",
  prompt: "/vibej-pw tick",
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
  "browser": "playwright",
  "jamTabIndex": 0,
  "spotifyTabIndex": 1,
  "jamUrl": "http://localhost:4788/jam.html?shader=...",
  "port": 4788,
  "startedAt": "<ISO timestamp>"
}
```

> Field names are `jamTabIndex` / `spotifyTabIndex`, and `browser: "playwright"` marks which MCP owns the run. Also store `jamUrl` — since indices are positional and unstable, the URL is what you re-match on. If a state file has `jamPageId` / `jamTabId` instead, it belongs to a `/vibej` or claude-in-chrome run; don't adopt its ids — re-discover with `browser_tabs action:"list"` and rewrite the state in the shape above.

### 6. Run iteration 1 immediately (don't wait for first cron fire)

Then each subsequent minute the cron re-enters the skill with `/vibej-pw tick`.

## Per iteration (`/vibej-pw tick`)

### A. Load state

Read `.claude/vj-state.json`. If missing, print "no VJ run in progress" and exit.

If `iteration >= target`, call `CronDelete(jobId)`, delete the state file, print "VJ run complete", exit.

### B. Read state from browser

`browser_tabs action:"select" index:<jamTabIndex>`, then `browser_evaluate`:

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

`browser_tabs action:"select" index:<spotifyTabIndex>`, then `browser_evaluate`:

```javascript
() => document.querySelector('[data-testid="now-playing-widget"]')?.textContent?.trim().slice(0, 100) ?? null
```

> `browser_evaluate` semantics:
> - The `function` parameter is a **function declaration string** (`() => {...}`), same as chrome-devtools' `evaluate_script`.
> - You must explicitly `return` a value.
> - The return value must be **JSON-serializable** — plain objects/arrays/primitives. `async () => {...}` is fine; the result is awaited before serialization.
> - **There is no `args` array.** chrome-devtools lets you pass arguments alongside the function; Playwright's `browser_evaluate` does not. Anything the function needs must be embedded in the function source itself (see step D for how to do that safely with large shader text).
> - Optionally, `target` + `element` scope the call to one element, giving `(element) => {...}`. The VJ loop never needs this — always call it page-scoped.

### C. Pick ONE move

Let the features + track name guide it. Some reliable archetypes:

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

### C.1 Move style: dramatic vs. subtle

`vj-state.json` holds a `moveStyle` field — `"subtle"` (default: parameter nudges, coefficient tweaks) or `"dramatic"` (new visual motifs per tick: black-hole silhouette, lightning strikes, aurora, tearfall, rotor gear, crystalline facets, time-echo, water pool). Dramatic mode adds a whole feature each tick instead of adjusting one. Switch modes when user says "more variation" or "less busy". Save the choice.

### C.2 Auto-wire knobs the user is twisting

`vj-state.json` holds `knobSnapshot` (previous values) and `unwiredKnobs` (knob indices with no shader reference). Each tick, diff current knob values vs snapshot. If an **unwired** knob moved by >0.02, wire it to something interesting (fog density, palette tint, an existing-effect intensity knob). Update `knobSnapshot` every tick, and remove the knob from `unwiredKnobs` once mapped.

To find which knobs are already in the shader, grep the `.frag` for `knob_N`. Exclude comment-only references.

### D. Apply the edit via the jam tab

**Validate BEFORE saving** — never write a broken shader to disk. The static linter doesn't catch forward-reference or type errors; only the real GLSL compiler does. Use `window.__vjValidate` installed on the jam tab.

**One-time install per jam-page reload** (`browser_tabs action:"select"` jam, then `browser_evaluate`):
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

**Then, each tick — the shader-source handoff.** This is the one place Playwright is meaningfully more awkward than chrome-devtools, because `browser_evaluate` has **no `args` array**. Do NOT try to inline the whole edited shader as a JS string literal in the function body — GLSL is full of backslashes, backticks, `${`, and newlines, and one bad escape silently corrupts the shader you're about to save.

**Use a file handoff instead.** Prepare the edited shader in Claude's context with `Read` + `Edit`, write it to a scratch path the dev server can serve, then have the page `fetch` it:

1. Write the edited source to `.claude/vj-pending.frag` (Write tool — no escaping involved).
2. `browser_evaluate` on the jam tab:

```javascript
async () => {
  const src = await (await fetch('/.claude/vj-pending.frag?t=' + Date.now())).text();
  const v = window.__vjValidate(src);
  if (!v.ok) return { ok: false, reason: 'COMPILE FAIL', info: v.info };
  const res = await fetch('/__save-shader', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shader: 'redaphid/wip/the-coat-fur-coat/the-coat-3', code: src }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}
```

The shader path is a short, escape-free string, so embedding *it* in the function body is fine — substitute the real `shaderPath` from state each tick. The cache-busting `?t=` matters: without it the page may serve a stale copy of the pending file.

`/.claude/vj-pending.frag` is served by the dev server (verified 200 on the default Vite config — there is no `server.fs.deny` override in `vite.config.js`), and the path is gitignored. If a future config change breaks that, fall back to any served directory — `shaders/.vj-pending.frag` also returns 200 — and adjust both the fetch URL and `.gitignore`.

Note: the `/__save-shader` `shader` field takes the path WITHOUT `.frag`.

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

Keep it tight. No screenshot — the user is watching the shader live.

### H. Read + update the per-shader journal (every session, every cool moment, every user flag)

The **per-shader journal** is the session-memory of the VJ run. It lives at:

```
journals/<shader-filename-without-dir-or-ext>-cool-moments.md
```

e.g. `shaders/redaphid/wip/the-coat-fur-coat/the-coat-8.frag` → `journals/the-coat-8-cool-moments.md`.

**Two purposes:**
1. **Resume the VJ session** later — a new run should pick up with full awareness of what's already been explored with this shader: which audio-features-to-visual mappings worked, which the user flagged for removal/fix, which track types were in rotation.
2. **Refine this shader** — between sessions we can return with a "todo" list: issues to fix, tweaks to try, effects that were close-but-off.

Journals are **shared across all VJ skill variants** — `/vibej`, `/vibej2`, `/vibej-pw`, `/vibej2-pw` all read and write the same per-shader file. Note which browser MCP a session used in the `## Status` line, but never fork the journal on that basis.

**When to read:**
- **At setup** (steps 3/4/5) — if `journals/<shader-name>-cool-moments.md` exists, read it first. Its contents should shape the session: don't re-introduce effects the user already rejected, prioritize the Todo section's unfixed items when planning early ticks.
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
e.g. "Iter 47 on /vibej-pw run (Playwright). User approves everything except mercury-flow diamonds."

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

The user is projecting the jam page; a visible mouse pointer on the projected output is distracting. The user has asked for this repeatedly — bake it into the loop.

**Playwright is much better placed than chrome-devtools here**, because Playwright drives its own browser instance and its own synthetic pointer:

- The normal VJ tick needs **no pointer input at all** — `browser_evaluate` moves no cursor. So in the steady state there is simply nothing to park. Prefer keeping it that way: don't reach for `browser_click` / `browser_hover` when an `evaluate` will do.
- If a tick *does* require a pointer action (clicking the tab-audio share button, a knob drag), move the pointer out of the way immediately afterward with `browser_hover` targeting an element in the far corner — e.g. `target: "body"` after scrolling, or a corner element from `browser_snapshot`. Playwright's `browser_hover` takes an **element ref or selector, not coordinates**, so pick a real element rather than trying to pass `(x, y)`.
- If nothing suitable exists in the corner, inject one and hover it:
  ```javascript
  () => {
    let p = document.getElementById('__vjPark');
    if (!p) {
      p = document.createElement('div');
      p.id = '__vjPark';
      p.style.cssText = 'position:fixed;right:0;bottom:0;width:2px;height:2px;z-index:2147483647;pointer-events:auto;opacity:0';
      document.body.appendChild(p);
    }
    return 'ok';
  }
  ```
  then `browser_hover` with `target: "#__vjPark"`.
- Apply this rule for ALL jam-projecting sessions, not just VJ runs. Park the cursor before any screenshot you take during the show.

## Stop conditions

- `iteration >= target` → `CronDelete(jobId)`, delete state file
- User invokes `/vibej-pw stop` → same
- 3 consecutive validation failures → same, tell user
- MCP disconnects → skip the tick gracefully; cron will re-fire next minute. Do **not** call `browser_close` on a failed tick — it tears down the whole Playwright browser and kills the jam page mid-show.

## Shader swap (optional, when requested)

If the user says "switch shaders":
1. Pick a different base shader from `shaders/<user>/` or `shaders/wip/`.
2. `browser_tabs action:"select"` jam → `browser_navigate` to `http://localhost:$PORT/jam.html?shader=<new-path>&controller=<match>`.
3. Update `shaderPath` and `jamUrl` in `.claude/vj-state.json`.
4. Read the new shader's structure first (don't blind-edit), then continue iterations.

## Common pitfalls (learned the hard way)

- **GLSL reserved words**: `active`, `sample`, `input`, `output`, `common`, `filter`, `using` — pick a different var name or the compile fails.
- **Feedback accumulation blowouts**: effects that add to `col` feed back each frame. If a frame looks white, clamp `bg` or reduce the feedback multiplier (e.g. `prev * 0.78` → `* 0.66`).
- **Strobe direction matters**: default BRIGHT with dark punches, not the other way around.
- **Bass pulse stacking**: ember floor × sunburst × bass bloom × kick pulse all firing on the same bass spike → saturation. Pick one primary bass visualizer per session.
- **Kaleidoscope tiling persists via feedback**: even after disabling kaleido, the backdrop keeps the tile pattern until feedback decays. Lower `prev *` for a few iterations to shake it off.
- **Port is branch-derived**: main = 6969, other branches hash to 1024–65534. Always use `./scripts/dev-port` — never hardcode 6969.

Playwright-specific:

- **Playwright MCP is tab-stateful**: every action runs on the selected tab. Always `browser_tabs action:"select"` before `browser_evaluate` / `browser_take_screenshot` / `browser_navigate` — a select is cheap and prevents reading audio features off the Spotify tab by accident.
- **Tab indices are positional, not identities.** Opening or closing a tab renumbers the rest. Re-list and re-match by URL whenever a read is surprising (`window.cranes` undefined is the classic symptom of a stale index).
- **`browser_evaluate` has no `args` array.** Never string-escape a whole shader into the function body — use the `.claude/vj-pending.frag` fetch handoff in step D.
- **`browser_evaluate` returns must be JSON-serializable**: no DOM nodes, raw Promises, Maps, or class instances. Declare the function `async` if you need to await.
- **`browser_hover` takes a selector or snapshot ref, not coordinates.** Coordinate-based parking from the chrome-devtools skill has no direct equivalent — use the `#__vjPark` element trick above.
- **`browser_close` closes the browser, not a tab.** To close one tab use `browser_tabs action:"close" index:<n>`. Never call `browser_close` during a live show.
- **Playwright drives its own browser instance**, separate from the user's everyday Chrome. Mic and tab-audio permissions must be granted in *that* window, and the user must be projecting *that* window — confirm at setup rather than assuming the jam page they can see is the one you're driving.
- **Don't `browser_snapshot` the jam page casually.** It's a WebGL canvas — the accessibility snapshot carries almost no useful information and is pure token cost. Read state with `browser_evaluate`; screenshot only when the user asks to see a frame.

## Example `/vibej-pw tick` output

> **Iteration 52/180** — *Love Spell* — Prism rainbow rim on the coat (rim hue now angular around head + time). Pink shoulder / green chest / cyan hem.
