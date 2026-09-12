# bear/1 — Session Journal (vibej2, 2026-09-11)

Shader: `shaders/bear/1.frag` (the phosphor outline bear, now also the photo and 3d-model host).
Branch `bear-vj-move` off `main`. Display:
`http://localhost:6969/?shader=bear/1&image=images/bear-face.png&relief_amt=1&img_aspect=0.5884&wavelet=true&controller=bear-move`
Companion controller: `controllers/bear-move.js`.

## Status
Four commits in. Zoom, sway, rezz eyes, three image presets, and a lit stage all landed and
measured. Eye ratchet has just been loosened after measuring it too strict; verification running.

## User directives
- "I need the bear to move more obviously in and out with the beat. And maybe rotate?"
- "that bear needs to be zooming in and out with the beat; I hear an obvious beat, the audio is
  line-in. You definitely should be able to find it."
- "eyes like green versions of the 'rezz' spirals in this repo, constantly rotating. You may want
  to use a controller to rotate continuously in the same direction."
- "Have the spirals for the eyes only come out strongly during intense sections, using a ratchet
  with decay to hold and animate."
- "gather information on the audio features as you go, theorize about how a specific feature, or
  combinations, or statistics of them could cause an independent dimension of the shader to move."
- "Make presets for the version with the actual bear picture, the 3d model image, or this outline."
- "take screenshots and diff them" — done in-page with canvas; **ffmpeg is not installed on this box.**

## Cool moments
- **The peak-vs-trough A/B** (trough | peak | pixel-diff, composited in-page and screenshotted) is
  the single most useful diagnostic of the session. It showed the zoom was real AND that the head
  was clipping out of frame at peak — a defect no scalar meter had surfaced.
- **The photo preset with green-channel relief.** Turning on `relief_amt` resolved the real charm's
  face, ears, fur and paws out of what had been a flat silhouette. It stopped looking like a logo
  and started looking like the object.
- **The blacklight stage.** Going from a black void to a violet pool with a glow halo around the
  bear changed it from "a shape on black" to "a lit figure on a stage".

## Measured findings
- **The bear barely moved, and it was measurable:** punch p50 **0.06** over 3169 frames, i.e. an
  ordinary beat changed its size ~1%.
- **A fast-EMA-minus-slow-EMA transient detector subtracted away the signal it was meant to find.**
  Replaced by an envelope follower (fast attack / slow release) + adaptive auto-gain: p50 0.39,
  p90 0.77. Auto-gain is what keeps it full-range on any input level.
- **The frame had no headroom.** At `BASE_SCALE 1.18` the top row was clipped in **50% of frames**,
  so the zoom was pushing the head off-screen rather than growing the bear. Rest smaller
  (1.72) + a hard ceiling (`BEAR_SCALE_MIN 1.22`) so strong beats SATURATE. 0 clipped frames after.
- **Every raw feature is jittery** (0.12–0.19 per 70 ms sample). Nothing may be thresholded raw.
- **Timescale must match the question.** The intensity ratchet fed from a ~1 s signal refilled
  faster than it drained, so the eyes never shut. It needs a ~6 s SECTION-scale smoother.
- **Fixed thresholds don't survive a track change.** With absolute thresholds, intensity p10 0.45
  never fell under re-arm and the eyes were pinned on. Adaptive normalisation over ~50 s fixed it.
- **Legibility:** mean frame luminance was p50 0.017 / min 0.004 against the house projector floor
  of 0.10 (`journals/lattice-vj-2`). The stage pool took min to 0.0205 at clip 0, then higher.
- Wavelets live in **`cranes.waveletFeatures`** (114 keys), NOT `measuredAudioFeatures`. `?wavelet=true`
  is required. Easy to miss and silently reads as "no wavelet features".
- Independent unused dimensions, from a 268-feature survey (wide range, low jitter, |r|<0.45 vs
  bass AND energy): `spectralCrestMean`, `waveletTilt*`, and the `trebleRSquared`/`midsRSquared`
  trend-confidence family. Caveat from the legible journal: **legibility beats independence** — a
  mathematically independent line is useless if you cannot map it to what you hear.

## Rules honoured
- Punch (bass transient) and breath (slow energy swell) are different features on different
  timescales, so they cannot stack into one blob.
- Eye intensity is deliberately NOT bass — bass already owns the zoom.
- Rotation is a monotonic accumulator; audio sets RATE, never angle, so it can never run backwards.
- Body sway phase is a pure clock; audio sets only its amplitude.
- Relief multiplies phosphor LIGHTNESS only, never geometry, never the global multiplier.
- `BEAR_SCALE_MIN` doubles as the largest-extent gate for the ring field (journal beat 19c): with a
  punch this deep, a shrinking bear would otherwise drag charged pixels into the exterior.

## Gotchas
- **Controller edits are served stale.** Touching the mtime fixes Vite's watcher, but the browser
  then still serves the old module — even after `{cache:'reload'}` and a Ctrl+Shift+R. Only
  killing the dev server + `rm -rf node_modules/.vite` worked. Hit four times. Saved to memory.
  Detect it with `Object.keys(cranes.controllerFeatures)` vs the file on disk.
- **A controller that throws produces zero features and fails silently** — `controllerFeatures`
  is simply `{}`. Caused here by `const target` declared twice in one scope. Check the key COUNT.
- Only the FOREGROUND tab renders; a backgrounded tab reads as an all-black frame with zero audio.
- Canvas internal resolution != CSS display size, so a frame drawn 1:1 into an aspect-matched
  panel looks vertically stretched compared with the live page. Not a shader bug.
- URL params outrank controller output, so `&eyeOpen=1` pins the ratchet open for verification —
  the standing "test via query params, not JS injection" rule.

## Not done / next
- The 3 research agents' `the-coat` corner-channel structure (products of cross-domain smoothsteps
  combined with `max()`, second corner capped at 0.7) is NOT ported yet — it is the obvious next
  source of independent dimensions.
- Eye centres are constants measured off `bear-face.png`; they are approximate on the model and
  outline presets, which have no modelled eyes.
- `*Slope` features read ~0 on mic input. Do not build anything whose only intensity signal is a
  built-in slope; derive the fit locally (see `controllers/bear-zoom.js:49-61`).
