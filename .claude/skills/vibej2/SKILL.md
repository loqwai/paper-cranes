---
name: vibej2
description: "vibej v2 (TEST) — live auto-VJ as a responsive in-session loop instead of a cron. Burst-mode iteration (chains beats in-turn, browser-side waits), page-as-sensor wakes (?vj=1 + /__vj-signal + Monitor), atomic edit macro, ScheduleWakeup heartbeat for idle holds. Usage: `/vibej2 [duration|count] [shader-path-or-name]`, `/vibej2 stop|pause|tick`. v1 (/vibej) remains untouched until this graduates."
allowed-tools: Bash Read Write Edit Grep Glob Agent ScheduleWakeup Monitor TaskOutput TaskStop CronCreate CronList CronDelete
---

# vibej2 — Live Auto-VJ Loop (responsive-session edition)

Run Claude as the VJ: one **live session** that watches the frame, listens to you, and makes at
most one meaningful edit per beat. Non-destructive by default (edits `.frag` via `/__save-shader`,
HMR hot-swaps). Replaces the per-minute cron with a self-paced in-session loop (the Relay
coordinator pattern): **user messages reach the VJ in seconds, not at the next minute mark**, and
iteration speed is maxed — burst mode chains beats without ending the turn.

> **TEST SKILL.** `/vibej2` while under evaluation; v1 `/vibej` (+ `/vj`) is untouched and remains
> the fallback. State file is SHARED: `.claude/vj-state.json` (recovery snapshot only — not bumped
> every beat) — don't run both loops at once. Design + rationale: `.claude/skills/vibej/DESIGN-v2.md`.
> When this graduates, its body replaces `.claude/skills/vibej/SKILL.md` and the name reverts.

## Context

Arguments:
!`echo "$ARGUMENTS"`

Dev server port (from `scripts/dev-port` — branch-derived, `PORT` env overrides):
!`./scripts/dev-port`

Dev server status:
!`PORT=$(./scripts/dev-port); curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null || echo "not running"`

Existing state file (if a run is in progress):
!`cat .claude/vj-state.json 2>/dev/null || echo "(none)"`

Show browser (the projected window; `{"up":false}` until launched):
!`node scripts/vj/show.js status 2>&1 | tail -1`

Recent page signals (page-as-sensor; empty until a ?vj=1 page has booted):
!`tail -5 .claude/vj-signals.jsonl 2>/dev/null || echo "(none)"`

## Parent stays responsive; delegate everything else

**User directive, 2026-08-20 (verbatim): *"maybe everything else you do, you do in a subagent. the
parent Claude needs to always be responsive to user feedback"*.**

The parent loop is a **DISPATCHER, not a worker**. Its whole job is: triage the user's words, read
the meter, decide the ONE move — then hand execution to a subagent and get back to listening. **It
must never block.**

**Why this is structural, not stylistic:** a Monitor event, a task notification, and a user message
all reach the parent only **between turns**. Any long parent turn is dead air on the user's side.
Measured cost on 2026-08-20: a LEARN press the user was actively waiting on sat **~3 minutes**
purely because the parent was mid-turn running edits and verification waits. The user's reaction
was *"WHY HAVEN'T YOU REACTED TO THE LEARN BUTTON YET"* — the work was fine; the availability was not.

**The parent NEVER runs these — they go to `Agent` with `subagent_type: "fork"`:**
- browser-side verification waits (any `await new Promise(r => setTimeout(...))` pattern)
- multi-step analysis, correlation passes, batch screenshot review
- journal writing, doc writing, HANDOFF updates, repo archaeology
- long edit → compile → verify → retune cycles
- anything whose result the user is not waiting on *right now*

**The parent DOES do, inline, because they are fast and they are the judgement:** triage a user
message, one meter read, one screenshot when a compositional change needs judging, the decision of
what the next move is, and the one-line summary.

**Concurrency token — only ONE subagent at a time may touch the display page or the target
`.frag`.** The parent holds that token: never spawn a second page-touching fork while one is
running, or two agents will race on `window.cranes.shader` and on the same file. Read-only forks
(journal, docs, analysis of already-captured data) may run alongside one page-touching fork.

**LEARN is no longer on the parent's latency path at all.** The analysis now runs *in the page*
(`window.__vjAutoLearn`; permanent version in `docs/vj-auto-learn-patch.md`) and answers the pad's
loop strip in **~56 ms**, worst case ~450 ms. The parent's only remaining LEARN job is the
judgement call: **is this finding worth WIRING into the shader?**

## The show browser (the ONLY way to touch the display)

The display is a dedicated Chrome that `scripts/vj/show.js` spawns in fullscreen with its own
profile and a CDP port. Every page action goes through that script. **Never use the
claude-in-chrome extension or the chrome-devtools MCP for the display.** The user, 2026-10-06:
the extension's synthetic cursor in the middle of the wall, its orange window glow, and its
"Claude is debugging this browser" infobar are all *unacceptable for live shows*. A
Playwright/Puppeteer *launch* is out too: `--enable-automation` adds the "controlled by automated
test software" bar. `show.js` spawns Chrome by hand without that flag and only ever *attaches*.

```bash
node scripts/vj/show.js launch '<url>' [--display N]   # idempotent: reuses a running show browser
node scripts/vj/show.js goto '<url>'                   # full reload (resets feature history!)
node scripts/vj/show.js eval '<fn or expr>' '[args]'   # runs in the page, prints JSON
node scripts/vj/show.js shot .claude/vj-shots/<name>.png   # the PAGE, via CDP; pointer never moves
node scripts/vj/show.js status | displays | stop
```

What this buys, verified on the real screen with `screencapture` on 2026-10-06: no toolbar, no
infobar, no window glow, no pointer, no permission prompt (mic + MIDI are granted over CDP), and
`caffeinate` holds the display awake for exactly as long as the show Chrome lives. `shot` and
`eval` move nothing on screen, so a screenshot is free to take mid-show — there is no cursor to
re-park, ever.

Facts the loop relies on:
- **`launch` defaults to the LAST display** — the projector when one is attached. Run
  `show.js displays` first if there is any doubt; pass `--display N` to override.
- **The page must be the only page.** `show.js` refuses to act if the show browser has more or
  fewer than one page, rather than guessing which one is on the wall.
- **`goto` is a reload**: it resets the 500-frame feature history and `evoPhase`. Mid-set,
  change shaders by hot-swap through `eval` (see Arguments), never `goto`.
- Clicking the canvas no longer requests HTML5 fullscreen when the window already covers the
  screen, so a stray click cannot summon Chrome's "Press Esc to exit full screen" bubble.
- Things `show.js` CANNOT govern, which go on the pre-show checklist: OS overlays from other
  apps (a break-reminder app dimmed the whole screen during the 2026-10-06 test), macOS
  notifications (turn on Do Not Disturb), and the macOS orange mic-in-use dot (OS-drawn, a few
  pixels top-right, cannot be hidden by any app).

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
- **Respect the user's hands** (knobs, MIDI, TAKE OVER pinning — see v1 section, unchanged).
- **Fail loud, not silent**: the atomic edit macro GL-compiles before every save and confirms
  live-ness in the same call.
- **The heartbeat is the mechanism; monitors are a bonus** (Relay lesson). Never depend on an
  event wake you haven't watched fire.

## Arguments

`/vibej2 [duration|count] [shader-path-or-name] [audio=<input name>]`

- **No args** → run until stopped, shader = most recently modified `.frag`.
- **`audio=<substring>`** → override the input device, matched against device labels and
  passed to the page as `&audio_device=`. **Omitted → the OS default input** (whatever the user
  has selected in macOS Sound settings); add no `audio_device` param at all then. There is no
  Spotify tab and no music tab — the music comes in on that input.
- **Duration** (`90m`, `2h`) or bare integer (legacy: beat count) → soft budget; announce and
  wrap when reached.
- **Shader path** → same resolution rules as v1 (full path / relative / no-ext / bare unique
  name / URL with `?shader=`). Normalize to no-ext form.
- **`stop`** → end: `ScheduleWakeup(stop: true)`, TaskList → TaskStop any vibej monitors, final
  journal entry, delete `.claude/vj-state.json`, one-line wrap-up.
- **`pause`** → `ScheduleWakeup(stop: true)` only; keep monitors + state; `/vibej2` resumes.
- **`tick`** → run exactly one Beat then return (kept for old cron fires and manual pokes).
- **`cron`** → fallback mode: behave as v1 (CronCreate `* * * * *` + `/vibej2 tick`). Use ONLY
  when ScheduleWakeup is unavailable in the harness.

Mid-run re-invocation with a shader arg = shader swap, by hot-swap so audio history survives
(bring it up with a known preset AND screenshot before the crowd sees three states):

```bash
node scripts/vj/show.js eval 'async (path) => {
  const src = await fetch("/shaders/" + path + ".frag?t=" + Date.now()).then(r => r.text())
  const v = window.__vjValidate(src); if (!v.ok) return { ok: false, info: v.info }
  window.cranes.shader = src
  const u = new URL(location.href); u.searchParams.set("shader", path); history.replaceState({}, "", u)
  return { ok: true }
}' '["<new-path>"]'
```

## Setup (once, at `/vibej2` start — this is the pre-show checklist)

1. Port from `./scripts/dev-port`; start `npm run dev` (background Bash) if the server isn't
   answering.
2. **Launch the show browser** on the jam page (canvas only: no drawer, no toasts, no
   indicators; MIDI still live):
   **Always `stop` first** — a show browser left over from an earlier run can be alive with
   zero pages (window closed, process still on the CDP port), and every other command refuses
   it. `stop` closes it over raw CDP whatever state it is in; `not running` is fine.
   ```bash
   node scripts/vj/show.js stop
   node scripts/vj/show.js launch "http://localhost:$PORT/jam.html?shader=<path>&controller=<name>&vj=1&remote=display[&audio_device=<audio>]"
   ```
   Append `&audio_device=` only when the user passed `audio=`.
   `remote=display` joins the WebSocket hub so `scripts/vj/remote-send.js` and the vjpad reach
   the page. Add `&controller=` only when a matching `controllers/*.js` exists.
3. **Verify the input** — the page exposes the device it actually opened. Say it to the user in
   the setup line ("listening on <label>") so a wrong OS default is caught before the set:
   ```bash
   node scripts/vj/show.js eval '() => ({ input: window.cranes.audioInputLabel ?? null, energy: window.cranes.flattenFeatures().energy })'
   ```
   `input: null` (only possible with `audio=`) means the name matched no device (the page logged the available labels to its
   console — read them with `eval '() => navigator.mediaDevices.enumerateDevices().then(d => d.filter(x => x.kind === "audioinput").map(x => x.label))'`).
   **Do not start beats on the wrong input** — tell the user which inputs exist and stop.
4. **Pre-show checklist, said to the user in one line** — Do Not Disturb on, break-reminder /
   screen-dimming apps quit, projector is the display `launch` chose. These are outside the
   page; nothing in the loop can catch them.
5. **Read `docs/vj-preferences.md` first.** It records the user's standing taste and applies to
   every shader. Brief every sub-agent and the art critic with it, and append any new design
   feedback the user gives during the set to it, in the user's own words and with a date.
   Then **read the shader's journal** (`journals/<name>-cool-moments.md`) and last HANDOFF. Todo +
   History-of-changes = your rules. Never re-add a vetoed motif.
6. **Ensure the page runtime** (see below) and screenshot-judge the frame as it stands. If it
   doesn't read, the first beats are legibility fixes.
7. Audio verified (raw energy > gate, quietGate computed not pinned); controller pinning checked
   (`Object.keys(window.cranes.messageParams)`).
8. Target must be a SCRATCH COPY, never committed art.
9. Write the recovery snapshot `.claude/vj-state.json`:
   `{ shaderPath, showUrl, audioDevice, room, port, moveStyle, mode: "live-loop", startedAt }`
   (no iteration counter — beats are counted in-context; update this file only when one of these
   fields changes).
10. **Announce the cadence** to the user in one line: "Live loop: I check every ~90 s while
   tuning, stretch to ~5 min when healthy, and I see your messages immediately."
11. **Arm the dial-release wake:** a Monitor on `node scripts/vj/watch-dials.js 2>&1` (30 min,
    re-armed on expiry). It polls the knobs over CDP and prints `RELEASE K<n> a→b … | all={…}`
    when the user lets go of a dial. (`watch-release.js` needs `vjtrack=1`, which is banned at
    shows; keep it for knob-correlate sessions only.)
12. *(Optional, phase 2 / if available)* Arm a persistent Monitor on `.claude/vj-signals.jsonl`
   (page-posted health alerts) or, lacking that, on the target `.frag` (external edits). Arm
   once — check TaskList first on any re-entry.
13. Run **Beat #1** immediately, then re-arm the wakeup (see The Beat).

### Page runtime — ensure, don't install

`?vj=1` makes the page install the validator, meter and jank probe at boot. One `eval` per beat,
FIRST thing, before any screenshot is trusted, tells you whether the page reloaded since the last
beat:

```bash
node scripts/vj/show.js eval '() => { const fresh = window.__vjSeen !== true; window.__vjSeen = true; return { fresh, meter: typeof window.__vjMeter, validate: typeof window.__vjValidate } }'
```

`fresh: true` on any beat after the first is the reload tell. After a reload: re-apply runtime
knob tweaks, and treat the first meter window as garbage. `meter`/`validate` not both `"object"`
/`"function"` ⇒ the runtime failed to boot; read the page console via `eval` before going on.
Cursor hiding is no longer the runtime's job — `jam.css` hides it unconditionally.

## The Beat (replaces "Per iteration")

A Beat runs when **any** of these happens — the harness re-invokes the live session:
- the ScheduleWakeup heartbeat fires,
- a `<task-notification>` arrives (Monitor event: health alert / file change),
- **the user says something** (this can also land mid-turn — triage it immediately, whatever
  step you're on).

Order within a Beat:

1. **Ensure page runtime** (call above). If `fresh`, note the reload, skip metric-driven
   moves this beat.
2. **B0 LOOK** — `node scripts/vj/show.js shot .claude/vj-shots/<beat>.png`, then Read it; judge
   visually (clip? dark floor? focal point? legible? shivering?). The shot is taken over CDP —
   nothing on the wall moves, so look as often as judgement needs.
3. **Meter** — `__vjMeter.summary(50)` + `residR(50)`. **If gate < 0.9 (track boundary): make no
   metric-driven move; stay in-turn and wait ~20 s browser-side, then re-check — never burn a
   wakeup on a dirty window (and note the 60 s wakeup floor makes short wakeups impossible
   anyway).** Thresholds: clip = 0 always; flicker > 0.7 = act, don't
   rationalize; dark 0.1–0.3; lumMin ≥ 0.08; rResid is the beat-scale musicality needle.
   **EXCEPT — flicker the USER is causing is not a defect (user, 2026-08-20): before acting on any
   flicker reading or alert, check whether a knob/nav param changed during the window. If their
   hands were moving, the frame churn is theirs; say nothing, log nothing, change nothing.** A
   fader sweep moves the whole frame, and the meter cannot tell that from a strobe. Snapshot the
   knob vector, wait a few seconds, snapshot again:
   ```bash
   node scripts/vj/show.js eval 'async () => { const kv = () => JSON.stringify(Object.fromEntries(Object.entries({...window.cranes.manualFeatures, ...window.cranes.messageParams}).filter(([k]) => /^knob_|^nav/.test(k)))); const a = kv(); await new Promise(r => setTimeout(r, 6000)); return a !== kv() }'
   # true => their hands, not a defect
   ```
   `clip` stays 0 through hand-driven flicker, so clip > 0 is still real and still acts.
   **Filter it at the SOURCE, not per-beat.** Two levers, in order of preference:
   1. **The Monitor** (safe mid-show, touches nothing on the wall) — only surface big flicker,
      keep every other alert. **Use grep, not awk: this file is a skill template, and an `awk`
      body containing a dollar-zero gets SUBSTITUTED at render time** (it rendered as the literal word
      "lattice" — the skill's own argument — producing a monitor that silently matched nothing).
      Numeric alternation in a regex does the same job with no shell variables to mangle.
      **Anchor the flicker clause to `"type":"flicker"`** — `pulse` lines carry a nested `flicker`
      field, so an unanchored `"flicker":1\.[2-9]` leaks a false alert on every busy pulse. Verified
      against both forms before arming:
      ```bash
      tail -n 0 -F .claude/vj-signals.jsonl | grep -E --line-buffered '"type":"(clip|too-dark|shiver|boot)"|"type":"flicker","flicker":(1\.[2-9]|[2-9])'
      ```
   2. **The page watchdog** (`src/vj/runtime.js`) — gate the flicker alert on "no knob moved in
      ~3 s"; the LEARN ring already tracks exactly that. **POST-SHOW ONLY: editing runtime.js
      triggers HMR, and a reload resets `evoPhase` to 0, which destroys an accrued flow state.**
4. **LEARN presses: ALWAYS answer, never refuse** (user, 2026-08-20: *"your job is to try your
   best to 'learn', even if the data is too noisy. just best fit _anything_. don't refuse."*).
   `scripts/vj/learn-correlate.js` no longer gates on significance — it ranks every channel and
   returns `bestGuess` (top non-clock feature) plus a `confidence` label of **strong** (t>3,
   |r|>0.4) / **weak** (t>2, |r|>0.25) / **guess** (anything else), with clock-like accumulators
   demoted 0.6x rather than excluded and `timeTrendSuspect` set when three clocks tie. Report the
   best guess WITH its label — "guess: spectralCentroid r=0.31, low confidence" beats "no finding".
   The uncertainty goes in the label, never in a refusal. Wiring still needs judgment: a `guess`
   is a conversation starter, a `strong` corroborated across two+ faders is wireable.
   **Editing ANY file the page fetches (`scripts/vj/*.js`, `src/**`) triggers HMR and can RELOAD
   the display — which resets `evoPhase` and destroys an accrued flow state. Learned the hard way
   2026-08-20: a learn-correlate.js edit cost a 16.6 set clock (99.6% complexity -> 5%).** Edit
   analysis scripts BETWEEN sets, or accept the reset knowingly. Recovery: `remote-send
   '{"evoPhase":<value>}'` pins it back (the pad-pin path overrides controller outputs;
   `manualFeatures` does NOT), and `null` releases it.

5. **Dial releases are user words.** On a `RELEASE` line, read which knobs moved and in which
   direction, and interpret the intent: the dials steer the visual. A dial held at an extreme is
   a request to bake that direction into the shader. Make ONE move from it, as for a message.
   **Triage user words FIRST** if any arrived since the last beat — same table as v1 ("too
   subtle" / "shivery" / "flashing" / "washed out" / "get rid of X" / repeated asks ⇒ 3–5×
   stronger). A repeated complaint means the previous fix failed: prefer ONE decisive pass over
   another partial patch (the 2026-08-18 oscillation survived four partial fixes).
6. **Pick at most ONE move** (the features guide it; archetype table and hard
   guardrails unchanged from v1 — no object-overlays, no screen-space warps, no transients on
   geometry, audio in amplitude/gate never in phase args, no clipping or washout, prefer
   subtract/fix). Healthy frame + no user input + nothing learned ⇒ a no-move beat is correct.
7. **Apply via the atomic edit macro** (below). Never edit-then-swap as separate calls.
8. **D2 LOOK** after any compositional change; revert or retune in the same beat if worse.
9. **Journal** (same rules: cool moments, user flags, removals, forks; skip only trivial nudges).
10. **One-line summary** — `**Beat — <what changed / why holding>.**` No screenshots in the
   message.
11. **Choose: chain or idle.** Iteration speed is maxed (user decision 2026-08-19), so the
    default while ANY work is active is **BURST MODE — do not end the turn**: go straight into
    the next beat, using a browser-side wait for the observation window:

```bash
# verification wait — runs in the page; returns the meter for the window it waited through
node scripts/vj/show.js eval 'async (secs) => { await new Promise(r => setTimeout(r, secs * 1000)); return { s: window.__vjMeter.summary(secs), r: window.__vjMeter.residR(secs) } }' '[20]'
```

| Situation | Do |
|---|---|
| Edit in flight, verifying | stay in-turn: wait 15–30 s browser-side → re-meter → next beat |
| Dirty gate (track boundary) | stay in-turn: wait ~20 s → re-check gate |
| User engaged / feedback burst | stay in-turn, triage-first, chain beats |
| Healthy ≥ 3 beats AND user quiet | end turn: `ScheduleWakeup(240–420 s, "healthy hold")` |
| Brief pause wanted, work pending | end turn: `ScheduleWakeup(60 s)` — the FLOOR; nothing shorter exists, which is why fast pacing is in-turn |

**Context economy in burst mode** (the price of speed): screenshots are the expensive step.
Verification cycles run on METER NUMBERS; screenshot only on compositional changes, on
suspicion, or every ~4th cycle. Delegate anything heavy to a subagent. If context runs long the
harness compacts and the wakeup prompt re-enters the skill — state must already be in the
journal/snapshot by then (write-as-you-go, not at the end).

Pass the original `/vibej2 …` input as the wakeup `prompt` so a post-compaction fire re-enters
the skill. If a beat budget/duration was set and reached → run the stop procedure instead.

### Atomic edit macro (un-skippable, one call)

Prepare the edited source in-context (Read + Edit on the `.frag` is fine — the jam page
hot-swaps disk writes, but *never trust that*), then in ONE `eval`:

```bash
# marker = the unique comment string this edit added
node scripts/vj/show.js eval 'async (shaderPath, marker) => {
  const src = await fetch("/shaders/" + shaderPath + ".frag?t=" + Date.now()).then(r => r.text())
  if (!src.includes(marker)) return { ok: false, stage: "disk", info: "edit not on disk" }
  const v = window.__vjValidate(src)
  if (!v.ok) return { ok: false, stage: "compile", info: v.info }
  if (!window.cranes.shader.includes(marker)) window.cranes.shader = src
  return { ok: true, live: window.cranes.shader.includes(marker) }
}' '["<shaderPath>", "<marker>"]'
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
  Leave the show browser up unless the user asks — the visual keeps running on its own.
  `node scripts/vj/show.js stop` closes it.
- **Pause**: wakeup `stop:true` only; everything else stays; `/vibej2` resumes in-context.
- **Crash/compaction**: fresh `/vibej2` reads the snapshot + journal Status, checks
  `show.js status` (relaunch with the snapshot's `showUrl` only if it is down), ensures the runtime, and — before any new move — **verifies which markers are actually in
  `window.cranes.shader`** (live-ness is exactly what an interrupt makes uncertain), then resumes
  beats. Discard the first meter window after any resume.

## Page-as-sensor (IMPLEMENTED — use it every run)

The display URL must include **`&vj=1`** — the page then self-installs the whole VJ runtime at
boot (cursor-hide, `__vjValidate`, aesthetic meter + shiver probe) and POSTs signals to
`/__vj-signal` (dev server writes `.claude/vj-signals.jsonl`, gitignored):
- `boot` beacon on every load — a reload can never silently strip tooling again (the `typeof
  __vjMeter` check remains as belt-and-braces, but reinstall is now the page's job, not yours),
- health alerts on a 5 s watchdog with 30 s per-type cooldown: `clip`, `flicker` (> 0.7),
  `too-dark` (lumMin < 0.06 at clean gate), `shiver` (shiverScore > 0.45), `gate-drop` /
  `gate-clean` (track boundaries — `gate-clean` is your "verification window open" starter gun).

**At `/vibej2` start, arm a Monitor** on `.claude/vj-signals.jsonl` (watch for appended lines) so
these signals wake the idle session within seconds. Monitor is the accelerator; the ScheduleWakeup
heartbeat stays armed as the guarantee. In burst mode you don't need the Monitor to react — you
can also just `GET /__vj-signal` (last 50 signals) or read the file between beats.

Harness prerequisites (already committed, verify they're in place):
- `vite-plugins/vj-signal-plugin.js` registered in `vite.config.js` (restart the dev server after
  pulling — a running server predating the plugin 404s the endpoint),
- `.claude/settings.json` allowlists the loop's context/hot-path Bash (`./scripts/dev-port`, the
  curl health check, state/signal file reads, `validate-shader.js`, shader-only `git checkout`) —
  the permission classifier is out of the loop; a classifier outage can no longer drop beats.

## Common pitfalls

These v1 pitfalls still stand: GLSL reserved words, feedback blowouts, strobe direction,
bass-pulse stacking, kaleido persistence via feedback, JSON-serializable `eval` returns, and
one-line summaries. The v1 browser pitfalls (page-stateful devtools, unstable pageIds, cursor
parking, `fullscreen=true` ejecting the tab) are gone with the show browser. New in v2:

- **Don't let beats become cron in disguise.** If every beat is a fixed 60 s no-op, you've
  rebuilt v1; stretch the healthy hold and let events/user words drive the fast path.
- **Never skip the re-arm.** A beat that ends without ScheduleWakeup (or stop) parks the loop
  silently — the exact v1 failure this design exists to kill.
- **Meter windows and wake times are decoupled** — a 30 s beat still reads a 50 s meter window;
  overlapping windows across beats are fine, double-counting a spike into two decisions is not.
- **Quote `eval` sources in single quotes** and use double quotes inside the JS, so the shell
  passes the function through untouched (`$` inside single quotes is safe from the shell — but
  remember this file is a skill template: a dollar sign followed by a digit gets substituted
  at render, so never write one in an `eval` source here).
- **A `<task-notification>` is not the user.** Handle it inside the loop's discipline; don't
  treat it as permission for a bigger move than the evidence supports.
