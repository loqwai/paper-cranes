// Ether by nimitz 2014 (twitter: @stormoid)
// https://www.shadertoy.com/view/MsjSW3
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
// Contact the author for other licensing options

// Essential Controls - must be before any code
uniform float knob_70;
uniform float knob_71;
uniform float knob_72;
uniform float knob_73;
uniform float knob_74;
uniform float knob_75;
uniform float knob_76;
uniform float knob_77;

// User-controlled parameters
#define COLOR_CYCLE_SPEED (knob_70 * 0.4)           // Speed of color cycling
#define COLOR_SHARPNESS (16.0)            // Sharpness of color transitions
               // How much colors blend together
#define SATURATION_LEVEL (knob_73 * 0.98)           // Base saturation
#define CONTRAST_LEVEL (knob_74 * 3.0)              // Overall contrast
#define DARKNESS_LEVEL (knob_75 * 0.7)              // How dark the dark areas get
#define RIPPLE_AMOUNT (knob_72)               // Strength of ripple effect
#define BEAT_INTENSITY (1.4)                        // How strong beat reactions are

// Fixed constants
#define t (iTime*0.2 + energyZScore*0.1)
#define PALETTE_DEPTH_INFLUENCE 2.0
#define PALETTE_POSITION_INFLUENCE knob_77
#define PALETTE_TIME_SPEED 0.2
#define SATURATION_BOOST 1.5
#define MAX_HUE_CHANGE knob_76    // Maximum hue change per frame (0.0 to 1.0)

// Add the mainImage function declaration at the top
void mainImage(out vec4 fragColor, in vec2 fragCoord);

mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}

// Add ripple effect based on color difference
vec2 getRippleOffset(vec2 uv, vec4 lastFrame, vec4 currentColor) {
    vec3 diff = abs(lastFrame.rgb - currentColor.rgb);
    float colorDiff = (diff.r + diff.g + diff.b) / 3.0;

    // Create ripple based on color difference, using RIPPLE_AMOUNT
    float rippleStrength = colorDiff * RIPPLE_AMOUNT * (1.0 + energyZScore);
    if(beat) rippleStrength *= 2.0;

    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float dist = length(uv - 0.5);

    return vec2(
        cos(angle + t) * rippleStrength * sin(dist * 10.0 + t),
        sin(angle + t) * rippleStrength * sin(dist * 10.0 + t)
    );
}

// Add distortion function similar to beat-trip
vec2 getDistortedUV(vec2 uv) {
    float waveX = sin(uv.y*20.0 + t*energyZScore) * 0.005;
    float waveY = cos(uv.x*20.0 + t*energyZScore) * 0.005;

    if(beat) {
        waveX *= 2.0;
        waveY *= 2.0;
    }

    return uv + vec2(waveX, waveY);
}

// Fractal transformation function
vec3 twist(vec3 p) {
    float k = sin(t*0.1) * 0.5 + 1.5;
    float c = cos(k*p.y);
    float s = sin(k*p.y);
    mat2 rotm = mat2(c,-s,s,c);  // Renamed to avoid conflict
    vec3 q = vec3(rotm*p.xz,p.y);
    return q;
}

float map(vec3 p) {
    // Initial rotation
    p.xz *= m(t*0.2);
    p.xy *= m(t*0.15);

    // Add touch influence to the mapping
    if(touched) {
        float touchDist = length(p.xy - vec2(touchX*2.0-1.0, touchY*2.0-1.0));
        p += vec3(sin(touchDist*10.0 + t)) * 0.1;
    }

    // Modified recursive folding for more varied patterns
    float scale = 1.0 + spectralCentroidNormalized * 0.5;
    float d = 1000.0;
    vec3 q = p;

    for(int i = 0; i < 3; i++) {
        q = twist(q);
        q = abs(q) - vec3(1.0, 1.0, 1.0) * (1.0 + energyNormalized * 0.2);
        q.xy *= m(t * 0.1 + float(i) * 0.5);
        q *= scale;
        float current = length(q) * pow(scale, float(-i));
        // Add some variation to break up uniform areas
        current += sin(q.x * 3.0 + q.y * 2.0) * 0.1;
        d = min(d, current);
    }

    vec3 modP = p*2.0 + vec3(t);
    float wave = sin(modP.x + sin(modP.z + sin(modP.y))) * 0.3;
    wave += sin(modP.y * spectralCentroidNormalized) * 0.1;
    // Add extra wave detail to break up flat areas
    wave += cos(modP.z * 3.0) * 0.05;

    return d * 0.5 + wave;
}

// Then implement mainImage with the exact same signature
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Fix coordinate system - flip x coordinate
    vec2 p = (vec2(iResolution.x - fragCoord.x, fragCoord.y) - 0.5*iResolution.xy)/iResolution.y;
    vec2 uv = fragCoord.xy/iResolution.xy;
    uv.x = 1.0 - uv.x; // Flip x coordinate for UV too

    // Get previous frame with distortion
    vec2 distortedUV = getDistortedUV(uv);
    vec4 prevColor = texture(prevFrame, fract(distortedUV));

    vec3 cl = vec3(0.0);
    float d = 2.5;
    vec3 normal = vec3(0.0);
    float occlusion = 0.0;

    // Light position
    vec3 lightPos = vec3(sin(t)*3.0, 2.0 + cos(t), -2.0);

    for(int i=0; i<=5; i++) {
        vec3 p3 = vec3(0.0,0.0,4.0) + normalize(vec3(p, -1.0))*d;
        float rz = map(p3);

        // Calculate normal for Phong shading
        float eps = 0.01;
        normal = normalize(vec3(
            map(p3 + vec3(eps,0,0)) - map(p3 - vec3(eps,0,0)),
            map(p3 + vec3(0,eps,0)) - map(p3 - vec3(0,eps,0)),
            map(p3 + vec3(0,0,eps)) - map(p3 - vec3(0,0,eps))
        ));

        vec3 lightDir = normalize(lightPos - p3);
        vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
        vec3 reflectDir = reflect(-lightDir, normal);

        // Phong shading components
        float ambient = 0.2;
        float diffuse = max(dot(normal, lightDir), 0.0);
        float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

        // Create a more interesting base color that changes with depth
        vec3 baseColor = mix(
            vec3(0.1, 0.4, 0.9),  // Vibrant blue
            vec3(0.9, 0.2, 0.1),  // Bright red
            sin(d * 0.5 + spectralCentroidNormalized * 2.0)
        );

        // Add some variation based on normal direction
        baseColor += vec3(normal.x, normal.y, normal.z) * 0.3;

        // Modulate with audio less to maintain color vibrancy
        baseColor = mix(
            baseColor,
            vec3(spectralCentroidNormalized,
                 energyNormalized,
                 spectralRoughnessNormalized),
            0.1  // Reduced audio influence
        );

        // Lighting calculation
        vec3 lighting = vec3(ambient) +
                       diffuse * vec3(1.0, 0.9, 0.8) +
                       specular * vec3(0.5);

        // Combine everything
        vec3 color = baseColor * lighting;

        // Accumulate color with depth
        float fade = smoothstep(2.5, 0.0, rz);
        cl += color * fade * 0.3;  // Reduced multiplication factor

        d += min(rz, 1.0);
    }

    // Tone mapping to prevent oversaturation
    cl = cl / (1.0 + cl);

    // More aggressive color manipulation
    cl = rgb2hsl(cl);

    // Force more distinct hues with HSL palette
    // Format: vec3(hue, saturation, lightness)
    vec3 palette[4] = vec3[4](
        vec3(fract(0.83 + spectralCentroidZScore/4.0), 0.98, 0.65),  // Electric purple
        vec3(fract(0.58 + spectralCentroidZScore/4.0), 0.95, 0.60),  // Electric blue
        vec3(fract(0.95 + spectralCentroidZScore/4.0), 0.98, 0.60),  // Hot pink
        vec3(fract(0.75 + spectralCentroidZScore/4.0), 0.95, 0.65)   // Deep violet
    );

    // Make transitions between colors sharper
    float palettePos = d * PALETTE_DEPTH_INFLUENCE +
                      sin(p.x * 4.0) * PALETTE_POSITION_INFLUENCE +
                      t * COLOR_CYCLE_SPEED +
                      spectralCentroidNormalized;
    float sharpness = COLOR_SHARPNESS;
    palettePos = floor(palettePos * sharpness) / sharpness;
    int paletteIndex = int(mod(palettePos, 4.0));
    vec3 targetHSL = palette[paletteIndex];

    // More aggressive color mixing with less blending
    float hueDiff = abs(targetHSL.x - cl.x);
    float hueChange = min(hueDiff, MAX_HUE_CHANGE);
    cl.x = mix(cl.x, targetHSL.x, sign(targetHSL.x - cl.x) * hueChange);
    cl.y = min(cl.y, targetHSL.y);
    cl.z = mix(cl.z, targetHSL.z, 0.8);

    // Ensure high saturation for neon effect
    cl.y = clamp(cl.y * SATURATION_BOOST + 0.3, SATURATION_LEVEL, 0.98);

    // Make darker areas much darker
    float contrast = CONTRAST_LEVEL;
    float saturationInfluence = cl.y * cl.y * DARKNESS_LEVEL;

    // Push more to dark based on saturation, but less aggressively
    cl.z = pow(cl.z, 1.0 + saturationInfluence * 0.5);

    // Apply contrast with saturation influence
    float contrastStrength = mix(1.0, contrast, saturationInfluence);
    cl.z = 0.5 + (cl.z - 0.5) * contrastStrength;

    // Less extreme dark threshold
    float darkThreshold = mix(0.25, 0.15, saturationInfluence);
    float brightThreshold = mix(0.6, 0.8, saturationInfluence);
    cl.z = smoothstep(darkThreshold, brightThreshold, cl.z);

    // Higher minimum brightness
    float minBrightness = mix(0.25, 0.1, saturationInfluence);
    float maxBrightness = mix(0.75, 0.9, saturationInfluence);
    cl.z = clamp(cl.z, minBrightness, maxBrightness);

    // Boost highlights more
    float highlightBoost = mix(1.2, 1.5, saturationInfluence);
    cl.z = mix(cl.z, cl.z * highlightBoost, step(0.5, cl.z));

    // Reduce position-based variation to keep colors more pure
    cl.x = fract(cl.x + p.x * 0.1 + p.y * 0.1);

    if(beat) {
        cl.y = 0.65;
        cl.z = clamp(cl.z * BEAT_INTENSITY, 0.05, 0.9);
        cl.z = mix(cl.z, cl.z * 1.3, 0.5);
    }

    // Reduce initial frame blending significantly
    vec3 finalColor = mix(prevColor.rgb, hsl2rgb(cl), 0.3);  // Increased from 0.1 for much faster changes

    // Calculate ripple based on color difference but reduce its influence
    vec2 rippleOffset = getRippleOffset(uv, prevColor, vec4(cl, 1.0));
    vec2 finalUV = fract(uv + rippleOffset);

    // Sample previous frame again with ripple offset
    vec4 rippleColor = texture(prevFrame, finalUV);

    // Get ripple direction and sample for spreading
    vec2 rippleDir = normalize(rippleOffset);
    float rippleStrength = length(rippleOffset);
    vec2 spreadUV = uv + rippleDir * (0.1 + rippleStrength * 1.0); // Reduced from 2.0
    vec3 hslPrevColor = rgb2hsl(getLastFrameColor(spreadUV).rgb);
    vec3 spreadColor = rgb2hsl(texture(prevFrame, fract(spreadUV)).rgb);

    // Convert to HSL for color operations
    finalColor = rgb2hsl(finalColor);

    // Touch interaction first (so it can spread)
    if(touched) {
        vec2 touchUV = vec2(touchX, touchY);
        float touchDist = length(uv - touchUV);

        float touchInfluence = smoothstep(0.05, 0.0, touchDist);
        if(bassZScore > 0.5) touchInfluence *= 1.5;
        touchInfluence = clamp(touchInfluence, 0.0, 1.0);

        float touchHue = fract(t * 0.2);
        float touchHueDiff = abs(touchHue - finalColor.x);
        finalColor.x = mix(finalColor.x, touchHue, sign(touchHue - finalColor.x) * touchHueDiff * touchInfluence);
        finalColor.y = mix(finalColor.y, 1.0, touchInfluence/2.0);
        finalColor.z = mix(finalColor.z, 0.7, touchInfluence/2.0);
    }

    // Greatly reduce color spreading
    float colorDiff = abs(hslPrevColor.x - spreadColor.x);
    float spreadFactor = smoothstep(0.05, 0.2, 1.0 - colorDiff) * rippleStrength * 0.05; // Reduced from 0.15
    if(beat) spreadFactor *= 1.1;

    // Minimal spread
    float spreadHueDiff = abs(spreadColor.x - finalColor.x);
    float spreadHueChange = min(spreadHueDiff, MAX_HUE_CHANGE);
    finalColor.x = mix(finalColor.x, spreadColor.x, sign(spreadColor.x - finalColor.x) * spreadHueChange * spreadFactor * 0.05);
    finalColor.y = mix(finalColor.y, spreadColor.y, spreadFactor * 0.1);  // Reduced from 0.5
    finalColor.z = mix(finalColor.z, spreadColor.z, spreadFactor * 0.1);  // Reduced from 0.5

    // Convert back to RGB for final output
    finalColor = hsl2rgb(finalColor);
    fragColor = vec4(finalColor, 1.0);
}
