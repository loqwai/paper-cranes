---
name: keep
description: "Save a moment from the visuals: \"keep this\", \"save this\", \"that was good\", \"fork it\", \"make a preset\", \"process the keeps\". During a set, KEEP in the page records the moment; after it, `/keep process` turns kept moments into numbered shader forks and named presets, with docs."
allowed-tools: Bash Read Write Edit Grep Glob Agent
---

# /keep: press now, write it up later

A good moment at a show lasts seconds. Saving it must cost Aaron one press and no conversation,
so the press lives in the page, and the writing happens after the set. This skill replaces
`/fork` and `/preset` (2026-11-24, Aaron: "Yes to all").

| Mode | What |
|---|---|
| `/keep` (or "keep this" in chat) | press KEEP on the display now |
| `/keep process` | turn every kept moment into a fork or a preset, with docs |
| `/keep fork [shader]` | fork what is on the wall right now as the next numbered file |

## Press: `/keep`

Aaron's own KEEP is the fastest: the vjpad's KEEP button, its MIDI note (`?midi_keep=`), `k` on
the jam page, or KEEP on the show board. When he asks you instead, press it through the VJ MCP:

```bash
PORT=$(./scripts/dev-port) node scripts/vj/mcp-call.js keep '{}'
```

The page records `{shader, params, t}` as a `keep` signal and saves a snapshot to the shader's
queue, `shaders/<shader>/docs/.snapshots/<time>.json` (`{timestamp, shader, knobs, audio, name,
userNote}`). The jam page's spacebar saves a snapshot the same way. `/show` puts each KEEP's
screenshot on the show board (frame `kept`), and copies a `-wip` shader as it was at that second
to `.claude/keeps/<time>-<name>.frag`, since the `-wip` file keeps changing.

Pages without the `keep` tool: `get_state {"screenshot": true}` and append
`{t, shader, params, shot}` to `.claude/keeps.jsonl`; process reads that too.

## Process: `/keep process`

Run after the set (`/show end` runs it in a background agent). Only the VJ MCP and files: no
browser.

1. **Gather** every unprocessed moment:
   ```bash
   find shaders/ -path '*/docs/.snapshots/*.json' -not -path '*/processed/*' | sort
   ls .claude/keeps/ 2>/dev/null; cat .claude/keeps.jsonl 2>/dev/null
   grep '"type":"keep"' .claude/vj-signals.jsonl 2>/dev/null
   ```
   Match them by time (within a few seconds) so each moment has its knobs, its audio, its code
   copy if any, and its screenshot from the board.
2. **Decide each one: fork or preset.**
   - **Preset** when the shader on the wall was a committed file, unchanged: the moment is its
     knobs.
   - **Fork** when the shader was a `-wip` copy or a `/partner` candidate (`-p<N>`), or when
     Aaron said "fork it": the moment is its code and its knobs.
   - Near-duplicates (same shader, knobs within 0.05, within a minute): keep the later one.
3. **Name it** in 1-3 lowercase hyphenated words, like a DJ set name, from the music and the
   look: `wooli-drop`, `chill-glow`, `deep-lace`. A name in the snapshot wins.
4. **Read the musical moment** from its audio: drop, build, breakdown, quiet. Use `zScore` for
   "unusual", `slope` with `rSquared` for a confident build or fall, scooped mids before a
   drop, entropy for chaos, roughness for grit. The same knobs look different in a drop and a
   breakdown, so this goes in the doc.
5. **Label the knobs** from the shader's own names: the `// K4 ZOOM` comments (`read_shader`
   returns them) or `// @knob:` lines.

Then write each one as [process.md](process.md) says (a preset into `presets.md`; a fork as the
next numbered file with its controller frozen, a preset line and a doc), archive the processed
snapshots, and return one line per fork and preset with its preview link.

## Fork the wall now: `/keep fork [shader]`

A fork ([process.md](process.md)) of the shader on the wall this second: `get_state` gives the shader and
the knobs, `read_shader` the code (or the `-wip` file). Then hot-swap the wall to the new fork
with `set_shader` so further edits go on the copy, not the original.
