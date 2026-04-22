---
name: vj
description: "VJ a shader live at a party — auto-mutates the shader every minute to match the track. Reads audio features + Spotify track name from the jam page, edits the .frag via /__save-shader (HMR hot-swaps). Usage: `/vj [duration-minutes]` (default 180). Use `/vj stop` to end early."
allowed-tools: Bash Read Write Edit Grep Glob CronCreate CronList CronDelete mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__tabs_create_mcp mcp__claude-in-chrome__navigate mcp__claude-in-chrome__javascript_tool
---

# VJ — Live Auto-VJ Loop for the Jam Page

Run Claude as the VJ: every minute, read the current audio features + track name, make ONE meaningful edit to the shader, move on. Non-destructive by default (edits `.frag` via `/__save-shader`, HMR hot-swaps).

## Philosophy

- **Match the music**: read audio state before each edit, let track name / pitch / energy guide the move.
- **One focused move per tick**: add/change a single feature (palette, effect, geometry tweak). Don't rewrite.
- **Respect the user**: the user might be twiddling knobs or watching the editor — don't smash their knobs, don't rewrite their code wholesale.
- **Fail loud, not silent**: validate each edit with `scripts/validate-shader.js`; if it breaks, fix or revert.

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

- **No args** → 180 iterations (3 hours), 1 per minute
- **Single integer N** → N iterations
- **`stop`** → read `.claude/vj-state.json`, `CronDelete` the stored job ID, remove the state file
- **`tick`** → single iteration (what the cron fires)

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

- `tabs_context_mcp` with `createIfEmpty: true`
- Find or create a jam tab: `http://localhost:$PORT/jam.html?shader=<path>&controller=<name>`
  - Default shader: most recently modified `.frag` in the worktree, else `redaphid/wip/the-coat-fur-coat/the-coat-3`
  - Default controller: match shader name (e.g. `the-coat-3` → `the-coat`) if a matching `controllers/*.js` exists
- Find or create a Spotify tab: `https://open.spotify.com`

Record the **jam tab ID** and **spotify tab ID** — you'll reuse them every iteration.

### 4. Schedule the minute cron

```
CronCreate({
  cron: "* * * * *",
  prompt: "/vj tick",
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
  "jamTabId": 653089308,
  "spotifyTabId": 653089312,
  "port": 4788,
  "startedAt": "<ISO timestamp>"
}
```

### 6. Run iteration 1 immediately (don't wait for first cron fire)

Then each subsequent minute the cron re-enters the skill with `/vj tick`.

## Per iteration (`/vj tick`)

### A. Load state

Read `.claude/vj-state.json`. If missing, print "no VJ run in progress" and exit.

If `iteration >= target`, call `CronDelete(jobId)`, delete the state file, print "VJ run complete", exit.

### B. Read state from browser

Run on the jam tab:
```javascript
(() => {
  const f = window.cranes.flattenFeatures();
  return JSON.stringify({
    bass: f.bassNormalized?.toFixed(2), bassZ: f.bassZScore?.toFixed(2),
    treb: f.trebleNormalized?.toFixed(2), trebZ: f.trebleZScore?.toFixed(2),
    mids: f.midsNormalized?.toFixed(2),
    energy: f.energyNormalized?.toFixed(2), energyZ: f.energyZScore?.toFixed(2),
    flux: f.spectralFluxZScore?.toFixed(2),
    entropy: f.spectralEntropyNormalized?.toFixed(2),
    centroid: f.spectralCentroidNormalized?.toFixed(2),
    pitch: f.pitchClassNormalized?.toFixed(2),
    beat: f.beat,
  });
})()
```

Read the track name on the Spotify tab:
```javascript
document.querySelector('[data-testid="now-playing-widget"]')?.textContent?.trim().slice(0, 100)
```

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

**One-time install per jam-tab reload:**
```javascript
(async () => {
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
})()
```

Then each tick:
```javascript
(async () => {
  const src = await (await fetch('/shaders/<shader-path>.frag?t=' + Date.now())).text();
  let edited = src;
  // ... string replacements ...
  const v = window.__vjValidate(edited);
  if (!v.ok) return 'COMPILE FAIL (not saved): ' + v.info;
  const res = await fetch('/__save-shader', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ shader: '<shader-path>', code: edited })
  });
  return await res.text();
})()
```

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

## Stop conditions

- `iteration >= target` → `CronDelete(jobId)`, delete state file
- User invokes `/vj stop` → same
- 3 consecutive validation failures → same, tell user
- MCP disconnects → skip the tick gracefully; cron will re-fire next minute

## Shader swap (optional, when requested)

If the user says "switch shaders":
1. Pick a different base shader from `shaders/<user>/` or `shaders/wip/`.
2. Update the jam tab URL via `navigate` → `http://localhost:$PORT/jam.html?shader=<new-path>&controller=<match>`
3. Update `shaderPath` in `.claude/vj-state.json`.
4. Read the new shader's structure first (don't blind-edit), then continue iterations.

## Common pitfalls (learned the hard way)

- **GLSL reserved words**: `active`, `sample`, `input`, `output`, `common`, `filter`, `using` — pick a different var name or the compile fails.
- **Feedback accumulation blowouts**: effects that add to `col` feed back each frame. If a frame looks white, clamp `bg` or reduce the feedback multiplier (e.g. `prev * 0.78` → `* 0.66`).
- **Strobe direction matters**: default BRIGHT with dark punches, not the other way around.
- **Bass pulse stacking**: ember floor × sunburst × bass bloom × kick pulse all firing on the same bass spike → saturation. Pick one primary bass visualizer per session.
- **Kaleidoscope tiling persists via feedback**: even after disabling kaleido, the backdrop keeps the tile pattern until feedback decays. Lower `prev *` for a few iterations to shake it off.
- **Port is branch-derived**: main = 6969, other branches hash to 1024–65534. Always use `./scripts/dev-port` — never hardcode 6969.

## Example `/vj tick` output

> **Iteration 52/180** — *Love Spell* — Prism rainbow rim on the coat (rim hue now angular around head + time). Pink shoulder / green chest / cyan hem.
