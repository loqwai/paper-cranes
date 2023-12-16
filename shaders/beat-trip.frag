#version 300 es
precision mediump float;

uniform bool beat;
uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel1; // Image texture
uniform float spectralSpreadZScore;
uniform float spectralCentroidZScore;
uniform float energyZScore;
out vec4 fragColor;

vec4 getLastFrameColor(vec2 uv) {
    return texture(iChannel1, vec2(uv.x, iResolution.y - uv.y) / iResolution.xy);
}

// Function to convert RGB to HSL
vec3 rgb2hsl(vec3 color) {
    float maxColor = max(max(color.r, color.g), color.b);
    float minColor = min(min(color.r, color.g), color.b);
    float delta = maxColor - minColor;

    float h = 0.0f;
    float s = 0.0f;
    float l = (maxColor + minColor) / 2.0f;

    if(delta != 0.0f) {
        s = l < 0.5f ? delta / (maxColor + minColor) : delta / (2.0f - maxColor - minColor);

        if(color.r == maxColor) {
            h = (color.g - color.b) / delta + (color.g < color.b ? 6.0f : 0.0f);
        } else if(color.g == maxColor) {
            h = (color.b - color.r) / delta + 2.0f;
        } else {
            h = (color.r - color.g) / delta + 4.0f;
        }
        h /= 6.0f;
    }

    return vec3(h, s, l);
}

// Helper function for HSL to RGB conversion
float hue2rgb(float p, float q, float t) {
    if(t < 0.0f)
        t += 1.0f;
    if(t > 1.0f)
        t -= 1.0f;
    if(t < 1.0f / 6.0f)
        return p + (q - p) * 6.0f * t;
    if(t < 1.0f / 2.0f)
        return q;
    if(t < 2.0f / 3.0f)
        return p + (q - p) * (2.0f / 3.0f - t) * 6.0f;
    return p;
}

// Function to convert HSL to RGB
vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;

    float r, g, b;

    if(s == 0.0f) {
        r = g = b = l; // achromatic
    } else {
        float q = l < 0.5f ? l * (1.0f + s) : l + s - l * s;
        float p = 2.0f * l - q;
        r = hue2rgb(p, q, h + 1.0f / 3.0f);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1.0f / 3.0f);
    }

    return vec3(r, g, b);
}

float getGrayPercent(vec4 color) {
    return (color.r + color.g + color.b) / 3.0f;
}
// Function to apply a dynamic and beat-reactive distortion effect
vec4 applyDistortion(vec2 uv, float time, bool beat) {
    // Modify the hue rotation based on various factors
    float hueOffset = sin(uv.x * 10.0f + uv.y * 10.0f) * 0.5f;
    // float hueVariation = sin(time * spectralSpreadZScore) + cos(time * spectralCentroidZScore);

    // Beat-reactive hue rotation speed
    float hueRotationSpeed = beat ? 0.5f : 0.1f;

    // Apply distortion
    float waveX = sin(uv.y * 20.0f + time * energyZScore) * 0.005f;
    float waveY = cos(uv.x * 20.0f + time * energyZScore) * 0.005f;
    if(beat) {
        waveX *= 5.0f;
        waveY *= 5.0f;
    }
    vec2 distortedUv = uv + vec2(waveX, waveY);
    distortedUv = fract(distortedUv);

    // Sample the texture with distorted coordinates
    vec4 originalColor = texture(iChannel1, distortedUv);
    float grayPercent = getGrayPercent(originalColor);
    // the gray threshold is a function of time, and is beat-reactive. varies between 0.1 and 0.8
    float grayThreshold = 1. - (energyZScore + 3.)/3.;
    if(grayPercent > grayThreshold) {
      // get the originalColor by the inverted distortion uv
      // and modulated by the sin of time
        // originalColor = texture(iChannel1, vec2(sin(time) - distortedUv.x, cos(time) - distortedUv.y));
        vec4 colorToMixIn = beat ? vec4(1.0f, 0.0f, 0.0f, .02f) : vec4(0.0f, 0.0f, 1.0f, 0.02f);
        originalColor = mix(originalColor, colorToMixIn, 0.1f);
    }
    vec3 hslColor = rgb2hsl(originalColor.rgb);
    //if the spectralSpreadZScore is greater than 0.5, make things greener
    //if the spectralCentroidZScore is greater than 0.5, make things redder
    if(spectralCentroidZScore > 2.5f) {
        hslColor.x += 0.1f;
    }
    if(spectralSpreadZScore > 2.5f) {
        hslColor.x -= 0.1f;
    }
    hslColor.x += hueOffset + hueRotationSpeed * time; // Rotate the hue
    // if there's a beat, make things more saturated
    hslColor.x = fract(hslColor.x); // Ensure hue stays in the [0, 1] range

    vec3 rgbColor = hsl2rgb(hslColor);
    return vec4(rgbColor, 1.0f);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;

    // Apply the beat-reactive distortion and color effect
    fragColor = applyDistortion(uv, iTime, beat);
}

void main(void) {
    vec4 color = vec4(0.0f, 0.0f, 0.0f, 1.0f);
    mainImage(color, gl_FragCoord.xy);
    fragColor = color;
}
