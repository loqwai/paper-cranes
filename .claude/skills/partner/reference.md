# /partner reference

Load the section you need. The design and its history: `docs/live-session-architecture.md`,
`docs/vibej-design-v2.md` (the vibej2 design this skill grew from), and the board
https://draw.hypnodroid.com/b/live-show-skills (frames 5-9).

## Taste

- **Look before and after.** A picture is the only ground truth.
- **Diagnose before you add.** Usually the fix is a subtraction.
- **The channel hierarchy (2026-08-18):** geometry only evolves (monotonic accumulators, eased
  one-way steps on drops; no sines and no audio on fold-geometry params); light and shading take
  the audio; colour follows only the slowest music.
- **One focused move**, visible from across the room. A repeated complaint means the last fix
  failed: one decisive move 3-5x stronger, not another partial patch (the 2026-08-18 shiver
  survived four partial fixes).
- **His fader sweeps are not flicker.** Flicker during `hands.on` is his; the page mutes that
  alert at the source.
- No transients in phases, no screen-space overlays, no clipping, no washout. Never re-add a
  motif his journal vetoed.
- His words, quoted in `docs/vj-preferences.md`, outrank every rule here. Append new design
  feedback he gives during a set to that file, verbatim, dated.

## The art critic: between tracks only

At a track boundary (`gate-drop`, then the next `gate-clean`), start ONE background `art-critic`
agent (`.claude/agents/art-critic.md`: read-only; it calls the VJ MCP's `get_state` and
`screenshot` itself) with the brief, the meter and `docs/vj-preferences.md`. Where the MCP is not
registered as `paper-cranes-vj`, pass it screenshot paths. Its top fix becomes at most one
proposal through the same queue: never a direct edit, never in front of his hands. His words and
yours outrank it.

## Answering him

Board chat, and Sends that are not controls, wake your listener. Answer in one short `say` line
on that frame (it may be read aloud). His words are an instruction: make the one move they ask
for, as a proposal, or directly when he says "do it".

## Recovery

After a crash or a compaction: read `.claude/vj-state.json` and the journal; `get_state` shows
what is live (the shader hash tells you which edits made it); discard the first meter window;
resume.

## Pitfalls

- **Editing any file the page fetches** (`src/**`, `scripts/vj/*.js`) can reload the display and
  wipe an accrued flow state (2026-08-20: complexity fell from 99.6% to 5%). `write_shader`
  hot-swaps without a reload; everything else waits until after the set.
- **A `<task-notification>` is not Aaron.** It never licenses a bigger move than the evidence.
- **GLSL reserved words** (`input`, `output`, `filter`, `sample`) break the compile; read
  `write_shader`'s error.
- **A mic is 10-30x quieter than a line feed.** A gate that never opens while music plays is an
  input level, not a track boundary.
