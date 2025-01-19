// Ether by nimitz 2014 (twitter: @stormoid)
// https://www.shadertoy.com/view/MsjSW3
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
// Contact the author for other licensing options

#define t (iTime*0.2 + energyZScore*0.1)

// Add the mainImage function declaration at the top
void mainImage(out vec4 fragColor, in vec2 fragCoord);

mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}

// Add ripple effect based on color difference
vec2 getRippleOffset(vec2 uv, vec4 lastFrame, vec4 currentColor) {
    vec3 diff = abs(lastFrame.rgb - currentColor.rgb);
    float colorDiff = (diff.r + diff.g + diff.b) / 3.0;

    // Create ripple based on color difference
    float rippleStrength = colorDiff * 0.1 * (1.0 + energyZScore);
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
            vec3(0.2, 0.4, 0.7),  // Deep blue
            vec3(0.7, 0.3, 0.2),  // Warm orange
            sin(d * 0.5 + spectralCentroidNormalized) * 0.5 + 0.5
        );

        // Add some variation based on normal direction
        baseColor += vec3(normal.x, normal.y, normal.z) * 0.2;

        // Modulate with audio
        baseColor = mix(
            baseColor,
            vec3(spectralCentroidNormalized,
                 energyNormalized,
                 spectralRoughnessNormalized),
            0.2
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

    // Color manipulation with HSL
    cl = rgb2hsl(cl);

    // Adjust saturation and brightness
    cl.y = clamp(cl.y, 0.2, 0.8);  // Less saturated
    cl.z = clamp(cl.z, 0.1, 0.7);  // Darker overall

    vec3 finalColor = mix(prevColor.rgb, cl, 0.03);

    // Calculate ripple based on color difference
    vec2 rippleOffset = getRippleOffset(uv, prevColor, vec4(cl, 1.0));
    vec2 finalUV = fract(uv + rippleOffset);

    // Sample previous frame again with ripple offset
    vec4 rippleColor = texture(prevFrame, finalUV);

    // Get ripple direction and sample for spreading
    vec2 rippleDir = normalize(rippleOffset);
    float rippleStrength = length(rippleOffset);
    vec2 spreadUV = uv + rippleDir * (0.1 + rippleStrength * 2.0);
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
        finalColor.x = mix(finalColor.x, touchHue, touchInfluence);
        finalColor.y = mix(finalColor.y, 1.0, touchInfluence);
        finalColor.z = mix(finalColor.z, 0.7, touchInfluence);
    }

    // Slower, more subtle color spreading
    float colorDiff = abs(hslPrevColor.x - spreadColor.x);
    float spreadFactor = smoothstep(0.05, 0.2, colorDiff) * rippleStrength * 0.3;
    if(beat) spreadFactor *= 1.2;

    // Very gentle spread of hue
    finalColor.x = mix(finalColor.x, spreadColor.x, spreadFactor * 0.2);
    // Subtle spread of saturation and lightness
    finalColor.y = mix(finalColor.y, spreadColor.y, spreadFactor * 0.1);
    finalColor.z = mix(finalColor.z, spreadColor.z, spreadFactor * 0.05);

    // Convert back to RGB for final output
    finalColor = hsl2rgb(finalColor);
    fragColor = vec4(finalColor, 1.0);
}
