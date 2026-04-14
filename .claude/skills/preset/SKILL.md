---
name: preset
description: Save the current knob state as a named preset. Usage: `/preset <name>`. Reads knob values from the browser and writes them to the shader's preset doc.
allowed-tools: Bash Read Write Edit Grep Glob Agent mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__javascript_tool
---

# Preset — Save Current Knob State

Capture the current knob values from the live browser session and save them as a named preset in the shader's docs folder.

## Context

Arguments (preset name):
!`echo "$ARGUMENTS"`

Active shader editor tab:
!`echo "Use tabs_context_mcp + javascript_tool to find the editor tab and read knob state"`

## Steps

### 1. Identify the shader

Figure out which shader is currently loaded. Check:
- The browser tab URL for `?shader=` param
- Or the most recently modified `.frag` in the worktree

The shader path determines where the preset doc lives:
`shaders/<shader-path>/docs/presets.md`

If the presets doc doesn't exist yet, create it with a header.

### 2. Read knob values from the browser

On the editor tab, run:
```javascript
JSON.stringify(
  Object.fromEntries(
    Object.entries(window.cranes.manualFeatures || {})
      .filter(([k]) => k.startsWith('knob_'))
      .filter(([_, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
  )
)
```

This gives us only the knob values the user has set.

### 3. Also read any relevant audio/visual state

Grab a quick snapshot:
```javascript
JSON.stringify({
  drop_hit: window.cranes.controllerFeatures?.energyZScore,
  bass: window.cranes.controllerFeatures?.bassNormalized,
  energy: window.cranes.controllerFeatures?.energyNormalized
})
```

This is just context for the preset notes, not saved as part of the preset.

### 4. Read the knob comment block from the .frag file

Grep the shader file for the knob index comments (lines starting with `// knob_N:`) to label what each knob does.

### 5. Write the preset

Append to the presets doc. Format:

```markdown
### <preset name>
_Saved: <date>_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.5 | base zoom |
| knob_3 | 0.8 | god ray intensity |
| ... | ... | ... |

**URL:**
```
?shader=<path>&knob_1=0.5&knob_3=0.8&...
```

**Notes:** <any context from the user about what this preset feels like>
```

Only include knobs that have non-zero values or that the user explicitly set. Skip knobs at their default (0) unless the user specifically set them to 0.

### 6. Safety — don't cross shader streams

**CRITICAL:** Each shader gets its own `docs/presets.md`. Before writing:
- Confirm the shader path matches what you expect
- If the user has switched shaders mid-session, start a new presets doc for the new shader
- When in doubt about which shader a preset belongs to, ask

If the user wants to apply a preset to a different shader variant, create a new `.frag` file (copy the current one) rather than overwriting.
