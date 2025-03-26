// By Muhammad Ahmad
// Licensed under the Unlicense license.
// Basically, You can do whatever you want with this code.

#define GOLDEN_RATIO 1.6180339887498948482
#define PI 3.14159265358979323846

// Ambient Occlusion
int ambient_occlusion_steps = 6;
float ambient_occlusion_radius = 0.165;
float ambient_occlusion_darkness = 0.57;

// Glow
#define glow_intensity (energyNormalized * 1.9)
#define glow_color hsl2rgb(vec3(pitchClassMean, energyNormalized, energyNormalized))
float glow_threshold = 0.;
#define glow_falloff  0.5 - energyZScore
#define super_glow beat
bool glow = true;

// Fog
vec3 fog_color = vec3(0.0, 0.0, 0.01); // Almost black space
float fog_density = 0.04; // Less fog for better visibility at distance
float fog_falloff = 10.0;

// Shadows
float self_shadow_bias = 0.01;
#define shadow_darkness spectralRoughnessNormalized
int shadow_steps = 1;
float shadow_softness = 12.0;
float min_step_size = 0.0;

// Lighting
float light_intensity = 1.0; // Brighter lighting
vec3 light1_position = vec3(0.0, 0.0, 0.0); // Light from the central sun
vec3 light2_position = vec3(0.0, 30.0, -40.0); // Backlight
vec3 light1_color = vec3(1.0, 0.7, 0.4); // Warm sun light
vec3 light2_color = vec3(0.2, 0.3, 0.6); // Cool ambient light

// Rendering
int iterations = 15;
int max_steps = 150;
float ambient_light = 0.001;
float max_distance = 100.0;
#define surface_distance 0.001
float raystep_multiplier = 1.0;

// Coloring
bool colors = true;
#define palette_color1 vec3(0.2, 0.4, 0.8)
#define palette_color2 vec3(0.8, 0.3, 0.2)
vec3 bg_color = vec3(0.0, 0.0, 0.001); // Nearly black space

// Refraction
#define refraction_intensity 0.
float refraction_sharpness = 0.;

// Fractal
#define box_size_x 1.0
float box_size_z = 1.0;
float slice_start = -1.0;
float slice_end = 1.0;
#define fractal_size 0.5
bool sphere_inversion = true;
#define inversion_sphere vec4(1.0, 0.5, 0.5, 1.0)

// Solar system parameters
#define LANDSCAPE_SCALE 0.1
#define LANDSCAPE_HEIGHT 1.0
#define LANDSCAPE_DENSITY 10.3
#define MAX_MOONS 5
#define SUN_SIZE 4.
#define SUN_POSITION vec3(0.0, 0.0, 0.0)
#define SUN_GLOW_INTENSITY (1.0 + energyNormalized * 40.0) // Moderate glow intensity
#define PLASMA_SPEED (bassNormalized*10.) // Plasma animation speed based on bass
#define PLASMA_SCALE (energyMax/9.) // Plasma scale based on spectral centroid
#define SUPERNOVA_THRESHOLD 0.9 // Threshold for supernova effect
#define BASE_ORBIT_SPEED 1.6 // Base speed for planet orbits

// Mat2 rotation for plasma effect
mat2 m(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Plasma map function from plasma.frag
float plasmaMap(vec3 p) {
    p.xz *= m(iTime * 0.4 + energyZScore + spectralRoughnessZScore);
    p.xy *= m(iTime * 0.3 + energyZScore + spectralRoughnessZScore);
    vec3 q = p * 2.0 + iTime + energyZScore + spectralRoughnessZScore;
    return length(p + vec3(sin(iTime * 0.7 + energyZScore + spectralRoughnessZScore))) *
           log(length(p) + 1.0) +
           sin(q.x + sin(q.z + sin(q.y))) * 0.5 - 1.0;
}

// Sun with plasma tendrils SDF
float sunSDF(vec3 p) {
    // Distance to sun center
    float dist_to_sun = length(p - SUN_POSITION);

    // Base sun with dynamic size based on energy
    float sun = dist_to_sun - SUN_SIZE * (1.0 + energyNormalized * 0.2);

    // Enhanced plasma tendrils - reduced distance
    float plasma = plasmaMap(p * 0.01 * PLASMA_SCALE);

    // Modulate tendrils based on distance from sun - reduced range
    float tendrils = smoothstep(0.0, 15.0, dist_to_sun) *
                     smoothstep(25.0, 10.0, dist_to_sun) *
                     plasma;

    // Add energy-based pulsing to the sun
    float pulse = sin(iTime * 2.0 + energyNormalized * 5.0) * 0.8 + 1.2;

    // Combine base sun with plasma tendrils and pulse
    return sun - tendrils * pulse;
}

// Planet with moon system SDF
float planetSystemSDF(vec3 p, float planet_id, out float is_moon, out float moon_id) {
    is_moon = 0.0;
    moon_id = 0.0;

    // Calculate planet position based on orbit around sun
    float planet_orbit_speed = BASE_ORBIT_SPEED / (0.5 + fract(planet_id * 17.7)); // Fixed orbit speed
    float planet_orbit_angle = iTime * planet_orbit_speed + planet_id * 7.13;
    float planet_orbit_radius = 20.0 + 10.0 * sin(planet_id * 33.7);
    float planet_inclination = 0.1 * sin(planet_id * 5.3);

    // Elliptical planet orbits
    float planet_eccentricity = 0.2 * fract(planet_id * 13.91);
    float planet_distance = planet_orbit_radius * (1.0 - planet_eccentricity * sin(planet_orbit_angle));

    vec3 planet_pos = SUN_POSITION + vec3(
        planet_distance * sin(planet_orbit_angle),
        planet_distance * sin(planet_orbit_angle) * planet_inclination,
        planet_distance * cos(planet_orbit_angle)
    );

    // Distance to planet center
    float dist_to_planet = length(p - planet_pos);
    float planet_size = 1.0 + 0.8 * sin(planet_id * 33.1);

    // Determine moon count for this planet
    float moon_count = floor(1.0 + 4.0 * fract(planet_id * 77.7));

    // Find closest celestial body (planet or one of its moons)
    float min_dist = dist_to_planet;
    vec3 closest_body_pos = planet_pos;
    float closest_moon_id = 0.0;

    // Check each moon
    for (int i = 0; i < 5; i++) {
        if (float(i) >= moon_count) break;

        // Each moon has a unique orbit
        float curr_moon_id = float(i) + 1.0;
        float orbit_speed = 0.1 + 0.05 * fract(planet_id * 45.3);
        float moon_angle = curr_moon_id * 2.0 * PI / moon_count + iTime * orbit_speed;

        // Unique inclination for each moon
        float inclination = 0.2 * sin(curr_moon_id * 0.7 + planet_id * 0.9);

        // Moon orbit radius
        float moon_orbit_radius = 2.0 + curr_moon_id * 0.5;

        // Moon position
        vec3 moon_pos = planet_pos + vec3(
            moon_orbit_radius * sin(moon_angle),
            moon_orbit_radius * sin(moon_angle) * inclination,
            moon_orbit_radius * cos(moon_angle)
        );

        // Check distance to this moon
        float dist_to_moon = length(p - moon_pos);
        float moon_size = 0.3 + 0.1 * sin(curr_moon_id * 33.1 + planet_id * 71.7);

        // Scale for actual SDF calculation
        dist_to_moon -= moon_size;

        // If this moon is closer, update closest body
        if (dist_to_moon < min_dist) {
            min_dist = dist_to_moon;
            closest_body_pos = moon_pos;
            closest_moon_id = curr_moon_id;
            is_moon = 1.0;
        }
    }

    // Return planet or moon SDF
    if (is_moon > 0.5) {
        moon_id = closest_moon_id;
        float moon_size = 0.3 + 0.1 * sin(moon_id * 33.1 + planet_id * 71.7);
        return length(p - closest_body_pos) - moon_size;
    } else {
        return dist_to_planet - planet_size;
    }
}

// Combined scene SDF
vec2 sceneSDF(vec3 p) {
    // Sun SDF
    float sun_dist = sunSDF(p);

    // Fixed planet positions
    float min_dist = sun_dist;
    float body_id = 0.0; // 0 for sun

    // Generate fixed planets
    for (int i = 0; i < 5; i++) {
        float planet_id = float(i) + 1.0;
        float is_moon = 0.0;
        float moon_id = 0.0;

        float planet_dist = planetSystemSDF(p, planet_id, is_moon, moon_id);

        // Update minimum distance
        if (planet_dist < min_dist) {
            min_dist = planet_dist;
            body_id = planet_id + (is_moon * 0.1) + (moon_id * 0.01);
        }
    }

    // Return distance and body ID
    return vec2(min_dist, body_id);
}

// Get color for a specific body
vec3 getBodyColor(float body_id) {
    // Sun is body_id = 0
    if (body_id < 0.1) {
        // Sun color - changes with music - more fiery
        float energy = energyNormalized;
        return mix(
            vec3(1.0, 0.6, 0.1), // Hot orange base
            vec3(1.0, 0.4, 0.0), // Even hotter red-orange
            energy
        );
    }

    // Planet or moon
    float planet_id = floor(body_id);
    float is_moon = body_id - planet_id >= 0.1 ? 1.0 : 0.0;

    if (is_moon > 0.5) {
        // Moon colors
        float hue = fract(body_id * 7.13);
        return vec3(0.7 + 0.3 * hue, 0.7, 0.7 + 0.3 * sin(hue * 3.0));
    } else {
        // Create different planet types based on ID
        float planet_type = fract(planet_id * 3.14159);
        float hue = fract(planet_id * 0.618033988749895);

        if (planet_type < 0.25) {
            // Rocky/desert planets (reddish/orange)
            return vec3(0.8 + 0.2 * hue, 0.3 + 0.3 * hue, 0.1 + 0.1 * hue);
        } else if (planet_type < 0.5) {
            // Ocean planets (blue/green)
            return vec3(0.1 + 0.2 * hue, 0.5 + 0.3 * hue, 0.7 + 0.3 * hue);
        } else if (planet_type < 0.75) {
            // Gas giants (varied colors with bands)
            return vec3(0.6 + 0.4 * hue, 0.6 + 0.4 * sin(hue * 8.0), 0.4 + 0.6 * cos(hue * 4.0));
        } else {
            // Ice worlds (white/blue)
            return vec3(0.7 + 0.3 * hue, 0.7 + 0.3 * hue, 0.9);
        }
    }
}

// Ray marching function
vec3 ray_marcher(vec3 ro, vec3 rd) {
    float dfo = 0.0;
    float body_id = 0.0;
    float total_marches = 0.0;

    for (int i = 0; i < max_steps; i++) {
        vec2 data = sceneSDF(ro + rd * dfo);
        float point_distance = data.x;
        body_id = data.y;

        dfo += point_distance * raystep_multiplier;
        total_marches += 1.0;

        if (abs(point_distance) < surface_distance || dfo > max_distance) {
            break;
        }
    }

    return vec3(body_id, dfo, total_marches);
}

// Normal calculation
vec3 calculate_normal(vec3 p) {
    float h = 0.001;
    vec2 k = vec2(1.0, -1.0);

    return normalize(
        k.xyy * sceneSDF(p + k.xyy * h).x +
        k.yxy * sceneSDF(p + k.yxy * h).x +
        k.yyx * sceneSDF(p + k.yyx * h).x +
        k.xxx * sceneSDF(p + k.xxx * h).x
    );
}

// Wave function for radiating effects
float wave(vec3 p, float t) {
    float dist = length(p);
    float wave = sin(dist * 3.0 - t * 4.0) * 0.5 + 0.5;
    wave *= smoothstep(0.0, 2.0, dist);
    return wave;
}

// Render function
vec3 render(vec3 ray_origin, vec3 ray_dir) {
    vec3 data = ray_marcher(ray_origin, ray_dir);
    float body_id = data.x;
    float dfo = data.y;
    float total_marches = data.z;

    vec3 final_color;
        // Hit a body
        vec3 p = ray_origin + ray_dir * dfo;
        vec3 normal = calculate_normal(p);

        // Get base color for this body
        vec3 base_color = getBodyColor(body_id);

        // Different shading for sun vs planets
        if (body_id < 0.1) {
            // Sun shader - fiery plasma appearance
            float dist_to_center = length(p - SUN_POSITION);

            // Get previous frame's color for smooth blending
            vec2 uv = p.xy / iResolution.xy;
            vec3 lastFrameColor = getLastFrameColor(uv).rgb;

            // Calculate plasma effect with smaller scale and more turbulence
            vec3 plasma_pos = p - SUN_POSITION;
            float plasma = plasmaMap(plasma_pos * 0.08);

            // Create fiery plasma color with better hot/cold contrast
            float f = clamp((plasma - plasmaMap(plasma_pos * 0.08 + 0.05)) * 0.6, -0.1, 1.0);

            // Fire-like color palette - yellow/orange/red
            vec3 hot_color = mix(
                vec3(1.0, 0.3, 0.0), // Hot orange-red
                vec3(1.0, 0.1, 0.0), // Deep red
                f * 0.5 + 0.5
            );

            vec3 cool_color = mix(
                vec3(1.0, 0.7, 0.2), // Yellow-orange
                vec3(1.0, 0.5, 0.1), // Orange
                f * 0.5 + 0.5
            );

            // Mix based on plasma and energy
            vec3 plasma_color = mix(cool_color, hot_color, f * energyNormalized);

            // Add turbulence to create fire-like effect
            float turbulence = sin(plasma_pos.x * 0.3 + iTime) * sin(plasma_pos.y * 0.3 + iTime * 1.2) *
                              sin(plasma_pos.z * 0.3 + iTime * 0.7) * 0.5 + 0.5;

            plasma_color = mix(plasma_color, hot_color, turbulence * 0.4);

            // Enhanced corona effect with fire-like falloff
            float corona = smoothstep(SUN_SIZE * 1.2, SUN_SIZE * 0.3, dist_to_center);
            float glow = SUN_GLOW_INTENSITY * (1.0 + energyNormalized * 15.0);

            // Add flicker effect for fire
            float flicker = sin(iTime * 10.0) * 0.05 + sin(iTime * 7.3) * 0.03 + sin(iTime * 15.7) * 0.02;
            glow *= (1.0 + flicker * energyNormalized);

            // Start with base sun color from getBodyColor
            vec3 base_color = getBodyColor(body_id);

            // Core color - very hot
            vec3 core_color = vec3(1.0, 0.9, 0.7); // Almost white hot center

            // Layer the effects
            final_color = base_color * (1.0 + glow * corona * 3.0); // Base glow
            final_color *= mix(vec3(1.0), plasma_color, 0.7); // Add plasma coloration

            // Add intense core glow
            float core_glow = smoothstep(SUN_SIZE * 0.5, 0.0, dist_to_center);
            final_color += core_color * core_glow * (1.0 + energyNormalized * 8.0) * 3.0;

            // Add fire-like flares that extend outward
            float flare = pow(abs(sin(atan(plasma_pos.y, plasma_pos.x) * 5.0 + iTime)), 5.0) *
                          smoothstep(SUN_SIZE * 2.0, SUN_SIZE * 0.8, dist_to_center);
            final_color += hot_color * flare * energyNormalized * 2.0;

            // Blend with previous frame for temporal stability
            final_color = mix(final_color, lastFrameColor, 0.6);
        } else {
            // Planet or moon shader
            // Lighting from sun - correct direction
            vec3 to_sun = normalize(SUN_POSITION - p); // Light comes FROM the sun TO the planets
            float sun_dist = length(SUN_POSITION - p);
            float sun_atten = 40.0 / (1.0 + sun_dist * sun_dist * 0.01);

            // Calculate heat distortion based on sun exposure and distance
            float sun_exposure = max(dot(normal, to_sun), 0.0);
            float heat_distortion = sun_exposure * energyNormalized * (1.0 - smoothstep(0.0, 50.0, sun_dist));

            // Use world space coordinates for distortion
            vec3 world_pos = p - SUN_POSITION;
            float angle = atan(world_pos.y, world_pos.x);
            float radius = length(world_pos.xy);

            // Create rippling effect that propagates outward
            float ripple = sin(radius - iTime * 2.0) * 1.5 + 0.5;
            float ripple_angle = sin(angle * 8.0 + iTime * 3.0) * 0.5 + 0.5;

            // Combine ripples with heat distortion
            float distortion_strength = heat_distortion * (ripple + ripple_angle * 0.3);

            // Add heat distortion to UV coordinates
            vec2 uv = p.xy / iResolution.xy;
            vec2 distorted_uv = uv + vec2(
                sin(angle * 10.0 + radius * 0.1 + iTime * 2.0) * distortion_strength * 0.05,
                cos(angle * 10.0 + radius * 0.1 + iTime * 2.0) * distortion_strength * 0.06
            );

            // Get distorted previous frame color
            vec3 distorted_last_frame = getLastFrameColor(distorted_uv).rgb;

            // Improved diffuse lighting with better falloff
            float sun_diffuse = sun_exposure * sun_atten;

            // Add ambient occlusion for dark side
            float ao = 1.0 - max(0.0, -dot(normal, to_sun)) * 0.5;

            // Sun light color with energy-based intensity
            vec3 sun_light = light1_color * SUN_GLOW_INTENSITY;

            // Atmosphere effect for planets with better dark side handling
            float fresnel = pow(1.0 - max(0.0, dot(normal, -ray_dir)), 3.0);
            vec3 atmosphere = base_color * fresnel * 1.5;

            // Add subtle glow to dark side
            float dark_side_glow = pow(max(0.0, -dot(normal, to_sun)), 2.0) * 0.2;
            atmosphere += base_color * dark_side_glow;

            // Combine lighting with improved dark side
            final_color = base_color * (ambient_light + sun_diffuse * sun_light) * ao + atmosphere;

            // Add specular highlight from sun (correct reflection direction)
            float spec = pow(max(0.0, dot(reflect(-to_sun, normal), -ray_dir)), 16.0);
            final_color += sun_light * spec * 0.5;

            // Add heat distortion effect with color variation
            vec3 heat_color = mix(
                mix(
                    vec3(1.0, 0.6, 0.2),  // Warm orange
                    vec3(1.0, 0.3, 0.1),  // Hot red
                    energyNormalized
                ),
                vec3(1.0, 0.8, 0.4),  // Bright yellow
                ripple
            );

            // Blend with distorted previous frame
            final_color = mix(
                final_color,
                distorted_last_frame * heat_color,
                distortion_strength * 1.4
            );

            // Add subtle moon lighting for planets (not moons)
            if (body_id - floor(body_id) < 0.1) {
                float planet_id = floor(body_id);
                float moon_count = floor(1.0 + 4.0 * fract(planet_id * 77.7));

                // Calculate planet position
                float planet_orbit_speed = 0.5 / (0.5 + fract(planet_id * 17.7));
                float planet_orbit_angle = iTime * planet_orbit_speed + planet_id * 7.13;
                float planet_orbit_radius = 20.0 + 10.0 * sin(planet_id * 33.7);
                float planet_inclination = 0.1 * sin(planet_id * 5.3);
                float planet_eccentricity = 0.2 * fract(planet_id * 13.91);
                float planet_distance = planet_orbit_radius * (1.0 - planet_eccentricity * sin(planet_orbit_angle));

                vec3 planet_pos = SUN_POSITION + vec3(
                    planet_distance * sin(planet_orbit_angle),
                    planet_distance * sin(planet_orbit_angle) * planet_inclination,
                    planet_distance * cos(planet_orbit_angle)
                );

                for (int i = 0; i < 5; i++) {
                    if (float(i) >= moon_count) break;

                    float moon_id = float(i) + 1.0;
                    float orbit_speed = 0.1 + 0.05 * fract(planet_id * 45.3);
                    float moon_angle = moon_id * 2.0 * PI / moon_count + iTime * orbit_speed;
                    float inclination = 0.2 * sin(moon_id * 0.7 + planet_id * 0.9);
                    float moon_orbit_radius = 2.0 + moon_id * 0.5;

                    vec3 moon_pos = planet_pos + vec3(
                        moon_orbit_radius * sin(moon_angle),
                        moon_orbit_radius * sin(moon_angle) * inclination,
                        moon_orbit_radius * cos(moon_angle)
                    );

                    vec3 to_moon = normalize(moon_pos - p);
                    float moon_dist = length(moon_pos - p);
                    float moon_atten = 1.0 / (1.0 + moon_dist * moon_dist * 0.1);
                    float moon_diffuse = max(dot(normal, to_moon), 0.0) * moon_atten * 0.1;

                    final_color += vec3(0.7, 0.7, 0.8) * moon_diffuse;
                }
            }
        }

        // Add rim lighting for better visibility
        float rim = pow(1.0 - max(0.0, dot(normal, -ray_dir)), 4.0);
        final_color += rim * vec3(0.3, 0.4, 0.5) * 0.3;


    // Glow for distant bodies
    if (total_marches > 50.0 && dfo < max_distance) {
        float glow_amount = (total_marches - 50.0) / 100.0;
        vec3 glow_col = mix(light1_color, light2_color, glow_amount);
        final_color += glow_col * glow_amount * 0.1;
    }

    // Distance fog
    float fog_distance = min(dfo, max_distance);
    float fog_amount = 1.0 - exp(-fog_density * fog_distance);
    final_color = mix(final_color, fog_color, fog_amount);

    return final_color;
}

// Simple noise function for nebula background
float snoise(vec3 p) {
    return random(p.xy);
}

mat3 setCamera( in vec3 ro, in vec3 ta, float cr )
{
	vec3 cw = normalize(ta-ro);
	vec3 cp = vec3(sin(cr), cos(cr),0.0);
	vec3 cu = normalize( cross(cw,cp) );
	vec3 cv =          ( cross(cu,cw) );
    return mat3( cu, cv, cw );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord.xy / iResolution.xy;

    // Camera setup
    float time_offset = iTime * 0.05;

    // Orbit around the sun
    float camera_distance = 30.0 + 10.0 * sin(time_offset * 0.2);
    float camera_angle = time_offset * 0.2;
    float camera_height = 10.0 + 5.0 * sin(time_offset * 0.3);

    // Camera position orbiting the sun
    vec3 ro = vec3(
        camera_distance * sin(camera_angle),
        camera_height,
        camera_distance * cos(camera_angle)
    );

    // Always look at the sun
    vec3 ta = SUN_POSITION;

    // Camera setup
    float roll = 0.1 * sin(time_offset * 0.5);
    mat3 ca = setCamera(ro, ta, roll);

    vec2 p = (2.0*fragCoord-iResolution.xy)/iResolution.y;
    vec3 rd = ca * normalize(vec3(p, 2.0));

    // Render scene
    vec3 col = render(ro, rd);

    // HDR tone mapping
    col = col / (1.0 + col);

    // Color correction
    col = pow(col, vec3(0.9));
    col = col * 1.3;

    // Output final color
    fragColor = vec4(col, 1.0);
}

