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
#define glow_intensity (energyNormalized + 0.9)
#define glow_color hsl2rgb(vec3(pitchClassMean, energyNormalized, energyNormalized))
float glow_threshold = 0.0;
#define glow_falloff  2.5 - energyZScore
#define super_glow beat
bool glow = true;

// Fog
vec3 fog_color = vec3(0.0, 0.0, 0.01); // Almost black space
float fog_density = 0.02; // Less fog for better visibility at distance
float fog_falloff = 1.0;

// Shadows
float self_shadow_bias = 0.01;
#define shadow_darkness spectralRoughnessNormalized
int shadow_steps = 15;
float shadow_softness = 12.0;
float min_step_size = 0.0;

// Lighting
float light_intensity = 3.0; // Brighter lighting
vec3 light1_position = vec3(0.0, 0.0, 0.0); // Light from the central sun
vec3 light2_position = vec3(0.0, 30.0, -40.0); // Backlight
vec3 light1_color = vec3(1.0, 0.7, 0.4); // Warm sun light
vec3 light2_color = vec3(0.2, 0.3, 0.6); // Cool ambient light

// Rendering
int iterations = 15;
int max_steps = 150;
float ambient_light = 0.1;
float max_distance = 100.0;
#define surface_distance 0.001
float raystep_multiplier = 1.0;

// Coloring
bool colors = true;
#define palette_color1 vec3(0.2, 0.4, 0.8)
#define palette_color2 vec3(0.8, 0.3, 0.2)
vec3 bg_color = vec3(0.0, 0.0, 0.01); // Nearly black space

// Refraction
#define refraction_intensity 0.3
float refraction_sharpness = 2.0;

// Fractal
#define box_size_x 1.0
float box_size_z = 1.0;
float slice_start = -1.0;
float slice_end = 1.0;
#define fractal_size 0.5
bool sphere_inversion = true;
#define inversion_sphere vec4(1.0, 0.5, 0.5, 1.0)

// Solar system parameters
#define LANDSCAPE_SCALE 1.0
#define LANDSCAPE_HEIGHT 1.0
#define LANDSCAPE_DENSITY 0.13
#define MAX_MOONS 5
#define SUN_SIZE 5.0
#define SUN_POSITION vec3(0.0, 0.0, 0.0)
#define SUN_GLOW_INTENSITY (1.0 + energyNormalized * 3.0) // Sun glows with music
#define PLASMA_SPEED (0.1 + bassNormalized * 0.2) // Plasma animation speed based on bass
#define PLASMA_SCALE (1.0 + spectralCentroidNormalized * 2.0) // Plasma scale based on spectral centroid

// Mat2 rotation for plasma effect
mat2 m(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Plasma noise function similar to plasma.frag
float plasmaMap(vec3 p, float t) {
    p.xz *= m(t * 0.4);
    p.xy *= m(t * 0.3);
    vec3 q = p * 2.0 + t;
    return length(p + vec3(sin(t * 0.7))) * log(length(p) + 1.0) +
           sin(q.x + sin(q.z + sin(q.y))) * 0.5 - 1.0;
}

// Sun with plasma tendrils SDF
float sunSDF(vec3 p) {
    // Distance to sun center
    float dist_to_sun = length(p - SUN_POSITION);

    // Base sun
    float sun = dist_to_sun - SUN_SIZE * SUN_GLOW_INTENSITY * 0.5;

    // Add plasma tendrils
    float time = iTime * PLASMA_SPEED;
    float plasma_strength = 0.5 + spectralFluxNormalized * 1.5;

    // Generate plasma field
    float plasma = plasmaMap(p * 0.15 * PLASMA_SCALE, time) * plasma_strength;

    // Modulate tendrils based on distance from sun
    float tendrils = smoothstep(0.0, 20.0, dist_to_sun) *
                     smoothstep(40.0, 15.0, dist_to_sun) *
                     plasma;

    // Combine base sun with plasma tendrils
    return sun - tendrils * 2.0;
}

// Planet with moon system SDF
float planetSystemSDF(vec3 p, float planet_id, out float is_moon, out float moon_id) {
    is_moon = 0.0;
    moon_id = 0.0;

    // Calculate planet position based on orbit around sun
    float planet_orbit_speed = 0.05 / (0.5 + fract(planet_id * 17.7));
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
        // Sun color - changes with music
        float energy = energyNormalized;
        return mix(
            vec3(1.0, 0.7, 0.3), // Cooler sun
            vec3(1.0, 0.9, 0.7), // Hotter sun
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

// Render function
vec3 render(vec3 ray_origin, vec3 ray_dir) {
    vec3 data = ray_marcher(ray_origin, ray_dir);
    float body_id = data.x;
    float dfo = data.y;
    float total_marches = data.z;

    vec3 final_color;

    if (dfo >= max_distance) {
        // Background - subtle nebula effect
        vec3 dir1 = ray_dir * 5.0;
        vec3 dir2 = ray_dir * 3.0;
        vec3 time1 = vec3(iTime * 0.05);
        vec3 time2 = vec3(iTime * 0.02);

        float n1 = snoise(dir1 + time1);
        float n2 = snoise(dir2 + time2);

        float nebula = n1 * 0.5 + 0.5;
        nebula = pow(nebula, 4.0) * 0.2;

        // Create subtle nebula colors
        vec3 nebula_color = mix(
            vec3(0.1, 0.0, 0.2), // Purple
            vec3(0.0, 0.1, 0.2), // Blue
            n2 * 0.5 + 0.5
        );

        final_color = nebula_color * nebula;
    } else {
        // Hit a body
        vec3 p = ray_origin + ray_dir * dfo;
        vec3 normal = calculate_normal(p);

        // Get base color for this body
        vec3 base_color = getBodyColor(body_id);

        // Different shading for sun vs planets
        if (body_id < 0.1) {
            // Sun shader
            float dist_to_center = length(p - SUN_POSITION);

            // Plasma effect for sun
            float time = iTime * PLASMA_SPEED;
            float plasma = plasmaMap(p * 0.2 * PLASMA_SCALE, time);

            // Corona and plasma tendrils
            float corona = smoothstep(SUN_SIZE * 0.5, SUN_SIZE * 0.1, dist_to_center);
            float plasmaEffect = plasma * 0.5 + 0.5;

            // Create sun colors based on plasma and energy
            vec3 hot_color = vec3(1.0, 1.0, 0.7);
            vec3 mid_color = vec3(1.0, 0.6, 0.2);
            vec3 cool_color = vec3(0.8, 0.3, 0.1);

            // Mix colors based on plasma and energy
            vec3 sun_color = mix(
                mix(cool_color, mid_color, plasmaEffect),
                hot_color,
                energyNormalized
            );

            // Apply glow
            float glow = SUN_GLOW_INTENSITY;
            final_color = sun_color * (1.0 + glow * corona);

            // Add plasma tendrils
            float tendrils = smoothstep(SUN_SIZE * 0.5, SUN_SIZE * 2.0, dist_to_center) *
                           smoothstep(SUN_SIZE * 4.0, SUN_SIZE * 1.5, dist_to_center);

            vec3 tendril_color = mix(
                vec3(1.0, 0.5, 0.1), // Orange
                vec3(0.5, 0.1, 0.6), // Purple
                spectralCentroidNormalized
            );

            final_color += tendril_color * plasmaEffect * tendrils * 0.5;
        } else {
            // Planet or moon shader
            // Lighting from sun
            vec3 to_sun = normalize(SUN_POSITION - p);
            float sun_dist = length(SUN_POSITION - p);
            float sun_atten = 30.0 / (1.0 + sun_dist * sun_dist * 0.01);
            float sun_diffuse = max(dot(normal, to_sun), 0.0) * sun_atten;

            // Sun light color
            vec3 sun_light = light1_color * SUN_GLOW_INTENSITY;

            // Atmosphere effect for planets
            float fresnel = pow(1.0 - max(0.0, dot(normal, -ray_dir)), 3.0);
            vec3 atmosphere = base_color * fresnel * 1.5;

            // Combine lighting
            final_color = base_color * (ambient_light + sun_diffuse * sun_light) + atmosphere;

            // Add specular highlight from sun
            float spec = pow(max(0.0, dot(reflect(-to_sun, normal), -ray_dir)), 16.0);
            final_color += sun_light * spec * 0.5;
        }

        // Add rim lighting for better visibility
        float rim = pow(1.0 - max(0.0, dot(normal, -ray_dir)), 4.0);
        final_color += rim * vec3(0.3, 0.4, 0.5) * 0.3;
    }

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
    // Simple hash function
    vec3 s = vec3(7, 157, 113);
    vec3 ip = floor(p);
    vec3 fp = p - ip;

    // Cubic interpolation
    vec3 p3 = fp * fp * (3.0 - 2.0 * fp);

    // Create hash values
    float n = dot(ip, s);
    vec4 hash = vec4(n, n + s.y, n + s.z, n + s.y + s.z);
    hash = fract(sin(hash) * 43758.5453);

    // Interpolate the 8 corners
    hash.xy = mix(hash.xy, hash.zw, p3.z);
    return mix(hash.x, hash.y, p3.y);
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

