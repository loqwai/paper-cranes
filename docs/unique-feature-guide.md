# Choosing Unique Audio Features for Visually Distinct Animations

When a shader drives multiple visual elements (lines, layers, particles, etc.) from different audio features, the goal is to make each element look **obviously different** — different timing, different character, different response to the music. This guide captures hard-won lessons from building multi-feature shaders.

## The Core Problem

Many audio features secretly track the same thing: **loudness**. When the music gets loud, bass goes up, energy goes up, treble goes up, flux goes up. If you naively assign these to different visual elements, they all move in sync and your "8 unique features" look like 1 feature drawn 8 times.

## Rule 1: Pick Features from Different Domains

The 14 audio features fall into distinct domains. Features within the same domain tend to correlate. Pick from **different domains** for maximum visual variety.

| Domain | Features | What It Measures |
|--------|----------|-----------------|
| **Frequency Bands** | `bass`, `mids`, `treble` | How much energy in low/mid/high frequencies |
| **Spectral Shape** | `spectralCentroid`, `spectralSpread`, `spectralSkew`, `spectralKurtosis` | The statistical shape of the frequency distribution |
| **Spectral Quality** | `spectralRoughness`, `spectralEntropy`, `spectralCrest` | Character/texture of the sound |
| **Temporal** | `spectralFlux` | Rate of timbral change |
| **Tonal** | `pitchClass`, `spectralRolloff` | Pitch identity and harmonic cutoff |
| **Energy** | `energy` | Overall loudness |

## Rule 2: Decorrelate from Energy

Features that correlate with loudness need to be **decorrelated** by subtracting the energy z-score. This reveals the feature's unique character rather than just "the music got loud."

```glsl
// BAD: bass and treble both spike when music is loud
#define BASS_SIGNAL bassZScore
#define TREBLE_SIGNAL trebleZScore

// GOOD: shows bass CHARACTER vs treble CHARACTER
#define BASS_SIGNAL (bassZScore - energyZScore)       // full decorrelation
#define TREBLE_SIGNAL (trebleZScore - energyZScore)    // full decorrelation
```

### How much to decorrelate

Not all features need the same amount. Use full decorrelation for features that strongly track energy, partial for moderate correlation, and none for features that are naturally energy-independent.

| Decorrelation | Features | Reasoning |
|--------------|----------|-----------|
| **Full** (`- energyZScore`) | `bass`, `treble` | Strongly track loudness |
| **Partial** (`- energyZScore * 0.5`) | `spectralFlux`, `mids` | Moderately track loudness |
| **Light** (`- energyZScore * 0.3`) | `spectralRoughness` | Slight correlation |
| **None** | `spectralEntropy`, `spectralCrest`, `pitchClass`, `spectralSkew`, `spectralRolloff`, `spectralKurtosis` | Already energy-independent |

## Rule 3: Avoid Hidden Correlations

Some features measure "the same thing from different angles" even though they have different names. These pairs will track similarly even after energy decorrelation:

| Pair | Why They Correlate | What to Do |
|------|-------------------|------------|
| `spectralEntropy` + `spectralCrest` | Crest is roughly inverse-entropy (peaked vs spread) | They're a **good** pair if you want contrast — but don't expect independent movement |
| `spectralEntropy` + `spectralKurtosis` | Both measure peaked-vs-flat spectrum from different angles | Pick one, not both |
| `treble` (decorrelated) + `spectralEntropy` | After removing energy, treble's residual = "high-freq complexity" ≈ entropy | Replace treble with something else |
| `spectralSkew` + `spectralCrest` | Both respond to prominent spectral peaks | Pick one, not both |
| `spectralCentroid` + `pitchClass` | Both relate to which frequency dominates | Pick one, not both |
| `spectralSpread` + `spectralEntropy` | Wider spectrum often means more complex | Pick one, not both |
| `energy` + `bass` | Both increase with loud low frequencies | Always decorrelate, or just use one |

## Rule 4: The "Temporal Signature" Test

The best way to judge independence is to think about **when** each feature moves:

| Feature | Temporal Character | What Makes It Move |
|---------|-------------------|-------------------|
| `bass` (decorrelated) | Slow heavy swells | Kick drums, sub-bass, bass guitar |
| `mids` (decorrelated) | Warm sustained body | Vocals, guitars, piano chords |
| `spectralFlux` | Sharp transient bursts | Any sudden timbral change — hits, transitions |
| `spectralEntropy` | Smooth slow wandering | Noise vs tone — crowd noise vs clean note |
| `spectralRoughness` | Gritty mid-speed texture | Dissonance, distortion, beating frequencies |
| `spectralCrest` | Peaky inverse-of-entropy | Pure tones spike it, noise drops it |
| `pitchClass` | Discrete quantized jumps | Note changes — quantized steps, not smooth |
| `spectralRolloff` | Bright/dark shifts | Where high frequencies cut off — cymbal hits vs muffled passages |

If two features would move at the "same time for the same reason," they'll look similar in your shader.

## A Proven 8-Feature Set

This combination was tested and refined across many songs. Each feature occupies a different temporal niche:

```glsl
// --- Energy-correlated (decorrelated) ---
#define F0 (bassZScore - energyZScore)              // Frequency Bands: low-end character
#define F1 spectralRolloffZScore                     // Tonal: bright vs muffled
#define F2 (spectralFluxZScore - energyZScore * 0.5) // Temporal: transient bursts
#define F3 spectralEntropyZScore                     // Quality: chaos vs order
#define F4 (spectralRoughnessZScore - energyZScore * 0.3) // Quality: grit/dissonance
#define F5 spectralCrestZScore                       // Quality: peaky vs smooth
#define F6 pitchClassZScore                          // Tonal: which note
#define F7 (midsZScore - energyZScore * 0.5)         // Frequency Bands: mid-range body
```

### Why these 8?

| Feature | Domain | Why It's Included |
|---------|--------|------------------|
| bass | Frequency Bands | Foundation — everyone expects to see the kick drum |
| spectralRolloff | Tonal | Unique bright/dark dimension no other feature captures |
| spectralFlux | Temporal | Only feature that measures rate-of-change |
| spectralEntropy | Spectral Quality | Noise vs tone — smooth, independent wanderer |
| spectralRoughness | Spectral Quality | Dissonance/grit — responds to distortion and beating |
| spectralCrest | Spectral Quality | Inverse of entropy — spikes on pure tones |
| pitchClass | Tonal | Quantized note jumps — completely different movement style |
| mids | Frequency Bands | Vocals/instruments body — fills the mid-range gap |

### What was excluded and why

| Feature | Why Excluded |
|---------|-------------|
| `energy` | Redundant with bass after decorrelation |
| `treble` | After energy decorrelation, tracks too similarly to entropy |
| `spectralCentroid` | Semi-correlates with pitchClass |
| `spectralSpread` | Correlates with entropy |
| `spectralKurtosis` | Correlates with entropy (both measure peaked-vs-flat) |
| `spectralSkew` | Correlates with spectralCrest |

## Rule 5: Use Secondary Features for Secondary Roles

When each visual element has multiple properties (width, glow, color shift), drive each property with a **different** feature from a **different** domain. Use slower-changing statistical variations for secondary roles:

```glsl
// Primary: z-score drives the main animation (fast, reactive)
#define BASS_SIGNAL (bassZScore - energyZScore)

// Width: driven by a complementary feature's normalized value (smooth)
#define BASS_WIDTH spectralRoughnessNormalized

// Glow: driven by another feature's median (very slow, ambient)
#define BASS_GLOW energyMedian

// Hue shift: driven by yet another feature's normalized value
#define BASS_HUE spectralCentroidNormalized
```

### Good statistical variations for each role

| Role | Best Variation | Why |
|------|---------------|-----|
| Main animation | `ZScore` | Most reactive, centered around 0, shows anomalies |
| Line/shape width | `Normalized` | Smooth 0-1, no sudden jumps |
| Glow/brightness | `Median` | Very slow-changing, creates ambient evolution |
| Color/hue shift | `Normalized` | Smooth 0-1, good for mapping to hue ranges |
| Trend indicators | `Slope * RSquared` | Shows confident directional trends |
| Confidence/opacity | `RSquared` | 0-1, represents how "steady" the signal is |

## Rule 6: Validate Visually

Theory only gets you so far. Always test with actual music and look for:

1. **Lines/elements that move in sync** → they're correlated, swap one out
2. **Lines that never move** → the feature might not vary much for that genre, pick something more reactive
3. **All elements responding to the same musical events** → need more decorrelation or different domains
4. **Elements that look like mirror images** → they're inversely correlated (e.g., entropy and crest), which may or may not be what you want

Good test songs have variety: quiet→loud dynamics, tonal→noisy textures, different instruments. "Bohemian Rhapsody" by Queen is a good stress test because it has a cappella, piano, opera, hard rock, and soft ballad sections all in one song.
