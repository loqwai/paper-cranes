const float INFINITY_VALUE = 1e6;

uniform float knob_1;
uniform float knob_2;
#define PI 3.1415926535897932384626433832795

bool rayIntersectsBox(vec3 origin, vec3 direction, vec3 minBounds, vec3 maxBounds, out float intersectionDistance)
{
    float tNear = -INFINITY_VALUE;
    float tFar = INFINITY_VALUE;

    for (int i = 0; i < 3; i++) {
        if (direction[i] == 0.0) {
            // Ray is parallel to plane
            if (origin[i] < minBounds[i] || origin[i] > maxBounds[i])
                return false;
        } else {
            vec2 t = vec2(minBounds[i] - origin[i], maxBounds[i] - origin[i]) / direction[i];

            if (t[0] > t[1])
                t = t.yx;

            tNear = max(tNear, t[0]);
            tFar = min(tFar, t[1]);

            if (tNear > tFar || tFar < 0.0)
                return false;
        }
    }

    intersectionDistance = tNear;

    return true;
}

float randomNoise(float n)
{
    return mapValue(spectralKurtosisZScore, -1.0, 1.0, 0.01, 0.3);
}

vec2 randomNoise2D(in vec2 p)
{
    return fract(
        vec2(
            sin(p.x * 1.32 + p.y * 54.077),
            cos(p.x * 91.32 + p.y * 9.077)
        )
    );
}

float voronoiNoise(in vec2 v, in float edge)
{
    vec2 cell = floor(v);
    vec2 fractional = fract(v);
    vec2 result = vec2(8.0);

    for (int j = -1; j <= 1; ++j) {
        for (int i = -1; i <= 1; ++i) {
            vec2 offset = vec2(i, j);
            vec2 r = offset - fractional + randomNoise2D(cell + offset);

            float distance = max(abs(r.x), abs(r.y));

            if (distance < result.x) {
                result.y = result.x;
                result.x = distance;
            } else if (distance < result.y) {
                result.y = distance;
            }
        }
    }

    vec2 distances = sqrt(result);
    float distanceDelta = distances.y - distances.x;

    return 1.0 - smoothstep(0.0, edge, distanceDelta);
}

mat2 rotationMatrix(in float angle)
{
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

mat3 createCameraMatrix(vec3 eye, vec3 lookAt) {
    vec3 up = vec3(0, 1, 0);
    vec3 forward = normalize(lookAt - eye);
    vec3 right = normalize(cross(up, forward));
    vec3 upDir = normalize(cross(forward, right));

    return mat3(right, upDir, forward);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 mousePosition = (iMouse.xy - 0.5 * iResolution.xy) / iResolution.y;
    vec2 resolution = iResolution.xy - 0.5;
    float currentTime = iTime;
    vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / min(resolution.x, resolution.y);

    vec2 uv2 = gl_FragCoord.xy / resolution * 4.0 - 23.0;
    uv2.y *= resolution.y / resolution.x;
    uv2 *= rotationMatrix(0.3);

    float value = 0.0;
    float light = 0.0;

    float scaleFactor = 1.0;
    float attenuationFactor = 0.7;

    for (int i = 0; i < 3; ++i) {
        float voronoiValue1 = voronoiNoise(uv * scaleFactor + 1.0 + currentTime * 0.2, 0.1);
        voronoiValue1 = pow(voronoiValue1, 2.0)*spectralRoughnessNormalized;
        value += attenuationFactor * randomNoise(voronoiValue1 * 5.5 + 0.1);

        float voronoiValue2 = voronoiNoise(uv * scaleFactor * 1.5 + 5.0 + currentTime, 0.2) * 1.1;
        voronoiValue2 = pow(voronoiValue2, 5.0);
        light += pow(voronoiValue1 * (0.5 * voronoiValue2), 1.5)*mapValue(energyZScore,-1.,1.,-.13,.13);

        scaleFactor *= 2.0;
        attenuationFactor *= 0.6;
    }

    vec3 finalColor;
    finalColor += vec3(0.0, 0.5, 1.0) * value;
    finalColor += vec3(0.4, 0.7, 1.0) * light;

    float currentTimeScaled = 0.75 * currentTime;

    vec3 rayOrigin = 10.0 * vec3(cos(currentTimeScaled), 1.0, -sin(currentTime));
    vec3 rayDirection = createCameraMatrix(rayOrigin, vec3(0)) * normalize(vec3(uv, 0.5));

    float intersectionDistance = INFINITY_VALUE;
    const float clusterSize = 5.0;
    float isInside = 0.0;

    for (float i = 0.0; i < clusterSize; i++) {
        for (float j = 0.0; j < clusterSize; j++) {
            for (float k = 0.0; k < clusterSize; k++) {
                vec3 point = 1.75 * (vec3(i, j, k) - 0.5 * vec3(clusterSize - 1.));
                float distanceFromOrigin = length(point);
                float sphereSize = 2.0 * (0.05 + 0.505 * sin(0.25 * currentTime * 4.0 * PI - 4.5 * distanceFromOrigin));
                float intersectionTime = 0.0;

                if (rayIntersectsBox(rayOrigin, rayDirection, point - vec3(sphereSize), point + vec3(sphereSize), intersectionTime) && intersectionTime < intersectionDistance) {
                    intersectionDistance = intersectionTime;
                    vec3 normal = rayOrigin + rayDirection * intersectionDistance - point;
                    const float EPSILON = 0.05;
                    vec3 normalCheck = step(vec3(sphereSize - EPSILON), normal) + step(vec3(sphereSize - EPSILON), -normal);
                    isInside = step(2.0, normalCheck.x + normalCheck.y + normalCheck.z);
                }
            }
        }
    }

    vec4 finalColorRGBA;

    if (intersectionDistance == INFINITY_VALUE)
        finalColorRGBA = mix(vec4(0.1, 0.1, 0.1, 1.0) * 10.0, vec4(0.0, 0.0, 0.0, 0.0), 0.5 * length(uv));
    else
        finalColorRGBA = isInside * vec4(1.0, 0.0, 13.0, 1.0);

    fragColor = finalColorRGBA;
    fragColor *= vec4(finalColor * 10.0, 1.0);
}
