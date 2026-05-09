# taco-kandi-7 — Session Journal

## Status
Iter 50 of /vibej run. **Shader has region-aware effects now** — the re-colored `images/taco.png` carries SHELL=red, FILLING=green, INK=black, OUTSIDE=transparent masks. Shell gets a wooli-style seeded fractal (per-device unique). Filling keeps the plasma raymarch. Three-trigger zoom-pulse (bassN + bass_smooth + beat_pulse) so beats reliably fire pulse on any track.

## Forks
- `taco-kandi/7 ← taco-kandi/6` (iter 50, 2026-05-09): forked at iter 49 to introduce region-targeted effects safely. Original /6 remains as a clean baseline.

## Cool moments

### Iter 52 (2026-05-09) — *She's A Devil / Layton Giordani, AR/CO* — REGION-MASK LANDS
**Audio fingerprint:** `bass 0.15 + treble 0.85 + mids 0.31 + entropy 0.86 + centroid 0.57 + pitch 0.90 + rough 0.62 + energy 0.45`. Chaos-bright peak with high melodic.
**What worked:** Brown/orange wooli-fractal SHELL with visible breathing swirls; cosmic/molten plasma in the FILLING region (orange-yellow with dark filaments); blue-violet outline halo from OUTLINE_RADIATION + photon ring; black starfield void; logo unmistakable as a taco. The split between `red→shell→fractal` and `green→filling→plasma` is visually obvious AND brand-correct (tortilla is warm/seedy, fillings are cosmic/textured). seed/seed2 driving fractal c-coords means each device gets a unique tortilla pattern.
**What was missed:** Nothing flagged.
**Design hypothesis:** Region-tagged textures unlock per-region effect targeting cleanly. Generalizable to any logo: Pepsi cup-vs-bubbles, Apple body-vs-leaf, Nike swoosh-vs-base. The mask authoring (Python flood-fill with dilated ink) takes ~5 minutes per logo.

### Iter 57 (2026-05-09) — *Tanglewood / Of The Trees* — TORTILLA-COSMIC LANDS
**Visual:** Solid brick-orange tortilla shell (wooli fractal at full clarity), olive-green plasma filling with seared red-orange highlights, deep blue-violet outline halo, crisp ink lines — looks like a real taco viewed through a plasma lens. The platonic ideal of the filibertos brand visualization.
**Audio fingerprint:** mid-range warm-bass + entropy passage. spectralCrest moderate (not too spiky), so contrast is gentle. Shell holds together.
**Why it worked:** Iter 56's exclusive region tagging via channel-dominance (R−G diff) gave clean shell/filling split — no green leak, no red leak. Iter 57's fresh-feature wiring lets the shell breathe without destabilizing — kurtosis/skew/crest are slow-moving so the fractal stays coherent while subtly responding to texture changes.
**Design hypothesis:** The brick-orange tortilla + cosmic-green lettuce contrast was always the destination. Region-tagged source PNG + exclusive R−G region detection + warm-anchored shellFractal = brand identity preserved through any audio chaos. Pattern recorded.

### Iter 52 micro-tweak — pitch-driven shell hue lift
On chaos-bright passages with pitch=0.90, added `pitch_lift = (pitchN - 0.5) * 0.12` to the shell `bright` anchor's hue. So the cream highlight in the tortilla warms toward GOLD on high melodic notes, cools toward AMBER on bass notes. Bounded ±0.06 rad, stays in plasma family. Independent from radiation/photon — only the SHELL responds to pitch.

## History of changes
- **Iter 50 (2026-05-09) — *I'll Be Ready / Of The Trees, Mary Corso* — REGION-TARGETED SHELL FRACTAL + zoom-pulse fix** — User chain: "edit the taco.png mask, giving it different colors so you can target them. I want that and target the fill of just the taco shell with the kind of fractals the wooli shaders do, that are unique on seed." + "It's not zooming reliably with the beat." Two moves shipped together:
  (1) **REGION-COLORED PNG** — `images/taco.png` re-flooded via Python+PIL: SHELL=(255,80,80), FILLING=(80,255,80), INK=black, OUTSIDE=transparent. Used dilated-ink (3px) as flood boundary to close AA gaps in the original outline. Saved `taco-original.png` (filibertos source) and `taco-regions-v1.png` (this version) so we can iterate safely.
  (2) **getTacoRegions(uv)** returns vec4(silhouette, ink, isShell, isFilling). Backwards-compatible getTacoMask wraps `.xy`. ink test changed from `tex.a * (1 - tex.r)` (which falsely flagged green-filling as 0.69-ink) to `tex.a * step(maxRGB, 0.5)` (true only when ALL channels < 0.5).
  (3) **shellFractal(uv)** — 8-iter Julia set with orbit-trap palette in plasma orange-amber-cream family. Per-device Julia constant `jc = vec2(cos(t + fract(seed)*TAU)*r, sin(t + fract(seed2)*TAU)*r)` where `r = mix(0.55, 0.85, fract(seed))`. Audio modulates jc by ±0.02 via roughness/centroid (subtle, no phase strobing). Adapted from `shaders/wooli/2.frag`'s 80-iter juliaSet — leaner since shell is fill texture, not hero.
  (4) **Composite block uses isShell mask** so fractal renders ONLY in the red shell region. Filling keeps plasma raymarch (cosmic lettuce). Untagged interior pixels (edge AA) fallback to plasma-with-trail. **Pattern recorded:** mask textures with multiple region colors are a powerful way to apply different effects to different parts of a logo. The 4-channel return (silhouette, ink, region1, region2) generalizes to N regions via a tagged texture.
  (5) **Zoom fix** — BASS_PEAK now adds `beat_pulse * 0.7` so EVERY detected beat fires SOME pulse (was failing on quiet-bass tracks where bassN < 0.25 gate). Widened bassN smoothstep 0.25→0.80 down to 0.15→0.65 so even modest bass triggers. **Pattern:** when a "should fire on beat X" effect doesn't fire reliably, the gate threshold is too high — drop it AND add the latched controller signal as a parallel trigger.

## Todo
- `[ ] Try taco-original.png in URL (?image=images/taco-original.png) to compare brand recognition vs region-colored version. The original might read cleaner as a logo since the fill colors are subtle in v1.`
- `[ ] If shellFractal breathing feels too subtle, consider making bass_smooth contribution stronger or adding music-driven c-radius modulation.`
- `[ ] knob_15 still wired to the disabled drip block. Wire to AURORA RIBBON intensity or shellFractal brightness.`

## Forks-from
Came from `journals/taco-kandi-6-cool-moments.md` at iter 49 baseline. See that journal for iters 38-49 lineage including:
- Iter 45: nebula fog removal (the persistent flash culprit, found via pixel-sampling hunter)
- Iter 45: chrome rim de-magenta'd
- Iter 46: OUTLINE_RADIATION FORM landed
- Iter 47: radiation horizon extended
- Iter 48: AURORA RIBBONS interior
- Iter 49: OUTLINE PHOTON RING

## Design hypotheses for v(next)
- **Region-tagged textures** as a pattern: instead of fighting to detect "shell vs filling" via geometric heuristics in the shader, encode the regions in the source image as channel colors. Cheap to author, instant to read, generalizes to any logo with multiple parts (cup vs straw, body vs accessories, etc.).
- **Wooli-style fractals work great as "fill textures"** when shrunk from 80 iters to 8 — preserves the seeded uniqueness without burning GPU. Useful for branded fills where the brand-zone is a small portion of the frame.
- **beat_pulse from controller is the right "always-fires" signal** for any beat-locked effect — its exp-decay holds the pulse visible through the kick, unlike the raw `beat` boolean which is a single frame.
