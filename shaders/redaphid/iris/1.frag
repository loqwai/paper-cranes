// @fullscreen: true
//https://visuals.beadfamous.com/?shader=redaphid/iris/1&wavelet=true&controller=wavelet-ease&fullscreen=true&knob_1=0.45&knob_20=0.1&knob_21=1.0&knob_2=0.2&knob_3=0.66&knob_27=1&knob_8=1&knob_18=0.7&knob_26=0.8&knob_41=0.6&knob_9=0.7&knob_10=0.6&knob_11=0.6&knob_12=0.6&knob_13=0.6&knob_6=1.0&knob_14=0.4&knob_15=0.5&knob_16=0.4
// GOOD REACTIVE PRESET — tuned live look with full music response (knob_6 band-reactivity up, knob_7 drop_glow restored to full range, skew/spread enabled, chroma back):
//https://visuals.beadfamous.com/?shader=redaphid/iris/1&wavelet=true&controller=wavelet-ease&fullscreen=true&knob_1=0.921&knob_2=1&knob_3=0.496&knob_4=0.551&knob_5=1&knob_6=1.0&knob_7=0.1&knob_8=1&knob_9=1&knob_10=0.6&knob_11=0.197&knob_12=0.6&knob_13=0.323&knob_14=0.283&knob_15=0.378&knob_16=0.063&knob_17=0.646&knob_18=0.69&knob_19=0.37&knob_20=0.457&knob_21=0.5&knob_22=0.315&knob_23=0.661&knob_24=1&knob_25=0.315&knob_26=0.79&knob_27=0.346&knob_28=0.079&knob_30=0.354&knob_31=0.339&knob_32=0.079&knob_33=0.268&knob_34=0
// @mobile: false
// License: CC0
//  iris/7 driven by the WAVELET + SPECTRAL features (forked from iris/7, swapping the
//  dodeca-bloom controller for wavelet-ease + FFT spectral). MOTION phases are iTime-based
//  (monotonic, never snap); audio LEVELS map by family to fractal REGIONS (bass=core,
//  mids=arms, treble=tips). MELODY drives the palette journey, spectral CREST flashes the
//  pupil on each articulated note — tuned for melodic/vocal content (horn, voice).
//  Requires: ?wavelet=true&controller=wavelet-ease

const float baseSize = 0.75;
const float baseOffc = 1.05;
const float width = 0.0125;
const int rep = 15;

#define PHI   (.5*(1.+sqrt(5.)))
#define PI    3.141592654
#define TAU   (2.0*PI)
#define TTIME (TAU*iTime)

// === DRIVEN BY OUR WAVELET + SPECTRAL FEATURES (no dodeca-bloom controller) ===
// This variant feeds the iris directly from the wavelet-ease controller + FFT spectral
// features instead of dodeca-bloom. The monotonic *_phase accumulators the controller used
// (shaders can't accumulate) are replaced with iTime-based phases, which are monotonic by
// construction. The *_env LEVELS map to our smooth spring-eased wavelet/spectral signals.
//   Run: ?shader=claude/wip/iris/wavelet&wavelet=true&controller=wavelet-ease&fullscreen=true
//
// Our feature uniforms (from wavelet-ease controller, + FFT spectral auto-declared):
uniform float waveletBassSpring; // smooth deep-bass level
uniform float waveletBand2Spring; // low-mid (vocal/instrument body)
uniform float waveletBand3Spring; // mid
uniform float waveletBand5Spring; // treble/air
uniform float waveletCentroidSpring; // wavelet brightness
uniform float energySpring; // loudness
uniform float wubDepth; // dubstep wobble intensity
uniform float melodyFlow; // flowing melody/pitch contour
uniform float wavelet_bassHit; // sharp kick/drop trigger — drives the zoom punch
uniform float waveletBassZScore; // self-calibrating bass spike — kick zoom (works at any gain)
// spectralCrestSmooth, spectralRoughnessSmooth, spectralEntropyNormalized,
// spectralFluxZScore are FFT features — auto-declared by the wrapper.

// MOTION phases — monotonic from iTime (the controller did this in JS; iTime is monotonic).
// Speed modulated by audio LEVELS so motion quickens with intensity, knob_2 = base speed.
// Slowed way down — was spinning too fast. Rates are monotonic (always forward); audio
// gently modulates SPEED via a small +term, never the angle (so no rotate-back).
// quietGate (0 in quiet, 1 when loud) multiplies the AUDIO offsets so quiet-noise can't
// drive fast spin / hue flashing — at low energy these fall back to their gentle base rate.
// STRICTLY MONOTONIC: audio modulates the RATE (inside the iTime multiplier), never adds to
// the angle — so these only ever move FORWARD, faster on louder/bassier audio, never back.
// SPIN SPEED is now fully knob-controlled: knob_2 sets base spin (0 = nearly still), knob_41
// sets how much the BASS speeds it up. Base rate cut way down — at knob_2=0 it barely drifts.
// PHASES come from the controller as MONOTONIC ACCUMULATORS (phase += rate*dt). This avoids
// the iTime*rate ACCELERATION bug: with iTime*rate, any change in rate jumps the angle by
// iTime*Δrate, and that jump grows as iTime grows → the spin speeds up over time. Accumulated
// phases never do that — the bass-speedup is baked into the accumulator's RATE in the
// controller, so here we only scale by the STATIC knob (a constant factor can't accelerate).
#define spin_angle   (spinPhase * knob_2 * 2.0)
#define morph_phase  (morphPhase)
#define flow_phase   (flowPhase)
#define hue_phase    (huePhase)

// ════════════════════════════════════════════════════════════════════════════════════════
//  LIVE MODULATION KNOBS — dial each audio effect's DEPTH (0 = off, 1 = full). Map these to
//  MIDI or set in the URL. Defaults below give the current look; turn any to 0 to disable it.
//    knob_2  = SPIN base speed       (0 = nearly still)        ← slow the spin here
//    knob_41 = how much BASS speeds the spin
//    knob_9 = MELODY → hue amount
//    knob_10 = SKEW → petal lean (shape shear)
//    knob_11 = KURTOSIS → focus/diffuse
//    knob_12 = SPREAD → ring spacing
//    knob_13 = ROLLOFF → outer reach
//    knob_6 = energy/band level reactivity (size/depth breathing)
//    knob_14 = TILT → hue sub-lean
//    knob_15 = TUNNEL zoom speed (feedback push — a big part of apparent SPEED)
//    knob_16 = TUNNEL swirl speed (feedback rotation — the OTHER fast-spin source)
// Each knob is a 0→1 depth: 0 = that effect OFF, 1 = full. The preset URL sets good starting
// values; turn any knob down live to calm that effect, up to intensify it. Direct + simple.
#define MOD_SPIN_AUDIO  (knob_41)
#define MOD_HUE         (knob_9)
#define MOD_SKEW        (knob_10)
#define MOD_KURT        (knob_11)
#define MOD_SPREAD      (knob_12)
#define MOD_REACH       (knob_13)
#define MOD_LEVEL       (knob_6)
#define MOD_TILT        (knob_14)

// LEVELS — map our smooth wavelet/spectral features onto iris's reactive envelopes.
#define bass_env     (waveletBassSpring)                  // core thickness / bass reactivity
#define mids_env     (waveletBand2Spring)                 // arms — vocal/instrument body
#define treble_env   (waveletBand5Spring)                 // tips — horn air / sibilance
#define energy_env   (energySpring)                       // overall edge glow / line weight
// entropy_env was spectralEntropyNormalized — raw & JITTERY (jumped 0.17/frame, 20x the others)
// and it drives IRIDESCENCE, so it made the shimmer SHIVER. Use smooth tonalStrength instead
// (also "tonal vs noisy", but eased) so iridescence breathes smoothly.
#define entropy_env  (clamp(1.0 - tonalStrength, 0.0, 1.0)) // low tonal = high "entropy" (noisy), smooth
#define centroid_env (waveletCentroidSpring)              // brightness
#define bass_pump    (clamp(wubDepth + waveletBassSpring * 0.5, 0.0, 1.0)) // FAST punch + wub
// drop_glow & pitch_pulse SMOOTHED (not raw z-scores) so the iris breathes, doesn't strobe:
#define drop_glow    (clamp(energySpring * 0.5 + spectralCrestSmooth * 0.4 + knob_7, 0.0, 1.0))
#define pitch_pulse  (clamp(spectralCrestSmooth * 0.6 + tonalStrength * 0.4, 0.0, 1.0))

// ── MANY-FEATURE MODULATION ──────────────────────────────────────────────────────────────
// Spread reactivity across the WHOLE iris: each shape/color constant is a knob BASE plus a
// gentle audio offset from a DIFFERENT smooth feature, so every aspect breathes independently
// with its own part of the music. Kept small (additive offsets) so it modulates, never strobes.
uniform float tonalStrength; // how melodic vs noisy (from wavelet-ease)
uniform float waveletBand4Spring; // high-mid
uniform float waveletBand1Spring; // low-bass
uniform float spectralCrestSmooth; // smoothed spectral crest (was jittery raw)
uniform float spectralRoughnessSmooth; // smoothed spectral roughness (was jittery raw)
uniform float spectralEntropySmooth; // smoothed spectral entropy (was jittery raw)
uniform float quietGate; // 0 in quiet → 1 loud; gates audio offsets (no quiet-noise flashing)
uniform float spinPhase; // monotonic spin accumulator (rate*dt — no iTime*rate acceleration)
uniform float morphPhase; // monotonic morph accumulator
uniform float flowPhase; // monotonic flow accumulator
uniform float huePhase; // monotonic hue accumulator
// NEW fractal-complexity dimensions — measured lively AND smooth on melodic audio (jit<0.06):
uniform float spectralSkewNormalized; // spectral tilt/asymmetry → petal lean
uniform float spectralKurtosisNormalized; // peakedness → focus vs diffuse petals
uniform float spectralSpreadNormalized; // spectral width → ring spread
uniform float spectralRolloffNormalized; // high-freq cutoff → outer reach
// waveletTilt (bass↔treble lean) + waveletBand1 (sub layer) auto-declare.

// === Knobs ===
// knob_1 ZOOM: 0=zoomed-out flat, 1=plunged deep into the fractal tunnel.
// Compounds detail on the way in (more ripple density + sub-layer + deeper twist).
// Every constant below = knob BASE + a gentle offset from a DISTINCT feature, so the iris
// reacts across its whole structure to many parts of the music at once (not one flashy thing).
// ENVIRONMENT-ROBUST: the audio offsets below are tuned to ~half their old amount so the
// full-range direct-in signal produces the same gentle motion the quiet mic did. The
// spring features already ride the self-calibrating Normalized variants (so they sit ~0-1
// on both mic AND direct-in), so reactivity is consistent across environments — these
// gains just set how much that 0-1 swing moves the geometry.
// ── COHERENT MAPPING: SIMILAR AUDIO FEATURES → SIMILAR FRACTAL FEATURES ──────────────────
// Three families, each driving one coherent aspect of the iris:
//   PITCH family  (melody, centroid)  → COLOR + angular position (pitch is circular = hue wheel)
//   LEVEL family  (bass/mids/treble/energy) → SIZE / DEPTH / THICKNESS (more energy = bigger/bolder)
//   TEXTURE family (flux/crest/roughness/wub) → DETAIL / SPARKLE / EDGE (sharp sound = sharp detail)
// This keeps related sounds moving related parts together, instead of one feature scattered
// across unrelated aspects.

#define ZOOM_K      (knob_1)
// ZOOM ← LEVEL (loudness) × RING_REACH (rolloff sets outer reach — defined just below).
#define ZOOM        ((0.35 + ZOOM_K * 2.65 + energySpring * 0.2) * RING_REACH)
#define ZOOM_DEEP   (ZOOM_K * ZOOM_K)

// PITCH FAMILY → COLOR. melody + brightness set the palette + SUB_LEAN (bass↔treble tilt);
// GATED by loudness so quiet noise can't flash the hue (offset fades to 0 when quiet).
// Like iris/7, MASTER_HUE is primarily the knob_20 palette rotation. Audio only GENTLY tints it
// (small coefficients) so the color stays inside iris/7's tuned Oklab journey instead of swinging
// into harsh RGB primaries (the "cheap" look). melodyFlow gives a subtle melodic drift, no more.
#define MASTER_HUE  (knob_20 * 6.28318 + (melodyFlow - 0.5) * 0.5 * MOD_HUE * quietGate + SUB_LEAN)

// LEVEL FAMILY → SIZE / DEPTH / THICKNESS. Band energies set how BIG/BOLD/DEEP, by region.
#define LINE_THICK  (width * (5.0 + energy_env * 5.0) * (0.4 + knob_26 * 1.6))            // loudness = line weight
#define size  (baseSize * mix(0.55, 1.10, knob_3) * (1.0 + waveletBand2Spring * 0.18 * MOD_LEVEL))   // mid energy = facet size
#define offc  (baseOffc * mix(0.70, 1.45, knob_27) * (1.0 + waveletBand5Spring * 0.15 * MOD_LEVEL))   // treble energy = arm spread
#define DEPTH (mix(0.18, 0.50, knob_18) + waveletBassSpring * 0.14 * MOD_LEVEL)                       // bass energy = core depth

// TEXTURE FAMILY → DETAIL / SPARKLE / EDGE. Transients/grit set fine structure (below + IRIDESCENCE/EDGE_GLOW).
// SHAPE FAMILY (NEW): spectral SPREAD/ROLLOFF → ring spacing & outer reach (how wide the spectrum = how far the structure spreads).
#define RIPPLE_FREQ (10.0 + knob_4 * 16.0 + ZOOM_DEEP * 32.0 + waveletBand4Spring * 8.0 + spectralRoughnessSmooth * 6.0 + (spectralSpreadNormalized - 0.5) * 8.0 * MOD_SPREAD * quietGate) // spread = ring spacing
#define RING_REACH  (1.0 + (spectralRolloffNormalized - 0.5) * 0.18 * MOD_REACH * quietGate)  // rolloff = how far the iris reaches outward
#define SUB_LEAN    ((waveletTiltNormalized - 0.5) * 0.25 * MOD_TILT * quietGate)            // bass↔treble lean tints the hue
#define TWIST (knob_19 * 3.14159 + ZOOM_DEEP * 1.6)  // STATIC twist (knob only) — NO audio, so the petals never rock back. Audio drives SHAPE, not this rotation.
#define BASS_REACT (0.8 + knob_8 * 1.4)

// TEXTURE FAMILY → SHIMMER / SPARKLE (continued). Grit & articulation drive the fine glints.
#define IRIDESCENCE (0.7 + 0.6 * entropy_env + spectralRoughnessSmooth * 0.3) // grit adds shimmer
#define EDGE_GLOW   (0.9 + 0.4 * energy_env + spectralCrestSmooth * 0.4)       // articulation glints the edges

// PITCH FAMILY → COLOR (continued). Brightness/crest set the core & corona hues.
#define CORE_HUE   (0.6 + waveletCentroidSpring * 0.8 * quietGate)
#define CORONA_HUE (4.2 - spectralCrestSmooth * 0.6 * quietGate)

const vec3 plnormal = normalize(vec3(1, 1, -1));
const vec3 n1 = normalize(vec3(-PHI, PHI - 1.0, 1.0));
const vec3 n2 = normalize(vec3(1.0, -PHI, PHI + 1.0));
const vec3 n3 = normalize(vec3(0.0, 0.0, -1.0));

float pmin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float dodec(in vec3 z) {
    vec3 p = z;
    float t;
    z = abs(z);
    t = dot(z, n1);
    if (t > 0.0) {
        z -= 2.0 * t * n1;
    }
    t = dot(z, n2);
    if (t > 0.0) {
        z -= 2.0 * t * n2;
    }
    z = abs(z);
    t = dot(z, n1);
    if (t > 0.0) {
        z -= 2.0 * t * n1;
    }
    t = dot(z, n2);
    if (t > 0.0) {
        z -= 2.0 * t * n2;
    }
    z = abs(z);

    float dmin = dot(z - vec3(size, 0., 0.), plnormal);
    // stable ripple frequency; PHASE flows forward via flow_phase (no crawl/snap)
    dmin = abs(dmin) - LINE_THICK * (0.55 + 0.45 * sin(RIPPLE_FREQ * length(p) - 0.5 * p.y + flow_phase));
    return dmin;
}

void rot(inout vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
}

float df(vec2 p) {
    float d = 100000.0;
    float off = DEPTH + 0.22 * sin(morph_phase) + bass_pump * BASS_REACT * 0.06; // bass blooms the core depth
    // iter51 DMT PHASE 1 — PETAL BREATH: each petal slot gets a tiny independent rotational
    // wobble so the zigzag rim "breathes" / "flowers" rather than sitting still. Reads as
    // chrysanthemum geometry slowly opening/closing — classic DMT-aesthetic move.
    // Amplitude tiny (~0.05 rad ≈ 3°), phase from morph_phase + per-petal offset (golden-ratio
    // step to avoid resonance), so each petal moves independently.
    // NEW dimensions (subtle, quietGate-protected so they don't blow up in quiet).
    // IMPORTANT: skew does NOT rotate the petals (that made them rock BACK when skew slid down).
    // Instead SKEW stretches the petal SHAPE asymmetrically — a lean you can see, but no spin-back.
    // KURTOSIS → FOCUS vs DIFFUSE: pulls petals inward (focused star) or pushes out (open flower).
    float petalFocus = 1.0 + (spectralKurtosisNormalized - 0.5) * 0.22 * MOD_KURT * quietGate;
    float skewStretch = (spectralSkewNormalized - 0.5) * 0.18 * MOD_SKEW * quietGate; // asymmetric SHAPE, not rotation
    for (int i = 0; i < rep; ++i) {
        vec2 ip = p;
        float petalI = float(i);
        float petalBreath = 0.05 * sin(morph_phase * 0.7 + petalI * 2.39996); // golden-angle phase (a slow oscillation — intentional)
        rot(ip, petalI * TAU / float(rep) + TWIST + petalBreath); // only static knob TWIST + the breath; NO audio rotation
        ip -= vec2(offc * size * petalFocus, 0.0); // KURTOSIS focuses/diffuses
        ip.y += ip.x * skewStretch; // SKEW shears the petal shape (leans, never spins back)
        vec2 cp = ip;
        rot(ip, spin_angle); // the ONLY continuous rotation — monotonic
        float dd = dodec(vec3(ip, off * size));
        float cd = length(cp - vec2(0.2 * sin(morph_phase * 0.7), 0.0)) - 0.125 * size;
        cd = abs(cd) - width * 0.5;
        d = pmin(d, dd, 0.05);
        d = pmin(d, cd, 0.025);
    }
    return d;
}

vec3 postProcess(vec3 col, vec2 q, vec2 p) {
    // iter79 PLASMA-SOFT post: gentler gamma + softer contrast curve.
    // Was pow(.75) + 60/40 smoothstep contrast — too crisp/clamped. Plasma uses
    // multiplicative emit accumulation that's naturally softer.
    col = pow(clamp(col, 0.0, 1.0), vec3(0.82)); // was 0.75, now closer to linear
    col = col * 0.75 + 0.25 * col * col * (3.0 - 2.0 * col); // contrast push reduced 60/40 → 75/25
    col = mix(col, vec3(dot(col, vec3(0.33))), -0.32); // saturation push reduced -0.4 → -0.32
    const float r = 1.5;
    float d = max(r - length(p), 0.0) / r;
    // knob_33 (iter47): vignette strength — user pinned at 1.0, gesture says "darken edges more".
    col *= vec3(1.0 - mix(0.05, 0.55, knob_33) * exp(-200.0 * d * d)); // edge vignette
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 q = fragCoord.xy / iResolution.xy;
    // === GAZE (knob_24 X, knob_25 Y, knob_5 strength) ===
    // Rebound to the knobs the user is actively turning. Bipolar XY: 0.5 = centred.
    // Strength=0 → eye looks forward (identical to pre-gaze). The whole eye shifts toward
    // (gx, gy); pupil/ruff shift FURTHER (parallax) so the eye reads as a 3D ball turning.
    // Old k17/k18 swallow the displaced DEPTH and LINE_THICK so nothing is lost.
    float gx = (knob_24 - 0.5) * 2.0;
    float gy = (knob_25 - 0.5) * 2.0;
    float GAZE_STR = knob_5 * 0.50; // 0..0.50 max travel in normalized screen
    // MICRO-SACCADE — real eyes drift even when fixated. Tiny sinusoid via monotonic phases
    // with incommensurate freqs so the pattern never loops. Gated by GAZE_STR so it vanishes
    // when gaze is off.
    // iter53: knob_32 master scales saccade amplitude — user pinned at ~0.69, wants more eye life.
    vec2 saccade = vec2(
            sin(flow_phase * 0.83 + morph_phase * 0.21),
            sin(flow_phase * 0.71 + morph_phase * 0.37)
        ) * GAZE_STR * 0.08 * mix(0.4, 2.2, knob_32); // ~8% baseline, scaled 0.4..2.2x by k53
    vec2 gazeV = vec2(gx, gy) * GAZE_STR + saccade;
    vec2 q2 = q - gazeV * 0.25; // recentre screen-space lookup for rr
    vec2 p = 2.0 * (q - 0.5 - gazeV * 0.5); // shift fractal space (whole eye turns)
    p.x *= iResolution.x / iResolution.y;
    // KICK = ZOOM (not a color flash). The kick punches the camera IN, then it springs back.
    // Uses the smooth bass_pump (no one-frame strobe) + a touch of the sharp hit for snap.
    // SLIGHT zoom on the WAVELET BEAT. waveletBassZScore is the self-calibrating bass-spike —
    // it fires on the beat at ANY input gain (mic OR direct-in), so the pulse is consistent
    // across environments. Kept slight (max ~8% push-in) + a little raw hit/pump when present.
    float waveletBeat = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0); // the beat, self-calibrating
    float kickZoom = clamp(waveletBeat * 0.07
                + bass_pump * BASS_REACT * 0.05
                + clamp(wavelet_bassHit, 0.0, 1.0) * 0.04, 0.0, 0.12);
    p *= ZOOM * (1.0 - kickZoom); // beat pushes the camera slightly in
    float d = df(p);
    // ZOOM-DEEP SUB-LAYER — compound nested fractal: a second pass at half scale, rotated,
    // blended in by ZOOM_DEEP. As knob_1 climbs, more recursion levels accumulate.
    if (ZOOM_DEEP > 0.001) {
        vec2 ps = p * 0.5;
        rot(ps, 0.61 + spin_angle * 0.5); // counter-spin so sublayer doesn't lock to mainlayer
        float d2 = df(ps);
        d = pmin(d, d2 - 0.005, 0.04 + 0.06 * ZOOM_DEEP) - ZOOM_DEEP * 0.003;
    }

    // iter79 PLASMA-SOFT EDGES: widen the edge anti-alias and modulate with roughness.
    // Plasma's signature is glowing softness, not sharp lines. Was 0.0025 (razor); now
    // 0.0065 baseline + roughness expands it further on dissonant passages.
    float fuzzy = 0.0065 + 0.012 * spectralRoughnessSmooth;
    float edges = smoothstep(fuzzy, -fuzzy, d);
    vec3 rgb = 0.5 + 0.5 * vec3(sin(TAU * vec3(50.0, 49.0, 48.0) * (d - 0.050) + flow_phase * 0.6));
    float bands = pow(clamp(dot(rgb, vec3(0.34)), 0.0, 1.0), 8.0);
    float falloff = 1.0 - tanh(0.05 + abs(8.0 * d));
    float wave = sin(TAU / 4.0 * (-length(p) - 0.5 * p.y) + morph_phase * 0.8);
    float fwave = 0.5 + 0.5 * sign(wave) * pow(abs(wave), 0.75);

    // structure: falloff drives it to 0 away from the lines -> the void is BLACK.
    float structure = (EDGE_GLOW * edges + IRIDESCENCE * bands) * falloff;
    structure *= mix(1.0, fwave, 0.22); // radial wave SHADES the structure; never lights the void

    // feature FAMILY -> fractal REGION: bass=core (pumped), mids=arms, treble=tips
    // rr uses q2 (gaze-shifted) so iris zones translate WITH the eye.
    float rr = length((q2 - 0.5) * vec2(iResolution.x / iResolution.y, 1.0));
    // PARALLAX pupil radius — pupil/ruff sample point shifts FURTHER toward gaze than iris.
    // This is the "ball turning" trick: deeper anatomy slides more, like a real eyeball.
    float pupilParallax = 0.35; // 0=flat slide, 1=fully detached pupil
    vec2 pupilQ = (q - 0.5 - gazeV * (0.5 + pupilParallax));
    pupilQ *= vec2(iResolution.x / iResolution.y, 1.0);
    float parallaxR = length(pupilQ); // radius from PARALLAXED centre
    float coreW = smoothstep(0.34, 0.0, rr);
    float tipW = smoothstep(0.22, 0.62, rr);
    float armW = clamp(1.0 - coreW - tipW, 0.0, 1.0);
    float bassDrive = clamp(bass_env + bass_pump * BASS_REACT, 0.0, 1.6);
    float regionGlow = bassDrive * coreW + mids_env * armW + treble_env * tipW;

    // EVERYTHING multiplies the structure -> void is ALWAYS 0 -> ZERO background activity.
    // drops + pitch brighten ONLY where structure already exists.
    // GENTLER global brightness response — drop_glow/pitch_pulse ride crest, which spikes on
    // each flute note; at the old 0.9/0.6 gains that flashed the whole iris. Halved so it lifts softly.
    float intensity = clamp(structure * (0.55 + 0.9 * regionGlow) * (1.0 + drop_glow * 0.4 + pitch_pulse * 0.25), 0.0, 1.0);

    // === iter19 IQ-STYLE OKLAB PALETTE (rewrite, no multiplier cascade) ===
    // All previous L *= and C *= mods were stacking past saturation -> persistent washout.
    // Now: anatomy + audio + knobs build a single SCALAR `t` (palette traversal parameter)
    // and a SHADE float (0..1, dark anatomy regions). One oklch2rgb at the end. The palette
    // function gives L+C+hue together, bounded by design — no need for post-clamps.
    float irisR = rr;
    float fiber = d * mix(10.0, 46.0, knob_22);

    // SHADE — anatomical darkness amount (additive 0..1, applied as L scale at the end).
    // No L cascade: gather all dark-region weights into one number, multiply L once.
    float aa = atan(p.y, p.x);
    float limbal = smoothstep(0.40, 0.56, irisR);
    float collR = 0.20 + 0.02 * sin(aa * float(rep));
    float collarette = smoothstep(0.045, 0.0, abs(irisR - collR));
    float pitAng = pow(0.5 + 0.5 * cos(aa * 12.0), 8.0);
    float pitRad = smoothstep(0.07, 0.0, abs(irisR - 0.27));
    float crypts = pitAng * pitRad;
    float furrowZone = smoothstep(0.30, 0.40, irisR) * smoothstep(0.56, 0.46, irisR);
    float furrows = 0.5 + 0.5 * sin(irisR * 150.0);
    float ruffR = 0.075 + 0.012 * sin(aa * float(rep) * 2.0);
    float ruff = smoothstep(0.028, 0.0, abs(parallaxR - ruffR));
    float pupilRad = knob_23 * 0.16 * (1.0 - bass_pump * BASS_REACT * 0.18);
    float pupil = (1.0 - smoothstep(pupilRad * 0.6, pupilRad, parallaxR)) * step(0.001, pupilRad);

    // BRIGHT — anatomical bright amount (additive 0..1). Single L lift, no compounding.
    float petalBand = smoothstep(0.18, 0.32, irisR) * smoothstep(0.46, 0.32, irisR);
    float dropFlareBand = smoothstep(0.38, 0.50, irisR) * smoothstep(0.62, 0.50, irisR);

    // iter51 DMT PHASE 1 — CRYPT BLINK: on entropy spikes, a fraction of the dark crypt
    // pits invert into bright "winks" — DMT visuals famously have "eyes everywhere"; this
    // makes the iris's anatomical crypts read as a ring of opening eyes when entropy rises.
    // Animated via flow_phase so different crypts blink at different times.
    // cryptWink ∈ [-1, 0]: -1 means crypt fully bright (invert), 0 means crypt fully dark.
    float cryptWink = -entropy_env * smoothstep(0.4, 0.85, 0.5 + 0.5 * sin(aa * 12.0 + flow_phase * 1.7));
    // dark contributions (clamp the SUM, not multiply each)
    float darkSum =
        0.55 * limbal
            + (0.70 + cryptWink) * crypts // crypts can flip from dark→bright on entropy peaks
            + 0.60 * ruff
            + 0.85 * pupil
            - 0.50 * collarette // negative = bright lift
            - 0.30 * (furrows - 0.5) * furrowZone
            - 0.30 * clamp(energy_env * 0.35 + drop_glow, 0.0, 1.0) * dropFlareBand
            - 0.22 * mids_env * petalBand
            - 0.12 * (1.0 - clamp(centroid_env * 1.6, 0.0, 1.0)) * bass_pump * BASS_REACT;
    float shade = clamp(0.5 - 0.5 * darkSum, 0.05, 1.0); // 0=darkest, 1=brightest; bounded

    // PLASMA GATE — sub-bass-only "lurking monster" detection from plasma-event-horizon iter22.
    // iter33: thresholds relaxed for movie audio (was bass HIGH + mids LOW + centroid LOW —
    // music-tuned). Now fires more broadly so movie score swells can land.
    float monsterBass = clamp(bass_env, 0.0, 1.0)
            * smoothstep(0.75, 0.3, mids_env)
            * smoothstep(0.55, 0.1, centroid_env);
    // PLASMA TREBLE_SHIMMER gate — opposite corner from monsterBass. Fires on bright, chaotic,
    // bass-light passages. iter33: threshold relaxed for movie audio (mics see less treble
    // than tab-share music; loosen bass-low requirement too).
    float trebleShimmer = treble_env
            * smoothstep(0.5, 0.05, bass_env)
            * smoothstep(0.3, 0.7, entropy_env);
    // MOVIE_FLUX gate (iter33) — defining feature of film audio is constant timbral motion
    // (dialogue → music → silence → score → foley). spectralFluxZScore spikes on every cut/
    // line/sound effect. This gate fires brief bursts on every flux event and is independent
    // of the bass↔treble axis, so it's reactive on movies where other gates rarely fire.
    float fluxPulse = clamp(spectralFluxZScore, 0.0, 1.0);

    // t — palette traversal parameter (where in the colour journey we are).
    // Built from: SDF (fractal coordinate) + radius (anatomy) + hue_phase (slow time) + audio.
    // Audio adds to t (palette region shift) instead of multiplying L (which washes out).
    float t = 0.05 * fiber
            + 0.55 * irisR
            + 0.20 * hue_phase / TAU // monotonic palette drift
            // (removed `+ (knob_20 - 0.5)` — that shoved the palette zone off iris/7's tuned
            //  warm-gold↔green↔teal↔violet journey into harsh zones. knob_20 rotates the FINAL
            //  hue via MASTER_HUE instead, like iris/7 — keeps the refined palette intact.)
            // iter63 OF THE TREES PREP — HAUNTED SHIMMER: amplitude quadratic in entropy.
            // Calm passages (entropy_env<0.5) keep the iter19 amount; eerie/chaotic passages
            // (Ghoul-type tracks at entropy_env>0.7) get up to 2x the iris-fiber hue jitter.
            + (0.10 + 0.12 * entropy_env) * sin(TAU * fiber + flow_phase * 0.5) * entropy_env
            // iter63 OF THE TREES PREP — CENTROID-TINTED EMBER (port from dodeca iter65):
            // dark/bassy material pulls ember harder toward red-orange; bright material lets
            // it land softer (more yellow). Same total ember energy, different palette zone.
            + 0.18 * knob_28 * tipW * (0.4 + 0.6 * treble_env) * (1.0 - 0.45 * centroid_env)
            + 0.12 * limbal // limbal shifts hue toward blue
            - 0.06 * crypts
            + 0.08 * (melodyFlow - 0.5) // MELODY (smooth) shifts palette zone — not the kick
            // PLASMA MIX-IN (iter31): on sub-bass passages, pull t toward the orange→blue
            // gradient zone of the plasma series. CORE_HUE 0.6 rad / CORONA 4.2 rad map into
            // t-space at roughly t=0.10 (orange) ↔ t=0.67 (blue-violet). monsterBass biases
            // t toward 0.10 in the core, toward 0.67 at the limbal — same radial transition
            // the plasma event-horizon used (hot core, cool corona).
            + 0.25 * monsterBass * (irisR < 0.32 ? -0.4 : 0.5)
            // MOVIE FLUX TWINKLE (iter33): every timbral shift (dialogue, foley, cut) nudges
            // the palette zone briefly. Reads as a hue twinkle on every audio event — ideal
            // for movie soundtracks where flux is the constant signal.
            + 0.12 * fluxPulse
            // iter51 DMT PHASE 1 — JEWEL-ENCRUSTED ANGULAR SHIMMER: per-petal hue offset around
            // the iris ring so adjacent kaleido slices shimmer with slightly different colors.
            // 15-fold angular freq matches the kaleido rep count; flow_phase drift so the
            // jewels rotate slowly around the iris. Amplitude small so anatomy stays intact.
            // iter53: knob_40 master scales jewel amplitude 0..2.2x — 0=anatomy-clean, max=full DMT.
            + 0.06 * mix(0.0, 2.2, knob_40) * sin(aa * float(rep) + flow_phase * 0.35)
            // iter53 DMT PHASE 2 — ember palette extension into the outer halo, gated by knob_37.
            // User pinned k39 at ~0.83 — pushes a treble-modulated ember halo around the iris
            // beyond the fractal tips. Adds a glowing ember corona on bright passages.
            + 0.10 * knob_28 * smoothstep(0.40, 0.60, irisR) * mix(0.0, 1.6, knob_37) * (0.5 + 0.5 * treble_env);
    t = fract(t); // wrap into [0,1] for the palette function

    // iq palette: oklab(L, a, b) procedural. Three cosines with offsets give 3 channels.
    // L tuned by SHADE (single multiplication), a/b drive chroma+hue via Oklab geometry.
    // Coefficients chosen to give a warm-gold ↔ green ↔ teal ↔ violet journey,
    // bounded by [0,1] L without need for post-clamps.
    // iter20 brightness tune: baseL ceiling pushed 0.62→0.85, dropFloor lift adds glow on drops.
    // iter21 calm breath: inverse-gated to low energy; baseL gently breathes on quiet pads.
    float dropLift = clamp(energy_env * 0.35 + drop_glow, 0.0, 1.0);
    float calm = 1.0 - clamp(energy_env * 2.2, 0.0, 1.0);
    float breath = calm * 0.10 * sin(morph_phase * 1.5);
    // iter63 OF THE TREES PREP — SUB-THROB (port from dodeca iter72): the whole iris
    // throbs with the low end on dark+bassy passages only. centroid-gated so it's silent
    // on bright sections. Reads in L (mono-safe), small coefficient (0.10) so it doesn't
    // strobe. Perfect for Muscaria-type dark grooves (bass 0.5, centroid 0.08).
    float subThrob = (1.0 - clamp(centroid_env * 1.6, 0.0, 1.0)) * bass_pump * BASS_REACT * 0.10;
    float baseL = 0.85 * shade * (0.45 + 0.55 * intensity) * (1.0 + 0.18 * dropLift + breath + subThrob);
    baseL = min(baseL, 0.95); // hard ceiling, single point of failure
    float ax = 0.14 * cos(TAU * (t + 0.00)); // Oklab a (green<->red)
    float ay = 0.14 * cos(TAU * (t + 0.33)); // Oklab b (blue<->yellow)
    // PLASMA RADIATION WAVES (iter31, from plasma-event-horizon iter19b lesson):
    // Slow concentric outgoing waves modulating CHROMA (not L — preserves single-L discipline).
    // Phase advances on iTime ONLY (audio in amplitude not phase — prevents strobing).
    // Wave amplitude scales with bass_env baseline + drop_glow event punctuation, gated by
    // monsterBass so the radiation only appears on sub-bass-corner passages where it reads
    // as gravitational waves rippling out from a singularity. Adds a baseline floor so the
    // waves are visible even on calm passages within the gate.
    // knob_36 (iter47): radiation amplitude master — user pinned at 1.0, gesture says "more radiation".
    float radiationLoudness = (0.15 + 0.45 * bass_env + 0.40 * drop_glow) * mix(0.4, 1.6, knob_36);
    float radiation = sin(irisR * 7.0 - iTime * 0.45 * TAU); // phase: iTime only
    float radiationGate = clamp(monsterBass * 1.4, 0.0, 1.0); // visible only in plasma corner
    // PLASMA TREBLE SPARKLE (iter32): high spatial-frequency chroma shimmer, fires only on
    // bright/airy/chaotic passages (treble-shimmer gate). Phase advances on iTime + a fast
    // angular component, so the sparkle scintillates without strobing on audio (per iter19b).
    float sparkle = sin(irisR * 60.0 + aa * 8.0 + iTime * 2.3);
    // Mix in audio/knob chroma scale on a/b (NOT L) — keeps L bounded, lets chroma swing.
    // knob_38 (iter47): outer-halo chroma boost — user pinned at 1.0. Adds chroma swing in
    // the limbal+outer band (irisR > 0.4), independent of audio. Together with knob_21 (base
    // chroma) this gives users a 2D chroma control: k4 for inner, k44 for outer.
    float outerHaloBand = smoothstep(0.40, 0.60, irisR);
    // iter53 DMT PHASE 2 — MOIRÉ SWIRL: radial+angular interference for the shimmering
    // jewel-lattice quality of DMT visuals. Phase advances on flow_phase (no audio in phase
    // per iter19b lesson); amplitude scaled by knob_39. 0=anatomy-clean baseline, max=full
    // moiré shimmer woven through chroma. Acts on chroma only — L stays bounded.
    float moireSwirl = cos(irisR * 24.0 - aa * 7.0 + flow_phase * 0.9);
    float chromaScale = mix(0.65, 1.30, knob_21)
            * (1.0 + 0.45 * dropLift * dropFlareBand
                + 0.35 * radiation * radiationLoudness * radiationGate
                + 0.25 * sparkle * trebleShimmer
                + 0.55 * outerHaloBand * mix(-0.4, 1.0, knob_38)
                + 0.30 * moireSwirl * mix(0.0, 1.0, knob_39));
    ax *= chromaScale;
    ay *= chromaScale;

    // iter65 PEACH/PLASMA PALETTE MIX (port from magic-peach / plasma-event-horizon).
    // CORE_HUE 0.6 rad (orange-yellow hot inner) ↔ CORONA_HUE 4.2 rad (deep blue-violet outer)
    // is the "peach plasma" gradient from the magic-peach shader (iter8 of the plasma series).
    // Blend radially: irisR=0 pulls toward CORE, irisR>0.5 pulls toward CORONA.
    // knob_29 (PEACH_MIX): 0 = pure iris iq palette, 1 = full peach plasma palette.
    // knob_30 (PEACH_CORE_ROT): rotates the core hue so user can sweep peach→pink→coral→red.
    // CORE_HUE 0.6 + (knob_30-0.5)*2.5 spans roughly 0.0..1.85 rad — yellow→orange→pink→coral.
    float peachCoreHue = CORE_HUE + (knob_30 - 0.5) * 2.5;
    float peachHueBlend = smoothstep(0.0, 0.50, irisR); // 0 at center → 1 at limbal
    float peachHue = mix(peachCoreHue, CORONA_HUE, peachHueBlend);
    // Plasma chroma is ~0.18 baseline; scale by the iris's chromaScale so audio/knob dynamics carry over.
    float peachC = 0.18 * (0.7 + 0.6 * chromaScale * 0.5);
    float pax = peachC * cos(peachHue);
    float pay = peachC * sin(peachHue);
    float peachMix = knob_29; // 0..1 master ramp
    ax = mix(ax, pax, peachMix);
    ay = mix(ay, pay, peachMix);

    // Oklab -> Oklch (L, C, hue)
    float C = sqrt(ax * ax + ay * ay);
    float hue = atan(ay, ax);
    if (hue < 0.0) hue += TAU;
    float L = baseL;

    vec3 col = oklch2rgb(vec3(L, C, hue));

    // iter67 PHOTON-RING RIM (port from magic-peach iter14 plasma rim lighting).
    // Bright narrow gaussian bell at the limbal radius — reads as a "photon sphere" /
    // accretion-disk edge glow. Hue locked to CORONA (deep blue-violet) to give the rim
    // its plasma identity, with knob_30 PEACH_CORE_ROT also rotating it so the rim tracks
    // the peach palette story. Bass-drop pulsed (like magic-peach iter6 HORIZON_POWER).
    // knob_34 → RIM_RADIUS (where the ring sits, 0.30..0.55), knob_35 → RIM_INTENSITY.
    float rimR = mix(0.30, 0.55, knob_34);
    // iter79 PLASMA-SOFT RIM: rim is now WIDE+SOFT (was tight gauss). Width modulated
    // by centroid — dark music = wider/glowier, bright music = tighter. Magic-peach's
    // photonRing uses width=6 but in unit-r coords. We re-tune to ~3.0 baseline + a
    // big secondary halo so the rim BLOOMS not knife-edges.
    float rimWidth = 3.0 + 1.5 * (1.0 - spectralCentroidNormalized);
    float rimGauss = exp(-pow((irisR - rimR) * rimWidth, 2.0));
    // Soft outer halo bleeds into the void — adds 30% more glow with a much wider gaussian.
    float rimHalo = exp(-pow((irisR - rimR) * (rimWidth * 0.35), 2.0)) * 0.4;
    // iter79 wire more audio: roughness adds rim "fuzz", flux pulses on transients.
    float rimPulse = 0.55
            + max(bassZScore, 0.0) * 0.5
            + dropLift * 0.4
            + clamp(spectralFluxZScore, 0.0, 1.0) * 0.35
            + spectralRoughnessSmooth * 0.25;
    float rimAmp = mix(0.0, 0.55, knob_35) * rimPulse;
    float rimHue = mix(CORE_HUE, CORONA_HUE, 0.85) + (knob_30 - 0.5) * 1.2
            + melodyFlow * 0.5; // SMOOTH melody tints rim (was raw pitchClassNormalized — flashed in quiet)
    vec3 rimColor = oklch2rgb(vec3(0.78, 0.18, rimHue));
    col += rimColor * (rimGauss + rimHalo) * rimAmp;

    col = postProcess(col, q, p);

    // === iter76 PLASMA TENDRILS — port plasma.frag's nested-sin fold field ===
    // Replaces iter75 polar-line tentacles. Plasma's signature look comes from a 3D
    // nested-sin fold `sin(q.x + sin(q.z + sin(q.y)))` raymarched with multiplicative+
    // additive emission accumulation. We evaluate that field ONLY outside the limbal
    // boundary, so the iris stays anatomical and the void fills with plasma tendrils.
    // 15 audio features still wire in — each tentacle "slot" rotates the fold field by
    // its own angle and feeds its assigned feature into FRACTAL_DENSITY/WAVE_STRENGTH
    // for that slot. Cool-bias emission `vec3(0.1, 0.3, 0.4) + vec3(5, 2.5, 3) * f`
    // copied from plasma.frag for the signature blue-tendril-with-warm-glints look.
    {
        vec2 pq = (q - 0.5) * vec2(iResolution.x / iResolution.y, 1.0) * 2.0; // [-aspect..aspect, -1..1]
        float pr = length(pq);
        if (pr > 0.64) { // start tendrils at iris limbal boundary
            // Pick which "tentacle slot" this pixel belongs to by angle (15 angular slots,
            // each slot has its own audio feature driving the plasma fold parameters)
            float pa = atan(pq.y, pq.x);
            float slotF = (pa + PI) / TAU * 15.0; // 0..15
            int slot = int(floor(mod(slotF, 15.0)));
            float audioL;
            if (slot == 0) audioL = bassNormalized;
            else if (slot == 1) audioL = trebleNormalized;
            else if (slot == 2) audioL = midsNormalized;
            else if (slot == 3) audioL = clamp(spectralFluxZScore * 0.5 + 0.5, 0.0, 1.0);
            else if (slot == 4) audioL = spectralEntropyNormalized;
            else if (slot == 5) audioL = spectralCentroidNormalized;
            else if (slot == 6) audioL = pitchClassNormalized;
            else if (slot == 7) audioL = spectralRoughnessSmooth;
            else if (slot == 8) audioL = spectralSpreadNormalized;
            else if (slot == 9) audioL = spectralKurtosisNormalized;
            else if (slot == 10) audioL = clamp(spectralSkewZScore * 0.5 + 0.5, 0.0, 1.0);
            else if (slot == 11) audioL = spectralCrestSmooth;
            else if (slot == 12) audioL = spectralRolloffNormalized;
            else if (slot == 13) audioL = clamp(energyZScore * 0.5 + 0.5, 0.0, 1.0);
            else audioL = clamp(bassZScore * 0.5 + 0.5, 0.0, 1.0);

            // Plasma fold parameters — globals modulated by audio + per-slot offset.
            // Plasma's nested-sin in 3D: we cheaply 2D-ify by evaluating at a few z offsets.
            float density = 1.5 + 1.8 * spectralCentroidNormalized; // centroid → packing
            float waveAmp = 0.4 + 0.5 * spectralEntropyNormalized; // entropy → fold amplitude
            float twistAng = flow_phase * 0.20 + float(slot) * 0.83; // each slot rotates differently
            float bassPump = 0.10 * bass_env; // bass thickens the field
            float t2 = iTime + flow_phase * 0.3;

            // 5-step plasma raymarch in 3D from a "camera" at +Z=5 looking at pixel xy.
            vec3 col3 = vec3(0.0);
            float depth = 2.5;
            for (int i = 0; i < 5; ++i) {
                vec3 pp = vec3(0.0, 0.0, 5.0) + normalize(vec3(pq, -1.0)) * depth;
                // rotate by per-slot twist
                float ca = cos(twistAng), sa = sin(twistAng);
                pp.xz = mat2(ca, -sa, sa, ca) * pp.xz;
                pp.xy = mat2(ca, -sa, sa, ca) * pp.xy;
                vec3 qq = pp * density + t2;
                // plasma's signature nested-sin fold + log envelope + bass pump
                float rz = length(pp + vec3(sin(t2 * 0.7))) * log(length(pp) + 1.4)
                        + sin(qq.x + sin(qq.z + sin(qq.y))) * waveAmp
                        - 1.0 + bassPump;
                // emissive accumulation (plasma's "*l + smoothstep(2.5,0,rz)*0.7*l" pattern)
                float f = clamp((rz - 0.05) * 0.5, -0.1, 1.0);
                vec3 emit = vec3(0.10, 0.30, 0.40) + vec3(5.0, 2.5, 3.0) * f;
                col3 = col3 * emit * 0.18 + smoothstep(2.5, 0.0, rz) * 0.12 * emit;
                depth += min(rz, 1.0);
            }

            // gate the tendrils so they only appear OUTSIDE the iris and FADE out at frame edges
            // iter79 PLASMA-SOFT tendril mask: was 0.64..0.80 (hard cutoff at limbal).
            // Now 0.52..0.95 — tendrils BLEED softly into the iris rim and fade more
            // gradually into the void. Plasma is hazy, not edged.
            float outsideMask = smoothstep(0.52, 0.95, pr);
            float voidFade = smoothstep(2.0, 0.7, pr); // 1 mid-frame, 0 at corners
            // audio modulates global brightness, then per-slot audio adds emphasis
            float emit = (0.35 + 0.55 * audioL) * outsideMask * voidFade;
            // tendril hue rides the peach palette (mostly CORONA blue-violet, peach core warming closer in)
            // — multiply col3 (which is already blue-bias) by a peach-tinted lift on transients
            // SMOOTH driver for this GLOBAL background tint (was raw spectralFluxZScore — it spiked
            // on every cymbal and flashed the whole void peach for a frame). Use smooth energy +
            // treble so it still LIFTS on bright/loud sections, but eases instead of strobing.
            // (The local rim/catchlight/feedback terms keep their raw snappy flux — reactivity stays.)
            vec3 warmLift = oklch2rgb(vec3(0.75, 0.14, CORE_HUE + float(slot) * 0.25)) * clamp(energySpring * 0.4 + waveletBand5Spring * 0.3, 0.0, 1.0) * 0.3;
            col += col3 * emit + warmLift * outsideMask * voidFade;
        }
    }

    // === TUNNEL-COMING-AT-YOU feedback (knob_17 strength) ===
    // Sample the prior frame INWARD of current pixel (zoomF<1) -> prior content scales OUT each
    // frame = the tunnel rushes toward the viewer. ZOOM_DEEP makes the rush stronger as you push in.
    // Bass deepens it further. knob_17 = strength (0 = pure iris, no feedback).
    vec2 CEN = vec2(0.5);
    // Tunnel rush velocity: bass kicks shove forward, sustained drops ACCELERATE the rush
    // (iter8 swap — drop_glow drives the held-drop "we're falling into it" feel without a new layer)
    // iter79 add flux + roughness to the tunnel-rush velocity. Timbral motion and
    // dissonance deepen the tunnel — feels like the eye "reacts" to texture changes.
    // FEEDBACK TUNNEL motion — this is the dominant apparent SPEED (the prior frame zooming +
    // swirling every frame at 60fps), NOT the geometry phases. knob_15 = tunnel zoom speed,
    // knob_16 = tunnel swirl speed. Both were way too fast; scaled down + knob-controlled.
    float rush = (0.008
            + ZOOM_DEEP * 0.020
            + bass_pump * BASS_REACT * 0.012
            + drop_glow * 0.015
            + clamp(spectralFluxZScore, 0.0, 1.0) * 0.012
            + spectralRoughnessSmooth * 0.010) * knob_15;
    float zoomF = 1.0 - rush; // <1 = prior frame zooms outward
    float mrot = (0.004 + ZOOM_DEEP * 0.012 + drop_glow * 0.010) * knob_16; // tunnel swirl (was 0.015 base — far too fast)
    vec2 ruv = q - CEN;
    ruv = mat2(cos(mrot), -sin(mrot), sin(mrot), cos(mrot)) * ruv;
    ruv = ruv * zoomF + CEN;
    vec3 mirror = getLastFrameColor(ruv).rgb * 0.97; // decay (white-out safety, iter70 lesson)
    float fg = smoothstep(0.05, 0.18, dot(col, vec3(0.33))); // 1 = iris, 0 = void
    float MIRROR = knob_17 * (0.30 + ZOOM_DEEP * 0.35); // knob_17 strength; pushes harder on deep zoom
    col = mix(col + mirror * MIRROR, col, fg * (1.0 - ZOOM_DEEP * 0.5)); // on deep zoom, mirror also bleeds into iris

    // CATCHLIGHT (iter16 — moved AFTER mirror so it survives feedback wash).
    // Tiny bright specular dot positioned upper-left of pupil toward gaze. Real-eye cue.
    // Pure RGB add (not L mod), tight ~1.5% radius, gated by knob_5 and by pupil proximity
    // so it never shows on the void. Saccade-tracking via gazeV so it drifts with the eye.
    vec2 catchCentre = q - 0.5 - gazeV * 0.30 + vec2(-0.05, 0.07);
    catchCentre *= vec2(iResolution.x / iResolution.y, 1.0);
    float catchD = length(catchCentre);
    // proximity to iris (rr) so catchlight only appears on the eye, never out in the void
    float onEye = smoothstep(0.45, 0.30, rr);
    // Bass kicks BOOST the catchlight — a wet eye reflecting stage strobes glints on each hit.
    // Reads as the eye "reacting" without anything moving. iter33: ALSO pulses on flux events
    // (dialogue / foley / cuts) so movie audio drives a visible eye reaction even when bass
    // isn't kicking. The two terms cover music + movie audio independently.
    // iter79 add spectralCrestSmooth (peakiness) — spiky audio = sharper glint.
    float catchPulse = 1.0
            + bass_pump * BASS_REACT * 0.6
            + clamp(spectralFluxZScore, 0.0, 1.0) * 0.8
            + spectralCrestSmooth * 0.45;
    // iter53: knob_31 catchlight intensity master — user pinned at ~0.6, give them control.
    float catchlight = (1.0 - smoothstep(0.008, 0.022, catchD)) * knob_5 * onEye * catchPulse * mix(0.4, 1.8, knob_31);
    col += vec3(0.85, 0.88, 0.95) * catchlight; // bright cool-white specular

    fragColor = vec4(col, 1.0);
}
