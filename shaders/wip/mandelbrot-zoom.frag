void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize coordinates (aspect-corrected)
    vec2 uv = (fragCoord * resolution.xy) / resolution.y;

    // Get previous frame's pattern
    vec4 prevColor = getLastFrameColor(uv);
    vec2 prevPattern = vec2(prevColor.r * 2.0 - 1.0, prevColor.g * 2.0 - 1.0) * prevColor.a * 4.0;

    // Compute continuous zoom scale with slower growth
    float speed = 1200.5;
    float z = time * speed * time;
    float zoomScale = 1.0 / (1.0 + z * 0.05); // Slower zoom growth
    float zoomScale_prev = 1.0 / (1.0 + (z - 1.0/60.0 * speed) * 0.05);

    // Perspective projection
    vec2 p = uv * zoomScale;
    vec2 p_prev = uv * zoomScale_prev;

    // Fixed fractal center with dampened pattern influence
    vec2 center = vec2(-0.73888037151, 0.131925904205330);
    float patternScale = min(0.1, zoomScale * 2.0); // Dampen pattern influence at deep zooms
    vec2 patternInfluence = prevPattern * patternScale;
    vec2 c = center + p + patternInfluence;
    vec2 c_prev = center + p_prev + patternInfluence;

    // Calculate iteration bounds based on zoom level
    int MAX_ITER = int(256.0 * (1.0 + log2(1.0 / zoomScale)));
    float prevIter = prevColor.b * float(MAX_ITER);
    int START_ITER = int(prevIter * 0.8);
    START_ITER = max(0, min(START_ITER, MAX_ITER - 100));

    // Initialize z0 with dampened pattern influence
    vec2 z0 = prevPattern * patternScale * 0.5;
    int i;
    float iter = float(START_ITER);

    // Continue with remaining iterations for visible detail
    for (i = START_ITER; i < MAX_ITER; i++) {
        z0 = vec2(z0.x*z0.x - z0.y*z0.y, 2.0*z0.x*z0.y) + c;
        if (dot(z0, z0) > 4.0) break;
        iter += 1.0;
    }

    // Smooth coloring algorithm
    float smoothIter = iter;
    if (iter < float(MAX_ITER)) {
        float log_zn = log(dot(z0, z0)) / 2.0;
        float nu = log(log_zn / log(2.0)) / log(2.0);
        smoothIter = iter + 1.0 - nu;
    }

    float fractalColor = smoothIter / float(MAX_ITER);

    // Create a more complex color palette
    vec3 color1 = vec3(0.5, 0.7, 0.9); // Cool blue
    vec3 color2 = vec3(0.9, 0.5, 0.7); // Warm pink
    vec3 color3 = vec3(0.3, 0.8, 0.6); // Teal

    // Smooth color transitions without pattern influence
    float t = fractalColor * 2.0;
    vec3 finalColor;
    if (t < 1.0) {
        finalColor = mix(color1, color2, t);
    } else {
        finalColor = mix(color2, color3, t - 1.0);
    }

    // Add subtle variation based on position only
    finalColor *= 1.0 + 0.1 * sin(fractalColor * 10.0 + time * 0.5);

    // Store z0 value and iteration count for next frame
    vec2 z0_stored = (z0 / 4.0 + 1.0) * 0.5;
    fragColor = vec4(z0_stored, smoothIter / float(MAX_ITER), smoothIter / float(MAX_ITER));
}
