// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, diamond, gem, 3d, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/diamond/1&wavelet=true&controller=wavelet-ease&fullscreen=true&name=Diamond
// ChromaDepth DIAMOND — a faceted brilliant-cut gem engineered to POP FORWARD through the
// glasses. The near facets read red, the depth you see INTO the stone reads blue/violet (far),
// and a hot red fresnel rim throws the silhouette toward you.
//
// REFACTORED with the iris/1 discipline (vs the jumpy vibe-coded chromadepth set):
//   * Every reaction rides SMOOTH wavelet-ease springs + monotonic phases — no raw z-score
//     jitter, no `iTime*rate` acceleration, no `beat ?` strobe, no rock-back.
//   * Audio modulates RATE / SHAPE / DEPTH, never the rotation angle directly.
//   * quietGate fades reactivity in silence so mic noise can't drive it.
//   * The beat is a SMOOTH redward "pop" + a forward kick-zoom, not a one-frame flash.
//   * Self-morphs with NO mic (iTime base motion); springs add on top when audio is present.
//   Requires: ?wavelet=true&controller=wavelet-ease
// License: CC0

#define MAX_STEPS 40
#define MAX_DIST 12.0
#define SURF_DIST 0.0025
#define PHI 1.6180339887
#define SQ2 1.4142135624

// ── wavelet-ease controller outputs (declared by hand; 0 without the controller / a mic) ──
uniform float waveletBassSpring;     // deep bass → gem breathe + kick
uniform float waveletBand2Spring;    // low-mid body → facet bloom
uniform float waveletBand5Spring;    // treble/air → sparkle "fire"
uniform float waveletCentroidSpring; // brightness → hue tilt
uniform float energySpring;          // loudness → glow / rim
uniform float melodyFlow;            // melody contour → slow palette rotation
uniform float spectralCrestSmooth;   // articulation → sparkle + pop (smoothed, not jittery)
uniform float spinPhase;             // monotonic spin accumulator (audio-accel, never rocks back)
uniform float morphPhase;            // monotonic morph accumulator
uniform float huePhase;              // monotonic hue accumulator
uniform float quietGate;             // 0 in silence → 1 loud (gates audio offsets)
// waveletBassZScore + wavelet_bassHit are auto-declared (raw wavelet features) — used only for
// the transient kick-zoom (a camera push that springs back, not a colour strobe).

mat2 r2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

// ChromaDepth palette in HSL (raw spectral hue order is what the glasses need — NOT oklch).
// t: 0 = red (near) → 0.72 = violet (far). High saturation, bounded lightness, never white.
vec3 chromadepth(float t, float lit){
    t = clamp(t, 0.0, 1.0);
    return hsl2rgb(vec3(t * 0.72, 0.95, clamp(lit, 0.04, 0.6)));
}

// shared morph state (set once per frame in main, read by the SDF + normal)
float gSize, gSpin, gTumble;

// Brilliant-cut gem: an octahedron (the classic rhombus diamond silhouette) with a flat table
// cut on top and a tiny culet implied by the lower point. Flat faces = clean per-facet normals,
// so each facet lands on its own ChromaDepth band — that faceted rainbow is what reads as "gem".
float sdDiamond(vec3 p){
    p.xz = r2(gSpin) * p.xz;        // object rotation (monotonic) — sample point turns, not the angle math
    p.xy = r2(gTumble) * p.xy;
    float oct = (abs(p.x) + abs(p.y) + abs(p.z) - gSize) * 0.57735027;
    float table = p.y - gSize * 0.46;   // flat table on top
    return max(oct, table);
}

// cheap 4-tap tetrahedron normal
vec3 getNormal(vec3 p){
    vec2 e = vec2(1.0, -1.0) * 0.0022;
    return normalize(
        e.xyy * sdDiamond(p + e.xyy) +
        e.yyx * sdDiamond(p + e.yyx) +
        e.yxy * sdDiamond(p + e.yxy) +
        e.xxx * sdDiamond(p + e.xxx));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // ── MOTION (monotonic, never rocks back) ── iTime gives an always-on base so it lives with
    // NO mic; the controller's spinPhase/morphPhase/huePhase ADD the audio-accelerated component
    // as a true accumulator (no iTime*rate acceleration bug).
    gSpin   = iTime * 0.18 + spinPhase;
    gTumble = 0.30 + 0.18 * sin(iTime * 0.07 * PHI) + morphPhase * 0.5;
    // gem breathes on smooth bass, gated by loudness (quiet noise can't pump it)
    gSize   = 1.0 + waveletBassSpring * 0.10 * quietGate + waveletBand2Spring * 0.05 * quietGate
              + 0.03 * sin(iTime * 0.05 * SQ2);

    // SMOOTH beat: a redward "pop" signal built from eased features (no boolean beat flash)
    float pop = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    // TRANSIENT kick-zoom: self-calibrating bass spike pushes the camera IN, then springs back.
    float kick = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.06
               + clamp(wavelet_bassHit, 0.0, 1.0) * 0.035;

    // camera: gentle drift; kick lunges it toward the stone (literal forward pop)
    vec3 target = vec3(0.0);
    vec3 ro = vec3(0.15 * sin(iTime * 0.13), 0.25 + 0.12 * sin(iTime * 0.09), 4.4);
    vec3 fwd = normalize(target - ro);
    ro += fwd * kick * 2.0;
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = cross(fwd, right);
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.7 * fwd);
    float camDist = length(ro);

    // ── raymarch the (convex) gem — converges fast, so few steps needed ──
    float t = 0.0;
    bool hit = false;
    for (int i = 0; i < MAX_STEPS; i++){
        vec3 p = ro + rd * t;
        float d = sdDiamond(p);
        if (d < SURF_DIST){ hit = true; break; }
        if (t > MAX_DIST) break;
        t += d * 0.9;
    }

    // ── background: near-black with a faint far violet so the gem floats and depth is unambiguous ──
    float bgR = length(screenUV - 0.5);
    vec3 col = chromadepth(0.95, mix(0.05, 0.012, bgR));

    if (hit){
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        vec3 v = -rd;

        // FRONT-TO-BACK ChromaDepth: ray-hit distance across the stone → red(near) … violet(far).
        float viewDepth = clamp((t - (camDist - gSize)) / (2.0 * gSize), 0.0, 1.0);
        // per-facet hue separation (top facets vs pavilion read on different bands)
        float facetTint = 0.5 + 0.5 * n.y;

        // PITCH family → slow palette rotation (melody + brightness), gated so quiet noise can't flash hue
        float hueDrift = huePhase * 0.04 + melodyFlow * 0.05 * quietGate
                       + waveletCentroidSpring * 0.05 * quietGate;

        float depthT = viewDepth * 0.74 + facetTint * 0.16 + hueDrift;
        depthT -= pop * 0.12;                       // the beat pops the whole gem toward RED (forward)
        depthT = clamp(depthT, 0.0, 1.0);

        // facet shading (form) — keep saturation high, lightness bounded (no white-out)
        vec3 lightDir = normalize(vec3(0.5, 0.85, 0.45));
        float diff = max(dot(n, lightDir), 0.0);
        float cel = 0.45 + 0.55 * smoothstep(0.15, 0.85, diff);
        float lit = cel * (0.42 + energySpring * 0.18);

        col = chromadepth(depthT, lit);

        // INNER DEPTH: where a facet faces us (low fresnel) we "see into" the stone → deeper blue,
        // giving the gem real near/far volume (the core of the pop). Tasteful, not dominant.
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        col = mix(chromadepth(0.86, lit * 0.9), col, clamp(fres * 0.6 + 0.5, 0.0, 1.0));

        // HOT RED FRESNEL RIM — the silhouette edge throws forward through the glasses.
        vec3 rimCol = chromadepth(0.02, 0.5);       // near-red
        col += rimCol * fres * (0.6 + energySpring * 0.6 + pop * 0.5);

        // DIAMOND FIRE — tight specular glints, treble/articulation gated. Warm-white leans red so
        // the sparkle pops forward instead of breaking ChromaDepth with neutral white.
        vec3 h = normalize(lightDir + v);
        float spec = pow(max(dot(n, h), 0.0), 48.0);
        float fire = spec * (0.35 + waveletBand5Spring * 1.3 + spectralCrestSmooth * 0.7);
        col += vec3(1.0, 0.8, 0.62) * fire;

        // distance fog toward the violet background (keeps far edges receding)
        float fog = exp(-max(t - (camDist - gSize), 0.0) * 0.35);
        col = mix(chromadepth(0.95, 0.02), col, fog);
    }

    // gentle motion trail — smooths transitions without smearing the facets (decay guards white-out)
    vec4 prev = getLastFrameColor(screenUV);
    col = mix(prev.rgb * 0.85, col, 0.82);

    // ChromaDepth integrity: high saturation, bounded lightness, never white
    vec3 hsl = rgb2hsl(col);
    hsl.y = min(hsl.y * 1.12, 1.0);
    hsl.z = clamp(hsl.z, 0.0, 0.6);
    col = hsl2rgb(hsl);

    // vignette darkens edges so the gem reads as floating forward
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
