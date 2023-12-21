#version 300 es

precision highp float;
out vec4 fragColor;

uniform sampler2D iChannel0; // Audio data texture
uniform sampler2D iChannel1; // Silhouette texture (previous frame data)

uniform vec3 iResolution;
uniform float iTime;

uniform float energy;
uniform float energyMin;
uniform float energyMax;
uniform float energyZScore;

// spectralFlatness
uniform float spectralFlatness;
uniform float spectralFlatnessMin;
uniform float spectralFlatnessMax;
uniform float spectralFlatnessZScore;

// spectralCentroid
uniform float spectralCentroid;
uniform float spectralCentroidMin;
uniform float spectralCentroidMax;
uniform float spectralCentroidZScore;

// spectralSkewness
uniform float spectralSkewness;
uniform float spectralSkewnessMin;
uniform float spectralSkewnessMax;
uniform float spectralSkewnessZScore;

// spectralRolloff
uniform float spectralRolloff;
uniform float spectralRolloffMin;
uniform float spectralRolloffMax;
uniform float spectralRolloffZScore;

//spectralSlope
uniform float spectralSlope;
uniform float spectralSlopeMin;
uniform float spectralSlopeMax;
uniform float spectralSlopeZScore;


// Function to render a colored bar based on a single uniform value and bar number
vec3 renderBar(float uniformValue, float uniformMin, float uniformMax, float uniformZScore, int barNumber, vec2 fragCoord)
{
    // Define the bar width and gap between bars
    float barWidth = 0.1; // Adjust the width as needed
    float barGap = 0.05;  // Adjust the gap as needed

    // Calculate the bar's start and end positions based on barNumber
    float barStart = float(barNumber) * (barWidth + barGap);
    float barEnd = barStart + barWidth;

    // Check if the current fragment is within the bar's bounds
    if (fragCoord.x >= (barStart * iResolution.x) && fragCoord.x <= (barEnd * iResolution.x)) {
        // Normalize the uniformValue between uniformMin and uniformMax
        float normalizedValue = (uniformValue - uniformMin) / (uniformMax - uniformMin);
        // Make the bar taller or shorter based on the normalized value
        float barHeight = normalizedValue * iResolution.y;
        // Check if the current fragment is within the bar's height
        if (fragCoord.y <= barHeight) {
            // Calculate the redness based on the uniformZScore
            float redness = clamp(uniformZScore / 5.0, 0.0, 1.0);
            // Set the color of the bar with varying redness
            return vec3(1.0 - redness, 1.0 - redness, 1.0); // Redder as ZScore goes from 0 to 5
        } else {
            // Set the background color
            return vec3(0.0, 0.0, 0.0);
        }
    } else {
        // Set the background color
        return vec3(0.0, 0.0, 0.0);
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Get the color of the previous frame from iChannel1
    vec4 previousFrameColor = texture(iChannel1, fragCoord / iResolution.xy);

    // energy
    vec3 color1 = renderBar(energy, energyMin, energyMax, energyZScore,  0, fragCoord);
    // spectralFlatness
    vec3 color2 = renderBar(spectralFlatness, spectralFlatnessMin, spectralFlatnessMax, spectralFlatnessZScore, 1, fragCoord);
    // spectralCentroid
    vec3 color3 = renderBar(spectralCentroid, spectralCentroidMin, spectralCentroidMax, spectralCentroidZScore, 2, fragCoord);
    // spectralSkewness
    vec3 color4 = renderBar(spectralSkewness, spectralSkewnessMin, spectralSkewnessMax, spectralSkewnessZScore, 3, fragCoord);
    // spectralRolloff
    vec3 color5 = renderBar(spectralRolloff, spectralRolloffMin, spectralRolloffMax, spectralRolloffZScore, 4, fragCoord);
    // spectralSlope
    vec3 color6 = renderBar(spectralSlope, spectralSlopeMin, spectralSlopeMax, spectralSlopeZScore, 5, fragCoord);


    // Combine the colors of the bars with the previous frame's color
    vec3 finalColor = color1 + color2 + color3 + color4 + color5 + color6;
    //
    // Darken the previous frame's color by multiplying it with a value less than 1
    finalColor = mix(previousFrameColor.rgb, finalColor, 0.01); // Adjust the 0.95 value to control the darkening rate

    // Set the output color
    fragColor = vec4(finalColor, 1.0);
}

void main(void) {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0); // Black color with alpha 1.0
    mainImage(color, gl_FragCoord.xy);
    fragColor = color;
}
