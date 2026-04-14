---
name: preset
description: "Save the current knob state as a named preset. Two modes: (1) `/preset <name>` — live capture from browser. (2) `/preset process` — batch-process snapshots from jam page queue. Just `/preset` auto-names from context."
allowed-tools: Bash Read Write Edit Grep Glob Agent mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__javascript_tool
---

# Preset — Save Current Knob State

Capture the current knob values from the live browser session and save them as a named preset in the shader's docs folder. Or batch-process snapshots from the jam page queue.

## Context

Arguments (preset name or "process"):
!`echo "$ARGUMENTS"`

Active shader editor tab:
!`echo "Use tabs_context_mcp + javascript_tool to find the editor tab and read knob state"`

## Mode Selection

If `$ARGUMENTS` is `process` or `queue`, go to **Batch Mode** below.
Otherwise, go to **Live Mode** (the original flow).

---

## Batch Mode — Process Jam Page Snapshot Queue

The jam page (`jam.html`) writes raw snapshot JSON files to `shaders/<shader>/docs/.snapshots/` when the user hits spacebar. Each snapshot contains the full knob state AND structured audio features. Your job: read each snapshot, add musical interpretation and naming, write to `presets.md`, then archive.

### Batch Steps

#### B1. Find unprocessed snapshots

```bash
find shaders/ -path '*/docs/.snapshots/*.json' -not -path '*/docs/.snapshots/processed/*' | sort
```

If none, tell the user there's nothing in the queue.

#### B2. For each snapshot file

Read the JSON. It contains:
- `shader` — the shader path
- `knobs` — `{ knob_1: 0.5, knob_3: 1.0, ... }` (only knobs the user set)
- `audio` — structured audio features: `{ bass: { normalized, zScore, slope, rSquared }, energy: { ... }, ... }`
- `timestamp` — when it was captured
- `name` — user-provided name (often null)
- `musicTab` — browser tab title at capture time (the music source)
- `userNote` — user-provided note (often null)

#### B3. Generate preset name

If the snapshot has a `name`, use it. Otherwise auto-name from context:
- Music tab title, audio character (drop vs buildup vs chill), knob extremes
- Same naming style as live mode: lowercase, hyphenated, 1-3 words

#### B4. Read the knob comment block from the .frag file

Grep the shader's `.frag` file for knob comments (`// knob_N:`) to label what each knob does.

#### B5. Interpret the audio state

The snapshot already has structured audio data. Write your musical interpretation:
- Is this a drop, buildup, breakdown, quiet passage?
- What's the bass/energy/mids story?
- Use slope + rSquared for trend detection
- Same analysis you'd do in live mode, just from the saved numbers

#### B6. Write preset to presets.md

Same format as live mode. Append to `shaders/<shader-path>/docs/presets.md`.

#### B7. Archive the processed snapshot

```bash
mkdir -p shaders/<shader>/docs/.snapshots/processed
mv <snapshot-file> shaders/<shader>/docs/.snapshots/processed/
```

#### B8. Repeat for all snapshots

Process each one, then report a summary of what was processed.

---

## Live Mode — Original Flow

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
