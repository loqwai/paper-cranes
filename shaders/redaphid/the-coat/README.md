# the-coat

A silhouette-figure dubstep-daddy shader family. The figure (head + body + coat outline)
stays roughly centered; audio modulates the coat's surface (fur, chrome rim, hearth glow),
the eye channels, the background nebula/stars, frame feedback trails, drop wash, godrays,
and drip.

Every variant in this directory is a distinct visual *mode*, not a knob-tweak of the same
look. The numbered `-N` series in `../wip/the-coat-fur-coat/` is the iteration-history
lineage; the named files here are the curated keepers.

## Controller

Load with `?controller=the-coat`. It provides:

- `drop_glow` — exponential-decay sustain of `energyZScore`/`bassZScore` peaks (decay rate from `knob_13`)
- `pitch_change` — transient pulse on pitch-class jumps, decays in ~0.5s ("harmony arrived")

Declare them explicitly — controller outputs are not auto-declared:

```glsl
uniform float drop_glow;    // from the-coat controller
uniform float pitch_change; // from the-coat controller
```

If a variant needs frame-to-frame state `the-coat.js` can't provide (a section-detector
state machine, an integrator, a hysteresis latch), write a new controller in
`controllers/<name>.js` and chain it — don't shoehorn theories into `the-coat.js`, which
stays the canonical drop_glow + pitch_change. See [docs/controllers.md](../../../docs/controllers.md).

## Standing rules

These come from the journal lineage and are not up for renegotiation:

1. **Pinwheel (`knob_14` / SIGIL_SWIRL) is hated.** Default it to `0` in every variant, and
   don't introduce new pinwheel-shaped patterns.
2. **The figure stays centered and recognizable** — no abstract "throw away the silhouette"
   forks unless that *is* the variant's stated thesis.
3. **Big aesthetic beats subtle.** Match dubstep-daddy energy.
4. **Never white out on loud audio.** Always `clamp(col, 0.0, 1.0)` and decay previous-frame
   luminance.
5. **Mobile-friendly** — low iteration counts, no raymarching past ~50 steps.
6. **No graceful audio fallbacks.** Use safe inline defaults (e.g. `clamp(bassZScore, 0.0, 1.0)`)
   rather than swallowing missing features.
7. **Don't delete failed forks.** Mark `# KILLED:` at the top of the variant's `.md` with the
   reason — the failures are signal.

## Knob slots

`knob_1`–`knob_3` are reserved for palette across the whole directory so muscle memory
carries between variants:

```glsl
#define HUE_SHIFT      (knob_1)                  // additive hue offset, 0..1 = full rotation
#define SATURATION_MUL mix(0.0, 1.5, knob_2)     // 0=desaturated, 0.5=normal, 1=oversaturated
#define PALETTE_WARMTH mix(-0.15, 0.15, knob_3)  // cool ↔ warm hue bias
```

Every color a variant emits should pass through all three. A variant whose palette knobs
don't visibly rotate / desaturate / warm-shift the look is broken.

The rest of the shared map:

| Knob | Meaning |
|------|---------|
| `knob_4` | eye wash override |
| `knob_7` | fur thickness |
| `knob_8` | darkness / VJ darkness |
| `knob_9` | feedback / trails (0 = crisp, 1 = smear) |
| `knob_13` | drop sustain decay (consumed by the-coat controller) |
| `knob_14` | pinwheel — leave at 0 (see standing rules) |

Variant-specific parameters use `knob_5`, `6`, `10`, `11`, `12`, `15`, `16`+.

## Variant header template

```glsl
// @fullscreen: true
// @mobile: true
// @tags: the-coat
// the-coat / <semantic-name>: <one-line aesthetic thesis>
// Forked from <parent-path>. Music at fork time: <track - artist>.
//
// URL: http://localhost:6969/jam.html?shader=redaphid/the-coat/<semantic-name>&controller=the-coat
//
// Knobs:
//   knob_1: HUE_SHIFT      (palette)
//   knob_2: SATURATION     (palette)
//   knob_3: PALETTE_WARMTH (palette)
//   knob_4: <variant-specific>
//   knob_13: drop sustain decay (the-coat controller)
//   knob_14: PINWHEEL — leave at 0
```

Keep the `URL:` line accurate, including any non-default `&controller=`. The port is
branch-derived — run `./scripts/dev-port` to get it.

## Making a variant meaningfully different

Commit to a distinct combination rather than dialing knobs. Each variant should pick one
cell across these axes and own it:

- **Mood** — brooding monster, painterly groove, inky chaos drop, warm hearth, chrome arena,
  foggy figure, electric vapor, velvet drift, chromadepth coat, glitch storm
- **Lead audio feature** — pick *one* that dominates (bass, mids, treble, spectralCentroid,
  spectralEntropy, spectralRoughness, spectralFlux, pitchClass + `pitch_change`,
  spectralCrestZScore, `drop_glow`). Three features mixed equally reads as no thesis.
- **Composition** — close-up portrait, mid-shot, wide silhouette, back-lit cutout, mirrored/kaleidoscopic
- **Color strategy** — single-hue rotation, complementary pop, chromadepth (dark BG required),
  monochrome luminance with one beat accent, duotone

Validate each variant against at least two distinct musical conditions (a heavy-bass moment
and a quieter melodic one), twisting `knob_1`–`knob_3` to confirm the palette responds, then
record what works and what fails in the variant's `.md`.
