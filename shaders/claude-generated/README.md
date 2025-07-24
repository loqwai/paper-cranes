# Claude-Generated Shaders

This directory contains 10 audio-reactive GLSL shaders generated during a development session on July 24, 2025.

## Shader List

### 1. quantum-particles.frag
**Concept**: Quantum particle system with wave-particle duality
- Particles exhibit quantum tunneling behavior
- Wave function collapse visualization
- Probability clouds with interference patterns
- **Knobs**: Quantum scale, tunneling probability, wave collapse, color shift, particle size

### 2. liquid-crystal.frag
**Concept**: Flowing crystalline structures with optical properties
- Hexagonal crystal lattice with flow dynamics
- Iridescent colors through thin film interference
- Refraction and internal reflection effects
- **Knobs**: Flow speed, crystal size, refraction index, color dispersion, viscosity

### 3. neural-network.frag
**Concept**: Brain-like network visualization
- Neurons connected by synapses
- Electrical pulses traveling between nodes
- Activity-based color intensity
- **Knobs**: Pulse speed, network density, synapse strength, pulse frequency, glow intensity

### 4. geometric-bloom.frag
**Concept**: Sacred geometry that blooms and fades
- Flower of Life, pentagon, and hexagon patterns
- Cyclic blooming animations
- Mandala overlays with variable symmetry
- **Knobs**: Bloom rate, geometry scale, symmetry order, fade speed, color cycle

### 5. aurora-waves.frag
**Concept**: Northern lights simulation
- Multiple curtains of light with wave motion
- Turbulence and vertical streaks
- Realistic aurora color transitions
- **Knobs**: Wave speed, wave height, color shift speed, curtain count, turbulence

### 6. fractal-garden.frag
**Concept**: Organic fractal plant growth
- Recursive branching structures
- Growing flowers and leaves
- Grid-based ecosystem
- **Knobs**: Growth speed, branch angle, fractal depth, leaf size, color variety

### 7. time-crystals.frag
**Concept**: 4D crystals rotating through time
- Crystals that change structure over time
- Temporal phase shifting effects
- Energy field visualization
- **Knobs**: Time speed, crystal complexity, temporal phase, space warp, energy glow

### 8. sonic-mandala.frag
**Concept**: Audio-reactive circular patterns
- Concentric rings responding to frequency bands
- Multi-layer rotating mandalas
- Real-time spectral visualization
- **Knobs**: Mandala layers, rotation speed, frequency response, symmetry order, pulse intensity

### 9. digital-rain.frag
**Concept**: Matrix-style falling code
- Columns of falling glyphs
- Variable speed based on audio
- Trailing effects and glitch aesthetics
- **Knobs**: Rain speed, glyph size, density, glow intensity, color variation

### 10. cosmic-web.frag
**Concept**: Large-scale universe structure
- Galaxy clusters connected by filaments
- Gravitational lensing effects
- Dark matter web visualization
- **Knobs**: Web density, filament strength, galaxy count, lensing power, dark matter

## Usage

Access any shader via URL:
```
http://localhost:6969/?shader=claude-generated/<shader-name>&embed=true
```

Example:
```
http://localhost:6969/?shader=claude-generated/quantum-particles&embed=true
```

## Audio Features

All shaders respond to:
- **beat**: Boolean beat detection
- **bass/mids/treble**: Frequency band levels
- **energy**: Overall audio energy
- **spectralCentroid**: Brightness of sound
- **spectralFlux**: Change detection
- And many more spectral features...

## Interaction

- **Knobs 1-5**: Adjust via URL parameters (`&knob_1=0.5`)
- **Touch/Mouse**: Interactive elements in each shader
- **Audio Input**: Real-time response to microphone/audio

## Testing

Run automated tests:
```bash
node ./scripts/test/all-shaders.js
```

View animation over time:
```bash
node ./scripts/test/shader-animation.js
```

Screenshots saved to: `./tmp/screenshots/`