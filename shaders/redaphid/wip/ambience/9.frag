// @fullscreen: true
// @mobile: true
// Synthwave aurora — minecraft-sky's peaceful structure + dubstep-daddy's full palette
#define PI 3.14159265359

#define DAY_CYCLE fract(iTime * 0.0067)
#define DRIFT (iTime * 0.03)
#define PULSE (sin(iTime * 0.2) * 0.5 + 0.5)

// ============================================================================
// NOISE — from minecraft-sky
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
// MATERIALS — verbatim from dubstep-daddy-fur-coat.frag
// ============================================================================
#define HUE_BASE 0.78

vec3 matChrome() { return hsl2rgb(vec3(fract(HUE_BASE + 0.05), 1.0, 0.65)); }
vec3 matHot()    { return hsl2rgb(vec3(0.08, 1.0, 0.6)); }
vec3 matLeather(){ return hsl2rgb(vec3(HUE_BASE, 0.8, 0.10)); }
vec3 matSkin()   { return hsl2rgb(vec3(0.92, 0.45, 0.18)); }
vec3 matHair()   { return hsl2rgb(vec3(0.06, 0.7, 0.12)); }
vec3 matGleam()  { return vec3(0.15, 0.08, 0.18); }

vec3 matFur(float t, float phase) {
    float cycle = sin(iTime * 0.08 + phase) * 0.5 + 0.5;
    vec3 white_hi = hsl2rgb(vec3(0.93, 0.15, 0.85));
    vec3 white_lo = hsl2rgb(vec3(0.90, 0.10, 0.75));
    vec3 pink_hi  = hsl2rgb(vec3(0.93, 0.95, 0.72));
    vec3 pink_lo  = hsl2rgb(vec3(0.86, 0.9, 0.55));
    return mix(mix(white_lo, pink_lo, cycle), mix(white_hi, pink_hi, cycle), t);
}

// ============================================================================
// SKY — synthwave day/night cycle, peaceful gradient
// ============================================================================
vec3 interp4(vec3 a, vec3 b, vec3 d, vec3 e, float c) {
    if (c < 0.25) return mix(a, b, smoothstep(0.0,  0.25, c));
    if (c < 0.50) return mix(b, d, smoothstep(0.25, 0.50, c));
    if (c < 0.75) return mix(d, e, smoothstep(0.50, 0.75, c));
    return mix(e, a, smoothstep(0.75, 1.0, c));
}

vec3 getSky(vec2 uv) {
    float c = DAY_CYCLE;

    vec3 top = interp4(
        vec3(0.06, 0.02, 0.12), vec3(0.15, 0.05, 0.25),
        vec3(0.08, 0.02, 0.18), vec3(0.01, 0.01, 0.04), c);
    vec3 mid = interp4(
        vec3(0.20, 0.06, 0.30), vec3(0.25, 0.08, 0.35),
        vec3(0.18, 0.04, 0.25), vec3(0.02, 0.01, 0.08), c);
    vec3 bot = interp4(
        vec3(0.90, 0.40, 0.20), vec3(0.70, 0.30, 0.50),
        vec3(0.95, 0.25, 0.15), vec3(0.04, 0.02, 0.10), c);

    float g1 = pow(clamp(uv.y, 0.0, 1.0), 0.55);
    float g2 = smoothstep(0.22, 0.92, uv.y);
    vec3 sky = mix(bot, mid, g1);
    return mix(sky, top, g2);
}

// Stars — chrome-tinted
float starField(vec2 uv, float nightness) {
    if (nightness < 0.01) return 0.0;
    vec2 g = fract(uv * 58.0);
    vec2 id = floor(uv * 58.0);
    float r = h2(id);
    if (r < 0.93) return 0.0;
    float twinkle = 0.55 + 0.45 * sin(iTime * (1.2 + r * 5.0) + r * 100.0);
    return smoothstep(0.14, 0.0, length(g - 0.5)) * twinkle * nightness;
}

// ============================================================================
// WAVE PATH — smooth with time-varying impossible distortion
// ============================================================================
float wavePath(float x, float y0, float amp, float freq, float phase) {
    float path = y0
        + sin(x * freq + DRIFT * 2.0 + phase) * amp
        + sin(x * freq * 1.6 + DRIFT * 1.4 + phase * 0.6) * amp * 0.3;

    float swirl = pow(sin(iTime * 0.05 + phase * 0.4) * 0.5 + 0.5, 1.5);
    path += (fbm(vec2(x * 1.5 + DRIFT * 0.6, phase * 0.3 + iTime * 0.02)) - 0.5) * swirl * 0.18;

    // Wandering whorl — localized impossible curve
    float whorl_x = sin(iTime * 0.03 + phase * 1.3) * 0.5;
    float locality = exp(-pow((x - whorl_x) * 2.0, 2.0));
    path += sin(fbm(vec2(x * 3.0, iTime * 0.015 + phase)) * PI * 2.0) * locality * swirl * 0.08;

    // Second whorl at different position
    float whorl_x2 = cos(iTime * 0.025 + phase * 0.7) * 0.4;
    float locality2 = exp(-pow((x - whorl_x2) * 2.0, 2.0));
    path += cos(fbm(vec2(x * 2.5, iTime * 0.012 + phase + 3.0)) * PI * 2.0) * locality2 * swirl * 0.06;

    return path;
}

// ============================================================================
// RIBBON RENDERERS
// ============================================================================

// Energy ribbon — thin glowing line
vec3 energyRibbon(vec2 uv, float y0, float amp, float freq, float phase,
                  float width, vec3 tint, float brightness) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;
    float core = exp(-d * d / (width * width * 0.3));
    float glow = exp(-d * d / (width * width * 2.0));
    return tint * (core * brightness + glow * brightness * 0.2);
}

// Fur ribbon — wider, with fur coat material, chrome rim, gleam
vec3 furRibbon(vec2 uv, float y0, float amp, float freq, float phase,
               float width, float fur_phase, float grain, float brightness) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;

    float body = exp(-d * d / (width * width));
    float edge = exp(-d * d / (width * width * 0.15));
    float t = exp(-d * d / (width * width * 0.5));

    vec3 fur_col = matFur(t, fur_phase);
    fur_col += (grain - 0.5) * 0.03 * vec3(1.0, 0.9, 0.95);
    fur_col += edge * matGleam() * 0.6;

    // Chrome rim at the edges
    float rim_d = abs(abs(d) - width * 0.7);
    float rim = exp(-rim_d * rim_d / (width * width * 0.02)) * body;

    // Seam glow at center
    float seam = exp(-d * d * 40000.0) * 0.2 * body;

    vec3 result = fur_col * body * brightness;
    result += rim * matChrome() * 1.0 * brightness;
    result += seam * matChrome() * 0.15 * brightness;
    return result;
}

// Skin ribbon — warm plum tone, soft
vec3 skinRibbon(vec2 uv, float y0, float amp, float freq, float phase,
                float width, float brightness) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;
    float body = exp(-d * d / (width * width));
    float glow = exp(-d * d / (width * width * 3.0));
    return matSkin() * body * brightness + matSkin() * glow * brightness * 0.15;
}

// Hair ribbon — dark warm, subtle
vec3 hairRibbon(vec2 uv, float y0, float amp, float freq, float phase,
                float width, float brightness) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;
    float body = exp(-d * d / (width * width));
    return matHair() * body * brightness;
}

// Leather ribbon — dark base with chrome edge
vec3 leatherRibbon(vec2 uv, float y0, float amp, float freq, float phase,
                   float width, float brightness) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;
    float body = exp(-d * d / (width * width));
    float rim_d = abs(abs(d) - width * 0.6);
    float rim = exp(-rim_d * rim_d / (width * width * 0.03)) * body;
    return matLeather() * body * brightness * 3.0 + matChrome() * rim * brightness * 0.4;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 raw_uv = fragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // Global domain warp — everything swims together, no straight edges
    vec2 uv = raw_uv;
    float warp_str = 0.025 + 0.015 * sin(iTime * 0.07);
    vec2 warp_offset = vec2(
        fbm(uv * 3.0 + vec2(DRIFT * 0.8, 0.0)) - 0.5,
        fbm(uv * 3.0 + vec2(0.0, DRIFT * 0.6 + 5.0)) - 0.5
    ) * warp_str;
    uv += warp_offset;

    // ---- SKY ----
    vec3 col = getSky(uv);

    // Stars at night
    float sunElev = sin(DAY_CYCLE * 2.0 * PI);
    float nightness = smoothstep(0.05, -0.25, sunElev);
    col += mix(vec3(0.85, 0.90, 1.00), matChrome() * 0.5, 0.3)
         * starField(vec2(uv.x * aspect, uv.y), nightness)
         * smoothstep(0.2, 0.27, uv.y);

    // Surface grain for fur bands
    float grain = fbm(uv * 14.0 + DRIFT * 0.15);

    // Daylight factor — ribbons glow brighter during "day"
    float daylight = smoothstep(-0.15, 0.20, sunElev);
    float ribbon_bright = mix(0.4, 1.0, daylight);

    // ---- RIBBONS — all the daddy materials flowing as waves ----
    // Sorted roughly back to front, spread across the lower half of sky

    // Deep back — leather
    col += leatherRibbon(uv, 0.12, 0.03, 0.4, 0.0, 0.04, ribbon_bright * 0.5);

    // Hair ribbon — dark warm accent
    col += hairRibbon(uv, 0.18, 0.04, 0.5, 1.2, 0.03, ribbon_bright * 0.6);

    // Back fur ribbon
    col += furRibbon(uv, 0.25, 0.05, 0.6, 2.5, 0.045, 0.0, grain, ribbon_bright * 0.5);

    // Skin ribbon — warm plum
    col += skinRibbon(uv, 0.32, 0.06, 0.45, 3.8, 0.03, ribbon_bright * 0.6);

    // Hot energy accent
    col += energyRibbon(uv, 0.36, 0.07, 0.5, 4.5, 0.01, matHot(), ribbon_bright * 0.5);

    // Hero fur ribbon — brightest, widest
    col += furRibbon(uv, 0.42, 0.06, 0.7, 5.8, 0.06, 2.1, grain, ribbon_bright * 0.9);

    // Chrome accent
    col += energyRibbon(uv, 0.50, 0.04, 0.8, 7.0, 0.008, matChrome(), ribbon_bright * 0.4);

    // Upper fur ribbon
    col += furRibbon(uv, 0.56, 0.04, 0.75, 8.5, 0.04, 4.2, grain, ribbon_bright * 0.55);

    // Top skin accent
    col += skinRibbon(uv, 0.63, 0.03, 0.6, 9.5, 0.025, ribbon_bright * 0.35);

    // Thin hot thread at top
    col += energyRibbon(uv, 0.68, 0.03, 0.55, 10.5, 0.005, matHot(), ribbon_bright * 0.25);

    // ---- GOD RAYS — bloom from hero ribbon, fades in/out ----
    {
        float src_x = sin(iTime * 0.02) * 0.3 + 0.5;
        float src_y = wavePath(src_x - 0.5, 0.42, 0.06, 0.7, 5.8);
        vec2 src = vec2(src_x, src_y);
        vec2 dp = uv - src;
        float r = length(dp * vec2(aspect, 1.0));
        float ang = atan(dp.y, dp.x * aspect);

        float fan = pow(abs(cos(ang * 6.0 + iTime * 0.06)), 14.0);
        float fan2 = pow(abs(cos(ang * 6.0 - iTime * 0.05 + 1.3)), 14.0);
        float fall = exp(-r * 2.0);
        float up = smoothstep(-0.6, 0.4, dp.y / max(r, 0.001));
        float bloom = pow(sin(iTime * 0.04) * 0.5 + 0.5, 3.0) * daylight;

        float god_rays = (fan + fan2 * 0.5) * fall * up * bloom * 0.3;
        god_rays += exp(-r * 6.0) * bloom * 0.4;
        col += god_rays * matHot();
    }

    // ---- FEEDBACK ----
    vec2 fbUV = raw_uv - vec2(0.0003, 0.0) + warp_offset * 0.3;
    vec3 prev = getLastFrameColor(clamp(fbUV, 0.001, 0.999)).rgb;
    col = mix(prev * 0.91, col, 0.30);

    // Vignette
    vec2 vc = raw_uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.36;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
