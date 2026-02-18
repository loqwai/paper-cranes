// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Layered ocean waves flowing horizontally — deep navy-teal webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// Wave height amplitude
#define WAVE_HEIGHT (0.03 + bassMedian * 0.04)

// Wave scroll speed — slow drift
#define WAVE_SPEED (0.08 + energySlope * 0.04)

// Number of wave layers (4-10)
#define NUM_LAYERS (4.0 + spectralEntropyMedian * 6.0)

// Hue center in Oklch (navy-teal range ~4.0-4.8)
#define HUE_CENTER (4.3 + pitchClassMedian * 0.4 + spectralCentroidSlope * 0.15)

// Chroma — more vivid when trend is steady
#define CHROMA (0.06 + energyRSquared * 0.05)

// Base lightness
#define LIGHTNESS (0.25 + energyMedian * 0.10)

// Wave frequency scaling
#define FREQ_SCALE (3.0 + spectralSpreadMedian * 2.0)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Foam sparkle on treble spikes
#define FOAM_SPARKLE (max(trebleZScore, 0.0) * 0.06)

// Brightness pulse on flux
#define FLUX_PULSE (max(spectralFluxZScore, 0.0) * 0.04)

// Surface shimmer from roughness
#define SURFACE_GRIT (spectralRoughnessZScore * 0.005)

// ============================================================================
// NOISE
// ============================================================================

vec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x / 289.0) * 289.0; }
vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// ============================================================================
// WAVE LAYER
// ============================================================================

// Returns wave intensity at a given point for one layer
// Each layer has different frequency, phase, speed, and vertical offset
float waveLayer(vec2 p, float t, float layerIdx, float totalLayers) {
    // Vertical position of this wave band (spread across screen height)
    float bandY = -0.45 + layerIdx / totalLayers * 0.9;

    // Frequency increases with depth (lower layers = slower, broader)
    float freq = FREQ_SCALE * (0.6 + layerIdx * 0.35);

    // Phase offset per layer
    float phase = layerIdx * 1.73 + layerIdx * layerIdx * 0.31;

    // Speed varies per layer — back layers slower, front faster
    float speed = WAVE_SPEED * (0.5 + layerIdx / totalLayers * 1.0);

    // Main wave shape: sum of sines at different scales
    float wave = 0.0;
    wave += sin(p.x * freq + t * speed * 6.0 + phase) * 0.5;
    wave += sin(p.x * freq * 1.7 + t * speed * 4.3 + phase * 2.1) * 0.3;
    wave += sin(p.x * freq * 0.6 + t * speed * 2.8 + phase * 0.7) * 0.2;

    // Noise perturbation for organic feel
    float nz = snoise(vec2(p.x * 2.0 + t * speed * 0.5, layerIdx * 3.7)) * 0.3;
    wave += nz;

    // Scale by wave height
    wave *= WAVE_HEIGHT;

    // Wave crest position
    float crestY = bandY + wave;

    // Soft wave shape — bright at crest, fading below
    float dist = p.y - crestY;
    float bodyFade = smoothstep(0.0, -0.08, dist);    // Body below crest
    float crest = smoothstep(0.012, 0.0, abs(dist));   // Bright crest line

    // Depth attenuation: back layers are dimmer
    float depthFade = 0.3 + 0.7 * (layerIdx / max(totalLayers, 0.001));

    return (bodyFade * 0.4 + crest * 0.8) * depthFade;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time;
    float totalLayers = NUM_LAYERS;

    // --- Accumulate wave layers ---
    float totalIntensity = 0.0;
    float crestAccum = 0.0;

    for (float i = 0.0; i < 10.0; i += 1.0) {
        if (i >= totalLayers) break;

        float layerVal = waveLayer(p, t, i, totalLayers);
        totalIntensity += layerVal * 0.25;

        // Crest detection for foam
        float bandY = -0.45 + i / totalLayers * 0.9;
        float freq = FREQ_SCALE * (0.6 + i * 0.35);
        float phase = i * 1.73 + i * i * 0.31;
        float speed = WAVE_SPEED * (0.5 + i / totalLayers * 1.0);
        float wave = sin(p.x * freq + t * speed * 6.0 + phase) * 0.5
                   + sin(p.x * freq * 1.7 + t * speed * 4.3 + phase * 2.1) * 0.3;
        wave *= WAVE_HEIGHT;
        float crestY = bandY + wave;
        float crestDist = abs(p.y - crestY);
        crestAccum += smoothstep(0.008, 0.0, crestDist) * (0.3 + 0.7 * i / max(totalLayers, 0.001));
    }

    totalIntensity = clamp(totalIntensity, 0.0, 1.0);
    crestAccum = clamp(crestAccum, 0.0, 1.0);

    // --- Foam sparkle (fast accent) ---
    float foam = 0.0;
    if (FOAM_SPARKLE > 0.001) {
        float sparkleNoise = snoise(p * 40.0 + time * 2.5) * 0.5 + 0.5;
        sparkleNoise = pow(sparkleNoise, 4.0); // Concentrate into bright dots
        foam = sparkleNoise * FOAM_SPARKLE * crestAccum;
    }

    // --- Color in Oklch: navy-teal ---
    // Deeper layers: darker, more navy. Crests: lighter, more teal.
    float hue = HUE_CENTER + totalIntensity * 0.3 - crestAccum * 0.15;
    float chroma = CHROMA * (0.5 + totalIntensity * 1.2 + crestAccum * 0.5);
    float lightness = 0.05 + totalIntensity * LIGHTNESS + crestAccum * 0.12;

    // Fast accents
    lightness += FLUX_PULSE * totalIntensity;
    lightness += foam;
    lightness += snoise(p * 25.0 + time * 0.8) * SURFACE_GRIT;

    // Background: very dark navy
    vec3 bg = oklch2rgb(vec3(0.06, 0.03, 4.5));

    // Wave color
    vec3 waveCol = oklch2rgb(vec3(
        clamp(lightness, 0.04, 0.50),
        clamp(chroma, 0.02, 0.14),
        hue
    ));

    // Foam/crest highlight — slightly brighter and more cyan
    vec3 foamCol = oklch2rgb(vec3(
        clamp(0.45 + foam * 2.0, 0.3, 0.7),
        clamp(CHROMA * 0.8, 0.02, 0.10),
        HUE_CENTER - 0.2
    ));

    // Blend waves with background
    vec3 col = mix(bg, waveCol, smoothstep(0.0, 0.01, totalIntensity));

    // Add foam highlights on crests
    col = mix(col, foamCol, crestAccum * 0.3 + foam);

    // --- Center darkening (face area) ---
    float centerDark = 1.0 - 0.25 * exp(-dot(p, p) * 4.0);
    col *= centerDark;

    // --- Frame feedback for smoothness ---
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb, col, 0.12);

    // --- Vignette ---
    float r = length(p);
    float vign = 1.0 - r * 0.18;
    col *= vign;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
