void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize coordinates (aspect-corrected)
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;

    // Compute continuous zoom scale with slower growth
    float speed = 500.5;
    float z = time * speed;
    float zoomScale = 1.0 / (1.0 + z * 0.05); // Slower zoom growth
    float zoomScale_prev = 1.0 / (1.0 + (z - 1.0/60.0 * speed) * 0.05);

    // Perspective projection
    vec2 p = uv * zoomScale;
    vec2 p_prev = uv * zoomScale_prev;

    // Fixed fractal center
    vec2 center = vec2(-0.737643888037151, 0.131925904205330);
    vec2 c = center + p;

    // Calculate iteration bounds based on zoom level
    int MAX_ITER = int(512.0 * (1.0 + log2(1.0 / zoomScale))); // Increased base iterations
    int START_ITER = int(128.0 * log2(1.0 / zoomScale)); // Reduced start iterations
    START_ITER = min(START_ITER, MAX_ITER - 200); // Increased detail buffer

    vec2 z0 = vec2(0.0);
    int i;
    float iter = float(START_ITER); // Start from our calculated iteration

    // Skip early iterations for areas we can't see
    for (i = 0; i < START_ITER; i++) {
        z0 = vec2(z0.x*z0.x - z0.y*z0.y, 2.0*z0.x*z0.y) + c;
        if (dot(z0, z0) > 4.0) {
            iter = float(i);
            break;
        }
    }

    // Continue with remaining iterations for visible detail
    for (i = START_ITER; i < MAX_ITER; i++) {
        z0 = vec2(z0.x*z0.x - z0.y*z0.y, 2.0*z0.x*z0.y) + c;
        if (dot(z0, z0) > 4.0) break;
        iter += 1.0;
    }

    float fractalColor = iter / float(MAX_ITER);

    // Simple color scheme
    vec3 baseColor = vec3(0.5, 0.7, 0.9); // Cool blue base
    vec3 accentColor = vec3(0.9, 0.5, 0.7); // Warm accent
    vec3 currentColor = hslmix(baseColor, accentColor, fractalColor * 0.5);

    // Reproject previous frame's UVs
    vec2 uv_prev = uv * (zoomScale_prev / zoomScale);
    vec3 prevColor = getLastFrameColor(uv_prev).rgb;

    // Smooth blend between frames
    float blendFactor = 0.2;
    vec3 finalColor = mix(currentColor, prevColor, blendFactor);

    fragColor = vec4(finalColor, 1.0);
}
