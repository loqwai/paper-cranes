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

### Write a preset

Append to `shaders/<shader>/docs/presets.md` (create it with a `# <shader> presets` header):

```markdown
### <name>
_Kept: <date time> | Music: <what was playing, if known>_

| Knob | Value | What it does |
|------|-------|--------------|
| knob_4 | 0.91 | ZOOM |

**Musical moment:** <drop / build / breakdown, and what the bass, mids and energy were doing>

**URL:** `?shader=<shader>&controller=<controller>&knob_4=0.91&…`
```

Only knobs that differ from 0 or that he set. Each shader has its own presets doc: never write a
preset into another shader's doc.

### Write a fork

1. **Next number.** Look at the numbered files in the shader's directory (`clit-set/1.frag`,
   `2.frag` → `3.frag`; `the-coat-3` → `the-coat-4`). Never overwrite a file.
2. **Copy the code** as it was at the moment: the `.claude/keeps/` copy when there is one, else
   the file. Update comments that name the old file.
3. **Freeze the controller** if the shader reads controller uniforms: copy `controllers/<name>.js`
   to `controllers/<name>-<N>.js`, so the fork does not change when the live controller does.
4. **Preset line**, after the `// @` metadata (and after `#version` when present), with every
   param it needs. The list page reads http(s) URLs in comments as presets:
   `// preset: https://visuals.beadfamous.com/?shader=<path>&controller=<snapshot>&wavelet=true&knob_4=0.91`
5. **Doc.** Add the fork to the shader's `<shader-name>.md` (one doc per shader in `wip/`): where it
   came from, when, what was playing, the knob table, the preset URL, the controller, and why it
   was kept.
6. Validate: `node scripts/validate-shader.js shaders/<path>.frag`.

### Finish

- Move each processed snapshot to `shaders/<shader>/docs/.snapshots/processed/`, and each
  `.claude/keeps/` copy to `.claude/keeps/processed/`.
- Return, for `/show end`'s story: one line per fork and preset made, with its preview link
  (`https://<branch>.paper-cranes-visuals.pages.dev/?shader=<path>`), and the board element id
  of its screenshot.
- Commit on the show branch (forks, presets, docs, frozen controllers), never on `main` directly.

## Fork the wall now: `/keep fork [shader]`

The same as a fork above for the shader on the wall this second: `get_state` gives the shader and
the knobs, `read_shader` the code (or the `-wip` file). Then hot-swap the wall to the new fork
with `set_shader` so further edits go on the copy, not the original.
