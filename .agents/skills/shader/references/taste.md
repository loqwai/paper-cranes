# Aaron's taste, in his words

Each rule below is something Aaron said while watching a shader, usually more than once. The quote
comes first, then what it means for the code, then where it was said. When one of these conflicts
with an art critic, a metric or your own eye, his words win.

The running, dated list is [docs/vj-preferences.md](../../../../docs/vj-preferences.md). Add new
feedback there in the same session, quoted and dated. This file picks out the rules that decide
whether a new shader reaches the wall.

## Motion

**"always going FORWARD, no oscillating back"** (lattice-vj-2/3, 2026-08-18;
`journals/lattice-vj-2-cool-moments.md`). Also "We should always be moving forward in the animation"
(2026-10-06) and "The background is shivering" (2026-10-06).
- Geometry (zoom, rotation, pan, fold ratios, fractal parameters) only moves one way. No `sin()` on
  any of it. Four "shaking back and forth" complaints in a row on lattice-vj were all cured by
  removing oscillators from geometry (`shaders/redaphid/wip/lattice-vj/HANDOFF.md` §1).
- On 2026-11-21 the wall rejected clit-set/2 with "It is not moving". A sine sway on zoom, rotation
  and pan read as a shiver of 0.92 on the meter. A one-way spin brought it to 0.35 (mindmeld 102906,
  `journals/2026-11-22-clit-coaster-show.md`).
- Beats are forward surges in a clock's rate, never grow-then-shrink wobbles.

**"cymbals are making it flash like crazy", "entire frame blacking out every other frame", "It's way
too flashy and reactive, we have to pull it back"** (clit/4, 2026-05-02; `journals/clit-2-cool-moments.md`).
**"It's flashing black like every other frame"** (plasma-event-horizon/3, 2026-05-02).
- Audio inside fractal coordinates or inside a phase argument strobes. On plasma-event-horizon the
  cause was `sin(r * 9.0 - iTime * LOUDNESS * RATE)`: the phase jumped whenever loudness changed.
- When he says "too reactive", audit every audio path and halve the coefficients. One culprit is
  rarely the whole story; many small modulations add up to "flashy".

**"I want the pattern to evolve."** He described the failure as "sections are cut out, overlapping,
like a kaleidoscope. But those overlapping sections move in and out in a breathing motion"
(lattice-vj, 2026-08). No audio on fold parameters, however smoothed: the error compounds per fold
level and reads as breathing.

## Reactivity

**"I need it way more music reactive than that... I'm at a hard techno place and it's almost still
except for time"** (clit-set/2 on his phone, 2026-11-22 00:44; local transcript `6d078c12`,
mindmeld 102145). **"I need more audio reactivity. It looks static"** (sun-1, 2026-10-10, said
repeatedly).
- Test at phone-mic level: energy sits at 0.01-0.07. A gate or threshold tuned on a line-level clip
  shuts the shader on a phone. That was the cause on 11-22 (`controllers/clit-set.js` presence gate).
- His own test: "You test it in my machine freezing time to 0 using query params". With the clock
  held, anything that still moves is audio. `bin/shader-check.mjs` runs this test.

**"I need the lattice to be affected in many, many ways subtly by audio features. We have 100+. Use
them!!!"** (2026-10-09). **"I need a variety of legible music features affecting the scene!!!"**
(2026-10-06).
- Wire 12 or more features from different domains, each as a small (5-15%) change on its own
  element. Give each musical element its own verb: kick to a size punch, snare to sparks, hats to
  glints, bass sustain to breathing, melody to a secondary object. An audience should be able to
  point at the cause.

**"Don't use the 'beat' uniform... Use the wavelet uniforms"** (2026-10-06). **"beat pulse looks good
now"** came after a `wavelet_bassHit` onset, a ~13% size punch and a cubic ease-out over 60% of the
inter-onset interval (`controllers/black-sun.js`). The built-in `onsetKick`/`onsetSnare`/`onsetHat`
envelopes are the shader-only version ([docs/onset-detection.md](../../../../docs/onset-detection.md)).

**"We need things more similar to the way the coat series shaders react to the beat. The way they
zoom seems much smoother."** (taco-kandi, 2026-05-09). Smooth swell for the build, a short eased
punch on the hit, both decaying.

**"That sudden growth of the sun was not warranted by the music."** (2026-10-06). Big changes (size
jumps, mode changes, palette mutations) only on drops, section changes or strong onset clusters,
with a refractory period. A "permanent mutation" detector that fires every few seconds is an LFO:
lattice-nav's fired ~330 times in 20 minutes before it was tied to `sectionMode`.

## Light and brightness

**"Looks like there's a global brightness shift again."** (lattice-vj-2, third report). Two causes
were found: a gain term on the whole frame, and a palette spinning 7.7 turns a minute (hues differ in
lightness). Measure both before guessing.
- Audio raises local light: rims, relief, lace, sparks. It never multiplies the whole frame. "A frame
  that pumps with the kick reads as a cheap strobe and the user has rejected it every time" (HANDOFF §1).

**"It's blowing out too bright suddenly with the music sometimes now"**, **"It gets very bright when
it is quiet suddenly"** (2026-10-06).
- Budget total emission with one soft knee. Gate every audio light term by presence. In silence
  Normalized and z-score values blow up (they divide by a tiny range), so clamp them and multiply by
  the gate. Never put an inverted energy envelope on light.

**"There shouldn't be a 'no white' rule"** (2026-10-09). White is allowed. Clipping and wash-out are not.

**"I want 100% bright all the time."** (2026-10-09). No master dimmer knob. Dark is fine ("The sun can
sometimes be darker than the rays, it's fine"), black is not: "Looks black to me" (11-22 06:32) was a
broken link, and he treats a black wall as a crash.

## Colour

**"Don't use hsl! use oklab."** (taco-kandi, 2026-05-09). **"We still get tons of gray static
everywhere. Use oklab."** (the-coat-11). **"We also need to reinplement using oklh like this repo
currently recommends with a thematic color palette"** (clit-vibej, 2026-11-23, transcript `71ec286e`).
- OKLCH or OKLab for every palette, mix and hue shift, gamut-mapped (chroma shrinks; RGB never clips).
  The kit is [docs/oklch-palettes.md](../../../../docs/oklch-palettes.md). ChromaDepth is the one
  HSL exception (vault `kb/facts/paper-cranes-colour-work-uses-oklab.md`).
- The grey static on the coat came from `col *= 0.86` inside a feedback loop: an RGB multiply that
  loses chroma on every pass.

**"I wanted multiple colors, not just one shade!"** and **"It's gray and dark"**, which meant raise
chroma, not lightness (2026-10-09). **"I need less of this contrasted green/pink banded colors; Use
oklch and expert algorithmic color schemes."** One slow base hue with analogous or split-complement
accents; no high-chroma green against pink.

**"I never want to see that magenta again. I think that's a color buffer overflow"** (2026-10-06).
Keep hot magenta out of palettes, and guard the output: trails that blend red over violet produce it
even when every term avoids it (clit-vibej iter 5 added an output hue squeeze: hot pink 0.18-0.28 to
0.06-0.13).

**"Look at the extreme color banding right now. It happened when I turned some knob all the way up —
I don't want that to ever be possible."** (taco-kandi/4, 2026-05-09). Every knob, at every value,
must stay inside the look. The causes there were HSL, a `max()` blend in a feedback echo and a
per-frame hue rotation inside the feedback.

**"Don't suddenly shift colors based on shorter-term audio features"** (2026-10-06). Colour follows
medians, means and slow clocks. In-track hue drift should be about 0.

## Form and composition

**"It's been pretty samey for a while. Give me a 'roller coaster' view going down the fractal tube"**
(11-22 04:07). **"Not just palette - the 'forms'"** (taco-kandi-6). When he says samey, change the
camera model or the form, usually as a fork. Another colour tweak does not fix it.

**"The shader is a place, not a picture."** (docs/vj-deep-voyage-recipe.md, after "an amazing set...
explore it in insane depth for hours", 11-22 19:31). The shaders that held him for hours had several
independent shape axes (centre, zoom, rotation, two fractal parameters, curl). Give "deeper" several
axes, not one zoom: "I want to go down!" became zoom plus iteration depth plus descent plus drift.

**"I do not like those rings."** Ripples are distortion of the previous frame, not painted rings. A
circular flash radiating from behind the logo took four iterations to remove on taco-kandi (a photon
ring, a core glow and god rays, each pulsed on bass).

**"head is cut off"**, **"never looking at the center, like I'm off to the side"**. Keep the
composition centred and leave room around the focal object; give him a ZOOM knob rather than zooming
in far.

**What he points at as beautiful:** the rim lighting and softness of `plasma.frag` ("i want some of
that beautiful rim lighting the plasma shaders have", iris), the coat series' beat zoom, clit/2's
orbit-trap lace with red near and violet far, moody-octopus's Julia tendrils, the Van Gogh blue tile
sky of sun-1, "much more painterly sense" (brush strokes over airbrushed glow).

## Live behaviour

- **"Must hold 60 fps"; "doesn't need to be as stylized if it's easier on the gpu".** "It's too slow"
  stops everything.
- **Every knob at 0 must look good.** A reload zeroes every dial, MIDI drops mid-show ("WHERE ARE THE
  DIALS"), and NFC stickers bake knob values into URLs.
- **"I want to communicate with you wordlessly, through the dials."** A dial he keeps returning to an
  extreme is an instruction: bake that direction in. "Assume if I'm changing a bunch of knobs at once
  that I want a greater change to the vibe of the shader." But "I was just playing with the knobs. I'm
  looking for variety" means a wiggle is not always a request.
- **"Fade it in. If you are capable of it."** New layers crossfade in over about 75 s, never cut.
- **"Nothing may flash or reload the wall."** Shader edits hot-swap; never put a test pattern on the wall.
- **"Stop the 'lace'... from sparkling in this ugly way"** (11-23, transcript `71ec286e`). The cause
  was spatial aliasing of sub-pixel orbit-trap detail, not float precision (vault
  `kb/tools/tool-paper-cranes-vj-mcp.md`). Measure with `scripts/sparkle-score.mjs`.

## How he talks, and what it means

From [docs/vj-deep-voyage-recipe.md](../../../../docs/vj-deep-voyage-recipe.md) §8:

| He says | It means |
|---|---|
| "It is not moving" / "almost still" | Motion is missing, not slow. Check the link params (`controller=`, `wavelet=true`), the gate and the clocks first |
| "Other shades are fine it's this series" | The bug is in the shader or controller, not his audio |
| "samey" | Change the camera model or fork |
| "Looks great!", "Very very good" | Hold the look; keep moves small |
| "too flashy", "too reactive" | Halve every audio coefficient, then look again |
| "shivery" | Something oscillates or a transient landed in a phase |
| "washed out", "gray" | Raise chroma, lower the lightness ceiling, check for a double sRGB encode |
