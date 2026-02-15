// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, sexy, ambient, garden, bioluminescent
// Midnight Garden — night-blooming flower variant of the clit fractal
// The fractal slowly opens and closes like a time-lapse night-blooming cereus.
// Colors: deep jewel tones — midnight blue, deep purple, emerald, bioluminescent accents.
// The gem is a moonlit dewdrop. Lace patterns = leaf veins and petal edges.
// On extreme z-scores: rapid bloom burst, luminous pollen release.
// Fast reactions ONLY on abs(z-score) > 0.6. Organic and slowly blossoming in silence.
//
// Based on clit/4 (Dom Mandy's complex power fractal)

// ============================================================================
// CREATURE TRAITS — independent URL params that make each instance unique
// Usage: ?shader=clit/variations/midnight-garden&wing_speed=0.3&warmth=0.2
// All default to 0.5 (neutral). Range 0.0-1.0.
// ============================================================================

// Wing flap speed — lazy petal unfurl (0) vs rapid bloom (1)
// #define WING_SPEED wing_speed
#define WING_SPEED 0.3
// #define WING_SPEED knob_71

// Wing span — tight bud (0) vs full bloom sweep (1)
// #define WING_SPAN wing_span
#define WING_SPAN 0.5
// #define WING_SPAN knob_72

// Gem hue — not used here; gem is always moonlit dewdrop (silver-blue)
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.55
// #define GLOW_HUE knob_73

// Lace density — delicate leaf veins (0) vs dense petal edges (1)
// #define LACE_DENSITY lace_density
#define LACE_DENSITY 0.5
// #define LACE_DENSITY knob_74

// Vignette tightness — wide garden view (0) vs intimate single bloom (1)
// #define VIGNETTE_SIZE vignette_size
#define VIGNETTE_SIZE 0.5
// #define VIGNETTE_SIZE knob_75

// Feedback/trails — crisp petals (0) vs ethereal petal ghosting (1)
// #define TRAIL_AMOUNT trail_amount
#define TRAIL_AMOUNT 0.6
// #define TRAIL_AMOUNT knob_76

// Color temperature — cool moonlit blue (0) vs warm bioluminescent green (1)
// #define WARMTH warmth
#define WARMTH 0.3
// #define WARMTH knob_77

// Fractal complexity — simple bloom (0) vs intricate petal detail (1)
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// BLOOM CYCLE — the core slow oscillation (40s full cycle)
// ============================================================================

#define BLOOM_PERIOD 40.0
#define BLOOM (0.5 + 0.5 * sin(iTime * 6.2832 / BLOOM_PERIOD))

// Secondary bloom harmonics for organic feel
#define BLOOM_SUB (0.5 + 0.5 * sin(iTime * 6.2832 / (BLOOM_PERIOD * 1.618)))

// Z-score gate threshold — audio only kicks in above this
#define ZSCORE_GATE 0.6

// Gating function: returns 0 when |zScore| < ZSCORE_GATE, ramps up above it
#define GATE(zs) clamp((abs(zs) - ZSCORE_GATE) / (1.0 - ZSCORE_GATE), 0.0, 1.0)

// Rapid bloom gate — even higher threshold for the burst effect
#define BURST_GATE 0.7
#define BURST(zs) clamp((abs(zs) - BURST_GATE) / (1.0 - BURST_GATE), 0.0, 1.0)

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated, bloom-driven defaults
// ============================================================================

// Shape complexity: bloom opens/closes the fractal. A rises with bloom.
#define A_BASE (1.3 + BLOOM * 0.4 + (COMPLEXITY - 0.5) * 0.3)
#define A_AUDIO (GATE(spectralCentroidZScore) * spectralCentroidZScore * 0.12)
#define A (A_BASE + A_AUDIO)
// #define A 1.5

// Body offset: bloom shifts the form slightly
#define B_BASE (0.5 + BLOOM * 0.1)
#define B_AUDIO (GATE(energyZScore) * energyZScore * 0.08)
#define B (B_BASE + B_AUDIO)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very gentle, only on gated z-scores
#define PULSE (1.0 + GATE(bassZScore) * bassZScore * 0.03)
// #define PULSE 1.0

// Feedback — moderate (0.35 base) for petal trail ghosting
#define FEEDBACK_MIX (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.2, 0.5) + energyNormalized * 0.05)
// #define FEEDBACK_MIX 0.35

// Rim lighting: treble drives leaf edge glow — soft green-teal
#define RIM_INTENSITY (0.3 + trebleNormalized * 0.5)
// #define RIM_INTENSITY 0.5

// Rim is always green-teal for leaf edge glow (not warmth-shifted)
#define RIM_WARMTH 0.0
// #define RIM_WARMTH 0.0

// Gem brilliance: moonlit dewdrop — subtler than ruby
#define GEM_BRILLIANCE (0.7 + spectralCrestNormalized * 0.4)
// #define GEM_BRILLIANCE 0.9

// Gem dispersion: prismatic moonlight
#define GEM_DISPERSION (0.2 + spectralSpreadNormalized * 0.3)
// #define GEM_DISPERSION 0.35

// Tendril curl: slow petal unfurling matched to bloom cycle (period 40s)
// On z > 0.7, rapid bloom burst adds fast motion
#define PETAL_RATE (6.2832 / BLOOM_PERIOD)
#define PETAL_AMP mapValue(WING_SPAN, 0.0, 1.0, 0.15, 0.7)
#define BURST_SPEED (BURST(spectralFluxZScore) * 2.0 + BURST(spectralCentroidZScore) * 1.5)
#define TENDRIL_CURL (sin(iTime * PETAL_RATE) * PETAL_AMP + sin(iTime * PETAL_RATE * 0.618) * PETAL_AMP * 0.5 + BURST_SPEED * 0.4)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent petal axis for organic asymmetry
#define TENDRIL_CROSS (sin(iTime * PETAL_RATE * 0.77 + 0.8) * PETAL_AMP * 0.7 + sin(iTime * PETAL_RATE * 0.43 + 1.5) * PETAL_AMP * 0.4 + BURST_SPEED * 0.25)
// #define TENDRIL_CROSS 0.0

// Flow drift: gentle breeze through the garden
#define FLOW_X (spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (spectralSpreadSlope * 0.0015)
// #define FLOW_Y 0.0

// Drop trigger: multiple z-scores spiking + confident energy drop
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Calm heuristic: how "normal" is the audio right now?
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay speeds — slower for lingering pollen glow
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.006
#define DROP_DECAY_MAX 0.035

// Focal center drifts gently with bloom cycle
#define FOCAL_X (sin(iTime * 6.2832 / (BLOOM_PERIOD * 1.3)) * 0.04)
#define FOCAL_Y (0.12 + cos(iTime * 6.2832 / (BLOOM_PERIOD * 0.9)) * 0.03)

// ============================================================================
// JEWEL TONE PALETTE — midnight garden colors
// ============================================================================

// Lace color shifts with bloom: closed=deep purple, open=luminous emerald green
vec3 gardenLaceColor(float bloom_phase, float luma) {
    vec3 closed_purple = vec3(0.25, 0.08, 0.45);   // deep purple (closed bud)
    vec3 open_green = vec3(0.1, 0.55, 0.25);        // luminous emerald (full bloom)
    vec3 base = mix(closed_purple, open_green, bloom_phase);
    // Add some luminance variation from fractal structure
    base *= (0.7 + luma * 0.6);
    return base;
}

// Bioluminescent sparkle color
vec3 bioLuminescent(float t) {
    // Shifts from deep blue-green to bright chartreuse
    return vec3(
        0.05 + 0.15 * t,
        0.4 + 0.5 * t,
        0.2 + 0.2 * (1.0 - t)
    );
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Petal unfurling curl — slow bloom + burst on extreme z-scores
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulated proximity for organic focal glow
    float focal_trap = 0.0;
    float focal_weight = 0.0;
    vec2 focal_center = vec2(FOCAL_X, FOCAL_Y);

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

        // Soft accumulated proximity — gaussian falloff
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree = leaf veins and petal edges
    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    float lace_sharp = mapValue(LACE_DENSITY, 0.0, 1.0, 2.0, 4.0);
    lace = pow(max(lace, 0.0), lace_sharp);

    // Lace gently breathes with bloom cycle
    float lace_breath = 0.75 + 0.25 * BLOOM;
    lace *= lace_breath;
    lace_fine *= lace_breath;

    // Fractal structure — jewel-tone phase shift
    // Bloom shifts color phase: closed = purples, open = greens
    float color_phase = -1.0 + BLOOM * 1.2 + (WARMTH - 0.5) * 0.8;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — moonlit dewdrop
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Gem rim — soft organic petal edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Gem specular — fractal creates natural dewdrop highlights
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal brilliance — slow moonlit pulse
    float gem_pulse = 0.85 + 0.15 * sin(iTime * 0.3);

    // Prismatic dispersion — moonlight through dewdrop
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.3),
        pow(f_safe, 2.0),
        pow(f_safe, 1.8 + disp * 0.3)
    );

    // Gem depth shading
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

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

    // ========================================================================
    // DROP STATE — pollen burst requires turbulence > 4.0
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // Higher threshold: only very extreme events trigger the pollen burst
    float drop_signal = clamp(drop_trigger * smoothstep(4.0, 6.0, turbulence), 0.0, 1.0);

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    float settled = AUDIO_SETTLED;
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, decay_rate);
    drop_state = clamp(drop_state, 0.0, 1.0);

    float drop = animateEaseInOutCubic(drop_state);

    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — midnight garden jewel tones
    // ========================================================================

    // Lace color shifts with bloom phase: purple (closed) to emerald (open)
    vec3 lace_col = gardenLaceColor(BLOOM, luma);

    // Background: midnight blue-green
    vec3 bg = vec3(0.01, 0.02, 0.03);

    vec3 col = mix(bg, lace_col, lace);

    // Filigree highlights — bioluminescent leaf vein glow
    vec3 vein_glow = mix(
        vec3(0.15, 0.25, 0.45),   // moonlit blue veins (closed)
        vec3(0.2, 0.6, 0.3),      // luminous green veins (open)
        BLOOM
    );
    col += vein_glow * lace_fine * 0.3;

    // Rim detection — leaf edges glow soft green-teal
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Rim is always soft green-teal for leaf edge glow
    vec3 rim_col = vec3(0.1, 0.5, 0.4);
    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // GEM FOCAL — moonlit dewdrop (white-silver with subtle blue tint)
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.3, 0.0, 1.0);

    // Dewdrop colors — silver-white with blue-moonlight tint
    vec3 gem_base = vec3(0.5, 0.55, 0.7);      // cool silver-blue
    vec3 gem_fire = vec3(0.6, 0.7, 0.9);       // bright moonlight
    vec3 gem_white = vec3(0.9, 0.95, 1.0);     // silver-white highlight

    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    float sparkle_str = mix(0.3, 0.8, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Gem rim — moonlit silver edges
    vec3 rim_inner = vec3(0.7, 0.8, 1.0);      // bright silver
    vec3 rim_outer = vec3(0.2, 0.3, 0.6);      // deep blue shadow
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.6, 1.2, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    // Outer moonlight halo around dewdrop
    float glow_str = mix(0.06, 0.2, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // LUMINOUS PARTICLES — bioluminescent pollen/firefly sparkles
    // Scattered green sparkles using random(), always present but subtle
    // Intensified dramatically on drop (pollen burst)
    // ========================================================================

    vec2 pixel = gl_FragCoord.xy;
    // Grid-based sparkle field — each cell can have a sparkle
    float sparkle_scale = 8.0;
    vec2 sparkle_cell = floor(pixel / sparkle_scale);
    float sparkle_rand = random(sparkle_cell);

    // Only ~3% of cells have a sparkle
    float has_sparkle = step(0.97, sparkle_rand);

    // Sparkle twinkle — each sparkle blinks at its own rate
    float twinkle_phase = sparkle_rand * 100.0 + iTime * (0.3 + sparkle_rand * 0.5);
    float twinkle = pow(max(sin(twinkle_phase), 0.0), 8.0);

    // Sparkle brightness: very subtle normally, bright on bloom peak and drop
    float sparkle_base = 0.02 * twinkle * has_sparkle;
    float sparkle_bloom = sparkle_base * (0.3 + BLOOM * 0.7);
    float sparkle_drop_boost = drop * 0.15 * twinkle * has_sparkle;
    float sparkle_total = sparkle_bloom + sparkle_drop_boost;

    // Bioluminescent green sparkle color
    vec3 sparkle_color = bioLuminescent(sparkle_rand);
    col += sparkle_color * sparkle_total;

    // ========================================================================
    // DROP MODE — pollen burst: scattered bright dots + bloom acceleration
    // ========================================================================

    float bg_dim = mix(1.0, 0.3, drop);
    float focal_boost = mix(1.0, 2.0, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Rim goes bright bioluminescent on drop
    vec3 rim_hot = vec3(0.2, 0.8, 0.4);
    col += rim_hot * rim * drop * 0.25;

    // Dewdrop blazes with moonlight on drop
    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_fire * blaze * 0.4;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.3;
    col += gem_prism * vec3(0.2, 0.6, 0.8) * gem_rim * drop * 0.3;

    // Extra pollen burst particles on drop — brighter, denser sparkle field
    float pollen_scale = 4.0;
    vec2 pollen_cell = floor(pixel / pollen_scale);
    float pollen_rand = random(pollen_cell + vec2(42.0, 17.0));
    float pollen_active = step(0.92, pollen_rand) * drop;
    float pollen_twinkle = pow(max(sin(pollen_rand * 80.0 + iTime * 3.0), 0.0), 4.0);
    vec3 pollen_col = mix(
        vec3(0.3, 0.9, 0.4),   // bright green pollen
        vec3(0.8, 1.0, 0.5),   // yellow-green flash
        pollen_rand
    );
    col += pollen_col * pollen_active * pollen_twinkle * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat flash — very subtle, tinted green
    if (beat) {
        col += vec3(0.02, 0.08, 0.04) * focal;
        col *= 1.03;
    }

    col *= PULSE;

    // Frame feedback — moderate (0.35ish) for petal trail ghosting
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.2, 2.8);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.5, 0.85);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness control: only lace, rim, focal, and sparkles get to be bright
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, max(gem_rim * 0.7, sparkle_total * 5.0)));
    col *= mix(0.12, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma — slightly cool/blue for moonlit night feel
    col = pow(max(col, vec3(0.0)), vec3(0.95, 0.9, 0.85));

    P = vec4(col, drop_state);
}
