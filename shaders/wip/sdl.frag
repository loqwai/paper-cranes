struct ShapeParams {
    vec3 location;
    float scale;
    float sides;
    float radius;
    vec3 materialColor;
    float rotation; // Rotation speed
};

// Tetrahedron Signed Distance Function
float tetrahedronSDF(vec3 p) {
    vec3 q = abs(p);
    return max(q.x + q.y + q.z - 1.7, max(q.x, max(q.y, q.z)) - 1.0);
}

// Rotate around Z-axis
vec3 rotateZ(vec3 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

// Scene's Signed Distance Function
float sceneSDF(vec3 pos, ShapeParams params) {
    pos = rotateZ(pos - params.location, params.rotation * iTime) + params.location;
    // Applying tetrahedron SDF
    return tetrahedronSDF(pos - params.location) - params.radius;
}

// Normal estimation for lighting calculations
vec3 estimateNormal(vec3 p, ShapeParams params) {
    float eps = 0.01;
    vec3 n;
    n.x = sceneSDF(vec3(p.x + eps, p.y, p.z), params) - sceneSDF(vec3(p.x - eps, p.y, p.z), params);
    n.y = sceneSDF(vec3(p.x, p.y + eps, p.z), params) - sceneSDF(vec3(p.x, p.y - eps, p.z), params);
    n.z = sceneSDF(vec3(p.x, p.y, p.z + eps), params) - sceneSDF(vec3(p.x, p.y, p.z - eps), params);
    return normalize(n);
}

// Ray marching function
float marchRay(vec3 ro, vec3 rd, ShapeParams params, out vec3 hitPoint) {
    float t = 0.0;
    float minDist = 0.0045;
    float maxDist = 10.0;
    for (int i = 0; i < 100; i++) {
        vec3 pos = ro + rd * t;
        float dist = sceneSDF(pos, params);
        if (dist < minDist) {
            hitPoint = pos;
            return t;
        }
        t += dist;
        if (t > maxDist) break;
    }
    return -1.0;
}

// Phong shading calculation
vec3 calculatePhongShading(vec3 normal, vec3 lightDir, vec3 viewDir, vec3 lightColor) {
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = spec * lightColor;
    return diff + specular;
}

// Main function to draw shapes
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    vec3 camPos = vec3(0.0, 0.0, 2.0); // Camera position adjusted
    vec3 rayDir = normalize(vec3(uv, -1.0)); // Ray direction

    ShapeParams params;
    params.location = vec3(0.0, 0.0, 0.0);
    params.scale = 1.0;
    params.radius = 0.05;
    params.materialColor = vec3(1.0, 0.5, 0.0);
    params.rotation = 1.0;

    vec3 hitPoint;
    if (marchRay(camPos, rayDir, params, hitPoint) > 0.0) {
        vec3 normal = estimateNormal(hitPoint, params);
        vec3 lightPos = vec3(2.0, 2.0, 2.0); // Light position
        vec3 lightDir = normalize(lightPos - hitPoint);
        vec3 viewDir = normalize(camPos - hitPoint);
        vec3 color = calculatePhongShading(normal, lightDir, -rayDir, vec3(1.0, 1.0, 1.0));
        fragColor = vec4(color * params.materialColor, 1.0);
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0); // Background color
    }
}
