---
name: fork
description: "Save the current shader + knob state as a new numbered iteration. Usage: `/fork` (auto-detects shader) or `/fork <shader-path>`"
allowed-tools: Bash Read Write Edit Grep Glob Agent mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__javascript_tool
---

# Fork — Save Current State as New Shader Iteration

Capture the current shader code + knob values from the browser and create a new numbered `.frag` file with the knob values baked into comments and a companion `.md` doc.

## Context

Arguments (optional shader path):
!`echo "$ARGUMENTS"`

Browser tabs:
!`echo "Use tabs_context_mcp + javascript_tool to read current state"`

## Steps

### 1. Find the current shader

If `$ARGUMENTS` specifies a path, use it. Otherwise:
1. Check the browser — read `window.location.search` for `?shader=`
2. Fall back to most recently modified `.frag` in the worktree

### 2. Read the current state from the browser

On the jam/editor tab, run:
```javascript
JSON.stringify({
  shader: new URLSearchParams(window.location.search).get('shader'),
  controller: new URLSearchParams(window.location.search).get('controller'),
  knobs: Object.fromEntries(
    Object.entries(window.cranes.manualFeatures || {})
      .filter(([k]) => /^knob_\d+$/.test(k))
      .filter(([_, v]) => v !== undefined && v !== null)
      .sort(([a],[b]) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
  )
})
```

### 3. Determine the new filename

Look at existing numbered files in the shader directory:
```
shaders/<path>/dubstep-daddy-2.frag
shaders/<path>/dubstep-daddy-3.frag
→ next: dubstep-daddy-4.frag
```

If no numbered files exist, use `2.frag` as the first fork.

### 4. Copy the shader

Copy the current `.frag` to the new filename. Update any internal comments that reference the old name.

### 5. Write the companion doc

Create `<new-name>.md` with:
- Origin: which shader it was forked from, when, what music was playing
- Baked knob values table (knob, value, what it controls)
- Preset URL with all knob params
- Controller info if one was active
- Any notes about why this fork was created

### 6. Hot-swap to the new shader

Update the browser to use the new shader without reloading:
```javascript
// Fetch new shader and swap
const r = await fetch('/shaders/<path>/<new>.frag?t=' + Date.now())
window.cranes.shader = await r.text()
// Update URL
const url = new URL(window.location)
url.searchParams.set('shader', '<new-shader-path>')
history.replaceState({}, '', url)
```

### 7. Report

Tell the user:
> Forked `old-name` → `new-name` with knob values baked in. [list key knob settings]

### Safety

- Never overwrite an existing file — always create new numbered iterations
- Confirm the shader directory exists before writing
- The fork preserves all code — it's a copy, not a diff
