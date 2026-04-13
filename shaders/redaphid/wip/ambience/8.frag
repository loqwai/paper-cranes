// @fullscreen: true
// @mobile: true
// Synthwave sky — minecraft-sky structure with dubstep-daddy aesthetics
#define PI 3.14159265359

// ============================================================================
// TIMING — no audio, pure time-driven
// ============================================================================
#define DRIFT_SPEED 0.016
#define CLOUD_COVERAGE 0.50
#define CLOUD_BRIGHT 0.92
#define DAY_CYCLE fract(iTime * 0.0067)
#define CLOUD_SCALE 0.16
#define HORIZON_Y 0.20

// ============================================================================
// MATERIALS — from dubstep-daddy-fur-coat.frag
// ============================================================================
#define HUE_BASE 0.78

vec3 matChrome() { return hsl2rgb(vec3(fract(HUE_BASE + 0.05), 1.0, 0.65)); }
vec3 matHot()    { return hsl2rgb(vec3(0.08, 1.0, 0.6)); }

vec3 matFur(float t, float phase) {
    float cycle = sin(iTime * 0.08 + phase) * 0.5 + 0.5;
    vec3 white_hi = hsl2rgb(vec3(0.93, 0.15, 0.85));
    vec3 white_lo = hsl2rgb(vec3(0.90, 0.10, 0.75));
    vec3 pink_hi  = hsl2rgb(vec3(0.93, 0.95, 0.72));
    vec3 pink_lo  = hsl2rgb(vec3(0.86, 0.9, 0.55));
    vec3 hi = mix(white_hi, pink_hi, cycle);
    vec3 lo = mix(white_lo, pink_lo, cycle);
    return mix(lo, hi, t);
}

// ============================================================================
// HASH / NOISE — from minecraft-sky
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

float fbm(vec2 p) {
    return sn(p)              * 0.500
         + sn(p * 2.1 + 1.73) * 0.250
         + sn(p * 4.3 + 3.51) * 0.125
         + sn(p * 8.7 + 7.13) * 0.125;
}

// ============================================================================
// CLOUD DENSITY — minecraft blocky clouds
// ============================================================================
float cloudDensity(vec2 wp, float res, float coverage, float scale) {
    vec2 bid = floor(wp * res);
    float n = fbm(bid * scale);
    return smoothstep(1.0 - coverage, 1.0 - coverage + 0.10, n);
}

// ============================================================================
// PERSPECTIVE CLOUDS — from minecraft-sky
// ============================================================================
vec2 cloudWorldPos(vec2 uv, float H, float aspect, float HORIZ) {
    float ty = uv.y - HORIZ;
    float dist = H / max(ty, 0.0015);
    return vec2((uv.x - 0.5) * dist * aspect, dist);
}

vec4 perspClouds(vec2 uv, float aspect) {
    float HORIZ = HORIZON_Y;
    float H_BASE = 0.38;

    float ty = uv.y - HORIZ;
    if (ty < 0.003) return vec4(0.0);

    vec2 wp = cloudWorldPos(uv, H_BASE, aspect, HORIZ);
    wp.x += iTime * DRIFT_SPEED;

    float d = cloudDensity(wp, 4.0, CLOUD_COVERAGE, CLOUD_SCALE);
    if (d < 0.5) return vec4(0.0);

    float eps = max(ty * 0.09, 0.004);
    vec2 wpAbove = cloudWorldPos(vec2(uv.x, uv.y + eps), H_BASE, aspect, HORIZ);
    wpAbove.x += iTime * DRIFT_SPEED;
    bool topFace = cloudDensity(wpAbove, 4.0, CLOUD_COVERAGE, CLOUD_SCALE) < 0.5;

    // Synthwave cloud coloring — fur material instead of white/gray
    float sunElev = sin(DAY_CYCLE * 2.0 * PI);
    float daylight = smoothstep(-0.15, 0.20, sunElev);

    // Top face: fur coat colors cycling white↔pink
    float fur_t = topFace ? 0.8 : 0.3;
    vec3 dayCol = matFur(fur_t, wp.x * 0.1);

    // Night: deep purple tones
    vec3 nightTop = hsl2rgb(vec3(0.82, 0.4, 0.14));
    vec3 nightBot = hsl2rgb(vec3(0.78, 0.3, 0.07));
    vec3 nightCol = topFace ? nightTop : nightBot;

    vec3 col = mix(nightCol, dayCol, daylight);

    // Chrome shimmer on top face edges
    float shimmer = 1.0 + sin(wp.x * 4.5 + iTime * 1.8) * 0.04;
    if (topFace) col *= shimmer;

    // Aerial perspective
    float dist = H_BASE / max(ty, 0.0015);
    float fog = exp(-max(dist - 0.7, 0.0) * 0.28);

    return vec4(col, d * fog);
}

// ============================================================================
// SKY GRADIENT — synthwave palette instead of natural sky
// ============================================================================
vec3 interp4(vec3 a, vec3 b, vec3 d, vec3 e, float c) {
    if (c < 0.25) return mix(a, b, smoothstep(0.0,  0.25, c));
    if (c < 0.50) return mix(b, d, smoothstep(0.25, 0.50, c));
    if (c < 0.75) return mix(d, e, smoothstep(0.50, 0.75, c));
    return mix(e, a, smoothstep(0.75, 1.0, c));
}

vec3 skyZenith(float c) {
    return interp4(
        vec3(0.06, 0.02, 0.12),  // sunrise — deep purple
        vec3(0.15, 0.05, 0.25),  // noon — rich plum
        vec3(0.08, 0.02, 0.18),  // sunset — dark violet
        vec3(0.01, 0.01, 0.04),  // midnight — near black
        c);
}

vec3 skyMid(float c) {
    return interp4(
        vec3(0.20, 0.06, 0.30),  // sunrise — magenta-purple
        vec3(0.25, 0.08, 0.35),  // noon — synthwave purple
        vec3(0.18, 0.04, 0.25),  // sunset — deep magenta
        vec3(0.02, 0.01, 0.08),  // midnight — dark
        c);
}

vec3 skyHorizon(float c) {
    return interp4(
        vec3(0.90, 0.40, 0.20),  // sunrise — warm orange-pink
        vec3(0.70, 0.30, 0.50),  // noon — pink-magenta horizon
        vec3(0.95, 0.25, 0.15),  // sunset — hot orange
        vec3(0.04, 0.02, 0.10),  // midnight — dark purple
        c);
}

vec3 getSky(vec2 uv) {
    float c = DAY_CYCLE;
    vec3 top = skyZenith(c);
    vec3 mid = skyMid(c);
    vec3 bot = skyHorizon(c);

    float g1 = pow(clamp(uv.y, 0.0, 1.0), 0.55);
    float g2 = smoothstep(0.22, 0.92, uv.y);
    vec3 sky = mix(bot, mid, g1);
    sky = mix(sky, top, g2);
    return sky;
}

// ============================================================================
// SUN / MOON / STARS — synthwave-styled
// ============================================================================
vec3 drawSun(vec2 uv, vec2 pos, float vis) {
    float aspect = iResolution.x / iResolution.y;
    float halfSz = 0.050;
    vec2 diff = (uv - pos) * vec2(aspect, 1.0);
    float dist = length(diff);
    float normDist = dist / halfSz;

    // Synthwave sun: hot pink/orange instead of yellow
    float horiz = pow(max(0.0, 1.0 - pos.y * 2.0), 2.0);
    vec3 innerCol = mix(matHot(), hsl2rgb(vec3(0.93, 0.95, 0.72)), 0.3);
    vec3 glowCol = matHot();

    float glow1 = exp(-normDist * 1.2) * 0.55;
    float glow2 = exp(-normDist * 3.5) * 0.30;
    float glow3 = exp(-normDist * 0.4) * 0.18;

    // God rays from the sun — fan pattern like dubstep-daddy eyes
    float ang = atan(diff.y, diff.x);
    float fan = pow(abs(cos(ang * 6.0 + iTime * 0.06)), 14.0);
    float fan2 = pow(abs(cos(ang * 6.0 - iTime * 0.05 + 1.3)), 14.0);
    float rayFall = exp(-normDist * 0.6);
    float upBias = smoothstep(-0.5, 0.3, diff.y / max(dist, 0.001));
    float god_rays = (fan + fan2 * 0.5) * rayFall * upBias * 0.35;

    vec2 sunUV = diff / (halfSz * 2.0) + 0.5;
    float inSquare = (sunUV.x > 0.0 && sunUV.x < 1.0 &&
                      sunUV.y > 0.0 && sunUV.y < 1.0) ? 1.0 : 0.0;

    vec3 disc = innerCol * inSquare * vis;
    vec3 glow = glowCol * (glow1 + glow2 + glow3) * vis;
    vec3 rays = matHot() * god_rays * vis;

    return disc + glow + rays;
}

vec3 drawMoon(vec2 uv, vec2 pos, float vis) {
    float aspect = iResolution.x / iResolution.y;
    float halfSz = 0.052;
    vec2 diff = (uv - pos) * vec2(aspect, 1.0);
    float dist = length(diff);
    float normDist = dist / halfSz;

    // Chrome-tinted moon glow
    float glow = (exp(-normDist * 2.8) * 0.30 + exp(-normDist * 8.0) * 0.10) * vis;

    vec2 moonUV = diff / (halfSz * 2.0) + 0.5;
    if (moonUV.x < 0.0 || moonUV.x > 1.0 || moonUV.y < 0.0 || moonUV.y > 1.0)
        return glow * matChrome() * 0.6;

    // Simple moon face
    vec2 p = floor(clamp(moonUV, 0.001, 0.999) * 8.0);
    float gray = 0.62;
    float r = p.y;
    float brightness = 1.0;
    if (r > 0.5 && r < 6.5) {
        float c = p.x;
        if ((abs(r - 2.0) < 0.5 && c > 1.5 && c < 3.5) ||
            (abs(r - 3.0) < 0.5 && c > 1.5 && c < 4.5) ||
            (abs(r - 4.0) < 0.5 && c > 2.5 && c < 4.5))
            brightness = gray;
    }

    vec3 moonCol = matChrome() * 0.5 * brightness;
    return moonCol * vis + glow * matChrome() * 0.6;
}

float starField(vec2 uv, float nightness) {
    if (nightness < 0.01) return 0.0;
    vec2 g = fract(uv * 58.0);
    vec2 id = floor(uv * 58.0);
    float r = h2(id);
    if (r < 0.93) return 0.0;
    float twinkle = 0.55 + 0.45 * sin(iTime * (1.2 + r * 5.0) + r * 100.0);
    float d = length(g - 0.5);
    return smoothstep(0.14, 0.0, d) * twinkle * nightness;
}

vec3 getCelestial(vec2 uv) {
    float c = DAY_CYCLE;
    float arcH = 1.0 - HORIZON_Y - 0.06;

    float sunAng = c * PI;
    vec2 sunPos = vec2(0.5 + cos(sunAng) * 0.38, HORIZON_Y + sin(sunAng) * arcH);
    float sunVis = smoothstep(0.0, 0.06, c) * (1.0 - smoothstep(0.44, 0.50, c));

    float mc = max(c - 0.5, 0.0);
    vec2 moonPos = vec2(0.5 + cos(mc * PI) * 0.38, HORIZON_Y + sin(mc * PI) * arcH);
    float c2 = fract(c + 0.5);
    float moonVis = smoothstep(0.0, 0.06, c2) * (1.0 - smoothstep(0.44, 0.50, c2));

    float sunElev = sin(c * 2.0 * PI);
    float nightness = smoothstep(0.05, -0.25, sunElev);
    float aboveHoriz = smoothstep(HORIZON_Y, HORIZON_Y + 0.07, uv.y);
    float aspect = iResolution.x / iResolution.y;

    // Stars tinted pink/chrome instead of pure white
    vec3 starCol = mix(vec3(0.85, 0.90, 1.00), matChrome() * 0.5, 0.3);

    vec3 result = vec3(0.0);
    result += starCol * starField(vec2(uv.x * aspect, uv.y), nightness) * aboveHoriz;
    result += drawSun(uv, sunPos, sunVis);
    result += drawMoon(uv, moonPos, moonVis);
    return result;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // ---- SKY ----
    vec3 col = getSky(uv);
    col += getCelestial(uv);

    // ---- CLOUDS ----
    vec4 cloud = perspClouds(uv, aspect);
    if (cloud.a > 0.01) {
        // Chrome rim on cloud top edges
        col = mix(col, cloud.rgb, cloud.a * 0.96);
    }

    // ---- FEEDBACK ----
    float shift = DRIFT_SPEED * 0.45 / 60.0;
    vec2 fbUV = uv - vec2(shift, 0.0);
    vec3 prev = getLastFrameColor(clamp(fbUV, 0.001, 0.999)).rgb;
    col = mix(prev * 0.91, col, 0.30);

    // ---- VIGNETTE ----
    vec2 vc = uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.36;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
