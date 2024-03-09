struct ShapeParams {
    vec3 location;
    float scale; // Kept for completeness, scale adjustments are applied elsewhere
    float sides; // Not directly used in this example, but useful for future extensions
    float radius;
    vec3 materialColor;
    float rotation; // Rotation speed around the Z-axis
};

float tetrahedronSDF(vec3 p) {
    vec3 q = abs(p);
    return max(q.x + q.y + q.z - 1.7, max(q.x, max(q.y, q.z)) - 1.0);
}

vec3 rotateZ(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

float sceneSDF(vec3 pos, ShapeParams params) {
    // Apply rotation
    pos = rotateZ(pos - params.location, params.rotation * iTime);
    // Apply scale to adjust the shape size - now incorporating the scale parameter
    pos /= params.scale; // Divide position by scale to enlarge the shape in the SDF
    return tetrahedronSDF(pos) - params.radius;
}

vec3 estimateNormal(vec3 p, ShapeParams params) {
    const float eps = 0.001; // Smaller epsilon for higher precision in normal calculation
    vec3 n = vec3(
        sceneSDF(vec3(p.x + eps, p.y, p.z), params) - sceneSDF(vec3(p.x - eps, p.y, p.z), params),
        sceneSDF(vec3(p.x, p.y + eps, p.z), params) - sceneSDF(vec3(p.x, p.y - eps, p.z), params),
        sceneSDF(vec3(p.x, p.y, p.z + eps), params) - sceneSDF(vec3(p.x, p.y, p.z - eps), params));
    return normalize(n);
}

float marchRay(vec3 ro, vec3 rd, ShapeParams params, out vec3 hitPoint) {
    float t = 0.01; // Start a bit away from the camera to avoid self-intersection
    const float maxDist = 20.0; // Increased max distance to accommodate orbiting paths
    for (int i = 0; i < 100; i++) {
        vec3 pos = ro + rd * t;
        float dist = sceneSDF(pos, params);
        if (dist < 0.0004) { // Slightly tighter threshold for hit detection
            hitPoint = pos;
            return t; // Return the distance to the hit point
        }
        t += dist;
        if (t > maxDist) break;
    }
    return -1.0;
}

vec3 calculatePhongShading(vec3 normal, vec3 lightDir, vec3 viewDir, vec3 lightColor) {
    const float ambientStrength = 0.1;
    vec3 ambient = ambientStrength * lightColor;

    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * lightColor;

    const float specularStrength = 0.5;
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = specularStrength * spec * lightColor;

    return ambient + diffuse + specular;
}void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    vec3 camPos = vec3(0.0, 0.0, 3.0); // Positioned to view the orbiting shapes
    vec3 rayDir = normalize(vec3(uv, -1.0));

    vec4 accumulatedColor = vec4(0.0);
    vec3 lightPos = vec3(4.0, 4.0, 2.0); // Position of the light source for Phong shading

    for(int i = 0; i < 3; i++) {
        ShapeParams params;
        float timeOffset = float(i) * 2.0944; // Distribute shapes evenly in orbit
        // Slow down the orbit speed by using a smaller multiplier for iTime
        params.location = vec3(sin(iTime * 0.1 + timeOffset) * 1.5, cos(iTime * 0.1 + timeOffset) * 1.5, 0.0);
        // Slow down the rotation speed by using a smaller multiplier for iTime
        params.rotation = sin(iTime * 0.1); // Adjusted rotation speed
        params.scale = 0.9; // Adjust this value to scale the shape
        params.radius = 0.0005; // Adjusted to a more practical default size
        params.materialColor = vec3(sin(float(i) * 1.0472) * 0.5 + 0.5, cos(float(i) * 1.0472) * 0.5 + 0.5, sin(float(i) * 1.0472) * 0.5 + 0.5);

        vec3 hitPoint;
        if (marchRay(camPos, rayDir, params, hitPoint) > 0.0) {
            vec3 normal = estimateNormal(hitPoint, params);
            vec3 viewDir = normalize(camPos - hitPoint);
            vec3 lightDir = normalize(lightPos - hitPoint);
            vec3 color = calculatePhongShading(normal, lightDir, viewDir, vec3(1.0, 1.0, 1.0));
            accumulatedColor += vec4(color * params.materialColor, 1.0);
        }
    }

    fragColor = min(accumulatedColor, vec4(1.0)); // Ensure we don't exceed a value of 1.0 in any channel
}
