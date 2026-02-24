// @fullscreen: true
// @mobile: true
// @tags: fractal, 3d, mandelbulb
float mandelbulbDE(vec3 pos) {
    const int iterations = 8;
    const float bailout = 2.0;
    const float power = 8.0;
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    for (int i = 0; i < iterations; i++) {
        r = length(z);
        if (r > bailout) break;

        // Convert to polar coordinates
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        // Scale and rotate the point
        float zr = pow(r, power);
        theta *= power;
        phi *= power;

        // Convert back to cartesian coordinates
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += pos;
    }
    return 0.5 * log(r) * r / dr;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * resolution) / min(resolution.x, resolution.y);
    vec3 camPos = vec3(0.0, 0.0, -2.0);
    camPos.xz = mat2(cos(time), sin(time), -sin(time), cos(time)) * camPos.xz;
    vec3 camTarget = vec3(0.0, 0.0, 0.0);
    vec3 camDir = normalize(camTarget - camPos);
    vec3 camUp = vec3(0.0, 1.0, 0.0);
    vec3 camRight = cross(camDir, camUp);

    float fov = 90.0;
    float planeDist = 1.0 / tan(radians(fov) / 2.0);
    vec3 rayDir = normalize(camDir * planeDist + uv.x * camRight + uv.y * camUp);

    float totalDistance = 0.0; // The total distance marched, a tally of our steps into the darkness
    const float maxDistance = 100.0; // The furthest we can go before we must admit defeat
    const int maxSteps = 64; // The maximum number of steps we're allowed to take
    bool hit = false; // Have we touched the essence of the fractal?

    for (int i = 0; i < maxSteps; i++) {
        vec3 p = camPos + totalDistance * rayDir; // Our current position in the march
        float d = mandelbulbDE(p); // The distance to the fractal, a beacon calling to us
        totalDistance += d; // We step forward, ever forward
        if (d < 0.001 || totalDistance > maxDistance) { // Have we arrived, or have we lost our way?
            hit = true;
            break;
        }
    }

    vec3 col = vec3(0.); // The color, the essence of what we've found
    if (hit) {
        float n = totalDistance * 0.1; // Normalize distance for color calculation
        col.x = n;
        col.y = 0.5;
        col.z = n;
        col = hsl2rgb(col); // Convert to RGB color space

    } else {
        col = vec3(0.0, 0.0, 0.0); // The void, the absence of discovery
    }

    // Output to screen, a glimpse into the abyss
    fragColor = vec4(col,1.0);
}
