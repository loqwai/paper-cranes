# Live Session Architecture — three tiers, and why

How work is divided during a live set so the user never waits on the machine. Written
2026-08-20 after a VJ set where a button press waited three minutes for an answer.

The rule in one line, from [CLAUDE.md](../CLAUDE.md#live-sessions-the-parent-stays-responsive):
**the parent session dispatches, forks do the work, and anything that must be instant lives in
the page.**

## The three tiers

| Tier | Latency | Runs | Belongs here |
|---|---|---|---|
| **Page-side** (`?vj=1` runtime) | ~0.2 s | In the browser, no model | Anything the user waits on: LEARN correlation + verdict, health watchdog, meter, jank probe, cursor hygiene |
| **Parent session** | seconds | The main Claude Code loop | Triage user words, read the meter, make the ONE decision, spawn the fork, relay the result |
| **Fork subagents** | minutes | `Agent` tool, `subagent_type: "fork"` | Everything else: edit+verify cycles, analysis, journals, docs, research, batch review |

The tiers are ordered by *who is waiting*. If the user is waiting, it must not involve a model at
all. If a decision needs judgement, the parent makes it and immediately hands off. If it needs
work, it belongs to a fork.

### Page-side is the one that actually fixed the problem

The LEARN button was the forcing case. Originally: press → page freezes a gesture window → POSTs a
signal → Monitor fires → parent wakes *between turns* → parent runs the correlation → parent pushes
a verdict to the phone. Measured worst case: **~3 minutes**, all of it queueing behind a busy
parent.

Now the display page itself watches for the confirm stamp, runs `window.__vjLearn` in-browser, and
pushes the verdict straight to the pad over the existing WebSocket. Measured: **~180 ms end-to-end (56 ms of actual work)**
(press 22:51:38.441 → answer 22:51:38.618). The parent's only remaining LEARN job is the judgement
call — *is this finding worth wiring into the shader?* — which is exactly the thing a model should
be doing and nothing else.

Generalisation: **delegate work that needs a model; put work that needs to be instant in the page.**
Adding a model to a feedback loop costs seconds at best and minutes at worst.

## Lineage: Relay's Communicator/Coordinator split

This is not a new idea in this codebase's history — it is the pattern from the `relay-queue` work
in `D:\projects` (prior sessions 12665, 12788, 5706, 9816, 7679), imported and adapted.

From the `coordinator-role` memory, after the user corrected it twice in one night:

> The main session is the **Communicator/router**. It must stay free and responsive and never do
> work inline. It translates requests into subagent briefs, relays results, and **does nothing
> else**.

And the clause that makes it stick:

> **"However trivial they seem to you" is the operative clause.** Every violation felt individually
> too small to delegate — a `git merge` of an already-tested fix, a `docker stop` of a container
> that was already broken, a `curl` to verify an agent's claim. Each was defensible alone; together
> they are the whole failure. The judgement *"this one is small enough"* is itself the thing to
> stop making.

One distinction worth preserving from that write-up: a coordinator is **a different agent, not the
main session wearing a hat** — "that distinction is the whole point and the user asks about it
directly." A fork with inherited context is still a separate context that can block without
blocking the user.

## Dual-layer responsiveness: monitor + heartbeat

Relay kept two independent wake sources — a persistent monitor that fires on new messages or stop
requests, plus a self-paced heartbeat on a shorter interval than the default watchdog. Both, not
either.

Here that maps to:

- **`Monitor`** on `.claude/vj-signals.jsonl` — the accelerator. Fires within seconds of a page
  signal (`clip`, `too-dark`, `shiver`, `boot`, `confirm-learn`).
- **`ScheduleWakeup`** — the guarantee. The floor is 60 s; a healthy hold is 240–420 s. It fires
  even when every monitor is dead.

**Never depend on an event wake you have not watched fire.** The heartbeat is the mechanism; the
monitor is a bonus.

Two mechanical traps, both hit for real:

- **`tail -F`, never `-f`.** The dev server *recreates* `.claude/vj-signals.jsonl` at boot, which
  silently killed both monitors mid-set; `-f` follows a deleted inode forever.
- **Don't let a filter hide the failure case.** The flicker alert fired constantly because the
  user's own fader sweeps move the whole frame. Filtering it at the monitor is correct; filtering
  it so aggressively that a genuine strobe is also swallowed is not. Keep `clip` unfiltered.

## Failure modes this architecture exists to prevent

### Idle and broken must never look the same

The sharpest rule from the prior art, and this session reproduced it exactly one layer up.

At ~22:44 the user began pressing LEARN and nothing happened for four minutes. The phone's
WebSocket had dropped. But:

- HTTP `pulse` telemetry kept flowing (it is `fetch`, not WebSocket), so the meter looked healthy;
- the display's own socket was `OPEN`, so a socket check on the display passed;
- the LEARN monitor was alive — it simply had nothing to report.

**A monitor that only fires when messages arrive cannot distinguish "the user is quiet" from "the
controller is offline."** Both are silence. The tell was elsewhere: `vjConfirm` frozen at an old
value, and the dev server log reading `[WS] Client disconnected (1 remaining)`.

Fix: a **pad-liveness check** in the beat — if the pad has been silent for several minutes while
knobs were recently moving, say so out loud instead of waiting. Any health signal that can only
report *presence* needs a paired check that reports *absence*.

### Editing a page-fetched file mid-show reloads the wall

Any edit to a file the browser fetches at runtime — `src/**`, `scripts/vj/*.js`, `vjpad.js`,
`vjpad.html`, `index.js` — triggers HMR and can force a full reload. A reload resets `evoPhase`,
the energy-weighted set clock, which drives the complexity ratchet. On 2026-08-20 an edit to
`scripts/vj/learn-correlate.js` cost a set clock of 16.6 — **99.6% complexity down to 5%**, i.e.
the accrued "flow state" the user had just praised, gone in one file save.

Rules:

- Shader `.frag` edits are safe — they hot-swap via the atomic edit macro.
- Everything else waits for **between sets**. Stage it as a patch file (see
  [vj-auto-learn-patch.md](vj-auto-learn-patch.md)) and apply it when nothing is on the wall.
- To inject behaviour *now* without a reload, run it through `javascript_tool` into the live page.
  That is how the auto-LEARN poller was installed mid-set.
- Recovery if it happens anyway: `node scripts/vj/remote-send.js '{"evoPhase":<value>}'` pins the
  clock back (the pad-pin path overrides controller outputs; `window.cranes.manualFeatures` does
  **not**), and `null` releases it. But note a pin *freezes* the clock — it restores the look while
  killing the evolution, which is usually the wrong trade.

### Two agents, one file

Forks are cheap, so the temptation is to run several. Give each one **distinct files**. Only one
fork at a time may drive the display page or the target `.frag`; the parent holds that token. The
Relay equivalent — an unfiltered poll claiming another coordinator's task within 90 seconds of the
split — is the same bug wearing different clothes: *any worker must skip what it does not own.*
