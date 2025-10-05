# Audio Features Independence Analysis

**Date:** 2025-10-05
**Issue:** Line-dance shader ribbons showing too much covariance - need visual variety

## Sequential Thinking Process

### Thought 1: Understanding the Audio Feature Landscape

I need to understand the complete audio feature landscape from hypnosound. From the code I've read:

**14 Core Features:**
- bass (0-400 Hz energy)
- mids (400-? Hz energy)
- treble (high frequency energy)
- energy (total loudness/power)
- pitchClass (dominant frequency mapped to 0-11 semitone, normalized 0-1)
- spectralCentroid (center of mass of spectrum - where energy is concentrated)
- spectralSpread (variance/width of frequency distribution)
- spectralSkew (asymmetry - tilted toward bass or treble)
- spectralKurtosis (peakedness - focused vs diffuse)
- spectralFlux (rate of spectral change - timbral transitions)
- spectralRolloff (frequency where high frequencies die out)
- spectralRoughness (dissonance/beating frequencies)
- spectralEntropy (unpredictability/complexity)
- spectralCrest (peakiness - max amplitude / mean amplitude)

**Each feature has 8 statistical variations:**
- value (raw current value)
- normalized (min-max normalized to 0-1)
- mean (historical average)
- median (historical median)
- min/max (historical bounds)
- standardDeviation (variability)
- zScore (standardized to ~-1 to 1, scaled by 2.5)

### Thought 2: Identifying Covariance vs Independence

Now I need to understand which features would be INDEPENDENT vs COVARIANT to fix the "too covariant" problem:

**Highly Covariant (tend to move together):**
- energy + bass (both increase with loud low frequencies)
- energy + spectralFlux (big changes often involve energy changes)
- spectralCentroid + pitchClass (both relate to pitch)
- spectralSpread + spectralKurtosis (both describe distribution shape)

**More Independent features that would show variety:**
- bass vs treble (opposite frequency ranges)
- spectralCentroid vs spectralRoughness (pitch center vs dissonance)
- spectralEntropy vs spectralCrest (chaos vs peakiness)
- spectralFlux vs spectralRolloff (rate of change vs frequency cutoff)
- spectralSkew vs energy (harmonic tilt vs loudness)
- pitchClass vs spectralKurtosis (pitch vs distribution shape)

For the line-dance shader to show VARIETY, I should pick features that are more independent!

### Thought 3: Updating prompts/line-graph.md

What needs to be in the updated prompts/line-graph.md:

1. **Correct feature definitions** with what they actually measure (from hypnosound source)
2. **Feature independence guide** - which features vary independently for more visual variety
3. **Musical interpretation** - what each feature tells you about the music:
   - bass/mids/treble = frequency band energy (simple, direct)
   - energy = total loudness (correlates with bass)
   - pitchClass = which note (0-11 semitone wheel)
   - spectralCentroid = "brightness" (where energy lives in spectrum)
   - spectralSpread = "width" of sound (narrow lead vs wide chord)
   - spectralSkew = "tilt" (dark/bassy vs bright/trebly)
   - spectralKurtosis = "focus" (laser-focused vs diffuse)
   - spectralFlux = "change rate" (how fast timbre shifts)
   - spectralRolloff = "where highs die" (cutoff frequency)
   - spectralRoughness = "grittiness" (dissonance, beating)
   - spectralEntropy = "chaos" (unpredictable vs predictable)
   - spectralCrest = "peakiness" (spiky vs smooth spectrum)

4. **Statistical variation usage:**
   - zScore = detect anomalies, drops, spikes
   - normalized = smooth 0-1 modulation
   - mean/median = baseline character over time
   - min/max = historical range context

### Thought 4: Comprehensive CLAUDE.md Structure

What needs to be in the updated CLAUDE.md:

Should ADD a comprehensive section on:

**## Audio Features Reference**

### Core Features (14 total)
[Detailed table with: Name | Range | What It Measures | Musical Meaning | Independence Notes]

### Statistical Variations (8 per feature)
- How each stat is calculated
- When to use each stat type
- Examples of usage in shaders

### Feature Independence Matrix
- Which features are covariant (avoid pairing)
- Which features are independent (good for variety)
- Suggested feature combinations for different visualization goals

### Shader Design Patterns
- Using bass/mids/treble for simple frequency reactivity
- Using spectral features for complex timbral analysis
- Combining stats for musical structure detection
- Creating variety by choosing independent features

This will be THE reference doc that explains the complete audio system.

### Thought 5: Fixing line-dance.frag

How to fix line-dance.frag for more variety:

Current problem: Using centroid, spread, flux, energy, roughness, entropy
- centroid + flux are somewhat covariant (pitch changes often involve flux)
- spread + entropy are somewhat covariant (wider = more complex)
- energy affects everything

Better choice for 6 INDEPENDENT ribbons:
1. **bass** - low frequency energy (clear, simple)
2. **treble** - high frequency energy (opposite of bass)
3. **spectralCentroid** - brightness/pitch center
4. **spectralRoughness** - dissonance/grittiness (independent of pitch)
5. **spectralCrest** - peakiness vs smoothness (independent of others)
6. **pitchClass** - actual note (0-1 represents note wheel)

OR even more independent:
1. **bassZScore** - bass energy spikes
2. **trebleZScore** - treble energy spikes
3. **spectralSkewZScore** - harmonic tilt shifts
4. **spectralKurtosisZScore** - focus changes
5. **spectralRoughnessZScore** - dissonance shifts
6. **spectralEntropyZScore** - chaos shifts

The zScore versions will show WHEN things change, giving more visual variety!

### Thought 6: Order of Operations

Order of operations:

1. **First: Update CLAUDE.md** - Create the comprehensive reference
   - This becomes the source of truth
   - Will guide all other updates

2. **Second: Update prompts/line-graph.md** - Fix the prompt
   - Reference the CLAUDE.md for accuracy
   - Add feature independence guidance
   - Fix the musical interpretation examples

3. **Third: Fix line-dance.frag** - Apply the learning
   - Use truly independent features
   - Test to verify more variety
   - Document the chosen features and why

This order ensures consistency and each step builds on the previous.

### Thought 7: CLAUDE.md Table Structure

Key structure for CLAUDE.md audio features section:

```markdown
## Audio Features Reference (Hypnosound)

### The 14 Core Features

| Feature | Range | Measures | Musical Meaning | Independence |
|---------|-------|----------|-----------------|--------------|
| bass | 0-1 | 0-400Hz energy | Low-end power | Independent from treble |
| mids | 0-1 | Mid-range energy | Body/warmth | Semi-independent |
| treble | 0-1 | High freq energy | Brightness/air | Independent from bass |
| energy | 0-1 | Total amplitude | Loudness | Correlates with bass |
| pitchClass | 0-1 | Note (0-11)/12 | Which note playing | Independent from timbre |
| spectralCentroid | 0-1+ | Center of mass | Brightness/pitch center | Semi-correlates with pitch |
| spectralSpread | 0-1+ | Frequency variance | Harmonic width | Independent from centroid |
| spectralSkew | varies | Distribution tilt | Dark vs bright tilt | Independent from spread |
| spectralKurtosis | 0-1 | Peakedness | Focus vs diffuse | Independent from skew |
| spectralFlux | 0-1+ | Rate of change | Timbral motion | Semi-correlates with energy |
| spectralRolloff | 0-1+ | High freq cutoff | Where highs die | Independent from others |
| spectralRoughness | 0-1+ | Dissonance | Grittiness/beating | Independent from pitch |
| spectralEntropy | 0-1+ | Unpredictability | Chaos vs order | Independent from most |
| spectralCrest | 0-1+ | Peak/mean ratio | Spiky vs smooth | Independent from others |
```

Each has 8 stats: value, normalized, mean, median, min, max, standardDeviation, zScore

### Thought 8: Prompt Update Details

For the prompt update (prompts/line-graph.md), need to add:

**Section on Feature Independence:**
"Choose features that vary independently to create visual variety. Avoid pairing:
- energy + bass (highly covariant)
- centroid + pitchClass (both pitch-related)
- spread + kurtosis (both describe distribution)

Good independent pairings:
- bass vs treble (opposite bands)
- centroid vs roughness (pitch vs dissonance)
- crest vs entropy (peakiness vs chaos)
- skew vs kurtosis (tilt vs focus)
- flux vs rolloff (change vs cutoff)

**Better approach for variety:**
Use features from different domains:
- Frequency bands: bass, mids, treble
- Spectral shape: centroid, spread, skew, kurtosis
- Spectral quality: roughness, entropy, crest
- Temporal: flux
- Tonal: pitchClass, rolloff"

This will guide better feature selection!

### Thought 9: Concrete Fix Implementation

Concrete fix for line-dance.frag - replace the 6 ribbons:

**BEFORE (too covariant):**
- spectralCentroid + spectralSpread (both describe spectrum shape)
- spectralFlux + energy (changes often involve energy)
- roughness + entropy (both complexity-related)

**AFTER (independent variety):**
1. bassZScore - bass energy spikes (low freq domain)
2. trebleZScore - treble energy spikes (high freq domain)
3. spectralCentroidNormalized - pitch brightness (spectral center)
4. spectralKurtosisZScore - focus changes (spectral shape)
5. spectralRoughnessNormalized - dissonance level (spectral quality)
6. pitchClassNormalized - actual note (tonal)

This gives us 6 truly independent dimensions:
- Freq bands: bass vs treble
- Spectral: centroid (center) vs kurtosis (shape)
- Quality: roughness (dissonance)
- Tonal: pitchClass (note)

Each will move independently, showing true variety!

### Thought 10: Final Action Plan

Final action plan summary:

1. Get the full sequential thinking history and save to ./logs/audio-features-independence.md
2. Update CLAUDE.md with comprehensive audio features documentation
3. Update prompts/line-graph.md with feature independence guidance
4. Fix line-dance.frag to use independent features:
   - bassZScore, trebleZScore, spectralCentroidNormalized, spectralKurtosisZScore, spectralRoughnessNormalized, pitchClassNormalized
5. Test the fix to verify more visual variety
6. Commit all changes with descriptive message

This will establish the foundation of audio feature understanding for all future shader work and fix the covariance problem.

## Conclusion

The key insight is that audio features can be grouped by domain:
- **Frequency bands** (bass/mids/treble) - physically separate
- **Spectral shape** (centroid/spread/skew/kurtosis) - describe distribution
- **Spectral quality** (roughness/entropy/crest) - describe texture
- **Temporal** (flux) - describes change rate
- **Tonal** (pitchClass/rolloff) - describes pitch/harmonic content

For maximum visual variety, choose features from DIFFERENT domains. Avoid pairing features from the same domain as they will likely covary.
