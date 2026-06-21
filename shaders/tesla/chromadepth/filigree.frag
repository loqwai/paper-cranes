// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, fractal, kali, filigree, tesla
// ChromaDepth FILIGREE — the Kali fold (p = abs(p)/dot(p,p) - c) makes infinitely
// recursive lacework. Orbit-trap distances drive depth: tight orbits read red/near,
// far orbits read blue/violet/far. (Red=near, Green=mid, Blue/Violet=far.)
//
// TESLA / NO-MIC BUILD:
//   * Self-morphing: the Kali parameter wanders through beautiful configurations on
//     several incommensurate iTime LFOs (plus a very slow long-term drift so it keeps
//     exploring), with zoom/rotation/pan all drifting too — alive with NO audio.
//   * wavelet-ease springs ADD on top when audio is present (0 otherwise).
//   * Cheap: pure 2D, 10 fold iterations — light on a weak GPU.
//   Run: ?shader=tesla/chromadepth/filigree&wavelet=true&controller=wavelet-ease&fullscreen=true
// License: CC0

#define MAX_ITER 10
#define PHI 1.6180339887
#define SQ2 1.4142135624
#define SQ3 1.7320508076

// ── AUDIO (wavelet-ease outputs; declared by hand, 0 without mic) ──
uniform float waveletBassSpring;     // param push + brightness
uniform float waveletCentroidSpring; // param push (brightness trend)
uniform float waveletBand5Spring;    // treble → fine-detail shift
uniform float energySpring;          // loudness → zoom + glow

float morph(float rate, float ph) {
    return sin(iTime * rate + ph + sin(iTime * rate * 0.37 + ph) * 1.2);
}
vec2 rot(vec2 p, float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c) * p; }

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    return hsl2rgb(vec3(t * 0.82, 0.95 - t * 0.1, 0.55 - t * 0.12));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    float t = iTime * 0.03;

    // ── WANDERING KALI PARAMETERS (autonomous, no mic) ──
    // Sweet spots live roughly in 0.4..1.2; we orbit through them with incommensurate LFOs,
    // plus a very slow long-term drift so the journey never settles into one configuration.
    float slow = iTime * 0.004;
    vec3 kp;
    kp.x = 0.75 + 0.20 * sin(t) + 0.10 * cos(t * PHI * 0.6) + 0.08 * sin(slow * SQ2);
    kp.y = 0.85 + 0.15 * sin(t * 0.7 * PHI) + 0.10 * cos(t * 1.1) + 0.07 * cos(slow);
    kp.z = 0.65 + 0.18 * sin(t * 0.9) + 0.08 * cos(t * PHI * 0.8) + 0.06 * sin(slow * SQ3);
    // audio nudges the fold (0 without mic)
    kp.x += waveletBassSpring * 0.06;
    kp.y += waveletCentroidSpring * 0.06;
    kp.z += waveletBand5Spring * 0.04;
    kp = clamp(kp, vec3(0.3), vec3(1.4));

    // view transform — slow zoom breath + drift + rotation
    float zoom = 2.0 + 0.3 * morph(0.04, 0.0) - energySpring * 0.12;
    zoom = max(zoom, 1.0);
    uv = rot(uv, iTime * 0.02 + 0.2 * morph(0.015, 1.0));
    uv *= zoom;
    uv += vec2(0.05 * morph(0.018, 2.0), 0.04 * morph(0.021, 4.0));   // pan

    // ── KALI ITERATION with orbit traps ──
    vec3 p = vec3(uv, 0.5 + 0.25 * (0.5 + 0.5 * morph(0.03, 0.0)));
    float trapOrigin = 1e10, trapEdge = 1e10, accumGlow = 0.0, accumDepth = 0.0;
    vec3 p1 = p, p2 = p;
    for (int i = 0; i < MAX_ITER; i++) {
        p = abs(p);
        float d = max(dot(p, p), 0.001);
        p = p / d - kp;
        float dist = length(p);
        trapOrigin = min(trapOrigin, dist);
        trapEdge = min(trapEdge, min(abs(p.x), min(abs(p.y), abs(p.z))));
        float w = 1.0 / (1.0 + float(i) * 0.5);
        accumGlow += exp(-dist * 4.0) * w;
        accumDepth += dist * w;
        if (i == 1) p1 = p;
        if (i == 3) p2 = p;
    }

    // ── depth from orbit traps: tight = red/near, far = blue/far ──
    float tOrigin = clamp(trapOrigin * 0.8, 0.0, 1.0);
    float tEdge = clamp(trapEdge * 2.0, 0.0, 1.0);
    float tGlow = clamp(accumGlow * 0.4, 0.0, 1.0);
    float tAvg = clamp(accumDepth / float(MAX_ITER) * 0.3, 0.0, 1.0);
    float depth = tOrigin * 0.2 + tEdge * 0.15 + (1.0 - tGlow) * 0.35 + tAvg * 0.3;
    depth = smoothstep(0.05, 0.95, depth);
    depth = clamp(depth + 0.03 * morph(0.05, 0.0), 0.0, 1.0);

    vec3 col = chromadepth(depth);

    // brightness from fold structure
    float foldGlow = clamp(accumGlow * 0.6, 0.0, 1.0);
    float edgeBright = exp(-tEdge * 6.0) * 0.4;
    float brightness = clamp(0.45 + foldGlow * 0.35 + edgeBright + energySpring * 0.1, 0.1, 1.0);
    col *= brightness;

    // ── feedback in Oklab (perceptually smooth), warped by early orbit positions ──
    float fbStrength = 0.04;
    vec2 orbitWarp = vec2(p1.x * 0.015 + p2.y * 0.008, p1.y * 0.015 - p2.x * 0.008) * fbStrength;
    vec2 fbUV = clamp(rot(screenUV - 0.5, iTime * 0.008) + 0.5 + orbitWarp, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    vec3 colOk = rgb2oklab(col), prevOk = rgb2oklab(prev);
    prevOk.x *= 0.96; prevOk.yz *= 0.98;       // decay luminance + slight chroma
    vec3 blended = mix(prevOk, colOk, 0.72);
    // keep chroma alive so the filigree never greys out
    if (length(blended.yz) < length(colOk.yz) * 0.6) blended.yz = mix(blended.yz, colOk.yz, 0.35);
    col = oklab2rgb(blended);

    // vignette
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
