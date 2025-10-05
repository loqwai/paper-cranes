I'm working on GLSL shader visualizations for audio in my paper-cranes project. I need you to create and iteratively improve 5 DIFFERENT shader files, each showcasing different aspects of audio visualization.

**Project Context:**
- Shaders are in: `shaders/graph/` directory
- Current shader: `shaders/graph/line-dance.frag`
- URL pattern: `http://localhost:6969/?shader=graph/{shader-name}`
- A song is playing on repeat through the mic - continuous loop
- You have NO control over playback and can't hear it
- But you CAN observe repeated patterns since it's the same song looping

**Critical Advantage - Repeating Audio:**
The same song loops continuously. This means:
- WAIT 3-5 seconds between screenshots to see evolution
- Look for REPEATING PATTERNS - if it's the same song, similar parts should look similar
- The chorus should look recognizably different from verses
- Major transitions (drops, builds) should be visually dramatic
- If patterns don't repeat across loops, something is broken in your visualization
- Use repetition to validate: "Does the second chorus look like the first chorus?"

**Your Mission - Create 5 Distinct Shaders:**

1. **line-dance.frag** (Multi-ribbon spectral dance)
   - Multiple stacked ribbons, each showing a different feature
   - Each feature = distinct color + vertical position
   - Goal: See the "layers" of music simultaneously
   - Emphasize: Clear visual separation between features
   - Success metric: Can you identify which line is which feature?

2. **harmonic-field.frag** (Spatial harmonic distribution)
   - Show spectral spread, skew, and kurtosis as 2D fields
   - Think: particles, gradient fields, or flowing smoke
   - Goal: Visualize the "shape" of the frequency distribution
   - Emphasize: How harmonics spread and tilt in space
   - Success metric: Do wide chords look different from narrow leads?

3. **energy-pulse.frag** (Rhythm and dynamics)
   - Focus on energy, flux, and crest
   - Radial/circular patterns that pulse with beats
   - Goal: Make rhythm and dynamics visceral
   - Emphasize: Temporal dynamics and impact
   - Success metric: Can you see the beat? Does it sync across loops?

4. **texture-weave.frag** (Roughness and entropy)
   - Highlight roughness, entropy, and rolloff
   - Think: fabric texture, noise patterns, chaos visualization
   - Goal: Show the "grain" and complexity of sound
   - Emphasize: Textural qualities that distinguish timbres
   - Success metric: Does distorted guitar look different from clean piano?

5. **holistic-organism.frag** (Everything at once)
   - Combine ALL features into one unified, complex visualization
   - Think: living creature that morphs based on music
   - Goal: Show music as a multidimensional entity
   - Emphasize: Beauty, coherence, and wow-factor
   - Success metric: Is it mesmerizing? Does it reveal song structure?

**Available audio features** (all with .value and .stats.zScore):
- spectralCentroidZScore (pitch center - where the energy lives)
- spectralSpreadZScore (harmonic bandwidth - wide or narrow)
- spectralSkewZScore (harmonic tilt - leaning bright or dark)
- spectralKurtosisZScore (peakedness - focused or diffuse)
- spectralRoughnessZScore (dissonance, grittiness)
- spectralEntropyZScore (unpredictability, chaos)
- spectralRolloffZScore (where high frequencies die out)
- spectralFluxZScore (rate of timbral change)
- energyZScore (loudness, power)
- spectralCrestMedian, etc. (median values for scaling)

**Iterative Process for EACH Shader:**

1. Create the initial shader with a clear concept
2. Navigate to: `http://localhost:6969/?shader=graph/{shader-name}`
3. Take initial screenshot: `await page.screenshot({ path: 'test-output/{shader-name}-iter-0.png' })`
4. **WAIT 5-10 SECONDS** - let enough of the song play to see structure
5. Take another screenshot: `iteration-1.png`
6. **WAIT for the song to loop** - does the pattern repeat?
7. Take screenshot at similar point in next loop: `iteration-2.png`
8. Analyze what you see:
   - Are lines continuous or broken?
   - Are features visually distinct from each other?
   - Do patterns REPEAT across song loops? (They should!)
   - Can you identify song structure (verse/chorus/bridge)?
   - Does it match the shader's intended concept?
9. Make targeted improvements
10. Repeat steps 2-8 about 5-8 times per shader

**What to Look For:**
- **Repetition consistency**: Same part of song = same visual pattern
- **Feature distinction**: Each audio feature should have its own visual identity
- **Correlation patterns**: Energy and flux often move together during transitions
- **Independence**: Centroid and roughness should move independently
- **Musical structure**: Verses should differ from choruses visually
- **Dynamic range**: Quiet intros vs loud drops should be dramatically different
- **Temporal coherence**: Smooth changes for sustained notes, sharp for percussion
- **Multi-dimensional richness**: Complex sections should show more active features

**Reasoning About Musical Structure:**
Even without hearing, you can infer:
- "Energy spike + flux spike + all features active = probably a drop or transition"
- "Centroid steady + energy pulsing rhythmically = probably a bass line with drums"
- "Centroid rising while spread narrows = likely a rising melody or buildup"
- "All features flat-lined = silence or artifact (probably bug)"
- "Pattern repeats every ~30 seconds = probably verse/chorus structure"
- "High entropy + low energy = complex but quiet (ambient pad, reverb tail)"
- "Low entropy + high energy = simple but loud (power chord, bass drop)"

**Technical Requirements:**
- No reserved GLSL words as variable names (avoid: centroid, spread, distance, etc.)
- All lines MUST be continuous (BASE_WIDTH >= 15.0 for scrolling visualizations)
- Use saturated, distinct colors - avoid muddy mixing
- Proper smoothstep parameters (large to small for fade-out)
- Clamp inputs to prevent extreme values from breaking visuals
- Use max() blending for pure colors, or additive for glow effects

**Critical Design Principles:**
1. **Separation**: Features should be obviously visually distinct
2. **Continuity**: No stippling, dots, or broken lines
3. **Saturation**: Bold colors that pop, not gray mud
4. **Mapping**: Each feature → consistent visual property
5. **Contrast**: Show the difference between simple and complex music

**Deliverables:**
- 5 complete, working shader files
- Screenshot evolution for each (6-10 iterations showing improvements)
- Written analysis of what each shader reveals about music
- Observations about repeating patterns and song structure
- Your reasoning about which visualization best reveals musical complexity
- A final recommendation with justification

**Go Beyond:**
- Think about synesthesia - what does spectral spread FEEL like?
- Consider information density - can you show 8 features without chaos?
- Explore emergence - can simple rules create complex beauty?
- Question assumptions - who says time goes left-to-right?
- Find poetry - the shader comments should hint at deeper meaning

Make me see sound. Make repeating music create recognizably repeating patterns. Show me that a chorus IS a chorus, that a bass drop DROPS, that a quiet bridge breathes differently than a loud verse. Make the invisible visible. Make it beautiful. Make it true.