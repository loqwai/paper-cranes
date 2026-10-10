# VJ preferences: the user's standing taste

These rules hold across shaders: what the user wants on the wall and how the user wants to work
live. Each comes from the user's own feedback during sessions. Read this before any VJ or
shader-design session (`/vibej2`, `/jam`, `/live-session`) and brief every sub-agent and the art
critic with it. **When a session produces new feedback, add it here in the same session**, with
a date.

For running a show, see [show-playbook.md](show-playbook.md) and the `/show` skill.

## Audio reactivity is the top priority

- **Every layer must visibly react to the music.** That includes background, sky, clouds,
  galaxy/spiral bands, nebula gas, stars, rays, the core object and companions. A layer that only
  drifts on a clock reads as a screensaver. The user flagged this five or more times on
  2026-10-06: "I am not seeing enough audio reactivity", "I need that audio reactivity", "those
  galaxy waves need to be audio reactive. We can't lose sight of the audio reactivity importance".
- **Size reactions to be readable from the back of the room.** Start at 3–5× what feels tasteful.
- **Legibility beats quantity.** "It's good aesthetically right now. But I need a variety of
  legible music features affecting the scene!!!" (2026-10-06). Give each musical element its own
  distinct visual verb on its own layer: kick → core size punch, snare → spark bursts, hats →
  twinkle and glints, bass sustain → gas breathing, melody → a secondary object, mids → tendril
  sway, build → reach and flow speed, drop → story event. Remove cross-talk so an audience can
  point at the cause of each effect. Many features blended into general glow do not count.
- **Wire many features.** "I need to see lots of audio features wired up": 12+ distinct features
  across domains. Each layer takes a different part of the music; for example the main sun takes
  bass/energy and the companion takes mids/treble.
- **The channel discipline makes reactivity look good rather than jittery:**
  - Light and amplitude take the audio, through attack-fast/release-slow envelopes on z-scores.
  - Speed changes are accumulated rates, never phase jumps.
  - **Color follows only slow music.** "Don't suddenly shift colors based on shorter-term audio
    features": use medians, means and slow clocks.
- **Structural events come from large musical changes.** The user wanted distortion waves
  "slower, more intense, and precipitated by large changes to the audio": drops, big z-score
  jumps and section changes, not every kick.
- **Pulse tightly to the beat with wavelets.** "Can we get better at pulsing to the beat? Don't
  use the 'beat' uniform... Use the wavelet uniforms" (2026-10-06). Run with `wavelet=true` and
  drive beat pulses from `wavelet_punch`/`wavelet_bassHit` through controller envelopes, drops
  from `wavelet_confirmedDrop`, and per-band channels from the `waveletBand0..5` z-scores.
- **Confirmed working (2026-10-06): "beat pulse looks good now."** The recipe: a
  `wavelet_punch`/`wavelet_bassHit` onset (onset-to-peak ~17 ms median), a ~+13% core size punch,
  then a cubic ease-out over 60% of the inter-onset interval (clamped 0.25–0.45 s). A new onset
  re-triggers from the current value. It lives in `controllers/black-sun.js`.
- **The animation always moves forward.** "We should always be moving forward in the animation"
  (2026-10-06, said right after "the pulsing of the sun... is just off beat"). Express beats as
  eased forward surges in the rate of monotonic accumulators (flow, spiral, boil), not as
  back-and-forth oscillation. Grow-then-shrink pulses read as wobble and make any timing error
  obvious. Beat timing should come from a tempo-locked beat clock, not raw onsets.
- **Beat pulses hit and then ease out.** "We likely need an ease-out animation after the beat"
  (2026-10-06). Use an instant attack on the onset, then a shaped, eased release (cubic or
  exponential ease-out, or a critically-damped spring) of ~250–450 ms, scaled to tempo. A new
  onset re-triggers from the current value.
- **Never use the `beat` uniform.** Build onsets from z-scores (see the memory note on this).

## Color

- **Multi-color, never one shade.** "I wanted multiple colors, not just one shade!" A monochrome
  frame (meter hueConc above ~0.85) is a defect.
- **Use OKLCH palettes, gamut-mapped.** Shrink chroma to fit; never clamp RGB. Over-gamut teal
  read as "clipping or something".
- **Loud moments must not wash out the whole frame.** "It's blowing out too bright suddenly with
  the music sometimes now" (2026-10-06). Audio surges should raise contrast through local
  brights, not lift the entire frame. Budget total emission frame-wide with one hue-preserving
  soft knee, and keep event flashes local and brief.
- **Quiet must never mean brighter.** "It gets very bright when it is quiet suddenly"
  (2026-10-06). Gate every audio-driven light term by energy presence. In silence, z-scores of
  noise-like stats spike, so clamp them. Never put an inverted energy envelope on light. When the
  music drops out, the scene relaxes to its resting look.
- **The whole scene stays saturated.** "The sun needs to be less gray. Probably the entire scene.
  You better be using OKLCH for the color scheme" (2026-10-06). OKLCH everywhere. Soft knees
  compress lightness and never mix toward grey. Encode gamma exactly once; a double sRGB encode
  greys and washes out everything.
- **Focal objects stay saturated, never grey.** "The suns are too grey" (2026-10-06). When
  gamut-mapping or soft-limiting, lower lightness before chroma. Exempt the focal objects from
  scene-wide night or dark desaturation and from veils.
- **No hot magenta, ever.** "I never want to see that magenta again. I think that's a color
  buffer overflow" (2026-10-06). Keep magenta out of the palettes, and guard against overflow
  artefacts that read as magenta: clamp and sanitize what feedback buffers store (finite, 0..1),
  gamut-map so every output channel lands in 0..1, and guard pow/sqrt/division.
- **Never white, never clipped.** Clipping in the focal object is noticed right away.
- **Palettes should belong to the scene.** "Blend the eye in", "make sure its color palette makes
  sense". Separate color families pasted together read as a sticker.
- **Palettes the user has liked:**
  - Van Gogh blue tile sky with gold accents (keep the sky blue; it must not drift to brown or
    maroon)
  - 1960s LSD-poster contour bands in vibrating complementary pairs
  - Miami beach/sand as an opening palette
  - sun palette of gold → amber → ember → red-magenta
- **Avoid:** a single intense standalone teal, lime against brown, and orange/gold washing the
  whole frame.

## Composition and form

- **The focal object should be the most compelling thing on screen, but it does not have to be
  the brightest.** "The sun can sometimes be darker than the rays, it's fine" (2026-10-06). That
  overrides an earlier critic rule. A dim or muddy focal object is still worth a look; a core
  darker than its rays is not a defect.
- **No painted rings.** "I do not like those rings." Ripples and rings should be distortion of the
  previous frame, not drawn color.
- **Inside a plasma or organic core:** no solid black, no straight lines, no glowing outline
  around darker cells. It should be "a powerful plasma-ish ball". Curling and coiling beat
  radial straightness.
- **The focal object must blend into its emission.** "The border between the sun and its rays
  needs to be softer... It needs to blend." (2026-10-06). There should be no visible edge where a
  glowing core meets its rays or corona. The limb, the ray roots and the glow share hue and fade
  continuously.
- **Small or distant focal objects pulse harder with the beat.** "When the sun is far away/small,
  it can pulse more with the beat" (2026-10-06). Scale the kick and bass pulse inversely with the
  object's on-screen size.
- **Tendrils and rays should be continuous, curling, flexing slowly, and grow out of the core.**
  Huge reach is "an aesthetic sometimes", not always.
- **Don't zoom in too far.** Leave room for the world around the focal object, and give the user a
  ZOOM knob.
- **Over-the-top beats subtle**, but washed-out is never acceptable. Keep a dark floor (meter dark
  ~0.1–0.3, lumMin ≥ 0.08); dark acts can be moody but not black.
- **Long-form storytelling is welcome:** acts over minutes, day→night, a sun drifting across the
  sky, red/dark/small dying phases, gigantic supernova moments, abstract nebula interludes,
  companions that orbit and touch. "We can get pretty abstract too."

- **Backgrounds must stream forward and never shiver.** "The background is shivering. We need the
  controller to provide continuous forward motion" (2026-10-06). Every background motion runs on a
  monotonic accumulator, normally in the controller. Audio may change its rate, but never its
  direction or position directly. Audio displacement is a slowly eased amplitude on a field that
  keeps moving forward, not a back-and-forth push.
- **Backgrounds read as deep space, not a bright rainbow wall.** "We need that rainbow background
  darker so it's more spacey" (2026-10-06). Psychedelic background colors should be dim, luminous
  veils of gas over deep indigo-black, and only brighten where the audio surges them.
- **Background gas is translucent.** "Background needs to be more transparent" (2026-10-06).
  Gas should be thin veils over a starfield, with clear gaps of open space, not opaque painted
  bands. A repeated complaint: derive gas color continuously from the field, never from a stepped
  band index, and dither the darks.
- **No harsh color banding.** "We need to not have harsh color banding" (2026-10-06). Psychedelic
  bands are welcome, but transitions between bands must be soft, flowing blends: OKLab mixes,
  wide smoothsteps, and dither in dark gradients. No stair-steps or hard hue cuts.

- **No unmotivated big changes.** "That sudden growth of the sun was not warranted by the music.
  The music should trigger changes like that" (2026-10-06). Size jumps, act changes and shutter
  resizes land on a real musical moment and are logged with their cause. Timer fallbacks are long
  and gentle; in steady music the story holds.
- **Story events only happen because the music earned them.** "The 'sun kiss' would only happen
  as the result of a significant audio event that makes sense" (2026-10-06). Kisses, collisions
  and similar beats fire on drops, section changes or strong onset clusters, with a refractory.
  No timer or random triggers; a manual knob is fine.

## Live-show behavior

- **Nothing may flash or reload the wall.** "We can't have flashes like that." Shader edits
  hot-swap. Controller edits hot-swap since PR #144, with state kept on a page global. Never
  restart the dev server or reload the show page mid-set.
- **Flicker is a defect** (meter above ~0.4–0.7), unless the user's own hands on the knobs are
  causing it.
- **Must hold 60 fps on the show machine.** "It's too slow" is a stop-everything problem; the user
  will trade stylization for speed ("doesn't need to be as stylized if it's easier on the gpu").
- **The show display is the dedicated show browser** (`scripts/vj/show.js`). No extension cursor,
  glow or infobars. Audio comes from the OS default input; don't pass `audio_device` unless asked.
- **The parent session stays responsive.** Heavy work goes to sub-agents, and the user's words
  are triaged first.
- **Fork good moments freely** (`/fork`). The user forks often and likes autonomous forks of cool
  moments. Fork the controller alongside the shader whenever the shader depends on it.
- **Once a good core exists, the user is happy to let it "get creative and run with it over
  time"**, one verified change at a time.
- **A screenshot-judging art critic should run continuously** during sessions. Its suggestions
  are weighed against the user's stated wants, which always win.

## How to keep this current

- After any session with design feedback, add the new rules here, quoting the user's own words
  and dating them.
- Shader-specific decisions belong in that shader's doc (for example
  `shaders/sun/sun.md`). Only taste that generalizes goes here.

- **Flicker tolerance (2026-10-09):** occasional meter flicker around 1.2–1.6 is fine ("Flickering is ok at this level occasionally"). Only alert on 2 or more, or on sustained runs.
