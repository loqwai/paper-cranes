// License CC0: Apollian with a twist
// Playing around with apollian fractalish


#define RESOLUTION      iResolution
//https://visuals.beadfamous.com/edit?knob_14=0.433&knob_14.min=0&knob_14.max=1&knob_15=0.52&knob_15.min=0&knob_15.max=1&knob_16=2.8&knob_16.min=-2&knob_16.max=2.8&knob_22=-0.512&knob_22.min=-2&knob_22.max=1&knob_4=0.394&knob_4.min=-2&knob_4.max=1&knob_17=-0.063&knob_17.min=-2&knob_17.max=1&knob_18=-1.386&knob_18.min=-2&knob_18.max=1
#define TAU             (2.0*PI)
#define L2(x)           dot(x, x)
#define ROT(a)          mat2(cos(a), sin(a), -sin(a), cos(a))
#define PSIN(x)         (0.5+0.5*sin(x))
uniform float knob_14;
uniform float knob_15;
uniform float knob_16;
uniform float knob_17;
#define PI 3.1415926535897932384626433832795
#define B mix(0.68,1.,energyZScore)
#define A 15.841
#define C 1.0
#define D knob_14
#define E knob_16

#define TIME 0.
vec3 hsv2rgb(vec3 c) {
  const vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float apollian(vec4 p, float s) {
  float scale = 1. + B;

  for(int i=0; i<7; ++i) {
    p        = -1.0 + 2.0*fract(0.5*p+0.5);

    float r2 = dot(p,p);

    float k  = s/r2;
    p       *= k;
    scale   *= k;
  }

  return abs(p.y)/scale;
}

float weird(vec2 p) {
  float z = 4.0;
  p *= ROT(TIME*0.1);
  float tm = 0.2*TIME;
  float r = 0. + (A);
  vec4 off = vec4(r*PSIN(tm*sqrt(C)), r*PSIN(tm*sqrt(1.5)), r*PSIN(tm*sqrt(2.0)), 0.0);
  vec4 pp = vec4(p.x, p.y, 0.0, 0.0)+off;
  pp.w = 0.125*(1.0-tanh(length(pp.xyz)));
  pp.yz *= ROT(tm);
  pp.xz *= ROT(tm*sqrt(mapValue(C,0.,1.,1.05,3.)));
  pp /= z;
  float d = apollian(pp, 1. + mapValue(B,0.,1.,-2.,2.)/3.);
  return d*z;
}

float df(vec2 p) {
  const float zoom = 0.5;
  p /= zoom;
  float d0 = weird(p);
  return d0*zoom;
}

vec3 color(vec2 p) {
  float aa   = 2.0/RESOLUTION.y;
   float lw = 0.0235;
   float lh = 1.25*E*2.;

   vec3 lp1 = vec3(0.5, lh, 0.5);
  vec3 lp2 = vec3(-0.5, lh, 0.5);

  float d = df(p);

  float b = -0.125 * E;
  float t = 10.0;

  vec3 ro = vec3(0.0, t, 0.0);
  vec3 pp = vec3(p.x, 0.0, p.y);

  vec3 rd = normalize(pp - ro);

  vec3 ld1 = normalize(lp1 - pp);
  vec3 ld2 = normalize(lp2 - pp);

  float bt = -(t-b)/rd.y;

  vec3 bp   = ro + bt*rd;
  vec3 srd1 = normalize(lp1-bp);
  vec3 srd2 = normalize(lp2-bp);
  float bl21= L2(lp1-bp);
  float bl22= L2(lp2-bp);

  float st1= (0.0-b)/srd1.y;
  float st2= (0.0-b)/srd2.y;
  vec3 sp1 = bp + srd1*st1;
  vec3 sp2 = bp + srd2*st1;

  float bd = df(bp.xz);
  float sd1= df(sp1.xz);
  float sd2= df(sp2.xz);

  vec3 col  = vec3(0.0);
  float ss =15.0;

  col       += vec3(1.0, 1.0, 1.0)*(1.0-exp(-ss*(max((sd1+0.0*lw), 0.0))))/bl21;
  col       += vec3(0.5)*(1.0-exp(-ss*(max((sd2+0.0*lw), 0.0))))/bl22;
  float l   = length(p);
  float hue = fract(0.75*l-0.3*TIME)+0.3+0.15;
  float sat = 0.75*tanh(2.0*l);
  vec3 hsv  = vec3(hue, sat, 1.0);
  vec3 bcol = hsv2rgb(hsv);
  col       *= (1.0-tanh(0.75*l))*0.5;
  col       = mix(col, bcol, smoothstep(-aa, aa, -d));
  col       += 0.5*sqrt(bcol.zxy)*(exp(-(10.0+100.0*tanh(l))*max(d, 0.0)));

  return col;
}

vec3 postProcess(vec3 col, vec2 q)  {
  col=pow(clamp(col,0.0,1.0),vec3(1.0/2.2));
  col=col*0.6+0.4*col*col*(3.0-2.0*col);  // contrast
  col=mix(col, vec3(dot(col, vec3(0.33))), -0.4);  // saturation
  col*=0.5+0.5*pow(19.0*q.x*q.y*(1.0-q.x)*(1.0-q.y),0.7);  // vigneting
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q = fragCoord/RESOLUTION.xy;
  vec2 p = -1. + 2. * q;
  p.x *= RESOLUTION.x/RESOLUTION.y;

  vec3 col = color(p);
  col = postProcess(col, q);

  fragColor = vec4(col, 1.0);
}
