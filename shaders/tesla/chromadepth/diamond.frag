// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, 3d, diamond, tesseract, 4d, gem, tesla
// ChromaDepth DIAMOND — a 4D hypercube (tesseract) projected to 3D and rendered
// as a glittering wireframe gem. Inner cell = blue/far, outer cell = red/near
// through ChromaDepth glasses (Red=near, Green=mid, Blue/Violet=far, Black=neutral).
//
// TESLA / NO-MIC BUILD:
//   * Self-morphing: the 4D tumble, projection "breath", camera orbit and hue all drift
//     forever via incommensurate iTime LFOs — beautiful with NO audio at all.
//   * The wavelet-ease springs ADD on top when audio is present (0 when it isn't).
//   * Trimmed for a weak GPU: wireframe edges only (no vertex spheres), 22 march steps,
//     cheap 4-tap normal.
//   Run: ?shader=tesla/chromadepth/diamond&wavelet=true&controller=wavelet-ease&fullscreen=true
// License: CC0

#define MAX_STEPS 22
#define MAX_DIST 18.0
#define SURF_DIST 0.004
#define PI 3.14159265
#define PHI 1.6180339887
#define SQ2 1.4142135624
#define SQ3 1.7320508076

// ── AUDIO (wavelet-ease controller outputs — must be declared by hand; 0 without mic) ──
uniform float waveletBassSpring;     // smooth deep-bass → diamond breath + brightness
uniform float waveletCentroidSpring; // brightness → hue tint
uniform float energySpring;          // loudness → edge glow / line weight
uniform float melodyFlow;            // melody contour → gentle hue drift

// quasi-periodic wanderer: nested sine so it is NOT a plain sinusoid and never exactly repeats
float morph(float rate, float ph) {
    return sin(iTime * rate + ph + sin(iTime * rate * 0.37 + ph) * 1.2);
}

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    return hsl2rgb(vec3(t * 0.82, 0.95 - t * 0.1, 0.55 - t * 0.12));
}

// 4D rotations (one plane each)
vec4 rotXW(vec4 v, float a){ float c=cos(a),s=sin(a); return vec4(c*v.x+s*v.w, v.y, v.z, -s*v.x+c*v.w); }
vec4 rotYW(vec4 v, float a){ float c=cos(a),s=sin(a); return vec4(v.x, c*v.y+s*v.w, v.z, -s*v.y+c*v.w); }
vec4 rotZW(vec4 v, float a){ float c=cos(a),s=sin(a); return vec4(v.x, v.y, c*v.z+s*v.w, -s*v.z+c*v.w); }

vec4 tesseractVertex(int idx) {
    float x = ((idx & 1) == 0) ? -1.0 : 1.0;
    float y = ((idx & 2) == 0) ? -1.0 : 1.0;
    float z = ((idx & 4) == 0) ? -1.0 : 1.0;
    float w = ((idx & 8) == 0) ? -1.0 : 1.0;
    return vec4(x, y, z, w);
}

// projected vertices + original W (for depth colour), computed once per pixel
vec3 verts[16];
float vertW[16];
float gEdgeR;

void computeVertices(float axw, float ayw, float azw, float projD) {
    for (int i = 0; i < 16; i++) {
        vec4 v = tesseractVertex(i);
        v = rotXW(v, axw); v = rotYW(v, ayw); v = rotZW(v, azw);
        vertW[i] = v.w;
        float w = projD / (projD - v.w);
        w = clamp(w, 0.3, 4.0);
        verts[i] = v.xyz * w;
    }
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 ab = b - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    return length(p - a - ab * t) - r;
}

// edges only (two verts share an edge if they differ in exactly one bit) → 32 capsules.
// returns distance; writes nearest-edge depth (0=near/red .. 1=far/blue) to out.
float diamondSDF(vec3 p, out float depth) {
    float d = MAX_DIST;
    depth = 0.5;
    for (int i = 0; i < 16; i++) {
        for (int bit = 0; bit < 4; bit++) {
            int j = i ^ (1 << bit);
            if (j > i) {
                float cd = sdCapsule(p, verts[i], verts[j], gEdgeR);
                if (cd < d) {
                    d = cd;
                    float avgW = (vertW[i] + vertW[j]) * 0.5;
                    depth = 1.0 - (avgW * 0.5 + 0.5);
                }
            }
        }
    }
    return d;
}

float sceneDist(vec3 p){ float dd; return diamondSDF(p, dd); }

// cheap 4-tap tetrahedron normal (4 SDF evals instead of 6)
vec3 getNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * 0.0025;
    return normalize(
        e.xyy * sceneDist(p + e.xyy) +
        e.yyx * sceneDist(p + e.yyx) +
        e.yxy * sceneDist(p + e.yxy) +
        e.xxx * sceneDist(p + e.xxx));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // ── AUTONOMOUS MORPH (no mic needed) — every dimension drifts at its own slow rate ──
    float bass = waveletBassSpring;       // 0 without audio
    float axw = iTime * 0.16 + 0.35 * morph(0.05 * PHI, 0.0) + bass * 0.40;
    float ayw = iTime * 0.11 + 0.30 * morph(0.06 * SQ2, 1.7) + bass * 0.25;
    float azw = iTime * 0.08 + 0.25 * morph(0.045 * SQ3, 0.5);
    float projD = 3.0 + 0.34 * morph(0.037, 2.1) + bass * 0.5;       // diamond "breathes" cube↔octa
    projD = clamp(projD, 2.6, 3.9);
    gEdgeR = 0.020 + 0.006 * (0.5 + 0.5 * morph(0.13, 0.0)) + energySpring * 0.006;

    computeVertices(axw, ayw, azw, projD);

    // camera: slow drifting orbit
    float camAngle = iTime * 0.05 + 0.30 * morph(0.02 * PHI, 0.0);
    float camR = 5.2 + 0.4 * morph(0.03, 1.0);
    float camY = 1.6 + 0.7 * morph(0.025, 3.0);
    vec3 ro = vec3(sin(camAngle) * camR, camY, cos(camAngle) * camR);
    vec3 forward = normalize(-ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);

    // ── raymarch ──
    float t = 0.0, depth = 0.5, hitDepth = 0.5;
    bool hit = false;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float dd = diamondSDF(p, depth);
        if (dd < SURF_DIST) { hit = true; hitDepth = depth; break; }
        if (t > MAX_DIST) break;
        t += dd * 0.9;
    }

    // ── background: dark chromadepth-neutral violet→black ──
    float skyGrad = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = hsl2rgb(vec3(0.74, 0.45, mix(0.015, 0.05, skyGrad)));

    if (hit) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.5);

        // depth colour: blend structural W-depth with ray distance for richer gradient
        float distDepth = clamp((t - 3.0) / 7.0, 0.0, 1.0);
        float dCol = clamp(mix(hitDepth, distDepth, 0.3)
                     + 0.04 * morph(0.05, 0.0) + melodyFlow * 0.05
                     + waveletCentroidSpring * 0.06, 0.0, 1.0);

        col = chromadepth(dCol);
        // wireframe glows along its length; rim brightens the silhouette
        float glow = 0.7 + 0.5 * rim + energySpring * 0.4;
        col *= glow;
        col += chromadepth(max(dCol - 0.12, 0.0)) * rim * 0.5;

        float fog = exp(-t * 0.07);
        col = mix(hsl2rgb(vec3(0.74, 0.45, 0.02)), col, fog);
    }

    // gentle motion trail
    vec4 prev = getLastFrameColor(screenUV);
    col = mix(prev.rgb * 0.92, col, 0.72);

    // keep chromadepth saturation high, no white-out
    vec3 hsl = rgb2hsl(col);
    hsl.y = min(hsl.y * 1.12, 1.0);
    hsl.z = clamp(hsl.z, 0.0, 0.55);
    col = hsl2rgb(hsl);

    // vignette
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.6;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
