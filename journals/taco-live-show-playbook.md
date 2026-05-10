# taco live show playbook

Read THIS at the start of every `/vibej tick`. The set has phases. Pick visuals that match the phase the music is in, not the iteration number.

## Phase detection (read audio first)

```
ARRIVAL    energy < 0.4, bass < 0.3                  → people walking in, stretching
WARMING    energy 0.4-0.6, bass building (slope+)    → first track, vibe established
PEAK       energy > 0.7, bassZ > 0.5, drop_glow > 0.4 → drops, the moment they came for
PLATEAU    energy 0.6-0.8, sustained, no drops yet   → in the groove
COMEDOWN   energy slope-, bass < 0.4, calm           → cool-off, ambient
```

## Shader-by-phase (live VJ rotation)

Don't lock to one shader. Cycle within a phase to keep eyes engaged.

### ARRIVAL (cool-down vibe)
- `plasma` k5=0 (ember rainbow outline) — peaceful, hint of color
- `seamless` k5=0 (ember mode) — drifting hue
- `clean-plasma` (locked palette but ambient is fine here)
- knob_7 = 0 (wide), knob_5 = 0 (slow auto-cycle)

### WARMING (set is starting)
- `region-mask` — lettuce + shell readability matters now
- `tortilla-cosmic` — the brand-perfect look
- `cubic-ease` — smooth beat-ease, not too punchy yet
- knob_5 = 0.0-0.5 (cosmic→forest-aqua), seed3 ±0.3 for per-set unique tilt

### PEAK (drops, energy spikes)
- `direct-kick` — DIRECT_KICK in-shader chain, every kick is visible
- `live-iter` — extreme beat-zoom for the headbanger drops
- `confident-kick` — R²-weighted, the steady-confident-build feel
- `rainbow-plume` (heavy-knob) — for the most chaotic moments, all knobs high
- knob_5 = 0.66 (rose-cyan, max contrast), seed2 = high (warm bias)

### PLATEAU (sustained energy, no drops)
- `outline-tunnel` — the cyan double-rim tunnel; doesn't pulse hard, looks great long-form
- `radiation` — outline radiation waves, slow concentric breathing
- `tortilla-cosmic` knob_5=0.5 — emerald mode, restful

### COMEDOWN (energy fading)
- `seamless` k5=0.75 (arctic mode, desaturated blue)
- `julia-warp` — fractal feedback tendrils, contemplative
- `plasma` k5=1.0 (prism mode, multi-color but slow)
- knob_7 = 0 wide, knob_4 (outline glow) = 0.7 for soft halo

## Knob-zero rules (NEVER override during set unless flagged)
- **knob_7 = 0 ALWAYS** — anything else cuts the taco off the edges. The user is shooting for filibertos branding; the logo MUST be readable.
- **knob_5** is your color picker. Use it. Sweep it slowly during long passages.
- **knob_2** (color spin) — bump this on track changes for a fresh palette without changing shader.

## Per-tick decision tree

```
1. Read flattenFeatures.
2. Classify phase (above).
3. Are we in the same phase as 3 ticks ago?
   YES → small move (knob nudge ±0.1, or shader-swap WITHIN phase set)
   NO  → larger move: switch to the new phase's shader, or sweep knob_5
4. Track-change detected (Spotify title changed)? → reset knob_2 by ±0.3
5. After 5 minutes in one shader → MUST swap to a different shader
6. Last action gave knob_7 > 0? Reset to 0 immediately (taco was clipping)
7. Fork (`/fork`) ONLY when:
   - User says "this is great"
   - Audio fingerprint × shader looks unprecedented
   - Don't auto-fork during this run; the user has the only fork authority
```

## Forbidden during this set
- knob_7 > 0 (taco clipping — see iter 57e cutoff sweep)
- adding new shaders mid-show (use existing 19)
- heavy plasma_col rewrites (locked from iter 57b unlock)
- magenta hue drift (locked away from 3.0-3.5 rad in all shaders)

## Cool-moments to fork

If audio + shader produces ONE of these, snap a fork:
- region-mask + bass drop = brick-orange shell + rainbow lettuce sun + cyan tunnel
- rainbow-plume + treble peak = vivid blue glow + green lettuce + lava streaks
- plasma k5=0.5 (emerald) + medium energy = green outline gradient breathing
- outline-tunnel + bass kick = double-cyan tunnel rim contracting on every kick

## Demo-ready URLs (for emergencies / flagship moments)

If we need to switch instantly to a "guaranteed to look good" build:
```
?shader=redaphid/taco/demo&image=images/taco.png&controller=taco-kandi&audio=tab&knob_7=0&fft_size=2048&smoothing=0.3
```

## Audio params baked into NFC URLs (don't re-add)
- `fft_size=2048` — phone-latency (~85ms total round-trip)
- `smoothing=0.3` — fast-response filter
- `knob_7=0` — taco fits frame

## Files to consult mid-show
- `journals/taco-kandi-{6,7}-cool-moments.md` — what worked, what to avoid
- `shaders/redaphid/taco/<shader>/docs/presets.md` — per-shader knob recipes
- This file — the playbook

Stay focused. Three hours. Logo readable through every chaos passage.
