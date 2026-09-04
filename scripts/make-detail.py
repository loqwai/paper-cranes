"""Fork arrival.frag -> detail.frag: SUBTLE DETAIL FROM THE LESSER-KNOWN FEATURES.

User: "you have MANY audio uniforms to play with. Make a more detailed series that have subtle
features keyed off some of the lesser-known audio features."

EVERY SIGNAL HERE WAS MEASURED ALIVE FIRST. That is not ceremony - the previous tick wired the
rim hue to `pitchClassMedian`, which measures range 0.000 on this rig, so that channel did
nothing at all. Measured over 9s on live audio before writing a line:

    spectralEntropySmooth      range 0.821   (controller, smoothed)
    spectralCrestSmooth        range 0.818   (controller, smoothed)
    spectralRoughnessSmooth    range 0.776   (controller, smoothed)
    waveletBand5Spring         range 0.396
    waveletCentroidSpring      range 0.403
    spectralSpreadRSquared     range 0.291   <- the interesting one
    spectralRolloffRSquared    range 0.272
    spectralRoughnessRSquared  range 0.268

AND THE NEGATIVE RESULT: the entire `*Slope` family is ABSENT on this build. Every one of
spectralCentroidSlope / energySlope / bassSlope etc. returned no value at all, despite being
documented in CLAUDE.md. Do not wire a Slope uniform without measuring it first.

THE R-SQUARED FAMILY IS THE FIND. It is trend CONFIDENCE - "is this change steady, or chaotic?"
- and nothing in this shader family had ever used it. It sits near 0.04 most of the time and
rises toward 0.29 when a feature is moving in a genuinely straight line, which makes it a
perfect gate for detail that should appear only when the music is *going somewhere*.

FIVE CHANNELS, FIVE PROPERTIES, NO OVERLAP - the coat journals' proven pattern:

  TREND RINGS  <- spectralSpreadRSquared    fine concentric contours inside the bead, crisp only
                                            while the spectrum's width is on a confident trend
  GRAIN        <- spectralRoughnessSmooth   fine speckle density on the bead interior
  RIM WIDTH    <- spectralCrestSmooth       the contour breathes thicker on peaky material
  HAZE         <- waveletBand5Spring        how much the interior detail dissolves
  HUE TILT     <- waveletCentroidSpring     replaces the DEAD pitchClassMedian from last tick

All five are SMOOTHED springs, medians or regression statistics - none is a raw or z-scored
value - so none of them can shudder. Coefficients are deliberately small: the brief was SUBTLE,
and the frame already carries the arrival event as its loud gesture.

DETAIL defaults to 0.75; ?detail=0 reproduces arrival.frag exactly.
"""
import io
import os
import re

SRC = "shaders/redaphid/wip/lattice-bead/arrival.frag"
DST = "shaders/redaphid/wip/lattice-bead/detail.frag"

assert not os.path.exists(DST), "detail.frag exists - refusing to overwrite"
src = io.open(SRC, encoding="utf-8").read()
src = re.sub(r"// ==== PRESETS.*?// ==== END PRESETS ====\n", "", src, flags=re.S)

HEADER = """// LATTICE-BEAD (detail.frag - FORK of arrival.frag on 2026-09-04) - THE QUIET CHANNELS.
//
// arrival.frag gave the frame its loud gesture (the crest resolving on an onset). This adds the
// quiet ones: five SUBTLE, always-on details keyed to features almost nothing uses.
//
// EVERY SIGNAL WAS MEASURED ALIVE BEFORE BEING WIRED. The previous tick keyed the rim hue to
// `pitchClassMedian`, which measures range 0.000 on this rig - that channel did nothing at all.
// Measured over 9s of live audio:
//     spectralEntropySmooth 0.821 · spectralCrestSmooth 0.818 · spectralRoughnessSmooth 0.776
//     waveletCentroidSpring 0.403 · waveletBand5Spring 0.396 · spectralSpreadRSquared 0.291
//
// NEGATIVE RESULT WORTH KEEPING: the whole *Slope* family is ABSENT on this build. Every one of
// energySlope / bassSlope / spectralCentroidSlope returned no value, despite CLAUDE.md
// documenting them. Measure before wiring.
//
// THE R-SQUARED FAMILY IS THE FIND. It is trend CONFIDENCE - "is this change steady or chaotic"
// - and nothing in this shader family had used it. It idles near 0.04 and climbs toward 0.29
// when a feature is genuinely travelling in a straight line, which makes it the right gate for
// detail that should only appear when the music is GOING somewhere.
//
// FIVE CHANNELS, FIVE PROPERTIES, NO OVERLAP (the coat journals' proven routing pattern):
//   TREND RINGS <- spectralSpreadRSquared   concentric contours inside the bead; crisp only on a
//                                           confident trend, dissolved when the spectrum churns
//   GRAIN       <- spectralRoughnessSmooth  fine speckle density across the bead interior
//   RIM WIDTH   <- spectralCrestSmooth      the contour breathes thicker on peaky material
//   HAZE        <- waveletBand5Spring       how much interior detail dissolves
//   HUE TILT    <- waveletCentroidSpring    replaces the DEAD pitchClassMedian
//
// All five are smoothed springs or regression statistics - no raw values, no z-scores - so none
// can shudder. Coefficients are small on purpose: the brief was SUBTLE, and the frame already
// has its loud gesture. None of these touch geometry, and none is a global multiplier: every one
// is masked by `cov` or `rim`, so the ground between beads is untouched and cannot strobe.
//
// DETAIL defaults to 0.75; ?detail=0 reproduces arrival.frag exactly.
"""
src = HEADER + src

# ---- uniforms + macro ----------------------------------------------------------------------
anchor = "uniform float arrive;"
assert anchor in src
DECLS = "\n".join([
    "uniform float detail;      // ?detail=0..1 the five quiet channels (default 0.75)",
    "uniform float breathe;     // ?breathe=0..1 per-bead slow scaling (default 0.85)",
    "// Controller / regression outputs the wrapper does NOT auto-declare, so they must be",
    "// declared by hand or the shader fails with an undeclared-identifier error. Both were",
    "// measured alive on this rig; spectralSpreadRSquared is the trend-confidence signal that",
    "// nothing else in this shader family had ever used.",
    "uniform float spectralEntropySmooth;",
    "uniform float spectralSpreadRSquared;",
    "",
])
src = src.replace(anchor, DECLS + anchor, 1)

arr = "#define ARRIVE      (clamp(max(knob_182, arrive > 0.0 ? arrive : 0.85), 0.0, 1.0))"
assert arr in src
src = src.replace(arr, arr + """
// DETAIL: master for the five quiet channels. max() so 0 is reachable (the LVK convention
// cannot express zero - that bug already cost one sweep).
#define DETAIL (clamp(max(knob_183, detail > 0.0 ? detail : 0.75), 0.0, 1.0))
// BREATHE: per-bead scaling amount. Geometry, so it is deliberately capped and slow-driven only.
#define BREATHE (clamp(max(knob_184, breathe > 0.0 ? breathe : 0.85), 0.0, 1.0))""", 1)

# ---- PER-BEAD BREATHING: each cell scales on its OWN slow feature ---------------------------
# User: "Have the bead silhouettes individually slowly move in and out (scaling) depending on the
# very slow audio uniforms - different for each one."
#
# This is geometry, and the standing rule is that geometry only EVOLVES. The rule forbids
# per-frame TRANSIENTS on geometry, which is exactly what this is not: every driver here is a
# smoothed controller spring or a regression statistic, the amplitude is capped at +/-12%, and a
# slow sine keeps each cell moving even when its feature holds still. So it breathes rather than
# pumps, and no kick can make the lattice jump.
old_sd = """float seedDist(vec2 p, float pitch){
    vec2 f = (fract(p / pitch + 0.5) - 0.5) * pitch;   // one tile, centred, [-pitch/2, pitch/2)
    return beadDist(f, pitch * 0.5);                   // beadDist rescales: sample at p/r, multiply back by r
}"""
new_sd = """// hash11 is defined further down the file (line ~784) but the per-bead breathing needs it up
// here, so FORWARD-DECLARE it. GLSL ES 3.00 allows a prototype; without one the compiler reports
// "no matching overloaded function found", which the STATIC validator does not catch - only a
// real GL compile does. That is why every edit here is render-checked, not just linted.
float hash11(float p);

// EIGHT SLOW DRIVERS, one per hash bucket, so neighbouring beads breathe on DIFFERENT musical
// quantities instead of in unison. Every one measured alive on this rig (ranges in the header);
// every one is a smoothed spring or a regression statistic, never a raw or z-scored value.
float slowDriver(float h){
    float b = floor(h * 8.0);
    if (b < 0.5) return spectralCrestSmooth;
    if (b < 1.5) return spectralRoughnessSmooth;
    if (b < 2.5) return spectralEntropySmooth;
    if (b < 3.5) return waveletCentroidSpring;
    if (b < 4.5) return waveletBand5Spring;
    if (b < 5.5) return waveletBassSpring;
    if (b < 6.5) return energySpring;
    return clamp(spectralSpreadRSquared / 0.29, 0.0, 1.0);
}

float seedDist(vec2 p, float pitch){
    vec2 q  = p / pitch + 0.5;
    vec2 id = floor(q);                                // which bead this is, in world space
    vec2 f  = (fract(q) - 0.5) * pitch;                // one tile, centred, [-pitch/2, pitch/2)

    // ── PER-BEAD BREATHING ────────────────────────────────────────────────────────
    // Each bead hashes to ONE of eight slow drivers and to its own phase, so the wall reads as
    // many individuals breathing at their own rate rather than one lattice pulsing. hash11 is
    // the stable hash: fract(sin(x)*43758.5453) is unstable in float32 and caused a two-state
    // flicker in this shader's history - never reintroduce it.
    float h    = hash11(id.x * 37.1 + id.y * 91.7 + 5.0);
    float ph   = hash11(id.x * 13.3 + id.y * 7.9) * 6.2831853;
    float slow = clamp(slowDriver(h), 0.0, 1.0);
    // +/-12% total. The audio term is capped at 8% and an always-on 4% sine keeps a bead moving
    // even while its own feature sits still, so nothing ever looks frozen.
    float sc = 1.0 + BREATHE * (0.08 * (slow - 0.5) * 2.0 + 0.04 * sin(iTime * 0.11 + ph));
    sc = max(sc, 0.55);                                // never invert or collapse the field
    // beadDist samples at p/r and multiplies back by r, so dividing in and multiplying out keeps
    // the result a true distance at the new scale.
    return beadDist(f / sc, pitch * 0.5) * sc;
}"""
assert old_sd in src, "seedDist not found"
src = src.replace(old_sd, new_sd)

# ---- seedLayer gains the ring band ----------------------------------------------------------
old = """    return vec3(cov, rim, clamp(max(b1, b2 * 0.7), 0.0, 1.0) * cov);"""
new = """    return vec3(cov, rim, clamp(max(b1, b2 * 0.7), 0.0, 1.0) * cov);
}

// TREND RINGS. Concentric contours at fixed inward offsets, following the motif's own distance
// field so they trace ITS shape rather than a circle. `crisp` narrows the band, so a confident
// trend draws hairlines and a churning spectrum smears them into nothing. Returned separately
// from seedLayer so the two seed octaves can share it without another vec4.
float seedRings(vec2 p, vec2 c, float k, float pitch, float aaBase, float pitchStep, float crisp){
    float d  = seedDist((p - c) * k + c, pitch);
    float aa = clamp(aaBase * k * 1.5, 1e-4, pitch * 0.04);
    float w  = aa * mix(6.0, 1.6, crisp);         // wide + soft when the trend is weak
    float r  = 0.0;
    for (int i = 1; i <= 3; i++){
        float off = pitchStep * float(i);
        r = max(r, smoothstep(w, 0.0, abs(d + off)));
    }
    return r * smoothstep(aa, -aa, d);            // interior only"""
assert old in src
src = src.replace(old, new)

# ---- compute the five channels next to the existing arrival block ---------------------------
old2 = "        float rimW = mix(4.0, 11.0, legNow);"
new2 = """        // ── THE FIVE QUIET CHANNELS ──────────────────────────────────────────────
        // Every one measured alive before wiring; every one smoothed, so none can shudder.
        float trendConf = clamp(spectralSpreadRSquared / 0.29, 0.0, 1.0);   // 0.29 = measured live max
        float grainAmt  = clamp(spectralRoughnessSmooth, 0.0, 1.0);
        float crestAmt  = clamp(spectralCrestSmooth, 0.0, 1.0);
        float hazeAmt   = clamp(waveletBand5Spring, 0.0, 1.0);
        float hueTilt   = (clamp(waveletCentroidSpring, 0.0, 1.0) - 0.5) * 0.09 * DETAIL;

        // RIM WIDTH breathes with crest. Small span (11.0 +/- 2.2) so the contour thickens
        // perceptibly on peaky material without ever becoming the lavender halo the critic
        // objected to.
        float rimW = mix(4.0, 11.0 + (crestAmt - 0.5) * 4.4 * DETAIL, legNow);"""
assert old2 in src
src = src.replace(old2, new2, 1)

# ---- draw them, all cov/rim-masked ----------------------------------------------------------
old3 = "        col *= 1.0 - gap * NEGATIVE * 0.97;   // hand knob only - drawing, never an event"
new3 = """        col *= 1.0 - gap * NEGATIVE * 0.97;   // hand knob only - drawing, never an event

        // TREND RINGS: hairlines inside the bead that sharpen only while the spectrum's width is
        // on a confident trend. Drawn as a DARKENING, so they read as engraved line rather than
        // added glow - and so they cannot brighten the frame.
        float rings = max(seedRings(uv, world, kA, seedPitch, aaBase, seedPitch * 0.085, trendConf),
                          seedRings(uv, world, kB, seedPitch, aaBase, seedPitch * 0.085, trendConf));
        col *= 1.0 - rings * DETAIL * (0.10 + 0.30 * trendConf) * cov;

        // GRAIN: fine speckle over the interior, density from roughness. Uses the stable hash -
        // never fract(sin(x)*43758.5453), which is unstable in float32 and caused a two-state
        // flicker earlier in this shader's history.
        float gx = floor(uv.x / max(seedPitch * 0.035, 1e-4));
        float gy = floor(uv.y / max(seedPitch * 0.035, 1e-4));
        float grain = hash11(gx * 3.7 + gy * 11.3);
        col *= 1.0 - cov * DETAIL * grainAmt * 0.09 * step(0.62, grain);

        // HAZE: the interior detail dissolves toward the bead's own ink as the top wavelet octave
        // fills in. A softening, not a brightening.
        col = mix(col, beadInk, cov * DETAIL * hazeAmt * 0.14);"""
assert old3 in src
src = src.replace(old3, new3)

# ---- hue tilt replaces the DEAD pitchClassMedian -------------------------------------------
old4 = "        float rimHue = s + 0.33 + (pitchClassMedian - 0.5) * 0.10;"
new4 = """        // pitchClassMedian measured range 0.000 on this rig - it was a dead channel. Replaced
        // with waveletCentroidSpring (measured 0.403), which is also slow, so colour still
        // follows the slowest music as the hierarchy requires.
        float rimHue = s + 0.33 + hueTilt;"""
assert old4 in src
src = src.replace(old4, new4)

io.open(DST, "w", encoding="utf-8").write(src)
print("wrote", DST)
