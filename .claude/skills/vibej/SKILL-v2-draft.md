# vibej v2 — Live Auto-VJ Loop (responsive-session edition) — DRAFT

Run Claude as the VJ: one **live session** that watches the frame, listens to you, and makes at
most one meaningful edit per beat. Non-destructive by default (edits `.frag` via `/__save-shader`,
HMR hot-swaps). v2 replaces the per-minute cron with a self-paced in-session loop (the Relay
coordinator pattern): **user messages reach the VJ in seconds, not at the next minute mark.**

> **Aliases:** `/vibej` canonical, `/vj` legacy. State file stays `.claude/vj-state.json`
> (recovery snapshot only — no longer bumped every beat).

## Philosophy (unchanged where it worked)

- **LOOK before you touch, LOOK after you touch.** A screenshot is the only ground truth.
- **Diagnose before you add.** Feedback → screenshot → root cause → usually a subtraction.
- **Match the music, structurally — the channel hierarchy (2026-08-18):**
  1. **GEOMETRY only EVOLVES** — monotonic accumulators, perpetual self-similar zoom, or one-way
     eased plateau steps on drops. NO sines, NO audio (however smoothed) on fold-geometry params.
  2. **LIGHT/SHADING takes ALL the audio** — local relief, band lighting; never the global
     multiplier (strobe channel).
  3. **COLOR follows the slowest music only** — key medians, set clock, permanent drop mutations.
- **One focused move per beat**, visible from across the room.
- **Respect the user's hands** (knobs, TAKE OVER pinning — see v1 section, unchanged).
- **Fail loud, not silent**: the atomic edit macro GL-compiles before every save and confirms
  live-ness in the same call.
- **The heartbeat is the mechanism; monitors are a bonus** (Relay lesson). Never depend on an
  event wake you haven't watched fire.

## Arguments

`/vibej [duration|count] [shader-path-or-name] [mode]`

- **No args** → run until stopped, shader = most recently modified `.frag`.
- **Duration** (`90m`, `2h`) or bare integer (legacy: beat count) → soft budget; announce and
  wrap when reached.
- **Shader path** → same resolution rules as v1 (full path / relative / no-ext / bare unique
  name / URL with `?shader=`). Normalize to no-ext form.
- **`stop`** → end: `ScheduleWakeup(stop: true)`, TaskList → TaskStop any vibej monitors, final
  journal entry, delete `.claude/vj-state.json`, one-line wrap-up.
- **`pause`** → `ScheduleWakeup(stop: true)` only; keep monitors + state; `/vibej` resumes.
- **`tick`** → run exactly one Beat then return (kept for old cron fires and manual pokes).
- **`cron`** → fallback mode: behave as v1 (CronCreate `* * * * *` + `/vibej tick`). Use ONLY
  when ScheduleWakeup is unavailable in the harness.

Mid-run re-invocation with a shader arg = shader swap (same procedure as v1, plus: bring it up
with a known preset AND screenshot before the crowd sees three states).

## Setup (once, at `/vibej` start — this is the pre-show checklist)

1. Port from `./scripts/dev-port`; start `npm run dev &` if the server isn't answering.
2. Ensure jam/display + music tabs exist (same as v1); record page ids. Re-discover ids via
   `list_pages`/`tabs_context_mcp` rather than trusting cached ones.
3. **Read the shader's journal** (`journals/<name>-cool-moments.md`) and last HANDOFF. Todo +
   History-of-changes = your rules. Never re-add a vetoed motif.
4. **Ensure the page runtime** (see below) and screenshot-judge the frame as it stands. If it
   doesn't read, the first beats are legibility fixes.
5. Audio verified (raw energy > gate, quietGate computed not pinned); controller pinning checked
   (`Object.keys(window.cranes.messageParams)`).
6. Target must be a SCRATCH COPY, never committed art.
7. Write the recovery snapshot `.claude/vj-state.json`:
   `{ shaderPath, jamPageId, spotifyPageId, room, port, moveStyle, mode: "live-loop", startedAt }`
   (no iteration counter — beats are counted in-context; update this file only when one of these
   fields changes).
8. **Announce the cadence** to the user in one line: "Live loop: I check every ~90 s while
   tuning, stretch to ~5 min when healthy, and I see your messages immediately."
9. *(Optional, phase 2 / if available)* Arm a persistent Monitor on `.claude/vj-signals.jsonl`
   (page-posted health alerts) or, lacking that, on the target `.frag` (external edits). Arm
   once — check TaskList first on any re-entry.
10. Run **Beat #1** immediately, then re-arm the wakeup (see The Beat).

### Page runtime — ensure, don't install

One `evaluate_script`/`javascript_tool` call per beat, FIRST thing, before any screenshot is
trusted:

```javascript
async () => {
  if (window.__vjRuntime === 'ready') return 'ready';
  // cursor hygiene
  let st = document.getElementById('__vj-nocursor');
  if (!st) { st = document.createElement('style'); st.id = '__vj-nocursor';
    st.textContent = '*{cursor:none !important} #remote-status-indicator{display:none !important}';
    document.head.appendChild(st); }
  // GL validator
  if (typeof window.__vjValidate !== 'function') {
    const mod = await import('/src/shader-transformers/shader-wrapper.js');
    const gl = Object.assign(document.createElement('canvas'), {width:4,height:4}).getContext('webgl2');
    window.__vjValidate = (src) => { const sh = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(sh, mod.shaderWrapper(src)); gl.compileShader(sh);
      const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
      const info = ok ? null : gl.getShaderInfoLog(sh); gl.deleteShader(sh); return {ok, info}; };
  }
  // meter
  if (typeof window.__vjMeter === 'undefined')
    eval(await fetch('/scripts/vj/aesthetic-meter.js?t=' + Date.now()).then(r => r.text()));
  window.__vjRuntime = 'ready';
  return 'reinstalled';   // 'reinstalled' ⇒ the page reloaded since last beat: discard the next meter window
}
```

`'reinstalled'` is the reload tell (NOT the screenshot cursor arrow — that's the extension's
synthetic overlay). After a reload: re-apply runtime knob tweaks, and treat the first meter
window as garbage.

## The Beat (replaces "Per iteration")

A Beat runs when **any** of these happens — the harness re-invokes the live session:
- the ScheduleWakeup heartbeat fires,
- a `<task-notification>` arrives (Monitor event: health alert / file change),
- **the user says something** (this can also land mid-turn — triage it immediately, whatever
  step you're on).

Order within a Beat:

1. **Ensure page runtime** (call above). If `'reinstalled'`, note the reload, skip metric-driven
   moves this beat.
2. **B0 LOOK** — screenshot the display tab; judge visually (clip? dark floor? focal point?
   legible? shivering?). Re-park cursor after.
3. **Meter** — `__vjMeter.summary(50)` + `residR(50)`. **If gate < 0.9 (track boundary): make no
   metric-driven move; re-arm a short wakeup (~25 s) and end the beat — wait for a clean window
   instead of burning a slot.** Thresholds: clip = 0 always; flicker > 0.7 = act, don't
   rationalize; dark 0.1–0.3; lumMin ≥ 0.08; rResid is the beat-scale musicality needle.
4. **Triage user words FIRST** if any arrived since the last beat — same table as v1 ("too
   subtle" / "shivery" / "flashing" / "washed out" / "get rid of X" / repeated asks ⇒ 3–5×
   stronger). A repeated complaint means the previous fix failed: prefer ONE decisive pass over
   another partial patch (the 2026-08-18 oscillation survived four partial fixes).
5. **Pick at most ONE move** (features + track name guide it; archetype table and hard
   guardrails unchanged from v1 — no object-overlays, no screen-space warps, no transients on
   geometry, audio in amplitude/gate never in phase args, palette never white, prefer
   subtract/fix). Healthy frame + no user input + nothing learned ⇒ a no-move beat is correct.
6. **Apply via the atomic edit macro** (below). Never edit-then-swap as separate calls.
7. **D2 LOOK** after any compositional change; revert or retune in the same beat if worse.
8. **Journal** (same rules: cool moments, user flags, removals, forks; skip only trivial nudges).
9. **One-line summary** — `**Beat — <track> — <what changed / why holding>.**` No screenshots in
   the message.
10. **Re-arm the wakeup — the beat's final act, never skipped** (if the loop should continue):

| Situation | delaySeconds | reason string says |
|---|---|---|
| Just made an edit; verifying its effect | 30–45 | "verifying <marker> on next clean window" |
| Waiting out a dirty meter window (gate < 0.9) | 20–30 | "waiting for clean gate" |
| Active tuning (experiment in flight, user engaged) | 60–120 | "active tuning" |
| Healthy ≥ 3 consecutive beats, user quiet | 240–420 | "healthy hold" |
| User just went quiet after a burst of feedback | 60 | "post-feedback watch" |

Pass the original `/vibej …` input as the wakeup `prompt` so a post-compaction fire re-enters
the skill. If a beat budget/duration was set and reached → run the stop procedure instead.

### Atomic edit macro (un-skippable, one call)

Prepare the edited source in-context (Read + Edit on the `.frag` is fine — the editor-sync
plugin hot-swaps disk writes, but *never trust that*), then in ONE `evaluate_script`:

```javascript
// args: [shaderPath, marker]  — marker = the unique comment string this edit added
async (shaderPath, marker) => {
  const src = await fetch('/shaders/' + shaderPath + '.frag?t=' + Date.now()).then(r => r.text());
  if (!src.includes(marker)) return { ok:false, stage:'disk', info:'edit not on disk' };
  const v = window.__vjValidate(src);
  if (!v.ok) return { ok:false, stage:'compile', info:v.info };
  if (!window.cranes.shader.includes(marker)) window.cranes.shader = src;  // force the swap
  return { ok:true, live: window.cranes.shader.includes(marker) };
}
```

`live` must be `true` before the beat may proceed. If compile fails: revert the file
(`git checkout -- <file>`), count a failure; 3 consecutive failures ⇒ stop the loop and tell the
user. An interrupt can no longer strand a saved-but-not-live edit: the next beat's macro re-run
with the same marker converges to live-or-reverted.

## Wake-source rules (Relay lessons, verbatim into practice)

- **Heartbeat is primary.** If a Monitor is armed, it accelerates; it never replaces the wakeup.
- **Monitor scope must cover everything you act on** — if you watch the signals file, ALSO keep
  triaging user chat; a monitor never sees the user.
- **Duplicate wakes are no-op beats, not bugs.** After handling a user message, re-arm anyway.
- **Keep this context for judgment.** Anything heavy (batch screenshots analysis, repo
  archaeology, doc writing) goes to a subagent; the loop context stays lean so it survives hours.

## Stop / pause / recovery

- **Stop**: wakeup `stop:true` → TaskStop monitors → final journal Status line → rm
  `.claude/vj-state.json` → one-line wrap-up (+ push if the user asked for branch backups).
- **Pause**: wakeup `stop:true` only; everything else stays; `/vibej` resumes in-context.
- **Crash/compaction**: fresh `/vibej` reads the snapshot + journal Status, re-discovers page
  ids, ensures the runtime, and — before any new move — **verifies which markers are actually in
  `window.cranes.shader`** (live-ness is exactly what an interrupt makes uncertain), then resumes
  beats. Discard the first meter window after any resume.

## Phase 2 (repo upgrade — optional, not a dependency)

`?vj=1` on the display URL loads the VJ runtime at page boot (reload-proof), meters
continuously, and POSTs alerts (`flicker>0.7`, `clip>0`, `lumMin<0.08`, gate transitions,
`reloaded` beacon) to `/__vj-signal` (tiny vite dev plugin → `.claude/vj-signals.jsonl`). A
persistent Monitor on that file turns the page into the watchdog: Claude is woken by the frame
itself within seconds of a breach. Until then, phase 1 heartbeat-only is fully functional.

## Common pitfalls

All v1 pitfalls stand (GLSL reserved words, feedback blowouts, strobe direction, bass-pulse
stacking, kaleido persistence via feedback, branch-derived port, page-stateful devtools,
JSON-serializable returns, `fullscreen=true` ejects the tab, corner-parked hover still shows a
pointer, one-line summaries, unstable pageIds). New in v2:

- **Don't let beats become cron in disguise.** If every beat is a fixed 60 s no-op, you've
  rebuilt v1; stretch the healthy hold and let events/user words drive the fast path.
- **Never skip the re-arm.** A beat that ends without ScheduleWakeup (or stop) parks the loop
  silently — the exact v1 failure this design exists to kill.
- **Meter windows and wake times are decoupled** — a 30 s beat still reads a 50 s meter window;
  overlapping windows across beats are fine, double-counting a spike into two decisions is not.
- **A `<task-notification>` is not the user.** Handle it inside the loop's discipline; don't
  treat it as permission for a bigger move than the evidence supports.
