#define ROTATION controllerRotation
#define PULSE controllerPulse
#define COLOR_SHIFT controllerColorShift
#define BEAT customBeat
#define BASS_IMPACT bassImpact
#define TREBLE_IMPACT trebleImpact
#define REACTIVITY reactivity

#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.001
#define PI 3.14159265359

// Rotation matrix around the Y axis.
mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, 0, s),
        vec3(0, 1, 0),
        vec3(-s, 0, c)
    );
}

// Rotation matrix around the X axis.
mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(1, 0, 0),
        vec3(0, c, -s),
        vec3(0, s, c)
    );
}

// Sphere SDF
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// Box SDF
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Torus SDF
float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Twisted boxes
float sdTwistedBox(vec3 p, vec3 b, float k) {
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    vec2 q = m * p.xz;
    return sdBox(vec3(q.x, p.y, q.y), b);
}

// Scene distance function
float map(vec3 p) {
    // Apply rotation from controller
    p = rotateY(ROTATION) * p;

    // Make central sphere pulse with controller
    float sphereRadius = 0.8 + 0.2 * PULSE;
    float d = sdSphere(p, sphereRadius);

    // Add a ring based on bass impact
    vec3 torusPos = p;
    torusPos = rotateX(smoothTime) * torusPos;
    float ringSize = 1.2 + 0.5 * BASS_IMPACT;
    float ringThickness = 0.1 + 0.1 * PULSE;
    float torus = sdTorus(torusPos, vec2(ringSize, ringThickness));

    // Add cubes that respond to treble
    vec3 cubePos = p;
    cubePos = rotateY(smoothTime * 0.7) * cubePos;
    cubePos.xz = mod(cubePos.xz + 2.0, 4.0) - 2.0; // Repeat cubes
    float cubeSize = 0.2 + 0.2 * TREBLE_IMPACT;
    float cubes = sdBox(cubePos, vec3(cubeSize));

    // Only show cubes when reactivity is high
    cubes = mix(MAX_DIST, cubes, step(0.3, REACTIVITY));

    // Add twisted boxes on beat
    float twistedBox = MAX_DIST;
    if (BEAT) {
        vec3 boxPos = p;
        boxPos = rotateX(smoothTime * 1.5) * boxPos;
        float twist = 1.0 + 2.0 * PULSE;
        twistedBox = sdTwistedBox(boxPos, vec3(0.3, 0.6, 0.3), twist);
    }

    // Combine all shapes with smooth min
    float k = 0.2 + 0.3 * REACTIVITY; // Blend factor changes with reactivity
    d = min(d, torus);
    d = min(d, cubes);
    d = min(d, twistedBox);

    return d;
}

// Calculate normal
vec3 getNormal(vec3 p) {
    float d = map(p);
    vec2 e = vec2(0.001, 0);

    vec3 n = d - vec3(
        map(p - e.xyy),
        map(p - e.yxy),
        map(p - e.yyx)
    );

    return normalize(n);
}

// Ray marching
float rayMarch(vec3 ro, vec3 rd) {
    float dO = 0.0;

    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dO;
        float dS = map(p);
        dO += dS;
        if(dO > MAX_DIST || dS < SURF_DIST) break;
    }

    return dO;
}

// Get color based on normal, position and controller values
vec3 getColor(vec3 p, vec3 n) {
    // Base color from position and controller COLOR_SHIFT
    vec3 col = 0.5 + 0.5 * cos(vec3(p.x + p.y, p.y + p.z, p.z + p.x) + COLOR_SHIFT);

    // Add lighting
    vec3 lightPos = vec3(4.0, 5.0, -3.0);
    vec3 lightDir = normalize(lightPos - p);
    float diff = max(dot(n, lightDir), 0.0);
    float amb = 0.2 + 0.1 * PULSE;

    // Add specular highlight
    vec3 viewDir = normalize(vec3(0.0, 0.0, -5.0) - p);
    vec3 reflectDir = reflect(-lightDir, n);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    spec *= 1.0 + 2.0 * BASS_IMPACT; // Stronger highlights with bass

    // Combine lighting
    col = col * (amb + diff) + vec3(spec);

    // Add color variation based on normal and controller
    col *= 0.8 + 0.3 * sin(n.y * 5.0 + COLOR_SHIFT * 10.0);

    // Flash on beat
    if (BEAT) {
        col += vec3(0.3, 0.2, 0.4);
    }

    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    // Camera setup
    vec3 ro = vec3(0.0, 0.0, -5.0); // Ray origin

    // Camera movement based on controller
    float camX = sin(smoothTime * 0.5) * (0.5 + 0.5 * PULSE);
    float camY = cos(smoothTime * 0.3) * (0.3 + 0.3 * PULSE);
    ro.x += camX;
    ro.y += camY;

    vec3 rd = normalize(vec3(uv, 1.0)); // Ray direction

    // Ray march the scene
    float d = rayMarch(ro, rd);

    // Initialize color
    vec3 col = vec3(0.0);

    // If we hit something
    if(d < MAX_DIST) {
        vec3 p = ro + rd * d; // Hit position
        vec3 n = getNormal(p); // Normal at hit position

        col = getColor(p, n);

        // Add fog effect based on distance and reactivity
        float fogAmount = 1.0 - exp(-0.03 * d * (0.5 + 0.5 * REACTIVITY));
        vec3 fogColor = vec3(0.0, 0.0, 0.1) + 0.1 * vec3(COLOR_SHIFT, COLOR_SHIFT * 0.5, 1.0 - COLOR_SHIFT);
        col = mix(col, fogColor, fogAmount);
    } else {
        // Background gradient
        col = mix(
            vec3(0.0, 0.0, 0.1),
            vec3(0.1, 0.0, 0.2),
            uv.y + 0.5
        );

        // Add subtle stars that twinkle with treble
        vec2 fUV = fract(uv * 50.0) - 0.5;
        float stars = 1.0 - smoothstep(0.01 + 0.02 * TREBLE_IMPACT, 0.02 + 0.02 * TREBLE_IMPACT, length(fUV));
        col += stars * TREBLE_IMPACT * 0.5;
    }

    // Apply some gamma correction
    col = pow(col, vec3(0.4545));

    fragColor = vec4(col, 1.0);
}
