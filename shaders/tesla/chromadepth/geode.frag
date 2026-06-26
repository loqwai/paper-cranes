// @fullscreen: true
//https://visuals.beadfamous.com/?shader=tesla/chromadepth/geode&wavelet=true&controller=wavelet-ease&fullscreen=true
// @mobile: true
// @favorite: true
// @tags: chromadepth, 3d, geode, icosahedron, crystal, geometric, tesla
// ChromaDepth GEODE — nested icosahedral crystal shells with triangular faceting.
// Outer shell = red/near, inner shells = green → blue/violet (far). You orbit outside
// and look through the gaps between shells. (Red=near, Green=mid, Blue/Violet=far.)
//
// TESLA / NO-MIC BUILD:
//   * Self-morphing: shell breathing, faceting frequency, gap width, camera orbit and the
//     global hue all drift forever on incommensurate iTime LFOs — alive with NO audio.
//   * wavelet-ease springs ADD on top when audio is present (0 otherwise).
//   * Trimmed for a weak GPU: 3 shells (was 4), 26 march steps (was 40), no per-face audio
//     pulse, cheap 4-tap normal.
//   Run: ?shader=tesla/chromadepth/geode&wavelet=true&controller=wavelet-ease&fullscreen=true
// License: CC0

#define MAX_STEPS 26
#define MAX_DIST 18.0
#define SURF_DIST 0.004
#define NORM_EPS 0.004
#define PHI 1.6180339887
#define SQ2 1.4142135624
#define SQ3 1.7320508076

// ── AUDIO (wavelet-ease outputs; declared by hand, 0 without mic) ──
uniform float waveletBassSpring;     // breath / shell separation
uniform float waveletBand5Spring;    // treble/air → edge glow
uniform float waveletCentroidSpring; // brightness → faceting detail + hue
uniform float energySpring;          // loudness → face brightness

float morph(float rate, float ph) {
    return sin(iTime * rate + ph + sin(iTime * rate * 0.37 + ph) * 1.2);
}

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    return hsl2rgb(vec3(t * 0.82, 0.95 - t * 0.1, 0.55 - t * 0.12));
}

mat2 rot2(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float hash(float n){ return fract(sin(n) * 43758.5453); }

// icosahedron SDF via half-space intersection (exploiting symmetry with abs)
float sdIcosahedron(vec3 p, float r) {
    float phi = PHI;
    float il = 1.0 / sqrt(1.0 + phi * phi);
    vec3 ap = abs(p);
    float d = dot(ap, vec3(0.0, 1.0, phi) * il);
    d = max(d, dot(ap, vec3(0.0, 1.0, -phi) * il));
    d = max(d, dot(ap, vec3(1.0, phi, 0.0) * il));
    d = max(d, dot(ap, vec3(-1.0, phi, 0.0) * il));
    d = max(d, dot(ap, vec3(phi, 0.0, 1.0) * il));
    d = max(d, dot(ap, vec3(-phi, 0.0, 1.0) * il));
    return d - r;
}

// triangular tiling on the sphere surface → distance to nearest triangle edge
float geodesicFaces(vec3 p, float freq) {
    vec3 n = normalize(p + vec3(0.0001));
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi_a = atan(n.z, n.x);
    float gu = fract(theta * freq);
    float gv = fract(phi_a * freq * 0.5);
    if (gu + gv < 1.0) return min(min(gu, gv), 1.0 - gu - gv);
    float gu2 = 1.0 - gu, gv2 = 1.0 - gv;
    return min(min(gu2, gv2), 1.0 - gu2 - gv2);
}

// morph params shared across SDF calls (set once in main)
float gBreathe, gDetail, gEdgeW, gRotSpeed;

// returns vec2(distance, shellId). shellId 0 = outer/red, 2 = inner/blue.
vec2 geodeShells(vec3 p, float time) {
    float d = MAX_DIST;
    float shellId = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float baseR = 2.2 - fi * 0.6;
        float radius = baseR + gBreathe * (1.0 - fi * 0.2);

        vec3 rp = p;
        float ang = time * gRotSpeed * (1.0 + fi * 0.3) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
        rp.xz = rot2(ang) * rp.xz;
        rp.xy = rot2(ang * 0.3 + fi * 0.5) * rp.xy;

        float icoD = sdIcosahedron(rp, radius);
        float thickness = 0.05;
        float shellD = max(icoD, -(sdIcosahedron(rp, radius - thickness)));

        float faceFreq = gDetail + fi * 1.5;
        float edgeDist = geodesicFaces(rp, faceFreq);
        float faceMask = smoothstep(0.0, gEdgeW, edgeDist);
        float finalD = shellD + mix(0.05, 0.0, faceMask);  // carve gaps along triangle edges

        if (finalD < d) { d = finalD; shellId = fi; }
    }
    return vec2(d, shellId);
}

vec3 getNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * NORM_EPS;
    return normalize(
        e.xyy * geodeShells(p + e.xyy, iTime).x +
        e.yyx * geodeShells(p + e.yyx, iTime).x +
        e.yxy * geodeShells(p + e.yxy, iTime).x +
        e.xxx * geodeShells(p + e.xxx, iTime).x);
}

float celShade(float d) {
    if (d > 0.65) return 1.0;
    if (d > 0.35) return 0.65;
    if (d > 0.1) return 0.4;
    return 0.2;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // ── AUTONOMOUS MORPH (no mic needed) ──
    gBreathe  = 0.18 * morph(0.05, 0.0) + waveletBassSpring * 0.18;          // shells expand/contract
    gDetail   = 3.4 + 0.9 * morph(0.031, 1.1) + waveletCentroidSpring * 0.6; // faceting frequency drifts
    gEdgeW    = 0.07 + 0.03 * (0.5 + 0.5 * morph(0.043, 2.0)) - waveletBand5Spring * 0.02; // gaps open/close
    gEdgeW    = max(gEdgeW, 0.03);
    gRotSpeed = 0.16 + 0.06 * (0.5 + 0.5 * morph(0.02 * PHI, 0.0));

    // camera: slow orbit + bob
    float camAngle = iTime * 0.11 + 0.4 * morph(0.018 * PHI, 0.0);
    float camR = 5.0 + 0.4 * morph(0.027, 1.0);
    vec3 ro = vec3(sin(camAngle) * camR, 1.4 + 0.8 * morph(0.02, 3.0), cos(camAngle) * camR);
    vec3 forward = normalize(-ro + vec3(0.0, sin(iTime * 0.03) * 0.15, 0.0));
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.6 * forward);

    // ── raymarch ──
    float t = 0.0, shellId = -1.0;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 h = geodeShells(p, iTime);
        if (h.x < SURF_DIST) { shellId = h.y; break; }
        if (t > MAX_DIST) break;
        t += max(h.x * 0.85, SURF_DIST * 0.5);
    }

    // ── background: dark + faint far-violet stars ──
    vec3 col = vec3(0.0);
    float star = hash(floor(rd.x * 70.0) * 100.0 + floor(rd.y * 70.0));
    if (star > 0.97) {
        float tw = 0.3 + 0.7 * pow(max(0.0, sin(iTime * 1.5 + star * 50.0)), 8.0);
        col = chromadepth(0.9) * tw * 0.3;
    }

    if (shellId >= 0.0) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        vec3 lightDir = normalize(vec3(0.6, 0.8, 0.4));
        float diff = max(dot(n, lightDir), 0.0);
        float fill = max(dot(n, normalize(vec3(-0.5, 0.3, -0.6))), 0.0) * 0.25;
        float cel = celShade(diff + fill);
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

        // shellId → depth colour (outer=red/near, inner=blue/far), + a little ray distance
        float depthT = shellId / 2.0;
        depthT = mix(depthT, clamp((t - 2.5) / 8.0, 0.0, 1.0), 0.2);
        depthT = clamp(depthT + 0.03 * morph(0.05, 0.0), 0.0, 1.0);

        float lightness = (0.3 + cel * 0.5) * (0.85 + energySpring * 0.3);
        col = chromadepth(depthT) * lightness;
        col += chromadepth(max(depthT - 0.12, 0.0)) * rim * (0.35 + waveletBand5Spring * 0.4);

        float fog = exp(-t * 0.08);
        col = mix(vec3(0.0), col, fog);
    }

    // motion trail
    vec4 prev = getLastFrameColor(screenUV);
    col = mix(prev.rgb * 0.92, col, 0.72);

    // vignette + chromadepth saturation guard
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;
    vec3 hsl = rgb2hsl(col);
    hsl.y = min(hsl.y * 1.2, 1.0);
    hsl.z = clamp(hsl.z, 0.0, 0.58);
    col = hsl2rgb(hsl);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
