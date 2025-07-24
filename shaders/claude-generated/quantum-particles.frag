// Quantum Particles - Particle system with quantum tunneling and probability clouds
#define PARTICLE_COUNT 128.0
#define QUANTUM_SCALE (0.1 + knob_1 * 2.0)
#define TUNNELING_PROB (knob_2 * 0.5)
#define WAVE_COLLAPSE (knob_3)
#define COLOR_SHIFT (knob_4)
#define PARTICLE_SIZE (0.01 + knob_5 * 0.05)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

vec2 hash2(float n) {
    return vec2(hash(n), hash(n + 1.234));
}

float quantumWave(vec2 p, vec2 center, float phase) {
    float d = length(p - center);
    float wave = exp(-d * d * 5.0) * cos(d * 20.0 - phase);
    return wave;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    vec3 color = vec3(0.0);
    float totalIntensity = 0.0;
    
    // Quantum field background
    float field = 0.0;
    for(float i = 0.0; i < 5.0; i++) {
        vec2 offset = hash2(i) - 0.5;
        float phase = iTime * (1.0 + i * 0.3) * QUANTUM_SCALE;
        field += quantumWave(p, offset * 0.8, phase) * 0.2;
    }
    
    // Particles with quantum properties
    for(float i = 0.0; i < PARTICLE_COUNT; i++) {
        float id = i / PARTICLE_COUNT;
        
        // Particle base position
        vec2 basePos = hash2(i * 123.456) - 0.5;
        basePos *= 1.5;
        
        // Quantum tunneling
        float tunnel = step(hash(i * 789.012 + floor(iTime * 0.5)), TUNNELING_PROB);
        if(tunnel > 0.5) {
            basePos = hash2(i * 345.678 + floor(iTime * 0.5)) - 0.5;
            basePos *= 1.5;
        }
        
        // Wave function
        float wavePhase = iTime * 3.0 + id * 6.28;
        vec2 waveOffset = vec2(sin(wavePhase), cos(wavePhase * 0.7)) * 0.1 * (1.0 - WAVE_COLLAPSE);
        
        vec2 particlePos = basePos + waveOffset;
        
        // Probability cloud
        float dist = length(p - particlePos);
        float probability = exp(-dist * dist * 50.0 / PARTICLE_SIZE);
        
        // Collapse visualization
        float collapse = mix(0.2, 1.0, WAVE_COLLAPSE);
        probability *= collapse;
        
        // Energy level colors
        float energy = hash(i * 456.789);
        vec3 particleColor = hsl2rgb(vec3(
            fract(energy + COLOR_SHIFT + field * 0.1),
            0.8 - WAVE_COLLAPSE * 0.3,
            0.5 + probability * 0.5
        ));
        
        // Interference patterns
        float interference = sin(dist * 100.0 - iTime * 5.0) * 0.5 + 0.5;
        particleColor *= 1.0 + interference * 0.3 * (1.0 - WAVE_COLLAPSE);
        
        color += particleColor * probability;
        totalIntensity += probability;
    }
    
    // Background field visualization
    vec3 fieldColor = hsl2rgb(vec3(
        fract(0.6 + field * 0.1 + COLOR_SHIFT),
        0.3,
        0.1 + abs(field) * 0.2
    ));
    
    color = mix(fieldColor, color, smoothstep(0.0, 0.1, totalIntensity));
    
    // Add quantum noise
    float noise = (random(p + iTime * 0.1) - 0.5) * 0.05;
    color += noise * (1.0 - WAVE_COLLAPSE);
    
    // Touch interaction - collapse wave function
    if(touched) {
        float touchDist = length(p - (touch * 2.0 - 1.0));
        float touchEffect = smoothstep(0.3, 0.0, touchDist);
        color = mix(color, vec3(1.0, 0.8, 0.5), touchEffect * 0.5);
    }
    
    fragColor = vec4(color, 1.0);
}