# Shader Design Principles for Demo Videos
*Analysis completed: 2025-10-05*

## Core Problem
Creating visualizations that demonstrate the platform's audio analysis capabilities through recorded demo videos. Initial attempts (line-dance, energy-pulse) were "blurry and ugly", "noisy", and "not representative of musical elements".

## Key Insights

### 1. Purpose: Product Demonstration
- These shaders are for demo videos showing potential customers what the platform can do
- Each shader must clearly demonstrate specific audio analysis capabilities
- Viewer should understand "this visual element = this audio feature" without explanation
- Quality bar: "Could this be used in a product demo video to impress potential customers?"

### 2. Visual Clarity Without Boring Separation
**WRONG APPROACH:** Spatial separation into lanes (rejected as "boring")
**RIGHT APPROACH:**
- Lines/elements CAN cross and overlap
- Distinction through: dynamic brightness, color saturation, glow effects, motion
- UV distortion for interesting trails
- Frame feedback (getLastFrameColor) with offset sampling
- Crisp rendering with bold, thick lines

### 3. Dynamic Effects for Visual Interest
- Glow that pulses with feature intensity
- Color saturation changes: bright on peaks, desaturated on lows
- UV offset sampling creates flowing trails
- Chromatic aberration for shimmer
- Fade trails dynamically based on audio

### 4. Audio-Visual Mapping Requirements
Each shader must clearly show which visual elements map to which audio features:

**Line-dance:** 6 independent features as crossing waveforms
- energy, spectralCentroid, bass, spectralSpread, mids, spectralFlux
- Lines cross but stay distinct through color + dynamic effects

**Harmonic-field:** Spatial frequency distribution evolution
- spectralSpread, spectralCentroid, spectralKurtosis, spectralSkew, spectralRolloff
- Particles show how harmonic content changes over time

**Energy-pulse:** Rhythm and dynamics (NEEDS REDESIGN)
- energy, bass, spectralFlux, beat detection
- Should clearly show rhythm elements, not just concentric circles
- Consider: bar graph, pulse indicators, beat flashes

**Texture-weave:** Spectral quality features
- spectralRoughness, spectralEntropy, spectralRolloff
- Visual texture that represents audio texture

**Holistic-organism:** All features unified
- All 14 features mapped to different aspects of an organic form
- Tentacles, body parts, motion, texture all responsive

### 5. Technical Strategies

**UV Distortion:**
- Warp previous frame based on audio features
- Bass creates vertical waves, treble creates horizontal shifts
- Sample at offset UV coordinates for trailing effects

**Dynamic Rendering:**
- Thicker, bolder lines with crisp edges
- smoothstep for anti-aliasing
- Multiple render passes: base + glow + trails

**Color Strategy:**
- Energy-pulse: warm colors (red/orange/yellow) for rhythm/dynamics
- Texture-weave: cool/neutral (blue/gray/white) for analytical
- Holistic-organism: full spectrum
- Each shader distinct color palette

**Feature Independence:**
- Energy-pulse: energy, bass, flux, beat (all dynamics - thematically consistent)
- Texture-weave: roughness, entropy, rolloff (all spectral quality)
- Line-dance: 6 independent features across different domains
- Avoid covariant features (energy+bass together is OK if theme is dynamics)

### 6. Quality Criteria
Before moving to next shader:
1. ✓ Visual-audio mapping is OBVIOUS
2. ✓ Responds clearly to musical changes (drops, builds, quiet parts)
3. ✓ Aesthetically beautiful (color harmony, smooth motion, balanced composition)
4. ✓ Shows pattern repetition when song loops

### 7. Iteration Strategy
- Try 5-10 completely different visual approaches first
- Screenshot each approach
- Analyze which best demonstrates capabilities
- For promising approaches: iterate parameters 20-30 times
- Create video recordings of top candidates
- Refine based on video analysis

### 8. Video Recording
- Use Playwright browser.newContext({recordVideo: {dir: 'videos/'}})
- 20-30 second clips showing shader responding to music
- Capture different musical moments: drops, builds, verses
- System audio capture may need alternative approach

## Implementation Priority
1. Redesign line-dance: UV distortion + dynamic glow + crisp rendering
2. Review harmonic-field: may need improvements
3. Redesign energy-pulse: clear rhythm visualization
4. Create texture-weave: spectral quality with visual flair
5. Create holistic-organism: unified creature with mapped features
6. Set up video recording pipeline
7. Iterate each shader 20+ times
8. Create final demo videos

## Lessons Learned
- "Passable but not good" is not acceptable
- Overlapping elements need distinction through dynamics, not just separation
- Boring solutions (like lane separation) sacrifice visual interest
- Quality bar is higher than expected - these represent the product
- Beauty + clarity + representativeness all required simultaneously
