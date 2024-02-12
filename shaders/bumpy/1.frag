const vec3 lightDir = vec3(-0.577, 0.577, 0.577);
const float angle = 90.0;
const float fov = angle * 0.5 * PI / 180.0;

uniform float knob_1;
uniform float knob_2;

// 更新されたdistanceFunc関数
float distanceFunc(vec3 p, float time) {
    float wave = sin(p.x * 10.0 + time) * cos(p.y * 10.0 + time) * sin(p.z * 10.0 + time) * energy;
    return length(p) - (1.0 + 0.5 * wave);
}

vec3 getNormal(vec3 p, float time) {
    float d = 0.01;
    return normalize(vec3(
        distanceFunc(p + vec3(d, 0.0, 0.0), time) - distanceFunc(p - vec3(d, 0.0, 0.0), time),
        distanceFunc(p + vec3(0.0, d, 0.0), time) - distanceFunc(p - vec3(0.0, d, 0.0), time),
        distanceFunc(p + vec3(0.0, 0.0, d), time) - distanceFunc(p - vec3(0.0, 0.0, d), time)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
    vec3 cPos = vec3(0.0, 0.0, 2.0);
    vec3 cDir = vec3(0.0, 0.0, -1.0);
    vec3 cUp = vec3(0.0, 1.0, 0.0);
    vec3 cSide = cross(cDir, cUp);
    float targetDepth = 1.0;

    vec3 ray = normalize(vec3(sin(fov) * uv.x, sin(fov) * uv.y, -cos(fov)));

    float dist = 0.0;
    float rlen = 0.0;
    vec3 rPos = cPos;

    for (int i = 0; i < 64; i++) {
        dist = distanceFunc(rPos, iTime);
        if (abs(dist) < 0.001) break;
        rlen += dist;
        rPos = cPos + ray * rlen;
    }
    vec3 color = vec3(0.);
    if (abs(dist) < 0.001) {
        vec3 nor = getNormal(rPos, iTime);
        float diff = clamp(dot(nor, lightDir), 0.1, 1.0);
        color = vec3(diff * nor * 0.5 + 0.5);
    }
    color = rgb2hsl(color);
    color.x = fract(color.x + spectralCentroidMedian);
    color = hsl2rgb(color);
    fragColor = vec4(color, 1.);
}
