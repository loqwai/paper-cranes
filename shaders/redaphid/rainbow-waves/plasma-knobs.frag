// http://localhost:6969/edit.html?knob_14=0&knob_14.min=0&knob_14.max=1.4&knob_15=19&knob_15.min=0&knob_15.max=19&knob_16=0.764&knob_16.min=0&knob_16.max=1&knob_17=0&knob_17.min=0&knob_17.max=1&knob_18=34.646&knob_18.min=0&knob_18.max=100&knob_20=1&knob_20.min=0&knob_20.max=1&knob_19=0.488&knob_19.min=0&knob_19.max=1&knob_3=0.299&knob_3.min=0&knob_3.max=1&knob_4=0.724&knob_4.min=0&knob_4.max=1&knob_5=0.646&knob_5.min=-1.5&knob_5.max=1&knob_22=0.496&knob_22.min=0&knob_22.max=1&knob_11=0.441&knob_11.min=0&knob_11.max=1&knob_10=30.709&knob_10.min=0&knob_10.max=100&knob_21=0.11&knob_21.min=0&knob_21.max=1&knob_6=0.331&knob_6.min=0&knob_6.max=1&knob_7=0.142&knob_7.min=0&knob_7.max=1&knob_8=0&knob_8.min=0&knob_8.max=1&knob_9=0.299&knob_9.min=0&knob_9.max=1&knob_60=0.669&knob_60.min=0&knob_60.max=0.6&knob_72=1.95&knob_72.min=0&knob_72.max=2.5&knob_71=0.72&knob_71.min=0&knob_71.max=0.8&knob_73=1.5&knob_73.min=-1.6&knob_73.max=1.5&knob_74=1.025&knob_74.min=1&knob_74.max=1.1&knob_75=0.41&knob_75.min=0&knob_75.max=1&knob_76=0.66&knob_76.min=0&knob_76.max=1&knob_77=1&knob_77.min=0&knob_77.max=1&knob_79=5.5&knob_79.min=0&knob_79.max=10&knob_78=0.11&knob_78.min=0&knob_78.max=1
#define TIME (iTime/knob_74)
#define ROTATION_SPEED_X (0.2)
#define ROTATION_SPEED_Y (0.2)
#define PLASMA_SCALE (1.5 + knob_73)
#define PLASMA_DETAIL (0.5 + knob_14 * 1.5)
#define WAVE_INTENSITY (0.5 + knob_15 * 2.0)
#define COLOR_MIX_FACTOR (0.3 + knob_76 * 0.7)
#define COLOR_INTENSITY (0.3 + knob_20 * 0.7)
#define COLOR_SHIFT_SPEED (0.5 + knob_71 * 1.5)
#define SATURATION_BASE (0.7 + knob_72)
#define LIGHTNESS_FACTOR (0.2 + knob_79 * 0.6)

uniform float knob_74;
uniform float knob_71;
uniform float knob_72;
uniform float knob_73;
uniform float knob_14;
uniform float knob_15;
uniform float knob_76;
uniform float knob_20;
uniform float knob_21;
uniform float knob_22;
uniform float knob_79;


uniform float knob_77;
uniform float knob_78;

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

    float hueShift = knob_78 * COLOR_SHIFT_SPEED;
    float saturationMod = mix(SATURATION_BASE, 1.0, knob_74);
    float lightnessMod = mix(LIGHTNESS_FACTOR, 1.0, knob_77);

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
