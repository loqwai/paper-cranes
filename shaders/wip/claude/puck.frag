// @fullscreen: true
// @mobile: true
// @tags: cat, puck, photo, ambient, portrait
// Puck — real photo with audio-reactive tabby stripes.
// http://localhost:41769/?shader=wip%2Fclaude%2Fpuck&fullscreen=true&image=images/puck.png
// Debug masks: &knob_79=1

#define PI 3.14159265

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

#define ZOOM_LEVEL mapValue(energyZScore, -1.0, 1.0, 0.9, 1.3)
#define EYE_INTENSITY (bassNormalized + energyNormalized > 0.6 ? mapValue(spectralFluxNormalized + bassNormalized, 0.0, 1.5, 0.3, 1.0) : 0.0)

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

// Dark tabby stripes — below median fur lightness
float isDarkStripe(vec2 uv) {
    float L = rgb2oklch(getInitialFrameColor(uv).rgb).x;
    return isCat(uv) * smoothstep(0.72, 0.62, L) * smoothstep(0.20, 0.35, L);
}

// Light fur — above median fur lightness
float isLightFur(vec2 uv) {
    float L = rgb2oklch(getInitialFrameColor(uv).rgb).x;
    return isCat(uv) * smoothstep(0.62, 0.72, L);
}

// Eye proximity mask
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

    // Dark stripes: bass darkens, boosts chroma, pushes toward magenta
    float bassAmt = clamp(bassZScore, 0.0, 1.0);
    vec3 darkLch = vec3(
        max(lch.x - bassAmt * 0.20, 0.10),
        min(lch.y + bassAmt * 0.15, 0.30),
        lch.z - bassAmt * 0.6
    );
    col = oklabmix(col, oklch2rgb(darkLch), darkS * bassAmt);

    // Light fur: treble gently brightens and warms
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

    // ---- GENTLE FEEDBACK (only when energy is high) ----
    if (energyNormalized > 0.5 && bassZScore > 0.3) {
        vec3 prev = getLastFrameColor(screenUV).rgb;
        float feedAmt = clamp(spectralRoughnessNormalized * 0.3, 0.0, 0.25);
        col = oklabmix(col, prev, feedAmt);
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
