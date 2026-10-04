// @fullscreen: true
// @tags: rezz, dark
// rezz-1 — moody-octopus2 forked for a dark Rezz palette: dark reds, blacks, purples.

// ============================================================================
// REZZ GRADE PARAMETERS
// ============================================================================
#define REZZ_SPAN 0.24     // hue walk width: red (1.0) down toward violet (0.76)
#define REZZ_FLOOR 0.12    // HSL lightness below this crushes to black
#define REZZ_CEIL 0.36     // max output lightness — never approaches white
#define REZZ_SHADOW 1.8    // how hard the purple end of the walk falls into black
// HYPNOTIC SPIRAL (Rezz goggles) + PROWL DRIVE — the spiral is the image, the fractal lives in its arms
#define SPIRAL_ARMS 4.0     // spiral arms around the vanishing point
#define SPIRAL_TIGHT 1.6    // bands per e-fold of radius (higher = tighter coil)
#define COIL_BREATH 0.0     // iter18: OFF. the coil rescaled `spiral` (the fold y coord) back and forth with section energy -> arm flicker. was 0.16
#define COIL_ANCHOR -0.7    // log-radius where the coil breathes in place (bands pinned mid-screen, no slide)
#define DRIVE_SPEED 0.22    // bands stream OUT from the centre like road lines (cycles/sec, time only)
#define SPIN_SPEED 0.015    // slow hypnotic rotation (turns/sec, time only)
// ITER14 SPIN SURGE: the rotation RATE breathes (prowl: ease off, then lean into the throttle).
// Phase is the integral of rate = SPIN_SPEED*(1 + SPIN_SURGE*sin(2pi t/P)), so it stays monotonic (SURGE < 1).
#define SPIN_SURGE 0.8      // rate swings 0.2x .. 1.8x SPIN_SPEED
#define SPIN_SURGE_PERIOD 48.0   // seconds per ease-off/lean-in cycle
#define TROUGH_DARK 0.94    // how black the gaps between arms are
#define ARM_RIM 0.30        // lightness of the hot red leading edge of each arm
// JULIA PROJECTED ONTO THE ARMS — the fractal is a texture printed on each spiral ribbon
#define ARM_TEX_MIX 1.0       // iter17: arms carry only the hex fold (was 0.85 with a screen-space Julia underlay)
#define ARM_TEX_TILES 8.0     // Julia tiles per seam-wrap along the arm (integer keeps the atan seam clean)
#define ARM_TEX_FLOW 0.12     // texture streams along the arm (time only) — iter5: 0.04 read as static
#define ARM_JULIA_MORPH 0.07  // Julia c walks the inner-cardioid path (rad/sec, time only) — iter5: 0.02 read as static
#define ARM_TEX_GAIN 16.0    // escape count that maps to full glow (6 saturated everything into flat blobs)
#define ARM_TEX_ACROSS 1.6    // Julia span across the ribbon (mirrored at the centre)
#define ARM_FILAMENT_WIDTH 2.5   // distance-estimate line width in screen pixels
#define ARM_GLOW_FLOOR 0.45   // dim escape-glow under the filaments so the ribbon body isn't empty
#define ARM_TRAIL_RIM 0.6     // trailing-edge rim strength relative to the leading rim
#define ARM_BODY 0.34         // iter6: filled Julia interior gets a dim surface (was black -> read as isolated clumps)
#define ARM_RIBBON_BASE 0.16  // iter6: faint continuous base across the whole ribbon under the filaments
// ITER13 PROWL WAVE: headlight sweep — a soft band of light rolls OUTWARD along the arms (time only),
// everything outside the band sits dimmer, so the road visibly moves toward you.
#define PROWL_PERIOD 9.0     // seconds per wave
#define PROWL_DENS 0.42      // waves per e-fold of radius (~1.2 bands on screen)
#define PROWL_SHARP 3.0      // band sharpness (higher = narrower sweep)
#define PROWL_DIM 0.5        // lightness outside the band (1.0 = no effect)

// ============================================================================
// AUDIO MAPPING (iter5) — one feature per visible role, all AMPLITUDE/OFFSET (never inside a
// time phase). Every driver is 0 in silence AND before the mic connects (that state reads raw 0,
// Normalized 0.5, ZScore 1 — so everything is gated on raw energy, never on Normalized/Z alone).
// Live synthwave on the USB mic measured: energy 0.011-0.030, Normalized features swing ~0.05-0.9,
// spectralFluxZScore idles ~0 and spikes to ~0.9 on hits.
// ============================================================================
#define QUIET_GATE smoothstep(0.003, 0.008, energy)                                     // energy: master gate
#define D_(x) (QUIET_GATE * (x))
#define DRIVE_BASS  D_(smoothstep(0.20, 0.65, bassNormalized))        // kick/sub  -> red rim glow + thickness
#define DRIVE_MIDS  D_(smoothstep(0.45, 0.95, midsNormalized))        // synth body -> arm texture brightness
#define DRIVE_AIR   D_(smoothstep(0.15, 0.60, trebleNormalized))      // hats/air  -> violet trailing rim
#define DRIVE_HIT   D_(smoothstep(0.30, 1.00, spectralFluxZScore))    // snare/hits (dead-zoned Z) -> texture flash
// Drivers that MOVE the texture (c morph, zoom, slide) read a median-filtered z-score instead of
// Normalized: per-frame Normalized spikes made the texture twitch (iter7 measured +40% frame-to-frame
// luma change, spikes 2x). Median rejects the spikes; the drift still reads over seconds.
#define MEDZ(med, mean, sd) clamp(((med) - (mean)) / max(2.0 * (sd), 1e-4) * MEDZ_GAIN, -1.0, 1.0)
#define MEDZ_GAIN 2.0
#define DRIVE_KURT  D_(0.5 + 0.5 * MEDZ(spectralKurtosisMedian, spectralKurtosisMean, spectralKurtosisStandardDeviation))            // peakiness -> Julia zoom (texture scale)
#define DRIVE_CREST D_(smoothstep(0.20, 0.90, spectralCrestNormalized))    // spikiness -> filament line width
#define DRIVE_GRIT  D_(smoothstep(0.12, 0.60, spectralRoughnessNormalized))// dissonance -> glow under the filaments
#define DRIVE_CHAOS D_(0.5 * MEDZ(spectralEntropyMedian, spectralEntropyMean, spectralEntropyStandardDeviation))                   // entropy    -> texture slides ACROSS the arm
// slow gate (median energy) so the coil never jumps when raw energy flickers across the gate
#define SECTION_GATE smoothstep(0.003, 0.008, energyMedian)
#define DRIVE_COIL  (SECTION_GATE * MEDZ(energyMedian, energyMean, energyStandardDeviation)) // section energy -> coil tightness
// ITER9 SECTION MOOD — colour follows SLOW music only: intense sections (energy/bass medians up) lean
// hot red, calm/airy sections (centroid/rolloff medians up) lean deep violet. Fast features never touch hue.
#define SECTION_MOOD (SECTION_GATE * clamp(0.5 * MEDZ(energyMedian, energyMean, energyStandardDeviation) + 0.5 * MEDZ(bassMedian, bassMean, bassStandardDeviation) - 0.5 * MEDZ(spectralCentroidMedian, spectralCentroidMean, spectralCentroidStandardDeviation) - 0.5 * MEDZ(spectralRolloffMedian, spectralRolloffMean, spectralRolloffStandardDeviation), -1.0, 1.0))
#define MOOD_RED 0.5       // how far an intense section pulls the arm hue toward pure red
#define MOOD_VIOLET 0.08   // how far a calm section tilts the arm hue toward violet
#define ENGINE_GROWL (RIM_REST + (1.0 - RIM_REST) * BASS_KICK)   // iter15: was 0.70+0.30*DRIVE_BASS (sat ~0.85, no contrast)
#define ENGINE_GROWL_TEX (0.80 + 0.25 * rezzMids + 0.30 * rezzHit)   // iter18: controller envelopes (was raw per-frame mids/flux -> brightness flicker)
#define CARDIOID_K 0.96          // inset of the c path inside the main cardioid (1.0 = boundary, filament-rich; lower = fatter, smoother)
#define CARDIOID_AUDIO_K 0.025   // centroid nudges the inset toward the boundary (more filigree when brighter)
#define CARDIOID_AUDIO_TH 0.35   // spread nudges where along the cardioid c sits (rad)
#define JULIA_AUDIO_ZOOM 0.35    // kurtosis zooms the arm texture
#define TEX_ACROSS_SLIDE 0.6     // entropy slides the texture across the ribbon
#define EVIL_CAP 0.25           // iter26 darkwave cap (was FINAL_L_CAP 0.275)
#define LATTICE_GAIN 1.35       // iter34: lattice line lift with audio live
#define THROB_FLOOR 0.72 /* iter33: was 0.45 — stacked with gamma the lattice vanished in the trough */        // iter31 lattice brightness between heartbeats
#define EVIL_RING 0.65          // iter30 narrower ring inside each cell
#define EVIL_GAMMA 1.25         // iter26 contrast: >1 darkens mid-tones, keeps the hottest edges
#define FINAL_L_CAP 0.275        // hard lightness cap after every driver — never white
// ITER11 REZZ EYE: the arms converge into a thin hot-red iris ring around a pure-black pupil.
// Built in log-radius space so it belongs to the spiral (not a screen-space disc).
#define EYE_R 0.085          // iris radius (uv units, screen height = 2) — iter35: 0.065 -> 0.085, the sinister slit eye reads as the focal point
#define EYE_W 0.18           // ring half-width in log-radius (~4.5px at 812px tall) — iter12: was 0.11, coil swallowed it
#define EYE_IRIS_L 0.11     // iter28 iris fill lightness around the slit
#define EYE_L 0.25           // ring lightness at full breath (HSL, before FINAL_L_CAP)
#define EYE_MOAT_IN 1.25     // iter12: black moat from this x EYE_R ...
#define EYE_MOAT_OUT 2.4     // ... to this x EYE_R, so the ring reads as a ring, not the end of the coil
#define EYE_EMERGE 0.13      // lead rims visibly streaming out of the eye
#define EYE_BREATH D_(0.5 + 0.5 * SECTION_GATE * MEDZ(bassMedian, bassMean, bassStandardDeviation))   // slow bass -> ring breath
// ITER15 BASS KICK: dead-zoned bass peaks flash the iris ring and the lead rims (SHADING only, no geometry).
// Live USB feed: bassNormalized median ~0.43, peaks 0.77 -> the dead-zone keeps the rest dim and the kicks hot.
// ITER18 RATCHET (controllers/rezz-ratchet.js): texture coords + fractal params move ONLY via monotonic
// accumulators (audio changes their RATE, never their value); transients arrive as attack/release envelopes.
uniform float rezzFlow;   // texture streams along the arm
uniform float rezzDrive;  // bands stream out from the centre
uniform float rezzSpin;   // per-level fold twist
uniform float rezzMorph;  // slow hex/ring shape cycle
uniform float rezzKick;   // bass kick envelope (attack 30ms / release 220ms)
uniform float rezzMids;   // mids body envelope
uniform float rezzHit;    // flux hit envelope
uniform float rezzBuild;  // ITER19 section build 0..1 (3s energy envelope vs its 45s average, eased)
// ITER20 AUTOPILOT: rezzScene (controller, monotonic, ~70s per scene) picks a hashed preset look per scene and
// crossfades to the next with smootherstep over the last 45% of the scene. Shape/brightness/palette only,
// never a coordinate offset, so nothing can run backwards.
uniform float rezzScene;
// ITER22 BASS ZOOM RATCHET: forward-only plunge in log r (drift + kick surge), wrapped seamlessly in the controller
uniform float rezzZoom;     // spiral log-r shift (iter25: steady drift, no bass)
// ITER27: the arms spin on bear-move's eyeSpin (controllers/bear-move.js, bear/1's user-approved rezz-eye
// rotation): rad, monotonic, rate 1.15 + 1.6*energy + 5.5*kick-lift rad/s, wrapped at 2pi = one seamless turn
uniform float eyeSpin;
uniform float rezzArmSpin;  // ITER25 ARM SPIN RATCHET: spiral angle in turns, forward-only (flux + centroid trend lean the rate)
uniform float rezzZoomTex;
// ITER23 FINE-DETAIL CRAWL: deep fold levels run on their own forward-only clocks
uniform float rezzDetail;      // crawl clock (flux hits surge the rate)
uniform float rezzDetailRate;  // its current rate, for speed-based LOD
uniform float rezzDetailSpin;  // twist clock (centroid trend leans the rate)
#define DETAIL_FROM 3          // first level that crawls (coarser levels stay calm)
#define DETAIL_GROW 1.35       // each deeper level crawls 1.35x faster (in its own cell units)
#define DETAIL_TWIST 0.6       // per-level twist on the detail clock
// ITER24 ADVANCED AUDIO -> FINE LATTICE (controller envelopes, amplitude only, one feature per role)
uniform float rezzGrit;   // spectralRoughness -> fine-level line brightness (grit)
uniform float rezzDepth;  // spectralEntropy   -> how deep the fold is revealed
uniform float rezzSharp;  // spectralCrest     -> rim contrast (halo cut, never width)
// ITER32 WAVELET OCTAVES -> fold depth: low bands light the coarse levels, high bands the fine ones
uniform float rezzWLow;   // waveletBand0-1 (43-170 Hz), eased
uniform float rezzWMid;   // waveletBand2-3
uniform float rezzWHigh;  // waveletBand4-5 (up to ~2.8 kHz)
uniform float rezzAir;    // treble            -> violet sparkle on the finest levels
  // arm-texture log-r shift (wrap-aligned to whole fold periods)
vec4 rzPreset(float i) {
    return vec4(fract(sin(i * 12.9898) * 43758.5453), fract(sin(i * 78.233 + 1.7) * 43758.5453),
                fract(sin(i * 37.719 + 4.1) * 43758.5453), fract(sin(i * 93.989 + 2.3) * 43758.5453));
}
vec4 rzLook() {   // x hex size, y ring radius, z violet lean, w prowl depth
    float x = clamp((fract(rezzScene) - 0.55) / 0.45, 0.0, 1.0);
    x = x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    return mix(rzPreset(floor(rezzScene)), rzPreset(floor(rezzScene) + 1.0), x);
}
#define BUILD_REVEAL 0.7   // how much of the fine-level shadow lifts at full build (deep violet lattice lights up)
#define BASS_KICK rezzKick   // iter18: envelope, was raw D_(smoothstep(0.40, 0.75, bassNormalized)) per frame
// ITER16 CENTRE FLEX: kick bulges the centre outward (lens warp on radius only), springs back; outer arms untouched
#define FLEX_AMT 0.17   // iter21: was 0.12 (14% measured) -> ~19% bulge on kicks, the approved centre flex made punchier
#define FLEX_R0  0.06
#define FLEX_R1  0.55
#define FLEX_ENV pow(BASS_KICK, 1.5)
#define EYE_REST 0.40        // iris lightness between kicks (fraction of EYE_L)
#define RIM_REST 0.50        // lead-rim lightness between kicks (fraction of ARM_RIM)

// Function to check if pixel and surrounding area is solid white
float getWhiteAmount(vec2 uv, vec2 pixelSize) {
    vec3 center = getLastFrameColor(uv).rgb;
    vec3 left = getLastFrameColor(uv - vec2(pixelSize.x, 0.0)).rgb;
    vec3 right = getLastFrameColor(uv + vec2(pixelSize.x, 0.0)).rgb;
    vec3 up = getLastFrameColor(uv + vec2(0.0, pixelSize.y)).rgb;
    vec3 down = getLastFrameColor(uv - vec2(0.0, pixelSize.y)).rgb;

    // Calculate average whiteness for each pixel
    float centerWhite = dot(center, vec3(1.0)) / 3.0;
    float leftWhite = dot(left, vec3(1.0)) / 3.0;
    float rightWhite = dot(right, vec3(1.0)) / 3.0;
    float upWhite = dot(up, vec3(1.0)) / 3.0;
    float downWhite = dot(down, vec3(1.0)) / 3.0;

    // Use smoothstep for gradual transition
    float threshold = 0.5;
    float smoothness = 0.1;

    float centerSmooth = smoothstep(threshold - smoothness, threshold, centerWhite);
    float leftSmooth = smoothstep(threshold - smoothness, threshold, leftWhite);
    float rightSmooth = smoothstep(threshold - smoothness, threshold, rightWhite);
    float upSmooth = smoothstep(threshold - smoothness, threshold, upWhite);
    float downSmooth = smoothstep(threshold - smoothness, threshold, downWhite);

    // Return average of all smoothstepped values
    return (centerSmooth + leftSmooth + rightSmooth + upSmooth + downSmooth) / 5.0;
}

// Function to apply Julia set distortion
vec2 julia(vec2 uv,float t){
  // Wrap UV for texture sampling
  vec2 texUv = fract(uv);
  vec3 prevColor = getLastFrameColor(texUv).rgb;

  // Julia set parameters
  float cRe = sin(t)*.7885;
  float cIm = cos(t)*.7885;

  // Apply the Julia set formula
  int maxIter = 64;
  float epsilon = 0.0001; // Small epsilon to prevent numerical issues
  for(int i = 0; i < maxIter; i++){
    // Add epsilon to prevent exact zero
    float x = (uv.x+epsilon)*uv.x-(uv.y+epsilon)*uv.y+cRe;
    float y = 2.*(uv.x+epsilon)*(uv.y+epsilon)+cIm;
    uv.x = x;
    uv.y = y;

    // Break if the point escapes to infinity
    if(length(uv)>2.)break;
  }

  return uv;
}

// Color palette system
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b*cos(6.28318*(c*t + d));
}

// ============================================================================
// ITER17 HEX MIRROR-FOLD (transplanted from lattice-interactive/3 fractal(), controller-free)
// ============================================================================
#define HX_LEVELS 10
#define HX_FIRST 2        // 3.frag used 4; arm space is ~4x denser per pixel, so draw from 2 levels earlier
#define HX_SEAM_N 1.0     // MUST be an integer: fold periods per atan-seam jump (non-integer = seam ray)
#define HX_HEXR 0.60      // hex rim radius (3.frag gHexR base)
#define HX_RING 0.17      // centre ring radius (3.frag gCross base)
#define HX_BORDER 0.028   // rim width (3.frag gBorder base)
#define HX_SPIN 0.0133    // per-level twist rate, rad/sec (3.frag bTime*0.04), TIME ONLY

mat2 hxRot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hxHex(vec2 p){ p = abs(p); return max(p.x + p.y * 0.57735027, max(p.x, p.y * 1.15470054)); }

// returns (rim light ~0..1, depth field 0=coarse..1=fine, alpha coverage)
vec3 hxFold(vec2 p, float pix, float spin, float zoom, float hexR, float ringR, float border){
    float scale = zoom, alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0;
    for (int i = 0; i < HX_LEVELS; i++){
        // ITER23: shift BEFORE the fold by fract(clock): the fold repeats every 1 unit, so the fract wrap is
        // invisible and the crawl is forward-only forever (x only, so a wrap is a whole-period jump)
        float dk = (i >= DETAIL_FROM) ? pow(DETAIL_GROW, float(i - DETAIL_FROM)) : 0.0;
        p.x += fract(rezzDetail * dk);
        p = 1.0 - abs(2.0 * fract(p - 0.5) - 1.0);
        if (i == 0) p = 0.5 + (p - 0.5) * zoom;
        p *= hxRot(float(i) * 0.39269908 + spin * (0.4 + float(i) * 0.05) + (seed3 - 0.5) * float(i) * 0.8
                    + rezzDetailSpin * DETAIL_TWIST * max(float(i - DETAIL_FROM + 1), 0.0));   // iter23 deeper = faster twist
        scale *= 2.0;
        if (i < HX_FIRST) continue;
        vec2 a = abs(p);
        // ITER30 EVIL GEOMETRY: star rim (hex U hex rotated 30deg -> 12 spikes), thorn axes that taper away
        // from the cell centre, and a tighter ring. Shape only: widths and clocks untouched.
        vec2 a30 = vec2(a.x * 0.8660254 - a.y * 0.5, a.x * 0.5 + a.y * 0.8660254);
        float star = min(hxHex(a), hxHex(abs(a30)) * 1.08);
        float thorn = min(a.x * (1.0 + 4.0 * a.y), a.y * (1.0 + 4.0 * a.x));
        float m = min(abs(star - hexR - 0.1), min(abs(length(a) - ringR * EVIL_RING), thorn));
        float ld = float(i - HX_FIRST) / float(HX_LEVELS - 1 - HX_FIRST);
        float alias = pix * 0.5 * scale;                          // true pixel footprint at this level
        float bw = border * (0.20 + 0.80 * ld);                   // coarse levels get thin rims
        float res = smoothstep(bw * 1.6, bw * 0.5, alias);        // sub-pixel level -> 0, not haze
        res *= smoothstep(0.25, 0.12, rezzDetailRate * dk / 60.0);  // iter23 speed LOD: > 1/4 period per frame would wagon-wheel -> fade
        float rim = smoothstep(bw + alias, bw, m) * res;
        float halo = smoothstep(bw * 1.6 + 0.004, bw * 1.1, m) * res;
        // ITER24: entropy reveals deeper levels (calm music = coarse lattice, chaotic = full depth)
        float reveal = 0.35 + 0.65 * rezzDepth;
        float vis = smoothstep(reveal + 0.15, reveal - 0.15, ld);
        rim *= vis; halo *= vis * (1.0 - 0.7 * rezzSharp);   // crest: crisper rims, less glow
        float lvGain = 1.0 + 0.7 * rezzGrit * ld + 0.9 * rezzAir * smoothstep(0.6, 1.0, ld);  // grit + air sparkle on the fine end
        float wBand = ld < 0.5 ? mix(rezzWLow, rezzWMid, ld * 2.0) : mix(rezzWMid, rezzWHigh, ld * 2.0 - 1.0);
        lvGain *= 0.75 + 0.7 * wBand;   // iter32: each depth breathes with its own wavelet octave
        float w = (1.0 - alpha) * (rim * 0.90 + halo * 0.07);     // weight IS alpha (front-to-back)
        lumAcc += w * (rim * 0.95 + halo * 0.22) * lvGain;
        fieldAcc += w * ld;
        alpha += w;
    }
    float ia = 1.0 / max(alpha, 1e-3);
    return vec3(lumAcc * ia, fieldAcc * ia, alpha);               // lum normalized (3.frag bug fix)
}

// Main image function
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    // Continuous space UV for effects
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float t = time/10.;

    // Calculate pixel size for sampling
    vec2 pixelSize = 1.0 / iResolution.xy;

    // Texture sampling coordinates (need to be wrapped)
    vec2 texUv = fract(fragCoord.xy / iResolution.xy);

    // Get smooth white amount
    float whiteAmount = getWhiteAmount(texUv, pixelSize);

    // Scale UV for interesting fill pattern (texture sampling)
    vec2 scaledUv = fract(uv);
    scaledUv = fract(scaledUv);

    // Get color from previous frame with scaled UV
    vec3 fillColor = getLastFrameColor(scaledUv).rgb;

    // Define our artistic color palette
    vec3 a = vec3(0.5, 0.5, 0.5);    // Base brightness
    vec3 b = vec3(0.5, 0.5, 0.5);    // Color variation
    vec3 c = vec3(1.0, 1.0, 1.0);    // Frequency
    vec3 d = vec3(0.0, 0.33, 0.67);  // Phase offset for each channel

    // Create a base time/audio modulation value (no initial radial dependency)
    float baseModulation = t * 0.1;

    // Modulate palette parameters with audio features
    vec3 pal_b = b * 0.5;
    vec3 pal_c = c;
    vec3 pal_d = d;

    // Generate base color from palette - Placeholder, will be overwritten later
    float colorT = sin(time/10000.);
    vec3 baseColor = palette(colorT, a, b, c, d); // Removed old calculation

    // Add some variation based on audio features
    vec3 hsl = rgb2hsl(fillColor);

    // Smoothly blend between fill color and base color
    fillColor = mix(fillColor, baseColor, 0.99);
    hsl = rgb2hsl(fillColor);

    // Add subtle variations
    hsl.x = fract(hsl.x);
    hsl.y = 0.7;
    hsl.z = 0.5 + whiteAmount * 0.2;

    vec3 fillColorFinal = hsl2rgb(fract(hsl));

    // Original shader code continues here
    // Keep UV continuous for effects

    uv = julia(uv, t);

    // Sample previous frame color with smooth transitions (texture sampling)
    vec3 prevColor = getLastFrameColor(fract(uv)).rgb;

    // --- Emphasize Fractal Coloring ---
    // Use post-Julia uv length and angle for more detailed coloring
    float finalDist = length(uv);
    float finalAngle = atan(uv.y, uv.x);

    // --- Generate Palette Colors Based on Fractal Features ---
    float paletteT = baseModulation + finalDist * 0.3 + finalAngle * 0.1; // New palette input based on fractal
    baseColor = palette(paletteT, a, pal_b, pal_c, pal_d);
    vec3 complementaryColor = palette(paletteT + 0.5, a, pal_b, pal_c, pal_d);

    // Create a complementary color scheme using the palette, now influenced by final fractal state
    vec3 hslOriginal = vec3(0.5);
    // Modulate mix based on fractal angle and pre-Julia uv.x (sin input is now scaled differently)
    hslOriginal = rgb2hsl(mix(baseColor, complementaryColor, sin(uv.x * 2.0 + finalAngle * 5.0 + t / 5.0) * 0.5 + 0.5));

    // Normalize coordinates for ripple effect (less emphasis now)
    vec2 rippleUv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y; // Use original uv for ripple base

    // Calculate ripple effect with smoother transitions & less intensity
    float distanceToCenter = length(rippleUv);
    // Reduce amplitude and slightly slow down ripple frequency
    float ripple = sin(distanceToCenter*(6.)-t*1.0)*.05 + 0.95; // Much weaker ripple

    // Generate harmonious color based on fractal structure
    // Use finalDist and finalAngle for hue calculation, remove colorT dependency
    float hue = mod(t*0.05 + finalDist*0.6 + finalAngle * 0.2, 1.0);
    vec3 color = hsl2rgb(vec3(hue, 0.7, 0.55)); // Slightly increased saturation/brightness

    // Apply ripple effect weakly
    color *= ripple; // Apply ripple as a subtle multiplier

    // Smoother color mixing with previous frame (keep damping)
    color = mix(prevColor, color, 0.001);

    // Mix between fractal/ripple color and fill color based on white amount
    color = mix(color, fillColorFinal, whiteAmount);

    vec3 prevHsl = rgb2hsl(prevColor);

    // Add subtle color variations based on audio (keep these)
    if(hslOriginal.y < 0.5){
        hslOriginal.y += (prevHsl.x) * 0.1;
    }
    if(hslOriginal.z > 0.8) {
    }
    if(hslOriginal.z < 0.1) {
    }

    // --- Final color blending: Prioritize fractal color ---
    // Give more weight to hslOriginal (derived from fractal structure)
    color = mix(hsl2rgb(hslOriginal), color, 0.3); // Was 0.7, now favors hslOriginal

    // --- REZZ GRADE: keep the fractal's structure, force the palette to blood red -> violet over black ---
    vec3 g = rgb2hsl(color);
    // triangle walk so the hue folds back instead of wrapping (no red->purple seam)
    float rezzWalk = abs(fract(g.x + finalDist * 0.15 + t * 0.02) * 2.0 - 1.0);
    float rezzHue = fract(1.0 - REZZ_SPAN * rezzWalk);          // 1.0 = red, 0.76 = purple
    float rezzL = pow(smoothstep(REZZ_FLOOR, 0.55, g.z), 1.6) * REZZ_CEIL;
    // red end stays lit, purple end sinks into shadow, the far end is black
    rezzL *= pow(1.0 - rezzWalk, REZZ_SHADOW);
    // HYPNOTIC SPIRAL + PROWL DRIVE: log-spiral arms stream outward from a dark vanishing point,
    // phases are monotonic in time only. The Julia set is PROJECTED onto the arms as a texture.
    vec2 sp = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float spR = max(length(sp), 0.015);
    float spLog = log(max(spR, 1e-4));
    float flexW = 1.0 - smoothstep(log(FLEX_R0), log(FLEX_R1), spLog);
    spR = exp(spLog - FLEX_AMT * FLEX_ENV * flexW);   // ITER16 radial-only, no angle term
    float spinPhase = rezzArmSpin;   // ITER29 back to rezz-ratchet (eyeSpin was "too fast"): ~0.07-0.18 turns/s, % 1 seamless   // ITER25 (was the iter14 time-only surge at 0.015 turns/s; now ~0.055+ turns/s on a ratchet)
    float spA = atan(sp.y, sp.x) / 6.28318 + spinPhase;
    float spTight = SPIRAL_TIGHT * (1.0 + COIL_BREATH * DRIVE_COIL);   // ITER8_COIL
    float spiral = fract((log(spR) - rezzZoom - COIL_ANCHOR) * spTight + spA * SPIRAL_ARMS - rezzDrive);   // iter18 ratchet (was time * DRIVE_SPEED)
    float spiralArm = smoothstep(0.0, 0.08, spiral) * smoothstep(0.62, 0.42, spiral);
    // leading rim + dimmer trailing rim frame each ribbon so all 4 arms read as one coherent band
    float leadRim = smoothstep(0.0, 0.035, spiral) * smoothstep(0.13, 0.04, spiral)   /* iter15: rim width no longer wobbles with per-frame bass */;
    float trailRim = (ARM_TRAIL_RIM + 0.5 * DRIVE_AIR) * smoothstep(0.47, 0.545, spiral) * smoothstep(0.64, 0.565, spiral);
    float spiralRim = max(leadRim, trailRim);
    float depth = smoothstep(0.02, 0.75, spR);                   // vanishing point recedes into black

    // ARM-SPACE JULIA: (u, spiral) is the conformal pair of the log-spiral, so a texture laid in it
    // rides the arm undistorted and shrinks toward the vanishing point like perspective.
    // u jumps by SPIRAL_TIGHT*2PI across the atan seam; tiling u by that / ARM_TEX_TILES keeps it seamless.
    float spTheta = spA * 6.28318;
    float armU = (log(spR) - rezzZoomTex) * (SPIRAL_ARMS / 6.28318) - SPIRAL_TIGHT * spTheta - rezzFlow;   // texture stays on the REST coil: rescaling tiles with the breathing coil tripled jitter (iter8 A/B)
    float armTile = SPIRAL_TIGHT * 6.28318 / ARM_TEX_TILES;
    float armAlong = abs(fract(armU / armTile) * 2.0 - 1.0);      // mirrored -> no seam between tiles
    float armAcross = clamp(spiral / 0.62, 0.0, 1.0);
    // mirrored across the ribbon centre: both edges carry the same Julia structure, so the rim
    // hugs lit texture instead of floating beside a dark exterior strip (iter4: "only 2 of 4 rims")
    float armMirror = abs(armAcross - 0.5) * 2.0;
    // ITER17 HEX FOLD ON THE ARMS (lattice-interactive/3): (armU, spiral) is the conformal equal-scale pair of
    // the log-spiral, so the fold rides the ribbon undistorted and shrinks toward the vanishing point.
    // armU jumps by SPIRAL_TIGHT*2PI across the atan seam; hxK makes that jump exactly HX_SEAM_N fold periods.
    float hxK = HX_SEAM_N / (SPIRAL_TIGHT * 6.28318);
    vec2 hp = vec2(armU, spiral) * hxK;
    // analytic pixel footprint (fwidth spikes on the seam ray and would black it out via res)
    float hxPix = 2.0 / (iResolution.y * spR) * length(vec2(SPIRAL_ARMS / 6.28318, SPIRAL_TIGHT)) * hxK;
    vec3 hx = hxFold(hp, hxPix, rezzSpin, 1.0,   // iter18 ratchet (was time * HX_SPIN)
                     HX_HEXR + 0.30 * (rzLook().x - 0.5) + 0.05 * sin(rezzMorph * 6.28318),   // iter20 autopilot hex size 0.45..0.75      // iter18: smooth shape cycle on a ratchet clock (was kurtosis MEDZ, back and forth)
                     HX_RING + 0.14 * (rzLook().y - 0.5) + 0.03 * sin(rezzMorph * 3.88322 + 1.0),   // iter20 autopilot ring 0.10..0.24  // iter18: ratchet clock (was bass-median breath)
                     HX_BORDER);                                       // iter18: fixed width (raw per-frame crest made the lines pulse)
    float ribbonCore = smoothstep(0.0, 0.35, 1.0 - armMirror);
    float armTex = max(hx.x * clamp(hx.z, 0.0, 1.0),                 // rim light, black interiors
                       ARM_RIBBON_BASE * 0.5 * (0.6 + 0.4 * ribbonCore));
    // depth field -> hue walk: coarse outlines hot red, fine detail toward violet and into shadow
    float texWalk = abs(fract(hx.y * 0.9 + t * 0.02) * 2.0 - 1.0);
    // ITER19 BUILD REVEAL: fine fold levels (violet end of texWalk) sit in shadow; a section build lifts
    // that shadow so the deeper lattice lights up. Brightness only (no coords, no width), eased envelope.
    float texL = smoothstep(0.04, 0.8, armTex) * REZZ_CEIL * (1.0 - 0.65 * texWalk * (1.0 - BUILD_REVEAL * rezzBuild)) * ENGINE_GROWL_TEX;
    // ITER31 OMINOUS THROB: a slow double-beat heartbeat on the LATTICE brightness only (rims/eye untouched),
    // clocked by the forward-only rezzDrive (~5 s per beat), so it pulses even in silence. Brightness, never coords.
    float thPh = fract(rezzDrive * 0.9);
    float throb = exp(-pow((thPh - 0.12) * 14.0, 2.0)) + 0.6 * exp(-pow((thPh - 0.30) * 14.0, 2.0));   // lub-dub
    texL *= THROB_FLOOR + (1.0 - THROB_FLOOR) * clamp(throb, 0.0, 1.0);
    texL *= LATTICE_GAIN;   // ITER34 lattice lines brighter (still under EVIL_CAP after the grade)
    rezzL = mix(rezzL * (1.0 - ARM_TEX_MIX), texL, ARM_TEX_MIX);
    rezzHue = mix(rezzHue, fract(1.0 - REZZ_SPAN * texWalk), ARM_TEX_MIX);

    rezzL *= mix(1.0 - TROUGH_DARK, 1.0, spiralArm) * depth;
    rezzL = max(rezzL, spiralRim * depth * ARM_RIM * ENGINE_GROWL);  // hot red leading edge
    rezzHue = mix(rezzHue, 1.0, leadRim);                         // leading rim is pure red
    rezzHue = mix(rezzHue, 0.80, trailRim * 0.7);                  // trailing rim is violet (treble only brightens it)
    rezzHue = fract(rezzHue - (1.0 - spiralArm) * 0.05);          // gaps lean violet
    // section mood: unwrap to [0.5,1.5) so red (1.0) sits mid-range, lean, then fold back — no wrap seam
    float moodH = rezzHue < 0.5 ? rezzHue + 1.0 : rezzHue;
    moodH = mix(moodH, 1.0, MOOD_RED * max(SECTION_MOOD, 0.0) * spiralArm);
    moodH -= MOOD_VIOLET * max(-SECTION_MOOD, 0.0) * spiralArm;
    moodH -= 0.08 * rzLook().z * spiralArm;   // ITER20 autopilot: per-scene lean from blood red toward deep violet
    rezzHue = fract(moodH);
    // ITER13 PROWL: a band at constant phase moves to larger log-radius as time grows -> rolls outward
    float prowlPhase = fract(log(spR) * PROWL_DENS - time / PROWL_PERIOD);
    float prowlWave = pow(0.5 + 0.5 * cos(6.28318 * prowlPhase), PROWL_SHARP);
    rezzL *= mix(mix(0.35, 0.80, rzLook().w), 1.0, prowlWave);   // iter20 autopilot: headlight sweep depth per scene
    // ITER11 REZZ EYE: rims emerge from the iris, the iris is a thin red ring, the pupil is black
    float eyeD = abs(log(spR) - log(EYE_R));
    float eyeRing = smoothstep(EYE_W, 0.0, eyeD);
    // iter12 moat: the arms stop short of the iris and re-emerge beyond the moat, streaming outward
    float eyeMoat = smoothstep(EYE_R * (EYE_MOAT_IN - 0.1), EYE_R * EYE_MOAT_IN, spR)
                  * (1.0 - smoothstep(EYE_R * EYE_MOAT_OUT, EYE_R * (EYE_MOAT_OUT + 0.6), spR));
    rezzL *= 1.0 - eyeMoat;
    float eyeEmerge = smoothstep(EYE_R * EYE_MOAT_OUT, EYE_R * (EYE_MOAT_OUT + 0.8), spR) * (1.0 - smoothstep(0.24, 0.5, spR));
    float emergeL = leadRim * eyeEmerge * EYE_EMERGE;
    float eyeL = eyeRing * EYE_L * (EYE_REST + (1.0 - EYE_REST) * BASS_KICK) * (0.85 + 0.15 * EYE_BREATH);   // ITER15 kick + slow breath
    rezzHue = mix(rezzHue, 1.0, max(eyeRing, step(rezzL, emergeL) * eyeEmerge));
    rezzL = max(rezzL, max(emergeL, eyeL));
    // ITER28 SINISTER EYE: the pupil disc becomes a dim blood-red iris with a vertical cat SLIT of pure black.
    // Eye-local coords follow the flexed radius so the slit breathes with the iter16 flex.
    vec2 eq = sp * (spR / max(length(sp), 1e-4)) / EYE_R;
    float eqR = length(eq);
    float iris = smoothstep(0.86, 0.80, eqR);                          // inside the ring
    float slitW = 0.20 * sqrt(max(1.0 - eq.y * eq.y, 0.0));            // lens-shaped slit, widest mid-eye
    float slit = smoothstep(slitW + 0.04, slitW, abs(eq.x));
    float irisL = EYE_IRIS_L * (0.55 + 0.45 * BASS_KICK) * (1.0 - 0.6 * eqR);   // glows from the slit outward
    rezzL = mix(rezzL, irisL, iris);
    rezzHue = mix(rezzHue, 0.995, iris);
    rezzL *= 1.0 - slit * iris;                                        // pure black void
    float eyeKeep = max(eyeRing, iris);                                // the eye is spared the darkwave gamma
    // ITER26 DARKWAVE GRADE ("make those lattices more evil"): no pink/magenta middle. Hue is pushed hard to
    // either oxblood red or bruise violet (spatial field, so the steep step can't flash in time), the violet
    // end sinks darker, and a contrast curve leaves thin hot-red veins on near-black.
    float evH = rezzHue < 0.5 ? rezzHue + 1.0 : rezzHue;            // red sits at 1.0
    float evT = smoothstep(0.38, 0.72, clamp((1.0 - evH) / 0.24, 0.0, 1.0));   // 0 = red side, 1 = violet side
    rezzHue = fract(mix(0.988, 0.745, evT));                        // oxblood -> bruise violet
    rezzL *= mix(1.0, 0.55, evT);                                   // violet runs deep, red carries the light
    rezzL = mix(pow(clamp(rezzL / EVIL_CAP, 0.0, 1.0), EVIL_GAMMA) * EVIL_CAP, rezzL, eyeKeep);   // contrast: veins bright, body black (eye spared, iter28)
    rezzL = min(rezzL, EVIL_CAP);
    color = hsl2rgb(vec3(rezzHue, 0.97, rezzL));

    fragColor = vec4(color, 1.);
}
