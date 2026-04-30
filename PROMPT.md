# The Coat — Variant Generation Prompt

## Goal

Generate **5–10 aesthetically distinct variants** of the existing "the-coat" shader family, validated live against varying musical conditions (Spotify track changes). Each variant should be a meaningfully different visual *mode*, not a knob-tweak of the same look.

Place new variants at:
```
shaders/redaphid/the-coat/<semantic-name>.frag
shaders/redaphid/the-coat/<semantic-name>.md
journals/the-coat-<semantic-name>-cool-moments.md
```

Use **semantic names**, not numbers (e.g. `brooding-monster.frag`, `chrome-arena.frag`, `velvet-drift.frag`). The numbered `-N` series in `wip/the-coat-fur-coat/` is the iteration-history lineage; this run produces *named, curated* variants in a new directory.

## Canon: what "the-coat" is

A silhouette-figure dubstep-daddy shader. The figure (head + body + coat outline) stays roughly centered. Audio modulates the coat's surface (fur, chrome rim, hearth glow), the eye channels, the background nebula/stars, frame feedback trails, drop wash, godrays, drip, and so on. Companion controller `the-coat.js` provides:

- `drop_glow` — exponential-decay sustain of `energyZScore`/`bassZScore` peaks (via `knob_13`)
- `pitch_change` — transient pulse on pitch-class jumps (decays in ~0.5s, "harmony arrived" signal)

Use `?controller=the-coat` and declare:
```glsl
uniform float drop_glow;   // from controller
uniform float pitch_change; // from controller
```

### Adding new controllers

If a variant has a theory that genuinely needs frame-to-frame state the existing controllers can't provide (e.g. a section-detector state machine, an integrator, a hysteresis latch on a feature pair), **write a new controller** in `controllers/<name>.js` and load it with `?controller=<name>`. Don't shoehorn theories into `the-coat.js` — keep that one as the canonical drop_glow + pitch_change. Document the new controller's outputs at the top of the file. See `docs/controllers.md` for patterns.

## Standing rules (carried from journal lineage — DO NOT VIOLATE)

1. **Pinwheel (knob_14 / SIGIL_SWIRL): the user hates it.** Default `knob_14 = 0` in every variant. Do not introduce new pinwheel-shaped patterns.
2. **Figure stays centered and recognizable.** No abstract "throw away the silhouette" forks unless that *is* the variant's stated thesis.
3. **Big aesthetic > subtle.** Per memory `feedback_shader_aesthetic`: over-the-top, match dubstep-daddy energy, not subtle.
4. **Don't white-out on loud audio.** Always `clamp(col, 0.0, 1.0)` and decay previous-frame luminance.
5. **Mobile-friendly.** Iteration counts low, no >50-step raymarching.
6. **No graceful audio fallbacks.** If a feature is missing, fail loudly — but use safe defaults inline (e.g. `clamp(bassZScore, 0.0, 1.0)`) rather than swallowing.

## Per-variant requirements (every shader MUST have these)

### 1. Palette knobs

The user wants an *easy* way to adjust palette per variant via knobs. Every shader must expose at minimum:

- `knob_1` → **HUE_SHIFT** — additive offset on the base hue (0 → 1 = full rotation around the hue wheel)
- `knob_2` → **SATURATION** — multiplier `mix(0.0, 1.5, knob_2)` so 0=desaturated, 0.5=normal, 1.0=oversaturated
- `knob_3` → **PALETTE_WARMTH** — biases hue toward warm (red/orange) at high values, cool (blue/violet) at low; `mix(-0.15, +0.15, knob_3)` added to base hue

Implement these via `#define` so they're tunable inline:
```glsl
#define HUE_SHIFT      (knob_1)
#define SATURATION_MUL mix(0.0, 1.5, knob_2)
#define PALETTE_WARMTH mix(-0.15, 0.15, knob_3)
```

Then bake them into the variant's color path. Every color emitted should pass through these three. The variant's *thesis* color strategy (D axis below) layers on top — but the three palette knobs are the universal handle.

Reserve `knob_1`–`knob_3` for palette across the whole `the-coat/` directory so muscle memory works between variants.

### 2. URL comment

Every variant must include a comment near the top of its `.frag` showing the exact local URL used to view it on the jam page. Example:

```glsl
// URL: http://localhost:6969/jam.html?shader=redaphid/the-coat/brooding-monster&controller=the-coat
```

If the variant uses a non-default controller, reflect that in the URL.

### 3. Standard knob slots

Beyond palette, document each variant's knob assignments as a comment block. Reuse existing the-coat slots where they make sense:

- `knob_1`–`knob_3` palette (reserved, see above)
- `knob_4` eye wash override
- `knob_7` fur thickness
- `knob_8` darkness / VJ darkness
- `knob_9` feedback / trails (0=crisp, 1=smear)
- `knob_13` drop sustain decay (consumed by the-coat controller)
- `knob_14` pinwheel — leave at 0 (HATED; see standing rules)

Variant-specific knobs can use `knob_5, 6, 10, 11, 12, 15, 16+`.

## Variant axes (pick distinct combinations — don't dial-tweak)

To produce *meaningfully different* variants, each one should commit to a specific combination across these axes:

### A. Aesthetic mood
- **brooding monster** (slow, weighted, dr-fresch corner)
- **painterly groove** (heavy feedback, soft trails, cool palette)
- **inky-dramatic chaos drop** (high contrast, dark BG, occasional bright pop)
- **warm hearth** (mids-driven, amber glow, slow breath)
- **chrome arena** (high RIM_BOOST, metallic, sharp)
- **foggy figure** (atmospheric, recessed eyes, soft body)
- **electric vapor** (treble-driven, neon, rapid shimmer)
- **velvet drift** (slow camera, deep field, tonal/ambient)
- **chromadepth coat** (HSL spectral mapping for 3D glasses — see CLAUDE.md guide)
- **glitch storm** (entropy/flux-driven artifacts, only when audio is chaotic)

### B. Audio reactivity dominant feature
Pick *one* lead feature that dominates this variant. Don't mix three equally — variants need a thesis.
- bass dominant (sub-200Hz)
- mids dominant (warm body, vocal range)
- treble dominant (shimmer, sparkle)
- spectralCentroid (tonal brightness drift)
- spectralEntropy (chaos detector)
- spectralRoughness (dissonance / dirty bass)
- spectralFlux (transient response)
- pitchClass + pitch_change (harmonic awareness)
- spectralCrestZScore (peakedness — percussive hits)
- drop_glow (sustained drops)

### C. Composition
- close-up portrait (head dominant)
- mid-shot (body + coat)
- wide silhouette (figure small, environment large)
- back-lit / counter-light (figure as cutout)
- mirrored / kaleidoscopic (figure echoed)

### D. Color strategy
- single-hue rotation (HUE_BASE drift)
- complementary pop (BASE + WARM hearth)
- chromadepth (red→violet by depth, dark BG required)
- monochrome luminance (b/w with one accent on beat)
- duotone (two fixed hues mixed by audio)

**Each variant must commit to a unique (A, B, C, D) cell.** Track which cells are used so the set covers the space.

## Validation protocol (live, per variant)

For each new variant:
1. Save the `.frag` and `.md` to disk (HMR hot-swaps in the browser).
2. Drive jam page to load the new shader: `?shader=redaphid/the-coat/<name>&controller=the-coat` (or whichever controller this variant uses).
3. Wait ≥30 seconds and watch it under at least **2 distinct musical conditions** in the current Spotify session (e.g., a heavy-bass moment + a quieter melodic moment).
4. Take screenshots via Chrome devtools MCP at meaningful audio moments. Save to `shaders/redaphid/the-coat/<name>/.snapshots/` if useful.
5. **Twist `knob_1`, `knob_2`, `knob_3`** during validation to confirm the palette knobs actually rotate / desaturate / warm-shift the look as intended. A variant that ignores its palette knobs is broken.
6. Critique honestly in the variant's `.md`:
   - **What works** — which (A, B, C, D) commitments paid off?
   - **What fails** — does it look the same as another variant under quiet conditions? Does it crash visually on loud transients?
   - **Verdict** — keep, or kill and try a different cell?
7. If keeping, append a "Cool moments" journal entry with the music context (track + timestamp).
8. If killing, leave the file but mark `# KILLED:` at the top of the .md and note why. Do **not** delete; the failed forks are training signal (per -21 journal lesson).

## Process (autonomous loop)

While the user is at dinner, run the loop:

```
loop:
  1. Read recent Spotify track name from jam page (via MCP)
  2. Pick an unused (A, B, C, D) cell that fits the current track's character
  3. Fork the closest existing -N as a starting point
  4. Make the variant's *thesis* commitment in code (don't just tweak knobs)
  5. Save → reload jam page → observe ≥30s
  6. If it's distinct + working: write .md + journal, mark cell used
  7. If it fails: mark KILLED in .md, pick a different cell next iter
  8. Stop when there are 5–10 keepers covering distinct cells
```

Each variant should be its own commit. Push every 3 keepers so progress survives crashes.

## Reference shaders (read these before forking)

Existing the-coat lineage in `shaders/redaphid/wip/the-coat-fur-coat/`:
- `the-coat-3.frag` — early baseline
- `the-coat-14.frag` — current "main" with full Hypnosound feature coverage; most logic lives here
- `the-coat-15.frag` — indomitable-monster (dr-fresch, slow + large + weighted)
- `the-coat-16` through `-21` — local fork series (foggy-figure, etc.)
- `the-coat-22.frag` — painterly-groove (cool palette, heavy feedback)
- `the-coat-23.frag` — inky-dramatic chaos drop
- `the-coat-3-knobs.frag` — knob exploration variant

Recent journals (read for lessons + standing rules):
- `journals/the-coat-21-cool-moments.md` — pinwheel-hate escalation
- `journals/the-coat-22-cool-moments.md`, `-23-` — painterly + chaos lineage notes

## Available controllers

- `the-coat` — drop_glow + pitch_change (default for this series)
- `mandelbrot` / `mandelbrot-perturbation` — deep-zoom fractals (probably not needed here)
- `zoomer` — double-precision zoom (only if going deep)
- `chromatic-flow` / `simple` / `example` — see source

Default to `the-coat`. Only swap if a variant's thesis genuinely needs different state.

## File header template (paste at top of new variants)

```glsl
// @fullscreen: true
// @mobile: true
// @tags: the-coat
// the-coat / <semantic-name>: <one-line aesthetic thesis>
// Cell: A=<mood>, B=<lead-feature>, C=<composition>, D=<color>
// Forked from <parent-path>. Music at fork time: <track - artist>.
//
// URL: http://localhost:6969/jam.html?shader=redaphid/the-coat/<semantic-name>&controller=the-coat
//
// Knobs:
//   knob_1: HUE_SHIFT (palette — full hue rotation)
//   knob_2: SATURATION (palette — 0=desat, 0.5=normal, 1=oversat)
//   knob_3: PALETTE_WARMTH (palette — cool ↔ warm bias)
//   knob_4: <variant-specific>
//   ...
//   knob_13: drop sustain decay (the-coat controller)
//   knob_14: PINWHEEL — leave at 0 (HATED)
uniform float drop_glow;    // from the-coat controller
uniform float pitch_change; // from the-coat controller

#define HUE_SHIFT      (knob_1)
#define SATURATION_MUL mix(0.0, 1.5, knob_2)
#define PALETTE_WARMTH mix(-0.15, 0.15, knob_3)
```

If using a custom controller, add its `uniform float ...;` declarations and update the URL line's `&controller=` segment.

## End conditions

- 5 distinct keepers: stop unless feeling inspired.
- 10 distinct keepers: stop regardless.
- Cells exhausted: stop and document the gaps.
- 90 minutes elapsed: stop, summarize, push.

## When done

1. Push the branch.
2. Write a summary at the top of `journals/the-coat-variant-run-2026-04-29.md` listing:
   - Each keeper variant (semantic name, cell, one-line description, music context where it shone, full URL)
   - Each KILLED with reason
   - Cells covered vs cells gap
   - Any new controllers added and what they provide
3. Tell the user when they're back: how many keepers, top 2 picks, any surprises.
