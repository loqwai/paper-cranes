// MAKE SURE TO NAME PUT YOUR SHADER IN "shaders/<YOUR_GITHUB_USERNAME>"
// and make sure the filename ends in .frag
// for example, if your username is "hypnodroid", and you want to publish "my-shader.frag", the filename should be "hypnodroid/my-shader.frag"
// http://visuals.beadfamous.com/edit.html?knob_1=1.025&knob_1.min=1&knob_1.max=1.1&knob_2=0.72&knob_2.min=0&knob_2.max=0.8&knob_3=1.95&knob_3.min=0&knob_3.max=2.5&knob_4=1.5&knob_4.min=-1.6&knob_4.max=1.5&knob_5=0&knob_5.min=0&knob_5.max=1.4&knob_6=19&knob_6.min=0&knob_6.max=19&knob_7=0.66&knob_7.min=0&knob_7.max=1&knob_8=1&knob_8.min=0&knob_8.max=1&knob_9=0.11&knob_9.min=0&knob_9.max=1&knob_10=0.496&knob_10.min=0&knob_10.max=1&knob_11=5.5&knob_11.min=0&knob_11.max=10&knob_12=1&knob_12.min=0&knob_12.max=1&knob_13=0.11&knob_13.min=0&knob_13.max=1

// Semantic aliases for knobs
#define TIME_SCALE knob_1
#define COLOR_SHIFT_SPEED_MULT knob_2
#define SATURATION_BASE_VALUE knob_3
#define PLASMA_SCALE_OFFSET knob_4
#define PLASMA_DETAIL_AMOUNT knob_5
#define WAVE_INTENSITY_VALUE knob_6
#define COLOR_MIX_FACTOR_VALUE knob_7
#define COLOR_INTENSITY_VALUE knob_8
#define UNUSED_KNOB_9 knob_9
#define UNUSED_KNOB_10 knob_10
#define LIGHTNESS_FACTOR_VALUE knob_11
#define LIGHTNESS_MOD_BLEND knob_12
#define HUE_SHIFT_AMOUNT knob_13

#define TIME (iTime/TIME_SCALE)
#define ROTATION_SPEED_X (0.2)
#define ROTATION_SPEED_Y (0.2)
#define PLASMA_SCALE (1.5 + PLASMA_SCALE_OFFSET)
#define PLASMA_DETAIL (0.5 + PLASMA_DETAIL_AMOUNT * 1.5)
#define WAVE_INTENSITY (0.5 + WAVE_INTENSITY_VALUE * 2.0)
#define COLOR_MIX_FACTOR (0.3 + COLOR_MIX_FACTOR_VALUE * 0.7)
#define COLOR_INTENSITY (0.3 + COLOR_INTENSITY_VALUE * 0.7)
#define COLOR_SHIFT_SPEED (0.5 + COLOR_SHIFT_SPEED_MULT * 1.5)
#define SATURATION_BASE (0.7 + SATURATION_BASE_VALUE)
#define LIGHTNESS_FACTOR (0.2 + LIGHTNESS_FACTOR_VALUE * 0.6)

mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}

vec2 getWaveDistortion(vec2 p) {
    float distortionX = sin(p.y * PLASMA_SCALE + TIME * ROTATION_SPEED_X) * WAVE_INTENSITY * 0.01;
    float distortionY = cos(p.x * PLASMA_SCALE + TIME * ROTATION_SPEED_Y) * WAVE_INTENSITY * 0.01;
    return vec2(distortionX, distortionY);
}

float map(vec3 p){
    vec2 distortion = getWaveDistortion(p.xy);
    p.xy += distortion;

    p.xz *= m(TIME * ROTATION_SPEED_X);
    p.xy *= m(TIME * ROTATION_SPEED_Y);
    vec3 q = p * PLASMA_SCALE + TIME;

    float plasma = length(p + vec3(sin(TIME * 0.7))) * log(length(p) + PLASMA_DETAIL);
    float waves = sin(q.x + sin(q.z + sin(q.y))) * 0.5;

    return plasma + waves - 1.0;
}

vec3 getBaseColor(float f, float plasma) {
    // Create complementary color palette based on golden ratio
    float phi = 1.618033988749895;
    float hueOffset = fract(TIME * 0.1); // Slow rotation of entire palette

    // Create 5 complementary colors using golden ratio
    vec3 colors[5];
    for(int i = 0; i < 5; i++) {
        float hue = fract(hueOffset + float(i) * phi);
        colors[i] = vec3(hue, 0.8 + float(i) * 0.04, 0.5 + float(i) * 0.1);
    }

    // Use plasma value to create smooth transitions between colors
    float t = fract(f * 0.5 + plasma * 0.2 + TIME * 0.1);
    int idx1 = int(t * 4.0);
    int idx2 = (idx1 + 1) % 5;
    float blend = fract(t * 4.0);

    // Smooth interpolation in HSL space
    vec3 color = mix(colors[idx1], colors[idx2], smoothstep(0.0, 1.0, blend));

    // Adjust saturation and lightness based on plasma value
    color.y = mix(0.7, 1.0, plasma); // Higher saturation in plasma centers
    color.z = mix(0.3, 0.6, plasma); // Brighter in plasma centers

    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = fragCoord.xy/iResolution.y - vec2(.6,.5);
    vec3 cl = vec3(0.);
    float d = 2.5;

    vec2 uv = fragCoord.xy/iResolution.xy;
    vec4 prevColor = getLastFrameColor(uv);
    vec3 prevHSL = rgb2hsl(prevColor.rgb);

    float totalGlow = 0.0;
    float plasmaValue = 0.0;

    for(int i=0; i<=5; i++) {
        vec3 p = vec3(0,0,5.) + normalize(vec3(p, -1.)) * d;
        float rz = map(p);
        float f = clamp((rz - map(p+.1)) * COLOR_MIX_FACTOR, -.1, 1.);

        // Calculate plasma intensity for this iteration
        plasmaValue = max(plasmaValue, smoothstep(1.0, -1.0, rz));

        // Get color in HSL space based on plasma shape
        vec3 baseColorHSL = getBaseColor(f, plasmaValue);
        vec3 baseColor = hsl2rgb(baseColorHSL);

        // Softer intensity scaling
        vec3 l = baseColor * (1.0 + f * COLOR_INTENSITY);

        float glow = smoothstep(2.5, 0.2, rz); // Adjusted glow falloff
        totalGlow += glow;

        // Softer color accumulation
        cl = mix(cl * l, l, glow * 0.7);
        d += min(rz, 1.);
    }

    totalGlow = clamp(totalGlow / 5.0, 0.0, 1.0);

    // Convert to HSL for final adjustments
    cl = rgb2hsl(cl);

    float hueShift = HUE_SHIFT_AMOUNT * COLOR_SHIFT_SPEED;
    float saturationMod = mix(SATURATION_BASE, 1.0, TIME_SCALE);
    float lightnessMod = mix(LIGHTNESS_FACTOR, 1.0, LIGHTNESS_MOD_BLEND);

    // Preserve color contouring while preventing oversaturation
    cl.x = fract(cl.x + hueShift);
    cl.y = clamp(cl.y * saturationMod, 0.5, 0.9); // Reduced max saturation
    cl.z = clamp(pow(cl.z * lightnessMod * totalGlow, 1.2), 0.0, 0.8); // Reduced max brightness

    float blendFactor = 0.25;

    if(totalGlow > 0.1) {
        cl = vec3(
            fract(mix(prevHSL.x, cl.x, blendFactor)),
            mix(prevHSL.y, cl.y, blendFactor),
            mix(prevHSL.z, cl.z, blendFactor)
        );
    }

    // More aggressive darkness in low plasma areas
    if(totalGlow < 0.2) {
        cl.z *= pow(totalGlow * 4.0, 2.0);
    }

    vec3 finalColor = hsl2rgb(cl);

    // Softer vignette
    float vignette = smoothstep(1.2, 0.4, length(p));
    finalColor *= vignette;

    // Final contrast adjustment without pushing whites too far
    finalColor = pow(finalColor, vec3(0.95));
    finalColor = clamp(finalColor, 0.0, 0.95); // Prevent full white

    fragColor = vec4(finalColor, 1.0);
}
