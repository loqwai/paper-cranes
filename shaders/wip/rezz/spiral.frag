// Updated shader with Rezz-inspired red/black spiral motif
// -------------------------------------------------------

// Probe definitions for parametric control
#define PROBE_A (knob_1)     // Controls overall spiral density (0 = sparse, 1 = dense)
#define PROBE_B (knob_2)     // Controls spiral rotation speed
#define PROBE_C (knob_3)     // Controls fractal influence on spiral (0 = rigid, 1 = very warped)
#define PROBE_D (knob_4)     // Controls color intensity and variation
#define PROBE_E (knob_5)     // Controls spiral thickness
#define PROBE_F (knob_6)     // Controls overall scale/zoom
#define PROBE_G (knob_7)     // Controls the balance between spiral and fractal

// Function to check if pixel and surrounding area is solid white
float getWhiteAmount(vec2 uv, vec2 pixelSize) {
    vec3 center = getLastFrameColor(uv).rgb;
    vec3 left   = getLastFrameColor(uv - vec2(pixelSize.x, 0.0)).rgb;
    vec3 right  = getLastFrameColor(uv + vec2(pixelSize.x, 0.0)).rgb;
    vec3 up     = getLastFrameColor(uv + vec2(0.0, pixelSize.y)).rgb;
    vec3 down   = getLastFrameColor(uv - vec2(0.0, pixelSize.y)).rgb;

    float centerWhite = dot(center, vec3(1.0)) / 3.0;
    float leftWhite   = dot(left,   vec3(1.0)) / 3.0;
    float rightWhite  = dot(right,  vec3(1.0)) / 3.0;
    float upWhite     = dot(up,     vec3(1.0)) / 3.0;
    float downWhite   = dot(down,   vec3(1.0)) / 3.0;

    float threshold   = 0.95;
    float smoothness  = 0.1;

    float centerSmooth = smoothstep(threshold - smoothness, threshold, centerWhite);
    float leftSmooth   = smoothstep(threshold - smoothness, threshold, leftWhite);
    float rightSmooth  = smoothstep(threshold - smoothness, threshold, rightWhite);
    float upSmooth     = smoothstep(threshold - smoothness, threshold, upWhite);
    float downSmooth   = smoothstep(threshold - smoothness, threshold, downWhite);

    return (centerSmooth + leftSmooth + rightSmooth + upSmooth + downSmooth) / 5.0;
}

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
    float t = time * 0.1;

    vec2 pixelSize = 1.0 / iResolution.xy;
    float whiteAmount = getWhiteAmount(fragCoord / iResolution.xy, pixelSize);

    // Apply Julia set distortion to create fractal background
    vec2 distortedUv = julia(uv * (0.8 + PROBE_C * 0.4), t);

    // Get previous frame color for background effects
    vec3 prevColor = getLastFrameColor(distortedUv).rgb;

    // Create base fractal color
    vec3 fractalColor = prevColor;
    vec3 hsl = rgb2hsl(fractalColor);
    hsl.x += 0.05;
    hsl.y = mix(hsl.y, 0.8, 0.1);
    fractalColor = hsl2rgb(hsl);

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

    // Apply previous frame white amount
    color = mix(color, vec3(1.0), whiteAmount * 0.5);

    fragColor = vec4(color, 1.0);
}
