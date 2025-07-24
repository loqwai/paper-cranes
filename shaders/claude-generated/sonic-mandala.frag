// Sonic Mandala - Circular patterns that respond to audio frequencies
#define MANDALA_LAYERS (3.0 + knob_1 * 7.0)
#define ROTATION_SPEED (0.1 + knob_2 * 0.5)
#define FREQUENCY_RESPONSE (knob_3 * 2.0)
#define SYMMETRY_ORDER (6.0 + floor(knob_4 * 18.0))
#define PULSE_INTENSITY (0.5 + knob_5 * 1.5)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float mandalaPattern(vec2 p, float symmetry, float time) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    
    // Symmetrical repetition
    angle = mod(angle, 6.28318 / symmetry);
    angle = min(angle, 6.28318 / symmetry - angle);
    
    p = vec2(cos(angle), sin(angle)) * radius;
    
    float pattern = 0.0;
    
    // Concentric rings responding to audio
    for(float i = 1.0; i <= 8.0; i++) {
        float ringRadius = i * 0.1;
        
        // Each ring responds to different frequency bands
        float audioResponse = 1.0;
        if(i <= 2.0) {
            audioResponse += bassNormalized * FREQUENCY_RESPONSE;
        } else if(i <= 5.0) {
            audioResponse += midsNormalized * FREQUENCY_RESPONSE;
        } else {
            audioResponse += trebleNormalized * FREQUENCY_RESPONSE;
        }
        
        float thickness = 0.02 + sin(time + i) * 0.01;
        thickness *= audioResponse;
        
        float ring = smoothstep(thickness, 0.0, abs(radius - ringRadius));
        pattern += ring;
    }
    
    // Radial spokes
    float spokeAngle = mod(angle * symmetry, 6.28318 / 8.0);
    spokeAngle = min(spokeAngle, 6.28318 / 8.0 - spokeAngle);
    
    float spokeWidth = 0.02 + energyNormalized * 0.03;
    float spoke = smoothstep(spokeWidth, 0.0, spokeAngle * radius);
    
    pattern += spoke;
    
    return pattern;
}

float geometricShape(vec2 p, float n, float r, float time) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    
    // N-sided polygon
    float a = angle + time;
    float b = 6.28318 / n;
    
    float polygon = cos(floor(0.5 + a / b) * b - a) * radius - r;
    
    return smoothstep(0.02, 0.0, abs(polygon));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec4 prevColor = getLastFrameColor(fragCoord / iResolution.xy);
    
    vec3 col = vec3(0.0);
    
    // Dark background with subtle energy field
    col += vec3(0.01, 0.02, 0.05) * (1.0 + energyNormalized * 0.2);
    
    // Rotate the entire mandala
    uv *= rot(iTime * ROTATION_SPEED);
    
    float layers = floor(MANDALA_LAYERS);
    
    // Multiple mandala layers
    for(float i = 0.0; i < layers; i++) {
        float layerId = i / layers;
        float layerScale = 0.3 + i * 0.2;
        
        vec2 layerP = uv / layerScale;
        
        // Each layer rotates at different speed
        layerP *= rot(iTime * ROTATION_SPEED * (1.0 + layerId * 0.5));
        
        // Different symmetry for each layer
        float layerSymmetry = SYMMETRY_ORDER + i * 2.0;
        
        float pattern = mandalaPattern(layerP, layerSymmetry, iTime + layerId * 2.0);
        
        // Layer color based on audio features
        vec3 layerColor = hsl2rgb(vec3(
            fract(layerId * 0.618 + spectralCentroidNormalized * 0.3),
            0.7 + spectralRoughnessNormalized * 0.3,
            0.4 + pattern * 0.6
        ));
        
        // Beat pulse effect
        if(beat) {
            pattern *= 1.0 + PULSE_INTENSITY * (1.0 - layerId);
            layerColor *= 1.0 + PULSE_INTENSITY * 0.5;
        }
        
        col += layerColor * pattern * (1.0 - layerId * 0.3);
        
        // Add geometric elements
        if(i < 3.0) {
            float shapeSize = 0.15 + sin(iTime + layerId * 3.14) * 0.05;
            float shape = geometricShape(layerP, 3.0 + i * 2.0, shapeSize, iTime * (1.0 + layerId));
            
            col += layerColor * shape * 0.5;
        }
    }
    
    // Central mandala detail
    float centerPattern = mandalaPattern(uv * 3.0, SYMMETRY_ORDER * 2.0, iTime * 2.0);
    vec3 centerColor = hsl2rgb(vec3(
        fract(iTime * 0.1 + spectralFluxNormalized),
        0.9,
        0.8
    ));
    
    col += centerColor * centerPattern * smoothstep(0.3, 0.1, length(uv));
    
    // Spectral analysis visualization
    float spectrumViz = 0.0;
    for(float i = 0.0; i < 16.0; i++) {
        float freq = i / 16.0;
        float amplitude = mix(bassNormalized, trebleNormalized, freq);
        
        float angleStep = 6.28318 / 16.0;
        vec2 specPos = vec2(cos(i * angleStep), sin(i * angleStep)) * (0.4 + amplitude * 0.2);
        
        float specDist = length(uv - specPos);
        spectrumViz += exp(-specDist * 20.0) * amplitude;
    }
    
    col += vec3(1.0, 0.5, 0.0) * spectrumViz * 0.3;
    
    // Persistence effect
    vec3 prevHsl = rgb2hsl(prevColor.rgb);
    vec3 newHsl = rgb2hsl(col);
    
    // Fade previous frame
    prevHsl.z *= 0.95 - energyNormalized * 0.1;
    
    // Blend with new content
    float blendFactor = 0.2 + beat * 0.3;
    vec3 finalHsl = mix(prevHsl, newHsl, blendFactor);
    
    col = hsl2rgb(finalHsl);
    
    // Touch creates resonance waves
    if(touched) {
        vec2 touchPos = (touch * 2.0 - 1.0) * vec2(1.0, iResolution.y / iResolution.x);
        float touchDist = length(uv - touchPos);
        
        float resonance = sin(touchDist * 15.0 - iTime * 8.0) * 0.5 + 0.5;
        resonance *= exp(-touchDist * 2.0);
        
        col += vec3(1.0, 0.8, 0.5) * resonance;
    }
    
    // Vignette
    col *= 1.0 - length(uv) * 0.3;
    
    fragColor = vec4(col, 1.0);
}