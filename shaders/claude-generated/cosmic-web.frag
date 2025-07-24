// Cosmic Web - Interconnected galaxy filaments with gravitational lensing
#define WEB_DENSITY (0.3 + knob_1 * 0.7)
#define FILAMENT_STRENGTH (0.5 + knob_2 * 1.5)
#define GALAXY_COUNT (5.0 + knob_3 * 15.0)
#define LENSING_POWER (0.1 + knob_4 * 0.4)
#define DARK_MATTER (0.1 + knob_5 * 0.9)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hash2(vec2 p) {
    return fract(sin(vec2(
        dot(p, vec2(127.1, 311.7)),
        dot(p, vec2(269.5, 183.3))
    )) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(hash(i + vec2(0, 0)), hash(i + vec2(1, 0)), f.x),
        mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float f = 0.0;
    float a = 0.5;
    for(int i = 0; i < 6; i++) {
        f += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return f;
}

vec3 galaxyColor(float id, float intensity) {
    float hue = fract(id * 0.618);
    
    vec3 color;
    if(hue < 0.3) {
        // Blue-white young galaxies
        color = mix(vec3(0.5, 0.8, 1.0), vec3(1.0, 1.0, 1.0), intensity);
    } else if(hue < 0.6) {
        // Yellow-orange older galaxies
        color = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 0.8, 0.3), intensity);
    } else {
        // Red giant galaxies
        color = mix(vec3(1.0, 0.2, 0.1), vec3(1.0, 0.5, 0.3), intensity);
    }
    
    return color * intensity;
}

float filament(vec2 p, vec2 a, vec2 b, float thickness) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    
    float d = length(pa - ba * t);
    return exp(-d / thickness) * thickness;
}

vec2 gravitationalLensing(vec2 p, vec2 center, float mass) {
    vec2 offset = p - center;
    float dist = length(offset);
    
    if(dist > 0.001) {
        float lensStrength = mass * LENSING_POWER / (dist * dist);
        vec2 lensDirection = normalize(offset);
        
        // Einstein ring effect
        float angle = atan(offset.y, offset.x);
        lensDirection += vec2(-sin(angle), cos(angle)) * lensStrength * 0.1;
        
        return p + lensDirection * lensStrength;
    }
    
    return p;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 originalP = p;
    
    vec3 col = vec3(0.0);
    
    // Deep space background
    col += vec3(0.005, 0.01, 0.02);
    
    // Distant stars
    float stars = step(0.998, hash(floor(p * 200.0) + vec2(123.456, 789.012)));
    col += vec3(1.0) * stars * 0.1;
    
    // Generate galaxy positions
    float galaxyCount = floor(GALAXY_COUNT);
    vec2 galaxyPositions[20];
    float galaxyMasses[20];
    
    for(int i = 0; i < 20 && float(i) < galaxyCount; i++) {
        float id = float(i) / galaxyCount;
        vec2 pos = (hash2(vec2(id * 123.456, id * 789.012)) - 0.5) * 3.0;
        
        // Slow orbital motion
        float angle = iTime * 0.05 + id * 6.28;
        pos += vec2(sin(angle), cos(angle)) * 0.2;
        
        galaxyPositions[i] = pos;
        galaxyMasses[i] = 0.5 + hash(vec2(id * 345.678)) * 1.5;
    }
    
    // Apply gravitational lensing
    for(int i = 0; i < 20 && float(i) < galaxyCount; i++) {
        p = gravitationalLensing(p, galaxyPositions[i], galaxyMasses[i]);
    }
    
    // Dark matter web structure
    float webStructure = fbm(p * 2.0 + iTime * 0.02) * DARK_MATTER;
    webStructure += fbm(p * 4.0 - iTime * 0.01) * DARK_MATTER * 0.5;
    
    // Filament network
    float filamentNetwork = 0.0;
    
    for(int i = 0; i < 20 && float(i) < galaxyCount; i++) {
        for(int j = i + 1; j < 20 && float(j) < galaxyCount; j++) {
            vec2 pos1 = galaxyPositions[i];
            vec2 pos2 = galaxyPositions[j];
            
            float dist = length(pos1 - pos2);
            if(dist < 2.0) {
                float strength = FILAMENT_STRENGTH * exp(-dist * 0.5);
                float thickness = 0.1 + webStructure * 0.05;
                
                filamentNetwork += filament(p, pos1, pos2, thickness) * strength;
            }
        }
    }
    
    // Filament colors (dark matter visualization)
    vec3 filamentColor = vec3(0.2, 0.1, 0.4) * filamentNetwork;
    col += filamentColor;
    
    // Draw galaxies
    for(int i = 0; i < 20 && float(i) < galaxyCount; i++) {
        vec2 galaxyPos = galaxyPositions[i];
        float galaxyId = float(i);
        
        float dist = length(p - galaxyPos);
        
        // Galaxy core
        float coreSize = 0.05 + galaxyMasses[i] * 0.02;
        float core = exp(-dist * dist / (coreSize * coreSize));
        
        // Galaxy spiral arms
        float angle = atan(p.y - galaxyPos.y, p.x - galaxyPos.x);
        float spiral = sin(angle * 2.0 + log(dist + 0.01) * 3.0 - iTime * 0.1);
        spiral *= exp(-dist * 3.0) * 0.5;
        
        // Galaxy halo
        float halo = exp(-dist * 2.0) * 0.2;
        
        float galaxyIntensity = core + max(0.0, spiral) + halo;
        
        vec3 gColor = galaxyColor(galaxyId, galaxyIntensity);
        col += gColor;
        
        // Accretion disk for massive galaxies
        if(galaxyMasses[i] > 1.0) {
            float diskDist = abs(dist - 0.15);
            float disk = exp(-diskDist * 20.0) * smoothstep(0.25, 0.1, dist);
            col += vec3(1.0, 0.3, 0.0) * disk * 0.5;
        }
    }
    
    // Gravitational wave visualization
    float wavePhase = iTime * 0.2;
    for(int i = 0; i < 20 && float(i) < galaxyCount; i++) {
        for(int j = i + 1; j < 20 && float(j) < galaxyCount; j++) {
            vec2 center = (galaxyPositions[i] + galaxyPositions[j]) * 0.5;
            float waveRadius = fract(wavePhase + float(i) * 0.1) * 2.0;
            
            float waveDist = abs(length(p - center) - waveRadius);
            float wave = exp(-waveDist * 50.0) * 0.1;
            
            col += vec3(0.0, 0.3, 0.8) * wave;
        }
    }
    
    // Cosmic microwave background radiation
    float cmb = fbm(originalP * 50.0 + iTime * 0.001) * 0.02;
    col += vec3(1.0, 0.8, 0.6) * cmb;
    
    // Touch creates massive object
    if(touched) {
        vec2 touchPos = (touch * 2.0 - 1.0) * vec2(1.0, iResolution.y / iResolution.x);
        
        // Gravitational lensing effect
        vec2 lensedP = gravitationalLensing(originalP, touchPos, 3.0);
        float lensDistortion = length(lensedP - originalP) * 10.0;
        
        col += vec3(1.0, 0.5, 0.0) * exp(-length(originalP - touchPos) * 3.0);
        col += vec3(0.5, 0.8, 1.0) * lensDistortion * 0.5;
    }
    
    // Redshift effect (cosmic expansion)
    float redshift = length(originalP) * 0.1;
    col.r += redshift * 0.1;
    col.g *= 1.0 - redshift * 0.05;
    col.b *= 1.0 - redshift * 0.1;
    
    // Slight bloom
    col = pow(col, vec3(0.8));
    
    fragColor = vec4(col, 1.0);
}