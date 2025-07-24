// Liquid Crystal - Flowing crystalline structures with iridescent colors
#define FLOW_SPEED (0.1 + knob_1 * 0.5)
#define CRYSTAL_SIZE (0.2 + knob_2 * 0.8)
#define REFRACTION_INDEX (1.0 + knob_3 * 0.5)
#define COLOR_DISPERSION (knob_4 * 0.3)
#define VISCOSITY (0.1 + knob_5 * 0.9)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float sdHexPrism(vec3 p, vec2 h) {
    const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
    p = abs(p);
    p.xy -= 2.0 * min(dot(k.xy, p.xy), 0.0) * k.xy;
    vec2 d = vec2(
        length(p.xy - vec2(clamp(p.x, -k.z * h.x, k.z * h.x), h.x)) * sign(p.y - h.x),
        p.z - h.y
    );
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float fbm(vec3 p) {
    float f = 0.0;
    float a = 0.5;
    for(int i = 0; i < 4; i++) {
        f += a * sin(p.x * 2.0 + iTime * FLOW_SPEED) * cos(p.y * 2.0 - iTime * FLOW_SPEED * 0.7) * sin(p.z * 2.0);
        p *= 2.0;
        a *= 0.5;
    }
    return f;
}

float map(vec3 p) {
    // Flowing distortion
    vec3 flow = vec3(
        fbm(p + vec3(iTime * FLOW_SPEED, 0, 0)),
        fbm(p + vec3(0, iTime * FLOW_SPEED * 0.7, 0)),
        fbm(p + vec3(0, 0, iTime * FLOW_SPEED * 0.5))
    ) * VISCOSITY;
    
    p += flow;
    
    // Crystal lattice
    vec3 q = p;
    q.xy = mod(q.xy + CRYSTAL_SIZE * 0.5, CRYSTAL_SIZE) - CRYSTAL_SIZE * 0.5;
    q.z = mod(q.z + CRYSTAL_SIZE * 1.5, CRYSTAL_SIZE * 3.0) - CRYSTAL_SIZE * 1.5;
    
    float d = sdHexPrism(q, vec2(CRYSTAL_SIZE * 0.3, CRYSTAL_SIZE * 0.1));
    
    // Add second layer with rotation
    vec3 r = p;
    r.xz *= rot(0.523599); // 30 degrees
    r.xy = mod(r.xy + CRYSTAL_SIZE * 0.5, CRYSTAL_SIZE) - CRYSTAL_SIZE * 0.5;
    r.z = mod(r.z + CRYSTAL_SIZE * 1.5, CRYSTAL_SIZE * 3.0) - CRYSTAL_SIZE * 1.5;
    
    float d2 = sdHexPrism(r, vec2(CRYSTAL_SIZE * 0.3, CRYSTAL_SIZE * 0.1));
    
    return min(d, d2);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

vec3 iridescentColor(float angle, float thickness) {
    // Thin film interference
    float phase = thickness * 4.0 * 3.14159 / 0.55; // Green wavelength reference
    
    vec3 color = vec3(0.0);
    // Red
    color.r = 0.5 + 0.5 * cos(phase * 0.7 + angle * COLOR_DISPERSION);
    // Green  
    color.g = 0.5 + 0.5 * cos(phase + angle * COLOR_DISPERSION * 1.1);
    // Blue
    color.b = 0.5 + 0.5 * cos(phase * 1.4 + angle * COLOR_DISPERSION * 1.2);
    
    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    vec3 ro = vec3(0, 0, 3.0 + sin(iTime * 0.2) * 0.5);
    vec3 rd = normalize(vec3(uv, -1.0));
    
    // Slight camera movement
    ro.xy += vec2(sin(iTime * 0.1), cos(iTime * 0.15)) * 0.2;
    
    vec3 col = vec3(0.02, 0.02, 0.05); // Dark blue background
    
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        
        if(d < 0.001) {
            vec3 n = calcNormal(p);
            
            // Refraction
            vec3 refracted = refract(rd, n, 1.0 / REFRACTION_INDEX);
            if(length(refracted) > 0.001) {
                rd = refracted;
            } else {
                // Total internal reflection
                rd = reflect(rd, n);
            }
            
            // Calculate viewing angle for iridescence
            float viewAngle = dot(-rd, n);
            float thickness = fbm(p * 5.0) * 0.5 + 0.5;
            
            vec3 iridColor = iridescentColor(viewAngle, thickness);
            
            // Accumulate color with transparency
            col = mix(col, iridColor, 0.3);
            
            // Continue ray for multiple refractions
            t += 0.01;
            if(i > 20) break; // Limit refraction bounces
        } else {
            t += d * 0.5;
        }
        
        if(t > 10.0) break;
    }
    
    // Add glow
    float glow = exp(-t * 0.5);
    col += vec3(0.1, 0.2, 0.3) * glow * 0.5;
    
    // Vignette
    col *= 1.0 - length(uv) * 0.3;
    
    fragColor = vec4(col, 1.0);
}