// Glitch Matrix - Digital corruption aesthetics with chromatic aberration
// Inspired by cyberpunk aesthetics and data corruption visualization

// Dynamic uniforms for testing - replace with knobs in production
uniform float glitchIntensity; // Default: 0.5, controls overall glitch amount
uniform float aberrationStrength; // Default: 0.02, chromatic aberration offset  
uniform float blockSize; // Default: 0.1, size of glitch blocks
uniform float scanlineIntensity; // Default: 0.3, CRT scanline effect
uniform float dataFlowSpeed; // Default: 0.5, speed of data streams

#define PI 3.14159265359

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 getGlitchOffset(vec2 uv, float time) {
    // Block-based glitch displacement
    vec2 block = floor(uv / blockSize) * blockSize;
    float glitchSeed = random(block + vec2(floor(time * 3.0), 0.0));
    
    vec3 offset = vec3(0.0);
    if (glitchSeed > 1.0 - glitchIntensity * 0.1) {
        offset.x = (random(block + vec2(time)) - 0.5) * glitchIntensity * 0.1;
        offset.y = (random(block + vec2(time + 100.0)) - 0.5) * glitchIntensity * 0.05;
    }
    
    // Wave-based distortion
    float wave = sin(uv.y * 10.0 + time * 5.0) * glitchIntensity * 0.02;
    offset.x += wave * step(0.9, random(vec2(floor(time * 10.0))));
    
    return offset;
}

vec3 chromaticAberration(vec2 uv, float amount) {
    vec3 color;
    vec2 offset = vec2(amount, 0.0);
    
    // Sample previous frame with chromatic splits
    color.r = getLastFrameColor(uv + offset).r;
    color.g = getLastFrameColor(uv).g;
    color.b = getLastFrameColor(uv - offset).b;
    
    return color;
}

vec3 dataStream(vec2 uv, float time) {
    // Vertical data streams
    float streamX = floor(uv.x * 20.0) / 20.0;
    float streamPhase = random(vec2(streamX, 0.0)) * 10.0;
    float streamSpeed = (0.5 + random(vec2(streamX, 1.0)) * 0.5) * dataFlowSpeed;
    
    float data = step(0.5, fract(uv.y - time * streamSpeed + streamPhase));
    data *= step(0.8, random(vec2(streamX, floor(time * 10.0))));
    
    vec3 streamColor = vec3(0.0, 1.0, 0.5) * data;
    streamColor *= 0.5 + 0.5 * sin(time * 20.0 + streamX * 100.0);
    
    return streamColor;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 centeredUV = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Get glitch offset
    vec3 glitchOffset = getGlitchOffset(uv, iTime);
    vec2 glitchedUV = uv + glitchOffset.xy;
    
    // Base color with chromatic aberration
    vec3 color = chromaticAberration(glitchedUV, aberrationStrength * (1.0 + glitchIntensity));
    
    // Audio reactive glitch intensification
    float audioBoost = 1.0 + bassNormalized * 0.5 + spectralFluxNormalized;
    glitchOffset *= audioBoost;
    
    // Digital noise overlay
    float digitalNoise = random(vec2(fragCoord + vec2(iTime * 1000.0))) * glitchIntensity * 0.1;
    color = mix(color, vec3(digitalNoise), 0.2);
    
    // Data streams
    vec3 streams = dataStream(uv + glitchOffset.xy, iTime);
    color = mix(color, streams, streams.g * 0.5);
    
    // RGB bit shifting effect
    vec3 shifted = floor(color * 8.0) / 8.0;
    color = mix(color, shifted, glitchIntensity * 0.3);
    
    // Scanlines
    float scanline = sin(fragCoord.y * 2.0) * 0.5 + 0.5;
    scanline = pow(scanline, 3.0) * scanlineIntensity;
    color *= 1.0 - scanline * 0.3;
    
    // Horizontal interference lines
    float interference = step(0.99, random(vec2(0.0, floor(fragCoord.y) + iTime * 100.0)));
    color = mix(color, vec3(1.0, 0.0, 0.5), interference * glitchIntensity);
    
    // Edge detection glitch
    vec2 texelSize = 1.0 / iResolution.xy;
    vec3 edge = abs(getLastFrameColor(uv + vec2(texelSize.x, 0.0)).rgb - 
                    getLastFrameColor(uv - vec2(texelSize.x, 0.0)).rgb);
    color += edge * glitchIntensity * 0.5;
    
    // Beat flash
    if (beat) {
        color += vec3(0.0, 1.0, 0.5) * 0.3 * glitchIntensity;
    }
    
    // Touch interaction - localized corruption
    if (touched) {
        vec2 touchPos = (touch * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
        float touchDist = length(centeredUV - touchPos);
        float corruption = exp(-touchDist * 5.0);
        
        vec3 corruptColor = vec3(
            random(fragCoord + vec2(iTime)),
            random(fragCoord + vec2(iTime + 100.0)),
            random(fragCoord + vec2(iTime + 200.0))
        );
        
        color = mix(color, corruptColor, corruption * 0.8);
    }
    
    // Vignette with glitch
    float vignette = length(centeredUV) * 0.7;
    vignette = 1.0 - vignette * vignette;
    color *= vignette;
    
    // Final color adjustment
    color = pow(color, vec3(0.9)); // Slight gamma correction
    color = clamp(color, 0.0, 1.0);
    
    fragColor = vec4(color, 1.0);
}