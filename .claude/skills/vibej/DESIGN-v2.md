# vibej v2 — Design: from cron ticks to a live responsive loop

**Status:** draft for review (2026-08-18, written at shutdown of the lattice-vj session).
**Companion:** `SKILL-v2-draft.md` (full rewritten skill, does not replace `SKILL.md` until approved).

---

## 1. The Relay pattern (research findings)

How the Relay app's coordinator stays responsive was reconstructed from mindmeld:

- **Session 8030, chunk 2** (msgs 1791898–1792285, 2026-08-13) — the "Alpha" coordinator loop,
  read in raw transcript. This is the canonical implementation.
- **Session 9448** (2026-08-18) — the same pattern re-attached after a session reset; failure lore.
- **Session 5831** (2026-08-07) — an earlier heartbeat design using PostToolUse hooks +
  per-message launchers (a heavier, hook-based alternative; not what v2 uses, noted for contrast).

The mechanism is a **triad**, and none of it is the cron primitive:

1. **Monitor (`persistent: true`)** — a background watcher armed once. Its events arrive as
   `<task-notification>` messages that **re-invoke the live session immediately**. In 8030 the
   monitor polled the relay every ~15 s for new messages; when the user texted from a phone, the
   notification woke the coordinator within seconds and it answered in-context.
2. **ScheduleWakeup (dynamic self-pacing)** — the fallback heartbeat. Each turn *ends* by
   re-arming a wakeup carrying the loop prompt; the harness re-invokes when the wakeup fires
   **or** a task-notification arrives, whichever is first. `stop: true` ends the loop. The
   coordinator chose 2-minute beats when active and would stretch them when quiet.
3. **The session never goes cold.** All state (what's claimed, what's pending, what was just
   tried) lives in the conversation context. The loop is *one continuous session that keeps
   choosing to wake itself*, not a scheduler re-entering a skill from scratch.

Hard-won caveats recorded in those sessions, all of which v2 inherits as rules:

- **The heartbeat is the mechanism; the monitor is a bonus.** (8030: "an armed monitor does not
  rouse a parked coordinator — only an outside poke does" on that machine. Treat event-wake as
  an accelerator; never depend on it alone.)
- **Monitor scope must cover everything you care about.** (8030: the Alpha-only monitor missed a
  time-critical message in `main` for 31 seconds-going-on-forever; it was found only because a
  beat ran a wider status check.)
- **Keep the loop context clean; delegate heavy work.** The coordinator context is for judgment.
- **Announce your cadence** so the human knows when to expect responses.

## 2. Why v1 (cron ticks) failed us — observed 2026-08-18

| v1 failure | Root cause | v2 answer |
|---|---|---|
| Loop silently died at session end; ticks vanished during permission-classifier outages | Every tick = a cron-fired `/vibej tick` *user prompt* whose skill preamble runs `` !`./scripts/dev-port` `` etc. — each needs a live classifier; cron store is in-memory | One live session; no per-beat Bash in the hot path; classifier outage degrades nothing |
| ~60 s minimum latency to user feedback; "I'm watching it shiver" landed while a buggy version was still hot-swapped | Cron granularity + cold re-entry | User messages land *in the live turn* and are triaged immediately; beats self-pace down to seconds when verifying |
| The full SKILL.md re-rendered into context every minute | Cron prompt = skill invocation | Skill loads once at `/vibej` start |
| Iteration counter drifted; state bumps via python each tick | State lived on disk, mutated by a fragile side-channel | State lives in-context; disk file is a small crash-recovery snapshot written on *change*, not per beat |
| Edit landed on disk but never went live across an interrupt | validate/save/swap/confirm were separable steps | One atomic edit macro (single `evaluate_script`) — validate → save → hot-swap → confirm-marker in one call that cannot be half-done |
| Track-boundary meter windows (gate < 0.9) burned whole ticks | Fixed 1-min slots | A beat that sees a dirty window re-arms a short wakeup (~20–30 s) and just waits for a clean one |
| Page reloads silently wiped `__vjValidate` / `__vjMeter` / cursor CSS | Tooling installed imperatively, no self-heal | Every beat starts with a one-call *ensure* that detects `typeof window.__vj` and reinstalls the whole runtime if missing |

## 3. v2 architecture

```
/vibej [args]                        ── loads skill ONCE, runs Setup, first Beat
        │
        ▼
   ┌─────────────────────────────────────────────────────────┐
   │  LIVE SESSION (the loop IS the session)                 │
   │                                                         │
   │  Beat(reason) ──► re-arm ScheduleWakeup(pace) ──► idle  │
   │     ▲                                            │      │
   │     ├── wakeup fires (heartbeat)  ◄──────────────┘      │
   │     ├── <task-notification> (Monitor event)             │
   │     └── user message (instant, in-context)              │
   └─────────────────────────────────────────────────────────┘
```

**Wake sources, in trust order:**

1. **User message** — arrives mid-turn or wakes the idle session; always triaged first
   (outranks everything, same table as v1).
2. **The turn itself** — the fast path (DECIDED 2026-08-19: iteration speed maxed). While there
   is active work — an edit to verify, a dirty gate to wait out, a user engaged — the session
   does NOT end the turn: it chains beats back-to-back, using browser-side waits
   (`evaluate_script` awaiting 10–30 s then returning fresh meter numbers) for observation
   windows. Cycle latency ≈ 2 s (validate+swap) + the shortest meaningful observation window
   (~15–30 s). No Bash in the hot path ⇒ no classifier dependency; user messages still land
   mid-turn within seconds.
3. **ScheduleWakeup heartbeat** — idle/fallback path ONLY. Hard floor is 60 s (clamped
   [60, 3600]), so sub-minute pacing via wakeups is impossible — that is WHY fast iteration
   lives in-turn. Arm 60 s when pausing briefly, 240–420 s on a healthy hold.
4. **Monitor events** *(bonus accelerator, phase 2)* — see §4.

**The Beat** keeps everything that worked in v1, in the same order: LOOK (screenshot, judge
visually) → meter probes (`summary`/`residR`, discard gate < 0.9 windows) → triage user words →
at most ONE focused move via the atomic edit macro → LOOK again if compositional → journal →
choose pace → re-arm wakeup. One-move discipline, the guardrails, cursor hygiene, and the
geometry/light/color channel hierarchy (2026-08-18 findings: geometry only *evolves* — monotonic
or event-stepped; audio lives in shading; color follows the slowest music) are unchanged and
restated in the skill draft.

## 4. The page as sensor (phase 2: `?vj=1` + `/__vj-signal`)

The journal already carries the todo "bake VJ tooling into the display page behind `?vj=1`".
v2 gives it a purpose beyond convenience — it makes the *browser* the watchdog:

- A `?vj=1` flag on the display URL loads the VJ runtime (validator, meter, cursor-hide) at page
  boot, so reloads can never strip the tooling.
- The runtime meters continuously and POSTs alert lines to a tiny dev-server endpoint
  (`/__vj-signal`, a ~20-line vite dev plugin writing `.claude/vj-signals.jsonl`): flicker > 0.7,
  clip > 0, lumMin < 0.08 sustained, gate transitions, and a `reloaded` beacon on boot.
- A **Monitor** watches that file. Claude gets woken *by the page itself* within seconds of a
  health breach or a reload — instead of discovering it a beat later.

Phase 1 (the skill draft) works **today with zero repo changes**: heartbeat-only, meter pulled on
each beat, reload detected by the `typeof` check. Phase 2 is an upgrade, not a dependency. Until
`/__vj-signal` exists, the only thing worth a Monitor is the target `.frag` file itself (catches
edits from another session/editor).

## 5. Lifecycle

- **start** — `/vibej [count|duration] [shader]`: setup (port, server, pages, page-runtime
  ensure, journal read, pre-show checklist), announce cadence to the user, run Beat #1, arm
  wakeup. Optionally arm Monitor (phase 2 / frag-file).
- **beat** — as §3. Every beat re-arms exactly one wakeup as its final act. A beat interrupted
  mid-flight loses nothing durable: the next wake re-runs LOOK-first, and the atomic edit macro
  means there is no "saved but not live" limbo to recover.
- **user message while idle** — wakes the session; treat as a beat with triage-first. After
  handling, re-arm the wakeup (the pending one may still fire — a duplicate wake is a no-op
  beat, not a bug).
- **pause** — `/vibej pause`: `ScheduleWakeup(stop: true)`, keep Monitor + state; `/vibej` again
  resumes from in-context state.
- **stop** — `/vibej stop`: stop wakeup + monitors (TaskList → TaskStop), final journal entry,
  delete the recovery snapshot, one-line wrap-up.
- **crash / compaction recovery** — the recovery snapshot (`.claude/vj-state.json`, now written
  only when shaderPath/mode/beat-count-milestones change) plus the journal's Status line are
  enough for a fresh `/vibej` to resume; it must *re-verify* live-shader identity
  (`window.cranes.shader` markers) rather than trusting any disk state, because the last edit's
  live-ness is exactly what an interrupt makes uncertain.

## 6. Migration from v1

- `SKILL.md` stays until the draft is approved; then `SKILL-v2-draft.md` → `SKILL.md` and the
  cron path becomes the documented **fallback mode** (`/vibej cron`) for harnesses without
  ScheduleWakeup/Monitor (e.g. the claude-in-chrome-only variant noted in v1's pitfalls).
- `vj-state.json` keeps its name/shape (minus per-tick bumping) so an in-progress v1 run can be
  adopted by v2 mid-show.
- `/vibej tick` remains accepted and simply runs one Beat — harmless if an old cron still fires.
- Phase 2 needs: `vite-plugins/vj-signal-plugin.js` (endpoint + jsonl write) and a `?vj=1`
  loader in `index.js` that imports `scripts/vj/aesthetic-meter.js` + validator + cursor CSS.

## 7. Open questions for redaphid

1. ~~Beat cadence defaults~~ **ANSWERED 2026-08-19: "as fast as possible."** Burst mode is the
   default — stay in-turn and chain beats; wakeups only for idle holds. Cost lever: screenshots
   are the context-expensive step, so verification cycles run on meter numbers and screenshot
   only on compositional changes / every ~4th cycle — keeps hours-long sessions viable.
2. Phase 2 endpoint: OK to add the `/__vj-signal` dev plugin + `?vj=1` loader to the repo, or
   keep the page untouched and stay heartbeat-only?
3. Should the loop keep a **hard beat budget** (v1's `180 iterations`) at all, or run until
   `/vibej stop` / session end? (v2 draft keeps an optional duration arg, default: until stopped.)
