# plasma-taco-live

A more reactive, more dynamic **plasma taco**, rebuilt on the reactivity stack from the
`iris` and `chromadepth-lattice` series.

`shaders/redaphid/taco/plasma.frag` is untouched — this is a sibling, so the two can be
A/B'd live.

## Run it

```
http://localhost:6969/?shader=redaphid/taco/plasma-taco-live&image=images/taco-stencil.png&wavelet=true&controller=wavelet-ease&fullscreen=true
```

`?wavelet=true&controller=wavelet-ease` are **required** — they are where all the reactivity
comes from. Add `&audio=tab` for Spotify/SoundCloud on Chrome desktop, or use `jam.html`
instead of `/` for the knob drawer.

Without them the controller uniforms read 0 and the shader degrades to a calm, dim, still
taco. That is deliberate (it is what `quietGate` does), not a failure mode.

## What the original does today

`redaphid/taco/plasma.frag` raymarches the Ether (nimitz) nested-sin plasma fold inside the
taco stencil. Its audio comes from **FFT z-scores** plus three uniforms from the `taco-kandi`
controller (`beat_pulse`, `bass_smooth`, `drop_glow`). Two structural problems, both named in
`docs/advanced-shader-techniques.md`:

- `#define t (iTime + T_ADVANCE)` where `T_ADVANCE` is a sum of raw z-scores — audio is
  injected **into the plasma's time**, and that `t` then feeds `m(t * 0.4 * SHAPE_TWIST)`,
  i.e. into a **rotation angle**. §1/§2: transients in a phase shiver, and audio in an angle
  rocks backward when the feature falls.
- **No `quietGate`.** In a quiet room the `Normalized`/z-score features divide by a near-zero
  recent range and blow up, so silence drives full-range motion.

Net effect: it is busy, but the busyness is only loosely coupled to the music, and quiet
passages do not look meaningfully different from loud ones.

## Techniques taken

### From `redaphid/iris/1.frag`
- **The signal-conditioning discipline.** Everything continuous is driven by the
  `wavelet-ease` controller's critically-damped-spring `*Spring` uniforms and the EMA-smoothed
  `spectralCrestSmooth` / `spectralRoughnessSmooth` / `spectralEntropySmooth`.
- **`quietGate` on every audio offset.** Quiet is now genuinely calm and dark.
- **Monotonic phase accumulators.** `flowPhase` / `morphPhase` / `spinPhase` / `huePhase`
  (`phase += rate*dt` in JS) replace every `iTime * rate`, which avoids the acceleration bug
  where a rate change jumps the angle by `iTime * Δrate`.
- **Audio moves amplitude and shape, never a phase or an angle.** `DENSITY`, `WAVE_AMP` and
  `BASS_PUMP` take the audio; `PLASMA_PHASE` never does.
- **Feature→region families.** `coreW`/`armW`/`tipW` radial weights: bass owns the core, mids
  the arms, treble the tips. PITCH (`melodyFlow`) → colour, LEVEL (bands) → size/depth,
  TEXTURE (crest/roughness) → detail/sparkle.
- **Single-lightness discipline.** One traversal scalar `s` and one lightness `lit`, instead of
  a cascade of `L *=` / `C *=` that stacks into washout.
- **Tunnel feedback rush** — previous frame sampled inward so content scales outward: falling
  into the event horizon. Rate from bass + drop, strength on `knob_8`.
- **Kick-zoom that springs back** (§5 "bass you can feel"): smooth `waveletBassSpring` swell
  for the build, raw `waveletBassZScore` / `wavelet_bassHit` for the hit, both driving zoom.

### From `redaphid/chromadepth-lattice/6.frag`
- **`bandForDepth()` — depth-coherent reactivity.** The single biggest change. Each raymarch
  step is assigned an owning frequency band: near steps shimmer with treble, middle steps with
  low-mids, far steps throb with deep bass. The band tightens the fold and lights its own depth
  slice, so the spectrum is laid out *through* the plasma volume front-to-back rather than
  modulating the whole field uniformly.
- **`lush()` bounded Oklch palette** — high chroma, hard L ceiling, no muddy mid-mixes.
- **Glow lift** (gamma 0.86 then ×1.10) so mid-tones emit and it reads from across a room.
- **Musical bloom** — smooth swell lifts the whole image, the kick thumps on top.
- **Drifting sparkle patches** gated to structure (not a grid).

### From `controllers/wavelet-ease.js` directly
- **Section-driven palette.** The original rotated palette on a 25-second wall clock. Here the
  family advances on `sectionMode` — the controller's sustained-quiet-then-energy-surge
  detector — and crossfades over `sectionMix`. Colour changes because the **music** changed
  section. Golden-ratio hop (`fract(sectionMode * 0.61803)`) keeps consecutive families
  maximally distinct.
- **`evoWarp` / `evoPlasma`** minutes-scale drifters bias the fold softness and density, so a
  long set never looks the same twice.

## Fixes to inherited behaviour

- **The taco body now actually fills.** The original derived its interior mask by probing four
  neighbours 30px away for ink and filling only where ink surrounded the pixel — so the taco's
  large smooth areas never filled and sat black, and plasma only peeked through near drawn
  detail. The stencil's **alpha channel is the silhouette**, so this uses that as the fill mask
  and keeps the ink-proximity value as a *detail* weight instead.
- **God rays are gated to the silhouette** (as the original did) with a tighter `exp(-r*3.2)`
  falloff. Ungated they took over the whole frame and buried the plasma.
- **The chrome rim is a tint, not an add.** The original added it at ~5× gain, which clipped
  the ink to flat white and threw the hue away. Mixing toward chrome keeps the rim coloured
  regardless of how bright the plasma behind it gets.
- **Sparkle is gated to structure.** Ungated it painted a regular dot grid over the void, which
  reads as a screen artefact.

## Quiet vs loud

Measured mean screen luminance over the A/B shots
(`node scripts/shot-plasma-taco-live.mjs`, 1024×1024):

| state | mean | lit pixels |
|-------|------|-----------|
| quiet | 10.9 | 14 % |
| loud  | 31.9 | 27 % |
| drop  | 43.7 | 41 % |

For reference the original measures 5.6 → 17.0 (4 % → 13 %) over the same quiet/loud pair.

Visually: **quiet** is a dark, slow, moody filled taco on a black void. **Loud** fills with
plasma, the chrome rim lights up and a plasma corona starts to burst out past the ink.
**Drop** changes palette family outright, the corona blooms well beyond the silhouette and the
core flares. The black void is the *resting* state, not the permanent one.

## Knobs

All default to 0 and 0 is a usable look; they are depths, not requirements.

| knob | role |
|------|------|
| `knob_1` | plasma flow speed |
| `knob_2` | zoom (0 wide → 1 pushed in) |
| `knob_3` | fold density / detail |
| `knob_4` | **master reactivity depth** |
| `knob_5` | corona reach outside the silhouette |
| `knob_6` | kaleidoscope fold (0 off → 1 twelvefold) |
| `knob_7` | chrome rim glow |
| `knob_8` | tunnel feedback rush |
| `knob_9` | sparkle |
| `knob_10` | gravitational lensing |

Tuned starting point:
`knob_1=0.45&knob_2=0.25&knob_3=0.35&knob_4=0.6&knob_5=0.6&knob_7=0.5&knob_8=0.5&knob_9=0.5&knob_10=0.3`

## Iterations

- **plasma-taco-live.frag** — first version. Built directly on the iris/lattice stack rather than by editing
  the original, because the changes were structural (every audio path, the clock source, the
  palette driver and the composite were all replaced).
