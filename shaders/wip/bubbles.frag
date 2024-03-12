#define R iResolution.xy
#define T (iTime*1.25)
#define M_PI 3.14159265358979323846264338327950288
#define TAU (M_PI*2.0)
#define FUI floatBitsToUint
#define ZERO min(0, iFrame)
uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

#define A 0.5
#define B spectralCentroid
#define C knob_1
#define D knob_2
mat2 rot(float a) { float s = sin(a); float c = cos(a); return mat2(c, s, -s, c); }
vec3 aces(vec3 x) { return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
float luma(vec3 color) { return dot(color, vec3(0.299, 0.587, 0.114)); }

float hash(vec2 ip, float seed) {
  return random(ip, seed);
}


vec3 bubb(vec2 p, float s) {
    p *= 1.25*A;
    float t = 40.0;
    vec2 id = floor(p);
    float r = hash(id*34.29195, 44.49593 + s);
    p += vec2(sin(r+(T+10.0*r)), cos(r+(T+10.0*r)))*0.15*r;
    vec2 lv = fract(p);
    vec2 alv = abs(lv*2.0-1.0);


    for (int i = -1; i < 1; i++) {
        for (int j = -1; j < 1; j++) {
            vec2 lat = vec2(i, j);
            vec2 k = vec2(hash((id+lat), 11.1987 + s), hash(id+lat, 3.1295 + s));
            vec2 diff = lat + k - lv;
            float dist = dot(diff, diff);
            t = min(t, dist + (1.0+4.0*r)*length(alv));

        }
    }


    float f = clamp((t/(1.0+t*t*t*t*t*t*t*t*t*t*t*t*t*t*t*t*t)), 0.0, 1.0);

    float h = hash(13.91*id+4.25, 12.312);

    float red = h;
    float green = fract(h*10.29184);
    float blue = fract(h*30.554324);

    vec3 col = vec3(red, green, blue);
    col = rgb2hsl(col);
    col.x = fract(col.x + B);
    col = hsl2rgb(col);

    return col*exp(f*6.-4.);
}

////////////////////////////////////////////////////////

void mainImage(out vec4 o, in vec2 fc) {
  vec3 col = vec3(0.0);
  vec2 uv = (fc-0.5*R.xy)/R.y;

  uv *= 3.3;

  float t = T/60.;
  uv += 40.0*vec2(cos(t), sin(t));

  float z = 0.0;
  float itau = 3.0*(1.0/TAU);
  for (float i = 0.0; i < TAU; i += itau) {
    col += bubb(uv*rot(i)*(1.0+z), z+i*3.492195);
    z += 0.04*i;

  }
  col /= TAU;
  col += col*luma(col);
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  o = vec4(col, 1.0);
}
