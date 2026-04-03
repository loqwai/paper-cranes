// @fullscreen: true
// @mobile: true
// @tags: cat, cute, character, orange, ambient
// Orange tabby cat — drawn with SDFs, slowly animated in non-repeating cycles

#define PI 3.14159265
#define PHI 1.61803398
#define SQRT2 1.41421356
#define SQRT3 1.73205080

// Irrational-ratio time orbits — never repeat
#define OA (iTime * 0.031 * PHI)
#define OB (iTime * 0.023 * SQRT2)
#define OC (iTime * 0.017 * SQRT3)
#define OD (iTime * 0.011)
#define OE (iTime * 0.007 * PHI * SQRT2)

// ============================================================================
// SLOWLY ANIMATED PARAMETERS (non-repeating multi-frequency oscillators)
// ============================================================================

// Pupils: round but iris still visible — slowly breathe
#define PUPIL_W (0.020 + (sin(OA) * 0.5 + 0.5) * (sin(OB * 1.3) * 0.5 + 0.5) * 0.010)

// Ear flick: rare, asymmetric twitches
#define EAR_WIGGLE (sin(OC * 2.1) * sin(OD * 3.7) * 0.022)

// Whisker sway: slow independent drift
#define WHISKER_SWAY (sin(OB * 0.8 + 1.0) * sin(OE * 1.5) * 0.038)

// Fur lightness: light peachy-golden, breathes slowly
#define FUR_L (0.68 + sin(OA * 0.7) * 0.07 + sin(OD * 1.1) * 0.03)

// Glow: slow subtle pulse
#define GLOW (0.08 + sin(OB * 0.6) * 0.04 + sin(OC * 0.9) * 0.02)

// Hue drift: very slow orange warmth wander
#define HUE_SHIFT (sin(OD * 0.4) * 0.025 + sin(OE * 0.7) * 0.012)

// Eye openness: occasional slow blink, mostly open
#define EYE_H (0.82 + sin(OC * 0.5) * 0.10 + smoothstep(0.92, 1.0, sin(OA * 2.3)) * (-0.70))

// Eye hue: warm amber/hazel — barely drifts
#define EYE_HUE (0.075 + sin(OE * 0.5) * 0.012 + sin(OB * 0.3) * 0.006)

// Gentle breathing bob
#define HEAD_BOB (sin(OD * 1.8) * 0.007 + sin(OC * 2.5) * 0.003)

// ============================================================================
// SDF HELPERS
// ============================================================================

float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdEllipse(vec2 p, vec2 r) {
    return (length(p / r) - 1.0) * min(r.x, r.y);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

float sdTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 e0 = b-a, e1 = c-b, e2 = a-c;
    vec2 v0 = p-a, v1 = p-b, v2 = p-c;
    vec2 pq0 = v0 - e0*clamp(dot(v0,e0)/dot(e0,e0),0.0,1.0);
    vec2 pq1 = v1 - e1*clamp(dot(v1,e1)/dot(e1,e1),0.0,1.0);
    vec2 pq2 = v2 - e2*clamp(dot(v2,e2)/dot(e2,e2),0.0,1.0);
    float s = sign(e0.x*e2.y - e0.y*e2.x);
    vec2 d = min(min(
        vec2(dot(pq0,pq0), s*(v0.x*e0.y - v0.y*e0.x)),
        vec2(dot(pq1,pq1), s*(v1.x*e1.y - v1.y*e1.x))),
        vec2(dot(pq2,pq2), s*(v2.x*e2.y - v2.y*e2.x)));
    return -sqrt(d.x) * sign(d.y);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - iResolution.xy * 0.5) / iResolution.y;
    float t = iTime;

    uv.y -= HEAD_BOB;

    // Scale up to fill frame; slightly widen face
    uv /= 1.32;
    uv.x *= 0.88;

    float baseHue = 0.073 + HUE_SHIFT; // golden-peach orange

    // =========================================================================
    // CAT GEOMETRY — SDFs
    // =========================================================================

    // Head
    float head = sdCircle(uv, 0.27);

    // Outer ears (triangles)
    float wig = EAR_WIGGLE;
    float earL = sdTriangle(uv,
        vec2(-0.27, 0.13),
        vec2(-0.06, 0.21),
        vec2(-0.19 + wig, 0.44));
    float earR = sdTriangle(uv,
        vec2( 0.27, 0.13),
        vec2( 0.06, 0.21),
        vec2( 0.19 - wig, 0.44));
    float ears = min(earL, earR);

    // Inner ears (pink, tighter — just a small triangle inset)
    float iEarL = sdTriangle(uv,
        vec2(-0.23, 0.18),
        vec2(-0.13, 0.23),
        vec2(-0.19 + wig, 0.34));
    float iEarR = sdTriangle(uv,
        vec2( 0.23, 0.18),
        vec2( 0.13, 0.23),
        vec2( 0.19 - wig, 0.34));
    float innerEars = min(iEarL, iEarR);

    // Eyes — wide-set and high on the face
    float eyeOpen = EYE_H;
    vec2 eyeLp = vec2(-0.118, 0.078);
    vec2 eyeRp = vec2( 0.118, 0.078);
    float eW = 0.072, eH = 0.066 * eyeOpen;
    float eyeL = sdEllipse(uv - eyeLp, vec2(eW, eH));
    float eyeR = sdEllipse(uv - eyeRp, vec2(eW, eH));
    float eyes = min(eyeL, eyeR);

    // Pupils — round (not slit), nearly fills the iris
    float pW = PUPIL_W;
    float pH = pW * 1.1 * eyeOpen;
    float pupL = sdEllipse(uv - eyeLp, vec2(pW, pH));
    float pupR = sdEllipse(uv - eyeRp, vec2(pW, pH));
    float pupils = min(pupL, pupR);

    // Specular shine in each eye
    float shineL = sdCircle(uv - eyeLp - vec2(-0.021, 0.016), 0.009);
    float shineR = sdCircle(uv - eyeRp - vec2(-0.021, 0.016), 0.009);
    float shines = min(shineL, shineR);

    // Nose (small salmon oval — subtle)
    vec2 noseP = vec2(0.0, -0.088);
    float nose = sdEllipse(uv - noseP, vec2(0.018, 0.013));

    // Mouth: center drop + two side curves
    float mC  = sdSegment(uv, noseP - vec2(0.0, 0.018), vec2(0.0, -0.105));
    float mL  = sdSegment(uv, vec2(-0.002, -0.105), vec2(-0.052, -0.130));
    float mR  = sdSegment(uv, vec2( 0.002, -0.105), vec2( 0.052, -0.130));
    float mouth = min(mC, min(mL, mR));

    // Whiskers — 3 per side, tips drift with spectral flux
    float sway = WHISKER_SWAY * sin(t * 1.7 + 0.5);
    float wL1 = sdSegment(uv, vec2(-0.058, -0.052), vec2(-0.35, -0.025 + sway));
    float wL2 = sdSegment(uv, vec2(-0.058, -0.082), vec2(-0.35, -0.082));
    float wL3 = sdSegment(uv, vec2(-0.058, -0.112), vec2(-0.35, -0.142 - sway));
    float wR1 = sdSegment(uv, vec2( 0.058, -0.052), vec2( 0.35, -0.025 - sway));
    float wR2 = sdSegment(uv, vec2( 0.058, -0.082), vec2( 0.35, -0.082));
    float wR3 = sdSegment(uv, vec2( 0.058, -0.112), vec2( 0.35, -0.142 + sway));
    float whiskers = min(min(wL1, wL2), min(min(wL3, wR1), min(wR2, wR3)));

    // Combined fur body
    float body = min(head, ears);

    float aa = 0.007;

    // =========================================================================
    // TABBY DAPPLE PATTERN — subtle spots, not bold stripes
    // =========================================================================

    // Value noise for soft organic blobs
    vec2 np = uv * 7.0;
    vec2 ni = floor(np), nf = fract(np);
    nf = nf * nf * (3.0 - 2.0 * nf);
    vec2 n4 = ni + vec2(0,1);
    float va = fract(sin(dot(ni,            vec2(127.1,311.7))) * 43758.5);
    float vb = fract(sin(dot(ni+vec2(1,0),  vec2(127.1,311.7))) * 43758.5);
    float vc = fract(sin(dot(n4,            vec2(127.1,311.7))) * 43758.5);
    float vd = fract(sin(dot(n4+vec2(1,0),  vec2(127.1,311.7))) * 43758.5);
    float blob = mix(mix(va,vb,nf.x), mix(vc,vd,nf.x), nf.y);

    // Second octave for finer detail
    vec2 np2 = uv * 14.0 + 3.7;
    vec2 ni2 = floor(np2), nf2 = fract(np2);
    nf2 = nf2*nf2*(3.0-2.0*nf2);
    vec2 n42 = ni2+vec2(0,1);
    float va2 = fract(sin(dot(ni2,           vec2(269.5,183.3)))*43758.5);
    float vb2 = fract(sin(dot(ni2+vec2(1,0), vec2(269.5,183.3)))*43758.5);
    float vc2 = fract(sin(dot(n42,           vec2(269.5,183.3)))*43758.5);
    float vd2 = fract(sin(dot(n42+vec2(1,0), vec2(269.5,183.3)))*43758.5);
    float blob2 = mix(mix(va2,vb2,nf2.x), mix(vc2,vd2,nf2.x), nf2.y);

    float stripe = smoothstep(0.38, 0.58, blob * 0.6 + blob2 * 0.4) * 0.6;

    // Darker patches around eyes + forehead spots
    float eyeRingL = exp(-length((uv - eyeLp) / vec2(0.14, 0.11)) * 2.5);
    float eyeRingR = exp(-length((uv - eyeRp) / vec2(0.14, 0.11)) * 2.5);
    // Forehead dapple spots (between eyes and ears)
    float spot1 = exp(-length(uv - vec2(-0.07, 0.17)) * 14.0) * 0.6;
    float spot2 = exp(-length(uv - vec2( 0.07, 0.17)) * 14.0) * 0.6;
    float spot3 = exp(-length(uv - vec2( 0.00, 0.21)) * 12.0) * 0.5;
    float spot4 = exp(-length(uv - vec2(-0.13, 0.13)) * 12.0) * 0.5;
    float spot5 = exp(-length(uv - vec2( 0.13, 0.13)) * 12.0) * 0.5;
    float mMark = clamp((eyeRingL + eyeRingR) * 0.40 + spot1 + spot2 + spot3 + spot4 + spot5, 0.0, 0.45)
                  * smoothstep(aa, -aa, head);

    // =========================================================================
    // COLORS
    // =========================================================================

    // Background: deep warm dark
    vec3 bg = hsl2rgb(vec3(0.08, 0.35, 0.05));
    bg = mix(bg, hsl2rgb(vec3(0.75, 0.25, 0.08)), 0.35 - uv.y * 0.4);

    // Fur: light peachy-golden base, subtle warm-brown dappling
    vec3 furBase  = hsl2rgb(vec3(baseHue,        0.72, FUR_L));
    vec3 furDark  = hsl2rgb(vec3(baseHue - 0.01, 0.65, FUR_L - 0.20));

    vec3 fur = mix(furBase, furDark, stripe * 0.55);  // more visible dapple
    fur = mix(fur, furDark * 0.82, mMark);             // soft eye-shadow patches

    // Prominent cheek puffs (whisker pad area) — round lighter patches
    float cheekL = exp(-length((uv - vec2(-0.105, -0.038)) / vec2(0.075, 0.060)) * 2.2);
    float cheekR = exp(-length((uv - vec2( 0.105, -0.038)) / vec2(0.075, 0.060)) * 2.2);
    float cheeks = clamp(cheekL + cheekR, 0.0, 0.7);
    fur = mix(fur, vec3(0.97, 0.95, 0.92), cheeks * 0.55);

    // White chin below nose — subtle
    float whitePatch = smoothstep(0.0, 0.08, -(uv.y + 0.12)) * (1.0 - smoothstep(0.02, 0.10, abs(uv.x)));
    fur = mix(fur, vec3(0.95, 0.93, 0.90), clamp(whitePatch, 0.0, 0.55));

    // =========================================================================
    // COMPOSITE LAYERS
    // =========================================================================

    // Warm glow outside cat (added to bg before body covers it)
    float glowDist = max(0.0, body);
    vec3 glowCol = hsl2rgb(vec3(baseHue, 0.95, 0.58));
    bg += glowCol * exp(-glowDist * 11.0) * GLOW;

    vec3 col = bg;

    // Fur body
    col = mix(col, fur, smoothstep(aa, -aa, body));

    // Pink inner ears
    vec3 earPink = hsl2rgb(vec3(0.95, 0.72, 0.78));
    col = mix(col, earPink, smoothstep(aa, -aa, innerEars));

    // Eyes — warm amber/hazel iris
    vec3 eyeCol = hsl2rgb(vec3(EYE_HUE, 0.55, 0.36));
    col = mix(col, eyeCol, smoothstep(aa, -aa, eyes));

    // Pupils
    col = mix(col, vec3(0.03, 0.02, 0.03), smoothstep(aa, -aa, pupils));

    // Shine
    col = mix(col, vec3(1.0), smoothstep(aa * 0.6, -aa * 0.6, shines) * 0.95);

    // Nose
    vec3 nosePink = hsl2rgb(vec3(0.96, 0.45, 0.62));
    col = mix(col, nosePink, smoothstep(aa, -aa, nose));

    // Mouth lines
    col = mix(col, hsl2rgb(vec3(baseHue - 0.01, 0.55, 0.22)), smoothstep(0.005, -0.001, mouth));

    // Whiskers (on top of everything)
    col = mix(col, vec3(0.97, 0.95, 0.93), smoothstep(0.0045, 0.0, whiskers - 0.0025));

    // =========================================================================
    // FINISHING
    // =========================================================================

    // Vignette
    float vign = 1.0 - pow(length(uv) * 0.52, 2.3);
    col *= max(vign, 0.0);

    // Gentle feedback — enough for glow trails without blurring features
    vec2 fbUV = fragCoord.xy / iResolution.xy;
    vec3 prev = getLastFrameColor(fbUV).rgb;
    col = mix(prev * 0.75, col, 0.82);

    fragColor = vec4(col, 1.0);
}
