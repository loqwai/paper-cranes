#define NUM_LAYERS 3.

uniform float knob_1;

#define A (energy+1.)
#define B (energyNormalized+1.)
#define M energyZScore/10.
#define C spectralEntropy*1.5
#define D energyNormalized
mat2 Rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float Star(vec2 uv, float flare) {
    float col = 0.;
    float d = length(uv);
    float m = .02/d;

    float rays = max(0., 1. - abs(uv.x * uv.y * 1000.));
    m += rays * flare*D;
    uv *= Rot(PI/4.);
    rays = max(0., 1. - abs(uv.x * uv.y * 1000.));
    m += rays * .3 * flare;

    m *= smoothstep(1., .2, d);

    return m;
}

float Hash21(vec2 p) {
  return staticRandom(p);
}

vec3 StarLayer(vec2 uv) {
    vec3 col = vec3(0.);

    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);

    for(int y = -1; y <= 1; y++ ) {
        for(int x = -1; x <= 1; x++) {
            vec2 offs = vec2(x, y);

            float n = Hash21(id + offs);
            float size = fract(n*345.32)*A;

            vec2 p = vec2(n, fract(n*34.))*D;

            float star = Star(gv - offs - p + .5, smoothstep(.8, 1., size) * .6);

            vec3 hueShift = fract(n*2345.2 + dot(uv /420.,texture(prevFrame, vec2(0.25, 0.)).rg))*vec3(.2, .3, .9)*123.2;
            hueShift = rgb2hsl(hueShift);
            hueShift.x = fract(hueShift.x + spectralCentroid);
            hueShift = hsl2rgb(hueShift);
            vec3 color = sin(hueShift) * .5 + .5;
            color = color * vec3(1., .25, 1.+size);

            star *= sin(iTime*3.+n*6.2831)*.4+1.*B;
            col += star * size * color;
        }
    }

    return col;

}

vec2 N(float angle) {
  return vec2(sin(angle), cos(angle));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    float t = iTime * .01;

    uv.x = abs(uv.x);
    uv.y += tan((5./6.) * PI) * .5;

    vec2 n = N((5./6.) * PI);
    float d = dot(uv - vec2(.5, 0.), n);
    uv -= n * max(0., d) * 2.;

    // col += smoothstep(.01, .0, abs(d));

    n = N((2./3.) * PI);
    float scale = 1.;
    uv.x += 1.5 / 1.25;
    for(int i=0; i<5; i++) {
        scale *= 1.25;
        uv *= 1.25;
        uv.x -= 1.5;

        uv.x = abs(uv.x);
        uv.x -= 0.5;
        uv -= n * min(0., dot(uv, n)) * 2.;
    }


    uv += M * 4.;

    uv *= Rot(t);
    vec3 col = vec3(0.);

    float layers = 10.;

    for(float i=0.; i < 1.; i+=1./NUM_LAYERS) {
        float depth = fract(i+t);
        float scale = mix(20., .5, depth)*C;
        float fade = depth * smoothstep(1., .9, depth);
        col += StarLayer(uv * scale + i * 453.2) * fade;
    }
    vec3 hsl = rgb2hsl(col);
    hsl.x = fract(hsl.x + spectralCentroid);
    col = hsl2rgb(hsl);
    fragColor = vec4(col,1.0);
}
