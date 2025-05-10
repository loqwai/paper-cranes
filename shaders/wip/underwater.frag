// Original: Adapted from "Psychedelic Trip" style shaders
// Refactored for clarity, descriptive names, and HSL palette integration

// --- Base Colors & Iterations ---
#define GOLD_HSL vec3(0.13f, 0.9f, 0.55f) // Bright Gold
#define DARK_BLUE_HSL vec3(0.6f, 0.85f, 0.3f) // Dark Blue
#define ITERATIONS 19.0f

// --- Time & Loop Control ---
#define TIME_INCREMENT_PER_ITER 1.0f // How much 'time' advances per iteration in the main loop
#define GROWTH_INCREMENT_PER_ITER 0.03f // How much 'growth_factor' increases per iteration

// --- UV & Initial Values ---
#define UV_SCALE_INITIAL 0.2f          // Initial scaling for UV coordinates
#define INITIAL_GROWTH_FACTOR 0.5f     // Starting value for 'growth_factor'
#define INITIAL_VISUAL_FEEDBACK 0.5f   // Starting value for 'visual_feedback_metric'

// --- Palette Animation & Clamping ---
#define SPARKLE_POWER_BASE 5.0f   // Base for 'gold_amount' exponent, affecting sparkle sharpness
#define SPARKLE_POWER_ANIM_AMP 4.0f    // Amplitude for sine wave modulating sparkle sharpness exponent
#define SPARKLE_POWER_ANIM_FREQ 0.3f   // Frequency for sine wave modulating sparkle sharpness exponent
#define DARK_COLOR_SAT_MIN_FACTOR 0.9f   // Factor for DARK_BLUE_HSL saturation clamp min
#define GOLD_COLOR_SAT_MAX_FACTOR 1.05f // Factor for GOLD_HSL saturation clamp max
#define DARK_COLOR_LGT_MIN_FACTOR 0.9f   // Factor for DARK_BLUE_HSL lightness clamp min
#define GOLD_COLOR_LGT_MAX_FACTOR 1.05f // Factor for GOLD_HSL lightness clamp max

// --- Point Transformation Parameters (for fractal calculation) ---
#define FRACTAL_ROTATION_SPEED_SCALE 0.02f                // Scales time effect in fractal arm rotation
#define FRACTAL_ROTATION_PHASE_VEC vec4(0.0f, 11.0f, 33.0f, 0.0f) // Phase offset vector for fractal arm rotation
#define FRACTAL_SWIRL_ANGLE_POINT_SCALE 100.0f             // Scales point.yx for swirl angle calculation
#define FRACTAL_SWIRL_STRENGTH_SCALE 40.0f                 // Scales strength of the swirl effect
#define FRACTAL_SWIRL_MAGNITUDE_DIVISOR 200.0f             // Divisor for final swirl effect magnitude (larger = smaller effect)
#define FRACTAL_GROWTH_EFFECT_SCALE 0.2f                  // Scale factor for iterative growth/expansion of the fractal
#define COLOR_FEEDBACK_SENSITIVITY 0.01f            // Sensitivity of fractal transformation to previous frame's color metric
#define COLOR_FEEDBACK_EXP_CLAMP 20.0f              // Max value for color feedback exponent input to prevent overflow
#define COLOR_FEEDBACK_OSCILLATION_FACTOR 4.0f           // Numerator for cos term in color feedback, affecting oscillation
#define COLOR_FEEDBACK_MAGNITUDE_DIVISOR 300.0f            // Divisor for color feedback effect magnitude (larger = smaller effect)

// --- Iteration Intensity Calculation Parameters (determines brightness/activity) ---
#define DETAIL_PATTERN_SCALE_FACTOR 1.5f        // Scales point in detail pattern generation (sin argument numerator)
#define DETAIL_PATTERN_SWIRL_FACTOR 9.0f     // Scales point.yx in detail pattern, adding swirl/asymmetry
#define DETAIL_PATTERN_CENTER_OFFSET 0.5f         // Offset for point_dot_square in detail pattern denominator (distance from center focus)
// Safety epsilon values for division
#define EPSILON_SAFE_DENOM_ANGLE 0.001f           // Min magnitude for denominator in detail pattern angle calculation
#define EPSILON_SAFE_DENOM_FINAL 0.0001f          // Min magnitude for final denominator in intensity calculation

// --- V_Parameter Calculation (modulates intensity pattern, in main loop) ---
#define PATTERN_MODULATION_POINT_SCALE 7.0f          // Scales point influence on pattern modulation parameter (v_parameter)
#define PATTERN_MODULATION_CENTER_BIAS 5.0f              // Bias for point influence on pattern modulation parameter

// --- Final Color Mapping & Visual Feedback Update ---
#define INTENSITY_OSCILLATION_SEED_VEC vec4(1.0f, 2.0f, 3.0f, 0.0f) // Seed vector for intensity oscillation numerator
#define VISUAL_FEEDBACK_SMOOTHING 0.1f         // Smoothing factor for updating visual feedback metric from total intensity
#define MAX_VISUAL_FEEDBACK 10.0f           // Max clamp for visual_feedback_metric
#define INTENSITY_TO_SPARKLE_THRESHOLD_BASE 0.025f // Base scale for converting average intensity to sparkle metric
#define GOLD_SPARK_SENSITIVITY_FACTOR 1.0f         // Higher value = more gold sparks. Modulates INTENSITY_TO_SPARKLE_THRESHOLD_BASE.
#define SPARKLE_SHARPNESS_EXPONENT 0.65f            // Exponent for sparkle metric, controlling sharpness of gold highlights
#define EDGE_DARKENING_DIVISOR 250.0f               // Divisor for UV-based edge darkening effect (larger = less darkening)

// It's assumed that hsl2rgb and rgb2hsl are provided externally
// vec3 hsl2rgb(vec3 hsl) { ... }
// vec3 rgb2hsl(vec3 rgb) { ... }

// Color palette function using iTime for animation
vec3 getHeightBasedPaletteHSL(float peak_metric) {
    float metric = clamp(peak_metric, 0.0f, 1.0f);
    float gold_power = SPARKLE_POWER_BASE + SPARKLE_POWER_ANIM_AMP * sin(iTime * SPARKLE_POWER_ANIM_FREQ);
    float gold_amount = pow(metric, gold_power);

    vec3 color = mix(DARK_BLUE_HSL, GOLD_HSL, gold_amount);

    color.y = clamp(color.y, DARK_BLUE_HSL.y * DARK_COLOR_SAT_MIN_FACTOR, GOLD_HSL.y * GOLD_COLOR_SAT_MAX_FACTOR);
    color.z = clamp(color.z, DARK_BLUE_HSL.z * DARK_COLOR_LGT_MIN_FACTOR, GOLD_HSL.z * GOLD_COLOR_LGT_MAX_FACTOR);
    return color;
}

void transformPoint(inout vec2 point, float iter, float time_val, float growth_val, float color_feedback_metric) {
    vec4 cos_arg_vec = iter + FRACTAL_ROTATION_SPEED_SCALE * time_val - FRACTAL_ROTATION_PHASE_VEC;
    point *= mat2(cos(cos_arg_vec));

    float point_dot_square = dot(point, point);

    // Term 1: tanh-based transformation (Corrected Vector Math)
    vec2 tanh_input_angle_vec = FRACTAL_SWIRL_ANGLE_POINT_SCALE * point.yx + time_val;
    vec2 cos_of_angle_vec = cos(tanh_input_angle_vec);
    vec2 tanh_argument_vec = FRACTAL_SWIRL_STRENGTH_SCALE * point_dot_square * cos_of_angle_vec;
    vec2 tanh_result_vec = tanh(tanh_argument_vec);
    vec2 tanh_effect = tanh_result_vec / FRACTAL_SWIRL_MAGNITUDE_DIVISOR;

    // Term 2: Growth-based transformation
    vec2 growth_effect = FRACTAL_GROWTH_EFFECT_SCALE * growth_val * point;

    // Term 3: Color feedback based transformation
    float feedback_exp_input = color_feedback_metric * color_feedback_metric * COLOR_FEEDBACK_SENSITIVITY;
    float safe_feedback_exp_input = min(feedback_exp_input, COLOR_FEEDBACK_EXP_CLAMP);
    float cos_feedback_val = cos(COLOR_FEEDBACK_OSCILLATION_FACTOR / exp(safe_feedback_exp_input) + time_val);
    vec2 feedback_effect = vec2(cos_feedback_val / COLOR_FEEDBACK_MAGNITUDE_DIVISOR);

    point += tanh_effect + growth_effect + feedback_effect;
}

float getIterationIntensity(vec2 point, vec2 v_parameter, float time_val, float iter, vec4 base_color_driver) {
    vec4 numerator_components = 1.0f + cos(base_color_driver + time_val);
    float v_dot_square = dot(v_parameter, v_parameter);
    float denom_scaling_factor = 1.0f + iter * v_dot_square;

    float point_dot_square = dot(point, point);
    float safe_ratio_denom = DETAIL_PATTERN_CENTER_OFFSET - point_dot_square;

    if (abs(safe_ratio_denom) < EPSILON_SAFE_DENOM_ANGLE) {
        safe_ratio_denom = EPSILON_SAFE_DENOM_ANGLE * (safe_ratio_denom >= 0.0f ? 1.0f : -1.0f);
        if (safe_ratio_denom == 0.0f) safe_ratio_denom = EPSILON_SAFE_DENOM_ANGLE; // Ensure non-zero if original was exactly 0
    }

    vec2 sin_arg_point_term = DETAIL_PATTERN_SCALE_FACTOR * point / safe_ratio_denom;
    vec2 sin_argument = sin_arg_point_term - DETAIL_PATTERN_SWIRL_FACTOR * point.yx + time_val;
    float length_of_sin_term = length(denom_scaling_factor * sin(sin_argument));
    float safe_length_of_sin_term = max(length_of_sin_term, EPSILON_SAFE_DENOM_FINAL);

    vec4 iteration_intensity_vec4 = numerator_components / safe_length_of_sin_term;
    return length(iteration_intensity_vec4);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 point = (2.0f * fragCoord - iResolution.xy) * UV_SCALE_INITIAL / iResolution.y;

    float total_intensity_metric = 0.0f;
    float current_loop_time = iTime;
    float growth_factor = INITIAL_GROWTH_FACTOR;
    float visual_feedback_metric = INITIAL_VISUAL_FEEDBACK;

    for (float iter = 0.0f; iter < ITERATIONS; ++iter) {
        current_loop_time += TIME_INCREMENT_PER_ITER;
        growth_factor += GROWTH_INCREMENT_PER_ITER;

        vec2 v_parameter = cos(current_loop_time - PATTERN_MODULATION_POINT_SCALE * point * pow(growth_factor, iter)) - PATTERN_MODULATION_CENTER_BIAS * point;
        transformPoint(point, iter, current_loop_time, growth_factor, visual_feedback_metric);

        float iter_intensity = getIterationIntensity(point, v_parameter, current_loop_time, iter, INTENSITY_OSCILLATION_SEED_VEC);
        total_intensity_metric += iter_intensity;

        visual_feedback_metric = clamp(total_intensity_metric / (iter + 1.0f) * VISUAL_FEEDBACK_SMOOTHING, 0.0f, MAX_VISUAL_FEEDBACK);
    }

    float average_intensity = total_intensity_metric / ITERATIONS;
    float mapped_peak_metric = pow(average_intensity * INTENSITY_TO_SPARKLE_THRESHOLD_BASE * GOLD_SPARK_SENSITIVITY_FACTOR, SPARKLE_SHARPNESS_EXPONENT);
    mapped_peak_metric = clamp(mapped_peak_metric, 0.0f, 1.0f);

    float uv_distance_darkening = dot(point, point) / EDGE_DARKENING_DIVISOR;
    vec3 hsl_final_color = getHeightBasedPaletteHSL(mapped_peak_metric);
    hsl_final_color.z = clamp(hsl_final_color.z - uv_distance_darkening, 0.0f, 1.0f);

    fragColor = vec4(hsl2rgb(hsl_final_color), 1.0f);

    if (isinf(fragColor.x) || isnan(fragColor.x) ||
        isinf(fragColor.y) || isnan(fragColor.y) ||
        isinf(fragColor.z) || isnan(fragColor.z)) {
        fragColor = vec4(0.0f, 0.0f, 0.0f, 1.0f);
    }
}
