# sun-lattice: the sun set, told by the lattice

Fusion of the **sun set** (2026-10-09/10 show, `.claude/skills/sun-set/JOURNEY.md`) with the
**lattice-vj** flow state (`redaphid/wip/lattice-vj/9`, the learned fork). The lattice is the
hero; the sun is a story told *through* it.

```
?shader=claude/wip/sun-lattice/2&controller=lattice-nav&wavelet=true
```

Add `&audio_gain=32` on a laptop mic hearing a speaker (see `/vibej2` setup step 3). For the
tuned lattice look, append lattice-vj/9's baked preset (knobs + nav + paletteShift/warpGrow) from
`redaphid/wip/lattice-vj/9.md`.

## Design

Everything the lattice already had stays: symmetry plateaus on drops, spin following the low end,
spatial permutations, the complexity ratchet, the learned CHURN (spectral flux → line weight + rim
flare) and WUB (wobble depth → accent + glint) mappings. The sun is added in the channels the
house rules allow (`docs/vj-preferences.md`):

| Sun-set element | Channel | How |
|---|---|---|
| The sun | none: no disc | A region where the **lattice's own lines burn**: recoloured gold/amber/ember with their structure intact, fading continuously into the lattice palette. No edge, no ring, no black core. (The user vetoed a drawn sun circle twice in lattice-vj.) |
| Sunrise → giant | geometry, one-way | Rises from low-centre to centre over the first half of the set and grows from a star (r 0.22) to a giant (r 0.70) on `evoPhase`, the silence-frozen set clock. **K161 SUN SIZE** overrides. |
| Sun palette ageing | colour, slowest clock | gold → amber → ember → red-magenta on the same clock (the sun-set palette from the prefs). The heart runs hotter than the limb. |
| The sun is the light | light takes the audio | Rim light, shadow side and specular turn to point **at** the sun as it grows (25% → 70% of the light direction). Bass sustain breathes its heat; the eased `gKick` envelope punches it, up to 2× harder while the sun is small. All `quietGate`d. |
| Robustness | — | Feedback is sanitized (NaN/inf → 0, clamped 0..1). A NaN in the trail turned black-sun/sun-1 black at boot during the Windows dry run. |

## Iterations

- **1.frag**: fork of lattice-vj/9 + the sun as above. Beat 1 of the dry run (slb1): start
  radius 0.12 → 0.22, because a 0.12 sun at boot read as a speck from across the room.
- **2.frag**: the dry-run result (slb3), heat falloff 1.6 → 0.9. The burn now reaches the cells
  around the sun: one cell glows gold at the heart with warm spill into its neighbours, so it reads
  as a sun burning *in* the lattice rather than a glow spot on top. Health after: clip 0, lum 0.23,
  hue drift 0.003/min, gate 0.87.

## Dry run notes (2026-11-14, Windows Surface, internal mic, Echo Studio)

- Cold load 3 s on Windows (the 99 KB sun line takes 1–3 min there). This is the lighter, safer
  show shader on that machine.
- Boot health: clip 0, lum 0.195, dark 0.19, lumMin 0.16, sat 0.83.
- Mic gain ×32 opens lattice-nav's quietGate fully on loud music (×16 left it near 0.3).
- Over the run: clip 0 throughout, lumMin ≥ 0.15, no jank (p95 16.8 ms). Spotify paused itself at
  a track boundary twice; the loop resumed it.
- Open: hueConc reached 0.83 once (a mostly blue field); the prefs flag a monochrome frame above ~0.85.
