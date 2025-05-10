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
#define GOLD_PALETTE_POWER_BASE 5.0f   // Base for 'gold_amount' exponent
#define GOLD_PALETTE_POWER_AMP 4.0f    // Amplitude for sine wave modulating 'gold_amount' exponent
#define GOLD_PALETTE_POWER_FREQ 0.3f   // Frequency for sine wave modulating 'gold_amount' exponent
#define PALETTE_SAT_CLAMP_LOW_F 0.9f   // Factor for DARK_BLUE_HSL saturation clamp
#define PALETTE_SAT_CLAMP_HIGH_F 1.05f // Factor for GOLD_HSL saturation clamp
#define PALETTE_LGT_CLAMP_LOW_F 0.9f   // Factor for DARK_BLUE_HSL lightness clamp
#define PALETTE_LGT_CLAMP_HIGH_F 1.05f // Factor for GOLD_HSL lightness clamp

// --- Point Transformation Parameters ---
#define POINT_ROT_TIME_SCALE 0.02f                // Scales time effect in rotation matrix construction
#define POINT_ROT_OFFSET_VEC vec4(0.0f, 11.0f, 33.0f, 0.0f) // Offset vector for rotation
#define TANH_INPUT_POINT_SCALE 100.0f             // Scales point.yx for tanh input angle vector
#define TANH_ARGUMENT_SCALE 40.0f                 // Scales (dot_product * cos_result) for tanh argument vector
#define TANH_EFFECT_DIVISOR 200.0f                // Divisor for the final tanh effect vector
#define GROWTH_EFFECT_SCALE 0.2f                  // Scale factor for growth_val effect on point
#define FEEDBACK_EXP_INPUT_SCALE 0.01f            // Scales (metric*metric) for exp input (equiv. to /100.0f)
#define FEEDBACK_EXP_CLAMP_MAX 20.0f              // Max value for exp input to prevent overflow
#define FEEDBACK_COS_ARG_NUMERATOR 4.0f           // Numerator for cos(NUMERATOR / exp(...) + time)
#define FEEDBACK_EFFECT_DIVISOR 300.0f            // Divisor for feedback effect vector

// --- Iteration Intensity Calculation Parameters ---
#define INTENSITY_SIN_ARG_POINT_SCALE 1.5f        // Scales point in sin argument numerator
#define INTENSITY_SIN_ARG_POINT_YX_SCALE 9.0f     // Scales point.yx in sin argument
#define INTENSITY_SIN_ARG_DOT_OFFSET 0.5f         // Offset for point_dot_square in sin argument denominator
// Safety epsilon values for division
#define EPSILON_SAFE_DENOM_ANGLE 0.001f           // Min magnitude for safe_ratio_denom in getIterationIntensity
#define EPSILON_SAFE_DENOM_FINAL 0.0001f          // Min magnitude for safe_length_of_sin_term in getIterationIntensity

// --- V_Parameter Calculation (in main loop) ---
#define V_PARAM_COS_POINT_POW_SCALE 7.0f          // Scales point * pow(growth, iter) in v_param cos
#define V_PARAM_SUB_POINT_SCALE 5.0f              // Scales point subtracted in v_param calculation

// --- Final Color Mapping & Feedback Update ---
#define BASE_COLOR_DRIVER_Z_VEC vec4(1.0f, 2.0f, 3.0f, 0.0f) // Constant vector for color driving term
#define FEEDBACK_METRIC_UPDATE_SCALE 0.1f         // Scale for averaging intensity into feedback metric
#define FEEDBACK_METRIC_CLAMP_MAX 10.0f           // Max clamp for visual_feedback_metric
#define PEAK_METRIC_AVG_INTENSITY_SCALE 0.025f    // Scales average_intensity for mapped_peak_metric
#define PEAK_METRIC_POW_EXPONENT 0.65f            // Exponent for mapped_peak_metric calculation
#define UV_DARKENING_DIVISOR 250.0f               // Divisor for final UV-based darkening

// It's assumed that hsl2rgb and rgb2hsl are provided externally
// vec3 hsl2rgb(vec3 hsl) { ... }
// vec3 rgb2hsl(vec3 rgb) { ... }

// Color palette function using iTime for animation
vec3 getHeightBasedPaletteHSL(float peak_metric) {
    float metric = clamp(peak_metric, 0.0f, 1.0f);
    float gold_power = GOLD_PALETTE_POWER_BASE + GOLD_PALETTE_POWER_AMP * sin(iTime * GOLD_PALETTE_POWER_FREQ);
    float gold_amount = pow(metric, gold_power);

    vec3 color = mix(DARK_BLUE_HSL, GOLD_HSL, gold_amount);

    color.y = clamp(color.y, DARK_BLUE_HSL.y * PALETTE_SAT_CLAMP_LOW_F, GOLD_HSL.y * PALETTE_SAT_CLAMP_HIGH_F);
    color.z = clamp(color.z, DARK_BLUE_HSL.z * PALETTE_LGT_CLAMP_LOW_F, GOLD_HSL.z * PALETTE_LGT_CLAMP_HIGH_F);
    return color;
}

void transformPoint(inout vec2 point, float iter, float time_val, float growth_val, float color_feedback_metric) {
    vec4 cos_arg_vec = iter + POINT_ROT_TIME_SCALE * time_val - POINT_ROT_OFFSET_VEC;
    point *= mat2(cos(cos_arg_vec));

    float point_dot_square = dot(point, point);

    // Term 1: tanh-based transformation (Corrected Vector Math)
    vec2 tanh_input_angle_vec = TANH_INPUT_POINT_SCALE * point.yx + time_val;
    vec2 cos_of_angle_vec = cos(tanh_input_angle_vec);
    vec2 tanh_argument_vec = TANH_ARGUMENT_SCALE * point_dot_square * cos_of_angle_vec;
    vec2 tanh_result_vec = tanh(tanh_argument_vec);
    vec2 tanh_effect = tanh_result_vec / TANH_EFFECT_DIVISOR;

    // Term 2: Growth-based transformation
    vec2 growth_effect = GROWTH_EFFECT_SCALE * growth_val * point;

    // Term 3: Color feedback based transformation
    float feedback_exp_input = color_feedback_metric * color_feedback_metric * FEEDBACK_EXP_INPUT_SCALE;
    float safe_feedback_exp_input = min(feedback_exp_input, FEEDBACK_EXP_CLAMP_MAX);
    float cos_feedback_val = cos(FEEDBACK_COS_ARG_NUMERATOR / exp(safe_feedback_exp_input) + time_val);
    vec2 feedback_effect = vec2(cos_feedback_val / FEEDBACK_EFFECT_DIVISOR);

    point += tanh_effect + growth_effect + feedback_effect;
}

float getIterationIntensity(vec2 point, vec2 v_parameter, float time_val, float iter, vec4 base_color_driver) {
    vec4 numerator_components = 1.0f + cos(base_color_driver + time_val);
    float v_dot_square = dot(v_parameter, v_parameter);
    float denom_scaling_factor = 1.0f + iter * v_dot_square;

    float point_dot_square = dot(point, point);
    float safe_ratio_denom = INTENSITY_SIN_ARG_DOT_OFFSET - point_dot_square;

    if (abs(safe_ratio_denom) < EPSILON_SAFE_DENOM_ANGLE) {
        safe_ratio_denom = EPSILON_SAFE_DENOM_ANGLE * (safe_ratio_denom >= 0.0f ? 1.0f : -1.0f);
        if (safe_ratio_denom == 0.0f) safe_ratio_denom = EPSILON_SAFE_DENOM_ANGLE; // Ensure non-zero if original was exactly 0
    }

    vec2 sin_arg_point_term = INTENSITY_SIN_ARG_POINT_SCALE * point / safe_ratio_denom;
    vec2 sin_argument = sin_arg_point_term - INTENSITY_SIN_ARG_POINT_YX_SCALE * point.yx + time_val;
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

        vec2 v_parameter = cos(current_loop_time - V_PARAM_COS_POINT_POW_SCALE * point * pow(growth_factor, iter)) - V_PARAM_SUB_POINT_SCALE * point;
        transformPoint(point, iter, current_loop_time, growth_factor, visual_feedback_metric);

        float iter_intensity = getIterationIntensity(point, v_parameter, current_loop_time, iter, BASE_COLOR_DRIVER_Z_VEC);
        total_intensity_metric += iter_intensity;

        visual_feedback_metric = clamp(total_intensity_metric / (iter + 1.0f) * FEEDBACK_METRIC_UPDATE_SCALE, 0.0f, FEEDBACK_METRIC_CLAMP_MAX);
    }

    float average_intensity = total_intensity_metric / ITERATIONS;
    float mapped_peak_metric = pow(average_intensity * PEAK_METRIC_AVG_INTENSITY_SCALE, PEAK_METRIC_POW_EXPONENT);
    mapped_peak_metric = clamp(mapped_peak_metric, 0.0f, 1.0f);

    float uv_distance_darkening = dot(point, point) / UV_DARKENING_DIVISOR;
    vec3 hsl_final_color = getHeightBasedPaletteHSL(mapped_peak_metric);
    hsl_final_color.z = clamp(hsl_final_color.z - uv_distance_darkening, 0.0f, 1.0f);

    fragColor = vec4(hsl2rgb(hsl_final_color), 1.0f);

    if (isinf(fragColor.x) || isnan(fragColor.x) ||
        isinf(fragColor.y) || isnan(fragColor.y) ||
        isinf(fragColor.z) || isnan(fragColor.z)) {
        fragColor = vec4(0.0f, 0.0f, 0.0f, 1.0f);
    }
}
