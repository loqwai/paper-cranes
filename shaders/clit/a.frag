// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, sexy, heart
// Chromatic Flow — Heart Edition
// The clitoris becomes a radiant heart that pulses with energy during drops.
// During normal play: subtle warm glow at the focal point.
// During climax (bass + spectralFlux + energy all spiking): a glowing heart
// shape blooms from the focal point, radiating concentric waves of light
// outward through the lace. The heart beats with the bass.
//
// CLIMAX DETECTION: Uses a combination of bass, spectralFlux, and energy
// z-scores — all three must spike together (like a big room house drop).
// Any one alone won't trigger it. The accumulator in alpha sustains the
// heart for a few seconds after the trigger, with eased transitions.
//
//https://visuals.beadfamous.com/?shader=clit/a&name=Heartbeat&wing_speed=0.4&warmth=0.6&lace_density=0.5&trail_amount=0.5&complexity=0.5&vignette_size=0.5
//https://visuals.beadfamous.com/?shader=clit/a&name=Lovesick%20Fairy&wing_speed=0.2&glow_hue=0.83&warmth=0.3&lace_density=0.3&wing_span=0.6&trail_amount=0.7&complexity=0.4&vignette_size=0.4
//https://visuals.beadfamous.com/?shader=clit/a&name=Burning%20Heart&wing_speed=0.7&glow_hue=0.1&warmth=0.9&lace_density=0.7&wing_span=0.8&trail_amount=0.3&complexity=0.7&vignette_size=0.6
//https://visuals.beadfamous.com/?shader=clit/a&name=Frozen%20Heart&wing_speed=0.3&glow_hue=0.55&warmth=0.1&lace_density=0.2&wing_span=0.4&trail_amount=0.8&complexity=0.3&vignette_size=0.3
//https://visuals.beadfamous.com/?shader=clit/a&name=Rave%20Valentine&wing_speed=0.9&glow_hue=0.0&warmth=0.7&lace_density=0.6&wing_span=0.9&trail_amount=0.4&complexity=0.8&vignette_size=0.7

// ============================================================================
// CREATURE TRAITS — independent URL params, same as clit/4
// ============================================================================

// Wing flap speed — lazy moth (0) vs hummingbird (1)
// #define WING_SPEED wing_speed
#define WING_SPEED 0.5
// #define WING_SPEED knob_71

// Wing span — tight subtle flutter (0) vs dramatic sweeping flap (1)
// #define WING_SPAN wing_span
#define WING_SPAN 0.5
// #define WING_SPAN knob_72

// Heart/gem hue — ruby(0) → amber(0.2) → emerald(0.4) → sapphire(0.6) → amethyst(0.8) → ruby(1)
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.0
// #define GLOW_HUE knob_73

// Lace density — delicate fairy threads (0) vs bold moth wings (1)
// #define LACE_DENSITY lace_density
#define LACE_DENSITY 0.5
// #define LACE_DENSITY knob_74

// Vignette tightness — wide open view (0) vs intimate close spotlight (1)
// #define VIGNETTE_SIZE vignette_size
#define VIGNETTE_SIZE 0.5
// #define VIGNETTE_SIZE knob_75

// Feedback/trails — crisp and sharp (0) vs ethereal ghosting (1)
// #define TRAIL_AMOUNT trail_amount
#define TRAIL_AMOUNT 0.5
// #define TRAIL_AMOUNT knob_76

// Color temperature — cool violet-blue tones (0) vs warm pink-amber (1)
// #define WARMTH warmth
#define WARMTH 0.5
// #define WARMTH knob_77

// Fractal complexity — simple smooth forms (0) vs intricate dense detail (1)
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Shape complexity: centroid controls fractal power, complexity trait sets baseline
#define A (mapValue(spectralCentroidZScore, 0., 1., 1.2, 1.8) + 0.1 + (COMPLEXITY - 0.5) * 0.3)
// #define A 1.5

// Body offset: energy shifts the form
#define B (0.55 + energyZScore * 0.15)
// #define B 0.55

// ============================================================================
// CLIMAX DETECTION — the heart trigger
// Big room house signature: bass + spectralFlux + energy all spike together.
// We require all three to be elevated (z-score product) so random spikes
// in just one feature don't trigger. spectralFlux catches the timbral
// explosion of a drop, bass catches the kick, energy catches the volume.
// ============================================================================

// Climax signal: product of three z-scores, only fires when ALL spike
// Each is clamped 0+ so negative values (quiet moments) contribute nothing
#define CLIMAX_BASS clamp(bassZScore, 0.0, 2.0)
// #define CLIMAX_BASS 1.0
#define CLIMAX_FLUX clamp(spectralFluxZScore, 0.0, 2.0)
// #define CLIMAX_FLUX 1.0
#define CLIMAX_ENERGY clamp(energyZScore, 0.0, 2.0)
// #define CLIMAX_ENERGY 1.0

// Combined trigger — geometric mean so all three must participate
// The 0.5 threshold means each feature needs z-score > ~0.8 to trigger
#define CLIMAX_RAW (CLIMAX_BASS * CLIMAX_FLUX * CLIMAX_ENERGY)
// #define CLIMAX_RAW 1.0
#define CLIMAX_TRIGGER clamp(CLIMAX_RAW * 2.0, 0.0, 1.0)
// #define CLIMAX_TRIGGER 0.8

// Climax accumulator speeds — ramps fast (the drop hits hard), decays slow (afterglow)
#define CLIMAX_RAMP 0.12
#define CLIMAX_DECAY 0.015

// Drop detection (same as clit/4, used for background dimming)
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — the heart beats with the bass
#define PULSE (1.0 + bassZScore * 0.06)
// #define PULSE 1.0

// Heart beat: bass z-score drives the heart's size pulsation
// Positive bass = heart swells, negative = heart contracts
#define HEART_BEAT (1.0 + clamp(bassZScore, -0.5, 1.5) * 0.15)
// #define HEART_BEAT 1.0

// Feedback — trail_amount shifts the base level
#define FEEDBACK_MIX (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.1, 0.5) + energyNormalized * 0.1)
// #define FEEDBACK_MIX 0.3

// Rim lighting: treble drives the body edge glow
#define RIM_INTENSITY (0.4 + trebleNormalized * 0.6)
// #define RIM_INTENSITY 0.7

// Rim color warmth
#define RIM_WARMTH (mapValue(WARMTH, 0.0, 1.0, 0.1, 0.7) + spectralRoughnessNormalized * 0.2)
// #define RIM_WARMTH 0.5

// Tendril curl
#define FLAP_RATE mapValue(WING_SPEED, 0.0, 1.0, 0.08, 0.6)
#define FLAP_AMP mapValue(WING_SPAN, 0.0, 1.0, 0.15, 0.9)
#define TENDRIL_CURL (sin(iTime * FLAP_RATE) * FLAP_AMP + sin(iTime * FLAP_RATE * 0.57) * FLAP_AMP * 0.6 + spectralCentroidSlope * 0.3)
// #define TENDRIL_CURL 0.0
#define TENDRIL_CROSS (sin(iTime * FLAP_RATE * 0.77) * FLAP_AMP * 0.8 + sin(iTime * FLAP_RATE * 0.43 + 1.0) * FLAP_AMP * 0.5 + spectralSpreadSlope * 0.2)
// #define TENDRIL_CROSS 0.0

// Flow drift
#define FLOW_X (spectralCentroidSlope * 0.003)
// #define FLOW_X 0.0
#define FLOW_Y (spectralSpreadSlope * 0.002)
// #define FLOW_Y 0.0

// Turbulence / calm (for drop state background dimming)
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

#define DROP_RAMP 0.08
#define DROP_DECAY_MIN 0.01
#define DROP_DECAY_MAX 0.06

// ============================================================================
// HEART SDF — signed distance to a heart shape
// Returns negative inside, positive outside
// ============================================================================

float heartSDF(vec2 p) {
    // Heart SDF using the classic implicit equation approach
    // Flip Y so the point faces up
    p.y -= 0.35;
    p.y = -p.y;
    p.x = abs(p.x);  // mirror symmetry

    // Two-arc heart: upper lobes are circles, lower is a V
    float q = length(p - vec2(0.25, 0.25)) - 0.25;
    float r = (p.x + p.y - 0.25) * 0.7071;
    return min(q, r);
}

// ============================================================================
// CHROMADEPTH COLOR
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float chromaBoost = 1.0 + 0.2 * sin(t * 3.14159 * 2.0);
    float L = 0.7 - t * 0.45;
    float C = 0.25 * chromaBoost * (1.0 - t * 0.3);
    float h = hue * 6.28318;
    vec3 lab = vec3(L, C * cos(h), C * sin(h));
    return clamp(oklab2rgb(lab), 0.0, 1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;

    // Time-driven curl flaps the wings
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulated proximity for organic focal glow
    float focal_trap = 0.0;
    float focal_weight = 0.0;
    vec2 focal_center = vec2(0.0, 0.12);

    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(max(d, 1e-10)) / 2.));
        V = exp(-a * V.y) * pow(max(d, 1e-10), V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;

        x = min(x, abs(V.x));
        y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;

        float fd = length(V - focal_center);
        float prox = exp(-fd * 8.0);
        focal_trap += prox;
        focal_weight += 1.0;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace
    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    float lace_sharp = mapValue(LACE_DENSITY, 0.0, 1.0, 2.0, 4.0);
    lace = pow(max(lace, 0.0), lace_sharp);

    // Rainbow colors
    float color_phase = (WARMTH - 0.5) * 1.5;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — organic heat
    // ========================================================================

    float focal_glow = smoothstep(0.02, 0.25, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 3.0);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    float focal = focal_glow;

    // ========================================================================
    // CLIMAX STATE — heart accumulator stored in alpha
    // Ramps up when bass + flux + energy all spike (big room drop).
    // Decays slowly for sustained afterglow.
    // ========================================================================

    float climax_signal = CLIMAX_TRIGGER;

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_climax = getLastFrameColor(state_uv).a;

    float climax_state = prev_climax;
    climax_state = mix(climax_state, 1.0, climax_signal * CLIMAX_RAMP);
    climax_state = mix(climax_state, 0.0, CLIMAX_DECAY);
    climax_state = clamp(climax_state, 0.0, 1.0);

    // Eased climax for smooth visual transitions
    float climax = animateEaseInOutCubic(climax_state);

    // Also compute drop state for background dimming
    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;
    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(2.0, 4.0, turbulence), 0.0, 1.0);
    // Reuse climax state for drop effects too — they're correlated
    float drop = max(climax, animateEaseInOutCubic(clamp(drop_signal, 0.0, 1.0)));

    // ========================================================================
    // HEART SDF — positioned at the focal center, scaled by climax intensity
    // The heart only appears during climax. It beats with the bass.
    // ========================================================================

    // Heart position: centered at the focal point in fractal space
    // We need to convert from fractal space back to screen space
    // The focal_center is at vec2(0.0, 0.12) in the fractal's C-space
    // C = 0.6 * (Z - V - V).yx / Z.y, C.x += 0.77
    // So focal_center maps to approximately uv = (-0.12, -(0.0 - 0.77)) → need empirical
    // Use the screen center of the fractal's focal zone
    vec2 heart_center = vec2(0.0, 0.08);  // approximate screen position of the clit

    // Heart size: grows with climax, pulses with bass
    float heart_scale = mix(0.0, 0.12, climax) * HEART_BEAT;

    // Heart SDF — only computed when climax > 0 (avoid artifacts when scale=0)
    float heart_dist = 1.0;
    if (heart_scale > 0.001) {
        vec2 heart_uv = (uv - heart_center) / max(heart_scale, 0.001);
        heart_dist = heartSDF(heart_uv) * heart_scale;  // back to screen-space distance
    }

    // Heart glow: soft inside, radiant edge, fading outside
    // Negative = inside heart, positive = outside
    float heart_inside = smoothstep(0.005, -0.01, heart_dist);   // solid interior
    float heart_edge = smoothstep(0.02, 0.0, abs(heart_dist));   // bright edge ring
    float heart_glow = smoothstep(0.08, 0.0, heart_dist);        // soft outer radiance

    // Concentric radiant waves pulsing outward from the heart
    // These create the "radiating energy" effect
    float wave_dist = length(uv - heart_center);
    // Waves expand outward over time, bass drives their speed
    float wave_phase = wave_dist * 30.0 - iTime * 3.0 - bassZScore * 2.0;
    float waves = pow(max(sin(wave_phase) * 0.5 + 0.5, 0.0), 4.0);
    // Waves fade with distance and only appear during climax
    float wave_fade = smoothstep(0.4, 0.05, wave_dist);
    float radiant_waves = waves * wave_fade * climax * 0.4;

    // ========================================================================
    // CHROMADEPTH MAPPING
    // ========================================================================

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — lace keeps its original rainbow
    // ========================================================================

    vec3 sexy_col = rainbow.rgb;

    // Background
    vec3 bg_cool = vec3(0.02, 0.015, 0.08);
    vec3 bg_warm = vec3(0.06, 0.02, 0.04);
    vec3 bg_purple = mix(bg_cool, bg_warm, WARMTH);

    vec3 col = mix(bg_purple, sexy_col, lace);

    // Filigree
    vec3 fil_cool = vec3(0.6, 0.5, 0.75);
    vec3 fil_warm = vec3(0.8, 0.6, 0.45);
    col += mix(fil_cool, fil_warm, WARMTH) * lace_fine * 0.25;

    // Rim
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_cool = vec3(0.3, 0.15, 0.65);
    vec3 rim_warm = vec3(0.8, 0.3, 0.5);
    vec3 rim_col = mix(rim_cool, rim_warm, RIM_WARMTH);
    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // FOCAL GLOW — subtle warm ember when no climax
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.3, 0.0, 1.0);

    // Heart/gem color from glow_hue
    float gem_h = GLOW_HUE * 6.2832;
    vec3 heart_color = vec3(
        0.6 + 0.4 * cos(gem_h),
        0.15 + 0.35 * cos(gem_h + 2.094),
        0.15 + 0.35 * cos(gem_h + 4.189)
    );
    heart_color = max(heart_color, vec3(0.05));

    // When no climax: subtle focal ember (same as clit/4 but simpler)
    float ember_str = focal * 0.2 * (1.0 - climax);
    col += heart_color * ember_str;

    // ========================================================================
    // HEART RENDERING — only during climax
    // The heart blooms from the focal point, glowing with radiant energy.
    // Interior is white-hot, edge is the heart_color, glow spreads warm light.
    // ========================================================================

    if (climax > 0.01) {
        // Heart interior — white-hot core fading to heart_color at edges
        vec3 heart_core = vec3(1.0, 0.9, 0.95);  // white-hot
        vec3 heart_body = mix(heart_color * 1.5, heart_core, heart_inside * 0.6);

        // The heart shape itself — solid glowing form
        col = mix(col, heart_body, heart_inside * climax);

        // Bright edge — the heart's outline glows intensely
        vec3 edge_col = heart_color * 2.0;
        col += edge_col * heart_edge * climax * 0.8;

        // Soft outer radiance — heart casts warm light onto surrounding lace
        col += heart_color * heart_glow * climax * 0.3;

        // Concentric radiant waves — energy pulsing outward from the heart
        // These light up the lace they pass through
        vec3 wave_col = mix(heart_color, vec3(1.0, 0.8, 0.9), 0.3);
        col += wave_col * radiant_waves * (0.5 + lace * 0.5);
    }

    // ========================================================================
    // DROP/CLIMAX SPOTLIGHT — dim background, boost focal area
    // ========================================================================

    float bg_dim = mix(1.0, 0.15, drop);
    float spotlight = mix(bg_dim, 1.0, max(focal, heart_glow * climax));
    col *= spotlight;

    // ========================================================================
    // FINISHING
    // ========================================================================

    if (beat) {
        col += vec3(0.15, 0.04, 0.02) * max(focal, heart_inside * climax);
        col *= 1.05;
    }

    col *= PULSE;

    // Feedback
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.95, FEEDBACK_MIX);

    // Vignette
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.2, 2.8);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.5, 0.85);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness enforcement — heart is allowed to be bright too
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, heart_glow * climax));
    col *= mix(0.15, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    // Store climax accumulator in alpha for next frame
    P = vec4(col, climax_state);
}
