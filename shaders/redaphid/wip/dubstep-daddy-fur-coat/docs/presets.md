# Dubstep Daddy Fur Coat — Presets

Knob presets discovered during live sessions. Each preset records the knob values and the vibe.

## How to use

Load a preset by appending the knob params to the editor URL:
```
http://localhost:6969/edit.html?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&<knob params>
```

Or set knobs programmatically in the browser console:
```javascript
Object.entries(preset).forEach(([k, v]) => window.cranes.manualFeatures[k] = v)
```

## Presets

### lost-lands
_Saved: 2026-04-14 | Music: WOOLI - Lost Lands 2025 (Full Set)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_2 | 0.472 | drop hit override (~half drop state) |
| knob_3 | 1.0 | god ray intensity (maxed — blinding) |
| knob_4 | 0.362 | eye wash strength (warm yellow tint) |
| knob_10 | 0.386 | pump / body pulse (moderate bounce) |
| knob_11 | 0.543 | snap / gesture intensity (snappy) |

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_2=0.472&knob_3=1&knob_4=0.362&knob_10=0.386&knob_11=0.543
```

**Audio character at save time:**
- (not captured — this was the first preset before we learned to grab audio state)
- Based on knob choices: half-drop with maxed god rays suggests this was during an active drop or heavy section

**Notes:** Festival headbanger. God rays cranked to max, half-drop state so the eyes are always a little lit, good body pump. Dialed in while listening to WOOLI's Lost Lands 2025 set — heavy dubstep energy.

### closeup-texture
_Saved: 2026-04-14 | Music: WOOLI - Lost Lands 2025 (Full Set)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.969 | base zoom (almost full — tight on face) |
| knob_2 | 0.087 | drop hit override (barely on) |
| knob_3 | 0.024 | god ray intensity (whisper) |
| knob_4 | 0.362 | eye wash strength (warm yellow tint) |
| knob_10 | 0.386 | pump / body pulse (moderate bounce) |
| knob_11 | 0.543 | snap / gesture intensity (snappy) |

**Audio character at save time:**
- bassNormalized: 0.217 (low), energyZScore: -0.05 (flat)
- spectralEntropyNormalized: 0.764 (high chaos — fur fibers active)
- spectralRoughnessNormalized: 0.457 (moderate dissonance)
- spectralCentroidNormalized: 0.474 (mid-bright)
- trebleNormalized: 0.537 (moderate shimmer)

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_1=0.969&knob_2=0.087&knob_3=0.024&knob_4=0.362&knob_10=0.386&knob_11=0.543
```

**Notes:** Intimate portrait mode. Zoomed tight on the face, god rays and drop almost off — letting the audio-reactive fur fibers and coat texture do all the work. High spectral entropy means the fractal fur is swirling. Best during textured, complex passages rather than drops. The eye wash gives a subtle warm glow without being overwhelming.

### full-send
_Saved: 2026-04-14 | Music: WOOLI - Lost Lands 2025 (Full Set)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.559 | base zoom (medium-tight) |
| knob_2 | 0.866 | drop hit override (near-max drop state) |
| knob_3 | 0.472 | god ray intensity (half — punchy) |
| knob_4 | 0.827 | eye wash strength (heavy yellow wash) |
| knob_5 | 1.0 | drop zoom (maxed — heavy zoom punch) |
| knob_6 | 0.622 | chest height (tall) |
| knob_7 | 0.890 | fur thickness (thicc) |
| knob_8 | 0.677 | v-neck width (wide open) |
| knob_9 | 0.039 | v-neck depth (shallow) |
| knob_10 | 0.378 | pump / body pulse (moderate) |
| knob_11 | 0.535 | snap / gesture intensity (snappy) |
| knob_12 | 0.472 | groove / sway (moderate sway) |
| knob_14 | 1.0 | drop trigger threshold (needs big energy) |

**Audio character at save time:**
- bassNormalized: 0.281 (low — bass hasn't hit yet), bassZScore: -0.344
- energyNormalized: 0.512, energyZScore: +0.198 (building)
- midsNormalized: 0.165 (scooped out — classic pre-drop)
- spectralCentroidNormalized: 0.815 (bright), spectralCentroidZScore: +0.377
- spectralRoughnessNormalized: 0.584 (gritty), spectralRoughnessZScore: +0.257
- spectralEntropyNormalized: 0.68 (chaotic)

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_1=0.559&knob_2=0.866&knob_3=0.472&knob_4=0.827&knob_5=1&knob_6=0.622&knob_7=0.89&knob_8=0.677&knob_9=0.039&knob_10=0.378&knob_11=0.535&knob_12=0.472&knob_14=1
```

**Notes:** Everything cranked. Near-max drop state with heavy zoom punch, thick fur, wide v-neck, heavy eye wash. The mid-scoop and rising brightness in the audio suggest this was dialed in right before a bass drop — the daddy is puffed up and ready to explode. Best for peak energy moments. Drop trigger threshold maxed so it only fires on huge energy spikes.

### wooli-drop
_Saved: 2026-04-14 | Music: WOOLI - Lost Lands 2025 (Full Set)_
_User note: "this should be at the drop"_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.575 | base zoom (medium-tight) |
| knob_2 | 0.992 | drop hit override (basically maxed) |
| knob_3 | 1.0 | god ray intensity (blinding) |
| knob_4 | 0.898 | eye wash strength (near-full yellow wash) |
| knob_5 | 0.764 | drop zoom (heavy zoom punch) |
| knob_6 | 0.016 | chest height (minimal — compressed) |
| knob_7 | 0.693 | fur thickness (thick) |
| knob_8 | 0.677 | v-neck width (wide open) |
| knob_9 | 0.039 | v-neck depth (shallow) |
| knob_10 | 0.669 | pump / body pulse (heavy bounce) |
| knob_11 | 0.535 | snap / gesture intensity (snappy) |
| knob_12 | 0.472 | groove / sway (moderate sway) |
| knob_14 | 1.0 | drop trigger threshold (needs big energy) |

**Audio character at save time:**
- bassNormalized: 0.369 (moderate), bassZScore: +0.079 (slightly above average)
- energyNormalized: 0.155 (low!), energyZScore: -0.369 (below average, declining)
- energySlope: -0.0002, energyR2: 0.449 (confident downward trend)
- midsNormalized: 0.553 (present), midsZScore: +0.288 (above average, rising)
- midsSlope: +0.0002, midsR2: 0.42 (confident upward trend)
- trebleNormalized: 0.620, trebleZScore: +0.342 (bright, above average)
- spectralCentroidNormalized: 0.275 (dark!), centroidZScore: -0.338 (getting darker)
- centroidSlope: -0.0002, centroidR2: 0.555 (most confident trend — sound is getting darker)
- spectralEntropyNormalized: 0.68 (chaotic)
- spectralRoughnessNormalized: 0.637 (gritty)
- spectralFluxNormalized: 0.116 (low — steady state, not transient)

**Musical moment:** This is the aftermath of a drop or a heavy breakdown section. Energy is low and confidently falling — the big moment just happened or the track is in a dark, heavy grinding passage. The spectral centroid is dark and dropping hard (r2=0.555, the most confident trend) — the sound is getting lower and heavier. Mids are rising while energy falls — the track is filling in the mid-range while the peak energy dissipates. High roughness (0.637) and entropy (0.68) mean it's still gritty and complex, not a clean breakdown. Bass is moderate but steady. This is "the drop just hit and the wobble bass is grinding" territory — not the peak impact moment but the sustained heavy section right after.

The knobs match: drop hit basically maxed (0.992), god rays blinding, eye wash near-full, heavy pump (0.669 — highest we've seen). The daddy is fully lit up and bouncing hard. Chest is compressed low (0.016) which makes him look compact and intense — like he's hunching into the bass.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_1=0.575&knob_2=0.992&knob_3=1&knob_4=0.898&knob_5=0.764&knob_7=0.693&knob_8=0.677&knob_9=0.039&knob_10=0.669&knob_11=0.535&knob_12=0.472&knob_14=1
```

**Notes:** THE drop preset. User wanted this to be the drop moment. Everything blazing — god rays max, drop hit max, heavy pump, eyes washing yellow. The audio tells a story of sustained heavy bass grinding after impact. Best paired with the heaviest part of a dubstep track where the wobble bass is doing its thing.

### wide-blaze
_Saved: 2026-04-14 | Music: WOOLI - Lost Lands 2025 (Full Set)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.0 | base zoom (fully zoomed out — full body) |
| knob_2 | 0.992 | drop hit override (maxed) |
| knob_3 | 1.0 | god ray intensity (blinding) |
| knob_4 | 0.898 | eye wash strength (near-full) |
| knob_5 | 0.0 | drop zoom (off — no zoom punch) |
| knob_6 | 0.039 | chest height (minimal) |
| knob_7 | 0.693 | fur thickness (thick) |
| knob_8 | 0.677 | v-neck width (wide open) |
| knob_9 | 0.039 | v-neck depth (shallow) |
| knob_10 | 0.669 | pump / body pulse (heavy bounce) |
| knob_11 | 0.535 | snap / gesture intensity (snappy) |
| knob_12 | 0.472 | groove / sway (moderate sway) |
| knob_14 | 0.937 | drop trigger threshold (high) |

**Audio character at save time:**
- bassNormalized: 0.218 (low), bassZScore: -0.278 (below average)
- energyNormalized: 0.758 (high!), energyZScore: +0.229 (above average)
- midsNormalized: 0.288 (low-moderate), midsZScore: -0.138
- trebleNormalized: 0.266 (dim), trebleZScore: -0.142
- spectralCentroidNormalized: 0.792 (bright despite low treble — harmonic content up high)
- spectralEntropyNormalized: 0.776 (chaotic)
- spectralRoughnessNormalized: 0.637 (gritty)
- spectralFluxNormalized: 0.104 (steady — not changing fast)
- ALL slopes near zero, ALL r-squared near zero — no trends, completely flat

**Musical moment:** Steady-state energy. The track is in a sustained groove — high energy (0.758) but no movement in any direction. Every slope is flat, every r-squared is near zero. This isn't building or decaying, it's just *there*. Bass is below average but energy is high — the power is coming from mids/highs, not sub-bass. High centroid (0.792) with low treble means the energy is concentrated in upper-mids, not sparkly highs. Gritty (roughness 0.637) and chaotic (entropy 0.776). This is a sustained heavy section — maybe a long wobble bass passage or a grinding mid-section.

The knob choice is smart: zoomed all the way out so you see the full silhouette blazing with god rays and eye wash, but no zoom punch — the visual stays wide and stable to match the audio's lack of movement. The daddy is just standing there, fully lit, pulsing with the groove. A "look at the whole thing" moment.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_2=0.992&knob_3=1&knob_4=0.898&knob_6=0.039&knob_7=0.693&knob_8=0.677&knob_9=0.039&knob_10=0.669&knob_11=0.535&knob_12=0.472&knob_14=0.937
```

**Notes:** Full body shot, fully blazing. Zoomed out to see the whole silhouette with god rays and eye wash maxed but no zoom punch — stable and wide. Best for sustained heavy sections where the track is grinding and you want to take in the whole visual.

### living-coat
_Saved: 2026-04-14 | Music: WOOLI - Lost Lands 2025 (Full Set)_
_User note: "the way the jacket is moving right now. Though maybe for more 'intricate' parts of music"_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_2 | 0.024 | drop hit override (almost off) |
| knob_3 | 0.008 | god ray intensity (barely a whisper) |
| knob_4 | 0.953 | eye wash strength (near-max yellow tint) |
| knob_5 | 0.016 | drop zoom (off) |
| knob_6 | 0.142 | chest height (low) |
| knob_7 | 0.693 | fur thickness (thick) |
| knob_8 | 0.677 | v-neck width (wide open) |
| knob_9 | 0.039 | v-neck depth (shallow) |
| knob_10 | 0.669 | pump / body pulse (heavy bounce) |
| knob_11 | 0.535 | snap / gesture intensity (snappy) |
| knob_12 | 0.472 | groove / sway (moderate sway) |
| knob_14 | 0.937 | drop trigger threshold (high) |

**Audio character at save time:**
- bassNormalized: 0.370 (moderate), bassZScore: -0.143 (slightly below average)
- energyNormalized: 0.650 (high), energyZScore: +0.724 (well above average!)
- midsNormalized: 0.231 (scooped), midsZScore: -0.392, midsSlope: -0.0005, r2: 0.401 (mids falling)
- trebleNormalized: 0.758 (bright!), trebleZScore: +0.196, trebleSlope: +0.0003
- spectralCentroidNormalized: 0.734 (bright), centroidZScore: +0.522 (very bright for this track)
- spectralEntropyNormalized: 0.927 (extremely chaotic — near max)
- spectralRoughnessNormalized: 0.757 (very gritty)
- spectralFluxNormalized: 0.166 (moderate movement)

**Musical moment:** A bright, chaotic, high-energy passage — but NOT a bass drop. Energy z-score is +0.724 (well above average) yet bass is below average. The power is all in the treble and upper frequencies — centroid at 0.734 and z-score +0.522 means this is one of the brightest moments in the track. Entropy near-maxed at 0.927 means extreme harmonic complexity. Roughness at 0.757 means it's dissonant and gritty too. Mids are scooping and falling. This reads like an intricate, detailed passage — lots of high-frequency textures, synth arpeggios, or complex sound design. Not a simple bass-driven moment.

The knobs reflect this perfectly: drop hit and god rays basically off, so the eyes aren't blazing. But eye wash is near-max (0.953), pump is heavy (0.669), and fur is thick (0.693). The coat itself is the star — with entropy at 0.927 the fractal fur fibers should be going absolutely wild, swirling with complex patterns. The heavy pump + sway means the body is bouncing. The user is watching the coat dance to intricate sound design, not the eyes blast on drops.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_2=0.024&knob_3=0.008&knob_4=0.953&knob_5=0.016&knob_6=0.142&knob_7=0.693&knob_8=0.677&knob_9=0.039&knob_10=0.669&knob_11=0.535&knob_12=0.472&knob_14=0.937
```

**Notes:** The coat preset. Eyes and god rays turned off so the fur coat is the whole show. With high spectral entropy/roughness the fractal fur fibers go wild — swirling, complex, alive. Best for intricate passages with lots of harmonic detail, arpeggios, or complex sound design. The eye wash gives a warm glow without the eyes dominating. The coat dances while the daddy bounces.
