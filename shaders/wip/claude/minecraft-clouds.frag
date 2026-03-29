// @fullscreen: true
// @mobile: true
// @tags: minecraft, clouds, sky, peaceful, dreamy, ambient
// @favorite: true

#define PI 3.14159265359

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Bass: cloud coverage — median = slow, stable evolution
#define CLOUD_COVERAGE (0.44 + bassMedian * 0.16)
// #define CLOUD_COVERAGE 0.50

// Energy: drift speed — mean smooths out transient spikes
#define DRIFT_SPEED (0.012 + energyMean * 0.016)
// #define DRIFT_SPEED 0.016

// Treble: cloud brightness — median keeps it from flickering
#define CLOUD_BRIGHT (0.90 + trebleMedian * 0.12)
// #define CLOUD_BRIGHT 0.92

// Day/night cycle — time-driven; spectralCentroid nudges the phase slightly
// 0.0=sunrise, 0.25=noon, 0.5=sunset, 0.75=midnight (~2.5 min full cycle)
#define DAY_CYCLE fract(iTime * 0.0067 + spectralCentroidMean * 0.08)

// Pitch class: secondary hue rotation — shifts sky tint with each note
#define SKY_HUE_SHIFT (pitchClassNormalized * 0.14)
// #define SKY_HUE_SHIFT 0.0

// Energy: sky brightness pulse
#define SKY_GLOW (energyNormalized * 0.10)
// #define SKY_GLOW 0.0

// Spectral roughness: storm darkness — normalized (0-1) is gentler than zScore
#define STORM_DARK (spectralRoughnessNormalized * 0.18)
// #define STORM_DARK 0.0

// Mids: subtle cloud breathing — mean keeps movement gentle
#define CLOUD_BREATHE (midsNormalized * 0.010 - 0.005)
// #define CLOUD_BREATHE 0.0

// Beat: brightness pop
#define BEAT_POP (beat ? 1.10 : 1.0)
// #define BEAT_POP 1.0

// Spectral flux: edge shimmer — mean avoids sudden shimmer spikes
#define SHIMMER_AMT (spectralFluxMean * 0.06)
// #define SHIMMER_AMT 0.03

// Spectral entropy: cloud formation scale — median = gradual shape change
#define CLOUD_SCALE (0.14 + spectralEntropyMedian * 0.10)
// #define CLOUD_SCALE 0.16

// Shared horizon Y — used by both the cloud perspective system and sun/moon placement.
// Everything below this line is pure sky gradient; everything above is cloud/celestial space.
#define HORIZON_Y 0.20

// ============================================================================
// HASH / NOISE
// ============================================================================

float h2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float sn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x),
               mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}

// 4-octave FBM — smooth, layered noise for cloud formations
float fbm(vec2 p) {
    return sn(p)           * 0.500
         + sn(p * 2.1 + 1.73) * 0.250
         + sn(p * 4.3 + 3.51) * 0.125
         + sn(p * 8.7 + 7.13) * 0.125;
}

// ============================================================================
// CLOUD DENSITY — pixelated Minecraft-block look
// ============================================================================

// Quantize world position to block grid, sample noise at block centers.
// This gives uniform-colored blocks with hard rectangular edges — exactly
// like classic Minecraft clouds.
float cloudDensity(vec2 wp, float res, float coverage, float scale) {
    vec2 bid = floor(wp * res);               // snap to block grid
    float n   = fbm(bid * scale);              // noise sampled at block center
    return smoothstep(1.0 - coverage, 1.0 - coverage + 0.10, n);
}

// ============================================================================
// PERSPECTIVE CLOUD PLANE
// ============================================================================
// Minecraft clouds are flat slabs at a fixed altitude, seen in perspective:
//   - overhead: large, close, you see the gray bottom face + bright white top edge
//   - horizon:  thin strips, distant, almost invisible in haze
//
// Technique: map screen UV → world position on the cloud plane using perspective
// division.  Two samples (current pixel + pixel slightly above) detect whether
// we're on the TOP FACE (bright white) or BOTTOM FACE (gray).

// Screen UV → world (x, z) on a horizontal plane at altitude H
vec2 cloudWorldPos(vec2 uv, float H, float aspect, float HORIZ) {
    float ty   = uv.y - HORIZ;
    float dist = H / max(ty, 0.0015);
    return vec2((uv.x - 0.5) * dist * aspect, dist);
}

// Returns vec4(rgb, alpha).  alpha = 0 → no cloud here.
vec4 perspClouds(vec2 uv, float aspect) {
    float HORIZ  = HORIZON_Y; // shared horizon — aligns with sun/moon arc base
    float H_BASE = 0.38;   // cloud altitude parameter — controls perspective scale

    float ty = uv.y - HORIZ;
    if (ty < 0.003) return vec4(0.0);

    // World position on the cloud plane
    vec2 wp = cloudWorldPos(uv, H_BASE, aspect, HORIZ);
    wp.x += iTime * DRIFT_SPEED;

    float d = cloudDensity(wp, 4.0, CLOUD_COVERAGE, CLOUD_SCALE);
    if (d < 0.5) return vec4(0.0);

    // Top-face detection: is the pixel just above us sky?
    // epsilon scales with ty: thick edge overhead, hairline at horizon
    float eps    = max(ty * 0.09, 0.004);
    vec2 wpAbove = cloudWorldPos(vec2(uv.x, uv.y + eps), H_BASE, aspect, HORIZ);
    wpAbove.x   += iTime * DRIFT_SPEED;
    bool topFace = cloudDensity(wpAbove, 4.0, CLOUD_COVERAGE, CLOUD_SCALE) < 0.5;

    // Day/night lighting
    float sunElev = sin(DAY_CYCLE * 2.0 * PI);
    float daylight = smoothstep(-0.15, 0.20, sunElev);
    float storm    = STORM_DARK;

    vec3 topDay   = vec3(CLOUD_BRIGHT) * mix(vec3(1.0), vec3(0.88, 0.92, 0.98), 0.18);
    vec3 botDay   = mix(vec3(0.74, 0.77, 0.83), vec3(0.40, 0.42, 0.50), storm);
    vec3 topNight = vec3(0.14, 0.17, 0.28);
    vec3 botNight = vec3(0.07, 0.08, 0.16);

    vec3 faceTop = mix(topNight, topDay,  daylight);
    vec3 faceBot = mix(botNight, botDay,  daylight);

    float shimmer = 1.0 + SHIMMER_AMT * sin(wp.x * 4.5 + iTime * 1.8);
    vec3 col = topFace ? faceTop * shimmer : faceBot;

    // Aerial perspective: fade distant clouds into the sky haze
    float dist  = H_BASE / max(ty, 0.0015);
    float fog   = exp(-max(dist - 0.7, 0.0) * 0.28);

    return vec4(col, d * fog);
}

// ============================================================================
// SKY GRADIENT — 4-keyframe day/night cycle, 3-stop gradient
// ============================================================================

vec3 interp4(vec3 a, vec3 b, vec3 d, vec3 e, float c) {
    if (c < 0.25) return mix(a, b, smoothstep(0.0,  0.25, c));
    if (c < 0.50) return mix(b, d, smoothstep(0.25, 0.50, c));
    if (c < 0.75) return mix(d, e, smoothstep(0.50, 0.75, c));
    return mix(e, a, smoothstep(0.75, 1.0, c));
}

// Zenith — deep overhead color
vec3 skyZenith(float c) {
    return interp4(
        vec3(0.04, 0.06, 0.22),  // sunrise  — dark pre-dawn blue
        vec3(0.22, 0.50, 0.90),  // noon     — vivid sky blue
        vec3(0.07, 0.04, 0.20),  // sunset   — deep indigo
        vec3(0.01, 0.01, 0.07),  // midnight — near-black
        c);
}

// Mid-sky — atmospheric band (~40% up the sky)
vec3 skyMid(float c) {
    return interp4(
        vec3(0.18, 0.16, 0.50),  // sunrise  — blue-purple
        vec3(0.36, 0.62, 0.96),  // noon     — clear blue
        vec3(0.24, 0.08, 0.22),  // sunset   — deep magenta-purple
        vec3(0.02, 0.03, 0.13),  // midnight — dark blue
        c);
}

// Horizon — the band of color right at the skyline
vec3 skyHorizon(float c) {
    return interp4(
        vec3(1.00, 0.65, 0.22),  // sunrise  — golden orange
        vec3(0.58, 0.78, 1.00),  // noon     — pale bright blue
        vec3(1.00, 0.38, 0.04),  // sunset   — vivid red-orange
        vec3(0.03, 0.04, 0.16),  // midnight — dark navy
        c);
}

vec3 getSky(vec2 uv) {
    float c = DAY_CYCLE;

    vec3 top = skyZenith(c);
    vec3 mid = skyMid(c);
    vec3 bot = skyHorizon(c);

    // 3-stop gradient: more color near the horizon, clean blue overhead
    // pow curve keeps the horizon band wide and rich
    float g1 = pow(clamp(uv.y, 0.0, 1.0), 0.55);       // horizon → mid
    float g2 = smoothstep(0.22, 0.92, uv.y);             // mid → zenith
    vec3 sky = mix(bot, mid, g1);
    sky = mix(sky, top, g2);

    // Pitch class rotates the hue — extra color variety with each note
    vec3 hsl = rgb2hsl(sky);
    hsl.x = fract(hsl.x + SKY_HUE_SHIFT);
    sky = hsl2rgb(hsl);

    // Energy brightens the sky on loud moments
    sky *= 1.0 + SKY_GLOW;

    // Storm: deepen toward charcoal
    sky = mix(sky, vec3(0.22, 0.24, 0.28), STORM_DARK * 0.85);

    return sky;
}

// ============================================================================
// SUN, MOON, STARS
// ============================================================================

vec3 drawSun(vec2 uv, vec2 pos, float vis) {
    float aspect = iResolution.x / iResolution.y;
    float halfSz = 0.050; // same apparent size as the moon

    // Aspect-corrected coords → square on screen
    vec2 diff = (uv - pos) * vec2(aspect, 1.0);
    float dist = length(diff);
    float normDist = dist / halfSz;

    // Color shifts from white-yellow at zenith to deep orange at horizon
    float horiz = pow(max(0.0, 1.0 - pos.y * 2.0), 2.0);
    vec3 innerCol = mix(vec3(1.00, 0.98, 0.90), vec3(1.00, 0.80, 0.30), horiz);
    vec3 glowCol  = mix(vec3(1.00, 0.75, 0.20), vec3(0.95, 0.35, 0.05), horiz);

    // Large warm glow — Minecraft sun has a big atmospheric bloom
    float glow1 = exp(-normDist * 1.2) * 0.55;
    float glow2 = exp(-normDist * 3.5) * 0.30;
    float glow3 = exp(-normDist * 0.4) * 0.18; // wide soft halo

    // Square disc (hard edges)
    vec2 sunUV = diff / (halfSz * 2.0) + 0.5;
    float inSquare = (sunUV.x > 0.0 && sunUV.x < 1.0 &&
                      sunUV.y > 0.0 && sunUV.y < 1.0) ? 1.0 : 0.0;

    vec3 disc = innerCol * inSquare * vis;
    vec3 glow = glowCol * (glow1 + glow2 + glow3) * vis;

    return disc + glow;
}

// Minecraft full moon — 8×8 pixel texture
// Returns brightness (1.0=white, ~0.60=gray crater patch)
float moonTexture(vec2 uv) {
    vec2 p = floor(clamp(uv, 0.001, 0.999) * 8.0);
    float c = p.x, r = p.y;
    float gray = 0.62;

    // Top and bottom rows: solid white
    if (r < 0.5 || r > 6.5) return 1.0;

    // Row 1: gray on right side
    if (abs(r - 1.0) < 0.5) return (c > 4.5 && c < 6.5) ? gray : 1.0;

    // Row 2: two gray patches
    if (abs(r - 2.0) < 0.5) return ((c > 1.5 && c < 3.5) || (c > 4.5 && c < 6.5)) ? gray : 1.0;

    // Row 3: gray patch center-left
    if (abs(r - 3.0) < 0.5) return (c > 1.5 && c < 4.5) ? gray : 1.0;

    // Row 4: scattered gray
    if (abs(r - 4.0) < 0.5)
        return ((c > 0.5 && c < 1.5) || (c > 2.5 && c < 4.5) || (c > 5.5 && c < 6.5)) ? gray : 1.0;

    // Row 5: gray left and right
    if (abs(r - 5.0) < 0.5) return ((c > 0.5 && c < 2.5) || (c > 5.5 && c < 7.5)) ? gray : 1.0;

    // Row 6: small center-left patch
    return (c > 1.5 && c < 3.5) ? gray : 1.0;
}

vec3 drawMoon(vec2 uv, vec2 pos, float vis) {
    float aspect = iResolution.x / iResolution.y;
    float halfSz = 0.052; // half-size in aspect-corrected space → square on screen

    // Aspect-correct so the moon appears square (not stretched)
    vec2 diff = (uv - pos) * vec2(aspect, 1.0);
    float dist = length(diff);

    // Soft blue-white glow (circular)
    float normDist = dist / halfSz;
    float glow = (exp(-normDist * 2.8) * 0.30 + exp(-normDist * 8.0) * 0.10) * vis;

    // UV within the square [0,1]
    vec2 moonUV = diff / (halfSz * 2.0) + 0.5;

    // Outside the square: only glow
    if (moonUV.x < 0.0 || moonUV.x > 1.0 || moonUV.y < 0.0 || moonUV.y > 1.0)
        return glow * vec3(0.82, 0.90, 1.00);

    // Inside: 8×8 pixelated Minecraft moon texture
    float brightness = moonTexture(moonUV);
    vec3 moonCol = vec3(0.90, 0.95, 1.00) * brightness;

    return moonCol * vis + glow * vec3(0.82, 0.90, 1.00);
}

float starField(vec2 uv, float nightness) {
    if (nightness < 0.01) return 0.0;
    vec2 g  = fract(uv * 58.0);
    vec2 id = floor(uv * 58.0);
    float r = h2(id);
    if (r < 0.93) return 0.0;
    float twinkle = 0.55 + 0.45 * sin(iTime * (1.2 + r * 5.0) + r * 100.0);
    float d = length(g - 0.5);
    return smoothstep(0.14, 0.0, d) * twinkle * nightness;
}

vec3 getCelestial(vec2 uv) {
    float c = DAY_CYCLE;

    // Vertical arc span: from HORIZON_Y (rising/setting) to near screen top (zenith)
    float arcH = 1.0 - HORIZON_Y - 0.06; // e.g. 0.74 of screen height

    // Sun: rises east (right) at c=0, peaks at c=0.25, sets west (left) at c=0.5
    float sunAng = c * PI;
    vec2  sunPos = vec2(0.5 + cos(sunAng) * 0.38,
                        HORIZON_Y + sin(sunAng) * arcH);
    float sunVis = smoothstep(0.0, 0.06, c) * (1.0 - smoothstep(0.44, 0.50, c));
    sunVis *= (1.0 - STORM_DARK * 0.85);

    // Moon: rises at c=0.5, peaks at c=0.75, sets at c=1.0
    float mc      = max(c - 0.5, 0.0);
    vec2  moonPos = vec2(0.5 + cos(mc * PI) * 0.38,
                         HORIZON_Y + sin(mc * PI) * arcH);
    float c2      = fract(c + 0.5);
    float moonVis = smoothstep(0.0, 0.06, c2) * (1.0 - smoothstep(0.44, 0.50, c2));
    moonVis *= (1.0 - STORM_DARK * 0.60);

    // Stars: fade in as sun dips below horizon; don't render below horizon line
    float sunElev   = sin(c * 2.0 * PI);
    float nightness = smoothstep(0.05, -0.25, sunElev);
    float aboveHoriz = smoothstep(HORIZON_Y, HORIZON_Y + 0.07, uv.y);
    float aspect    = iResolution.x / iResolution.y;

    vec3 result = vec3(0.0);
    result += vec3(0.85, 0.90, 1.00) * starField(vec2(uv.x * aspect, uv.y), nightness) * aboveHoriz;
    result += drawSun(uv, sunPos, sunVis);
    result += drawMoon(uv, moonPos, moonVis);

    return result;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv     = fragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // ---- SKY ----
    vec3 col = getSky(uv);
    col += getCelestial(uv);

    // ---- PERSPECTIVE CLOUDS ----
    vec4 cloud = perspClouds(uv, aspect);
    if (cloud.a > 0.01) col = mix(col, cloud.rgb, cloud.a * 0.96);

    // Beat pop
    col *= BEAT_POP;

    // ---- FRAME FEEDBACK — smooth trailing motion in drift direction ----
    // Sample prev frame shifted slightly against drift to create gentle motion blur
    float shift = DRIFT_SPEED * 0.45 / 60.0;
    vec2 fbUV = uv - vec2(shift, 0.0);
    vec3 prev = getLastFrameColor(clamp(fbUV, 0.001, 0.999)).rgb;
    col = mix(prev * 0.91, col, 0.30);

    // ---- VIGNETTE ----
    vec2 vc = uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.36;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
