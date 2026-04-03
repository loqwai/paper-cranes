// @fullscreen: true
// @mobile: false
// @tags: minecraft, blackhole, singularity, warp, distortion, knobs, gravitational-lens
// @favorite: true

// ============================================================================
// KNOB MAP
// ============================================================================
//
//  knob_1   Black hole X position         (0=left edge, 0.5=center, 1=right)
//  knob_2   Black hole Y position         (0=bottom, 0.5=center, 1=top)
//  knob_3   Gravity / warp strength       (0=none, 1=extreme pull)
//  knob_4   Twist / swirl angle           (0=none, 1=full 2.5-turn spiral)
//  knob_5   Event horizon radius          (size of the most-distorted core)
//  knob_6   Chromatic aberration          (0=none, 1=rainbow splitting)
//  knob_7   Accretion disk radius         (how far out the glow ring sits)
//  knob_8   Accretion disk brightness     (0=invisible, 1=blazing)
//  knob_9   Warp falloff                  (0=wide field, 1=tight core only)
//  knob_10  Disk color spin speed         (0=static, 1=fast spin)
//  knob_11  Feedback persistence          (longer = more temporal smearing)
//  knob_14  Beat-reactive twist boost     (extra spiral kick on every beat)
//  knob_15  Secondary ripple field        (adds wobbly interference on top)
//  knob_16  Disk hue offset               (shifts the entire color wheel)
//  knob_17  Audio → gravity modulation    (bass pulses the warp strength)
//  knob_18  Horizon inner glow            (bright core at the singularity)
//  knob_19  Sky color bleed into disk     (disk adopts current sky colors)
//  knob_20  Lens flare streaks            (adds radial light streaks)
// ============================================================================

#define PI  3.14159265359
#define TAU 6.28318530718

// ============================================================================
// DERIVED KNOB PARAMETERS
// ============================================================================

#define BH_POS        vec2(knob_1, knob_2)

// Gravity: quadratic response for fine low-end control, extreme highs
#define BH_GRAVITY    (knob_3 * knob_3 * 0.22 + bassZScore * knob_17 * 0.03)

// Total twist angle in radians (plus beat kick)
#define BH_TWIST      (knob_4 * PI * 2.5 + (beat ? knob_14 * PI * 1.8 : 0.0))

// Event horizon: below this, warp is clamped to prevent feedback singularity
#define BH_HORIZON    max(0.008 + knob_5 * 0.16, 0.008)

// Warp falloff: higher = distortion concentrated near center
#define BH_FALLOFF    (1.5 + knob_9 * 14.0)

// Chromatic aberration: splits RGB channels at different warp amounts
#define BH_ABERR      (knob_6 * 0.65)

// Accretion disk
#define DISK_RADIUS   (0.03 + knob_7 * 0.28)
#define DISK_BRIGHT   (knob_8 * 3.0 * (1.0 + energyNormalized * 0.5))
#define DISK_SPIN     (knob_10 * 1.8)
#define DISK_HUE      (knob_16 + pitchClassNormalized * knob_19 * 0.35)
#define DISK_SHARP    12.0

// Feedback
#define PERSISTENCE   (0.80 + knob_11 * 0.18)

// Secondary ripple distortion
#define RIPPLE_STR    (knob_15 * 0.028)

// Inner glow at the singularity
#define CORE_GLOW     (knob_18 * 3.0)

// Lens flare streak count and brightness
#define FLARE_BRIGHT  (knob_20 * 1.2)

// ============================================================================
// ORIGINAL SKY PARAMETERS (unchanged from minecraft-sky.frag)
// ============================================================================

#define CLOUD_COVERAGE (0.44 + bassMedian * 0.16)
#define DRIFT_SPEED    (0.012 + energyMean * 0.016)
#define CLOUD_BRIGHT   (0.90 + trebleMedian * 0.12)
#define DAY_CYCLE      fract(iTime * 0.0067 + spectralCentroidMean * 0.08)
#define SKY_HUE_SHIFT  (pitchClassNormalized * 0.14)
#define SKY_GLOW       (energyNormalized * 0.10)
#define STORM_DARK     (spectralRoughnessNormalized * 0.18)
#define CLOUD_BREATHE  (midsNormalized * 0.010 - 0.005)
#define BEAT_POP       (beat ? 1.10 : 1.0)
#define SHIMMER_AMT    (spectralFluxMean * 0.06)
#define CLOUD_SCALE    (0.14 + spectralEntropyMedian * 0.10)
#define HORIZON_Y      0.20

// ============================================================================
// HASH / NOISE (from original)
// ============================================================================

float h2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float sn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1,0)), f.x),
               mix(h2(i + vec2(0,1)), h2(i + vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
    return sn(p)               * 0.500
         + sn(p * 2.1 + 1.73) * 0.250
         + sn(p * 4.3 + 3.51) * 0.125
         + sn(p * 8.7 + 7.13) * 0.125;
}

// ============================================================================
// CLOUDS (from original — unmodified)
// ============================================================================

float cloudDensity(vec2 wp, float res, float coverage, float scale) {
    vec2 bid = floor(wp * res);
    float n  = fbm(bid * scale);
    return smoothstep(1.0 - coverage, 1.0 - coverage + 0.10, n);
}

vec2 cloudWorldPos(vec2 uv, float H, float aspect, float HORIZ) {
    float ty   = uv.y - HORIZ;
    float dist = H / max(ty, 0.0015);
    return vec2((uv.x - 0.5) * dist * aspect, dist);
}

vec4 perspClouds(vec2 uv, float aspect) {
    float HORIZ  = HORIZON_Y;
    float H_BASE = 0.38;

    float ty = uv.y - HORIZ;
    if (ty < 0.003) return vec4(0.0);

    vec2 wp = cloudWorldPos(uv, H_BASE, aspect, HORIZ);
    wp.x += iTime * DRIFT_SPEED;

    float d = cloudDensity(wp, 4.0, CLOUD_COVERAGE, CLOUD_SCALE);
    if (d < 0.5) return vec4(0.0);

    float eps    = max(ty * 0.09, 0.004);
    vec2 wpAbove = cloudWorldPos(vec2(uv.x, uv.y + eps), H_BASE, aspect, HORIZ);
    wpAbove.x   += iTime * DRIFT_SPEED;
    bool topFace = cloudDensity(wpAbove, 4.0, CLOUD_COVERAGE, CLOUD_SCALE) < 0.5;

    float sunElev  = sin(DAY_CYCLE * 2.0 * PI);
    float daylight = smoothstep(-0.15, 0.20, sunElev);

    vec3 topDay   = vec3(CLOUD_BRIGHT) * mix(vec3(1.0), vec3(0.88, 0.92, 0.98), 0.18);
    vec3 botDay   = mix(vec3(0.74, 0.77, 0.83), vec3(0.40, 0.42, 0.50), STORM_DARK);
    vec3 topNight = vec3(0.14, 0.17, 0.28);
    vec3 botNight = vec3(0.07, 0.08, 0.16);

    vec3 faceTop = mix(topNight, topDay,  daylight);
    vec3 faceBot = mix(botNight, botDay,  daylight);

    float shimmer = 1.0 + SHIMMER_AMT * sin(wp.x * 4.5 + iTime * 1.8);
    vec3 col = topFace ? faceTop * shimmer : faceBot;

    float fog = exp(-max(H_BASE / max(ty, 0.0015) - 0.7, 0.0) * 0.28);
    return vec4(col, d * fog);
}

// ============================================================================
// SKY GRADIENT (from original — unmodified)
// ============================================================================

vec3 interp4(vec3 a, vec3 b, vec3 d, vec3 e, float c) {
    if (c < 0.25) return mix(a, b, smoothstep(0.0,  0.25, c));
    if (c < 0.50) return mix(b, d, smoothstep(0.25, 0.50, c));
    if (c < 0.75) return mix(d, e, smoothstep(0.50, 0.75, c));
    return mix(e, a, smoothstep(0.75, 1.0, c));
}

vec3 skyZenith(float c) {
    return interp4(
        vec3(0.04, 0.06, 0.22), vec3(0.22, 0.50, 0.90),
        vec3(0.07, 0.04, 0.20), vec3(0.01, 0.01, 0.07), c);
}

vec3 skyMid(float c) {
    return interp4(
        vec3(0.18, 0.16, 0.50), vec3(0.36, 0.62, 0.96),
        vec3(0.24, 0.08, 0.22), vec3(0.02, 0.03, 0.13), c);
}

vec3 skyHorizon(float c) {
    return interp4(
        vec3(1.00, 0.65, 0.22), vec3(0.58, 0.78, 1.00),
        vec3(1.00, 0.38, 0.04), vec3(0.03, 0.04, 0.16), c);
}

vec3 getSky(vec2 uv) {
    float c = DAY_CYCLE;
    float g1 = pow(clamp(uv.y, 0.0, 1.0), 0.55);
    float g2 = smoothstep(0.22, 0.92, uv.y);
    vec3 sky = mix(skyHorizon(c), skyMid(c), g1);
    sky = mix(sky, skyZenith(c), g2);

    vec3 hsl = rgb2hsl(sky);
    hsl.x = fract(hsl.x + SKY_HUE_SHIFT);
    sky = hsl2rgb(hsl);

    sky *= 1.0 + SKY_GLOW;
    sky  = mix(sky, vec3(0.22, 0.24, 0.28), STORM_DARK * 0.85);
    return sky;
}

// ============================================================================
// SUN, MOON, STARS (from original — unmodified)
// ============================================================================

vec3 drawSun(vec2 uv, vec2 pos, float vis) {
    float aspect = iResolution.x / iResolution.y;
    float halfSz = 0.050;
    vec2 diff = (uv - pos) * vec2(aspect, 1.0);
    float dist = length(diff);
    float nd = dist / halfSz;

    float horiz = pow(max(0.0, 1.0 - pos.y * 2.0), 2.0);
    vec3 innerCol = mix(vec3(1.00, 0.98, 0.90), vec3(1.00, 0.80, 0.30), horiz);
    vec3 glowCol  = mix(vec3(1.00, 0.75, 0.20), vec3(0.95, 0.35, 0.05), horiz);

    vec2 sunUV = diff / (halfSz * 2.0) + 0.5;
    float inSquare = (sunUV.x > 0.0 && sunUV.x < 1.0 &&
                      sunUV.y > 0.0 && sunUV.y < 1.0) ? 1.0 : 0.0;

    vec3 disc = innerCol * inSquare * vis;
    vec3 glow = glowCol * (exp(-nd*1.2)*0.55 + exp(-nd*3.5)*0.30 + exp(-nd*0.4)*0.18) * vis;
    return disc + glow;
}

float moonTexture(vec2 uv) {
    vec2 p = floor(clamp(uv, 0.001, 0.999) * 8.0);
    float c = p.x, r = p.y;
    float gray = 0.62;
    if (r < 0.5 || r > 6.5) return 1.0;
    if (abs(r-1.0)<0.5) return (c>4.5&&c<6.5) ? gray : 1.0;
    if (abs(r-2.0)<0.5) return ((c>1.5&&c<3.5)||(c>4.5&&c<6.5)) ? gray : 1.0;
    if (abs(r-3.0)<0.5) return (c>1.5&&c<4.5) ? gray : 1.0;
    if (abs(r-4.0)<0.5) return ((c>0.5&&c<1.5)||(c>2.5&&c<4.5)||(c>5.5&&c<6.5)) ? gray : 1.0;
    if (abs(r-5.0)<0.5) return ((c>0.5&&c<2.5)||(c>5.5&&c<7.5)) ? gray : 1.0;
    return (c>1.5&&c<3.5) ? gray : 1.0;
}

vec3 drawMoon(vec2 uv, vec2 pos, float vis) {
    float aspect = iResolution.x / iResolution.y;
    float halfSz = 0.052;
    vec2 diff = (uv - pos) * vec2(aspect, 1.0);
    float dist = length(diff);
    float nd = dist / halfSz;
    float glow = (exp(-nd*2.8)*0.30 + exp(-nd*8.0)*0.10) * vis;

    vec2 moonUV = diff / (halfSz * 2.0) + 0.5;
    if (moonUV.x<0.0||moonUV.x>1.0||moonUV.y<0.0||moonUV.y>1.0)
        return glow * vec3(0.82, 0.90, 1.00);

    float brightness = moonTexture(moonUV);
    return vec3(0.90, 0.95, 1.00) * brightness * vis + glow * vec3(0.82, 0.90, 1.00);
}

float starField(vec2 uv, float nightness) {
    if (nightness < 0.01) return 0.0;
    vec2 g  = fract(uv * 58.0);
    vec2 id = floor(uv * 58.0);
    float r = h2(id);
    if (r < 0.93) return 0.0;
    float twinkle = 0.55 + 0.45 * sin(iTime * (1.2 + r * 5.0) + r * 100.0);
    return smoothstep(0.14, 0.0, length(g - 0.5)) * twinkle * nightness;
}

vec3 getCelestial(vec2 uv, float aspect) {
    float c = DAY_CYCLE;
    float arcH = 1.0 - HORIZON_Y - 0.06;

    float sunAng = c * PI;
    vec2  sunPos = vec2(0.5 + cos(sunAng)*0.38, HORIZON_Y + sin(sunAng)*arcH);
    float sunVis = smoothstep(0.0,0.06,c)*(1.0-smoothstep(0.44,0.50,c))*(1.0-STORM_DARK*0.85);

    float mc      = max(c-0.5, 0.0);
    vec2  moonPos = vec2(0.5 + cos(mc*PI)*0.38, HORIZON_Y + sin(mc*PI)*arcH);
    float c2      = fract(c+0.5);
    float moonVis = smoothstep(0.0,0.06,c2)*(1.0-smoothstep(0.44,0.50,c2))*(1.0-STORM_DARK*0.60);

    float sunElev   = sin(c * 2.0 * PI);
    float nightness = smoothstep(0.05, -0.25, sunElev);
    float aboveH    = smoothstep(HORIZON_Y, HORIZON_Y+0.07, uv.y);

    vec3 result = vec3(0.0);
    result += vec3(0.85, 0.90, 1.00) * starField(vec2(uv.x*aspect, uv.y), nightness) * aboveH;
    result += drawSun(uv, sunPos, sunVis);
    result += drawMoon(uv, moonPos, moonVis);
    return result;
}

// ============================================================================
// BLACK HOLE — GRAVITATIONAL LENS WARP
// ============================================================================

// Returns UV to sample from the previous frame, warped by gravity + twist.
// Applies chromatic aberration by sampling three offsets for R, G, B.
vec3 gravitationalSample(vec2 uv, vec2 bhPos, float aspect) {
    vec2 delta   = uv - bhPos;
    vec2 deltaAC = delta * vec2(aspect, 1.0);  // aspect-corrected space
    float dist   = length(deltaAC);
    float rawAng = atan(deltaAC.y, deltaAC.x); // angle to black hole center

    // Warp magnitude: falls off with distance, clamped at event horizon
    float warpMag = BH_GRAVITY / (max(dist, BH_HORIZON) * (1.0 + dist * BH_FALLOFF));

    // Twist: spiral rotation, exponentially decaying with distance
    float twistAng = BH_TWIST * exp(-dist * BH_FALLOFF * 0.25);
    float warpAng  = rawAng + twistAng;

    // Secondary ripple modulates the warp angle
    float ripple = sin(dist * 28.0 - iTime * 1.8 + rawAng * 2.5) * RIPPLE_STR
                 + cos(dist * 19.0 + iTime * 1.3 + rawAng * 1.7) * RIPPLE_STR * 0.6;

    // Warp vector in UV space (un-apply aspect correction)
    vec2 warpVec = vec2(cos(warpAng), sin(warpAng)) * warpMag / vec2(aspect, 1.0);
    warpVec += vec2(ripple / aspect, ripple);

    // Chromatic aberration: R pulled farther toward BH, B pulled less
    float ab = BH_ABERR;
    vec3 prevR = getLastFrameColor(clamp(uv + warpVec * (1.0 + ab), 0.001, 0.999)).rgb;
    vec3 prevG = getLastFrameColor(clamp(uv + warpVec,              0.001, 0.999)).rgb;
    vec3 prevB = getLastFrameColor(clamp(uv + warpVec * (1.0 - ab), 0.001, 0.999)).rgb;

    return vec3(prevR.r, prevG.g, prevB.b);
}

// ============================================================================
// ACCRETION DISK — colorful glow ring around the singularity
// ============================================================================

vec3 accretionDisk(vec2 uv, vec2 bhPos, float aspect, vec3 skySeed) {
    vec2  delta  = (uv - bhPos) * vec2(aspect, 1.0);
    float dist   = length(delta);
    float angle  = atan(delta.y, delta.x);

    // Gaussian ring centered at DISK_RADIUS
    float ring = exp(-pow((dist - DISK_RADIUS) * DISK_SHARP, 2.0));

    // Color: rotates around ring based on angle + time + audio
    float hue = fract(angle / TAU + DISK_HUE + iTime * DISK_SPIN
                     + spectralCentroidNormalized * 0.2);

    // Option to bleed sky color into the disk
    vec3 skyhsl = rgb2hsl(skySeed);
    float bleedHue = mix(hue, skyhsl.x, knob_19 * 0.5);

    vec3 diskColor = hsl2rgb(vec3(bleedHue, 0.92, 0.58));

    // Doppler-ish brightness variation around ring (brighter on "approaching" side)
    float dopplerMod = 0.7 + 0.3 * sin(angle + iTime * DISK_SPIN * TAU);

    float brightness = ring * DISK_BRIGHT * dopplerMod;
    return diskColor * brightness;
}

// ============================================================================
// SINGULARITY CORE — inner glow at the center point
// ============================================================================

vec3 singularityGlow(vec2 uv, vec2 bhPos, float aspect) {
    vec2  delta = (uv - bhPos) * vec2(aspect, 1.0);
    float dist  = length(delta);

    // Hot white-blue core
    float core = exp(-dist * 60.0 / max(BH_HORIZON, 0.01));
    vec3 coreColor = mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 1.0, 1.0), core * 0.8);

    // Outer colored corona
    float corona = exp(-dist * 20.0 / max(BH_HORIZON * 2.5, 0.01)) * 0.4;
    float hue = fract(DISK_HUE + 0.6 + iTime * DISK_SPIN * 0.4 + energyNormalized * 0.15);
    vec3 coronaColor = hsl2rgb(vec3(hue, 1.0, 0.65));

    return (coreColor * core + coronaColor * corona) * CORE_GLOW;
}

// ============================================================================
// LENS FLARE STREAKS — light streaks radiating from the singularity
// ============================================================================

vec3 lensFlare(vec2 uv, vec2 bhPos, float aspect) {
    vec2  delta  = (uv - bhPos) * vec2(aspect, 1.0);
    float dist   = length(delta);
    float angle  = atan(delta.y, delta.x);

    // 6-point star pattern
    float streaks = 0.0;
    for (int i = 0; i < 6; i++) {
        float spokeAngle = float(i) * PI / 3.0 + iTime * 0.08;
        float angleDiff = abs(mod(angle - spokeAngle + PI, TAU) - PI);
        float spoke = smoothstep(0.12, 0.0, angleDiff);
        streaks += spoke * exp(-dist * 6.0);
    }

    float hue = fract(DISK_HUE + angle / TAU + iTime * DISK_SPIN * 0.5);
    vec3 flareColor = hsl2rgb(vec3(hue, 0.7, 0.65));

    float intensity = streaks * FLARE_BRIGHT * (1.0 + energyNormalized * 0.4);
    if (beat) intensity *= 1.0 + knob_14 * 1.2;

    return flareColor * intensity;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2  uv     = fragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    vec2  bhPos  = BH_POS;

    // ── CURRENT SKY (original, unmodified) ──────────────────────────────────
    vec3 sky = getSky(uv);
    sky += getCelestial(uv, aspect);

    vec4 cloud = perspClouds(uv, aspect);
    if (cloud.a > 0.01) sky = mix(sky, cloud.rgb, cloud.a * 0.96);

    sky *= BEAT_POP;

    // ── GRAVITATIONAL LENS WARP (frame feedback through BH) ─────────────────
    // Only active when knob_3 (gravity) is non-zero
    vec3 warped = gravitationalSample(uv, bhPos, aspect);

    // Blend sky with gravitationally warped previous frame.
    // When knob_3=0 (BH_GRAVITY≈0), warp offsets are zero → warped ≈ prev frame
    // so we need to gate on actual gravity being present.
    float bhActive = smoothstep(0.0, 0.005, BH_GRAVITY);

    // Base: original sky, no feedback
    // With black hole active: mix in warped feedback
    vec3 col = mix(sky, mix(warped * PERSISTENCE, sky, 0.25), bhActive);

    // ── ACCRETION DISK ───────────────────────────────────────────────────────
    // Needs DISK_BRIGHT > 0 (knob_8) to be visible
    col += accretionDisk(uv, bhPos, aspect, sky);

    // ── SINGULARITY CORE GLOW ────────────────────────────────────────────────
    col += singularityGlow(uv, bhPos, aspect);

    // ── LENS FLARE STREAKS ───────────────────────────────────────────────────
    col += lensFlare(uv, bhPos, aspect);

    // ── VIGNETTE ─────────────────────────────────────────────────────────────
    vec2 vc = uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.36;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
