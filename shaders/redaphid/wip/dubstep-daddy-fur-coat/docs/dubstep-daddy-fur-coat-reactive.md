# dubstep-daddy-fur-coat-reactive — Audio-Reactive Variant

Copy of the static fur coat with the coat shape, color, and texture all responding to music.

## Audio feature mapping

| Audio Feature | Coat Response |
|---------------|---------------|
| `bassZScore` | Shoulders shrug up, color brightens |
| `bassNormalized` | Chest breathes wider |
| `trebleZScore` | Sleeves flare outward |
| `energyZScore` | Fur bristles thicker, V-neck opens wider |
| `IS_DROP + energyZScore` | Color shifts pink → hot peach/yellow |
| `spectralFluxNormalized` | Chrome rim blazes brighter, shoulder gleam pulses |
| `spectralEntropyNormalized` | Fractal fur fibers appear inside the coat |
| `spectralRoughnessNormalized` | Fractal fur fibers appear (combined with entropy) |
| `spectralKurtosisZScore` | Boosts fractal trigger when spectrum is peaked |
| `spectralCentroidNormalized` | Drives fractal warp speed (pitch-aware swirl) |

Uses 21 audio features total.

## Fractal fur fibers

The headline feature. Double domain-warped fbm producing swirling chrome-tinted strands that look like individual fur fibers catching light.

Triggered by spectral quality features (entropy, roughness, kurtosis) — completely independent from the energy/bass features that drive the eyes. The coat and eyes react to DIFFERENT musical qualities:
- **Eyes** blast on drops (energy)
- **Coat fibers** swirl on timbral complexity (entropy/roughness)

The warp speed is driven by `spectralCentroidNormalized` so the swirl rate tracks pitch — higher pitch = faster swirl.

## Design intent

The coat should feel alive — not just changing color, but physically responding. The shoulders shrug on bass hits like he's feeling the weight of the drop. The sleeves flare on snare like he's throwing his hands. The fur bristles up on energy spikes like static electricity. And when the music gets spectrally complex (lots of harmonics, dissonance, unpredictability), the coat's surface comes alive with swirling fractal fiber patterns.

## Testing

Idle (low audio):
```
?shader=claude/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&noaudio=true&time=3.5&bassNormalized=0.3&energyNormalized=0.3&spectralEntropyNormalized=0.3&spectralRoughnessNormalized=0.3
```

Fractal fibers visible (high entropy/roughness):
```
?shader=claude/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&noaudio=true&time=3.5&bassNormalized=0.5&energyNormalized=0.5&spectralEntropyNormalized=0.9&spectralRoughnessNormalized=0.8&spectralKurtosisZScore=0.5&spectralCentroidNormalized=0.5
```

Full drop:
```
?shader=claude/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&noaudio=true&time=3.5&bassNormalized=0.95&energyNormalized=0.95&trebleZScore=1.5&energyZScore=2.5&energySlope=0.3&energyRSquared=0.95&spectralFluxNormalized=0.9&bassZScore=2.0
```
