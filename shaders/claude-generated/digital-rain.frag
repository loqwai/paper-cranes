// Digital Rain - Matrix-style falling code with reactive glyphs
#define RAIN_SPEED (0.5 + knob_1 * 2.0)
#define GLYPH_SIZE (8.0 + knob_2 * 8.0)
#define DENSITY (0.3 + knob_3 * 0.7)
#define GLOW_INTENSITY (0.5 + knob_4 * 1.5)
#define COLOR_VARIATION (knob_5)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float glyph(vec2 p, float glyphId) {
    // Simple glyph patterns (representing characters/symbols)
    p = fract(p) - 0.5;
    
    float pattern = 0.0;
    
    if(glyphId < 0.1) {
        // Vertical line
        pattern = smoothstep(0.1, 0.05, abs(p.x));
    } else if(glyphId < 0.2) {
        // Horizontal line
        pattern = smoothstep(0.1, 0.05, abs(p.y));
    } else if(glyphId < 0.3) {
        // Cross
        pattern = max(
            smoothstep(0.1, 0.05, abs(p.x)),
            smoothstep(0.1, 0.05, abs(p.y))
        );
    } else if(glyphId < 0.4) {
        // Circle
        pattern = smoothstep(0.4, 0.3, length(p));
        pattern -= smoothstep(0.3, 0.2, length(p));
    } else if(glyphId < 0.5) {
        // L shape
        pattern = max(
            smoothstep(0.1, 0.05, abs(p.x + 0.2)) * step(-0.1, p.y),
            smoothstep(0.1, 0.05, abs(p.y + 0.2)) * step(-0.1, p.x)
        );
    } else if(glyphId < 0.6) {
        // T shape
        pattern = max(
            smoothstep(0.1, 0.05, abs(p.y - 0.2)),
            smoothstep(0.1, 0.05, abs(p.x)) * step(0.0, p.y)
        );
    } else if(glyphId < 0.7) {
        // Diamond
        pattern = smoothstep(0.4, 0.3, abs(p.x) + abs(p.y));
        pattern -= smoothstep(0.3, 0.2, abs(p.x) + abs(p.y));
    } else if(glyphId < 0.8) {
        // Triangle
        pattern = smoothstep(0.1, 0.05, abs(p.x + p.y * 0.5) - 0.2);
        pattern *= step(-0.2, p.y);
    } else if(glyphId < 0.9) {
        // Square
        pattern = smoothstep(0.3, 0.2, max(abs(p.x), abs(p.y)));
        pattern -= smoothstep(0.2, 0.1, max(abs(p.x), abs(p.y)));
    } else {
        // Plus
        pattern = max(
            smoothstep(0.05, 0.02, abs(p.x)) * smoothstep(0.3, 0.2, abs(p.y)),
            smoothstep(0.05, 0.02, abs(p.y)) * smoothstep(0.3, 0.2, abs(p.x))
        );
    }
    
    return pattern;
}

vec3 digitalColor(float intensity, float variation) {
    // Classic matrix green with variations
    vec3 baseColor = vec3(0.0, 1.0, 0.2);
    
    if(variation > 0.5) {
        // Blue variant
        baseColor = vec3(0.0, 0.3, 1.0);
    }
    
    if(variation < 0.2) {
        // White for highlights
        baseColor = vec3(1.0, 1.0, 1.0);
    }
    
    return baseColor * intensity;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    vec3 col = vec3(0.0);
    
    // Dark background
    col += vec3(0.0, 0.02, 0.0);
    
    // Grid setup
    vec2 gridUv = fragCoord / GLYPH_SIZE;
    vec2 gridId = floor(gridUv);
    vec2 localUv = fract(gridUv);
    
    // Random properties for each column
    float columnId = gridId.x;
    float columnSeed = hash(vec2(columnId, 0.0));
    
    // Only some columns have rain
    if(columnSeed < DENSITY) {
        // Rain speed varies per column
        float columnSpeed = RAIN_SPEED * (0.5 + columnSeed);
        
        // Current time for this column
        float timeOffset = hash(vec2(columnId, 1.0)) * 10.0;
        float columnTime = iTime * columnSpeed + timeOffset;
        
        // Audio reactivity
        float audioBoost = 1.0 + energyNormalized * 0.5;
        if(beat) {
            audioBoost += 1.0;
        }
        
        columnTime *= audioBoost;
        
        // Rain drop position
        float dropY = fract(columnTime) * (iResolution.y / GLYPH_SIZE + 10.0) - 5.0;
        float currentDropRow = gridId.y;
        
        // Multiple drops per column
        for(float dropOffset = 0.0; dropOffset < 5.0; dropOffset++) {
            float thisDropY = dropY - dropOffset * 3.0;
            
            if(abs(currentDropRow - thisDropY) < 0.5) {
                // We're in a drop
                float dropIntensity = 1.0 - dropOffset * 0.2;
                
                // Leading character is brighter
                if(dropOffset == 0.0) {
                    dropIntensity = 2.0;
                }
                
                // Glyph selection
                float glyphSeed = hash(vec2(columnId, floor(thisDropY + columnTime)));
                float glyphId = fract(glyphSeed * 10.0);
                
                // Audio affects glyph selection
                glyphId = fract(glyphId + spectralFluxNormalized);
                
                // Draw glyph
                float glyphPattern = glyph(localUv, glyphId);
                
                // Color variation
                float colorVar = hash(vec2(columnId, floor(thisDropY)));
                colorVar = mix(colorVar, COLOR_VARIATION, 0.5);
                
                vec3 glyphColor = digitalColor(dropIntensity, colorVar);
                
                // Glow effect
                float glow = exp(-length(localUv - 0.5) * 3.0) * GLOW_INTENSITY;
                glyphColor += digitalColor(glow * dropIntensity, colorVar) * 0.3;
                
                col += glyphColor * glyphPattern;
            }
        }
        
        // Trail effect - fading characters
        float trailLength = 10.0 + bassNormalized * 20.0;
        for(float i = 1.0; i < trailLength; i++) {
            float trailY = dropY - i;
            
            if(abs(currentDropRow - trailY) < 0.5) {
                float trailIntensity = exp(-i * 0.2) * 0.5;
                
                float trailGlyphSeed = hash(vec2(columnId, floor(trailY + timeOffset)));
                float trailGlyphId = fract(trailGlyphSeed * 10.0);
                
                float trailPattern = glyph(localUv, trailGlyphId);
                
                vec3 trailColor = digitalColor(trailIntensity, columnSeed);
                col += trailColor * trailPattern;
            }
        }
    }
    
    // Horizontal scan lines
    float scanline = sin(fragCoord.y * 3.14159 / 2.0) * 0.04;
    col *= 1.0 + scanline;
    
    // Flicker effect on beat
    if(beat) {
        float flicker = sin(iTime * 30.0) * 0.1 + 0.9;
        col *= flicker;
    }
    
    // Touch creates digital disruption
    if(touched) {
        vec2 touchPos = touch * iResolution.xy;
        vec2 touchGrid = floor(touchPos / GLYPH_SIZE);
        
        if(length(gridId - touchGrid) < 3.0) {
            float disruptionPattern = glyph(localUv, fract(iTime * 10.0));
            vec3 disruptionColor = vec3(1.0, 0.5, 0.0);
            
            col += disruptionColor * disruptionPattern * 0.5;
        }
    }
    
    // Subtle vignette
    col *= 1.0 - length(uv - 0.5) * 0.2;
    
    // Add slight green tint to everything
    col.g += 0.01;
    
    fragColor = vec4(col, 1.0);
}