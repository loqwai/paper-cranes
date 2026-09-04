"""Fork negative.frag -> arrival.frag: THE CREST ARRIVES.

Built on the art critic's second verdict, which was about MOTION and is the sharpest thing
anyone has said about this project:

  "There is a difference between a visual that RESPONDS to music and one that is ANIMATED by
   it. A car alarm responds to sound. This system is closer to the car alarm."

Their evidence, all of it checkable in the render sweeps:
  * quiet / loud / stage-loud are the same picture with the gain up - a DIMMER SWITCH, the one
    mapping a room's real lighting rig already does better
  * the infinity zoom is perceptually INVISIBLE: 28 seconds of dive, six near-identical frames.
    A self-similar lattice has no landmark to pass, so constant motion reads as a still image
    breathing. "A camera that moves constantly and arrives nowhere."
  * MIRROR SYMMETRY IS A STILLNESS OPERATOR. When a symmetric field changes, every copy changes
    at once, so the eye cannot localise the event and a hit reads as an overall shimmer.
    "Kaleidoscopes are hypnotic and never percussive."
  * no transients anywhere: "the system has no visual word for NOW"
  * and the structural one: legibility and motion are MUTUALLY EXCLUSIVE as built. The crest
    only resolves in a knife-edge window of size and framing, so any audio touching zoom or
    size destroys the recognition the whole project is for.
      "The more musical it gets, the less it's a bead. The more it's a bead, the less it moves."

THE FIX THEY PRESCRIBED, AND WHAT THIS FILE IS: stop treating legibility as a SETTING and make
it an EVENT. The lattice is the resting state - dark, fine, line-based. On the onset the crest
RESOLVES OUT of the lattice at full clarity, holds, and breathes back.

Why this dissolves the contradiction rather than tuning around it: recognition does not need to
be continuous. It needs to happen once, hard, unmistakably. One second at full clarity on the
drop is more nameable than four minutes of a permanently legible blob - because the arrival
itself is what makes the eye look up. And it hands the NFC tap the theatre it always wanted:
the wall does not display your crest, it RESOLVES INTO it, in front of everyone, then dissolves.

TWO DESIGN CHOICES THAT MATTER:

1. ONSET, NOT LEVEL. The critic asked for this independently and it is also what the measured
   data says: per-frame jitter is energyZScore 0.3072 / energySpring 0.0320 / onsetEnvelope
   0.0087. Loudness is a curve; hits are where music keeps its time. Needs
   ?onset_refractory_ms=380 or the detector free-runs at ~213 BPM chasing hats.

2. THE ARRIVAL TRAVELS. A simultaneous change is exactly what mirror symmetry cancels, so the
   resolve is gated by a radial front expanding from the world centre: near cells resolve first,
   far cells a beat later. The eye gets a direction, and the mirror can no longer cancel the
   moment because the copies are no longer in phase.

ARRIVE defaults to 0.85 - this file exists to do this, so it is on by default. Set ?arrive=0 to
get negative.frag's static behaviour back for comparison.
"""
import io
import os
import re

SRC = "shaders/redaphid/wip/lattice-bead/negative.frag"
DST = "shaders/redaphid/wip/lattice-bead/arrival.frag"

assert not os.path.exists(DST), "arrival.frag exists - refusing to overwrite"
src = io.open(SRC, encoding="utf-8").read()
src = re.sub(r"// ==== PRESETS.*?// ==== END PRESETS ====\n", "", src, flags=re.S)

HEADER = """// LATTICE-BEAD (arrival.frag - FORK of negative.frag on 2026-09-04) - THE CREST ARRIVES.
//
// The art critic's verdict on motion, which is the sharpest thing said about this project:
//   "A car alarm responds to sound. This system is closer to the car alarm."
// Quiet and loud were the same picture with the gain up - a DIMMER SWITCH. The infinity zoom
// was perceptually invisible (a self-similar lattice has no landmark to pass, so 28 seconds of
// dive gave six identical frames). And mirror symmetry is a STILLNESS OPERATOR: when a
// symmetric field changes, every copy changes at once, so a hit reads as an overall shimmer
// rather than a hit. The system had no visual word for NOW.
//
// Worse, the two halves of the project were fighting: the crest only resolves in a knife-edge
// window of size and framing, so any audio touching zoom or size destroyed recognition.
//   "The more musical it gets, the less it's a bead. The more it's a bead, the less it moves."
//
// THIS FILE DISSOLVES THAT rather than tuning around it. Legibility stops being a SETTING and
// becomes an EVENT: the lattice rests dark and fine, and on the onset the crest RESOLVES OUT of
// it at full clarity, holds, and breathes back. Recognition does not need to be continuous - it
// needs to happen once, hard. One second at full clarity on the drop is more nameable than four
// minutes of a permanently legible blob, because the arrival is what makes the eye look up.
// It also gives the NFC tap its theatre: the wall does not display your crest, it resolves into
// it in front of everyone, then dissolves back.
//
// ── THE TWO CHOICES THAT MATTER ────────────────────────────────────────────────────────
// ONSET, NOT LEVEL. Measured per-frame jitter: energyZScore 0.3072 / energySpring 0.0320 /
//   onsetEnvelope 0.0087. Loudness is a curve; hits are where music keeps its time. Requires
//   ?onset_refractory_ms=380 or the detector free-runs at ~213 BPM chasing hi-hats.
// THE ARRIVAL TRAVELS. A simultaneous change is precisely what the mirror cancels, so the
//   resolve is gated by a radial front expanding from the world centre - near cells resolve
//   first, far cells a beat later. The copies fall out of phase, so the moment survives.
//
// ARRIVE defaults to 0.85: this file exists to do this. ?arrive=0 restores static behaviour.
//
// NOT CONFIRMED BY A HUMAN EYE YET. Built while the user slept, from a critique rather than
// from watching it run. The hold/release times especially are guesses that want a real listen.
"""
src = HEADER + src

# uniforms
anchor = "uniform float negative;"
assert anchor in src
src = src.replace(anchor,
    "uniform float arrive;      // ?arrive=0..1 how much of legibility is an EVENT (default 0.85)\n"
    "uniform float arriveSpeed; // ?arriveSpeed= how fast the resolve front travels outward\n"
    + anchor, 1)

neg = "#define NEGATIVE (clamp(max(knob_181, negative), 0.0, 1.0))"
assert neg in src
src = src.replace(neg, neg + """
// ARRIVE: how much of legibility is handed to the EVENT rather than held as a static setting.
// Defaults ON (0.85) because that is the point of this fork. max() so 0 is reachable - the
// house LVK convention cannot express zero and that bug already cost one sweep.
#define ARRIVE      (clamp(max(knob_182, arrive > 0.0 ? arrive : 0.85), 0.0, 1.0))
#define ARR_SPEED   (arriveSpeed > 0.0 ? arriveSpeed : 2.6)
// Attack fast enough to read as a hit, release long enough to hold the crest for a beat at
// ~125 BPM (one beat = 0.48s), then breathe back rather than snap off.
#define ARR_ATTACK  0.020
#define ARR_RELEASE 0.62""", 1)

# The arrival term, computed where uv/world exist, and folded into the legibility used below.
old = """        float rimW = mix(4.0, 11.0, LEGIBLE);"""
new = """        // ── THE ARRIVAL ──────────────────────────────────────────────────────────
        // A TRAVELLING resolve front, not a global switch. `rad` is distance from the world
        // centre; subtracting it from the elapsed time means near cells resolve first and far
        // cells a beat later, so the mirrored copies are out of phase and can no longer cancel
        // the moment. This is the whole reason the arrival is legible as an EVENT at all.
        float rad     = length(uv - world);
        float front   = clamp(max(timeSinceOnset, 0.0) * ARR_SPEED - rad, 0.0, 1.0);
        float arrEnv  = onsetEnvelope(ARR_ATTACK, ARR_RELEASE) * clamp(onsetStrength * 1.7, 0.0, 1.0);
        // QGATE last, so a quiet passage cannot fire the crest out of silence. Applied AFTER
        // the threshold-free envelope: gating BEFORE a threshold once crushed a drive to a 0%
        // duty cycle and the jitter metric looked superb precisely because the signal was gone.
        float arrival = arrEnv * smoothstep(0.0, 0.35, front) * QGATE;
        // Legibility used from here on: the hand knob is the FLOOR, the event rides on top.
        // Still a drawing lever (interior flatten / contour width / carved band) - it never
        // moves a cell boundary, so the geometry-only-evolves rule is not touched.
        float legNow = clamp(LEGIBLE * (1.0 - ARRIVE * 0.55) + arrival * ARRIVE, 0.0, 1.0);
        float rimW = mix(4.0, 11.0, legNow);"""
assert old in src
src = src.replace(old, new, 1)

# every later LEGIBLE inside the seed block becomes legNow
for a, b in [
    ("float inset = seedPitch * 0.055 * NEGATIVE;",
     "float inset = seedPitch * 0.055 * NEGATIVE;"),
    ("col = mix(col, beadInk, cov * LEGIBLE * 0.72);",
     "col = mix(col, beadInk, cov * legNow * 0.72);"),
    ("float seedDepth = mix(mix(0.25, 0.50, pump), mix(0.58, 0.82, pump), LEGIBLE);",
     "float seedDepth = mix(mix(0.25, 0.50, pump), mix(0.58, 0.82, pump), legNow);"),
    ("col += lush(s, 0.95) * cov * knob_168 * (0.05 + 0.58 * pump) * mix(1.0, 1.9, LEGIBLE);",
     "col += lush(s, 0.95) * cov * knob_168 * (0.05 + 0.58 * pump) * mix(1.0, 1.9, legNow);"),
    ("col += lush(s + 0.33, 1.0) * rim * knob_168 * (0.22 + 0.45 * trebLive * QGATE) * mix(1.0, 1.6, LEGIBLE);",
     "col += lush(s + 0.33, 1.0) * rim * knob_168 * (0.22 + 0.45 * trebLive * QGATE) * mix(1.0, 1.6, legNow);"),
]:
    assert a in src, f"missing: {a[:50]}"
    src = src.replace(a, b)

io.open(DST, "w", encoding="utf-8").write(src)
print("wrote", DST)
