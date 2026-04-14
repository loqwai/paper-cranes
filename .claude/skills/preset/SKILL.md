---
name: preset
description: Save the current knob state as a named preset. Usage: `/preset <name>` or just `/preset` to auto-name from context (music playing, knob character, vibe). Reads knob values from the browser and writes them to the shader's preset doc.
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

### 1. Determine the preset name

If `$ARGUMENTS` is non-empty, use it as the preset name.

If `$ARGUMENTS` is empty, **auto-name from context**. After reading the knob state and browser tabs (steps 2-3), generate a short evocative name based on:
- **What's playing** — the music tab title (artist, track, set name)
- **Knob character** — which knobs are cranked vs subtle (e.g. "god rays maxed" → something fiery)
- **Overall vibe** — is it chill, heavy, trippy, minimal?
- Keep names lowercase, hyphenated, 1-3 words. Think DJ set names, not variable names.
- Examples: `lost-lands`, `chill-glow`, `solar-flare`, `midnight-minimal`, `wooli-drop`

### 2. Identify the shader

Figure out which shader is currently loaded. Check:
- The browser tab URL for `?shader=` param
- Or the most recently modified `.frag` in the worktree

The shader path determines where the preset doc lives:
`shaders/<shader-path>/docs/presets.md`

If the presets doc doesn't exist yet, create it with a header.

### 3. Read knob values from the browser

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

### 4. Read the full audio state (MANDATORY)

Presets aren't just knob snapshots — the same knobs look completely different during a drop vs a quiet passage. **Always** capture the audio character.

```javascript
(() => {
  const f = window.cranes.flattenFeatures();
  const features = ['bass','energy','mids','treble','spectralCentroid','spectralFlux','spectralEntropy','spectralRoughness','spectralKurtosis'];
  const result = {};
  for (const name of features) {
    result[name] = {
      normalized: Math.round((f[name+'Normalized']||0)*1000)/1000,
      zScore: Math.round((f[name+'ZScore']||0)*1000)/1000,
      slope: Math.round((f[name+'Slope']||0)*10000)/10000,
      rSquared: Math.round((f[name+'RSquared']||0)*1000)/1000
    };
  }
  return JSON.stringify(result);
})()
```

Then **interpret what's happening musically**. Write a short "what's going on" analysis:
- Is this a drop, a buildup, a breakdown, a quiet passage?
- What's the bass doing? (hitting hard, absent, building?)
- Are mids scooped? (classic pre-drop sign)
- Is energy trending up (building) or down (decaying)?
- Is spectral entropy high (chaotic/complex) or low (clean/simple)?
- Is roughness high (gritty/dissonant) or low (smooth)?
- Use slope + rSquared to detect trends: positive slope + high r2 = confident build

This interpretation goes in the preset as both raw numbers AND your read on the musical moment.

### 5. Read the knob comment block from the .frag file

Grep the shader file for the knob index comments (lines starting with `// knob_N:`) to label what each knob does.

### 6. Write the preset

Append to the presets doc. Format:

```markdown
### <preset name>
_Saved: <date> | Music: <what's playing from the music tab title>_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.5 | base zoom |
| knob_3 | 0.8 | god ray intensity |
| ... | ... | ... |

**Audio character at save time:**
- bassNormalized: X (description), bassZScore: X
- energyNormalized: X, energyZScore: X (trending up/down/flat)
- midsNormalized: X (scooped/present/heavy)
- trebleNormalized: X, spectralCentroidNormalized: X (bright/dark)
- spectralEntropyNormalized: X (chaotic/clean)
- spectralRoughnessNormalized: X (gritty/smooth)
- spectralFluxNormalized: X (changing fast/steady)

**Musical moment:** <Your interpretation — is this a drop? A buildup? A breakdown?
What's the bass doing, are the mids scooped, is energy building or decaying?
What does this preset look like BECAUSE of this audio state?>

**URL:**
```
?shader=<path>&knob_1=0.5&knob_3=0.8&...
```

**Notes:** <any additional context from the user about what this preset feels like>
```

Only include knobs that have non-zero values or that the user explicitly set. Skip knobs at their default (0) unless the user specifically set them to 0.

### 7. Safety — don't cross shader streams

**CRITICAL:** Each shader gets its own `docs/presets.md`. Before writing:
- Confirm the shader path matches what you expect
- If the user has switched shaders mid-session, start a new presets doc for the new shader
- When in doubt about which shader a preset belongs to, ask

If the user wants to apply a preset to a different shader variant, create a new `.frag` file (copy the current one) rather than overwriting.
