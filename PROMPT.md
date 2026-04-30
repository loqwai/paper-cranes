# the-coat bracelet variants — session handoff

## Original user prompt

> We have been working on a live music visual in this project that evolves over time. There are a lot of prototypes and docs about the latest one, 'the coat', that we have been working on. The wips are in `shaders/redaphid/wip/the-coat-fur-coat`. And maybe elsewhere. I am making kandi bracelets with nfc chips with the music visuals in them. I want variations of the coat visual that we can put in `shaders/redaphid/the-coat-<semantic_name>`. I want the bracelets to be somewhat unique, drawing off of ~5 visuals. I know some of the wip variants zoom too far away. Also, use the seed1...seed4 uniforms to customize the visual.
>
> Follow-up: understand how the javascript 'controllers' work — I believe we have some to augment the visuals.

## Goal

Produce **~5 self-contained shader variants** of "the coat" for kandi bracelets with NFC chips. Each bracelet's NFC URL points to one of 5 base visuals, parameterized by `seed`/`seed2`/`seed3`/`seed4` so individual bracelets are visibly unique within a family of 5.

Output paths: `shaders/redaphid/the-coat-<semantic_name>.frag` (production location, **not** `wip/` — these are bracelet-final).

## Constraints

- **Zoom safety**: some WIP variants zoom too far in (knob_1=1 → BASE_ZOOM=2.5, plus +0.3 INTENSITY_ZOOM, +0.9 DROP_ZOOM = up to ~3.7x). Bracelet variants should bake conservative zoom hardcoded — figure framed at ~60–80% of screen. Cap so neither extreme close-up nor too-distant happens.
- **Self-contained**: each `.frag` should work standalone. Bracelet URL form: `?shader=redaphid/the-coat-<name>&controller=the-coat&seed=...&seed2=...&seed3=...&seed4=...`
- **Use seed uniforms** for per-bracelet uniqueness. The project provides `seed`, `seed2`, `seed3`, `seed4` (note: there's no `seed1` — `seed` is the first one). All four are float uniforms auto-injected by `src/shader-transformers/shader-wrapper.js:117-122`.

## Audio-visual system context

- **Latest WIP shader to fork from**: `shaders/redaphid/wip/the-coat-fur-coat/the-coat-8.frag` (~885 lines). Forked from the-coat-7 with confetti removed. Mercury lattice + warm-breath addressed in iter 46–47.
- **Base controller** (already built and excellent): `controllers/the-coat.js` — sustains drop glow with exponential decay. Latches `max(energyZScore, bassZScore*0.7)` when > 0.15, decay rate via knob_13 (0.94–0.995). Outputs uniform `drop_glow`. The shader declares `uniform float drop_glow;` and uses `float drop_hit = max(drop_now, drop_glow);` for sustained eye/ray glow. **Every bracelet URL should include `controller=the-coat`.** If absent, `drop_glow` defaults to 0 → falls back to instantaneous IS_DROP detection (not broken, just less smooth).
- **the-coat-8 effect blocks** (curate per variant): starfield, nebula fog, aurora veils, rotor gear, sub ring, heart pulse, warm breath, mouth glow, eye wash, god rays, mercury flow, time echo, black hole, cosmic shockwave, water pool, volumetric beams, ground quake, dissolution particles, hyperspace streaks, searchlight, flux hue drift.
- **SDFs**: `sdDaddy` (body — head/neck/chest/hips/arms/fists), `sdFurCoat` (torso inflated by FUR_THICK, sleeves, V-neck via smooth subtraction, hem ellipse), `sdCurls` (8 hair circles).
- **Coat color**: HSL-based, deep blue→cyan on drops, lightness pumps with bass.

## Five variant identities (proposed plan, awaiting user confirmation)

| Variant | File | Vibe | Zoom | Effects kept | Effects dropped |
|---|---|---|---|---|---|
| **the-coat-cosmic** | `the-coat-cosmic.frag` | Wide cosmic stage | ~0.6 (wide) | starfield, nebula, aurora, subtle god rays | mercury, hyperspace, searchlight, water pool |
| **the-coat-drop** | `the-coat-drop.frag` | Peak-drop frozen | ~1.0 + tame DROP_ZOOM | god rays max, eye wash, sub ring, shockwave, ground quake | aurora, hyperspace, water pool |
| **the-coat-portrait** | `the-coat-portrait.frag` | Tight face | ~1.5 | fractal fur, mouth glow, warm breath, eye gleam | god rays, hyperspace, beams, ground quake |
| **the-coat-mercury** | `the-coat-mercury.frag` | Coat is the show | ~0.8 | mercury flow, fractal fur, heart pulse, time echo | aurora, hyperspace, beams, searchlight |
| **the-coat-storm** | `the-coat-storm.frag` | Bright treble chaos | ~0.7 | hyperspace, dissolution particles, beams, shockwave, flux drift | aurora, mercury, water pool, ground quake |

## Seed mapping (apply consistently across all 5 variants)

| Uniform | Role | Pattern (from `shaders/wooli/1.frag`) |
|---|---|---|
| `seed` (≡ "seed1") | HUE_BASE anchor — each bracelet's signature color rotation start | `+ seed * 0.13` added to base hue |
| `seed2` | Secondary palette tilt — drop hue, chrome direction, accent color | Walk a circle: `sin(seed2 * PI * 2.0)`, `cos(seed2 * PI * 2.0)` |
| `seed3` | Motion/timing phase — camera drift offset, beat sync offset, particle phase | Phase offset: `+ seed3 * PI * 2.0` in time arguments |
| `seed4` | Chaos amount bias — fractal fur trigger sensitivity, effect strengths | Multiplicative bias on FUR_TRIGGER, hyperspace amount, etc. |

The wooli pattern (`shaders/wooli/1.frag:22-36`) is the reference — seeds drive offsets via `sin(seed * PI * 2.0)` so the same shader produces predictable variation across the seed range.

## Open questions to resolve before producing the 5 files

1. **Single file vs. directory per variant?** Wooli convention is single file (`shaders/wooli/1.frag`); zorn convention is directory + numbered iterations. Recommend single file for bracelets since they're frozen-final.
2. **Are these the right 5 cuts?** Or do you want different splits (e.g. drop "storm" and add a "calm-portrait" / "drop-portrait" pair)?
3. **Live preview during design?** Could drive each variant via the jam page with `?audio=tab` and capture before/after screenshots.

## Useful files

- `shaders/redaphid/wip/the-coat-fur-coat/the-coat-8.frag` — base to fork from
- `shaders/redaphid/wip/the-coat-fur-coat/docs/presets.md` — captures audio fingerprints for `lost-lands`, `closeup-texture`, `full-send`, `wooli-drop`, `wide-blaze`, `living-coat`, `whisper-glow`, `dark-bass`, `bright-chaos`, `balanced-glow`, `ray-bloom`, `body-sculpt`, `golden-wash`, `griz-sizzle`, `full-drop-punch`. These describe distinct moods and inform variant identity.
- `shaders/redaphid/wip/the-coat-fur-coat/docs/the-coat-fur-coat.md` — coat construction notes (V-neck smooth subtraction, alignment fixes).
- `shaders/redaphid/wip/the-coat-fur-coat/docs/the-coat-fur-coat-reactive.md` — audio feature mapping reference.
- `journals/the-coat-8-cool-moments.md` — iter-39 5-effect alignment, design hypotheses for v(next).
- `controllers/the-coat.js` — drop sustain controller (33 lines, the only essential one for the bracelets)
- `controllers/README.md`, `docs/controllers.md` — controller system docs
- `src/shader-transformers/shader-wrapper.js:107-125` — uniform injection (seed, seed2, seed3, seed4, time, resolution, etc.)
- `shaders/wooli/1.frag` — reference for seed-driven variation pattern
- `CLAUDE.md` — project conventions, audio feature reference, shader patterns

## Branch context

Created from `vj-session-the-coat-13-finale`. The base branch has these unrelated in-flight changes (don't touch them when continuing — they belong to the parent branch's open work):

- modified: `journals/the-coat-8-cool-moments.md`, `package-lock.json`, `shaders/redaphid/wip/the-coat-fur-coat/the-coat-8.frag`, `shaders/rezz/spiral-ct.frag`
- untracked: `journals/spiral-ct-cool-moments.md`, `shaders/debug/`, `shaders/wip/bioluminescence.frag`, `shaders/wip/cosmic-flow.frag`, `shaders/wip/dimensional-rift.frag`, `shaders/wip/dream-morph.frag`, `shaders/wip/emergent-life.frag`, `shaders/wip/fractal-cells.frag`, `shaders/wip/liquid-chrome.frag`, `shaders/wip/magnetic-fields.frag`, `shaders/wip/neural-pulse.frag`, `shaders/wip/plasma-vortex.frag`, `shaders/wip/quantum-wave.frag`, `shaders/wip/sound-sculpture.frag`, `src/params.js`

## Status when this handoff was written

- Researched the-coat-8.frag, presets, journals, controllers system.
- Variant plan + seed mapping proposed and **awaiting user confirmation** before producing 5 large `.frag` files.
- No bracelet shader files written yet.

## Next step on resume

1. Confirm the 5-variant plan above (or adjust splits / count).
2. Confirm single-file vs. directory layout.
3. Then produce 5 `.frag` files. Each will be ~400–500 lines (trimmed subset of the-coat-8 with conservative baked zoom and seed-based personalization).
4. Validate each with `node scripts/validate-shader.js shaders/redaphid/the-coat-<name>.frag` before committing.
5. PR with preview links: `https://the-coat-bracelet-variants.paper-cranes-visuals.pages.dev/?shader=redaphid/the-coat-<name>&controller=the-coat&seed=0.42&seed2=0.71&seed3=0.18&seed4=0.55`

## Note on this PROMPT.md file

This file replaces a previous PROMPT.md (banana-boy session handoff, commit `03106eb`). The old version remains on `main` and in history — overwriting it here only affects this branch.
