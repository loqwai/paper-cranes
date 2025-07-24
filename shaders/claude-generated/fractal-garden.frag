// Fractal Garden - Growing organic fractals like plants
#define GROWTH_SPEED (0.1 + knob_1 * 0.5)
#define BRANCH_ANGLE (0.3 + knob_2 * 0.4)
#define FRACTAL_DEPTH (2.0 + knob_3 * 4.0)
#define LEAF_SIZE (0.02 + knob_4 * 0.03)
#define COLOR_VARIETY (knob_5)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float leaf(vec2 p, float size) {
    p = abs(p);
    float d = length(p) - size;
    d = min(d, sdSegment(p, vec2(0), vec2(size * 0.8, size * 0.3)));
    return d;
}

float flower(vec2 p, float size, float petals) {
    float angle = atan(p.y, p.x);
    float radius = length(p);
    
    float petalAngle = mod(angle * petals / 6.28, 6.28 / petals);
    petalAngle = abs(petalAngle - 3.14 / petals);
    
    vec2 petalP = vec2(cos(petalAngle), sin(petalAngle)) * radius;
    
    return leaf(petalP, size) - size * 0.2;
}

vec3 plantColor(float id, float growth, float type) {
    float hue = fract(id * 0.618 + COLOR_VARIETY * 0.5);
    
    if(type < 0.3) {
        // Green plants
        hue = mix(0.25, 0.35, hue);
    } else if(type < 0.6) {
        // Flowering plants
        hue = mix(0.0, 1.0, hue);
    } else {
        // Blue/purple mystical plants
        hue = mix(0.6, 0.8, hue);
    }
    
    float saturation = 0.7 + growth * 0.3;
    float lightness = 0.3 + growth * 0.4;
    
    return hsl2rgb(vec3(hue, saturation, lightness));
}

float drawBranch(vec2 p, vec2 start, vec2 end, float thickness) {
    float d = sdSegment(p, start, end);
    return smoothstep(thickness, thickness * 0.5, d);
}

void drawFractalPlant(vec2 p, vec2 pos, float id, float growth, inout vec3 col) {
    vec2 localP = p - pos;
    
    float plantType = fract(id * 123.456);
    float angle = id * 6.28 + iTime * 0.1;
    
    // Main stem
    float stemHeight = growth * (0.2 + fract(id * 234.567) * 0.3);
    vec2 stemEnd = vec2(0, stemHeight);
    
    float stemThickness = mix(0.005, 0.002, length(stemEnd) / stemHeight);
    col += plantColor(id, growth, plantType) * drawBranch(localP, vec2(0), stemEnd, stemThickness);
    
    // Recursive branching
    float depth = floor(FRACTAL_DEPTH);
    vec2 currentPos = stemEnd;
    float currentGrowth = growth;
    
    for(float i = 1.0; i <= depth && currentGrowth > 0.3; i++) {
        float branchGrowth = currentGrowth * 0.7;
        float branchLength = stemHeight * 0.6 * branchGrowth;
        
        // Left branch
        float leftAngle = angle + BRANCH_ANGLE + sin(iTime * GROWTH_SPEED + id) * 0.2;
        vec2 leftEnd = currentPos + vec2(sin(leftAngle), cos(leftAngle)) * branchLength;
        
        float branchThickness = stemThickness * 0.7;
        col += plantColor(id + i, branchGrowth, plantType) * 
               drawBranch(localP, currentPos, leftEnd, branchThickness);
        
        // Right branch
        float rightAngle = angle - BRANCH_ANGLE - sin(iTime * GROWTH_SPEED + id + 1.0) * 0.2;
        vec2 rightEnd = currentPos + vec2(sin(rightAngle), cos(rightAngle)) * branchLength;
        
        col += plantColor(id + i + 0.5, branchGrowth, plantType) * 
               drawBranch(localP, currentPos, rightEnd, branchThickness);
        
        // Add leaves
        if(branchGrowth > 0.5) {
            float leafD = leaf(localP - leftEnd, LEAF_SIZE * branchGrowth);
            col += plantColor(id + i, branchGrowth, plantType) * 
                   smoothstep(0.005, 0.0, leafD);
            
            leafD = leaf(localP - rightEnd, LEAF_SIZE * branchGrowth);
            col += plantColor(id + i + 0.5, branchGrowth, plantType) * 
                   smoothstep(0.005, 0.0, leafD);
        }
        
        // Add flowers at branch tips
        if(plantType > 0.3 && branchGrowth > 0.6) {
            float flowerD = flower(localP - leftEnd, LEAF_SIZE * branchGrowth * 1.5, 5.0);
            col += plantColor(id + i + 0.25, 1.0, plantType) * 
                   smoothstep(0.01, 0.0, flowerD) * 2.0;
            
            flowerD = flower(localP - rightEnd, LEAF_SIZE * branchGrowth * 1.5, 5.0);
            col += plantColor(id + i + 0.75, 1.0, plantType) * 
                   smoothstep(0.01, 0.0, flowerD) * 2.0;
        }
        
        currentPos = mix(leftEnd, rightEnd, 0.5);
        currentGrowth = branchGrowth;
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    vec3 col = vec3(0.0);
    
    // Soil/ground gradient
    col += mix(vec3(0.1, 0.05, 0.02), vec3(0.05, 0.1, 0.15), 
               smoothstep(-0.5, 0.5, p.y)) * 0.3;
    
    // Grid of plants
    float gridSize = 0.3;
    vec2 gridId = floor(p / gridSize);
    vec2 gridUv = fract(p / gridSize) - 0.5;
    
    float plantId = dot(gridId, vec2(127.1, 311.7));
    plantId = fract(sin(plantId) * 43758.5453);
    
    // Growth animation
    float growthPhase = fract(iTime * GROWTH_SPEED - plantId * 2.0);
    float growth = smoothstep(0.0, 0.8, growthPhase);
    
    // Only grow plants in certain cells
    if(fract(plantId * 234.567) > 0.3) {
        vec2 plantPos = (gridId + 0.5) * gridSize;
        plantPos += (fract(vec2(plantId * 345.678, plantId * 456.789)) - 0.5) * gridSize * 0.5;
        
        drawFractalPlant(p, plantPos, plantId, growth, col);
    }
    
    // Add some ambient particles (pollen, seeds)
    for(float i = 0.0; i < 20.0; i++) {
        float particleId = i / 20.0;
        vec2 particlePos = vec2(
            sin(iTime * 0.3 + particleId * 6.28) * 0.8,
            cos(iTime * 0.2 + particleId * 4.71) * 0.6 + 
            sin(iTime * 0.1 + particleId * 3.14) * 0.2
        );
        
        float particleDist = length(p - particlePos);
        float particle = exp(-particleDist * 100.0);
        
        col += vec3(1.0, 0.8, 0.3) * particle * 0.5;
    }
    
    // Touch creates new growth
    if(touched) {
        vec2 touchPos = (touch * 2.0 - 1.0) * vec2(1.0, iResolution.y / iResolution.x);
        float touchGrowth = exp(-length(p - touchPos) * 3.0);
        
        // Instant flower bloom
        float flowerD = flower(p - touchPos, 0.1 * touchGrowth, 8.0);
        col += vec3(1.0, 0.5, 0.8) * smoothstep(0.02, 0.0, flowerD) * touchGrowth;
    }
    
    // Slight vignette
    col *= 1.0 - length(uv - 0.5) * 0.2;
    
    fragColor = vec4(col, 1.0);
}