uniform float knob_71;

#define PROBE_A 0.13
#define PROBE_B spectralKurtosisMedian/spectralKurtosisMax / 10.
#define PROBE_C 0.04
#define t (time*0.2 + bassZScore*knob_71)

// Add the mainImage function declaration at the top
void mainImage(out vec4 fragColor, in vec2 fragCoord);

mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}

// Add ripple effect based on color difference
vec2 getRippleOffset(vec2 uv, vec4 lastFrame, vec4 currentColor) {
    vec3 lastHsl = rgb2hsl(lastFrame.rgb);
    vec3 currentHsl = rgb2hsl(currentColor.rgb);

    vec3 diff = abs(lastHsl.rgb - currentHsl.rgb);
    float colorDiff = (diff.x);

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
    float waveY = cos(uv.x*20.0 + t*bassZScore) * 0.005;

    if(beat || touched) {
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
    mat2 m = mat2(c,-s,s,c);
    vec3 q = vec3(m*p.xz,p.y);
    return q;
}

float map(vec3 p) {
    // Initial rotation
    p.xz *= m(t*0.2);
    p.xy *= m(t*0.15);

    // Add touch influence to the mapping
    if(touched) {
        float touchDist = length(p.xy - vec2(touchX*2.0-1.0, -(touchY*2.0-1.0)));
        p += vec3(sin(touchDist*10.0 + t - spectralRolloffZScore)) * 0.1;
    }

    // Recursive folding
    float scale = 1.0 + bassZScore * 0.5;
    float d = 1000.0;
    vec3 q = p;

    for(int i = 0; i < 3; i++) {
        q = twist(q);
        q = abs(q) - vec3(1.0, 1.0, 1.0) * (1.0 + energyNormalized * 0.2);
        q.xy *= m(t * 0.1 + float(i) * 0.5);
        q *= scale;
        float current = length(q) * pow(scale, float(-i));
        d = min(d, current);
    }

    vec3 modP = p*2.0 + vec3(t);
    float wave = sin(modP.x + sin(modP.z + sin(modP.y))) * 0.3;
    wave += sin(modP.y ) * 0.1;

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
    vec4 prevColor = getLastFrameColor(distortedUV);

    vec3 cl = vec3(0.0);
    float d = 2.5;

    for(int i=0; i<=5; i++) {
        vec3 p3 = vec3(0.0,0.0,4.0) + normalize(vec3(p, -1.0))*d;
        float rz = map(p3);
        float f = clamp((rz - map(p3+0.1))*0.5, -0.1, 1.0);

        vec3 l = vec3(0.1,0.3,0.4) +
                 vec3(3.0 + spectralCentroidNormalized,
                      2.0 + energyNormalized,
                      2.0 + spectralRoughnessNormalized) * f;

        cl = cl*l + smoothstep(2.5, 0.0, rz)*0.7*l;
        d += min(rz, 1.0);
    }

    // Color manipulation with HSL
    cl = rgb2hsl(cl);

    // Touch interaction
    if(touched) {
        float touchDist = length(p - vec2(touchX*2.0-1.0, -(touchY*2.0-1.0)));
        float touchInfluence = smoothstep(0.5, 0.0, touchDist);

        cl.x = mix(cl.x, fract(touchX + touchY + t*0.1), touchInfluence * 0.5);
        cl.y = mix(0.8,cl.y, touchInfluence * 0.3);
        cl.z = mix(cl.z, 0.6, touchInfluence * 0.2);
    }

    cl.x = fract(cl.x + (bassZScore - energyZScore) * 0.3);
    cl.y = clamp(cl.y + spectralRoughnessNormalized * 0.2, 0.0, 1.0);

    if(beat) {
        cl.y = clamp(cl.y * 1.2, 0.0, 1.0);
        cl.z = clamp(cl.z * 1.1, 0.0, 1.0);
    }

    // Convert back to RGB
    cl = hsl2rgb(cl);

    // Calculate ripple based on color difference
    vec2 rippleOffset = getRippleOffset(uv, prevColor, vec4(cl, 1.0));
    vec2 finalUV = fract(uv + rippleOffset);

    // Sample previous frame again with ripple offset
    vec4 rippleColor = getLastFrameColor(finalUV);


    // Stronger blend with previous frame - reduce the blend factor to see more of previous frame
    float blendFactor = PROBE_A; // Reduced from 0.8 to show more of previous frame
    // if(beat) blendFactor = 0.1; // More dramatic change on beats

    vec3 finalColor = rgb2hsl(hslmix(rippleColor.rgb, cl, blendFactor));

    vec3 hslPrevColor = rgb2hsl(prevColor.rgb);
    float hueDiff = abs(hslPrevColor.x - finalColor.x);
    float lightnessDiff = finalColor.z - hslPrevColor.z;
    if(lightnessDiff > abs(spectralKurtosisZScore / 4.)) {
        finalColor.x = fract(lightnessDiff + finalColor.x);
    }
    if( hslPrevColor.z > finalColor.z && fract(random(uv)) > 0.9) {
        vec3 p = finalColor;
        finalColor = hslPrevColor;
        hslPrevColor = p;
        finalColor.x = fract(hslPrevColor.x + hueDiff);
        // finalColor
    }

    finalColor.x = mix(hslPrevColor.x, finalColor.x, PROBE_C);
    finalColor = hsl2rgb(finalColor);
    // Add subtle motion trail
    finalColor = mix(finalColor, prevColor.rgb, hueDiff);

    fragColor = vec4(finalColor, 1.0);
}
