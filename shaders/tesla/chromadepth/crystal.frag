// @fullscreen: true
//https://visuals.beadfamous.com/?shader=tesla/chromadepth/crystal&wavelet=true&controller=wavelet-ease&fullscreen=true
// @mobile: true
// @favorite: true
// @tags: chromadepth, crystal, voronoi, cavern, tesla
// ChromaDepth CRYSTAL — a crystal cavern of layered Voronoi cells. Large cells read
// red/near, tiny cells read blue/far, with glowing facet edges and sparkle.
// (Red=near, Green=mid, Blue/Violet=far, Black=neutral.)
//
// TESLA / NO-MIC BUILD:
//   * Self-morphing: cell heights, drift, warp, rotation and an auto "beat" ripple all
//     evolve on incommensurate iTime LFOs — alive with NO audio.
//   * wavelet-ease springs ADD on top when audio is present (0 otherwise).
//   * Cheap: pure 2D, three 3x3 Voronoi layers — comfortable on a weak GPU.
//   Run: ?shader=tesla/chromadepth/crystal&wavelet=true&controller=wavelet-ease&fullscreen=true
// License: CC0

#define PHI 1.6180339887
#define SQ2 1.4142135624
#define SQ3 1.7320508076

// ── AUDIO (wavelet-ease outputs; declared by hand, 0 without mic) ──
uniform float waveletBassSpring;     // cell-height pulse
uniform float waveletBand5Spring;    // treble → sparkle
uniform float waveletCentroidSpring; // brightness → animation speed
uniform float energySpring;          // loudness → edge brightness

float morph(float rate, float ph) {
    return sin(iTime * rate + ph + sin(iTime * rate * 0.37 + ph) * 1.2);
}
float morph01(float rate, float ph){ return 0.5 + 0.5 * morph(rate, ph); }
vec2 rot(vec2 p, float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c) * p; }

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    return hsl2rgb(vec3(t * 0.82, 0.95 - t * 0.1, 0.55 - t * 0.12));
}

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}
float hash1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// x = dist to cell centre, y = edge distance, z = cell height hash; cellID out.
vec4 voronoi(vec2 p, float timeScale, float seedOffset, out vec2 cellID) {
    vec2 ip = floor(p), fp = fract(p);
    float minD = 8.0, secD = 8.0;
    vec2 best = vec2(0.0); float bestH = 0.0;
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
        vec2 nb = vec2(float(i), float(j));
        vec2 h = hash2(ip + nb + seedOffset);
        vec2 off = vec2(sin(iTime * timeScale * (h.x * 0.5 + 0.5) + h.y * 6.28),
                        cos(iTime * timeScale * (h.y * 0.5 + 0.5) + h.x * 6.28)) * 0.3;
        vec2 cp = nb + h + off - fp;
        float d = dot(cp, cp);
        if (d < minD) { secD = minD; minD = d; best = ip + nb; bestH = hash1(ip + nb + seedOffset * 3.7); }
        else if (d < secD) secD = d;
    }
    cellID = best;
    float dist = sqrt(minD);
    return vec4(dist, sqrt(secD) - dist, bestH, 0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // ── AUTONOMOUS MORPH (no mic needed) ──
    float animSpeed = 1.0 + 0.4 * morph(0.05, 0.0) + waveletCentroidSpring * 0.4;
    float bassPulse = 0.25 * morph01(0.07, 1.0) + waveletBassSpring * 0.3;   // cell-height breathing
    float drift = 0.15 * morph(0.023, 2.0);                                  // slow seed drift
    float warp = 0.06 * morph01(0.037, 0.5);                                 // entropy-like warp
    float t = iTime * 0.08 * animSpeed;

    // global rotation + warp
    uv = rot(uv, t * 0.3);
    uv += vec2(sin(uv.y * 4.0 + t) * warp, cos(uv.x * 4.0 + t * 1.3) * warp);

    // three Voronoi layers at increasing scale = increasing depth
    vec2 id1; vec4 v1 = voronoi(uv * 2.5, animSpeed * 0.3, drift, id1);
    vec2 id2; vec4 v2 = voronoi(uv * 5.0 + vec2(t * 0.2, t * 0.15), animSpeed * 0.5, drift + 1.0, id2);
    vec2 id3; vec4 v3 = voronoi(uv * 10.0 + vec2(-t * 0.1, t * 0.25), animSpeed * 0.7, drift + 2.0, id3);

    float h1 = v1.z + bassPulse * 0.5;
    float h2 = v2.z + 0.1 * morph(0.06, 3.0);
    float h3 = v3.z;

    float depth1 = h1 * 0.25;
    float depth2 = 0.3 + h2 * 0.25;
    float depth3 = 0.6 + h3 * 0.4;

    float s1 = smoothstep(0.3, 0.7, h1 + bassPulse * 0.3);
    float s2 = smoothstep(0.25, 0.65, h2) * (1.0 - s1 * 0.6);
    float s3 = (1.0 - s1 * 0.5) * (1.0 - s2 * 0.4);
    float wsum = s1 + s2 + s3 + 0.001;
    float depth = (depth1 * s1 + depth2 * s2 + depth3 * s3) / wsum;
    depth = clamp(depth, 0.0, 1.0);

    // auto "beat" ripple — a radial wave every ~3.3s (replaces the mic beat)
    float beatPhase = fract(iTime / 3.3);
    float ripRing = abs(length(uv) - beatPhase * 1.5);
    float ripple = smoothstep(0.15, 0.0, ripRing) * (1.0 - beatPhase);
    depth = mix(depth, 0.0, ripple * 0.3);   // ripple pushes toward red/near

    vec3 col = chromadepth(depth);

    // facet edge glow across layers
    float eth = 0.09 + 0.05 * morph01(0.05, 1.5);
    float e1 = smoothstep(eth, 0.0, v1.y) * s1;
    float e2 = smoothstep(eth * 0.7, 0.0, v2.y) * s2;
    float e3 = smoothstep(eth * 0.5, 0.0, v3.y) * s3 * 0.6;
    float edge = clamp(e1 + e2 + e3, 0.0, 1.0);
    vec3 edgeCol = vec3(1.0, 0.95, 0.8) * (1.0 + energySpring * 0.5);
    col = mix(col, edgeCol, edge * 0.7);

    // sparkle on edges (time-based; treble lifts it when audio is present)
    float sparkleAmt = 0.35 + waveletBand5Spring * 0.6;
    float sp = step(0.85, hash1(id1 * 17.3 + floor(iTime * 8.0))) * sparkleAmt * edge;
    col += sp * vec3(1.0, 1.0, 0.9);

    // crystal facet shading (darken toward cell centres)
    float facet = smoothstep(0.0, 0.5, v1.x) * s1 + smoothstep(0.0, 0.4, v2.x) * s2 + smoothstep(0.0, 0.3, v3.x) * s3;
    col *= max(1.0 - facet * 0.15, 0.5);

    col *= 0.85 + 0.3 * morph01(0.04, 0.0) + energySpring * 0.2;
    col *= 1.0 + ripple * 0.4;

    // gentle feedback trail
    vec2 fbUV = clamp(screenUV + vec2(sin(iTime * 0.3), cos(iTime * 0.4)) * 0.003, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb * 0.96;
    col = mix(prev, col, 0.82);

    // vignette
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
