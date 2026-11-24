# /keep process: writing forks and presets

Loaded by `/keep process` once it has decided fork or preset for each moment.

## Write a preset

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

## Write a fork

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

## Finish

- Move each processed snapshot to `shaders/<shader>/docs/.snapshots/processed/`, and each
  `.claude/keeps/` copy to `.claude/keeps/processed/`.
- Return, for `/show end`'s story: one line per fork and preset made, with its preview link
  (`https://<branch>.paper-cranes-visuals.pages.dev/?shader=<path>`), and the board element id
  of its screenshot.
- Commit on the show branch (forks, presets, docs, frozen controllers), never on `main` directly.
