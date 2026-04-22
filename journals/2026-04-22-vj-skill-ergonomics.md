# 2026-04-22 — VJ Skill Ergonomics Session

## Setup
- Branch: `vj`
- Shader: `redaphid/wip/the-coat-fur-coat/the-coat-3`
- Audio: tab capture, Spotify
- Music rotation: Layton Giordani, John Summit, SIDEPIECE, Westend, Of The Trees, ZISO
- Cadence: `/vj` at 1-minute cron (target 180 iterations)
- Goal: debug and improve the `/vj` skill while actively running it

## What happened

Started by asking Claude to clear stale vj-ish cron jobs (there were none, but the reflex reveals something). Then ran `/vj` — which immediately crashed on a context-loading bash error (`ls .claude/scheduled_tasks.json` returning non-zero). That became the entry point to a debug-while-jamming session.

Fixed the skill in layers. Meanwhile, every 60 seconds a cron tick fired, made one shader move, validated, bumped iteration. The user twisted knobs constantly, swapped tracks frequently, and occasionally dropped requests mid-flow ("map the knob I'm twisting to zoom", "let me zoom 3× as far out", "optimize the shader without losing too much").

Thirteen iterations landed. Every iteration touched a different audio feature channel (bass, treble, flux, entropy, centroid, pitch). The shader now has sub-ring, ember haze, starfield, RGB split, heart pulse, scan line, ghost-echo-on-bass, mids-breathing hue, pitch-driven heart color, centroid-driven palette lightness, flux-driven fur shimmer. And a pow→mul optimization pass.

## Direct requests the user made

1. **"Clear any cron job for claude that's trying to vj or alter shaders"** — defensive reflex when starting a fresh session. Implies: don't trust that a prior /vj run ended cleanly. → `/vj` on invoke should detect stale state (vj-state.json exists but no live cron matches) and offer a clean-slate path.

2. **"Debug the vj skill. First, understand what it's doing and open the browser tabs"** — wants Claude to *bootstrap*, not explain. → skill should be aggressively self-starting (open tabs, start dev server, schedule cron, run iter 1) without ceremonial check-ins.

3. **"Start the dev server in the background"** — minimal narration. → if `/vj` needs dev server, just start it silently.

4. **"That awk thing is going to match on all node processes. Instead, export a function…"** — cares about code quality even in helper scripts. → skill helpers should be code, not shell grepping. Any time the skill context shells out, consider whether a small library fn would be more robust. Resulted in `scripts/dev-port.js` (library + CLI detection).

5. **"./scripts/dev-port works"** — prefers terse, no-extension CLI names. → wrapper scripts should feel like installed binaries.

6. **"Just write a wrapper shell script"** — pragmatic tradeoffs over purity. When a clean solution doesn't work (esbuild choking on shebang when vite inlines the library), accept a workaround. → don't over-engineer; one subprocess spawn at dev-server startup is fine.

7. **"I don't think we use esbuild anymore. Update the docs if that's true"** — conscientious about docs. → skill should flag when it's reinforcing an obsolete convention (in this case, esbuild is still a transitive dep of vite, so no update needed, but the instinct was right).

8. **"Add a skill, /remap, that resets the midi mapping"** — emerged from real frustration during the jam. Shader edits churn through knob mappings; needed a quick reset. → live-session rituals (reset, save, fork, preset) want keyboard-speed invocations. The more VJ runs, the more accessory skills.

9. **"I just saw a full-page reload. We need to minimize this in jam mode"** — **reloads kill audio capture**, forcing re-share of tab audio. Breaks flow. Root cause was `src/worker-communication.js` not excluding `jam.html` from the service-worker reload path. → **the #1 flow killer is losing tab audio.** Skill should be paranoid about anything that reloads the page. Could watchdog the jam tab — if audio drops mid-session, flash a warning.

10. **"Map the knob I'm twisting to zoom"** — user expected Claude to *infer from behavior* which knob. Instead of naming a knob, they described the action. → the skill should observe knob deltas across ticks ("user is actively touching knob_X") and surface those as natural mapping candidates. Track `lastActiveKnob` in state.

11. **"Let me zoom 3× as far out"** — wants **range-relative** adjustments, not absolute values. User doesn't care the zoom is `mix(0.3, 2.5, knob_1)`; they want a lever that lets them go farther. → when the user asks for "more X", the skill should widen the range of existing levers rather than invent new ones.

12. **"Optimize the shader without losing too much"** — wants optimization as a *non-destructive sweep*. The "without losing too much" phrasing is important: accept subtle visual changes but not feature removal. → an `/optimize` command or `/vj optimize` subcommand doing micro-wins (pow→mul, duplicate samples, expensive-op flagging) could be its own thing.

13. **"Take detailed notes about the developer ergonomic requests I'm making during the session"** — explicitly reflective. They're treating this session as product research on the skill itself. → the user runs skills with meta-awareness. Build a feedback-capture step into long-running skills.

## Observed patterns (not stated but inferred)

- **User twists knobs constantly.** Every tick the values shifted. This is a *continuous* performance, not set-and-forget. Skill shouldn't assume knob state is static.
- **Track changes are frequent** (Spotify flipping every 1-2 minutes). Skill should react to track changes as *first-class events*, not passively consume.
- **The user doesn't want screenshots returned.** Removed in the skill-fix pass. They're watching live — Claude's job is to *write*, not *report*.
- **The one-line summary per tick works.** User isn't asking for more verbose output.
- **Free knobs get rediscovered for repurposing** (knob_2 was zoom, became free after I remapped knob_1→zoom). There's creative energy in giving unused knobs a new job.

## Friction ranked by how much it broke flow

1. **Page reloads killing audio** — highest. Kills the entire jam loop.
2. **Port guessing (6969 hardcoded)** — initial bootstrap broke.
3. **Validator false-positives reverting good edits** — would silently eat iterations.
4. **Iteration counter stateless across cron ticks** — skill wouldn't know when to stop.
5. **No way to find the cron job to stop it** — `/vj stop` had no handle.
6. **Context-probe shelling out to nonexistent files** — `/vj` itself erroring before running.

## Ideas worth prototyping

- **`/vj status`** — dump current iteration, cron job ID, tabs, last 5 edits.
- **Knob-activity detection** — track which knobs moved in last N ticks; expose as "active knobs" so "map what I'm twisting" can resolve automatically.
- **Track-change trigger** — when the Spotify widget text changes, mark the tick for a bigger move (palette shift, not just a parameter tweak). Track boundaries = musical phrases.
- **Non-destructive audit** — `/vj audit` scans the current shader for perf issues, unused VJ blocks, blowout risks. Reports without touching the file.
- **Undo/revert** — `/vj undo` keeps last N edits in a ring buffer in `vj-state.json` so you can roll back a bad move without `git checkout`.
- **Inline preset capture during /vj** — a shortcut for "save this moment" that snapshots shader + knobs + track name + iteration number.
- **Theme-driven sessions** — if the user sets a theme ("goth", "sunset") in state, the skill biases moves toward that palette rather than per-track.
- **Fail-soft on MCP disconnects** — auto-retry the read step once before bailing.
- **"Widen this lever"** pattern — recognized via phrases like "more", "farther", "harder"; skill finds the relevant `mix(a, b, knob)` and expands the range.

## What's working well

- The **1-minute cron + one-focused-move** cadence feels right. Long enough to notice changes, short enough to stay engaged.
- **Shader edits via `/__save-shader` + HMR** (once the service-worker reload was fixed) = zero interruption to the audio or visuals.
- The **state file (.claude/vj-state.json)** turned out to be the right place to hang iteration count, job ID, tab IDs. Would extend it for the ideas above.
- The **single source of truth for port** (`scripts/dev-port`) removed a whole category of "which host should I hit" bugs.

## Tooling built or changed this session

- `scripts/dev-port.js` — library with `branchToPort()`, `getPort()`, CLI detection via `import.meta.url` check.
- `scripts/dev-port` — shell wrapper (needed because esbuild chokes on shebangs when vite inlines the file).
- `vite.config.js` — uses the wrapper.
- `.claude/skills/vj/SKILL.md` — rewritten: no hardcoded port, stateful across ticks, `/vj stop` via stored job ID, validator checks `^ERROR` not exit code, no screenshots per tick.
- `.claude/skills/remap/SKILL.md` — new skill for clearing the MIDI mapping during a session.
- `.claude/vj-state.json` (gitignored) — iteration state.
- `src/worker-communication.js` — skip service-worker hard reload on `jam.html` (matches existing `edit.html` exclusion).
