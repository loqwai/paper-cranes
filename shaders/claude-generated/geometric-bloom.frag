// Geometric Bloom - Sacred geometry patterns that bloom and fade
#define BLOOM_RATE (0.5 + knob_1 * 1.5)
#define GEOMETRY_SCALE (0.2 + knob_2 * 0.8)  
#define SYMMETRY_ORDER (3.0 + floor(knob_3 * 9.0))
#define FADE_SPEED (0.3 + knob_4 * 0.7)
#define COLOR_CYCLE (knob_5 * 2.0)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float sdPentagon(vec2 p, float r) {
    const vec3 k = vec3(0.809016994, 0.587785252, 0.726542528);
    p.x = abs(p.x);
    p -= 2.0 * min(dot(vec2(-k.x, k.y), p), 0.0) * vec2(-k.x, k.y);
    p -= 2.0 * min(dot(vec2(k.x, k.y), p), 0.0) * vec2(k.x, k.y);
    p -= vec2(clamp(p.x, -r * k.z, r * k.z), r);
    return length(p) * sign(p.y);
}

float sdHexagon(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}

float flowerOfLife(vec2 p, float scale, float time) {
    p /= scale;
    
    float pattern = 1000.0;
    
    // Central circle
    pattern = min(pattern, abs(length(p) - 1.0) - 0.05);
    
    // Six surrounding circles
    for(float i = 0.0; i < 6.0; i++) {
        float angle = i * 3.14159 / 3.0;
        vec2 center = vec2(cos(angle), sin(angle));
        pattern = min(pattern, abs(length(p - center) - 1.0) - 0.05);
    }
    
    // Outer ring
    for(float i = 0.0; i < 12.0; i++) {
        float angle = i * 3.14159 / 6.0;
        vec2 center = vec2(cos(angle), sin(angle)) * 1.732;
        pattern = min(pattern, abs(length(p - center) - 1.0) - 0.05);
    }
    
    return pattern * scale;
}

float mandala(vec2 p, float symmetry, float time) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    
    // Symmetrical repetition
    angle = mod(angle, 3.14159 * 2.0 / symmetry);
    angle = abs(angle - 3.14159 / symmetry);
    
    p = vec2(cos(angle), sin(angle)) * radius;
    
    float pattern = 1000.0;
    
    // Concentric rings
    for(float i = 1.0; i <= 5.0; i++) {
        float ringRadius = i * 0.2;
        float thickness = 0.02 + sin(time + i) * 0.01;
        pattern = min(pattern, abs(radius - ringRadius) - thickness);
    }
    
    // Radial spokes
    float spokeAngle = mod(angle * symmetry, 3.14159 / 3.0);
    spokeAngle = min(spokeAngle, 3.14159 / 3.0 - spokeAngle);
    float spokeWidth = 0.03 + sin(time * 2.0) * 0.01;
    pattern = min(pattern, spokeAngle * radius - spokeWidth);
    
    return pattern;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec4 prevColor = getLastFrameColor(fragCoord / iResolution.xy);
    
    vec3 col = vec3(0.0);
    
    // Blooming cycles
    float bloomPhase = sin(iTime * BLOOM_RATE) * 0.5 + 0.5;
    float scaleAnim = GEOMETRY_SCALE * (0.5 + bloomPhase * 1.5);
    
    // Rotate geometry
    uv *= rot(iTime * 0.1);
    
    float d = 1000.0;
    
    // Sacred geometry patterns
    if(SYMMETRY_ORDER < 5.0) {
        // Flower of Life
        d = min(d, flowerOfLife(uv, scaleAnim, iTime));
    } else if(SYMMETRY_ORDER < 8.0) {
        // Pentagon pattern
        d = min(d, sdPentagon(uv, scaleAnim));
        
        // Nested pentagons
        for(float i = 1.0; i < 4.0; i++) {
            vec2 p = uv * rot(i * 0.628);
            d = min(d, sdPentagon(p, scaleAnim * (1.0 - i * 0.2)));
        }
    } else {
        // Hexagon pattern
        d = min(d, sdHexagon(uv, scaleAnim));
        
        // Hexagonal grid
        vec2 grid = uv;
        float gridSize = scaleAnim * 0.5;
        grid = vec2(grid.x + grid.y * 0.5, grid.y * 0.866) / gridSize;
        vec2 gridId = floor(grid);
        vec2 gridUv = fract(grid) - 0.5;
        
        d = min(d, sdHexagon(gridUv * gridSize, gridSize * 0.3));
    }
    
    // Mandala overlay
    float mandalaD = mandala(uv, SYMMETRY_ORDER, iTime);
    d = min(d, mandalaD);
    
    // Convert distance to brightness
    float brightness = smoothstep(0.005, 0.0, abs(d));
    brightness += exp(-abs(d) * 20.0) * 0.5; // Glow
    
    // Color cycling
    vec3 color = hsl2rgb(vec3(
        fract(iTime * 0.1 * COLOR_CYCLE + bloomPhase * 0.3),
        0.8 - bloomPhase * 0.3,
        0.5 + bloomPhase * 0.3
    ));
    
    col = color * brightness;
    
    // Bloom effect - accumulate with previous frame
    vec3 prevHsl = rgb2hsl(prevColor.rgb);
    vec3 newHsl = rgb2hsl(col);
    
    // Fade previous frame
    prevHsl.z *= (1.0 - FADE_SPEED * 0.05);
    
    // Blend new with faded previous
    float blendFactor = brightness * 0.1 + 0.05;
    vec3 finalHsl = mix(prevHsl, newHsl, blendFactor);
    
    col = hsl2rgb(finalHsl);
    
    // Add sparkles during bloom
    if(bloomPhase > 0.7) {
        float sparkle = step(0.98, random(uv + iTime * 0.1));
        col += vec3(1.0, 0.8, 0.5) * sparkle * (bloomPhase - 0.7) * 3.0;
    }
    
    // Touch creates new bloom center
    if(touched) {
        vec2 touchPos = (touch * 2.0 - 1.0) * vec2(1.0, iResolution.y / iResolution.x);
        float touchDist = length(uv - touchPos);
        float touchBloom = exp(-touchDist * 5.0) * sin(iTime * 10.0) * 0.5 + 0.5;
        col += vec3(1.0, 0.5, 0.0) * touchBloom;
    }
    
    fragColor = vec4(col, 1.0);
}