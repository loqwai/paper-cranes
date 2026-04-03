// @fullscreen: true
// @mobile: false
// @tags: cat, cute, character, orange, orbit, music
// Orange tabby cat with many little cats orbiting the main head

#define PI     3.14159265
#define TWO_PI 6.28318530
#define PHI    1.61803398
#define SQRT2  1.41421356
#define SQRT3  1.73205080

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Bass breathes orbit radius — normalized, not zScore
#define ORBIT_PULSE (1.0 + (bassNormalized - 0.5) * 0.18)
// #define ORBIT_PULSE 1.0

// Spectral flux speeds up rotation — slope-gated for confident bursts
#define SPEED_MOD (1.0 + spectralFluxNormalized * 0.10 + spectralFluxSlope * spectralFluxRSquared * 0.3)
// #define SPEED_MOD 1.0

// Energy drives overall brightness — normalized, smooth
#define BRIGHT (0.88 + (energyNormalized - 0.5) * 0.20)
// #define BRIGHT 0.88

// Beat: all cats snap-scale and flash
#define BEAT_POP (beat ? 1.10 : 1.0)
// #define BEAT_POP 1.0

// Glow: energy fills in the halos
#define GLOW (0.05 + energyNormalized * 0.18)
// #define GLOW 0.09

// Treble: shimmer on fur surface — normalized, not zScore
#define SHIMMER (trebleNormalized * 0.06)
// #define SHIMMER 0.0

// Spectral centroid: hue drift — brightening centroid = slightly warmer cats
#define HUE_DRIFT (spectralCentroidNormalized * 0.025 - 0.012)
// #define HUE_DRIFT 0.0

// Mids: inner ring scale — normalized, not zScore
#define INNER_SCALE_MOD (1.0 + (midsNormalized - 0.5) * 0.10)
// #define INNER_SCALE_MOD 1.0

// Pitch class: slowly rotates the orbital phase offset
#define PITCH_TWIST (pitchClassNormalized * 0.4)
// #define PITCH_TWIST 0.0

// Energy slope + rSquared: confident builds make cats grow
#define BUILD_SCALE (1.0 + energySlope * energyRSquared * 0.8)
// #define BUILD_SCALE 1.0

// Drop detection: energy dropping = cats contract inward
#define IS_DROP clamp(-energySlope * energyRSquared * 6.0, 0.0, 1.0)

#define OUTER_N 8
#define INNER_N 6

// ============================================================================
// SDF HELPERS
// ============================================================================

float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdEllipse(vec2 p, vec2 r) {
    return (length(p / max(r, vec2(0.001))) - 1.0) * min(r.x, r.y);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p-a, ba = b-a;
    return length(pa - ba * clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0));
}

float sdTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 e0=b-a, e1=c-b, e2=a-c;
    vec2 v0=p-a, v1=p-b, v2=p-c;
    vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);
    vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);
    vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
    float s=sign(e0.x*e2.y-e0.y*e2.x);
    vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),
                   vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),
                   vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
    return -sqrt(d.x)*sign(d.y);
}

// ============================================================================
// DRAW CAT — local coordinates (head centered at origin, radius ~0.27)
// seed [0,1]: per-cat phase offset for staggered animation
// Returns vec4(color, alpha) — alpha covers body + whiskers
// ============================================================================

vec4 drawCat(vec2 p, float seed) {
    float aa   = 0.008;
    float t    = iTime;
    float ph   = seed * TWO_PI;

    // --- AUDIO AS PHASE BIAS ---
    // Each feature shifts the *phase* of a time oscillator rather than just scaling amplitude.
    // This creates constructive/destructive interference that tracks the music subtly.
    float entropyBias  = spectralEntropyNormalized * PI;          // chaos → alert eyes
    float fluxBias     = spectralFluxNormalized * TWO_PI * 0.7;   // timbral change → ear twitch
    float pitchBias    = pitchClassNormalized * TWO_PI;            // note → whisker angle + hue
    float centroidBias = spectralCentroidNormalized * PI * 0.8;   // brightness → fur lightness

    // Eye openness: entropy bias shifts blink cycle phase (chaotic music = alert eyes).
    // Use slope-gated energy for confident build/drop openness — not raw zScore.
    float eyeOpen = 0.82 + sin(t * 0.017 * SQRT3 + ph + entropyBias) * 0.09
                         + smoothstep(0.90, 1.0, sin(t * 0.031 * PHI * 2.3 + ph + entropyBias * 0.5)) * (-0.68)
                         + energySlope * energyRSquared * 0.18;  // confident builds open eyes

    // Pupils: bass dilates; bright centroid constricts (like pupils in bright light).
    // Use normalized values — smooth, not spiky.
    float pupW = (beat ? 0.042 : 0.020 + bassNormalized * 0.012)
               + sin(t * 0.031 * PHI + ph) * sin(t * 0.023 * SQRT2 * 1.3 + ph) * 0.004 + 0.002
               + (0.5 - spectralCentroidNormalized) * 0.010;  // bright = smaller pupils

    // Ears: flux biases phase AND amplitude — timbral transitions = ear twitches.
    float earAmp = 0.022 + spectralFluxNormalized * 0.030;
    float earWig = sin(t * 0.017 * SQRT3 * 2.1 + ph + fluxBias)
                 * sin(t * 0.011 * 3.7       + ph + fluxBias * 0.6) * earAmp;

    // Hue: pitchClass shifts hue — chord changes shift each cat's color slightly.
    float baseHue = 0.073 + HUE_DRIFT
                          + pitchClassNormalized * 0.040 - 0.020
                          + sin(t * 0.007 * PHI * SQRT2 * 0.4 + ph) * 0.018
                          + seed * 0.035 - 0.017;

    // Fur lightness: centroid biases oscillator + normalized offset (no zScore jitter).
    float furL = 0.68 + sin(t * 0.031 * PHI * 0.7 + ph + centroidBias) * 0.06
                      + (spectralCentroidNormalized - 0.5) * 0.08;

    // Whiskers: pitchClass biases phase — different notes = different sway angles.
    // Roughness drives amplitude — gritty music = wild whiskers.
    float sway = sin(t * 0.023 * SQRT2 * 0.8 + ph + 1.0 + pitchBias * 0.4)
               * sin(t * 0.007 * PHI * SQRT2 * 1.5 + ph + pitchBias * 0.25)
               * (0.034 + spectralRoughnessNormalized * 0.028);

    // Eye iris hue: centroid shifts warmer/cooler with music brightness.
    float eyeHue = 0.075 + seed * 0.04 + spectralCentroidNormalized * 0.035 - 0.017;

    // --- SDFs ---
    float head   = sdCircle(p, 0.27);
    float earL   = sdTriangle(p, vec2(-0.27,0.13), vec2(-0.06,0.21), vec2(-0.19+earWig, 0.44));
    float earR   = sdTriangle(p, vec2( 0.27,0.13), vec2( 0.06,0.21), vec2( 0.19-earWig, 0.44));
    float ears   = min(earL, earR);
    float iEarL  = sdTriangle(p, vec2(-0.23,0.18), vec2(-0.13,0.23), vec2(-0.19+earWig, 0.34));
    float iEarR  = sdTriangle(p, vec2( 0.23,0.18), vec2( 0.13,0.23), vec2( 0.19-earWig, 0.34));
    float innerEars = min(iEarL, iEarR);

    vec2 eyeLp = vec2(-0.118, 0.078);
    vec2 eyeRp = vec2( 0.118, 0.078);
    float eW=0.072, eH=0.066*eyeOpen;
    float eyes   = min(sdEllipse(p-eyeLp, vec2(eW,eH)), sdEllipse(p-eyeRp, vec2(eW,eH)));
    float pupils = min(sdEllipse(p-eyeLp, vec2(pupW, pupW*1.1*eyeOpen)),
                       sdEllipse(p-eyeRp, vec2(pupW, pupW*1.1*eyeOpen)));
    float shines = min(sdCircle(p-eyeLp-vec2(-0.021,0.016), 0.009),
                       sdCircle(p-eyeRp-vec2(-0.021,0.016), 0.009));

    vec2  noseP = vec2(0.0, -0.095);
    float nose  = sdEllipse(p-noseP, vec2(0.040, 0.028));

    // Nostrils — dark ovals at the bottom of the nose
    float nostrilL = sdEllipse(p-noseP-vec2(-0.014,-0.010), vec2(0.009,0.007));
    float nostrilR = sdEllipse(p-noseP-vec2( 0.014,-0.010), vec2(0.009,0.007));
    float nostrils = min(nostrilL, nostrilR);

    float mC = sdSegment(p, noseP+vec2(0.0,-0.028), vec2(0.0,-0.140));
    float mL = sdSegment(p, vec2(-0.002,-0.140), vec2(-0.052,-0.162));
    float mR = sdSegment(p, vec2( 0.002,-0.140), vec2( 0.052,-0.162));
    float mouth = min(mC, min(mL, mR));

    float wL1=sdSegment(p,vec2(-0.058,-0.052),vec2(-0.35,-0.025+sway));
    float wL2=sdSegment(p,vec2(-0.058,-0.082),vec2(-0.35,-0.082));
    float wL3=sdSegment(p,vec2(-0.058,-0.112),vec2(-0.35,-0.142-sway));
    float wR1=sdSegment(p,vec2( 0.058,-0.052),vec2( 0.35,-0.025-sway));
    float wR2=sdSegment(p,vec2( 0.058,-0.082),vec2( 0.35,-0.082));
    float wR3=sdSegment(p,vec2( 0.058,-0.112),vec2( 0.35,-0.142+sway));
    float whiskers = min(min(wL1,wL2), min(min(wL3,wR1), min(wR2,wR3)));

    float body = min(head, ears);

    // --- Dapple noise ---
    vec2 np=p*7.0, ni=floor(np), nf=fract(np);
    nf=nf*nf*(3.0-2.0*nf);
    float va=fract(sin(dot(ni,           vec2(127.1,311.7)))*43758.5);
    float vb=fract(sin(dot(ni+vec2(1,0), vec2(127.1,311.7)))*43758.5);
    float vc=fract(sin(dot(ni+vec2(0,1), vec2(127.1,311.7)))*43758.5);
    float vd=fract(sin(dot(ni+vec2(1,1), vec2(127.1,311.7)))*43758.5);
    float stripe = smoothstep(0.38,0.58, mix(mix(va,vb,nf.x),mix(vc,vd,nf.x),nf.y)) * 0.6;

    // Eye shadow patches
    float rl=exp(-length((p-eyeLp)/vec2(0.14,0.11))*2.5);
    float rr=exp(-length((p-eyeRp)/vec2(0.14,0.11))*2.5);
    float spots = exp(-length(p-vec2(-0.07,0.17))*14.0)*0.6
                + exp(-length(p-vec2( 0.07,0.17))*14.0)*0.6
                + exp(-length(p-vec2( 0.00,0.21))*12.0)*0.5
                + exp(-length(p-vec2(-0.13,0.13))*12.0)*0.5
                + exp(-length(p-vec2( 0.13,0.13))*12.0)*0.5;
    float mMark = clamp((rl+rr)*0.40 + spots, 0.0, 0.45) * smoothstep(aa,-aa,head);

    // --- Fur color (treble adds shimmer flicker) ---
    float shimmerFlicker = sin(p.x * 38.0 + t * 3.1) * sin(p.y * 32.0 - t * 2.3);
    vec3 furBase = hsl2rgb(vec3(baseHue,      0.72, furL + shimmerFlicker * SHIMMER));
    vec3 furDark  = hsl2rgb(vec3(baseHue-0.01,0.65, furL-0.20));
    vec3 fur = mix(furBase, furDark, stripe*0.55);
    fur = mix(fur, furDark*0.82, mMark);

    float cL=exp(-length((p-vec2(-0.105,-0.038))/vec2(0.075,0.060))*2.2);
    float cR=exp(-length((p-vec2( 0.105,-0.038))/vec2(0.075,0.060))*2.2);
    fur = mix(fur, vec3(0.97,0.95,0.92), clamp(cL+cR,0.0,0.7)*0.55);

    float wp = smoothstep(0.0,0.08,-(p.y+0.12))*(1.0-smoothstep(0.02,0.10,abs(p.x)));
    fur = mix(fur, vec3(0.95,0.93,0.90), clamp(wp,0.0,0.55));

    // --- Composite features ---
    vec3 col = fur;
    col = mix(col, hsl2rgb(vec3(0.95,0.72,0.78)),  smoothstep(aa,-aa,innerEars));
    col = mix(col, hsl2rgb(vec3(eyeHue, 0.55, 0.36)), smoothstep(aa,-aa,eyes));
    col = mix(col, vec3(0.03,0.02,0.03),             smoothstep(aa,-aa,pupils));
    col = mix(col, vec3(1.0),                         smoothstep(aa*0.6,-aa*0.6,shines)*0.95);
    col = mix(col, hsl2rgb(vec3(0.02,0.62,0.38)),     smoothstep(aa,-aa,nose));
    col = mix(col, vec3(0.10,0.05,0.03),              smoothstep(aa*0.5,-aa*0.5,nostrils));
    col = mix(col, hsl2rgb(vec3(baseHue-0.01,0.5,0.22)), smoothstep(0.005,-0.001,mouth));
    col = mix(col, vec3(0.97,0.95,0.93),             smoothstep(0.0045,0.0,whiskers-0.0025));

    float alpha = max(smoothstep(aa,-aa,body), smoothstep(0.004,0.0,whiskers-0.003));
    return vec4(col, alpha);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - iResolution.xy * 0.5) / iResolution.y;
    float t  = iTime;

    float pulse    = ORBIT_PULSE * BUILD_SCALE * mix(1.0, 0.88, IS_DROP);
    float outerRx  = 0.65 * pulse;
    float outerRy  = 0.40 * pulse;
    float innerRx  = 0.40 * pulse;
    float innerRy  = 0.26 * pulse;
    float outerSpd = 0.014 * SPEED_MOD;
    float innerSpd = 0.022 * SPEED_MOD;

    // --- Background: dark warm gradient ---
    vec3 bg = hsl2rgb(vec3(0.073, 0.30, 0.05));
    bg = mix(bg, hsl2rgb(vec3(0.73, 0.20, 0.08)), 0.3 - uv.y * 0.4);

    // Soft warm center glow
    bg += hsl2rgb(vec3(0.073, 0.95, 0.55)) * exp(-length(uv)*1.8) * GLOW;

    vec3 col = bg;

    // --- Outer ring: 8 cats on an elliptical orbit with slight wobble ---
    for (int i = 0; i < OUTER_N; i++) {
        float fi    = float(i);
        float angle = fi / float(OUTER_N) * TWO_PI + t * outerSpd + PITCH_TWIST;
        // Slow wobble — no audio phase bias here, just time-based drift
        float wobX  = sin(angle * 2.0 + t * 0.11) * 0.035;
        float wobY  = cos(angle * 3.0 - t * 0.09) * 0.025;
        vec2  pos   = vec2(cos(angle)*outerRx + wobX, sin(angle)*outerRy + wobY);
        float scale = 0.20;
        float seed  = fi / float(OUTER_N);

        // Bounding check: skip if this pixel is too far from the cat
        if (length(uv - pos) > scale * 0.60) continue;

        vec4 cat = drawCat((uv - pos) / scale, seed);
        cat.rgb *= BRIGHT * (0.80 + 0.20 * sin(t * 0.8 + fi * 1.1));
        col = mix(col, cat.rgb, cat.a);

        // Soft halo around each mini cat
        float halo = exp(-max(0.0, length(uv-pos) - scale*0.28) * 18.0) * GLOW * 0.4;
        col += hsl2rgb(vec3(0.073, 0.9, 0.6)) * halo;
    }

    // --- Inner ring: 6 cats, counter-rotating, slightly offset phase ---
    for (int i = 0; i < INNER_N; i++) {
        float fi    = float(i);
        float angle = fi / float(INNER_N) * TWO_PI - t * innerSpd + PI / float(INNER_N) + PITCH_TWIST;
        // Slow wobble — time-based only, no audio phase bias
        float wobX  = sin(angle * 3.0 + t * 0.13) * 0.020;
        float wobY  = cos(angle * 2.0 - t * 0.10) * 0.016;
        vec2  pos   = vec2(cos(angle)*innerRx + wobX, sin(angle)*innerRy + wobY);
        float scale = 0.14 * INNER_SCALE_MOD;
        float seed  = fi / float(INNER_N) + 0.5;

        if (length(uv - pos) > scale * 0.60) continue;

        vec4 cat = drawCat((uv - pos) / scale, seed);
        cat.rgb *= BRIGHT * 0.92;
        col = mix(col, cat.rgb, cat.a);
    }

    // --- Main central cat (grows with energy build, contracts on drop) ---
    {
        float mainScale = 0.60 * BUILD_SCALE * mix(1.0, 0.90, IS_DROP);
        vec2 lp = uv / mainScale;
        vec4 mainCat = drawCat(lp, 0.0);
        mainCat.rgb *= BRIGHT;
        col = mix(col, mainCat.rgb, mainCat.a);
    }

    col *= BEAT_POP;

    // --- Subtronics-style warped feedback ---
    vec2 fbUV = fragCoord.xy / iResolution.xy;
    vec2 fbCenter = vec2(0.5);

    // Slow zoom toward center (cats leave trailing afterimages).
    // Energy builds make it zoom faster, drops reverse slightly.
    float zoomFB = 1.0 - 0.003 - energySlope * energyRSquared * 0.004;
    vec2 warpUV = (fbUV - fbCenter) * zoomFB + fbCenter;

    // Bass-driven radial ripple on the feedback sample UV.
    // Use normalized bass (smooth) rather than zScore to avoid sudden pops.
    vec2 delta = fbUV - fbCenter;
    float ripple = sin(length(delta) * 28.0 - iTime * 4.0) * bassNormalized * 0.004;
    warpUV += normalize(delta + vec2(0.0001)) * ripple;

    // Beat: add a brief rotation smear on the prev frame.
    float beatRot = beat ? 0.018 : 0.0;
    float cosR = cos(beatRot), sinR = sin(beatRot);
    vec2 rotDelta = warpUV - fbCenter;
    warpUV = vec2(rotDelta.x*cosR - rotDelta.y*sinR,
                  rotDelta.x*sinR + rotDelta.y*cosR) + fbCenter;

    vec3 prev = getLastFrameColor(fract(warpUV)).rgb;

    // Hue-rotate the prev frame trails by pitchClass + spectralFlux slope.
    // Chord changes and timbral bursts shift trail colors, making history
    // look like a psychedelic comet tail.
    vec3 prevHSL = rgb2hsl(prev);
    prevHSL.x = fract(prevHSL.x
                    + pitchClassNormalized * 0.004
                    + spectralFluxSlope * spectralFluxRSquared * 0.012);
    prevHSL.y = clamp(prevHSL.y * 1.03, 0.0, 1.0); // trails stay vivid
    prev = hsl2rgb(prevHSL);

    col = mix(prev * 0.80, col, 0.86);

    // --- Vignette ---
    float vign = 1.0 - pow(length(uv) * 0.48, 2.2);
    col *= max(vign, 0.0);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
