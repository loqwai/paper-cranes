//http://localhost:6969/edit.html?image=images%5Crezz-full-lips-cropped.png
#define BACKGROUND_OFFSET_X 0.5
#define BACKGROUND_OFFSET_Y 0.5

#define BACKGROUND_ZOOM_X (spectralSpreadNormalized * 0.8 + 0.6) // Reacts to spectral spread (0.6-1.4)
#define BACKGROUND_ZOOM_Y (spectralEntropyNormalized * 0.8 + 0.6) // Reacts to spectral entropy (0.6-1.4)
// Probe definitions for parametric control
#define PROBE_A (spectralFluxNormalized)     // Controls overall spiral density based on spectral flux
#define PROBE_B (spectralCentroidNormalized * 1.5 + 0.5)     // Controls spiral rotation speed based on spectral centroid (0.5-2.0)
#define PROBE_C (spectralRoughnessNormalized)     // Controls fractal influence based on spectral roughness
#define PROBE_D (energyNormalized * 0.5 + 0.7)     // Controls color intensity based on energy (0.7-1.2)
#define PROBE_E (mapValue(trebleNormalized, 0.0, 1.0, -0.7, 1.0)) // Controls spiral thickness based on treble (-0.7-1.0)
#define PROBE_F (energyZScore/6.+.9)     // Controls overall scale/zoom based on energy spikes
#define PROBE_G (mapValue(spectralRoughnessNormalized, 0., 1.,-2.36,0.52))     // Controls the balance between spiral and fractal based on roughness

// Spiral position controls
#define EYE_DISTANCE (spectralCrest * 0.6 + 0.25)   // Controls horizontal distance between spirals (0.25-0.85) based on spectral crest
#define EYE_Y_OFFSET (spectralFluxNormalized * 0.2 - 0.1)    // Controls vertical position based on spectral flux (-0.1-0.1)
#define LEFT_X_ADJUST (spectralCrestNormalized * 0.1)        // Fine adjustment of left spiral X based on normalized crest
#define RIGHT_X_ADJUST (midsNormalized * 0.1)       // Fine adjustment of right spiral X based on mids
#define SPIRAL_DENSITY (mapValue(bassNormalized, 0.0, 1.0, 4.0, 12.0)) // Controls spiral density/tightness based on bass (4.0-12.0)
#define SPIRAL_ITERATIONS (mapValue(spectralSkewNormalized, 0.0, 1.0, 3.0, 8.0)) // Controls number of spiral iterations based on skewness (3.0-8.0)

// Function to apply Julia set distortion
vec2 julia(vec2 uv, float t){
    float cRe = sin(t) * 0.7885;
    float cIm = cos(t) * 0.7885;

    // Scale iterations for mobile performance
    int maxIter = 32;
    for(int i=0; i<maxIter; i++){
        float x = uv.x*uv.x - uv.y*uv.y + cRe;
        float y = 2.0*uv.x*uv.y + cIm;
        uv.x = x;
        uv.y = y;
        if(length(uv) > 2.0) break;
    }
    return uv;
}

// Main image function
void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // Scale UV based on PROBE_F for overall zoom control
    float zoom = mix(0.8, 1.5, PROBE_F);
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / (iResolution.y * zoom);
    vec2 sampleUv = uv;
    vec2 sampleZoom = vec2(BACKGROUND_ZOOM_X, BACKGROUND_ZOOM_Y);
    vec2 sampleOffset = vec2(BACKGROUND_OFFSET_X, BACKGROUND_OFFSET_Y);
    // Apply zoom before offset to center the effect
    sampleUv = sampleUv * sampleZoom + sampleOffset;
    sampleUv = fract(sampleUv);
    vec3 init = getInitialFrameColor(sampleUv).rgb;
    float t = time * 0.1;

    vec2 pixelSize = 1.0 / iResolution.xy;


    // Apply Julia set distortion to create fractal background
    vec2 distortedUv = julia(uv * (0.8 + PROBE_C * 0.4), t);

    // Create texture distortion based on fractal
    float distortionStrength = mix(0.05, 0.2, PROBE_C); // Control warp intensity with fractal influence
    vec2 warpedSampleUv = sampleUv;

    // Generate distortion vectors from fractal pattern
    float fractalNoise = length(distortedUv) * 2.0;
    vec2 distortOffset = vec2(
        sin(fractalNoise * 5.0 + t * 2.0) * distortionStrength,
        cos(fractalNoise * 4.0 - t * 1.5) * distortionStrength
    );

    // Apply distortion with variation based on bass
    warpedSampleUv -= distortOffset;

    // Sample the initial image with distortion
    vec3 warpedInit = getInitialFrameColor(warpedSampleUv).rgb;

    // Apply additional sampling for distorted areas
    vec2 secondaryWarp = warpedSampleUv + distortOffset * 0.5;
    vec3 secondaryInit = getInitialFrameColor(secondaryWarp).rgb;

    // Blend multiple samples for interesting effect
    vec3 distortedTexture = mix(warpedInit, secondaryInit, fractalNoise * 0.3);

    // Enhance red channel in texture to match theme
    distortedTexture.r = mix(distortedTexture.r, distortedTexture.r * 1.3, 0.6);
    distortedTexture.gb *= mix(0.7, 0.9, PROBE_D);

    // Get previous frame color for background effects
    vec3 prevColor = getLastFrameColor(distortedUv).rgb;

    // Create base fractal color with dark red/maroon theme
    vec3 darkRed = vec3(0.5, 0.0, 0.0);
    vec3 maroon = vec3(0.4, 0.0, 0.1);
    vec3 blackRed = vec3(0.2, 0.0, 0.0);

    // Position-based color variation with texture influence
    float posFactor = fract(length(distortedUv) * 1.5 + t * 0.5);
    vec3 baseColor = mix(blackRed, maroon, posFactor);
    baseColor = mix(baseColor, darkRed, sin(atan(distortedUv.y, distortedUv.x) * 3.0) * 0.5 + 0.5);

    // Blend fractal color with distorted texture
    baseColor = mix(baseColor, distortedTexture, 0.8);

    // Apply color intensity from PROBE_D
    float colorIntensity = mix(0.7, 1.2, PROBE_D);
    baseColor *= colorIntensity;

    // Mix with previous frame for temporal stability
    vec3 fractalColor = mix(prevColor, baseColor, 0.4);

    // Create two spirals for Rezz goggles with position controls

    // Left eye coordinates with position adjustments
    vec2 leftEyeUv = uv + vec2(EYE_DISTANCE + LEFT_X_ADJUST, EYE_Y_OFFSET);
    float leftAngle = atan(leftEyeUv.y, leftEyeUv.x);
    float leftRadius = length(leftEyeUv);

    // Right eye coordinates with position adjustments
    vec2 rightEyeUv = uv - vec2(EYE_DISTANCE - RIGHT_X_ADJUST, -EYE_Y_OFFSET);
    float rightAngle = atan(rightEyeUv.y, rightEyeUv.x);
    float rightRadius = length(rightEyeUv);

    // Calculate fractal influence on both spirals
    vec2 leftFractalUv = julia(leftEyeUv * (0.8 + PROBE_C * 0.4), t);
    vec2 rightFractalUv = julia(rightEyeUv * (0.8 + PROBE_C * 0.4), t);
    float leftFractalInfluence = length(leftFractalUv) * PROBE_C * 0.5;
    float rightFractalInfluence = length(rightFractalUv) * PROBE_C * 0.5;

    // Create spirals with parametric controls
    float spiralDensity = SPIRAL_DENSITY; // Tighter, more hypnotic spirals
    float spiralSpeed = mix(0.5, 2.0, PROBE_B);
    float spiralThickness = mix(0.1, 0.3, PROBE_E); // Slightly thinner for more hypnotic look

    // Apply fractal warping to spirals
    float warpAmount = mix(0.0, 0.3, PROBE_C);

    // Create Rezz-style red color with variation
    vec3 redColor = mix(
        vec3(1.0, 0.0, 0.0), // Pure red
        vec3(1.0, 0.2, 0.2), // Lighter red
        PROBE_D * 0.3
    );


    // Mix spiral with fractal background based on PROBE_G
    float mixRatio = mix(0.1, 0.9, PROBE_G);
    vec3 color = fractalColor;


    color = mix(color, distortedTexture, 0.7);

    fragColor = vec4(color, 1.0);
}
