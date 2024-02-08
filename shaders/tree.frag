#pragma glslify: import(./includes/full.frag)
#pragma glslify: import(./includes/shadertoy-compat)

#define kDepth 3
#define kBranches 5
#define kMaxDepth 2187 // This is used, so it stays

mat3 matRotate(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(c, s, 0, -s, c, 0, 0, 0, 1);
}

mat3 matTranslate(float x, float y) {
    return mat3(1, 0, 0, 0, 1, 0, -x, -y, 1);
}

float sdBranch(vec2 p, float w1, float w2, float l) {
    float h = clamp(p.y / l, 0.0, 1.0);
    float d = length(p - vec2(0.0, l * h));
    return d - mix(w1, w2, h);
}

float map(vec2 pos) {
    const float len = 3.2;
    const float wid = 0.3;
    const float lenf = 0.9;
    const float widf = 0.4;

    float d = sdBranch(pos, wid, wid * widf, len);
    int c = 0;
    for (int count = 0; count < kMaxDepth; count++) {
        int off = kMaxDepth;
        vec2 pt_n = pos;

        float l = len;
        float w = wid;

        for (int i = 1; i <= kDepth; i++) {
            l *= lenf;
            w *= widf;

            off /= kBranches;
            int dec = c / off;
            int path = dec % kBranches;

            mat3 mx;
            if (path == 0) {
                mx = matRotate(0.75 + 0.25 * sin(iTime - 1.0)) * matTranslate(0.0, 0.4 * l / lenf);
            } else if (path == 1) {
                mx = matRotate(-0.6 + 0.21 * sin(iTime)) * matTranslate(0.0, 0.6 * l / lenf);
            } else {
                mx = matRotate(0.23 * sin(iTime + 1.)) * matTranslate(0.0, l);
            }
            pt_n = (mx * vec3(pt_n, 1)).xy;

            float y = length(pt_n - vec2(0.0, l));
            if (y - 1.4 * l > 0.0) {
                c += off - 1;
                break;
            }

            d = min(d, sdBranch(pt_n, w, w * widf, l));
        }

        c++;
        if (c > kMaxDepth) break;
    }

    return d;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (-iResolution.xy + 2.0 * fragCoord.xy) / iResolution.y;

    vec2 rotatedUv = fract(mat2(cos(iTime), -sin(iTime), sin(iTime), cos(iTime)) * uv);

    float px = 2.0 / iResolution.y;

    uv = uv * 4.0 + vec2(0.0, 3.5);
    px = px * 4.0;

    float d = map(uv);
    uv.y = sin(iTime/100. + uv.y + energyZScore);
    vec3 last = getLastFrameColor(rotatedUv).rgb;
    vec3 color = vec3(smoothstep(0.0, 2.0 * px, d));

    if (color.r + color.g + color.b > 0.9) {
        fragColor = vec4(rgb2hsl(last), 1.);
        // discard;
        return;
    }
    if(color == last){
         color = rgb2hsl(color);
         color.z += 0.1;
         color.x = spectralEntropyNormalized;
         color.z = energy;
         color = hsl2rgb(color);
    }
    color = mix(last, color, .1);
    color = rgb2hsl(color);
    color.x = spectralCentroid;
    color.y = energyNormalized;
    color.z = spectralFluxNormalized;
    fragColor = vec4(hsl2rgb(color), 1.);
}
#pragma glslify:import(./includes/shadertoy-compat-main)
