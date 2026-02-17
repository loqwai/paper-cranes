// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, reaction-diffusion, organic
// ChromaDepth Reaction-Diffusion -- Gray-Scott model via frame feedback
// Chemical concentrations encoded in chromadepth color: U in hue (invertible),
// V in lightness deviation. The display IS the chromadepth visualization.
// Active spots (low U) = red/near, background (high U) = blue/far.
// Audio: bass -> feed rate, spectralEntropy -> kill rate (pattern morphology),
// energy -> diffusion, beats seed new spots, spectralCentroid -> diffusion balance.
//
// ChromaDepth: Red = closest, Green = mid, Blue/Violet = farthest, Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// --- FEED RATE: bass creates/destroys spots ---
#define FEED_MOD (bassZScore * 0.006)
// #define FEED_MOD 0.0

// --- KILL RATE: spectralEntropy selects pattern type ---
// Low entropy = spots, mid = stripes, high = labyrinthine
#define KILL_MOD (spectralEntropyNormalized * 0.01 - 0.005)
// #define KILL_MOD 0.0

// --- DIFFUSION: energy controls diffusion rates ---
#define DIFF_ENERGY (energyNormalized * 0.1)
// #define DIFF_ENERGY 0.05

// --- DIFFUSION BALANCE: spectralCentroid shifts Du/Dv ratio ---
#define DIFF_BALANCE (spectralCentroidZScore * 0.015)
// #define DIFF_BALANCE 0.0

// --- BEAT: seeds new spots ---
#define BEAT_SEED (beat ? 1.0 : 0.0)
// #define BEAT_SEED 0.0

// --- DROP DETECTION ---
#define DROP_INTENSITY (max(-energyZScore, 0.0))
// #define DROP_INTENSITY 0.0

// --- VISUAL MODULATION ---
#define BASS_PUNCH (bassZScore)
// #define BASS_PUNCH 0.0

#define PITCH_HUE (pitchClassNormalized)
// #define PITCH_HUE 0.0

#define FLUX_SPEED (spectralFluxZScore)
// #define FLUX_SPEED 0.0

// --- TREND-BASED ---
#define ENERGY_TREND (energySlope * 10.0 * energyRSquared)
// #define ENERGY_TREND 0.0

#define BASS_TREND (bassSlope * 10.0 * bassRSquared)
// #define BASS_TREND 0.0

#define MIDS_MOD (midsZScore * 0.003)
// #define MIDS_MOD 0.0

// ============================================================================
// CHROMADEPTH + STATE ENCODING
// ============================================================================

// The chromadepth function maps depth 0-1 to hue 0-0.82.
// We use this as a reversible encoding: U -> hue, V -> lightness boost.
// The resulting color IS the chromadepth visualization AND stores state.

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// Encode U,V into chromadepth-compatible HSL color
// U -> hue (depth), V -> lightness boost above baseline
vec3 encodeHSL(float U, float V) {
    float depth = clamp(U, 0.0, 1.0);
    float hue = depth * 0.82;
    float sat = 0.95 - depth * 0.1;
    float baseLit = 0.42 - depth * 0.12;
    float lit = baseLit + V * 0.45;
    return vec3(hue, sat, clamp(lit, 0.05, 0.95));
}

// Decode U,V from HSL
vec2 decodeHSL(vec3 hsl) {
    float U = clamp(hsl.x / 0.82, 0.0, 1.0);
    float baseLit = 0.42 - U * 0.12;
    float V = clamp((hsl.z - baseLit) / 0.45, 0.0, 1.0);
    return vec2(U, V);
}

// Read U,V from previous frame pixel
vec2 readConc(vec2 uv) {
    vec3 rgb = getLastFrameColor(clamp(uv, 0.0, 1.0)).rgb;
    vec3 hsl = rgb2hsl(rgb);
    return decodeHSL(hsl);
}

// 5-point Laplacian (mobile-friendly)
vec2 laplacian5(vec2 uv, vec2 px) {
    vec2 c = readConc(uv);
    vec2 sum = -4.0 * c;
    sum += readConc(uv + vec2(px.x, 0.0));
    sum += readConc(uv + vec2(-px.x, 0.0));
    sum += readConc(uv + vec2(0.0, px.y));
    sum += readConc(uv + vec2(0.0, -px.y));
    return sum;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 screenUV = fragCoord / iResolution.xy;
    vec2 px = 1.0 / iResolution.xy;

    // --- GRAY-SCOTT PARAMETERS ---
    float f = 0.037 + FEED_MOD + BASS_TREND * 0.001 + MIDS_MOD;
    float k = 0.06 + KILL_MOD + ENERGY_TREND * 0.0008;
    f = clamp(f, 0.015, 0.07);
    k = clamp(k, 0.045, 0.072);

    // Diffusion rates: Du > Dv required for Turing instability
    float Du = 0.21 + DIFF_ENERGY * 0.08 + DIFF_BALANCE * 0.4;
    float Dv = 0.105 + DIFF_ENERGY * 0.04 - DIFF_BALANCE * 0.2;
    Du = clamp(Du, 0.15, 0.32);
    Dv = clamp(Dv, 0.06, 0.16);

    // --- READ CURRENT STATE ---
    vec2 conc = readConc(screenUV);
    float U = conc.x;
    float V = conc.y;

    // --- INITIALIZATION ---
    if (iFrame < 5) {
        U = 1.0;
        V = 0.0;

        vec2 center = screenUV - 0.5;

        // Central seed
        if (length(center) < 0.07) {
            U = 0.5;
            V = 0.25;
        }

        // Ring of seeds
        for (float a = 0.0; a < 6.28; a += 0.785) {
            vec2 seedPos = vec2(cos(a), sin(a)) * 0.22;
            if (length(center - seedPos) < 0.035) {
                U = 0.5;
                V = 0.25;
            }
        }

        // Random seeds
        float r = staticRandom(floor(screenUV * 25.0));
        if (r > 0.92) {
            float r2 = staticRandom(floor(screenUV * 25.0) + 100.0);
            if (r2 > 0.5) {
                U = 0.5;
                V = 0.25;
            }
        }

        vec3 hsl = encodeHSL(U, V);
        fragColor = vec4(hsl2rgb(hsl), 1.0);
        return;
    }

    // --- GRAY-SCOTT LAPLACIAN + UPDATE ---
    vec2 lap = laplacian5(screenUV, px);

    float uvv = U * V * V;
    float dU = Du * lap.x - uvv + f * (1.0 - U);
    float dV = Dv * lap.y + uvv - (f + k) * V;

    U += dU;
    V += dV;

    // --- BEAT SEEDING ---
    if (BEAT_SEED > 0.5) {
        float r = random(screenUV * 80.0 + iTime);
        float gridR = random(floor(screenUV * 20.0) + iTime * 0.1);
        if (r > 0.995 && gridR > 0.6) {
            U = 0.5;
            V = 0.25;
        }
    }

    // --- DROP: chemical disruption ---
    if (DROP_INTENSITY > 0.3) {
        float dropR = random(screenUV * 40.0 + iTime * 0.5);
        float dropStrength = (DROP_INTENSITY - 0.3) * 1.43;
        if (dropR > 1.0 - dropStrength * 0.03) {
            U = mix(U, 0.5, dropStrength * 0.4);
            V = mix(V, 0.25, dropStrength * 0.4);
        }
    }

    // --- FLUX SEEDING ---
    if (FLUX_SPEED > 0.4) {
        float fluxR = random(screenUV * 60.0 - iTime);
        if (fluxR > 0.998) {
            V = min(V + 0.05, 1.0);
        }
    }

    U = clamp(U, 0.0, 1.0);
    V = clamp(V, 0.0, 1.0);

    // --- ENCODE STATE AS CHROMADEPTH COLOR ---
    vec3 hsl = encodeHSL(U, V);

    // --- AUDIO VISUAL MODULATION ---
    // NOTE: All modulation must be very subtle because the output color
    // IS the simulation state. Any visual change feeds back into the
    // decode on the next frame. We keep modulations tiny so the decode
    // error is negligible relative to the Gray-Scott dynamics.

    // Pitch class micro-shifts hue (U error: ~0.01)
    hsl.x += PITCH_HUE * 0.008;

    // Bass punch: tiny saturation boost for near colors
    hsl.y += BASS_PUNCH * 0.015 * (1.0 - U);

    hsl.x = mod(hsl.x + 1.0, 1.0);
    hsl.y = clamp(hsl.y, 0.0, 1.0);
    hsl.z = clamp(hsl.z, 0.05, 0.95);

    vec3 col = hsl2rgb(hsl);
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
