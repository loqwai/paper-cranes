// @fullscreen: true
// @mobile: true
// @tags: cat, puck, photo, ambient, portrait
// Puck — real photo with audio-reactive tabby stripes and orbiting mini-cat heads.
// http://localhost:41769/?shader=wip%2Fclaude%2Fpuck&fullscreen=true&image=images/puck.png
// Debug masks: &knob_79=1

#define PI 3.14159265
#define TAU 6.28318530
#define PHI 1.61803398875

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

#define ZOOM_LEVEL mapValue(energyZScore, -1.0, 1.0, 0.9, 1.3)
#define EYE_INTENSITY (bassNormalized + energyNormalized > 0.6 ? mapValue(spectralFluxNormalized + bassNormalized, 0.0, 1.5, 0.3, 1.0) : 0.0)

#define ORBIT_SPEED (0.3 + spectralFluxNormalized * 0.5)
#define ORBIT_RADIUS (0.30 + bassNormalized * 0.10)
#define MINI_HEAD_SIZE (0.07 + trebleNormalized * 0.03)
#define MINI_HEAD_SPIN (spectralCentroidZScore * 0.8)
#define MINI_HEAD_COUNT 7
#define ORBIT_WOBBLE (midsZScore * 0.04)
#define MINI_ZOOM_INTENSITY (bassNormalized + energyNormalized > 0.4 ? mapValue(spectralFluxNormalized + bassNormalized, 0.0, 1.5, 0.1, 0.7) : 0.0)
#define ORBIT_CENTER vec2(0.50, 0.45)

// ============================================================================
// POSITIONS
// ============================================================================

#define EYE_L vec2(0.39, 0.44)
#define EYE_R vec2(0.61, 0.42)
#define FACE_CENTER vec2(0.50, 0.40)

// ============================================================================
// UV + MASKS
// ============================================================================

vec2 imageUV(vec2 fragCoord, vec2 res) {
    vec2 uv = fragCoord / res - 0.5;
    float aspect = res.x / res.y;
    if (aspect > 1.0) uv.x *= aspect;
    else uv.y /= aspect;
    return uv + 0.5;
}

float isCat(vec2 uv) {
    return smoothstep(0.15, 0.25, rgb2oklch(getInitialFrameColor(uv).rgb).x);
}

float isDarkStripe(vec2 uv) {
    float L = rgb2oklch(getInitialFrameColor(uv).rgb).x;
    return isCat(uv) * smoothstep(0.72, 0.62, L) * smoothstep(0.20, 0.35, L);
}

float isLightFur(vec2 uv) {
    float L = rgb2oklch(getInitialFrameColor(uv).rgb).x;
    return isCat(uv) * smoothstep(0.62, 0.72, L);
}

float isEye(vec2 uv) {
    float L = rgb2oklch(getInitialFrameColor(uv).rgb).x;
    float near = min(length(uv - EYE_L), length(uv - EYE_R));
    return (1.0 - smoothstep(0.0, 0.06, near)) * smoothstep(0.70, 0.45, L) * smoothstep(0.03, 0.10, L);
}

// ============================================================================
// EYE PORTAL (infinity zoom)
// ============================================================================

vec3 eyePortal(vec2 uv, vec2 eyeCenter) {
    float zf = mix(1.0, 4.0, EYE_INTENSITY);
    float angle = sin(iTime * 0.7) + bassZScore * 0.4;
    vec2 ruv = uv - eyeCenter;
    float c = cos(angle), s = sin(angle);
    ruv = vec2(ruv.x * c - ruv.y * s, ruv.x * s + ruv.y * c) + eyeCenter;

    for (int i = 0; i < int(4.0 * EYE_INTENSITY); i++) {
        ruv = (ruv - eyeCenter) * zf + eyeCenter;
        ruv = fract(ruv);
    }

    ruv += vec2(sin(iTime * 2.0), -sin(iTime * 2.0)) * 0.1 * EYE_INTENSITY;

    vec3 color = getLastFrameColor(ruv).rgb;
    vec3 lch = rgb2oklch(color);
    lch.z += zf * 0.3 + EYE_INTENSITY * 0.5;
    lch.y = min(lch.y * 1.5, 0.3);
    lch.x = mix(mix(lch.x, 0.4, zf * 0.2), 0.7, smoothstep(0.5, 1.0, energyNormalized) * 0.3);
    return oklch2rgb(lch);
}

// ============================================================================
// MINI CAT HEAD — orbiting portrait with infinity zoom
// ============================================================================

vec2 rotateUV(vec2 uv, float angle) {
    float c = cos(angle), s = sin(angle);
    return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

// Returns (color, mask) for a single mini head at orbitCenter
vec4 miniCatHead(vec2 uv, vec2 orbitCenter, float headSize, float phase, float zoomAmt) {
    vec2 delta = uv - orbitCenter;
    float dist = length(delta);

    // Soft circular mask
    float mask = 1.0 - smoothstep(headSize * 0.7, headSize, dist);
    if (mask < 0.01) return vec4(0.0);

    // Map local UV to cat face — spin the mini head
    float spin = iTime * MINI_HEAD_SPIN + phase * TAU;
    vec2 localUV = rotateUV(delta, spin) / (headSize * 2.0) + FACE_CENTER;

    // Infinity zoom into the mini head (subtronics technique)
    if (zoomAmt > 0.05) {
        float zf = mix(1.0, 3.0, zoomAmt);
        float zAngle = sin(iTime * 0.5 + phase * TAU) * 0.5;
        vec2 zuv = localUV - FACE_CENTER;
        float zc = cos(zAngle), zs = sin(zAngle);
        zuv = vec2(zuv.x * zc - zuv.y * zs, zuv.x * zs + zuv.y * zc);
        localUV = zuv + FACE_CENTER;

        for (int i = 0; i < int(3.0 * zoomAmt); i++) {
            localUV = (localUV - FACE_CENTER) * zf + FACE_CENTER;
            localUV = fract(localUV);
        }
    }

    localUV = clamp(localUV, 0.0, 1.0);

    // Sample the cat image
    vec3 col = getInitialFrameColor(localUV).rgb;

    // Tint based on phase — each head gets a unique hue shift
    vec3 lch = rgb2oklch(col);
    lch.z += phase * TAU + iTime * 0.3;
    lch.y = min(lch.y + zoomAmt * 0.08, 0.25);
    col = oklch2rgb(lch);

    // Vignette the edge
    float vignette = smoothstep(headSize, headSize * 0.4, dist);
    col *= vignette;

    return vec4(col, mask);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 screenUV = fragCoord / iResolution.xy;
    vec2 uv = imageUV(fragCoord, iResolution.xy);

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // ---- DEBUG MODE ----
    if (knob_79 > 0.5) {
        vec3 col = getInitialFrameColor(uv).rgb * 0.25;
        col = oklabmix(col, vec3(0.9, 0.1, 0.6), isDarkStripe(uv) * 0.85);
        col = oklabmix(col, vec3(0.2, 0.9, 0.9), isLightFur(uv) * 0.85);
        col = oklabmix(col, vec3(1.0, 0.0, 0.0), isEye(uv));
        fragColor = vec4(col, 1.0);
        return;
    }

    // ---- ZOOM ----
    uv = (uv - FACE_CENTER) / ZOOM_LEVEL + FACE_CENTER;
    uv = clamp(uv, 0.0, 1.0);

    // ---- BASE IMAGE ----
    vec3 col = getInitialFrameColor(uv).rgb;

    // ---- STRIPE EFFECTS ----
    float darkS = isDarkStripe(uv);
    float lightF = isLightFur(uv);
    vec3 lch = rgb2oklch(col);

    float bassAmt = clamp(bassZScore, 0.0, 1.0);
    vec3 darkLch = vec3(
        max(lch.x - bassAmt * 0.20, 0.10),
        min(lch.y + bassAmt * 0.15, 0.30),
        lch.z - bassAmt * 0.6
    );
    col = oklabmix(col, oklch2rgb(darkLch), darkS * bassAmt);

    float trebleAmt = clamp(trebleZScore, 0.0, 1.0);
    lch = rgb2oklch(col);
    vec3 lightLch = vec3(
        min(lch.x + trebleAmt * 0.10, 0.90),
        min(lch.y + trebleAmt * 0.06, 0.18),
        lch.z
    );
    col = oklabmix(col, oklch2rgb(lightLch), lightF * trebleAmt * 0.4);

    // ---- EYE PORTALS ----
    float eye = isEye(uv);
    if (EYE_INTENSITY > 0.05) {
        vec2 nearEye = length(uv - EYE_L) < length(uv - EYE_R) ? EYE_L : EYE_R;
        col = oklabmix(col, eyePortal(uv, nearEye), eye * EYE_INTENSITY);
    }

    // ---- ORBITING MINI CAT HEADS ----
    for (int i = 0; i < MINI_HEAD_COUNT; i++) {
        float fi = float(i);
        float phase = fi / float(MINI_HEAD_COUNT);

        // Each head orbits at a slightly different speed and radius
        // Using incommensurate multipliers (PHI, sqrt2) so they never sync
        float speedMul = 1.0 + fi * 0.13 * PHI;
        float radiusMul = 1.0 + sin(fi * PHI) * 0.3;

        float orbitAngle = iTime * ORBIT_SPEED * speedMul + phase * TAU;

        // Elliptical orbit with audio wobble
        float rx = ORBIT_RADIUS * radiusMul + sin(iTime * 0.7 + fi) * ORBIT_WOBBLE;
        float ry = ORBIT_RADIUS * radiusMul * 0.75 + cos(iTime * 0.9 + fi) * ORBIT_WOBBLE;

        // Bobbing — each head dances up and down with different audio features
        float bob = sin(iTime * 2.0 + fi * PHI) * 0.015 * (1.0 + bassNormalized);

        vec2 orbitPos = ORBIT_CENTER + vec2(cos(orbitAngle) * rx, sin(orbitAngle) * ry + bob);

        // Size pulses with audio — different heads respond to different features
        float sizePulse = 1.0 + 0.2 * sin(iTime * 3.0 + fi * 2.0) * spectralCrestNormalized;
        float headSize = MINI_HEAD_SIZE * sizePulse;

        // Zoom intensity varies per head
        float headZoom = MINI_ZOOM_INTENSITY * (0.5 + 0.5 * sin(fi * PHI + iTime * 0.3));

        vec4 head = miniCatHead(uv, orbitPos, headSize, phase, headZoom);
        col = oklabmix(col, head.rgb, head.a * 0.9);
    }

    // ---- GENTLE FEEDBACK (only when energy is high) ----
    if (energyNormalized > 0.5 && bassZScore > 0.3) {
        vec3 prev = getLastFrameColor(screenUV).rgb;
        float feedAmt = clamp(spectralRoughnessNormalized * 0.3, 0.0, 0.25);
        col = oklabmix(col, prev, feedAmt);
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
