//http://localhost:6969/edit.html?shader=redaphid%2Fwip%2Fzebra-fractal&knob_72=-2&knob_72.min=-2&knob_72.max=1&knob_71=-0.913&knob_71.min=-2&knob_71.max=1&knob_70=-0.772&knob_70.min=-2&knob_70.max=1&knob_74=-0.984&knob_74.min=-2&knob_74.max=1&knob_75=-0.606&knob_75.min=-2&knob_75.max=1&knob_76=-0.583&knob_76.min=-2&knob_76.max=1&knob_77=-0.488&knob_77.min=-2&knob_77.max=1&knob_73=0.126&knob_73.min=-2&knob_73.max=1
#define PI  3.141592654
#define TAU (2.0*PI)

// Knob mappings for manual control
uniform float knob_70; // Base rotation (-1 to 1)
uniform float knob_71; // Color intensity (-1 to 1)
uniform float knob_72; // Pattern scale (-1 to 1)
uniform float knob_73; // Fractal detail (-1 to 1)
uniform float knob_74; // Color blend (-1 to 1)
uniform float knob_75; // Pattern evolution (-1 to 1)
uniform float knob_76; // Pattern intensity (-1 to 1)

#define EPSILON 0.0001

// Map PROBEs to knobs initially
#define PROBE_A (knob_70) // Base rotation
#define PROBE_B (/*knob_71*/ spectralCentroid) // Color intensity
#define PROBE_C (knob_72) // Pattern scale
#define PROBE_D (knob_73) // Fractal detail
#define PROBE_E (knob_74) // Color blend
#define PROBE_F (knob_75) // Pattern evolution
#define PROBE_G (knob_76)


vec3 palette(in float t)
{

    // vec3 a = vec3(0.138, 0.189, 0.761); vec3 b = vec3(0.448, 0.797, 0.568); vec3 c = vec3(0.591, 1.568, 0.065); vec3 d = vec3(4.347, 2.915, 0.976);

    vec3 a=vec3(0.,.500 * PROBE_D,.500);
    vec3 b=vec3(2.,.500 * PROBE_D,.490);
    vec3 c=vec3(2.,2.,.500 * PROBE_D);
    vec3 d=vec3(0.,.667 * PROBE_D,.500);
    vec3 baseColor=a+b*cos(TAU*(c*t+d));
    // rotate hue by the centroid
    vec3 hsl=rgb2hsl(baseColor);
    return hsl2rgb(hsl);

}

vec3 saturate(vec3 col) {
  vec3 base =  clamp(col, 0.0, 1.0);
  return hslmix(base, palette(PROBE_G), PROBE_B);
}

void rot(inout vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

vec2 mod2(inout vec2 p, vec2 size)  {
  vec2 c = floor((p + size*0.5)/size);
  p = mod(p + size*0.5,size) - size*0.5;
  return c * PROBE_B;
}

vec2 modMirror2(inout vec2 p, vec2 size) {
  vec2 halfsize = size*0.5;
  vec2 c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  p *= mod(c,vec2(2.0))*2.0 - vec2(1.0);
  return c;
}


vec2 toSmith(vec2 p)  {
  // z = (p + 1)/(-p + 1)
  // (x,y) = ((1+x)*(1-x)-y*y,2y)/((1-x)*(1-x) + y*y)
  float d = (1.0 - p.x)*(1.0 - p.x) + p.y*p.y;
  float x = (1.0 + p.x)*(1.0 - p.x) - p.y*p.y;
  float y = 2.0*p.y;
  return vec2(x,y)/d;
}

vec2 fromSmith(vec2 p)  {
  // z = (p - 1)/(p + 1)
  // (x,y) = ((x+1)*(x-1)+y*y,2y)/((x+1)*(x+1) + y*y)
  float d = (p.x + 1.0)*(p.x + 1.0) + p.y*p.y;
  float x = (p.x + 1.0)*(p.x - 1.0) + p.y*p.y;
  float y = 2.0*p.y;
  return vec2(x,y)/d;
}

vec2 toRect(vec2 p) {
  return vec2(p.x*cos(p.y), p.x*sin(p.y));
}

vec2 toPolar(vec2 p) {
  return vec2(length(p), atan(p.y, p.x));
}

float box(vec2 p, vec2 b) {
  vec2 d = abs(p)-b;
  return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0)*PROBE_A;
}

float circle(vec2 p, float r) {
  return length(p) - r;
}



float mandala_df(float localTime, vec2 p) {
  vec2 pp = toPolar(p);
  float segments = 32.0 + 32.0 * PROBE_C; // Pattern scale
  float a = TAU/segments;
  float np = pp.y/a;
  pp.y = mod(pp.y, a);
  float m2 = mod(np, 2.0);
  if (m2 > 1.0) {
    pp.y = a - pp.y;
  }

  pp.y += localTime * (0.2 + 0.3 * PROBE_F); // Pattern evolution
  p = toRect(pp);
  p = abs(p);
  p -= vec2(0.5 + 0.2 * PROBE_B); // Intensity

  float d = 10000.0;

  int iterations = 3 + int(2.0 * PROBE_D); // Detail level
  for (int i = 0; i < iterations; ++i) {
    mod2(p, vec2(1.0));
    float da = -0.2 * cos(localTime*0.25);
    float size = 0.35 + 0.15 * PROBE_C; // Pattern scale
    float sb = box(p, vec2(size)) + da;
    float cb = circle(p + vec2(0.2), size) + da;

    float dd = max(sb, -cb);
    d = min(dd, d);

    p *= 1.5 + (0.5 + 0.5*sin(0.5*localTime));
    rot(p, 1.0 + 0.5 * PROBE_A); // Base rotation
  }

  return d;
}

vec3 mandala_postProcess(float localTime, vec3 col, vec2 uv) {
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  col = clamp(col, 0.0, 1.0) * (1.0 + 0.5 * PROBE_B); // Color intensity

  vec3 colorBalance = mix(
    vec3(0.5, 0.75, 1.5),
    vec3(0.45),
    r
  );
  col = pow(col, colorBalance);

  col = col*0.6 + 0.4*col*col*(3.0-2.0*col);
  col = mix(col, vec3(dot(col, vec3(0.33))), -0.4);

  col *= sqrt(1.0 - sin(-localTime + (50.0 - 25.0*sqrt(r))*r)) *
         (1.0 - sin(0.5*r));

  float blendFactor = 0.75 + 0.25 * PROBE_E; // Color blend
  float ff = pow(1.0-blendFactor*sin(20.0*(0.5*a + r + -0.1*localTime)), 0.75);
  col = pow(col, vec3(ff*0.9, 0.8*ff, 0.7*ff));

  col *= 0.5*sqrt(max(4.0 - r*r, 0.0));

  return clamp(col, 0.0, 1.0);
}

vec2 mandala_distort(float localTime, vec2 uv) {
  float lt = 0.1*localTime * PROBE_A;
  vec2 suv = toSmith(uv);
  suv += 1.0*vec2(cos(lt), sin(sqrt(2.0)*lt));
//  suv *= vec2(1.5 + 1.0*sin(sqrt(2.0)*time), 1.5 + 1.0*sin(time));
  uv = fromSmith(suv);
  modMirror2(uv, vec2(2.0+sin(lt)));
  return uv;
}

vec3 mandala_sample(float localTime, vec2 p)
{
  float lt = 0.1*localTime;
  vec2 uv = p;
  uv *=8.0;
  rot(uv, lt);
  //uv *= 0.2 + 1.1 - 1.1*cos(0.1*iTime);

  vec2 nuv = mandala_distort(localTime, uv);
  vec2 nuv2 = mandala_distort(localTime, uv + vec2(0.0001));

  float nl = length(nuv - nuv2);
  float nf = 1.0 - smoothstep(0.0, 0.002, nl);

  uv = nuv;

  float d = mandala_df(localTime, uv);

  vec3 col = vec3(0.0);

  float r = energy;

  float nd = d / r;
  float md = mod(d, r);

  if (abs(md) < PROBE_B) {
    col = (d > 0.0 ? vec3(0.25, 0.65, 0.25) : vec3(0.65, 0.25, 0.65) )/abs(nd);
  }

  if (abs(d) < PROBE_C) {
    col = vec3(1.0);
  }

  col += 1.0 - pow(nf, 5.0);

  col = mandala_postProcess(localTime, col, uv);;

  col += 1.0 - pow(nf, PROBE_D);

  return saturate(col);
}

vec3 mandala_main(vec2 p) {

  float localTime = PROBE_C;
  vec3 col  = vec3(0.0);
  vec2 unit = 1.0/iResolution.xy;
  const int aa = 2;
  for(int y = 0; y < aa; ++y)
  {
    for(int x = 0; x < aa; ++x)
    {
      col += mandala_sample(localTime, p - 0.5*unit + unit*vec2(x, y));
    }
  }

  col /= float(aa*aa);
  return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
  vec2 uv = fragCoord/iResolution.xy - vec2(0.5);
  uv.x *= iResolution.x/iResolution.y;

  vec3 col = mandala_main(uv);

  fragColor = vec4(col, 1.0);

}
