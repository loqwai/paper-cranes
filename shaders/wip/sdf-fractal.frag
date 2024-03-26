/**
 * Part 2 Challenges
 * - Change the diffuse color of the sphere to be blue
 * - Change the specual color of the sphere to be green
 * - Make one of the lights pulse by having its intensity vary over time
 * - Add a third light to the scene
 */
uniform float knob_0;
const int MAX_MARCHING_STEPS = 255;
#define MIN_DIST -650.
#define MAX_DIST 55.
#define MIX_FACTOR (1. - spectralRoughness)
const float EPSILON = 0.00001;
#define shininess 10.
#define JULIA_X 0.355 + (energyZScore/100.)
#define JULIA_Y mapValue(spectralKurtosisZScore, -1., 1., .25 , 0.5)
#define K0 20.
/**
 * Signed distance function for a sphere centered at the origin with radius 1.0;
 */
float sphereSDF(vec3 samplePoint) {
    return length(samplePoint) - 1.0;
}

/**
 * Signed distance function describing the scene.
 *
 * Absolute value of the return value indicates the distance to the surface.
 * Sign indicates whether the point is inside or outside the surface,
 * negative indicating inside.
 */
float sceneSDF(vec3 samplePoint) {
    float sphereDist = sphereSDF(samplePoint); // Distance to the original sphere

    // Perturb the sphere using the Julia set
    const int iterations = 100;
    float bailout = 100.0;
    float power = 2.0;
    vec3 c = vec3(JULIA_X, JULIA_Y, 0.0); // Julia set parameters

    vec3 z = samplePoint;
    for(int i = 0; i < iterations; i++) {
        z = vec3(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y, z.z) + c;
        if(length(z) > bailout) {
            float juliaDist = length(z) / pow(2.0, float(i));
            // Blend the sphere and Julia set distances
            return mix(sphereDist, juliaDist, 0.5); // Adjust blending factor as needed
        }
    }
    return sphereDist;
}
/**
 * Return the shortest distance from the eyepoint to the scene surface along
 * the marching direction. If no part of the surface is found between start and end,
 * return end.
 *
 * eye: the eye point, acting as the origin of the ray
 * marchingDirection: the normalized direction to march in
 * start: the starting distance away from the eye
 * end: the max distance away from the ey to march before giving up
 */
float shortestDistanceToSurface(vec3 eye, vec3 marchingDirection, float start, float end) {
    float depth = start;
    for(int i = 0; i < MAX_MARCHING_STEPS; i++) {
        float dist = sceneSDF(eye + depth * marchingDirection);
        if(dist < EPSILON) {
            return depth;
        }
        depth += dist;
        if(depth >= end) {
            return end;
        }
    }
    return end;
}

/**
 * Return the normalized direction to march in from the eye point for a single pixel.
 *
 * fieldOfView: vertical field of view in degrees
 * size: resolution of the output image
 * fragCoord: the x,y coordinate of the pixel in the output image
 */
vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

/**
 * Using the gradient of the SDF, estimate the normal on the surface at point p.
 */
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)), sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)), sceneSDF(vec3(p.x, p.y, p.z + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))));
}

/**
 * Lighting contribution of a single point light source via Phong illumination.
 *
 * The vec3 returned is the RGB color of the light's contribution.
 *
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 * lightPos: the position of the light
 * lightIntensity: color/intensity of the light
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phongContribForLight(
    vec3 k_d,
    vec3 k_s,
    float alpha,
    vec3 p,
    vec3 eye,
    vec3 lightPos,
    vec3 lightIntensity
) {
    vec3 N = estimateNormal(p);
    vec3 L = normalize(lightPos - p);
    vec3 V = normalize(eye - p);
    vec3 R = normalize(reflect(-L, N));

    float dotLN = dot(L, N);
    float dotRV = dot(R, V);

    if(dotLN < 0.0) {
        // Light not visible from this point on the surface
        return vec3(0.0, 0.0, 0.0);
    }

    if(dotRV < 0.0) {
        // Light reflection in opposite direction as viewer, apply only diffuse
        // component
        return lightIntensity * (k_d * dotLN);
    }
    return lightIntensity * (k_d * dotLN + k_s * pow(dotRV, alpha));
}

/**
 * Lighting via Phong illumination.
 *
 * The vec3 returned is the RGB color of that point after lighting is applied.
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phongIllumination(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye) {
    const vec3 ambientLight = 0.5 * vec3(0.4078, 0.0235, 0.4235);
    vec3 color = ambientLight * k_a;

    vec3 light1Pos = vec3(4.0 * sin(1.1), 2.0, 4.0 * cos(1.1));
    vec3 light1Intensity = vec3(0.8, 0.2667, 0.0196);

    color += phongContribForLight(k_d, k_s, alpha, p, eye, light1Pos, light1Intensity);

    vec3 light2Pos = vec3(2.0 * sin(0.37 * 1.1), 2.0 * cos(0.37 * 1.1), 2.0);
    vec3 light2Intensity = vec3(0.4, 0.4, 0.4);

    color += phongContribForLight(k_d, k_s, alpha, p, eye, light2Pos, light2Intensity);
    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float aspectRatio = iResolution.x / iResolution.y;
    float fieldOfViewBase = 3.0;
    float fieldOfView = fieldOfViewBase + (aspectRatio - 1.0) * 100.0;

    vec3 dir = rayDirection(fieldOfView, iResolution.xy, fragCoord);
    vec3 eye = vec3(0.0, 0.0, -50.0);
    float dist = shortestDistanceToSurface(eye, dir, MIN_DIST, MAX_DIST);

    if(dist > MAX_DIST - EPSILON) {
        // Didn't hit anything
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // The closest point on the surface to the eyepoint along the view ray
    vec3 p = eye + dist * dir;

    vec3 K_a = vec3(0.2, 0.2, 0.2);
    vec3 K_d = vec3(0.7, 0.2, 0.2);
    vec3 K_s = vec3(1.0, 1.0, 1.0);

    vec3 color = phongIllumination(K_a, K_d, K_s, shininess, p, eye);
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv -= 0.5;
    uv = mat2(cos(K0), -sin(K0), sin(K0), cos(K0)) * uv;
    uv += 0.5;
    vec3 last = rgb2hsl(getLastFrameColor(uv).rgb);

    color = rgb2hsl(color);
    vec3 normal = -estimateNormal(p.zyx);

    color.x = mapValue(fract(color.x + normal.x / 2.), 0., 1., 0.5, 1.);
    color.y = fract(color.y + normal.y / 2.);
    color.z = fract(color.z + normal.z / 2.);

    // make the colors more saturated as we reach the center
    color.y = clamp(color.y + uv.y, 0., 1.);
    color.z += uv.x / 2.;
    if(color.y < 0.1) {
        uv -= 0.5;
        uv += 0.5;
        last = rgb2hsl(getLastFrameColor(uv).rgb);
        color = last;

        color.z = color.y;
      // color.z += 0.1;
        color.x = (1. - color.x);
    }
    //average color with last
    color = mix(color, last, MIX_FACTOR);
    color.x = fract(color.x + spectralCentroidZScore / 100.);
    //if we are within 15% of the center, make make it a different color
    float distanceFromCenter = length(uv - 0.5);
    if(distanceFromCenter < 0.05) {
        // get the last color from 20% away from the center, and apply it to the center
        uv -= 0.5;
        // find a point 20% away from the center
        uv *= 1.2;
        uv += 0.5;
        last = rgb2hsl(getLastFrameColor(uv).rgb);
        color.y = last.y;
        color.x = fract(last.x + 0.01);
    }
    color = hsl2rgb(color);
    fragColor = vec4(color, 1.0);
}
