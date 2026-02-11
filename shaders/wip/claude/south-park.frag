// @fullscreen: true
// @mobile: true
// @tags: south-park, characters, fun, cartoon, colorful
// South Park - Audio-reactive construction paper town
// Optimized for LED screen-scraping: large saturated color regions, strong reactivity

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Character bounce: bass makes them hop
#define BOUNCE_AMOUNT (bassZScore * 0.06)
// #define BOUNCE_AMOUNT 0.02

// Sky hue shift: pitch class rotates the palette dramatically
#define SKY_HUE (pitchClassNormalized * 0.5)
// #define SKY_HUE 0.0

// Sky saturation pulse: energy drives color intensity
#define SKY_SAT (0.7 + energyNormalized * 0.3)
// #define SKY_SAT 0.85

// Aurora glow intensity: treble drives sky glow
#define GLOW_INTENSITY (0.3 + trebleNormalized * 0.7)
// #define GLOW_INTENSITY 0.5

// Snow speed: spectral flux drives snowfall
#define SNOW_SPEED (0.3 + spectralFluxNormalized * 0.7)
// #define SNOW_SPEED 0.5

// Color vibrance: spectral centroid shifts warmth
#define VIBRANCE (0.85 + spectralCentroidNormalized * 0.15)
// #define VIBRANCE 1.0

// Beat flash: strong color wash on beat
#define BEAT_PULSE (beat ? 1.3 : 1.0)
// #define BEAT_PULSE 1.0

// Mountain wobble from mids
#define MOUNTAIN_WOBBLE (midsZScore * 0.015)
// #define MOUNTAIN_WOBBLE 0.0

// Treble sparkle on snow
#define SPARKLE (trebleNormalized * 0.8)
// #define SPARKLE 0.3

// Color wash hue from spectral entropy - big ambient color shifts
#define COLOR_WASH_HUE (spectralEntropyNormalized * 0.3)
// #define COLOR_WASH_HUE 0.0

// Bass throb: scales up the whole scene brightness
#define BASS_THROB (0.85 + bassNormalized * 0.25)
// #define BASS_THROB 1.0

// Ground hue shift from spectral roughness
#define GROUND_HUE (spectralRoughnessNormalized * 0.15)
// #define GROUND_HUE 0.0

// ============================================================================
// HELPERS
// ============================================================================

float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float fill(float d, float aa) {
    return 1.0 - smoothstep(0.0, aa, d);
}

float stroke(float d, float w, float aa) {
    return 1.0 - smoothstep(w - aa, w + aa, abs(d));
}

// ============================================================================
// SOUTH PARK SKY - Bold, saturated, reactive
// ============================================================================

vec3 southParkSky(vec2 uv, float t) {
    float skyGrad = uv.y;

    // Vivid, saturated sky colors
    vec3 topColor = hsl2rgb(vec3(fract(0.6 + SKY_HUE + COLOR_WASH_HUE), SKY_SAT, 0.25));
    vec3 midColor = hsl2rgb(vec3(fract(0.55 + SKY_HUE + COLOR_WASH_HUE), SKY_SAT, 0.45));
    vec3 horizonColor = hsl2rgb(vec3(fract(0.08 + SKY_HUE + COLOR_WASH_HUE), SKY_SAT, 0.55));

    vec3 sky = mix(horizonColor, midColor, smoothstep(0.3, 0.55, skyGrad));
    sky = mix(sky, topColor, smoothstep(0.55, 0.85, skyGrad));

    // Bold aurora bands - large saturated color regions great for LEDs
    float aurora1 = smoothstep(0.55, 0.7, uv.y) * smoothstep(0.9, 0.7, uv.y);
    aurora1 *= 0.5 + 0.5 * sin(uv.x * 4.0 + t * 0.8);
    vec3 auroraCol1 = hsl2rgb(vec3(fract(0.3 + SKY_HUE), 0.9, 0.5));
    sky += auroraCol1 * aurora1 * GLOW_INTENSITY;

    float aurora2 = smoothstep(0.65, 0.8, uv.y) * smoothstep(0.95, 0.8, uv.y);
    aurora2 *= 0.5 + 0.5 * sin(uv.x * 3.0 - t * 0.6 + 2.0);
    vec3 auroraCol2 = hsl2rgb(vec3(fract(0.75 + SKY_HUE), 0.85, 0.45));
    sky += auroraCol2 * aurora2 * GLOW_INTENSITY * 0.7;

    // Big color pulse on beat - washes the whole sky
    if (beat) {
        vec3 beatColor = hsl2rgb(vec3(fract(SKY_HUE + 0.15), 0.95, 0.6));
        sky = mix(sky, beatColor, 0.25);
    }

    return sky;
}

// ============================================================================
// MOUNTAINS - More colorful, saturated
// ============================================================================

vec3 drawMountains(vec2 uv, float t) {
    vec3 col = vec3(0.0);
    float aa = 2.0 / iResolution.y;

    // Back mountains - purple/blue, saturated
    float m1 = 0.45 + 0.12 * sin(uv.x * 3.5 + 1.0) + 0.06 * sin(uv.x * 7.0 + 2.0);
    m1 += MOUNTAIN_WOBBLE * sin(uv.x * 10.0 + t * 2.0);
    float backMtn = fill(uv.y - m1, aa);
    vec3 backColor = hsl2rgb(vec3(fract(0.72 + COLOR_WASH_HUE * 0.5), 0.5, 0.35));

    // Snow caps - tinted with sky color
    float snowLine1 = m1 - 0.025;
    float snowCap1 = fill(uv.y - snowLine1, aa * 3.0) * step(m1 - 0.04, uv.y);
    vec3 snowTint = hsl2rgb(vec3(fract(0.55 + SKY_HUE), 0.2, 0.85));
    backColor = mix(backColor, snowTint, snowCap1 * 0.7);

    // Front mountains - rich green, reactive
    float m2 = 0.35 + 0.08 * sin(uv.x * 4.2 + 0.5) + 0.04 * sin(uv.x * 9.0);
    m2 += MOUNTAIN_WOBBLE * sin(uv.x * 8.0 + t * 1.5 + 1.0);
    float frontMtn = fill(uv.y - m2, aa);
    vec3 frontColor = hsl2rgb(vec3(fract(0.38 + COLOR_WASH_HUE * 0.3), 0.55, 0.3));

    float snowLine2 = m2 - 0.015;
    float snowCap2 = fill(uv.y - snowLine2, aa * 2.0) * step(m2 - 0.03, uv.y);
    frontColor = mix(frontColor, snowTint, snowCap2 * 0.5);

    col = mix(col, backColor, backMtn);
    col = mix(col, frontColor, frontMtn);

    return col;
}

// ============================================================================
// GROUND - Colorful, reactive snow
// ============================================================================

vec3 drawGround(vec2 uv, float t) {
    vec3 col = vec3(0.0);
    float aa = 2.0 / iResolution.y;

    float groundLevel = 0.22;
    float ground = fill(uv.y - groundLevel, aa);

    // Snow that picks up color from the sky - great for LED scraping
    vec3 groundColor = hsl2rgb(vec3(fract(0.55 + SKY_HUE + GROUND_HUE), 0.25, 0.8));

    // Road - darker, more saturated
    float roadCenter = 0.13;
    float roadHalf = 0.025;
    float road = fill(abs(uv.y - roadCenter) - roadHalf, aa);
    vec3 roadColor = vec3(0.2, 0.2, 0.25);

    // Road line - bold yellow
    float lineY = abs(uv.y - roadCenter);
    float dashX = step(0.5, fract(uv.x * 12.0));
    float centerLine = fill(lineY - 0.003, aa) * dashX;

    col = mix(col, groundColor, ground);
    col = mix(col, roadColor, road);
    col = mix(col, vec3(1.0, 0.85, 0.0), centerLine);

    return col;
}

// ============================================================================
// BUILDINGS - Bigger, bolder colors
// ============================================================================

vec3 drawBuildings(vec2 uv) {
    vec3 col = vec3(0.0);
    float aa = 2.0 / iResolution.y;

    // Building 1 - left, bold red
    vec2 b1 = uv - vec2(0.12, 0.28);
    float bld1 = fill(sdRoundBox(b1, vec2(0.06, 0.07), 0.003), aa);
    vec3 bld1Color = hsl2rgb(vec3(0.02, 0.7, 0.4));
    col = mix(col, bld1Color, bld1);

    // Window - warm glow
    float w1 = fill(sdRoundBox(b1 - vec2(0.0, 0.02), vec2(0.018, 0.018), 0.002), aa);
    vec3 winGlow = hsl2rgb(vec3(fract(0.12 + SKY_HUE * 0.3), 0.9, 0.65));
    col = mix(col, winGlow, w1);

    // Building 2 - right, bold blue
    vec2 b2 = uv - vec2(0.88, 0.3);
    float bld2 = fill(sdRoundBox(b2, vec2(0.07, 0.09), 0.003), aa);
    vec3 bld2Color = hsl2rgb(vec3(0.6, 0.65, 0.4));
    col = mix(col, bld2Color, bld2);

    // Windows on building 2 - glowing
    float w2a = fill(sdRoundBox(b2 - vec2(-0.025, 0.03), vec2(0.015, 0.015), 0.002), aa);
    float w2b = fill(sdRoundBox(b2 - vec2(0.025, 0.03), vec2(0.015, 0.015), 0.002), aa);
    col = mix(col, winGlow, max(w2a, w2b));

    // Building 3 - center back, taller, bold green
    vec2 b3 = uv - vec2(0.5, 0.32);
    float bld3 = fill(sdRoundBox(b3, vec2(0.05, 0.11), 0.003), aa);
    vec3 bld3Color = hsl2rgb(vec3(0.35, 0.55, 0.35));
    col = mix(col, bld3Color, bld3);

    // Window on building 3
    float w3 = fill(sdRoundBox(b3 - vec2(0.0, 0.04), vec2(0.015, 0.015), 0.002), aa);
    col = mix(col, winGlow, w3);

    return col;
}

// ============================================================================
// SOUTH PARK CHARACTER - Bigger, bolder
// ============================================================================

vec3 drawCharacter(vec2 uv, vec2 pos, vec3 hatColor, vec3 coatColor, float bounce, float aa) {
    vec3 col = vec3(0.0);
    float alpha = 0.0;

    vec2 p = uv - pos;
    p.y -= bounce;

    // Body - bigger for better LED pickup
    float body = fill(sdRoundBox(p - vec2(0.0, 0.018), vec2(0.02, 0.028), 0.004), aa);
    col = mix(col, coatColor, body);
    alpha = max(alpha, body);

    // Head - bigger round head
    float head = fill(sdCircle(p - vec2(0.0, 0.058), 0.028), aa);
    vec3 skinColor = vec3(0.96, 0.82, 0.68);
    col = mix(col, skinColor, head);
    alpha = max(alpha, head);

    // Hat - bigger, bolder
    float hat = fill(sdRoundBox(p - vec2(0.0, 0.08), vec2(0.03, 0.015), 0.004), aa);
    col = mix(col, hatColor, hat);
    alpha = max(alpha, hat);

    // Eyes
    float eyeL = fill(sdCircle(p - vec2(-0.01, 0.06), 0.008), aa);
    float eyeR = fill(sdCircle(p - vec2(0.01, 0.06), 0.008), aa);
    col = mix(col, vec3(1.0), max(eyeL, eyeR));

    // Pupils
    float pupilL = fill(sdCircle(p - vec2(-0.009, 0.06), 0.004), aa);
    float pupilR = fill(sdCircle(p - vec2(0.011, 0.06), 0.004), aa);
    col = mix(col, vec3(0.05), max(pupilL, pupilR));

    // Mouth
    float mouth = fill(sdRoundBox(p - vec2(0.0, 0.045), vec2(0.008, 0.002), 0.001), aa);
    col = mix(col, vec3(0.15), mouth);

    // Legs
    float legL = fill(sdRoundBox(p - vec2(-0.01, -0.01), vec2(0.006, 0.015), 0.002), aa);
    float legR = fill(sdRoundBox(p - vec2(0.01, -0.01), vec2(0.006, 0.015), 0.002), aa);
    vec3 legColor = vec3(0.12, 0.12, 0.18);
    col = mix(col, legColor, max(legL, legR));
    alpha = max(alpha, max(legL, legR));

    // Shoes
    float shoeL = fill(sdRoundBox(p - vec2(-0.01, -0.027), vec2(0.009, 0.005), 0.002), aa);
    float shoeR = fill(sdRoundBox(p - vec2(0.01, -0.027), vec2(0.009, 0.005), 0.002), aa);
    col = mix(col, vec3(0.08), max(shoeL, shoeR));
    alpha = max(alpha, max(shoeL, shoeR));

    // Bold outline
    float outline = stroke(sdCircle(p - vec2(0.0, 0.058), 0.029), 0.003, aa);
    outline = max(outline, stroke(sdRoundBox(p - vec2(0.0, 0.018), vec2(0.021, 0.029), 0.004), 0.003, aa));
    col = mix(col, vec3(0.0), outline * alpha);

    return col * alpha;
}

// ============================================================================
// BUS STOP SIGN
// ============================================================================

vec3 drawBusStop(vec2 uv, float aa) {
    vec3 col = vec3(0.0);

    vec2 postP = uv - vec2(0.58, 0.2);
    float post = fill(sdRoundBox(postP, vec2(0.004, 0.045), 0.001), aa);
    col = mix(col, vec3(0.5, 0.5, 0.5), post);

    vec2 signP = uv - vec2(0.58, 0.26);
    float sign = fill(sdRoundBox(signP, vec2(0.03, 0.015), 0.003), aa);
    col = mix(col, vec3(0.9, 0.1, 0.05), sign);

    float dot1 = fill(sdCircle(signP - vec2(-0.012, 0.0), 0.004), aa);
    float dot2 = fill(sdCircle(signP - vec2(0.0, 0.0), 0.004), aa);
    float dot3 = fill(sdCircle(signP - vec2(0.012, 0.0), 0.004), aa);
    col = mix(col, vec3(1.0), max(dot1, max(dot2, dot3)));

    return col;
}

// ============================================================================
// SNOWFALL - Colored, reactive
// ============================================================================

vec3 drawSnow(vec2 uv, float t) {
    vec3 col = vec3(0.0);

    for (int i = 0; i < 50; i++) {
        float fi = float(i);

        float x = fract(hash21(vec2(fi, 0.0)) + sin(t * 0.3 + fi) * 0.06);
        float y = fract(hash21(vec2(fi, 1.0)) - t * SNOW_SPEED * (0.03 + hash21(vec2(fi, 2.0)) * 0.025));

        float size = 0.003 + hash21(vec2(fi, 3.0)) * 0.004;
        float brightness = 0.7 + hash21(vec2(fi, 4.0)) * 0.3;

        // Sparkle from treble
        brightness += SPARKLE * sin(t * 10.0 + fi * 3.0) * 0.4;

        // Tint snow with sky color for cohesive LED look
        vec3 snowColor = hsl2rgb(vec3(fract(0.55 + SKY_HUE * 0.5 + fi * 0.02), 0.15, brightness));

        float flake = fill(sdCircle(uv - vec2(x, y), size), 0.003);
        col += snowColor * flake;
    }

    return col;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    float aa = 2.0 / iResolution.y;
    float t = iTime;

    // --- Sky (largest color region - dominates LED scraping) ---
    vec3 col = southParkSky(uv, t);

    // --- Mountains ---
    vec3 mtns = drawMountains(uv, t);
    float mtnMask = step(0.001, mtns.r + mtns.g + mtns.b);
    col = mix(col, mtns, mtnMask);

    // --- Buildings ---
    vec3 bldgs = drawBuildings(uv);
    float bldgMask = step(0.001, bldgs.r + bldgs.g + bldgs.b);
    col = mix(col, bldgs, bldgMask);

    // --- Bus stop sign ---
    vec3 busStop = drawBusStop(uv, aa);
    float busMask = step(0.001, busStop.r + busStop.g + busStop.b);
    col = mix(col, busStop, busMask);

    // --- Characters at bus stop - bigger bounces ---
    float b1 = max(0.0, BOUNCE_AMOUNT * sin(t * 5.0));
    float b2 = max(0.0, BOUNCE_AMOUNT * sin(t * 5.0 + 1.5));
    float b3 = max(0.0, BOUNCE_AMOUNT * sin(t * 5.0 + 3.0));
    float b4 = max(0.0, BOUNCE_AMOUNT * sin(t * 5.0 + 4.5));

    // Stan - vivid blue hat, brown coat
    vec3 stan = drawCharacter(uv, vec2(0.36, 0.18),
        vec3(0.15, 0.25, 0.85), vec3(0.55, 0.28, 0.12), b1, aa);

    // Kyle - vivid green hat, bright orange coat
    vec3 kyle = drawCharacter(uv, vec2(0.43, 0.18),
        vec3(0.1, 0.75, 0.15), vec3(0.95, 0.55, 0.1), b2, aa);

    // Cartman - teal hat, bold red coat
    vec3 cartman = drawCharacter(uv, vec2(0.50, 0.18),
        vec3(0.2, 0.8, 0.8), vec3(0.85, 0.1, 0.05), b3, aa);

    // Kenny - bright orange hood
    vec3 kenny = drawCharacter(uv, vec2(0.57, 0.18),
        vec3(1.0, 0.6, 0.05), vec3(1.0, 0.6, 0.05), b4, aa);

    // Composite characters
    float charMask;
    charMask = step(0.001, stan.r + stan.g + stan.b);
    col = mix(col, stan, charMask);
    charMask = step(0.001, kyle.r + kyle.g + kyle.b);
    col = mix(col, kyle, charMask);
    charMask = step(0.001, cartman.r + cartman.g + cartman.b);
    col = mix(col, cartman, charMask);
    charMask = step(0.001, kenny.r + kenny.g + kenny.b);
    col = mix(col, kenny, charMask);

    // --- Ground / Road ---
    vec3 ground = drawGround(uv, t);
    float groundMask = step(0.001, ground.r + ground.g + ground.b);
    col = mix(col, ground, groundMask);

    // --- Snow ---
    col += drawSnow(uv, t);

    // Bass throb - whole scene brightness pulse
    col *= BASS_THROB;

    // Beat pulse flash
    col *= BEAT_PULSE;

    // Construction paper texture - subtle
    float paper = hash21(fragCoord.xy * 0.5) * 0.03 - 0.015;
    col += paper;

    // Soft vignette
    vec2 vc = uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.25;

    // Gentle frame feedback - careful not to wash out
    vec4 prev = getLastFrameColor(uv);
    vec3 prevHSL = rgb2hsl(prev.rgb);
    prevHSL.z *= 0.93; // Prevent white accumulation
    vec3 prevCorrected = hsl2rgb(prevHSL);
    col = mix(prevCorrected, col, 0.35);

    // Tone mapping to prevent blow-out
    col = col / (col + vec3(0.15));
    col = pow(col, vec3(0.85));

    // Boost saturation for LEDs
    vec3 colHSL = rgb2hsl(col);
    colHSL.y = min(colHSL.y * 1.3, 1.0);
    col = hsl2rgb(colHSL);

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
