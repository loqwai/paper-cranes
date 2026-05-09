# taco-kandi

## Concept
Kandi bracelet using the taco stencil. Julia fractal fills the taco silhouette, black outside. Seed uniforms make every phone's taco unique — different fractal family, palette, zoom region, and drift path. knob_1..4 are the live jam controls for exploring uniqueness while music plays.

## Knobs
- **knob_1** — Julia morph: 0=tight spirals (classic Douady rabbit), 1=wide blown-out filaments
- **knob_2** — Hue drift speed: 0=slow palette drift, 1=fast rainbow cycle
- **knob_3** — Edge glow: width + intensity of the taco border halo
- **knob_4** — Feedback/trails: 0=sharp fractal, 1=painterly smeared trails

## Seed uniqueness
- **seed** — lightness/depth character of the Oklch palette
- **seed2** — base hue (full circle) — determines the overall color family
- **seed3** — zoom region + chroma intensity + drift path
- **seed4** — accent hue offset + drift direction

The seed combo is set per-device (or per-URL), so every phone gets a different taco.

## Audio reactivity
- Bass makes the taco pulse/scale on kicks
- Energy drives motion intensity — nearly still at idle
- SpectralCentroid shifts hue over time (rising = getting brighter)
- Beat flash: lightness pulse on hits
- SpectralFlux + roughness control feedback refraction shimmer

## Iteration notes
- **1.frag**: First version — Julia fractal fills taco, seed-driven Oklch palette, knob_1..4 for live jamming

## Preset URL (localhost)
http://localhost:6969/?shader=redaphid/taco/plasma&image=images/taco.png
