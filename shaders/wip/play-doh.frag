// history-size: 50
uniform float knob_1;
#define A 1.66 + spectralRoughnessZScore != 0. ? 1.66 + spectralRoughnessZScore: 0.25
#define B (energyZScore * .05 + 1.)
#define C (spectralRoughnessZScore > -.2 ? 1. : -1.)
vec3 pal(float t) {
    vec3 b = vec3(.45);
    vec3 c = vec3(.35);
    return b + c*cos(6.28318*(t*vec3(1)+vec3(.7,.39, .2)));
}

float gyroid(vec3 p, float scale) {
    p *= scale;
    float bias = mix(1.1, 2.65, sin(iTime*.4 + p.x/3. + p.z/4.)*.5+.5)*A;
    float g = abs(dot(sin(p*1.01), cos(p.zxy*1.61)) - bias)/(scale*1.5)-.1;
    return g;

}

float scene(vec3 p) {
    float g1 = .7*gyroid(p, 4.);
    return g1;
}

vec3 norm(vec3 p) {
    mat3 k = mat3(p,p,p) - mat3(0.01);
    return normalize(scene(p) - vec3(scene(k[0]),scene(k[1]),scene(k[2])));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord-.5*iResolution.xy)/iResolution.y;
    vec3 init = vec3(iTime*.25*B,1.5,.3);
    vec3 cam = normalize(vec3(1., uv ));

    vec3 p = init;
    bool hit = false;
    for ( int i = 0; i < 100 && !hit; i++) {
        if (distance(p,init) > 8.) break;
        float d = scene(p);
        if (d*d < 0.00001) hit = true;
        p += cam*d;
    }
    vec3 n = norm(p);

    float ao = 1.-smoothstep(-.3,.75,scene(p+n*.4))
             * smoothstep(-3.,3.,scene(p+n*1.));

    float fres = -max(0., pow(.8-abs(dot(cam,n)), 3.));
    vec3 vign = smoothstep(0.,1.,vec3(1.-(length(uv*.8)-.1)));
    vec3 col = pal(.1-iTime*.01 + p.x*.28 + p.y*.2 + p.z*.2);
    col = (vec3(fres)+col)*ao;
    col = mix(col, vec3(0.), !hit ? 1. : smoothstep(0.,8.,distance(p,init)));
    col = mix(vec3(0),col, vign+.1);
    col = smoothstep(0.,1.+.3*sin(iTime+p.x*4.+p.z*4.),col);
    vec3 hsl = rgb2hsl(col);
    hsl.x = fract(hsl.x + spectralCentroidMedian);
    col = hsl2rgb(hsl);
    fragColor.xyz = col;
    fragColor.xyz = sqrt(fragColor.xyz);

}
