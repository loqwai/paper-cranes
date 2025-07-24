// Neural Network - Visualizing synaptic connections with electrical pulses
#define PULSE_SPEED (0.5 + knob_1 * 2.0)
#define NETWORK_DENSITY (3.0 + knob_2 * 7.0)
#define SYNAPSE_STRENGTH (0.5 + knob_3 * 0.5)
#define PULSE_FREQUENCY (0.2 + knob_4 * 0.8)
#define GLOW_INTENSITY (0.5 + knob_5 * 1.5)

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

vec3 getNeuronPos(float id) {
    float angle = id * 2.399963; // Golden angle
    float radius = sqrt(id) * 0.5;
    float height = sin(id * 0.7) * 2.0;
    
    return vec3(
        cos(angle) * radius,
        sin(angle) * radius,
        height
    );
}

float drawNeuron(vec2 p, vec2 center, float activity) {
    float d = length(p - center);
    float core = smoothstep(0.03, 0.02, d);
    float glow = exp(-d * 5.0) * activity * GLOW_INTENSITY;
    return core + glow;
}

float drawSynapse(vec2 p, vec2 a, vec2 b, float pulse) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    
    float d = length(pa - ba * t);
    
    // Pulse position along synapse
    float pulsePos = fract(pulse * PULSE_SPEED);
    vec2 pulsePoint = mix(a, b, pulsePos);
    float pulseDist = length(p - pulsePoint);
    
    // Synapse line
    float synapse = smoothstep(0.003, 0.001, d) * 0.3 * SYNAPSE_STRENGTH;
    
    // Pulse glow
    float pulseGlow = exp(-pulseDist * 30.0) * 2.0;
    
    return synapse + pulseGlow * step(0.01, pulse);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 uvOrig = uv;
    
    // Camera rotation
    float camTime = iTime * 0.1;
    uv *= mat2(cos(camTime), -sin(camTime), sin(camTime), cos(camTime));
    
    vec3 col = vec3(0.0);
    
    // Background gradient
    col += vec3(0.02, 0.01, 0.03) * (1.0 - length(uvOrig) * 0.5);
    
    float neurons = floor(NETWORK_DENSITY);
    
    // Store neuron positions and activities
    for(float i = 0.0; i < neurons; i++) {
        vec3 pos3d = getNeuronPos(i);
        
        // Simple 3D to 2D projection
        vec2 pos = pos3d.xy / (3.0 + pos3d.z);
        
        // Neuron activity
        float activity = 0.5 + 0.5 * sin(iTime + i * 1.234 + 
                        sin(iTime * 0.7 + i * 0.567) * 2.0);
        
        // Draw neuron
        vec3 neuronColor = hsl2rgb(vec3(
            0.55 + activity * 0.1, // Blue to purple
            0.8,
            0.5
        ));
        
        col += neuronColor * drawNeuron(uv, pos, activity);
        
        // Draw synapses to nearby neurons
        for(float j = 0.0; j < neurons; j++) {
            if(abs(i - j) < 0.5) continue;
            
            vec3 pos2_3d = getNeuronPos(j);
            vec2 pos2 = pos2_3d.xy / (3.0 + pos2_3d.z);
            
            float dist = length(pos - pos2);
            if(dist < 0.5 && dist > 0.05) {
                // Synapse strength based on distance
                float strength = exp(-dist * 3.0);
                
                // Pulse timing
                float pulsePhase = hash(vec2(i, j)) + iTime * PULSE_FREQUENCY;
                float pulse = fract(pulsePhase);
                
                // Only show pulse sometimes
                pulse *= step(0.5, sin(pulsePhase * 3.14159));
                
                vec3 synapseColor = hsl2rgb(vec3(
                    0.45 + pulse * 0.15, // Green to cyan during pulse
                    0.9,
                    0.4 + pulse * 0.3
                ));
                
                col += synapseColor * drawSynapse(uv, pos, pos2, pulse) * strength;
            }
        }
    }
    
    // Add noise
    col += (hash2(fragCoord + iTime).x - 0.5) * 0.02;
    
    // Bloom effect
    col = pow(col, vec3(0.8));
    
    // Touch creates activity burst
    if(touched) {
        vec2 touchPos = (touch * 2.0 - 1.0) * vec2(1.0, iResolution.y / iResolution.x);
        float touchGlow = exp(-length(uvOrig - touchPos) * 3.0);
        col += vec3(1.0, 0.5, 0.0) * touchGlow;
    }
    
    fragColor = vec4(col, 1.0);
}