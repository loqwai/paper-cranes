// Aurora Waves - Northern lights simulation with flowing curtains of light
#define WAVE_SPEED (0.2 + knob_1 * 0.8)
#define WAVE_HEIGHT (0.3 + knob_2 * 0.7)
#define COLOR_SHIFT_SPEED (0.1 + knob_3 * 0.4)
#define CURTAIN_COUNT (3.0 + knob_4 * 7.0)
#define TURBULENCE (0.1 + knob_5 * 0.4)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(
            mix(random(i + vec3(0,0,0)), random(i + vec3(1,0,0)), f.x),
            mix(random(i + vec3(0,1,0)), random(i + vec3(1,1,0)), f.x),
            f.y
        ),
        mix(
            mix(random(i + vec3(0,0,1)), random(i + vec3(1,0,1)), f.x),
            mix(random(i + vec3(0,1,1)), random(i + vec3(1,1,1)), f.x),
            f.y
        ),
        f.z
    );
}

float fbm(vec3 p) {
    float f = 0.0;
    float a = 0.5;
    for(int i = 0; i < 6; i++) {
        f += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return f;
}

vec3 auroraColor(float t, float intensity) {
    // Typical aurora color palette
    vec3 green = vec3(0.2, 1.0, 0.3);
    vec3 blue = vec3(0.1, 0.3, 1.0);
    vec3 purple = vec3(0.8, 0.2, 1.0);
    vec3 pink = vec3(1.0, 0.3, 0.7);
    
    // Cycle through colors
    float colorPhase = fract(t + iTime * COLOR_SHIFT_SPEED);
    
    vec3 color;
    if(colorPhase < 0.25) {
        color = mix(green, blue, colorPhase * 4.0);
    } else if(colorPhase < 0.5) {
        color = mix(blue, purple, (colorPhase - 0.25) * 4.0);
    } else if(colorPhase < 0.75) {
        color = mix(purple, pink, (colorPhase - 0.5) * 4.0);
    } else {
        color = mix(pink, green, (colorPhase - 0.75) * 4.0);
    }
    
    return color * intensity;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    vec3 col = vec3(0.0);
    
    // Dark sky background with stars
    col += vec3(0.01, 0.02, 0.05);
    
    // Add stars
    float stars = step(0.995, random(floor(p * 100.0) + vec2(123.456, 789.012)));
    col += vec3(1.0) * stars * 0.5;
    
    // Aurora curtains
    float curtains = floor(CURTAIN_COUNT);
    
    for(float i = 0.0; i < curtains; i++) {
        float curtainId = i / curtains;
        float curtainOffset = curtainId * 2.0 - 1.0;
        
        // Base wave function
        float wave = sin(p.x * 3.0 + curtainOffset * 5.0 + iTime * WAVE_SPEED) * WAVE_HEIGHT;
        
        // Add turbulence
        vec3 turbulencePos = vec3(p.x * 2.0, p.y * 2.0 - wave, iTime * 0.5 + curtainId);
        float turbulence = fbm(turbulencePos) * TURBULENCE;
        wave += turbulence;
        
        // Multi-layer waves for complexity
        wave += sin(p.x * 7.0 + curtainOffset * 3.0 + iTime * WAVE_SPEED * 1.3) * WAVE_HEIGHT * 0.3;
        wave += sin(p.x * 11.0 + curtainOffset * 7.0 + iTime * WAVE_SPEED * 0.7) * WAVE_HEIGHT * 0.2;
        
        // Vertical position of curtain
        float curtainY = wave + curtainOffset * 0.3;
        
        // Distance from wave
        float dist = abs(p.y - curtainY);
        
        // Aurora brightness based on distance
        float brightness = exp(-dist * 8.0) * (0.5 + 0.5 * sin(iTime * 2.0 + curtainId * 6.28));
        
        // Add vertical streaks
        float streakNoise = fbm(vec3(p.x * 5.0, p.y * 20.0, iTime * 0.3 + curtainId));
        brightness *= 0.7 + 0.3 * streakNoise;
        
        // Height fade (aurora is stronger higher up)
        float heightFade = smoothstep(-0.5, 0.5, p.y + curtainY);
        brightness *= heightFade;
        
        // Get aurora color for this curtain
        vec3 auroraCol = auroraColor(curtainId, brightness);
        
        // Blend with existing color
        col += auroraCol;
    }
    
    // Add atmospheric glow
    float atmosphere = exp(-abs(p.y) * 2.0) * 0.1;
    col += vec3(0.0, 0.1, 0.2) * atmosphere;
    
    // Ground silhouette
    float ground = smoothstep(-0.48, -0.5, p.y);
    col *= (1.0 - ground) + ground * 0.1;
    
    // Add shimmer effect
    float shimmer = 0.5 + 0.5 * sin(p.x * 20.0 + iTime * 3.0);
    shimmer *= 0.5 + 0.5 * sin(p.y * 15.0 + iTime * 2.0);
    col += vec3(0.1, 0.2, 0.3) * shimmer * 0.05;
    
    // Touch interaction - create aurora burst
    if(touched) {
        vec2 touchPos = (touch * 2.0 - 1.0) * vec2(1.0, iResolution.y / iResolution.x);
        float touchDist = length(p - touchPos);
        
        float burstPhase = fract(iTime * 2.0);
        float burstRadius = burstPhase * 0.5;
        float burstIntensity = exp(-abs(touchDist - burstRadius) * 20.0) * 
                              (1.0 - burstPhase) * 2.0;
        
        col += auroraColor(touchDist, burstIntensity);
    }
    
    // Slight bloom
    col = pow(col, vec3(0.8));
    
    // Vignette
    col *= 1.0 - length(uv - 0.5) * 0.3;
    
    fragColor = vec4(col, 1.0);
}