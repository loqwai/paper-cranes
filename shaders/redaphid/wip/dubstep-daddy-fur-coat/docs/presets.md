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

---

_The following presets were captured via the jam page snapshot queue and batch-processed._

### whisper-glow
_Saved: 2026-04-14 09:31 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.039 | base zoom (barely zoomed) |
| knob_2 | 0.173 | drop hit override (subtle) |
| knob_3 | 0.26 | god ray intensity (gentle) |
| knob_4 | 0.197 | eye wash strength (warm hint) |

**Audio character at save time:**
- bassNormalized: 0.237 (low), bassZScore: -0.251
- energyNormalized: 0.552, energyZScore: +0.192 (slightly above average)
- midsNormalized: 0.277 (scooped), midsZScore: -0.207
- trebleNormalized: 0.519, spectralCentroidNormalized: 0.729 (bright)
- spectralEntropyNormalized: 0.849 (chaotic — complex harmonics)
- spectralRoughnessNormalized: 0.497 (moderate)
- spectralFluxNormalized: 0.192 (steady)
- All slopes ~0, all rSquared ~0 — no trends, flat state

**Musical moment:** A textured, complex passage with moderate energy. Bass is below average, mids scooped, but treble and spectral centroid are both elevated — the sound is bright and harmonically rich. Entropy near 0.85 means tons of spectral complexity. No trends anywhere — this is a sustained state, not building or dropping. Likely an intricate mid-section with lots of detail.

The knobs match: everything dialed low and gentle. A subtle, understated preset where the audio complexity drives the visual through the fractal fur rather than through flashy effects.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_1=0.039&knob_2=0.173&knob_3=0.26&knob_4=0.197
```

**Notes:** Whisper mode. Everything turned down to a murmur — let the audio-reactive elements do the talking. Best for complex, textured passages where subtlety wins over spectacle.

### dark-bass
_Saved: 2026-04-14 09:32 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0 | base zoom (full wide) |
| knob_2 | 0.276 | drop hit override (quarter) |
| knob_3 | 0 | god ray intensity (off) |
| knob_4 | 0.197 | eye wash strength (warm hint) |

**Audio character at save time:**
- bassNormalized: 0.496 (moderate), bassZScore: -0.095
- energyNormalized: 0.109 (very low!), energyZScore: -0.129
- midsNormalized: 0.796 (heavy!), midsZScore: +0.163
- trebleNormalized: 0.338 (dim)
- spectralCentroidNormalized: 0.089 (very dark — sound concentrated in low frequencies)
- spectralEntropyNormalized: 0.134 (clean, simple)
- spectralRoughnessNormalized: 0.111 (smooth)
- spectralKurtosisNormalized: 0.627 (peaked — single dominant frequency)

**Musical moment:** A dark, bass-heavy passage with almost no energy. Centroid at 0.089 is extremely low — the sound is concentrated deep in the bass/mid-bass. Mids are heavy at 0.796 while entropy is just 0.134, meaning a clean, simple sound — likely a sustained bass note or a quiet, rumbling breakdown. Very smooth (roughness 0.111) with high kurtosis (peaked distribution). This is the quiet before a storm.

God rays off, wide view, just a hint of drop and eye wash. The daddy is a dark silhouette, barely glowing, waiting.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_2=0.276&knob_4=0.197
```

**Notes:** Dark mode. God rays completely off, zoomed out, during a quiet bass rumble. The visual is almost a silhouette. Best for breakdowns, intros, or any passage where the music goes dark and deep.

### bright-chaos
_Saved: 2026-04-14 09:32 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.283 | base zoom (slight zoom) |
| knob_2 | 0.276 | drop hit override (quarter) |
| knob_3 | 0 | god ray intensity (off) |
| knob_4 | 0.197 | eye wash strength (warm hint) |

**Audio character at save time:**
- bassNormalized: 0.346, bassZScore: -0.406 (below average)
- energyNormalized: 0.39, energyZScore: +0.431 (above average!)
- midsNormalized: 0.293 (scooped!), midsZScore: -0.605
- trebleNormalized: 0.85 (bright!), trebleZScore: +0.611
- spectralCentroidNormalized: 0.676 (bright), centroidZScore: +0.612
- spectralEntropyNormalized: 0.937 (near-max chaos!)
- spectralRoughnessNormalized: 0.776 (very gritty)
- spectralCrestNormalized: 0.192 (spread out, not peaked)

**Musical moment:** Bright, chaotic, gritty. Mids deeply scooped (-0.605 z-score) while treble blazes at 0.85 — classic mid-scoop sound design. Entropy near-maxed at 0.937 with roughness at 0.776 means this is harmonically complex AND dissonant. Bass below average but energy above average — the power is all in the highs. This is a bright, aggressive synth passage or a complex sound design moment, not a bass drop.

Interesting contrast: all this spectral fury is happening while the knobs are modest. The user is letting the audio drive the visuals at a gentle knob setting. The slight zoom (0.283) focuses the frame while the audio-reactive elements go wild from the entropy.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_1=0.283&knob_2=0.276&knob_4=0.197
```

**Notes:** Subtle knobs during bright chaos. God rays off, mild zoom, during a hyper-complex treble-heavy passage. The fur fibers go crazy from entropy while the effects stay restrained. Best for complex synth passages where the texture does the work.

### balanced-glow
_Saved: 2026-04-14 09:33 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0 | base zoom (full wide) |
| knob_2 | 0.52 | drop hit override (half) |
| knob_3 | 0.52 | god ray intensity (half) |
| knob_4 | 0.465 | eye wash strength (mid) |

**Audio character at save time:**
- bassNormalized: 0.352, bassZScore: -0.26 (below average, confidently falling — slope -0.0001, r2: 0.205)
- energyNormalized: 0.497, energyZScore: +0.154 (slightly above, confidently flat — r2: 0.207)
- midsNormalized: 0.455, midsZScore: -0.21
- trebleNormalized: 0.567, trebleZScore: +0.249
- spectralCentroidNormalized: 0.557, centroidZScore: +0.314
- spectralEntropyNormalized: 0.527, entropyZScore: +0.463 (moderate chaos, trending up — r2: 0.23)

**Musical moment:** Everything near the middle. Moderate energy, moderate brightness, moderate chaos — but with some confident trends: bass falling (r2: 0.205), entropy rising (r2: 0.23). This reads like a transition section — the track is shifting character, moving from one energy state to another. The even-handed knobs (all around 0.5) match the balanced audio state.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_2=0.52&knob_3=0.52&knob_4=0.465
```

**Notes:** The balanced preset. Everything at half — drop, god rays, eye wash all hovering around 0.5. A good default for when the music is in transition and you want the visual to be evenly responsive to whatever comes next.

### ray-bloom
_Saved: 2026-04-14 09:33 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.079 | base zoom (nearly wide) |
| knob_2 | 0.37 | drop hit override (gentle) |
| knob_3 | 0.638 | god ray intensity (prominent!) |
| knob_4 | 0.465 | eye wash strength (mid) |

**Audio character at save time:**
- bassNormalized: 0.185, bassZScore: -0.34 (low, gently falling)
- energyNormalized: 0.277, energyZScore: +0.472 (above average — r2: 0.152)
- midsNormalized: 0.525, midsZScore: -0.498 (below average, falling — slope -0.0003, r2: 0.16)
- trebleNormalized: 0.585, trebleZScore: +0.65 (well above average, rising — slope +0.0004, r2: 0.167)
- spectralCentroidNormalized: 0.441, centroidZScore: +0.584 (rising — slope +0.0002, r2: 0.215)
- spectralEntropyNormalized: 0.835, entropyZScore: +0.632 (chaotic)
- spectralRoughnessNormalized: 0.485, roughnessZScore: +0.546 (rising grit — r2: 0.212)
- spectralSpreadNormalized: 0.53, spreadZScore: +0.638 (rising — r2: 0.239, most confident trend)

**Musical moment:** A build. Treble rising, centroid rising, spread rising, roughness rising — all with moderate r2 confidence. Mids are falling and scooping out. The sound is getting brighter, wider, grittier. Bass is absent. This is a textbook buildup: the frequency content is spreading upward and getting more complex, while the low end drops away. Energy is above average and the spectral character is rapidly evolving.

The god rays at 0.638 are the star here — during a build, the rays would be growing in intensity with the treble, creating a bloom effect as the music brightens. Nearly wide view to see the full figure backlit by rays.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_1=0.079&knob_2=0.37&knob_3=0.638&knob_4=0.465
```

**Notes:** God ray buildup preset. Rays prominent during a rising, brightening passage. The visual blooms as treble and spectral complexity rise. Best for buildups and rising tension where you want the rays to tell the story.

### body-sculpt
_Saved: 2026-04-14 09:35 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.394 | base zoom (medium) |
| knob_2 | 0.197 | drop hit override (subtle) |
| knob_3 | 0.142 | god ray intensity (dim) |
| knob_4 | 0.535 | eye wash strength (half) |
| knob_5 | 1.0 | drop zoom (maxed!) |
| knob_6 | 0.22 | shoulder spread (narrow) |
| knob_7 | 0.559 | fur thickness (medium) |
| knob_8 | 0.291 | v-neck width (narrow) |

**Audio character at save time:**
- bassNormalized: 0.547, bassZScore: +0.43 (above average, but gently falling — slope -0.0002, r2: 0.313)
- energyNormalized: 0.439, energyZScore: +0.066 (flat — r2: 0.436, very confident flat trend)
- midsNormalized: 0.457, midsZScore: 0 (dead average, confidently falling — slope -0.0003, r2: 0.467)
- trebleNormalized: 0.553, trebleZScore: -0.203 (rising — slope +0.0005, r2: 0.421)
- spectralCentroidNormalized: 0.443 (rising — slope +0.0003, r2: 0.514, most confident trend!)
- spectralRoughnessNormalized: 0.538 (rising — r2: 0.488)
- spectralSpreadNormalized: 0.616 (rising — r2: 0.574, very confident!)

**Musical moment:** This snapshot has the most confident trends of any in the batch. Everything is moving: bass falling (r2: 0.313), mids falling (r2: 0.467), treble rising (r2: 0.421), centroid rising (r2: 0.514), spread rising (r2: 0.574). The sound is migrating upward — from a bass-heavy state toward a brighter, wider spectral character. Energy is dead flat and confidently so (r2: 0.436) — the overall volume isn't changing, just the frequency balance.

This is the user exploring the body knobs (shoulder spread, fur thickness, v-neck) while the sound evolves. Drop zoom maxed at 1.0 means any energy spike will punch in hard. The narrow shoulders and modest fur create a leaner silhouette — less "daddy energy," more sculpted.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_1=0.394&knob_2=0.197&knob_3=0.142&knob_4=0.535&knob_5=1&knob_6=0.22&knob_7=0.559&knob_8=0.291
```

**Notes:** Body exploration preset. First time using the body-shape knobs (shoulders, fur, v-neck). Lean build, maxed drop zoom, during a confidently evolving audio state. The sound is shifting upward while energy stays flat — perfect for testing how body shape interacts with spectral movement.

### golden-wash
_Saved: 2026-04-14 09:38 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0 | base zoom (full wide) |
| knob_2 | 0.016 | drop hit override (barely on) |
| knob_3 | 0.024 | god ray intensity (whisper) |
| knob_4 | 0.945 | eye wash strength (near-max!) |
| knob_5 | 0.858 | drop zoom (heavy) |
| knob_9 | 0.189 | v-neck depth (shallow) |

**Audio character at save time:**
- bassNormalized: 0.134 (very low), bassZScore: +0.055
- energyNormalized: 0.629, energyZScore: +0.441 (well above average)
- midsNormalized: 0.561, midsZScore: -0.043 (average)
- trebleNormalized: 0.597, trebleZScore: +0.142
- spectralCentroidNormalized: 0.692 (bright)
- spectralEntropyNormalized: 0.947 (near-max chaos!)
- spectralRoughnessNormalized: 0.642 (gritty)
- spectralKurtosisNormalized: 0.063 (very flat distribution — energy spread across all frequencies)

**Musical moment:** High-energy, hyper-complex, bass-absent. Energy is well above average but bass is nearly zero — all the power is in the mids/highs. Entropy near-maxed at 0.947 with roughness at 0.642 and a completely flat spectral distribution (kurtosis 0.063). This is a wall of sound — dense, complex, gritty, with energy everywhere except the sub-bass. Could be a heavy synth pad, a complex arpeggio, or a sound design passage.

The eye wash at 0.945 bathes the whole figure in golden light. God rays and drop effects are basically off. The daddy is a golden silhouette — washed in color but not lit by eyes or rays. With the heavy drop zoom (0.858), any energy spike will punch in hard, but the sustained state is just this warm golden glow.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_2=0.016&knob_3=0.024&knob_4=0.945&knob_5=0.858&knob_9=0.189
```

**Notes:** Golden wash. Eye wash cranked near-max, everything else off. The daddy glows warm yellow against a complex, chaotic audio backdrop. The heavy drop zoom is coiled and ready but hasn't fired yet. Best for dense, bright passages where you want the figure bathed in color without the eye/ray drama.

### griz-sizzle
_Saved: 2026-04-14 09:39 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0 | base zoom (full wide) |
| knob_2 | 0.016 | drop hit override (barely on) |
| knob_3 | 0.024 | god ray intensity (whisper) |
| knob_4 | 0.953 | eye wash strength (near-max!) |
| knob_5 | 0.858 | drop zoom (heavy) |
| knob_9 | 0.189 | v-neck depth (shallow) |

**Audio character at save time:**
- bassNormalized: 0.136, bassZScore: -0.566 (well below average)
- energyNormalized: 0.699, energyZScore: +1.171 (huge! Way above average)
- midsNormalized: 0.232 (scooped!), midsZScore: -0.73 (deeply below, falling — slope -0.0003, r2: 0.134)
- trebleNormalized: 0.768 (bright!), trebleZScore: +0.766 (well above)
- spectralCentroidNormalized: 0.672 (bright), centroidZScore: +0.498
- spectralEntropyNormalized: 0.748, entropyZScore: +0.601 (chaotic, rising — r2: 0.331)
- spectralRoughnessNormalized: 0.55, roughnessZScore: +0.491 (rising)
- spectralKurtosisNormalized: 0.645, kurtosisZScore: +0.839 (very peaked — dominant frequency)

**Musical moment:** Peak energy. Energy z-score of +1.171 is the highest in the entire batch — this is the loudest moment captured. But bass is absent (-0.566) and mids are deeply scooped (-0.73 and falling). All the energy is in the treble. High kurtosis (0.839 z-score) means there's a dominant frequency piercing through. Entropy rising at r2: 0.331 — the complexity is building. This reads like a high-frequency lead synth or a sizzling riser — not a bass drop but a treble assault.

Near-identical knobs to golden-wash but the audio is much more extreme. The golden wash silhouette would be trembling with the energy z-score at 1.17.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_2=0.016&knob_3=0.024&knob_4=0.953&knob_5=0.858&knob_9=0.189
```

**Notes:** Same golden wash preset but during a peak treble assault. Energy z-score 1.17 — the highest captured. Mids deeply scooped, bass absent, treble blazing. The golden figure would be vibrating from sheer energy. Shows how the same knobs feel completely different at different musical moments.

### full-drop-punch
_Saved: 2026-04-14 09:39 | Music: (jam session)_

| Knob | Value | What it does |
|------|-------|-------------|
| knob_1 | 0.205 | base zoom (slight) |
| knob_2 | 1.0 | drop hit override (MAXED) |
| knob_3 | 0.071 | god ray intensity (subtle) |
| knob_4 | 0.567 | eye wash strength (moderate) |
| knob_5 | 0.449 | drop zoom (moderate) |
| knob_9 | 0.189 | v-neck depth (shallow) |

**Audio character at save time:**
- bassNormalized: 0.339, bassZScore: +0.111 (slightly above, gently falling — r2: 0.125)
- energyNormalized: 0.317, energyZScore: -0.155 (below average)
- midsNormalized: 0.46, midsZScore: +0.089 (average)
- trebleNormalized: 0.554, trebleZScore: -0.089 (average)
- spectralCentroidNormalized: 0.566 (mid-bright)
- spectralEntropyNormalized: 0.636 (moderate)
- spectralRoughnessNormalized: 0.52 (moderate)
- All slopes small, r2 values low-moderate — no confident trends

**Musical moment:** Surprisingly calm for a full-drop override. Energy is below average, everything is near the middle, no trends. This is either a quiet passage where the user cranked the drop override to see the visual at full blast regardless of audio — or it was dialed in during a transition, deliberately forcing the drop state to see what it looks like independent of the music.

Drop hit maxed at 1.0 — the daddy's eyes are fully lit, the drop effects are at maximum. But with moderate eye wash and subtle god rays, it's the eyes doing the work, not the environment. A controlled burn rather than a full blaze.

**URL:**
```
?shader=redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive&audio=tab&knob_1=0.205&knob_2=1&knob_3=0.071&knob_4=0.567&knob_5=0.449&knob_9=0.189
```

**Notes:** Full drop override during a calm passage. The user forced max drop state to explore what it looks like independent of the music. Eyes blazing, moderate wash, subtle rays. A "what does this look like at 11" exploration preset.
