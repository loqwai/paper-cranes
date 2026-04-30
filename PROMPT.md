# The Coat — Variant Generation Prompt

## Goal

Generate **5–10 aesthetically distinct variants** of the existing "the-coat" shader family, validated live against varying musical conditions (Spotify track changes). Each variant should be a meaningfully different visual *mode*, not a knob-tweak of the same look.

Place new variants at:
```
shaders/redaphid/wip/the-coat-fur-coat/the-coat-<N>.frag
shaders/redaphid/wip/the-coat-fur-coat/the-coat-<N>.md
journals/the-coat-<N>-cool-moments.md
```

Continue numbering from the highest existing index (currently `-23`).

## Canon: what "the-coat" is

A silhouette-figure dubstep-daddy shader. The figure (head + body + coat outline) stays roughly centered. Audio modulates the coat's surface (fur, chrome rim, hearth glow), the eye channels, the background nebula/stars, frame feedback trails, drop wash, godrays, drip, and so on. Companion controller `the-coat.js` provides:

- `drop_glow` — exponential-decay sustain of `energyZScore`/`bassZScore` peaks (via `knob_13`)
- `pitch_change` — transient pulse on pitch-class jumps (decays in ~0.5s, "harmony arrived" signal)

Use `?controller=the-coat` and declare:
```glsl
uniform float drop_glow;   // from controller
uniform float pitch_change; // from controller
```

## Standing rules (carried from journal lineage — DO NOT VIOLATE)

1. **Pinwheel (knob_14 / SIGIL_SWIRL): the user hates it.** Default `knob_14 = 0` in every variant. Do not introduce new pinwheel-shaped patterns.
2. **Figure stays centered and recognizable.** No abstract "throw away the silhouette" forks unless that *is* the variant's stated thesis.
3. **Big aesthetic > subtle.** Per memory `feedback_shader_aesthetic`: over-the-top, match dubstep-daddy energy, not subtle.
4. **Don't white-out on loud audio.** Always `clamp(col, 0.0, 1.0)` and decay previous-frame luminance.
5. **Mobile-friendly.** Iteration counts low, no >50-step raymarching.
6. **No graceful audio fallbacks.** If a feature is missing, fail loudly — but use safe defaults inline (e.g. `clamp(bassZScore, 0.0, 1.0)`) rather than swallowing.

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
2. Drive jam page to load the new shader: `?shader=redaphid/wip/the-coat-fur-coat/the-coat-<N>&controller=the-coat`.
3. Wait ≥30 seconds and watch it under at least **2 distinct musical conditions** in the current Spotify session (e.g., a heavy-bass moment + a quieter melodic moment).
4. Take screenshots via Chrome devtools MCP at meaningful audio moments. Save to `shaders/redaphid/wip/the-coat-fur-coat/the-coat-<N>/docs/.snapshots/` if useful.
5. Critique honestly in the variant's `.md`:
   - **What works** — which (A, B, C, D) commitments paid off?
   - **What fails** — does it look the same as another variant under quiet conditions? Does it crash visually on loud transients?
   - **Verdict** — keep, or kill and try a different cell?
6. If keeping, append a "Cool moments" journal entry with the music context (track + timestamp).
7. If killing, leave the file but mark `# KILLED:` at the top of the .md and note why. Do **not** delete; the failed forks are training signal (per -21 journal lesson).

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
// the-coat-<N>: <one-line aesthetic thesis> — variant cell (A=<mood>, B=<lead-feature>, C=<composition>, D=<color>)
// Forked from the-coat-<parent>. Music at fork time: <track>.
uniform float drop_glow;
uniform float pitch_change;
```

## End conditions

- 5 distinct keepers: stop unless feeling inspired.
- 10 distinct keepers: stop regardless.
- Cells exhausted: stop and document the gaps.
- 90 minutes elapsed: stop, summarize, push.

## When done

1. Push the branch.
2. Write a summary at the top of `journals/the-coat-variant-run-2026-04-29.md` listing:
   - Each keeper variant (number, cell, one-line description, music context where it shone)
   - Each KILLED with reason
   - Cells covered vs cells gap
3. Tell the user when they're back: how many keepers, top 2 picks, any surprises.
