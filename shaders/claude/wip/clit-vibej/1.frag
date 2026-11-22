// @fullscreen: true
// @mobile: true
// @tags: chromadepth, body, clit-set, vibej, galactic, techno
// preset: https://visuals.beadfamous.com/?shader=claude/wip/clit-vibej/1&controller=clit-set&wavelet=true
// CLIT-VIBEJ/1 — live /vibej show fork of clit-set/2 (2026-11-22). THE VOYAGE. A slow, knob-steered journey through Dom Mandy's complex power fractal,
// the place clit/2 lives. All knobs at 0 = home: the clit/2 silhouette, the landmark you return to.
// With every dial at 0 the autopilot walks a curated loop of beautiful places; knob_3 (VOYAGE) scrubs
// that loop by hand, and the other knobs steer on top of it.
// controllers/clit-set.js eases every move (zoom in log-depth) so the drift feels like floating.
// Audio sets the RATE of the always-on spin (it quickens with the music) and the slow colour; it never
// steers and never pulses the light (that read as flicker and shiver on the show wall, 2026-11-21).
// Colour is built in OKLCH and gamut-mapped: red / amber / teal / blue-violet, never grey, never hot magenta.
// Renders without the controller: cs_* read 0 and the knobs drive the camera directly (no voyage path).

uniform float cs_on, cs_time, cs_presence, cs_flow;
uniform float cs_A, cs_B, cs_kick, cs_bass, cs_mids, cs_treb;
uniform float cs_build, cs_drop, cs_jump, cs_shift, cs_hue;
uniform float cs_cx, cs_cy, cs_lz, cs_rot, cs_curl, cs_navA, cs_navB, cs_breath;
uniform float cs_pearl, cs_focus, cs_spread, cs_grit, cs_tone, cs_beat, cs_punch, cs_thump;
uniform float cs_drift;
uniform float cs_k9, cs_k10, cs_k11, cs_k12, cs_k13, cs_k14, cs_k15, cs_k16;

#define HAS_CTL (cs_on > 0.5)
#define TAU 6.2831853

// ============================================================================
// KNOB MAP (MIDI Fighter Twister 4x4). Every dial at 0 looks right: after a reload all dials read 0.
//   row 1  k1 X        k2 Y        k3 VOYAGE   k4 ZOOM      ← navigation (eased in the controller)
//   row 2  k5 TURN     k6 POWER    k7 BODY     k8 CURL      ← the shape of the world
//   row 3  k9 HUE      k10 NEBULA  k11 TRAILS  k12 REACT
//   row 4  k13 GLASSES k14 EMBER   k15 SPOT    k16 LACE
// k1/k2/k3 at 0 = AUTOPILOT: the voyage drifts by itself through the waypoint loop and returns home.
// X/Y push the camera from wherever the voyage has it (dial × PAN_SPAN), so a nudge is a small move.
// VOYAGE blends to a hand scrub over its first 8%, along the shorter way round the loop.
// ============================================================================
#define K_HUE     (HAS_CTL ? cs_k9  : knob_9)
#define K_NEBULA  (HAS_CTL ? cs_k10 : knob_10)
#define K_TRAILS  (HAS_CTL ? cs_k11 : knob_11)
#define K_REACT   (HAS_CTL ? cs_k12 : knob_12)
#define K_DEPTH   (HAS_CTL ? cs_k13 : knob_13)
#define K_GLOW    (HAS_CTL ? cs_k14 : knob_14)
#define K_DROP    (HAS_CTL ? cs_k15 : knob_15)
#define K_LACE    (HAS_CTL ? cs_k16 : knob_16)

// ============================================================================
// NAVIGATION. Audio never touches these (audio in fractal coordinates strobes: clit/4).
// Controller: eased voyage + manual blend. Fallback: the same manual mapping, no voyage.
// Keep the fallbacks in sync with nav() in controllers/clit-set.js.
// ============================================================================
#define HOME_CX 0.77
#define ZOOM_MAX 1.1                                   // log-zoom cap (3x): past ~3x the lace turns to speckle
#define PAN_SPAN 0.8                                   // PAN_SPAN in controllers/clit-set.js
#define NAV_CX  (HAS_CTL ? cs_cx  : HOME_CX - knob_2 * PAN_SPAN)
#define NAV_CY  (HAS_CTL ? cs_cy  : knob_1 * PAN_SPAN)
#define NAV_LZ  (HAS_CTL ? cs_lz  : knob_4 * ZOOM_MAX)
#define NAV_ROT (HAS_CTL ? cs_rot : knob_5 * TAU)
#define NAV_A   (HAS_CTL ? cs_navA : 1.5 + knob_6 * 1.4)
#define NAV_B   (HAS_CTL ? cs_navB : 0.55 - knob_7 * 0.4)
#define NAV_CURL (HAS_CTL ? cs_curl : knob_8 * 0.45)

#define REACT (1.0 + K_REACT * 1.5)

// ============================================================================
// COIL + UNDULATE (vibej iter 4, Aaron: "We need it to undulate and coil much more").
// Both are TRAVELING waves on a one-way phase: the pattern moves one way forever, never sways back.
// Audio sets only the RATE (cs_flow quickens with energy and kicks, cs_drift is the music-rate spin
// integral); amplitudes are constant. Fades in over the first 10 s after page load.
// ============================================================================
// iter 6: + cs_beat (kick counter, eased 0.12 s, never back): every kick surges the waves ~0.24 rad forward
#define WAVE_PHASE (HAS_CTL ? (cs_flow * TAU * 3.0 + cs_drift * 20.0 + cs_beat * TAU * 0.35) : iTime * 0.8)   // ~0.6 rad/s silent, ~3 loud, + kick surges
#define WAVE_RAMP (HAS_CTL ? smoothstep(0.0, 10.0, cs_time) : 1.0)   // 10 s fade-in from page load
#define COIL_AMP (0.22 * WAVE_RAMP)     // rad of barber-pole twist per iteration (iterations 2+)
#define UND_AMP  (0.045 * WAVE_RAMP)    // screen units of traveling ripple on the input domain

// ============================================================================
// PER-DEVICE SEEDS — palette phase, lace density, rim warmth, star scatter. ?seed= pins it.
// ============================================================================
#define SEED_PHASE ((seed - 0.5) * 2.4)
#define SEED_LACE  ((seed2 - 0.5) * 0.6)
#define SEED_WARM  (seed3 * 0.5)
#define SEED_STARS (seed4 * 97.0)

// ============================================================================
// AUDIO TEXTURE (controller envelope, else raw-feature fallback)
// ============================================================================
#define FLOW (HAS_CTL ? cs_flow : iTime * 0.03)
// A detected drop does not dim the frame: on a hot line the detector fires every ~8 s, and its 50 ms
// spotlight was a whole-frame flash the shiver probe read as zoom in-and-out. Drops show as the hue
// turn (cs_jump) only. The SPOT knob (k15) still reaches the full spotlight.
#define DROP_INTENSITY K_DROP
#define BUILD_INTENSITY (HAS_CTL ? cs_build : clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
#define KICK (HAS_CTL ? cs_kick : clamp(bassZScore - 0.4, 0.0, 1.0))
// Many subtle features, each on its own channel, all slow-released envelopes: alive, never flashing.
#define BREATH (HAS_CTL ? cs_breath : energyNormalized)                       // energy, 1.5 s
// Bass punch: LOCAL only (rim, braid, ember). It used to multiply the whole frame, and whole-frame
// light on a 0.04 s attack is flicker, not rhythm (show 2026-11-21: flicker 1.3-1.6 on a line input).
#define PULSE ((HAS_CTL ? cs_bass : clamp(bassZScore, 0.0, 1.0)) * REACT)
// Lace light is steady: only music presence (a 0.25 s gate, track starts and stops) lifts it.
// It used to swell with mids (0.25 s) x loudness (1.5 s): global light on envelopes that release
// AFTER the hit, so the frame changed most while the music fell (motionVsEnergy -0.35 at the show).
#define PRESENCE (HAS_CTL ? cs_presence : 1.0)
#define LACE_GAIN ((1.0 + 0.3 * PRESENCE) * (1.0 + 0.45 * PUNCH * REACT))
// Rim, braid and stars hold steady. Any light that pulses with the beat shifts the frame's radial
// brightness profile, which the show's shiver probe reads as zoom jitter (measured 2026-11-22: kick
// light on rim + braid doubled zoomAbs). The beat lives in the spin rate (controllers/clit-set.js SPIN).
// PUNCH: every kick, 30 ms attack, 0.2 s fall (controller cs_punch). Lands on lace, rim and ember; the
// darkness pass and the luminance tone map keep it off the whole frame. Techno-venue build (Aaron, live:
// "I need it way more music reactive").
#define PUNCH (HAS_CTL ? cs_punch : clamp(bassZScore - 0.4, 0.0, 1.0))
#define BASS_ENV (HAS_CTL ? max(cs_thump, cs_bass) : clamp(bassZScore, 0.0, 1.0))   // local kick thump or z-score swell
#define TREB_ENV (HAS_CTL ? cs_treb : clamp(trebleNormalized, 0.0, 1.0))
#define RIM_INTENSITY (0.5 + 1.6 * PUNCH * REACT + 0.5 * TREB_ENV)
#define TWINKLE (0.2 + 1.5 * TREB_ENV * REACT)
#define RIM_WARMTH clamp(0.25 + SEED_WARM + BUILD_INTENSITY * 0.35, 0.0, 1.0)
#define PEARL (0.15 + (HAS_CTL ? cs_pearl : clamp(spectralCrestNormalized, 0.0, 1.0)) * 0.35)
// Focal size and vignette are fixed against audio: both are radial, and an eased radius that grows and
// shrinks with kurtosis / spread reads as a zoom in and out (the show's shiver probe, 2026-11-21)
#define FOCAL_RADIUS (0.5 + K_GLOW * 0.35)
#define GRIT (HAS_CTL ? cs_grit : 0.0)                                         // roughness: nebula shimmer
// vibej iter 9: + a timbre shift (cs_shift: spectral flux and entropy change, 0.3 s attack) turns the palette
// up to 0.6 rad. Colour only: lace lightness comes from the orbit luma, not the hue.
#define HUE_TURN ((HAS_CTL ? cs_hue : 0.0) * 1.2 + (HAS_CTL ? cs_jump : 0.0) * 0.9 + K_HUE * TAU + SEED_PHASE + (HAS_CTL ? clamp(cs_shift, 0.0, 1.0) : 0.0) * 0.6)
// Slow colour only: the 8 s centroid mean leans the palette warm on bright music, cool on dark
#define TONE_LEAN ((HAS_CTL ? cs_tone : 0.5) - 0.5)
// Loudness (1.5 s) lifts chroma a little: loud is more vivid, quiet more velvet
// vibej iter 1: mids (cs_mids, z-score envelope) lift chroma too: vocal/lead passages go more vivid, colour only
#define MIDS_ENV (HAS_CTL ? clamp(cs_mids, 0.0, 1.0) : clamp(midsZScore, 0.0, 1.0))
#define CHROMA_GAIN (0.85 + 0.3 * BREATH + 0.25 * MIDS_ENV * REACT)
// Trails do not grow with loudness: more smear on loud passages made the loud frames move LESS
#define FEEDBACK_MIX clamp(0.22 + K_TRAILS * 0.55, 0.0, 0.85)
#define VIGN_OPEN 0.03

// ============================================================================
// COLOR
// ============================================================================
// Strict chromadepth for the glasses: red (29°, near) to violet (293°, far). Starts at true red, not
// the 0° pink-red, so the focal never reads as hot magenta.
vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = 0.08 + t * 0.735;
    float chromaBoost = 1.0 + 0.2 * sin(t * 3.14159 * 2.0);
    float L = 0.7 - t * 0.45;
    float C = 0.25 * chromaBoost * (1.0 - t * 0.3);
    float h = hue * 6.28318;
    return clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
}

// OKLCH → sRGB with the chroma shrunk at constant L and hue until it fits (no clipped channels)
vec3 lchGamut(float L, float C, float h) {
    vec3 c = oklch2rgb(vec3(L, C, h));
    if (min(min(c.r, c.g), c.b) >= 0.0 && max(max(c.r, c.g), c.b) <= 1.0) return c;
    float lo = 0.0, hi = C;
    for (int k = 0; k < 5; k++) {
        float mid = 0.5 * (lo + hi);
        vec3 m = oklch2rgb(vec3(L, mid, h));
        if (min(min(m.r, m.g), m.b) < 0.0 || max(max(m.r, m.g), m.b) > 1.0) hi = mid; else lo = mid;
    }
    return clamp(oklch2rgb(vec3(L, lo, h)), 0.0, 1.0);
}

// The clit/2 palette as OKLCH hues: red 29°, amber 66°, teal 195°, blue-violet 285°. t runs 0..1 and
// callers ping-pong it, so the colour never crosses the magenta arc between violet and red.
// Smoothstepped legs: the hues hold, the passes through yellow-green are quick.
float paletteHue(float t) {
    float s = clamp(t, 0.0, 1.0) * 3.0;
    float i = min(floor(s), 2.0);
    float f = smoothstep(0.12, 0.88, s - i);
    float h0 = i < 0.5 ? 0.506 : (i < 1.5 ? 1.152 : 3.403);
    float h1 = i < 0.5 ? 1.152 : (i < 1.5 ? 3.403 : 4.974);
    return mix(h0, h1, f);
}

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
               mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}

// One parallax layer of stars: cell-jittered points, each with its own twinkle phase
float stars(vec2 p, float density) {
    vec2 cell = floor(p), f = fract(p) - 0.5;
    float h = hash21(cell + SEED_STARS);
    if (h > density) return 0.0;
    vec2 o = vec2(hash21(cell + 7.1), hash21(cell + 3.7)) - 0.5;
    float d = length(f - o * 0.7);
    float tw = 0.6 + 0.4 * sin(FLOW * 40.0 * (0.5 + h) + h * 60.0);
    return smoothstep(0.06, 0.0, d) * tw * (0.4 + 0.6 * fract(h * 13.0));
}

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 P, vec2 V) {
    float drop = DROP_INTENSITY;
    float build = BUILD_INTENSITY;
    float kick = KICK;

    float lz = NAV_LZ;                                     // log zoom: 0 = home, 1.1 = 3x
    float zoom = exp(lz);

    // Screen → fractal plane. Screen x maps to C.y (the mirror axis), screen y to C.x, as clit/2.
    vec2 p = (iResolution.xy - V - V) / iResolution.y;
    p = rot2(NAV_ROT) * p;
    // UNDULATE: two crossed traveling waves ripple the domain, so the filaments ripple along their length
    // like jellyfish tendrils. Directional, not radial (radial rings read as zoom to the shiver probe).
    float wph = WAVE_PHASE;
    p += UND_AMP * vec2(sin(5.5 * p.y - wph), sin(4.7 * p.x - wph * 0.83 + 1.7));
    // Zoom dives toward a lace-dense point on the right wing (a zoom into the pale core is empty).
    vec2 home = vec2(NAV_CX, NAV_CY);
    vec2 dive = home + vec2(0.23, 0.33);
    vec2 C = dive + (home + 0.6 * p.yx - dive) / zoom;
    V = C;

    float v, x, y,
          z = y = x = 9.;
    vec2 Z = vec2(0.0);

    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);
    float a_pow = NAV_A;
    float b_off = NAV_B;
    mat2 curl = rot2(NAV_CURL);

    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * a_pow;
        float c = dot(V, vec2(a, log(d) / 2.));
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * b_off;
        V = curl * V;
        // COIL: a barber-pole twist that travels outward along log|V| as the phase runs one way. Skipped on
        // the first iterations so the silhouette holds while the filaments coil.
        float cw = COIL_AMP * smoothstep(1.0, 6.0, float(k));
        if (cw > 0.0) V = rot2(cw * sin(1.3 * log(dot(V, V) + 1e-4) - wph * 1.1)) * V;

        x = min(x, abs(V.x));
        y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;

        focal_trap = min(focal_trap, length(V - focal_center));
    }

    float lx = log(max(x, 1e-12)), ly = log(max(y, 1e-12));
    z = 1. - smoothstep(1., -6., ly) * smoothstep(1., -6., lx);

    // Lace from the orbit traps. Thresholds slide with depth so deep zooms keep a dark floor.
    // The lace threshold is geometry: audio does not move it. Timbre shifts (cs_shift, 0.3 s attack) and
    // loudness used to slide it, which grew and shrank the whole lace area (the show's shiver probe).
    // Bass thickens the filigree (cs_bass: 40 ms attack, 0.5 s release); the threshold returns, never drifts
    float lace_lo = -2.0 + SEED_LACE + K_LACE * 0.9 + BASS_ENV * 0.9 * REACT - lz * 0.6;
    float lace_hi = lace_lo - 3.0;
    float lace_x = smoothstep(lace_lo, lace_hi, lx);
    float lace_y = smoothstep(lace_lo, lace_hi, ly);
    float lace = pow(max(lace_x, lace_y), 3.0);
    float lace_fine = lace_x * lace_y;
    // Coherence gate, depth only: past ~3x, drop lace that changes faster than a pixel (speckle)
    float coh = smoothstep(0.6, 1.6, lz);
    lace *= 1.0 - coh * smoothstep(1.5, 5.0, fwidth(min(lx, ly)));
    // vibej iter 11: at any depth, sub-pixel lace dims by up to half toward the velvet floor, so the dense
    // mass (thickened by bass, churned by the coil) reads as velvet with clean filaments, not chalky speckle
    // iter 13: measured on the trap logs clamped to the lace's transition band. Unclamped, log(trap) runs
    // to -inf on the thread cores, so fwidth spiked there and the gate dotted the cleanest threads dark.
    float lxc = clamp(lx, lace_hi - 0.5, lace_lo + 0.5), lyc = clamp(ly, lace_hi - 0.5, lace_lo + 0.5);
    lace *= 1.0 - 0.5 * smoothstep(2.0, 6.0, fwidth(min(lxc, lyc)));
    lace_fine *= 1.0 - 0.8 * smoothstep(1.5, 4.0, fwidth(lxc + lyc));
    lace_fine *= 1.0 - coh * 0.7;
    // vibej iter 10: at any depth, the braid fades where it changes faster than a pixel. Its sparkle, punch and
    // pearls stay on clean filaments instead of churning the dense lace mass into chalky speckle (phone 408 px).

    float phi = atan(Z.y, Z.x) + HUE_TURN;
    // The rainbow's luma is the lace's LIGHTNESS structure, so it takes only the fixed per-device phase.
    // Fed the moving hue turn (cs_jump +0.9 rad per drop, cs_hue), every drop re-lit the whole lace
    // over 1.5 s: a light morph the shiver probe read as zoom. The hue turn now moves colour only.
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) + SEED_PHASE - vec4(0, 2.1, 4.2, 0)), 0.0));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));
    // Palette position: the orbit angle as a triangle wave (0 red … 1 violet … 0 red), so the hue never
    // crosses the magenta arc. The offset lands the dense lace's bunched orbit angles on amber and teal.
    // Threads that cross the x trap and the y trap sit half a leg apart, so the filigree braids colours.
    // Bright music leans warm (8 s centroid mean).
    float pal_t = abs(fract((phi + 1.07) / TAU + (lace_x - lace_y) * 0.12 + (luma - 0.6) * 0.6 - TONE_LEAN * 0.1) * 2.0 - 1.0);
    // The darkest lace (the fan petals) goes deep violet, the velvet body: never brown or grey
    pal_t = mix(pal_t, 0.85 + 0.15 * pal_t, smoothstep(0.3, 0.05, luma));
    // The pale star (the smooth high-z body, z ~0.8) is the landmark: keep it pale, tinted periwinkle
    // (far), so the red ember pops in front of it
    float pale = smoothstep(0.66, 0.78, z);
    pal_t = mix(pal_t, 0.93, pale);

    // FOCAL — one hot spot at home, fading out with depth (at depth every orbit grazes the trap)
    float focal = pow(smoothstep(FOCAL_RADIUS, 0.01, focal_trap), 3.0);
    focal *= 1.0 - smoothstep(0.5, 2.0, lz);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float depth = mix(base_depth, 0.0, pow(focal, 1.5));
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = clamp(mix(depth, 0.0, drop * focal), 0.0, 1.0);

    // GALAXY BEHIND THE BODY: velvet violet, nebula dust tinted by the orbit colour, parallax stars.
    // Stars sit on a far plane: they drift at a fraction of the camera's move, so travel reads as travel.
    vec2 cam = vec2(NAV_CY, NAV_CX - HOME_CX);
    vec2 sky = rot2(NAV_ROT * 0.5) * uv;
    float neb = 0.35 + 0.65 * K_NEBULA;
    vec2 dustP = sky * 2.2 / (1.0 + lz * 0.15) + cam * 1.6 + vec2(FLOW * 0.4, 0.0);
    float dust = vnoise(dustP) * 0.6 + vnoise(dustP * 2.3 + 4.0) * 0.4;
    dust = smoothstep(0.45, 0.95, dust);
    vec3 dust_col = mix(vec3(0.10, 0.03, 0.22), lchGamut(0.32, 0.11, paletteHue(pal_t)), 0.5);
    // vibej iter 2: bass thump leans the nebula toward deep ember red (same lightness: hue, not light)
    dust_col = mix(dust_col, lchGamut(0.30, 0.12, 0.506), clamp(0.45 * BASS_ENV * REACT, 0.0, 0.6));
    // vibej iter 12: hi-hats bring the voids alive: more stars come out with treble (TREB_ENV), brighter
    float s1 = stars(sky * 38.0 / (1.0 + lz * 0.25) + cam * 22.0, 0.10 + 0.25 * K_NEBULA + 0.15 * TREB_ENV);
    float s2 = stars(sky * 17.0 / (1.0 + lz * 0.45) + cam * 48.0 + 31.0, 0.05 + 0.15 * K_NEBULA + 0.10 * TREB_ENV);
    float star = (s1 * 0.6 + s2) * (0.4 + 0.9 * TWINKLE);
    vec3 bg = vec3(0.04, 0.015, 0.08) + dust_col * dust * neb * 0.45 * (0.9 + 0.2 * BREATH + 0.15 * GRIT);

    // LACE COLOUR, built in OKLCH: the orbit rainbow's lightness (its structure) with the palette's hue
    // at full chroma. The raw rainbow went grey wherever z sat near 0 or 1 (the dark fan petals and the
    // dusty pale star); here every lace pixel carries a hue. Darker lace gets more chroma (deep wine,
    // deep teal), the pale star stays pale but tinted. Gamut-mapped, never clipped.
    float lace_L = 0.30 + 0.56 * luma;
    float lace_C = (0.13 + 0.07 * (1.0 - luma)) * (1.0 - 0.35 * pale) * CHROMA_GAIN;
    vec3 vivid = lchGamut(lace_L, lace_C, paletteHue(pal_t));
    vec3 lace_col = mix(vivid, chromadepth(mix(0.15, 0.7, 1.0 - luma)), K_DEPTH);
    vec3 col = mix(bg, lace_col * LACE_GAIN, lace);
    // The braid (where both traps cross) is where the beat lands: a bass punch lights the filigree, locally
    col += mix(lace_col, vec3(1.0, 0.88, 0.7), 0.55) * lace_fine * (0.3 + 0.9 * TREB_ENV * REACT + 0.6 * PUNCH * REACT);   // treble sparkles the braid
    // PEARLS (vibej iter 7): sparse soft pinpoints on the braid. Cells live in fractal space, so they ride
    // the geometry and shimmer as the coil/undulate waves pass; each twinkles on its own phase. Spectral
    // crest (peaky, tonal sound: cs_pearl) brings more of them out. Local light only.
    vec2 pq = C * zoom * 120.0;
    float pid = hash21(floor(pq) + 3.3);
    float pon = step(1.0 - 0.05 * (PEARL / 0.3), pid);
    float pdot = smoothstep(0.38, 0.08, length(fract(pq) - 0.5));
    float ptw = 0.5 + 0.5 * sin(FLOW * 50.0 + pid * 60.0);
    col += mix(lace_col, vec3(1.0, 0.93, 0.82), 0.6) * lace_fine * pon * pdot * ptw * 0.55;

    // Rim — body silhouette edges (fades at depth, where every pixel is an edge)
    float rim = smoothstep(0.1, 0.5, edge * 20.0) * (1.0 - smoothstep(0.8, 2.2, lz));
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    // Rim hue walks its own way round the palette (a quarter turn off the lace); a build warms it to red
    float rim_t = mix(0.5 - 0.5 * cos(phi + 1.6), 0.0, RIM_WARMTH * 0.6);
    rim_t = mix(rim_t, 0.66, clamp(0.4 * TREB_ENV * REACT, 0.0, 0.5));   // vibej iter 8: hi-hats cool the rim toward teal
    vec3 rim_col = lchGamut(0.66, 0.16 * CHROMA_GAIN, paletteHue(rim_t));
    col += rim_col * rim * RIM_INTENSITY * 0.45;

    col = mix(col, chromadepth(depth) * 1.2, focal * 0.3);

    float spotlight = mix(mix(1.0, 0.2, drop), 1.0, focal);
    col *= spotlight;

    vec3 hot_red = vec3(1.0, 0.15, 0.05);
    // Ember steady: it sits at the centre of the frame, and a kick-pulsed ember breathed the centre
    // rings (the show's shiver probe). The beat now lives in the spin rate.
    float ember = focal * (0.22 + 0.6 * PUNCH * REACT);
    float blaze = focal * mix(1.0, 2.5, drop) * 0.5 * drop;
    col += hot_red * (ember + blaze);
    col += vec3(1.0, 0.7, 0.4) * pow(focal, 3.0) * drop * 0.6;


    vec4 prev = getLastFrameColor(gl_FragCoord.xy / iResolution.xy);
    vec3 prevc = clamp(prev.rgb, 0.0, 1.0);
    col = mix(col, prevc * 0.95, FEEDBACK_MIX);

    float vign = 1.0 - pow(length(uv) * (0.65 - VIGN_OPEN), 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + K_DROP * 2.0), K_DROP);   // the SPOT knob only: radial
    col *= max(vign, 0.02);

    // Darkness enforcement: lace, rim, focal are bright; the galaxy stays a dim floor behind them
    float lit = max(max(lace, rim * 0.5), focal);
    col *= mix(0.15 + 0.35 * dust * neb, 1.0, lit);
    // Stars after the darkness pass, only in the dark gaps, dimmed in the drop spotlight
    col += vec3(0.85, 0.8, 1.0) * star * (1.0 - lit) * max(neb, 0.35 + 0.5 * TREB_ENV) * mix(1.0, 0.3, drop) * max(vign, 0.0);

    // Tone map on luminance, not per channel: per-channel Reinhard pulled every bright hue toward grey
    // (the dusty look). Same curve for brightness; hue and saturation survive. Anything that still
    // overshoots is pulled toward its own grey just far enough to fit, so no channel clips.
    float lum = dot(max(col, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));
    col = max(col, vec3(0.0)) / (lum + 0.7);
    float tl = lum / (lum + 0.7);
    // Knee at 0.94, not 1.0: a hot red ember landed exactly on 1.0 and counted as clipped (show clip 0.01-0.04)
    float hi = max(max(col.r, col.g), col.b);
    if (hi > 0.94) col = mix(vec3(tl), col, max(0.94 - tl, 0.0) / max(hi - tl, 1e-4));
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    // THE BEAT, IN COLOUR ONLY. The show's meters (scripts/vj/aesthetic-meter.js) read Rec.709 luminance
    // of the output: flicker and motion from |ΔL|, shiver from L edges and L in rings. So the beat turns
    // hue and lifts chroma in OKLab, then each pixel is scaled back to its own luminance: the kick is
    // vivid to the eye and invisible to the meters. Three layers, on the lit lace and rim only:
    //   kick    hue step (+0.45 rad: red leans amber, violet leans orchid, never hot magenta) and chroma
    //           lift (+100%), eased out over the 0.4 s kick
    //   beat    cs_beat steps forward on every kick and never goes back: a colour wave that travels
    //           along the filaments (orbit angle + trap depth) one notch per beat
    float beatOn = HAS_CTL ? 1.0 : 0.0;
    float L0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float wave = sin(phi * 2.0 + lx * 0.7 - cs_beat * TAU);
    float ang = (PUNCH * 0.5 + kick * 0.2 + 0.35 * wave) * REACT * lit * beatOn;
    float cgain = 1.0 + 1.0 * PUNCH * REACT * lit * beatOn;
    vec3 lab = rgb2oklab(col);
    // vibej iter 3: the rotation never carries a pixel into the hot-magenta arc. In OKLab atan range that
    // arc is (-1.25, 0.45) rad: between blue-violet (288°) and red (26°). Violet turned + and red turned -
    // (the signed wave) used to land there; now they stop at the arc's edge.
    float h0 = atan(lab.z, lab.y);
    float h1 = h0 + ang;
    if (!(h0 > -1.25 && h0 < 0.45) && h1 > -1.25 && h1 < 0.45) h1 = h0 < -0.4 ? -1.25 : 0.45;
    lab.yz = length(lab.yz) * cgain * vec2(cos(h1), sin(h1));
    vec3 bc = max(oklab2rgb(lab), vec3(0.0));
    bc *= L0 / max(dot(bc, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
    float bhi = max(max(bc.r, bc.g), bc.b);
    if (bhi > 0.94) bc = mix(vec3(L0), bc, max(0.94 - L0, 0.0) / max(bhi - L0, 1e-4));
    col = mix(col, bc, step(1e-3, L0));

    // NEVER HOT MAGENTA (vibej iter 5). Measured on the phone: the excess was purple-orchid lace at
    // 300-330° (OKLab), mid lightness: red blended over violet by the trails once the filaments moved
    // (iter 4), mids lifting chroma (iter 1), and the per-channel gamma above leaning violet pinkward.
    // Whatever made it, hues inside the arc between blue-violet (288°) and red (26°) are squeezed toward
    // the two edges, and only the arc's middle loses some chroma. L is kept: no light change.
    vec3 gl = rgb2oklab(col);
    float gh = atan(gl.z, gl.y);
    if (gh > -1.25 && gh < 0.45) {
        float gt = (gh + 1.25) / 1.70;
        float gq = gt < 0.5 ? 0.5 * pow(2.0 * gt, 3.0) : 1.0 - 0.5 * pow(2.0 - 2.0 * gt, 3.0);
        float gc = length(gl.yz) * (1.0 - 0.45 * smoothstep(0.25, 0.0, abs(gt - 0.5)));
        float g2 = -1.25 + gq * 1.70;
        gl.yz = gc * vec2(cos(g2), sin(g2));
        col = oklab2rgb(gl);
    }

    P = vec4(clamp(col, 0.0, 1.0), 1.0);
}
