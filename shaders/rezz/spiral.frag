// Updated shader with Rezz-inspired red/black spiral motif
// -------------------------------------------------------

// Probe definitions for parametric control
#define PROBE_A (spectralKurtosisNormalized)     // Controls overall spiral density (0 = sparse, 1 = dense)
#define PROBE_B (0.01)     // Controls spiral rotation speed
#define PROBE_C (spectralRoughnessNormalized/2.)     // Controls fractal influence on spiral (0 = rigid, 1 = very warped)
#define PROBE_D (bassZScore)     // Controls color intensity and variation
#define PROBE_E (bassZScore/2.)     // Controls spiral thickness
#define PROBE_F (energyZScore/30.)     // Controls overall scale/zoom
#define PROBE_G (spectralRoughnessZScore/10.)     // Controls the balance between spiral and fractal


// Function to apply Julia set distortion
vec2 julia(vec2 uv, float t){
    float cRe = sin(t) * 0.7885;
    float cIm = cos(t) * 0.7885;

    // Scale iterations for mobile performance
    int maxIter = 16;
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
    float zoom = mix(0.8, 1.5, PROBE_F + pow(time,0.1));
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / (iResolution.y * zoom);
    float t = time * 0.1;

    vec2 pixelSize = 1.0 / iResolution.xy;


    // Apply Julia set distortion to create fractal background
    vec2 distortedUv = julia(uv * (0.8 + PROBE_C * 0.4), t);

    // Get previous frame color for background effects
    vec3 prevColor = getLastFrameColor(distortedUv).rgb;

    // Create base fractal color with dark red/maroon theme
    vec3 darkRed = vec3(0.5, 0.0, 0.0);
    vec3 maroon = vec3(0.4, 0.0, 0.1);
    vec3 blackRed = vec3(0.2, 0.0, 0.0);

    // Position-based color variation
    float posFactor = fract(length(distortedUv) * 1.5 + t * 0.5);
    vec3 baseColor = mix(blackRed, maroon, posFactor);
    baseColor = mix(baseColor, darkRed, sin(atan(distortedUv.y, distortedUv.x) * 3.0) * 0.5 + 0.5);

    // Apply color intensity from PROBE_D
    float colorIntensity = mix(0.7, 1.2, PROBE_D);
    baseColor *= colorIntensity;

    // Mix with previous frame for temporal stability
    vec3 fractalColor = mix(prevColor, baseColor, 0.4);

    // Create spiral pattern centered on screen
    vec2 centerUv = uv;
    float angle = atan(centerUv.y, centerUv.x);
    float radius = length(centerUv);

    // Calculate fractal influence on spiral
    float fractalInfluence = length(distortedUv) * PROBE_C * 0.5;

    // Create spiral with parametric controls
    float spiralDensity = mix(2.0, 6.0, PROBE_A); // Fewer arms for mobile visibility
    float spiralSpeed = mix(0.5, 2.0, PROBE_B);
    float spiralThickness = mix(0.15, 0.4, PROBE_E); // Thicker for mobile

    // Apply fractal warping to spiral
    float warpAmount = mix(0.0, 0.3, PROBE_C);
    float warpedRadius = radius + fractalInfluence * warpAmount;
    float warpedAngle = angle + fractalInfluence * warpAmount * 0.5;

    // Calculate spiral pattern with thickness control
    float spiral = fract((warpedAngle / 3.14159 * 0.5 + warpedRadius * spiralDensity - t * spiralSpeed));
    float spiralMask = smoothstep(0.5 - spiralThickness, 0.5 + spiralThickness, spiral);

    // Create Rezz-style red color with variation
    vec3 redColor = mix(
        vec3(1.0, 0.0, 0.0), // Pure red
        vec3(1.0, 0.2, 0.2), // Lighter red
        PROBE_D * 0.5
    );

    // Create spiral color with black
    vec3 spiralColor = mix(vec3(0.0), redColor, spiralMask);

    // Fade spiral at edges for a cleaner look
    float edgeFade = smoothstep(1.5, 0.7, radius);

    // Mix spiral with fractal background based on PROBE_G
    float mixRatio = mix(0.6, 0.9, PROBE_G);
    vec3 color = mix(fractalColor, spiralColor, mixRatio * edgeFade);

    fragColor = vec4(color, 1.0);
}
