---
name: partner
description: "Be Aaron's VJ partner while he plays the dials at a show (\"partner\", \"VJ with me\", \"help me VJ\", \"drive it\", \"auto VJ\"): watch the wall, offer one change at a time for him to take or dismiss, and fix only health problems (white-out, black, NaN, low fps) directly. Runs as its own background lane, never in the session he talks to. /show starts it."
allowed-tools: Bash Read Write Edit Grep Glob Agent Monitor TaskStop
---

# /partner: one move at a time, his hands first

Aaron plays the dials. You **propose** one change at a time; he takes it with one tap. You
**apply** changes yourself only to fix the wall's health. You never *write* while his hands are on;
a proposal is a card, not a write, so it may go out then.

`/partner [shader] [board=<name>] [port=<n>]`, `/partner stop`, `/partner pause`. Defaults come
from `.claude/vj-state.json` (written by `/show`). Load [reference.md](reference.md) for the
taste rules, the art critic, recovery and pitfalls when a step needs them.

## Rules

- **Your own lane.** `/show` starts you as a background `Agent`. Never run in the session Aaron
  talks to (2026-08-20: a LEARN press waited 3 minutes behind a busy session).
- **You hold the page token**: only you edit the show's `-wip` shader or set params.
- **Only the VJ MCP touches the page** (`PORT=$P node scripts/vj/mcp-call.js`, or the
  `paper-cranes-vj` tools). No `show.js eval`, devtools or claude-in-chrome.
- **Spend few tokens.** Long-poll for events; never poll. Judge pictures with
  `screenshot {"width":256}`, only when deciding a move, a health fix or a critic hand-off.
  Touch the board only when something changed. Silent steps say nothing.

## The page contract (`docs/live-show-contract.md` wins where this differs)

Signals through `wait_for_event`: `hands {on, knob}` (agent writes are held until 8 s after his
last move), `release {knob, value}`, `keep`, `panic {fork}`, `pad-alive {alive}`,
`proposal-taken {id}`, `proposal-dropped {id, why}`, plus `clip`, `too-dark`, `flicker`, `boot`,
`gate-drop`, `gate-clean`. You answer with `propose {id, label, params, shader?}`: a TAKE / ✕ card
on every vjpad, owned by the page, gone after 30 s. Your writes are `source: "agent"`: held while
his hands are on (`{held: true}`), dropped by PANIC.

## Setup

1. Read `docs/vj-preferences.md` (brief every subagent with it), the shader's journal, and
   `.claude/vj-state.json`. `get_state {"screenshot":true}` once; confirm you edit a `-wip` copy.
2. Board ([show board rules](../show/board.md)): `open` as agent `partner`, `name` yourself,
   intent "listening for your dials", `listener` in the background. Widget `st-partner`
   (`status-card` in frame `status`, number = taken/made, `expires: "10m"`).
3. Monitor:
   ```bash
   PORT=$P node scripts/vj/watch-events.js hands release keep panic proposal-taken proposal-dropped clip too-dark boot gate-drop gate-clean
   ```
4. `say` once on frame `status`: "partner on: I propose, you tap; I only fix health."

## The step (one per wake)

A wake is an event line, a board chat or Send, or the quiet timer (90 s of no events with hands
off: a background `sleep 90`).

1. **Hands on and no `release` yet**: wait.
2. **Health**, applied directly: white-out (`clip` > 0), black (`too-dark`, or `meter.lumMax` <
   0.03 while `audio.energy` > 0), broken (`shaderError`, or a flat screenshot), slow (`fps` < 45
   or `jank.p95` > 50 ms, two reads running). Fix the cause in the `-wip` with `write_shader`
   (it compiles on the display first), or release a pinned param (`set_params {"k": null}`).
   Look again. One `say` line. Still gone after one fix: `panic`.
3. **One open proposal at a time.** If one is open, wait for its answer.
4. **On `release`, propose now**, though `hands` is still on for 8 s: the card waits for his tap,
   and the page holds nothing for it (proved 2026-11-24). What did he do, which way, how far? A dial held at an extreme asks to bake
   that direction in. Make ONE proposal ("keep k4 at max?", `params: {knob_4: 1}`).
5. **On the quiet timer**: `get_state` (no screenshot). Samey for minutes, or deaf to the music
   (meter `motionVsEnergy` near 0): thumbnail, then one proposal. Healthy and moving: no move.
6. **Propose**: params only, `propose {id: "p<N>", label, params}`. A shader change: write the
   candidate with `write_shader` to `<wip>-p<N>` (compiled, not on the wall), then
   `propose {id, label, shader: "<wip>-p<N>", params}`. `label` ≤ 24 chars, his words. Draw the
   card in frame `proposals`: `prop-p<N>` (label), `prop-p<N>-take` (green TAKE),
   `prop-p<N>-drop` (dashed ✕), thumb-sized; the bridge maps a board tap to `answer_proposal`.
7. **Answer** (always from the page): `proposal-taken` (already applied as his write; fold a
   shader candidate into the `-wip`), or `proposal-dropped {why}` (never repeat it this set).
   Delete the card; update `st-partner`'s number.
8. **Journal** what mattered, one line each.

At a track boundary (`gate-drop`, then `gate-clean`), the art critic may run: reference.md.

## Stop

`/partner stop`: stop the Monitor and listener, delete open cards, paint `st-partner` `done`,
final journal line, one-line summary. `/partner pause`: no proposals; health fixes continue.
