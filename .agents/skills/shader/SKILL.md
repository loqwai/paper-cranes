---
name: shader
description: Make, design, fork or fix a Paper Cranes shader so it is good enough for Aaron's wall. Use for "make a shader", "design a visual", "new visualization", "iterate on this shader", "fork this shader" to change its look by hand, "make a chromadepth version", "map audio (or knobs) into this shader", and for complaints about a shader such as "it's twitchy", "shivery", "samey", "washed out", "grey", "flickers", "sparkles", "too flashy", "banding", "dead in the quiet parts", "it isn't moving". Covers file layout, his taste rules, signal conditioning, a failure-to-fix table, mobile limits, when a controller is justified, and a measured verification gate. Not for running a show (/show), live partnering (/partner), saving a kept moment or turning it into a fork or preset (/keep: "keep this", "fork it" after a KEEP), knob/audio toggling (/solo) or recording (/record).
---

# Shader

A shader Aaron puts on the wall reacts visibly to the music at phone-mic level, never shivers or
strobes, looks good with every knob at 0 and the room silent, and holds 60 fps on a phone. This skill
gets a shader there and proves it with numbers. "It compiles" is not proof.

Read [references/taste.md](references/taste.md) before you design anything. It is his words, and
they decide what ships.

## Route elsewhere

| The ask | Use |
|---|---|
| Run a show, preflight, panic, setlist | `/show` (`/clit-show`, `/sun-show` for those shows) |
| Change the look while he plays the dials | `/partner` (it proposes; it does not edit his wall) |
| "Keep this", turn kept moments into forks | `/keep` |
| Swap a shader between knob mode and audio mode | `/solo` |
| Prove a page or feature in the browser | `/verify-paper-cranes` (this skill's gate builds on it) |
| Record a video of a shader | `/record` |

## Look it up first

He has almost always discussed the shader before. Before writing code:

1. Search mindmeld for the shader or series name (`cwd` = the repo) and read the top sessions.
2. Read `journals/<name>*-cool-moments.md` and the shader's own `<name>.md`: what he praised, what he
   made you remove ("Removed effects (do not re-introduce)" sections exist for a reason).
3. Read the parent `.frag` if this is a fork, and any controller its URL names.

## Workflow

1. **Write the intent in one sentence**: what the picture is, and what the music does to it. A place
   to explore beats a picture to look at (taste.md, "Form").
2. **Make the files.** `shaders/wip/<series>/1.frag` plus one doc, `<series>.md`, in the same
   folder. No author folder: not `claude/wip`, not `wip/claude`. A fork is the next number (`2.frag`), never an edit in place: the parent stays as the
   fallback. Line 1 is `#version 300 es` if you use one, then metadata (`// @fullscreen: true`,
   `// @mobile: true`, `// @tags: ...`); a ShaderToy-style `mainImage` needs no `#version`. Put a
   `// preset: <url>` line with the params it needs (`controller=`, `wavelet=true`).
3. **Lay the file out in blocks**, in this order: header comment (intent, the audio map, what knob 0
   means), knob map, conditioned inputs, the `#define` swap block for every audio term, structure,
   light, colour, output guard. The swap pattern (an audio `#define` with its constant twin commented
   out under it) is in the repo `AGENTS.md`; keep it, it is how you isolate a bad term live.
4. **Build the structure in silence first.** Render with no audio until the resting picture is
   beautiful and always moving on its own clocks. Give it several independent shape axes, not just a
   zoom.
5. **Wire audio by channel** (below), one domain at a time, 12 or more features in all, each a small
   verb on its own element. Start reactions at 3-5x what feels tasteful.
6. **Name the knobs** on the line that uses them: `// K4 ZOOM (0 = home, 1 = 3x)`. Tooling reads the
   ALL-CAPS name (`vite-plugins/shader-plugin.js`). Knob 0 must look good; no knob value may break the
   look. Pick numbers that don't collide with the series you forked.
7. **Pass the gate** (below). Fix every FAIL; fix or explain every WARN.
8. **Document and commit.** In `<series>.md`: intent, the audio map and why, the knob map, and per
   iteration what changed and the numbers. Commit, run `npm run shader-dates`, commit
   `shader-dates.json`, push, and give the preview link
   `https://<branch>.paper-cranes-visuals.pages.dev/?shader=wip/<series>/1&<preset params>`.

## Taste rules (hard)

Quotes and sources are in [references/taste.md](references/taste.md).

1. **Geometry only moves forward.** No sine on zoom, pan, rotation, fold or fractal parameters.
   "always going FORWARD, no oscillating back".
2. **Audio never enters coordinates or phases.** It strobes and blacks out frames ("entire frame
   blacking out every other frame").
3. **Visibly reactive at phone level** (energy 0.01-0.07), with many legible features. "It looks
   static" is his most repeated complaint.
4. **Audio lights things locally.** No whole-frame gain on the beat; no brightness pump. "global
   brightness shift".
5. **Quiet is never brighter than loud**, and loud never washes the frame out.
6. **Colour follows slow music only**, in OKLCH, gamut-mapped: several hues, never grey, no hot
   magenta, no banding at any knob value. HSL only for ChromaDepth.
7. **Beats come from onset envelopes or wavelet hits**, never the `beat` uniform. They hit, then ease
   out; motion surges forward.
8. **Big changes only when the music earns them** (drops, section changes), with a refractory.
9. **"Samey" means a new form or camera**, as a fork, not a colour tweak.
10. **60 fps on a phone beats style.** Every knob at 0 looks good. Nothing flashes on a hot-swap.

## Channel hierarchy

| Channel | Gets | Never gets |
|---|---|---|
| Geometry | one-way clocks, his knobs, eased one-way steps on drops | audio values, sines |
| Light (rim, relief, lace, sparks, chroma) | all the audio, via envelopes and smoothed levels | a whole-frame multiplier |
| Colour (base hue, palette) | medians, means, the slow set clock | z-scores, raw values, fast hue spin |

Signal rules, with the traps the docs miss, are in [references/signal.md](references/signal.md). The ones
people get wrong most:

- `*Normalized`, `*Median`, onset envelopes for anything continuous; z-scores only past a threshold,
  clamped. Gate audio terms with `smoothstep(0.0008, 0.006, energy)` so silence can't drive them.
- Subtract `energyZScore` from bass and treble so features stop moving as one.
- Never `iTime * audioValue`. `iTime` wraps at 1000 s, so motion periods must divide it.
- `?time=T` holds only `time`; add `&iTime=T` to hold `iTime` too.
- The wrapper's `oklch2rgb(vec3)` takes hue in radians and returns LINEAR sRGB. Encode once for
  display, or use the kit's `oklch2rgb(L, C, h)` (turns, gamut-fit, display sRGB) from
  [docs/oklch-palettes.md](../../../docs/oklch-palettes.md). A double encode greys everything.
- OKLab hue in turns is not HSL hue: red 0.08, amber 0.15, gold 0.25, green 0.40, teal 0.55, blue
  0.70, violet 0.80, magenta 0.90. "Ember" at 0.04 already reads pink. Keep warm bases at 0.10 or more.
- Split hues by geometry (a spiral arm, a depth band), not by an fbm value: fbm clusters near 0.5,
  so a threshold on it paints nearly the whole frame one hue (silk-vortex iterations 2-3).

## Failure to fix (short)

| Symptom | First thing to check |
|---|---|
| twitchy | z-scores or raw values on position, size or colour |
| shivery | a sine on geometry, or a transient added to a phase |
| black every other frame, strobe on cymbals | audio in a phase or in fractal coordinates |
| global brightness shift | a frame gain, or a palette rotating fast |
| brighter when quiet | un-gated Normalized or z-scores |
| grey, washed out | double gamma encode, RGB multiply inside feedback, high L with low C |
| banding at a knob extreme | HSL, `fract` on hue, `max()` blend or hue rotation inside feedback |
| hot magenta | trails blending red over violet; guard the output hue |
| sparkle on fine detail | spatial aliasing: `fwidth`-gate clamped values, check with `sparkle-score` |
| not moving | missing `controller=`/`wavelet=true` in the URL, or a gate tuned for line level |
| samey | one camera model: fork with a new one |
| too slow | iterations and steps over the mobile limits |

Every row with its cause, fix and the shader where it happened: [references/failure-fixes.md](references/failure-fixes.md).

## Mobile limits

| | Desktop | Phone |
|---|---|---|
| Raymarch steps | 100+ | 50 max |
| Fractal iterations | 15+ | 8 max (lace fractals: cap and test) |
| Surface threshold / normal epsilon | 0.0005 | 0.002 / 0.003 |
| Soft shadows, AO | 32 / 5 samples | none / 2 samples |

Orbit-trap lace reads between 1x and about 3-4.5x zoom on a 408 px phone canvas, then turns to
speckle. Cap the zoom, or use a periodic tube (docs/vj-deep-voyage-recipe.md §2).

## When a controller is justified

Default to the shader. Use a controller (`controllers/*.js`, `?controller=`; guide:
[docs/controllers.md](../../../docs/controllers.md)) only when the shader cannot hold the state:

- the music must change the **speed** of motion (a monotonic phase: wavelet-ease's `spinPhase`,
  `flowPhase`; clit-set's `cs_flow`, `cs_beat`);
- an envelope with its own attack and release, a latch, a drop detector, a story with acts;
- navigation with momentum, eased absolute knobs, double-precision zoom.

Reuse before writing: `wavelet-ease` (springs, quiet gate, phases, `sectionMode`) needs `wavelet=true`.
Chain at the URL, last stage wins. Declare each output as `uniform float`. Keep a fallback so the
shader still renders without it: `#define HAS_CTL (cs_on > 0.5)` and `HAS_CTL ? cs_x : <shader-only
value>` (clit-vibej/2 does this for every input).

## The gate

Run the gate through `/verify-paper-cranes`: it starts the app and holds the base URL the scripts
below use. Commands, thresholds and what each WARN means are in [references/verify.md](references/verify.md).

1. `node scripts/validate-shader.js shaders/wip/<series>/1.frag`: no errors.
2. `node .agents/skills/shader/bin/shader-check.mjs --shader wip/<series>/1 [--controller X] [--params wavelet=true]`:
   it exits 1 on any FAIL: a black, white or flat frame, loud more than 2x brighter than quiet,
   quiet more than 1.5x brighter than loud, or a frozen picture in silence. Exit 0 is the floor, not
   the verdict: open every PNG it names in a WARN, and look at `silence-*`, `loud` and `kick` either way.
3. `scripts/sparkle-score.mjs` with `--trace synth`: report `flipMean` and `motion`, look at
   `heat.png`, and with `--bench 20` compare `msPerFrame` with the reference shaders in verify.md.
4. Real audio in Firefox (`audio_file=`), and a headful video of the sweep (`pc-verify render --video`):
   Aaron counts a missing video of motion as not verified.
5. `npm test` green.
6. In the PR and the shader doc: the numbers, the PNG paths, and anything you could not verify.

## Example

`shaders/wip/silk-vortex/1.frag` and `silk-vortex.md` were written from this skill alone as
its worked example: a log-polar vortex on one-way clocks, a presence-gated conditioning block, the
`#define` swap on every audio term, the OKLCH kit with one encode, and a soft knee. The doc lists each
gate run and what it changed.

## Sources

Mindmeld sessions: 102145 and 102906 (the 2026-11-22 clit coaster show), 102156, 102151, 102152,
102155 and 103381 (clit-set and clit-vibej builds, with Aaron's quotes), 49223 and 12824 (vibej2 and
the channel hierarchy), 50244 and 41521 (feature legibility, phases and shiver), 222 (ChromaDepth
and lattice-nav), 42995 (audio off geometry). Local transcripts `6d078c12` (11-22 show coordinator),
`71ec286e` (lace sparkle, OKLCH re-do). Vault: `kb/facts/paper-cranes-colour-work-uses-oklab.md`,
`kb/tools/tool-paper-cranes-vj-mcp.md`, `kb/paper-cranes/mogee-fest-2026-vibej-session.md`. Repo:
`docs/vj-preferences.md`, `docs/vj-deep-voyage-recipe.md`, `docs/advanced-shader-techniques.md`,
`shaders/redaphid/wip/lattice-vj/HANDOFF.md`, and the `journals/*cool-moments.md` files quoted in
taste.md.
