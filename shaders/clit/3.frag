// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, sexy
// Chromatic Flow (Body) — Chromadepth anatomy with drop-reactive focus
// Red = closest (clitoris pops out), Blue = farthest (background recedes)
// Based on Dom Mandy's complex power fractal

// ============================================================================
// VARIATION — ?variation=0.0-1.0 in URL, auto-injected as uniform
// Each value creates a unique but beautiful variant of the fractal
// Default 0.0 = original look. Try ?variation=0.3, 0.5, 0.7, etc.
// ============================================================================

// Wrap via #define so you can swap the source (knob, audio feature, etc.)
// Use ?variation=0.5 in URL to inject the uniform at runtime
// #define VARIATION variation
#define VARIATION 0.0
// #define VARIATION knob_71
// #define VARIATION pitchClassNormalized

// Derive several independent offsets from the single value
// All zero when VARIATION=0.0 so default matches clit/2's palette exactly
#define VAR_A sin(VARIATION * 6.2832)
#define VAR_B (cos(VARIATION * 6.2832) - 1.0)
#define VAR_C sin(VARIATION * 6.2832 * 2.0)
#define VAR_D (cos(VARIATION * 6.2832 * 3.0) - 1.0)

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Shape complexity: centroid controls fractal power
// variation shifts the base power (1.3–1.7 range) — changes tendril density
#define A mapValue(spectralCentroidZScore, 0., 1., 1.2, 1.8) + 0.1 + VAR_A * 0.15
// #define A 1.5

// Body offset: energy shifts the form
// variation shifts the base offset — changes body proportions
#define B (0.55 + VAR_B * 0.08 + energyZScore * 0.15)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse
#define PULSE (1.0 + bassZScore * 0.06)
// #define PULSE 1.0

// Feedback
#define FEEDBACK_MIX (0.25 + energyNormalized * 0.1)
// #define FEEDBACK_MIX 0.3

// Rim lighting: treble drives the body edge glow
#define RIM_INTENSITY (0.4 + trebleNormalized * 0.6)
// #define RIM_INTENSITY 0.7

// Rim color warmth: spectral roughness shifts rim from cool violet to warm pink
#define RIM_WARMTH (0.3 + spectralRoughnessNormalized * 0.4)
// #define RIM_WARMTH 0.5

// Gem brilliance: how intensely the focal gem glows
#define GEM_BRILLIANCE (0.8 + spectralCrestNormalized * 0.5)
// #define GEM_BRILLIANCE 1.0

// Gem dispersion: prismatic color separation driven by spectral spread
#define GEM_DISPERSION (0.3 + spectralSpreadNormalized * 0.4)
// #define GEM_DISPERSION 0.5

// Tendril curl: slow time-based flapping + audio slope adds on top
// Two sine waves at different rates = asymmetric wing-like curl and flap
#define TENDRIL_CURL (sin(iTime * 0.3) * 0.5 + sin(iTime * 0.17) * 0.3 + spectralCentroidSlope * 0.3)
// #define TENDRIL_CURL 0.0

// Flow drift: slopes drive feedback UV offset for flowing trail motion
#define FLOW_X (spectralCentroidSlope * 0.003)
// #define FLOW_X 0.0
#define FLOW_Y (spectralSpreadSlope * 0.002)
// #define FLOW_Y 0.0

// Drop trigger: multiple z-scores spiking + confident energy drop = drop event
// Sum absolute z-scores across domains — when many features shift at once, something happened
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Calm heuristic: how "normal" is the audio right now?
// Mix of: low z-scores + low slopes + low rSquared = audio is settled
// Each term is 0 when active, 1 when calm — multiply them for "all calm"
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
// Combined: all three must be calm for full settle signal
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay speeds
#define DROP_RAMP 0.08
#define DROP_DECAY_MIN 0.01
#define DROP_DECAY_MAX 0.06

// ============================================================================
// CHROMADEPTH COLOR — red closest, blue farthest
// ============================================================================

vec3 chromadepth(float t) {
    // t=0 → red (closest), t=1 → blue/violet (farthest)
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float chromaBoost = 1.0 + 0.2 * sin(t * 3.14159 * 2.0);
    // Darken significantly as depth increases — deep violet bg
    float L = 0.7 - t * 0.45;
    float C = 0.25 * chromaBoost * (1.0 - t * 0.3);
    float h = hue * 6.28318;
    vec3 lab = vec3(L, C * cos(h), C * sin(h));
    return clamp(oklab2rgb(lab), 0.0, 1.0);
}

// Warm chromadepth — deep dark violet background, hot reds up front
vec3 warmChromadepth(float depth, float warmth) {
    vec3 cd = chromadepth(depth);
    // Zorn-inspired: deep violet-black bg, warm ochre-red foreground
    vec3 warm_tint = mix(
        vec3(0.95, 0.3, 0.15),   // hot red-ochre for close
        vec3(0.04, 0.01, 0.06),  // near-black violet for far
        depth
    );
    return mix(cd, warm_tint, warmth);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77 + VAR_C * 0.06;
    C.y += VAR_D * 0.04;
    // Time-driven curl flaps the wings — X and Y at different phases for asymmetry
    float curl = TENDRIL_CURL;
    float curl_cross = sin(iTime * 0.23) * 0.4 + sin(iTime * 0.13 + 1.0) * 0.25 + spectralSpreadSlope * 0.2;
    V = C + vec2(curl * 0.02, curl_cross * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit trap for focal point
    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);

    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(d) / 2.));
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;

        x = min(x, abs(V.x));
        y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;

        // Track orbit proximity to focal point
        float fd = length(V - focal_center);
        focal_trap = min(focal_trap, fd);
    }

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(y)) * smoothstep(1., -6., log(x));

    // Lace/filigree lines from orbit traps — this is the fairy-like patterning
    // variation shifts lace fineness — some variants have thicker/thinner threads
    float lace_lo = -2.0 + VAR_A * 0.4;
    float lace_hi = -5.0 + VAR_B * 0.5;
    float lace_x = smoothstep(lace_lo, lace_hi, log(x));
    float lace_y = smoothstep(lace_lo, lace_hi, log(y));
    float lace = max(lace_x, lace_y);                // combined lace pattern
    float lace_fine = lace_x * lace_y;               // extra-fine intersection detail
    // Sharpen lace — variation controls crispness (2.0 softer → 4.0 sharper)
    lace = pow(lace, 3.0 + VAR_D * 0.8);

    // No spine masking — don't draw a line through the anatomy

    // Fractal structure for depth mapping
    // variation rotates the rainbow phase — different color palettes on the lace
    float phase_shift = VAR_C * 1.2;
    vec4 rainbow = sqrt(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + phase_shift));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT detection — gem-like brilliance
    // ========================================================================

    // Orbit trap glow — where the fractal naturally converges
    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(focal_glow, 2.0);  // softer falloff for larger gem body

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Gem rim — bright ring at the edge of the focal region (like light
    // refracting around a cut gemstone's girdle)
    float focal_inner = smoothstep(0.35, 0.02, focal_trap);
    float gem_rim = focal - pow(focal_inner, 1.5);
    gem_rim = max(gem_rim, 0.0);
    gem_rim = pow(gem_rim, 0.6) * 2.5;  // sharpen and boost the rim ring

    // Gem specular — use the fractal's own orbit trap structure, not radial spokes
    // The fractal detail inside the focal zone creates natural highlight variation
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);  // sharp highlights where fractal has structure

    // Internal brilliance — slow breathing pulse from inside the gem
    float gem_pulse = 0.85 + 0.15 * sin(iTime * 0.7);

    // Prismatic dispersion — different colors refract at different angles
    float disp = GEM_DISPERSION;
    vec3 gem_prism = vec3(
        pow(focal, 1.8 - disp * 0.3),   // red refracts least
        pow(focal, 2.0),                  // green center
        pow(focal, 1.8 + disp * 0.3)    // blue refracts most
    );

    // Gem depth shading — darker at the deep center, bright at the crown
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // CHROMADEPTH MAPPING — focal=red(close), background=blue(far)
    // ========================================================================

    // Depth: 0=closest(red), 1=farthest(blue)
    // Background → deep blue/violet, fractal detail → green/yellow, focal → red
    float base_depth = mix(0.6, 0.95, 1.0 - luma);  // bg maps to far blue/violet
    float detail_depth = mix(0.2, 0.5, luma);         // fractal ridges = mid (green/yellow)
    // Use fractal edge detection to show detail at mid-depth
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    // Focal override to pure red
    float focal_strength = pow(focal, 1.5);  // sharpen the focal falloff
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — sustained mode change, not a flash
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    // Multi-feature turbulence: when many z-scores spike at once, it's a real event
    float turbulence = ZSCORE_TURBULENCE;
    // Trigger: confident energy drop AND high turbulence across features
    float drop_signal = clamp(drop_trigger * smoothstep(2.0, 4.0, turbulence), 0.0, 1.0);

    // Read previous drop state from alpha channel of feedback frame
    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    // How settled is the audio? 0 = active/chaotic, 1 = everything back to normal
    float settled = AUDIO_SETTLED;

    // Decay rate adapts: slow decay while audio is still active, faster as it settles
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    // Accumulator: ramps up fast when triggered, decays based on how settled audio is
    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);  // ramp toward 1
    drop_state = mix(drop_state, 0.0, decay_rate);                // decay toward 0, speed adapts
    drop_state = clamp(drop_state, 0.0, 1.0);

    // Smooth the state through easing so transitions never look abrupt
    float drop = animateEaseInOutCubic(drop_state);

    // During build: depth compresses (everything shifts greener/closer)
    depth = mix(depth, depth * 0.7, build * 0.3);

    // During drop: focal goes PURE RED, background goes DEEP BLUE
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));  // bg pushes further
    depth = mix(depth, 0.0, drop * focal);                    // focal pulls to red
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — lace keeps its original rainbow, always
    // ========================================================================

    vec3 sexy_col = rainbow.rgb;

    // Background: deep velvety darkness — variation shifts the hue
    vec3 bg_purple = vec3(
        0.04 + VAR_D * 0.015,
        0.015 + VAR_A * 0.01,
        0.08 + VAR_B * 0.02
    );

    // Lace is the only thing that gets color — everything else is darkness
    vec3 col = mix(bg_purple, sexy_col, lace);

    // Pearly filigree highlights — variation tints them
    col += vec3(0.7 + VAR_B * 0.1, 0.5 + VAR_C * 0.1, 0.65 + VAR_A * 0.1) * lace_fine * 0.25;

    // Rim detection — edges of body silhouette
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    // Rim colors — variation shifts the cool/warm endpoints
    vec3 rim_cool = vec3(0.3 + VAR_D * 0.1, 0.15, 0.65 + VAR_A * 0.1);
    vec3 rim_warm = vec3(0.8, 0.3 + VAR_C * 0.1, 0.5 + VAR_B * 0.1);
    vec3 rim_col = mix(rim_cool, rim_warm, RIM_WARMTH);

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // GEM FOCAL — brilliance driven by energy, not just drop state
    // ========================================================================

    // Energy drives how intensely the gem glows right now
    float glow_energy = clamp(energyNormalized + energyZScore * 0.3, 0.0, 1.0);

    // Gem color — variation shifts between ruby, garnet, amethyst tones
    vec3 gem_base = vec3(
        1.0,
        max(0.02, 0.08 + VAR_C * 0.15),
        max(0.02, 0.12 + VAR_D * 0.2)
    );
    vec3 gem_fire = vec3(1.0, 0.4 + VAR_A * 0.1, 0.15 + VAR_B * 0.1);
    vec3 gem_white = vec3(1.0, 0.85, 0.95);

    // Internal color — prismatic refraction, intensity scales with energy
    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    // Specular highlights — energy makes them sharper
    float sparkle_str = mix(0.4, 0.9, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Gem rim light
    vec3 rim_inner = vec3(1.0, 0.25, 0.45);
    vec3 rim_outer = vec3(0.5, 0.2, 0.9);
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    // Compose gem — brilliance scales with energy
    float gem_energy_boost = mix(0.7, 1.3, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    // Blend gem onto scene
    col = mix(col, gem_col, focal * 0.85);

    // Outer glow — energy widens and intensifies the gem's cast light
    float glow_str = mix(0.08, 0.25, glow_energy);
    float outer_glow = smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // DROP MODE — sustained spotlight, not color replacement
    // During drop: bg dims, gem blazes, rim intensifies — but lace stays rainbow
    // ========================================================================

    float bg_dim = mix(1.0, 0.2, drop);
    float focal_boost = mix(1.0, 2.5, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Rim gets hotter during drop — additive, not replacing lace color
    vec3 rim_hot = vec3(1.0, 0.5, 0.2);
    col += rim_hot * rim * drop * 0.2;

    // Gem blazes during sustained drop — energy drives intensity
    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_fire * blaze * 0.5;
    col += gem_white * pow(focal, 2.5) * drop * glow_energy * 0.4;
    col += gem_prism * vec3(0.4, 0.8, 1.0) * gem_rim * drop * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat flash
    if (beat) {
        col += vec3(0.15, 0.04, 0.02) * focal;
        col *= 1.05;
    }

    // Bass pulse
    col *= PULSE;

    // Frame feedback — flowing trails with slope-driven drift
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.95, FEEDBACK_MIX);

    // Vignette — deep black/violet edges for clean chromadepth
    float vign = 1.0 - pow(length(uv) * 0.65, 1.8);
    // On drops, vignette gets tighter (more dramatic spotlight)
    vign = mix(vign, pow(vign, 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Final darkness enforcement: only lace, rim, gem, and focal get to be bright
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.15, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma — slightly warm
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    // Store drop accumulator in alpha for next frame's state read
    P = vec4(col, drop_state);
}
