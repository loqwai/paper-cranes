// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: eclipse, corona, star, plasma, claude, performance
// @name: totality burning
//https://visuals.beadfamous.com/?shader=claude/wip/eclipse/3&controller=wavelet-ease&wavelet=true&fullscreen=true&name=Totality
//
// TOTALITY ALIVE (eclipse/2.frag) — 1.frag rebuilt for MOTION.
//
// WHAT WAS WRONG WITH 1.frag: a black disc 42% of the half-height sat dead centre and never
// moved, and every animated quantity rode the controller's monotonic phases at their BASE rate
// — flowPhase advances 0.06/s and the shader scaled it by 0.42, i.e. 0.025 noise-units per
// second. spinPhase gave the diamond ONE REVOLUTION EVERY NINE MINUTES. In a still frame that
// reads as a dramatic eclipse. In motion it reads as a black hole with a shimmer. It was
// validated from stills, and a still cannot validate a motion piece.
//
// WHAT 2.frag DOES INSTEAD:
//   * THE CORE IS SMALL (R 0.208 → 0.082, ~1/6 the area) and it is NOT dead — a churning ember
//     plasma burns inside it, dark at the very centre so it still reads as an eclipse, hot at
//     the limb. It also DRIFTS on a slow Lissajous, so the composition never sits still.
//   * CONSTANT-RATE TIME BASES. Every motion is `iTime * k + <monotonicPhase> * m`. The iTime
//     term has a FIXED rate, so it can never jump or appear to accelerate (that artefact comes
//     from `iTime * <changing rate>`, which is what the discipline forbids — a constant is
//     safe). The phase term lets the audio ADD speed from now on. Result: at quietGate 0 the
//     frame still rotates, scrolls, ripples and drifts. Silence looks CALM, not FROZEN.
//   * SHOCK RINGS travel outward continuously at a constant rate and BLAZE on the transient —
//     amplitude only, the ring positions never move on a hit.
//   * THE CORONA REACHES THE CORNERS. rayReach 0.26 quiet → ~1.0 loud, so a drop genuinely
//     fills the frame instead of shimmering at a rim.
//   * BEAT PUNCH: 11.5% whole-frame scale + an exposure flash + a hue kick + the ring blaze +
//     the diamond supernova, all on the same transient. Obvious from across a dark room.
//   * A TURBULENT NEBULA scrolls over the entire background, so there is no motionless region
//     anywhere in frame at any audio level.
//
// SIGNAL DISCIPLINE (docs/advanced-shader-techniques.md §1, via ?controller=wavelet-ease):
//   - Continuous quantities read spring-smoothed *Spring uniforms, never raw z-scores.
//   - Raw transients (waveletBassZScore / wavelet_bassHit) drive AMPLITUDE and SCALE only.
//     They never touch a phase or an angle, so nothing ever rocks backwards when they decay.
//   - Audio changes phase RATES (via the controller's accumulators), never phase VALUES.
//   - Every audio offset is multiplied by quietGate so mic noise in a quiet room can't drive it.
//   - FAMILIES: PITCH (melodyFlow, centroid) → colour. LEVEL (bass/energy) → reach + rotation
//     rate. TEXTURE (crest/roughness) → streamer detail + bead sparkle. Radial depth → band.
// License: CC BY-NC-SA 3.0

#define PI  3.14159265359
#define TAU 6.28318530718

// ── wavelet-ease controller outputs (declared by hand; 0 without the controller / a mic) ──
uniform float waveletBassSpring;
uniform float waveletBand2Spring;
uniform float waveletBand4Spring;
uniform float waveletBand5Spring;
uniform float waveletCentroidSpring;
uniform float energySpring;
uniform float melodyFlow;
uniform float tonalStrength;
uniform float spectralCrestSmooth;
uniform float spectralRoughnessSmooth;
uniform float flowPhase;
uniform float morphPhase;
uniform float spinPhase;
uniform float quietGate;
uniform float wubDepth;
uniform float evoWarp;
uniform float evoPlasma;
uniform float sectionMode;
uniform float sectionMix;
// waveletBassZScore + wavelet_bassHit auto-declare (raw) — transient AMPLITUDE only.

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float ehash(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = ehash(i), b = ehash(i + vec2(1.0, 0.0));
    float c = ehash(i + vec2(0.0, 1.0)), d = ehash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p){
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 4; i++){
        v += amp * vnoise(p);
        p = p * 2.03 + 17.1;
        amp *= 0.5;
    }
    return v;
}

// cheap 2-octave version for the full-screen layers (background nebula, core ember) — those
// cover every pixel, so they get the smaller budget.
float fbm2(vec2 p){
    return vnoise(p) * 0.64 + vnoise(p * 2.07 + 11.3) * 0.30;
}

// Depth-coherent reactivity: TREBLE shimmers the near structure at the limb, MIDS the middle,
// BASS the far streamers. t = 0 at the limb → 1 at the outer reach.
float bandForDepth(float t){
    if (t < 0.34) return waveletBand5Spring;
    if (t < 0.67) return waveletBand2Spring;
    return waveletBassSpring;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv0 = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 scr = fragCoord / iResolution.xy;
    vec2 sp  = scr * 2.0 - 1.0;

    // ── CONDITIONED SIGNALS ── smoothed springs for everything continuous, gated by quietGate.
    float gate = clamp(quietGate, 0.0, 1.0);
    float bass = waveletBassSpring   * gate;
    float mids = waveletBand2Spring  * gate;
    float body = waveletBand4Spring  * gate;
    float air  = waveletBand5Spring  * gate;
    float eng  = energySpring        * gate;
    float grit = spectralRoughnessSmooth * gate;
    float artc = spectralCrestSmooth * gate;                 // articulation / spikiness
    // RAW transient — amplitude and scale only, never a phase (advanced-shader-techniques §1/§2).
    float kick = clamp(clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.62
                     + clamp(wavelet_bassHit, 0.0, 1.0) * 0.48, 0.0, 1.0) * gate;
    float lift = clamp(eng * 0.70 + artc * 0.45, 0.0, 1.0);  // smooth swell of a build/drop

    // ── ALWAYS-ON TIME BASES ── the fix for the frozen frame. Each is a CONSTANT rate (which can
    //   never jump or accelerate) PLUS the controller's monotonic accumulator (which the audio
    //   speeds up from now on). So the piece moves at quietGate = 0, and moves FASTER when loud.
    float T     = iTime;
    float spin  = T * 0.130 + spinPhase  * 2.2;   // whole-field rotation   (~45 s/rev quiet)
    float flow  = T * 0.560 + flowPhase  * 3.2;   // outward scroll + rings
    float churn = T * 0.230 + morphPhase * 2.6;   // writhe of the filaments

    // ── BEAT PUNCH ── the entire frame scales in on the transient and springs back out. 11.5%
    //   is deliberately far past subtle: this is the cue a stranger reads first.
    float punch = kick * 0.115 + bass * 0.045;
    vec2 uvp = uv0 * (1.0 - punch);

    // ── THE CORE DRIFTS ── a slow constant-rate Lissajous. Nothing in frame is anchored, so the
    //   composition can never read as a static image with an effect playing on top of it.
    vec2 core = vec2(sin(T * 0.077), cos(T * 0.0530)) * 0.075;
    vec2 uv = uvp - core;

    float R  = 0.070;                          // the moon — 14% of frame height, and BURNING.
    float r  = length(uv);
    vec2  dir = uv / max(r, 1e-5);
    float ds = r - R;                          // signed distance from the limb
    float d  = max(ds, 0.0);
    float aa = 1.6 / iResolution.y;
    float outside = smoothstep(R - aa, R + aa, r);

    // ── COLOUR SPINE ── one hue journey for the whole frame. The MELODY carries the palette
    //   through the song (PITCH → COLOUR); the transient kicks it sideways so a beat is a
    //   COLOUR event as well as a brightness event.
    float hueBase = 0.055
                  + melodyFlow * 0.24 * gate
                  + waveletCentroidSpring * 0.10 * gate
                  + kick * 0.11
                  + mod(sectionMode, 5.0) * 0.13 * sectionMix
                  + seed * 0.15;

    // ── BACKGROUND NEBULA ── turbulence over the ENTIRE frame, scrolling at a constant rate and
    //   parallaxing against the drifting core. This is what guarantees "no large motionless
    //   region": even the sky between the streamers is visibly moving in a silent room.
    vec2  bgp = uv0 * 2.3;
    float bn  = fbm2(bgp * 1.7 + vec2(churn * 0.55, -flow * 0.13));
    float bn2 = fbm2(bgp * 3.4 - vec2(flow * 0.21, churn * 0.30));
    float neb = pow(clamp(bn * 0.78 + bn2 * 0.46, 0.0, 1.0), 2.1);
    vec3  col = mix(vec3(0.012, 0.016, 0.048), vec3(0.034, 0.022, 0.082),
                    clamp(1.0 - r * 0.8, 0.0, 1.0));
    col += hsl2rgb(vec3(fract(hueBase + 0.54 + bn * 0.12), 0.78, 0.45))
         * neb * (0.245 + 0.30 * bass + 0.20 * lift);

    // ── STARS ── they come out in the dark. Strongest when quietGate is low (a genuinely quiet
    //   passage), washed out when the corona erupts, twinkling with the air band.
    vec2  cell = floor(scr * vec2(iResolution.x / iResolution.y, 1.0) * 150.0);
    float sh1 = ehash(cell + 11.3), sh2 = ehash(cell + 41.7);
    vec2  sfr = fract(scr * vec2(iResolution.x / iResolution.y, 1.0) * 150.0)
              - vec2(0.28 + 0.44 * sh1, 0.28 + 0.44 * sh2);
    float sd  = dot(sfr, sfr);
    float twk = 0.5 + 0.5 * sin(T * (1.1 + sh1 * 2.4) + sh2 * TAU);
    float star = step(0.962, sh1) * exp(-sd * 26.0) * (0.28 + 0.72 * twk);
    float night = 1.0 - clamp(gate * 0.7, 0.0, 0.8);
    col += vec3(0.80, 0.88, 1.0) * star * night * (0.85 + air * 0.7);

    // ── STREAMER FIELD ── sampled on the unit direction vector, so it is SEAMLESS around the
    //   circle (no atan branch cut). The radial term slides features OUTWARD along each ray as
    //   flow accumulates — a continuous scroll, no fract() teleport to window away — and the
    //   whole field rotates on `spin`, which is the motion you read first.
    float dens  = 4.6 + evoPlasma * 2.2 + seed3 * 2.0;
    vec2  nd    = dir * rot2(spin + (evoWarp - 0.5) * 0.4);
    vec2  q     = nd * (dens + r * 2.2 - flow * 0.85);
    float n1    = fbm(q);
    // TEXTURE family → fine filaments; wubDepth fattens the streamers when the bass wobbles.
    float fine  = fbm(q * 2.6 + vec2(7.3, flow * 0.9));
    // HARD SEPARATION between rays — the sky between streamers has to stay dark or a loud
    // section just floods the frame. smoothstep gives real gaps; pow adds the spike taper.
    float lo = 0.35 - wubDepth * gate * 0.07 - grit * 0.04;
    float sk = smoothstep(lo, 0.88, n1);
    float streak = pow(sk, 1.55) * (0.55 + 0.65 * fine);

    // ── TWO REACHES ── the LEVEL family, and the whole dynamic range of the piece. The rays now
    //   reach the CORNERS on a drop (rayReach ≈ 1.0 vs a frame radius of ~0.57 portrait) while
    //   staying a compact star when quiet. That contrast is the reactivity you see from the bar.
    float glowReach = 0.055 + 0.11 * bass + 0.06 * eng;
    float rayReach  = 0.26 + 0.85 * bass + 0.45 * eng + 0.22 * kick + 0.10 * body;

    float ct   = clamp(d / 0.62, 0.0, 1.0);                  // fixed-scale colour/depth coord
    float band = bandForDepth(ct) * gate;                    // treble near → bass far
    float rays = exp(-d / max(rayReach, 1e-3)) * streak;
    float glow = exp(-d / max(glowReach, 1e-3));             // tight halo hugging the limb
    float ring = exp(-d * 90.0);                             // the razor-thin pearly rim

    // AMPLITUDES ARE DELIBERATELY RESTRAINED. Every layer here stacks into the same exponential
    // exposure, and an early cut of 2.frag hit mean luma 212/255 on a sustained kick — a white
    // sheet with no structure left. Loud must read as SATURATED COLOUR, not as brightness.
    float rayAmp  = 0.74 + 0.56 * bass + 0.35 * lift + 0.42 * band;
    float glowAmp = 0.34 + 0.30 * air + 0.22 * lift;
    float rimAmp  = 0.60 + 0.55 * air;

    float sat = clamp(0.52 + 0.44 * ct, 0.0, 0.96);
    float lgt = clamp(0.62 - ct * 0.20, 0.16, 0.64);
    vec3  cCol = hsl2rgb(vec3(fract(hueBase + ct * 0.46), sat, lgt));
    vec3  warm = vec3(1.0, 0.90, 0.76);                      // the sun's own white-gold light

    // ── THE CORONA ITSELF ── chromatic spiky rays + a warm white-gold halo and rim at the limb.
    col += (cCol * rays * rayAmp * 1.9 + warm * glow * glowAmp + warm * ring * rimAmp) * outside;

    // ── SHOCK RINGS ── a continuous train travelling OUTWARD at a constant rate, so they are
    //   moving in total silence; their BRIGHTNESS detonates on the transient (amplitude only —
    //   a hit never moves a ring, it only lights it). This is the second thing a stranger reads.
    float ripple = pow(0.5 + 0.5 * sin((r * 5.5 - flow * 2.2) * TAU), 7.0);
    float ringAmp = 0.11 + 1.25 * kick + 0.45 * bass + 0.28 * lift;
    col += hsl2rgb(vec3(fract(hueBase + 0.30), 0.85, 0.62))
         * ripple * ringAmp * outside * exp(-d * 0.9);

    // ── PROMINENCES ── crimson tongues of plasma licking off the limb, driven by the MIDS. They
    //   reuse the streamer noise (free, and coherent with the rays that grow out of them).
    float prom = smoothstep(0.52, 0.84, n1) * exp(-d * 120.0) * outside;
    col += vec3(1.0, 0.16, 0.30) * prom * (0.35 + 2.4 * mids + 1.4 * kick);

    // ── BAILY'S BEADS ── sunlight through lunar valleys. One bead per angular cell, jittered by
    //   a per-device hash, each twinkling on its own offset of the monotonic flow and POPPING on
    //   the raw transient (amplitude only — the beads never move on a hit).
    float aNorm = atan(uv.y, uv.x) / TAU + 0.5;
    float NB = 13.0;
    float bi = floor(aNorm * NB);
    float bh = ehash(vec2(bi, 3.7) + seed3 * 13.0);
    float bcent = (bi + 0.32 + bh * 0.36) / NB;
    float bArc = (aNorm - bcent) * TAU * R;                 // arc-length offset along the limb
    float bd = bArc * bArc + ds * ds;
    float bph = fract(flow * 0.22 + bh);
    float twinkle = pow(0.5 + 0.5 * sin(bph * TAU), 5.0);
    float bead = exp(-bd * 3000.0) * (0.22 + twinkle * (0.55 + 3.6 * kick + 1.8 * air + 1.1 * artc));
    col += vec3(1.0, 0.96, 0.86) * bead * 1.7;

    // ── DIAMOND RING ── the jewel. Creeps around the limb on the same monotonic spin (audio
    //   changes the RATE, never the angle, so it never rocks backwards) and goes supernova on
    //   the kick with an anamorphic flare that streaks right across the frame.
    float dAng = spin * 1.6 + seed * TAU;
    vec2  dpt  = core + vec2(cos(dAng), sin(dAng)) * R;
    vec2  dv   = uvp - dpt;
    float dd   = dot(dv, dv);
    float blaze = 0.34 + 2.5 * kick + 1.0 * lift + 0.7 * artc;
    vec3  dCol  = mix(vec3(1.0, 0.98, 0.92), hsl2rgb(vec3(fract(hueBase + 0.08), 0.7, 0.75)), 0.35);
    col += dCol * exp(-dd * 2600.0) * blaze * 2.0;                                  // core
    col += dCol * exp(-abs(dv.y) * 190.0) * exp(-abs(dv.x) * 3.4) * blaze * 0.62;   // anamorphic streak
    col += dCol * exp(-abs(dv.x) * 240.0) * exp(-abs(dv.y) * 6.0) * blaze * 0.34;   // vertical spike

    // ── AFTERGLOW ── the previous frame sampled slightly INWARD and counter-rotated, so light
    //   streams outward off the limb AND swirls with the field. Retention is 0.91 * (1 - 0.52)
    //   = 0.44/frame → a real ~5-frame streak whose steady state is 0.92× the fresh image, so it
    //   can never accumulate to white.
    vec2 fuv  = (uv0 * 0.9915) * rot2(-0.0130);
    vec2 fscr = vec2(fuv.x * iResolution.y / iResolution.x, fuv.y) + 0.5;
    vec4 prev = getLastFrameColor(fscr);
    col = mix(prev.rgb * 0.87, col, 0.62);

    // ── THE MOON'S EDGE ── after the trail, so the limb stays a crisp dark-to-fire transition
    //   and the eclipse always reads.
    col *= smoothstep(R - aa * 1.5, R + aa * 0.5, r) * 0.82 + 0.18;

    // ── THE CORE, BURNING ── added AFTER the moon mask, or the mask would crush it. The disc is
    //   no longer a hole cut in the image: a plasma churns inside it at a constant rate, dark at
    //   the very centre (so it still reads ECLIPSE) and white-hot against the limb. Even the
    //   darkest region of the frame is in motion, and it detonates on the kick.
    float ir  = clamp(r / R, 0.0, 1.0);
    float en  = fbm2(uv * 9.0 + vec2(churn * 1.7, -flow * 0.55));
    float ember = smoothstep(0.20, 0.62, en) * pow(ir, 1.05);
    vec3  emberCol = mix(vec3(0.90, 0.10, 0.03), vec3(1.0, 0.48, 0.12), ember);
    float inside = 1.0 - outside;
    col += emberCol * ember * inside * (0.95 + 1.15 * bass + 1.3 * kick);
    col += vec3(1.0, 0.55, 0.22) * pow(ir, 3.6) * inside * (0.60 + 0.7 * lift);

    // ── EXPOSURE TONE-MAP ── a hard clamp() drives every over-1 channel to the same value and
    //   turns a loud section into a white sheet. An exponential exposure curve compresses each
    //   channel smoothly instead, so a blazing ray stays GOLD/VIOLET rather than going white.
    //   The kick term is a genuine full-frame EXPOSURE FLASH on the beat.
    col = 1.0 - exp(-max(col, 0.0) * (1.22 + bass * 0.20 + kick * 0.18));
    col = pow(clamp(col, 0.0, 1.0), vec3(0.90));

    // ── CHROMA RESTORE ── half a dozen additive layers of different hue SUM TOWARDS WHITE, and
    //   the exposure curve then flattens what's left, so a loud section drifted to a milky grey
    //   fog (measured: it did). Extrapolating away from luminance pulls the colour back, so the
    //   drop reads as violent MAGENTA/GOLD rather than as brightness. Costs nothing.
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = clamp(mix(vec3(lum), col, 1.38), 0.0, 1.0);

    col = mix(col, vec3(0.0), dot(sp, sp) * 0.05);           // minimal vignette
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
