// @fullscreen: true
// @mobile: true
// @tags: south-park, characters, fun, cartoon
// South Park - Audio-reactive construction paper town

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Character bounce: bass makes them hop
#define BOUNCE_AMOUNT (bassZScore * 0.025)
// #define BOUNCE_AMOUNT 0.01

// Sky hue shift: pitch class rotates sunset palette
#define SKY_HUE (pitchClassNormalized * 0.15)
// #define SKY_HUE 0.0

// Aurora glow intensity: energy drives the sky glow
#define GLOW_INTENSITY (energyNormalized * 0.4)
// #define GLOW_INTENSITY 0.2

// Snow speed: spectral flux drives snowfall
#define SNOW_SPEED (0.4 + spectralFluxNormalized * 0.6)
// #define SNOW_SPEED 0.6

// Color vibrance: spectral centroid shifts warmth
#define VIBRANCE (0.8 + spectralCentroidNormalized * 0.3)
// #define VIBRANCE 1.0

// Beat flash
#define BEAT_PULSE (beat ? 1.15 : 1.0)
// #define BEAT_PULSE 1.0

// Mountain wobble from mids
#define MOUNTAIN_WOBBLE (midsZScore * 0.008)
// #define MOUNTAIN_WOBBLE 0.0

// Treble sparkle on snow
#define SPARKLE (trebleNormalized * 0.6)
// #define SPARKLE 0.2

// ============================================================================
// HELPERS
// ============================================================================

float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

// Rounded rectangle SDF
float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Circle SDF
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// Triangle SDF (isoceles)
float sdTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 e0 = b - a, e1 = c - b, e2 = a - c;
    vec2 v0 = p - a, v1 = p - b, v2 = p - c;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                     vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                     vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
}

// Smooth fill
float fill(float d, float aa) {
    return 1.0 - smoothstep(0.0, aa, d);
}

// Stroke
float stroke(float d, float w, float aa) {
    return 1.0 - smoothstep(w - aa, w + aa, abs(d));
}

// ============================================================================
// SOUTH PARK SKY
// ============================================================================

vec3 southParkSky(vec2 uv, float t) {
    // Classic South Park sky gradient: blue to orange/pink sunset
    float skyGrad = uv.y;

    // Base sky colors
    vec3 topColor = vec3(0.15, 0.25, 0.55);    // Deep blue
    vec3 midColor = vec3(0.4, 0.5, 0.75);      // Light blue
    vec3 horizonColor = vec3(0.85, 0.55, 0.35); // Orange horizon

    vec3 sky = mix(horizonColor, midColor, smoothstep(0.3, 0.55, skyGrad));
    sky = mix(sky, topColor, smoothstep(0.55, 0.85, skyGrad));

    // Hue shift from audio
    vec3 skyHSL = rgb2hsl(sky);
    skyHSL.x = fract(skyHSL.x + SKY_HUE);
    skyHSL.y *= VIBRANCE;
    sky = hsl2rgb(skyHSL);

    // Subtle aurora/glow near top from energy
    float auroraShape = smoothstep(0.6, 0.85, uv.y) * sin(uv.x * 6.0 + t * 0.5) * 0.5 + 0.5;
    vec3 auroraColor = hsl2rgb(vec3(fract(0.45 + SKY_HUE), 0.6, 0.4));
    sky += auroraColor * auroraShape * GLOW_INTENSITY;

    return sky;
}

// ============================================================================
// MOUNTAINS
// ============================================================================

vec3 drawMountains(vec2 uv, float t) {
    vec3 col = vec3(0.0);
    float aa = 2.0 / iResolution.y;

    // Back mountains (darker, taller)
    float m1 = 0.45 + 0.12 * sin(uv.x * 3.5 + 1.0) + 0.06 * sin(uv.x * 7.0 + 2.0);
    m1 += MOUNTAIN_WOBBLE * sin(uv.x * 10.0 + t * 2.0);
    float backMtn = fill(uv.y - m1, aa);
    vec3 backColor = vec3(0.35, 0.4, 0.55); // Blue-grey

    // Snow caps on back mountains
    float snowLine1 = m1 - 0.025;
    float snowCap1 = fill(uv.y - snowLine1, aa * 3.0) * step(m1 - 0.04, uv.y);
    backColor = mix(backColor, vec3(0.92, 0.95, 1.0), snowCap1 * 0.7);

    // Front mountains (green, shorter)
    float m2 = 0.35 + 0.08 * sin(uv.x * 4.2 + 0.5) + 0.04 * sin(uv.x * 9.0);
    m2 += MOUNTAIN_WOBBLE * sin(uv.x * 8.0 + t * 1.5 + 1.0);
    float frontMtn = fill(uv.y - m2, aa);
    vec3 frontColor = vec3(0.3, 0.5, 0.35); // Forest green

    // Snow caps on front mountains
    float snowLine2 = m2 - 0.015;
    float snowCap2 = fill(uv.y - snowLine2, aa * 2.0) * step(m2 - 0.03, uv.y);
    frontColor = mix(frontColor, vec3(0.92, 0.95, 1.0), snowCap2 * 0.5);

    col = mix(col, backColor, backMtn);
    col = mix(col, frontColor, frontMtn);

    return col;
}

// ============================================================================
// GROUND / TOWN
// ============================================================================

vec3 drawGround(vec2 uv) {
    vec3 col = vec3(0.0);
    float aa = 2.0 / iResolution.y;

    // Snowy ground
    float groundLevel = 0.22;
    float ground = fill(uv.y - groundLevel, aa);
    vec3 groundColor = vec3(0.88, 0.92, 0.96); // Snow white

    // Road
    float roadCenter = 0.13;
    float roadHalf = 0.025;
    float road = fill(abs(uv.y - roadCenter) - roadHalf, aa);
    vec3 roadColor = vec3(0.3, 0.3, 0.32);

    // Road line (dashed yellow center)
    float lineY = abs(uv.y - roadCenter);
    float dashX = step(0.5, fract(uv.x * 12.0));
    float centerLine = fill(lineY - 0.002, aa) * dashX;

    col = mix(col, groundColor, ground);
    col = mix(col, roadColor, road);
    col = mix(col, vec3(0.9, 0.8, 0.1), centerLine);

    return col;
}

// ============================================================================
// BUILDINGS (simple South Park style)
// ============================================================================

vec3 drawBuildings(vec2 uv) {
    vec3 col = vec3(0.0);
    float aa = 2.0 / iResolution.y;

    // Simple rectangular buildings behind characters
    // Building 1 - left
    vec2 b1 = uv - vec2(0.12, 0.28);
    float bld1 = fill(sdRoundBox(b1, vec2(0.05, 0.06), 0.002), aa);
    col = mix(col, vec3(0.65, 0.35, 0.3), bld1);

    // Window on building 1
    float w1 = fill(sdRoundBox(b1 - vec2(0.0, 0.02), vec2(0.015, 0.015), 0.001), aa);
    col = mix(col, vec3(0.9, 0.85, 0.5), w1);

    // Building 2 - right
    vec2 b2 = uv - vec2(0.88, 0.3);
    float bld2 = fill(sdRoundBox(b2, vec2(0.06, 0.08), 0.002), aa);
    col = mix(col, vec3(0.5, 0.55, 0.7), bld2);

    // Windows on building 2
    float w2a = fill(sdRoundBox(b2 - vec2(-0.02, 0.03), vec2(0.012, 0.012), 0.001), aa);
    float w2b = fill(sdRoundBox(b2 - vec2(0.02, 0.03), vec2(0.012, 0.012), 0.001), aa);
    col = mix(col, vec3(0.9, 0.85, 0.5), max(w2a, w2b));

    // Building 3 - center back (taller)
    vec2 b3 = uv - vec2(0.5, 0.32);
    float bld3 = fill(sdRoundBox(b3, vec2(0.04, 0.1), 0.002), aa);
    col = mix(col, vec3(0.6, 0.6, 0.55), bld3);

    return col;
}

// ============================================================================
// SOUTH PARK CHARACTER
// ============================================================================

vec3 drawCharacter(vec2 uv, vec2 pos, vec3 hatColor, vec3 coatColor, float bounce, float aa) {
    vec3 col = vec3(0.0);
    float alpha = 0.0;

    vec2 p = uv - pos;
    p.y -= bounce;

    // Body (rectangle) - construction paper style
    float body = fill(sdRoundBox(p - vec2(0.0, 0.015), vec2(0.016, 0.022), 0.003), aa);
    col = mix(col, coatColor, body);
    alpha = max(alpha, body);

    // Head (circle) - South Park's round heads
    float head = fill(sdCircle(p - vec2(0.0, 0.05), 0.022), aa);
    vec3 skinColor = vec3(0.95, 0.82, 0.7); // Peach skin
    col = mix(col, skinColor, head);
    alpha = max(alpha, head);

    // Hat (varies per character)
    float hat = fill(sdRoundBox(p - vec2(0.0, 0.068), vec2(0.024, 0.012), 0.003), aa);
    col = mix(col, hatColor, hat);
    alpha = max(alpha, hat);

    // Eyes (two dots) - the classic South Park look
    float eyeL = fill(sdCircle(p - vec2(-0.008, 0.052), 0.006), aa);
    float eyeR = fill(sdCircle(p - vec2(0.008, 0.052), 0.006), aa);
    col = mix(col, vec3(1.0), max(eyeL, eyeR));

    // Pupils (smaller dots)
    float pupilL = fill(sdCircle(p - vec2(-0.007, 0.052), 0.003), aa);
    float pupilR = fill(sdCircle(p - vec2(0.009, 0.052), 0.003), aa);
    col = mix(col, vec3(0.05), max(pupilL, pupilR));

    // Mouth (small line)
    float mouth = fill(sdRoundBox(p - vec2(0.0, 0.04), vec2(0.006, 0.0015), 0.001), aa);
    col = mix(col, vec3(0.15), mouth);

    // Legs (two small rectangles)
    float legL = fill(sdRoundBox(p - vec2(-0.008, -0.008), vec2(0.005, 0.012), 0.001), aa);
    float legR = fill(sdRoundBox(p - vec2(0.008, -0.008), vec2(0.005, 0.012), 0.001), aa);
    vec3 legColor = vec3(0.15, 0.15, 0.18);
    col = mix(col, legColor, max(legL, legR));
    alpha = max(alpha, max(legL, legR));

    // Shoes
    float shoeL = fill(sdRoundBox(p - vec2(-0.008, -0.022), vec2(0.007, 0.004), 0.002), aa);
    float shoeR = fill(sdRoundBox(p - vec2(0.008, -0.022), vec2(0.007, 0.004), 0.002), aa);
    col = mix(col, vec3(0.1), max(shoeL, shoeR));
    alpha = max(alpha, max(shoeL, shoeR));

    // Outline (construction paper look)
    float outline = stroke(sdCircle(p - vec2(0.0, 0.05), 0.023), 0.002, aa);
    outline = max(outline, stroke(sdRoundBox(p - vec2(0.0, 0.015), vec2(0.017, 0.023), 0.003), 0.002, aa));
    col = mix(col, vec3(0.0), outline * alpha);

    return col * alpha;
}

// ============================================================================
// BUS STOP SIGN
// ============================================================================

vec3 drawBusStop(vec2 uv, float aa) {
    vec3 col = vec3(0.0);

    // Post
    vec2 postP = uv - vec2(0.58, 0.2);
    float post = fill(sdRoundBox(postP, vec2(0.003, 0.04), 0.001), aa);
    col = mix(col, vec3(0.4, 0.4, 0.4), post);

    // Sign
    vec2 signP = uv - vec2(0.58, 0.25);
    float sign = fill(sdRoundBox(signP, vec2(0.025, 0.012), 0.002), aa);
    col = mix(col, vec3(0.8, 0.15, 0.1), sign);

    // "BUS" text approximation (3 small dots)
    float dot1 = fill(sdCircle(signP - vec2(-0.01, 0.0), 0.003), aa);
    float dot2 = fill(sdCircle(signP - vec2(0.0, 0.0), 0.003), aa);
    float dot3 = fill(sdCircle(signP - vec2(0.01, 0.0), 0.003), aa);
    col = mix(col, vec3(1.0), max(dot1, max(dot2, dot3)));

    return col;
}

// ============================================================================
// SNOWFALL
// ============================================================================

vec3 drawSnow(vec2 uv, float t) {
    vec3 col = vec3(0.0);

    for (int i = 0; i < 40; i++) {
        float fi = float(i);
        float seed = fi * 0.137;

        float x = fract(hash21(vec2(fi, 0.0)) + sin(t * 0.3 + fi) * 0.05);
        float y = fract(hash21(vec2(fi, 1.0)) - t * SNOW_SPEED * (0.03 + hash21(vec2(fi, 2.0)) * 0.02));

        float size = 0.002 + hash21(vec2(fi, 3.0)) * 0.003;
        float brightness = 0.6 + hash21(vec2(fi, 4.0)) * 0.4;

        // Sparkle from treble
        brightness += SPARKLE * sin(t * 8.0 + fi * 3.0) * 0.3;

        float flake = fill(sdCircle(uv - vec2(x, y), size), 0.002);
        col += vec3(brightness) * flake;
    }

    return col;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    vec2 uvA = vec2(uv.x * aspect, uv.y); // Aspect-corrected for shapes
    float aa = 2.0 / iResolution.y;
    float t = iTime;

    // --- Sky ---
    vec3 col = southParkSky(uv, t);

    // --- Mountains ---
    vec3 mtns = drawMountains(vec2(uv.x, uv.y), t);
    float mtnMask = step(0.001, mtns.r + mtns.g + mtns.b);
    col = mix(col, mtns, mtnMask);

    // --- Buildings (behind characters) ---
    vec3 bldgs = drawBuildings(vec2(uv.x, uv.y));
    float bldgMask = step(0.001, bldgs.r + bldgs.g + bldgs.b);
    col = mix(col, bldgs, bldgMask);

    // --- Bus stop sign ---
    vec3 busStop = drawBusStop(uv, aa);
    float busMask = step(0.001, busStop.r + busStop.g + busStop.b);
    col = mix(col, busStop, busMask);

    // --- Characters at bus stop ---
    // Each character bounces with a phase offset from the bass
    float b1 = max(0.0, BOUNCE_AMOUNT * sin(t * 4.0));
    float b2 = max(0.0, BOUNCE_AMOUNT * sin(t * 4.0 + 1.5));
    float b3 = max(0.0, BOUNCE_AMOUNT * sin(t * 4.0 + 3.0));
    float b4 = max(0.0, BOUNCE_AMOUNT * sin(t * 4.0 + 4.5));

    // Stan - blue hat, brown coat
    vec3 stan = drawCharacter(uv, vec2(0.38, 0.18), vec3(0.2, 0.3, 0.7), vec3(0.45, 0.25, 0.15), b1, aa);

    // Kyle - green hat, orange coat
    vec3 kyle = drawCharacter(uv, vec2(0.44, 0.18), vec3(0.2, 0.6, 0.2), vec3(0.85, 0.5, 0.15), b2, aa);

    // Cartman - yellow/teal hat, red coat
    vec3 cartman = drawCharacter(uv, vec2(0.50, 0.18), vec3(0.3, 0.7, 0.7), vec3(0.75, 0.15, 0.1), b3, aa);

    // Kenny - orange hood
    vec3 kenny = drawCharacter(uv, vec2(0.56, 0.18), vec3(0.9, 0.55, 0.1), vec3(0.9, 0.55, 0.1), b4, aa);

    // Composite characters
    float charMask = step(0.001, stan.r + stan.g + stan.b);
    col = mix(col, stan, charMask);
    charMask = step(0.001, kyle.r + kyle.g + kyle.b);
    col = mix(col, kyle, charMask);
    charMask = step(0.001, cartman.r + cartman.g + cartman.b);
    col = mix(col, cartman, charMask);
    charMask = step(0.001, kenny.r + kenny.g + kenny.b);
    col = mix(col, kenny, charMask);

    // --- Ground / Road ---
    vec3 ground = drawGround(uv);
    float groundMask = step(0.001, ground.r + ground.g + ground.b);
    col = mix(col, ground, groundMask);

    // --- Snow ---
    vec3 snow = drawSnow(uv, t);
    col += snow;

    // Beat pulse flash
    col *= BEAT_PULSE;

    // Construction paper texture - subtle noise
    float paper = hash21(fragCoord.xy * 0.5) * 0.04 - 0.02;
    col += paper;

    // Light vignette
    vec2 vc = uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.3;

    // Slight frame feedback for smoothness
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb * 0.97, col, 0.4);

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
