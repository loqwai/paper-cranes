// @fullscreen: true
//http://localhost:6969/?shader=redaphid%2Fwip%2Fmelted-satin-4&fullscreen=true&knob_1=0.57&knob_1.min=0&knob_1.max=3&knob_2=1.34&knob_2.min=0&knob_2.max=3&knob_3=75.97&knob_3.min=0&knob_3.max=100&knob_4=1.04&knob_4.min=0&knob_4.max=3&knob_5=0.03&knob_5.min=-0.8&knob_5.max=3&knob_6=0.07&knob_6.min=0&knob_6.max=1&knob_7=0.11&knob_7.min=-0.1&knob_7.max=1&knob_8=0.61&knob_8.min=-1&knob_8.max=5.5&image=images%2Feye1.png
#define t (iTime*0.05 + energyZScore*0.01)  // Even less energy influence

// Add the mainImage function declaration at the top
void mainImage(out vec4 fragColor, in vec2 fragCoord);

mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}

// Add ripple effect based on color difference
vec2 getRippleOffset(vec2 uv, vec4 lastFrame, vec4 currentColor) {
    vec3 diff = abs(lastFrame.rgb - currentColor.rgb);
    float colorDiff = (diff.r + diff.g + diff.b) / 3.0;

    // Create ripple based on color difference - even gentler
    float rippleStrength = colorDiff  * (1.0 + energyZScore * 0.5);  // Halved both factors
    if(beat) rippleStrength *= 1.1;  // Even gentler beat response

    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float dist = length(uv - 0.5);

    return vec2(
        cos(angle + t) * rippleStrength * sin(dist * 3.0 + t),  // Reduced frequency further
        sin(angle + t) * rippleStrength * sin(dist * 3.0 + t)   // Reduced frequency further
    ) * 0.25;  // Even more dampening
}

// Add distortion function similar to beat-trip
vec2 getDistortedUV(vec2 uv) {
    // Center the UV coordinates
    vec2 centered = uv - 0.5;

    // Create zoom effect based on bass z-score
    float zoomFactor = 1.0 + bassZScore * 0.5; // Gentle zoom range of 0.8x to 1.2x
    centered = centered / zoomFactor; // Zoom in/out from center

    // Re-center and add original wave distortion
    vec2 zoomedUV = centered + 0.5;

    float waveX = sin(zoomedUV.y*3.0 + t*(energyZScore)) * 0.1;
    float waveY = cos(zoomedUV.x*3.0 + t*(spectralCrestZScore)) * 0.1;

    if(beat) {
        waveX *= 1.2;
        waveY *= 1.2;
    }

    return zoomedUV + vec2(waveX, waveY);
}

// Fractal transformation function
vec3 twist(vec3 p) {
    float k = sin(t*0.05) * 0.25 + 1.25;  // Reduced range and speed
    float c = cos(k*p.y);
    float s = sin(k*p.y);
    mat2 rotm = mat2(c,-s,s,c);
    vec3 q = vec3(rotm*p.xz,p.y);
    return q;
}

float map(vec3 p) {
    // Initial rotation - even slower
    p.xz *= m(t*0.025);  // Halved
    p.xy *= m(t*0.015);  // Halved
    p = clamp(p, vec3(-1.5), vec3(1.5)); // Even tighter clamp

    // Modified recursive folding for more varied patterns
    float scale = 1.0 + spectralCentroidNormalized * 0.1;  // Reduced influence
    float d = 50.0;  // Reduced initial distance
    vec3 q = p;

    for(int i = 0; i < 2; i++) {
        q = twist(q);
        q = abs(q) - vec3(1.0, 1.0, 1.0) * (1.0 + energyNormalized * 0.025);  // Halved energy influence
        q.xy *= m(t * 0.015 + float(i) * 0.1);  // Slower rotation
        q *= scale;
        q = clamp(q, vec3(-3.0), vec3(3.0)); // Tighter clamp
        float current = length(q) * pow(scale, float(-i));
        current = clamp(current, 0.0, 5.0); // Tighter clamp

        // Even smoother variation
        current += smoothstep(-1.0, 1.0, sin(q.x * 0.5 + q.y * 0.5)) * 0.01;  // Reduced frequency and amplitude
        d = min(d, current);
    }

    // Smoother waves with less audio influence
    vec3 modP = p*bassNormalized + vec3(t);  // Reduced scale more
    float wave = smoothstep(-1.0, 1.0, sin(modP.x + sin(modP.z + sin(modP.y)))) * 0.1;
    wave += smoothstep(-1.0, 1.0, sin(modP.y * spectralCentroidNormalized * 0.5)) * 0.015;  // Halved influence
    wave = clamp(wave, -0.15, 0.15); // Tighter clamp

    float result = d * 0.1 + wave;  // Reduced scale more
    return clamp(result, -5.0, 5.0); // Tighter final clamp
}

// Then implement mainImage with the exact same signature
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Center and normalize coordinates
    vec2 uv = fragCoord.xy/iResolution.xy;

    // Create centered coordinates for rotation
    vec2 center = vec2(0.5);
    vec2 centered = uv - center;
    if(energyZScore > 0.9 && random(uv) > 0.75) {
        centered.x += (spectralKurtosisZScore * 0.001);
        centered.y += (spectralCentroidZScore * 0.001);
    }
    // Create smooth rotation based on time and audio
    float rotationSpeed = bassZScore;  // Base rotation speed
    float rotationAngle = t * rotationSpeed;  // Smooth time-based rotation

    // Add subtle audio influence to rotation
    rotationAngle += energyZScore * 0.1;  // Very subtle audio influence

    // Create rotation matrix
    float c = cos(rotationAngle) + (bassZScore * 0.01);
    float s = sin(rotationAngle) + (bassZScore * 0.01);
    mat2 rotation = mat2(c, -s, s, c);

    // Apply rotation around center
    vec2 rotated = rotation * centered;
    vec2 final_uv = rotated + center;

    // Convert back to screen space for ray marching
    vec2 p = (final_uv * 2.0 - 1.0) * vec2(iResolution.x/iResolution.y, 1.0);

    // Get previous frame with gentler distortion
    vec2 distortedUV = getDistortedUV(final_uv);
    vec4 prevColor = getInitialFrameColor(fract(distortedUV));
    if(bassZScore > 0.5) {
        prevColor = getLastFrameColor(fract(distortedUV));
    }
    vec3 cl = vec3(0.0);
    float d = 2.5;
    vec3 normal = vec3(0.0);

    // Fixed light position - no movement
    vec3 lightPos = vec3(2.0, 2.0, -2.0);

    // Reduced ray steps
    for(int i=0; i<=3; i++) {  // Reduced from 5
        vec3 p3 = vec3(0.0,0.0,4.0) + normalize(vec3(p, -1.0))*d;
        float rz = map(p3);

        // Gentler normal calculation
        float eps = 0.02;  // Increased from 0.01
        normal = normalize(vec3(
            map(p3 + vec3(pitchClass,0,0)) - map(p3 - vec3(pitchClass,0,0)),
            map(p3 + vec3(0,pitchClass,0)) - map(p3 - vec3(0,pitchClass,0)),
            map(p3 + vec3(0,0,pitchClass)) - map(p3 - vec3(0,0,pitchClass))
        ));

        vec3 lightDir = normalize(lightPos - p3);
        vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
        vec3 reflectDir = reflect(-lightDir, normal);

        // Even gentler lighting
        float ambient = 0.5;  // Increased base light
        float diffuse = max(dot(normal, lightDir), 0.0);
        float specular = pow(max(dot(viewDir, reflectDir), 0.0), 4.0);  // Even softer specular

        // More stable base color with less audio influence
        vec3 baseColor = mix(
            vec3(0.4, 0.5, 0.6),  // Even more muted blue
            vec3(0.6, 0.45, 0.4),  // Even more muted red
            smoothstep(-1.0, 1.0, sin(d * 0.05 + spectralCentroidNormalized * 0.5))  // Slower transition, less audio
        );

        // Minimal normal influence
        baseColor += vec3(normal.x, normal.y, normal.z) * 0.01;  // Halved

        // Extremely subtle audio
        baseColor = mix(
            baseColor,
            vec3(spectralCentroidNormalized,
                 energyNormalized,
                 spectralRoughnessNormalized),
            0.005  // Halved again
        );

        // Super gentle lighting with less contrast
        vec3 lighting = vec3(ambient) +
                       clamp(diffuse, 0.0, 1.0) * vec3(0.8) +
                       clamp(specular, 0.0, 0.2) * vec3(0.05);
        lighting = clamp(lighting, vec3(0.2), vec3(1.05));  // Higher minimum, lower maximum

        vec3 color = baseColor * lighting;
        color = clamp(color, vec3(0.0), vec3(1.0));

        float fade = smoothstep(2.5, 0.0, rz);
        cl += color * fade * 0.1;  // Further reduced
        cl = clamp(cl, vec3(0.0), vec3(1.0));

        d += min(rz, 0.15);  // Even smaller steps
    }

    // Remove tone mapping - it's causing unnecessary color space conversion
    // cl = cl / (1.0 + cl);  // Remove this line

    // Convert to HSL once and preserve all components properly
    vec3 currentHSL = rgb2hsl(cl);
    vec3 prevHSL = rgb2hsl(prevColor.rgb);

    // Ensure hue is wrapped
    currentHSL.x = fract(currentHSL.x);
    prevHSL.x = fract(prevHSL.x);

    // Simpler palette with less extreme colors - in HSL space for easier blending
    vec3 palette[4] = vec3[4](
        vec3(fract(0.7), 0.8, 0.6),  // Soft purple in HSL
        vec3(fract(0.6), 0.7, 0.6),  // Soft blue in HSL
        vec3(fract(0.9), 0.7, 0.6),  // Soft pink in HSL
        vec3(fract(0.8), 0.7, 0.6)   // Soft violet in HSL
    );

    // Smoother color transitions without sharp changes
    float palettePos = fract(d * 0.5 +
                      sin(p.x * 1.0) * 0.1 +
                      t * 0.05 +
                      spectralCentroidNormalized);

    // Smoother interpolation between colors
    float smoothIndex = fract(palettePos);
    int index1 = int(floor(palettePos * 4.0)) % 4;
    int index2 = (index1 + 1) % 4;

    // Smooth mix between adjacent colors - staying in HSL space
    vec3 targetHSL = mix(
        palette[index1],
        palette[index2],
        smoothstep(0.0, 1.0, smoothIndex)
    );

    // Ensure target hue is wrapped
    targetHSL.x = fract(targetHSL.x);

    float audioIntensity = max(0.0, max(energyZScore, spectralCentroidZScore));
    // Preserve previous hue and saturation with smooth transitions
    float hueRate = 0.1 * (audioIntensity * 0.5);  // Slower during loud sounds
    float saturationRate = 0.05;  // Very slow saturation changes
    float brightnessRate = 0.15;  // Faster brightness changes

    vec3 finalHSL;
    // Wrap hue interpolation
    finalHSL.x = fract(mix(prevHSL.x, targetHSL.x, hueRate));  // Hue
    finalHSL.y = mix(prevHSL.y, 0.7, saturationRate);   // Keep saturation stable
    finalHSL.z = mix(prevHSL.z, targetHSL.z, brightnessRate);  // Brightness

    // Very subtle audio influence
    if(beat) {
        finalHSL.y = mix(finalHSL.y, 0.8, 0.05);  // Tiny saturation boost
        finalHSL.z = mix(finalHSL.z, 0.65, 0.05);  // Tiny brightness boost
    }

    // Apply gentle audio damping
    float damping = 1.0 - smoothstep(0.0, 1.0, audioIntensity);

    // Stabilize colors during loud sounds while preserving saturation
    vec3 stableHSL = vec3(fract(finalHSL.x), finalHSL.y, prevHSL.z);  // Keep current hue and saturation
    finalHSL = mix(finalHSL, stableHSL, damping * 0.1);  // Very gentle stabilization

    // Final wrap of hue
    if(finalHSL.y > 0.1) {
        finalHSL.x = fract(finalHSL.x + pitchClass);
    }

    // Clamp saturation and brightness
    finalHSL.y = clamp(finalHSL.y, 0.0, 1.0);
    finalHSL.z = clamp(finalHSL.z, 0.0, 1.0);
    finalHSL.z = fract(prevHSL.z );

    // Single conversion back to RGB with proper clamping
    vec3 finalColor = fract(hsl2rgb(finalHSL));

    fragColor = vec4(finalColor, 1.0);
}
