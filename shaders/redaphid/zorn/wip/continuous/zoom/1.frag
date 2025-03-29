// MAKE SURE TO NAME PUT YOUR SHADER IN "shaders/<YOUR_GITHUB_USERNAME>"
// and make sure the filename ends in .frag
// for example, if your username is "hypnodroid", and you want to publish "my-shader.frag", the filename should be "hypnodroid/my-shader.frag"
#define PROBE_1 mix(1., 1.4, knob_14)
#define PROBE_2 mix(0.55, 2., knob_15)    // 'fan out' swirls -> multiple squares
#define PROBE_3 mix(-1.7, 10., knob_16)    // color
#define PROBE_4 mix(1., 11., knob_17)
#define PROBE_5 mix(0.47, 0.97, knob_14)    // complexity + zoom
#define PROBE_6 pow(1./iTime, 2.)           // zoom

// A simple pseudo-random function for jitter:
float rand(vec2 co) {
    return spectralCentroid;
}
vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier) {
    float d = dot(position, position);
    // Instead of 1.0/d, use 1.0/(d + epsilon) to avoid a constant factor at the center.
    float inv = 1.0 / (d + 0.0001);
    position = 0.5 * sin(multiplier * position * inv * PROBE_5);
    return position;
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 resolution = iResolution.xy;
    // Center and normalize UV coordinates to [-0.5,0.5]
    vec2 uv = (fragCoord - 0.5 * resolution) / resolution.x;
    
    // Apply zoom: as iTime increases, PROBE_6 (which is pow(1./iTime,2.)) decreases, zooming in.
    uv *= PROBE_6;
    
    // Compute fractal: initialize fragColor high so we can use min()
    fragColor = vec4(1e6);
    vec2 multiplier = vec2(PROBE_1, PROBE_2);
    
    for (int i = 0; i < 100; i++) {
        uv = applyPeriodicTransformationAndTraps(uv, multiplier);
        
        float lengthTrap = length(uv);
        float minAxesTrap = min(abs(uv.x), abs(uv.y));
        float diagonalDotTrap = abs(dot(uv, vec2(PROBE_3, PROBE_4)));
        
        fragColor = min(fragColor, vec4(lengthTrap, minAxesTrap, diagonalDotTrap, 1.0));
    }
    
    // Use the frame count to blend in a zoomed version of the original detail gradually.
    if(frame == 0) return;
    // Compute blend factor: 0 for frame <= 100, ramp to 1 at frame >= 300.
    float blendFactor = clamp(float(frame - 100) / 200.0, 0.0, 1.0);
    // Sample the previous frame's color at a slightly zoomed UV to capture the original detail.
    vec4 last = getInitialFrameColor(uv / 4.3);
    fragColor = mix(fragColor, last, blendFactor);    
}
