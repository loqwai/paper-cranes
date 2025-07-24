// Time Crystals - 4D crystals rotating through time dimension
#define TIME_SPEED (0.1 + knob_1 * 0.5)
#define CRYSTAL_COMPLEXITY (2.0 + knob_2 * 4.0)
#define TEMPORAL_PHASE (knob_3 * 6.28)
#define SPACE_WARP (knob_4 * 0.5)
#define ENERGY_GLOW (0.5 + knob_5 * 1.5)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// 4D rotation matrices projected to 3D
mat3 rot4d(float t) {
    float c = cos(t), s = sin(t);
    return mat3(
        c, -s, 0,
        s, c, 0,
        0, 0, 1
    );
}

float sd4DCrystal(vec3 p, float t) {
    // Simulate 4D crystal by rotating through time
    p *= rot4d(t * TIME_SPEED + TEMPORAL_PHASE);
    
    // Complex crystal structure
    float d = 1000.0;
    
    // Base octahedron
    d = min(d, abs(p.x) + abs(p.y) + abs(p.z) - 1.0);
    
    // Add complexity with nested shapes
    for(float i = 1.0; i < CRYSTAL_COMPLEXITY; i++) {
        vec3 q = p;
        
        // 4D-style rotation
        q *= rot4d(t * TIME_SPEED * (1.0 + i * 0.1) + i * 1.234);
        
        // Scale down
        q *= 1.5 + sin(t + i) * 0.2;
        
        // Different crystal facets
        float facet = abs(q.x) + abs(q.y) + abs(q.z) - 0.8 / i;
        
        // Temporal interference
        facet += sin(q.x * 5.0 + t * 2.0) * sin(q.y * 5.0 + t * 1.7) * sin(q.z * 5.0 + t * 2.3) * 0.1;
        
        d = min(d, facet);
    }
    
    return d;
}

float map(vec3 p) {
    // Space warping
    p += sin(p.yzx * 2.0 + iTime) * SPACE_WARP;
    
    // Multiple crystals in space
    float d = 1000.0;
    
    for(float i = 0.0; i < 3.0; i++) {
        vec3 pos = vec3(
            sin(iTime * 0.3 + i * 2.094),
            cos(iTime * 0.4 + i * 1.571),
            sin(iTime * 0.2 + i * 2.618)
        ) * 2.0;
        
        vec3 q = p - pos;
        
        // Each crystal has different temporal phase
        float crystal = sd4DCrystal(q, iTime + i * 3.14159);
        
        d = min(d, crystal);
    }
    
    return d;
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

vec3 timeColor(float t, vec3 pos) {
    // Colors shift through time dimension
    float hue = fract(t * 0.1 + dot(pos, vec3(0.123, 0.456, 0.789)));
    
    // Temporal energy visualization
    float energy = sin(t * 3.0) * sin(t * 2.3) * sin(t * 1.7);
    energy = energy * 0.5 + 0.5;
    
    return hsl2rgb(vec3(
        hue,
        0.8 + energy * 0.2,
        0.3 + energy * 0.4
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Camera orbiting around crystals
    float camTime = iTime * 0.1;
    vec3 ro = vec3(
        sin(camTime) * 5.0,
        cos(camTime * 0.7) * 2.0,
        cos(camTime) * 5.0
    );
    
    vec3 rd = normalize(vec3(uv, -1.0));
    
    // Rotate view
    rd.xz *= rot(camTime);
    rd.yz *= rot(sin(camTime) * 0.3);
    
    vec3 col = vec3(0.0);
    
    // Background - temporal void
    col += vec3(0.01, 0.02, 0.05) * (1.0 + sin(iTime) * 0.1);
    
    // Raymarching
    float t = 0.0;
    vec3 p = ro;
    
    for(int i = 0; i < 100; i++) {
        p = ro + rd * t;
        float d = map(p);
        
        if(d < 0.001) {
            vec3 n = calcNormal(p);
            
            // Temporal material properties
            vec3 timeCol = timeColor(iTime, p);
            
            // Lighting
            vec3 lightDir = normalize(vec3(sin(iTime), 1.0, cos(iTime)));
            float diff = max(dot(n, lightDir), 0.0);
            
            // Fresnel effect for 4D crystal
            float fresnel = pow(1.0 - dot(n, -rd), 2.0);
            
            // Energy glow from within
            float glow = exp(-t * 0.1) * ENERGY_GLOW;
            
            col = mix(timeCol * (diff + 0.3), timeCol * 2.0, fresnel) + timeCol * glow;
            
            // Multiple refractions for crystal effect
            rd = refract(rd, n, 0.8);
            if(length(rd) < 0.001) {
                rd = reflect(rd, n);
            }
            
            t += 0.05; // Continue ray for internal reflections
            if(i > 20) break;
        } else {
            t += d * 0.7; 
        }
        
        if(t > 15.0) break;
    }
    
    // Temporal energy field visualization
    float field = 0.0;
    for(int i = 0; i < 5; i++) {
        vec3 fieldPos = ro + rd * float(i) * 2.0;
        float fieldNoise = sin(fieldPos.x + iTime * 2.0) * 
                          cos(fieldPos.y + iTime * 1.7) * 
                          sin(fieldPos.z + iTime * 2.3);
        field += exp(-float(i)) * fieldNoise;
    }
    
    col += vec3(0.1, 0.3, 0.5) * field * 0.1;
    
    // Touch creates temporal disturbance
    if(touched) {
        vec2 touchPos = (touch * 2.0 - 1.0) * vec2(1.0, iResolution.y / iResolution.x);
        float touchField = exp(-length(uv - touchPos) * 2.0);
        
        // Temporal ripples
        float ripple = sin(length(uv - touchPos) * 20.0 - iTime * 5.0) * 0.5 + 0.5;
        col += timeColor(iTime + ripple, vec3(uv, 0)) * touchField * ripple;
    }
    
    // Chromatic aberration for 4D effect
    col.r += sin(iTime * 3.0) * 0.02;
    col.g += sin(iTime * 2.7) * 0.02;
    col.b += sin(iTime * 3.3) * 0.02;
    
    fragColor = vec4(col, 1.0);
}