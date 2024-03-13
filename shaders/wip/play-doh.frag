#define MAX_DIST 10.

float hash(vec3 p) {
    return fract(
        1e4 * sin(17.24*p.x+.24*p.y+3.12*p.z) * (.1+abs(sin(p.y*13.+p.x+5.*p.z))));
}
float smin( float a, float b, float k )
{
    k *= 1.0;
    float res = exp2( -a/k ) + exp2( -b/k );
    return -k*log2( res );
}
float opSmoothIntersection( float d1, float d2, float k )
{
    float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) + k*h*(1.0-h);
}
vec3 spc = vec3(1.8,1.,1.8);
float sdPyramid( vec3 p, float h )
{
  float m2 = h*h + 0.25;

  p.xz = abs(p.xz);
  p.xz = (p.z>p.x) ? p.zx : p.xz;
  p.xz -= 0.5;

  vec3 q = vec3( p.z, h*p.y - 0.5*p.x, h*p.x + 0.5*p.y);

  float s = max(-q.x,0.0);
  float t = clamp( (q.y-0.5*p.z)/(m2+0.25), 0.0, 1.0 );

  float a = m2*(q.x+s)*(q.x+s) + q.y*q.y;
  float b = m2*(q.x+0.5*t)*(q.x+0.5*t) + (q.y-m2*t)*(q.y-m2*t);

  float d2 = min(q.y,-q.x*m2-q.y*0.5) > 0.0 ? 0.0 : min(a,b);

  return sqrt( (d2+q.z*q.z)/m2 ) * sign(max(q.z,-p.y));
}

vec4 scene(vec3 p) {
    p.z -= iTime*.1;
    vec3 id = round(p/spc);
    vec3 p2 = p-spc*id;
    float d1 = length(p2)-.4;
    return vec4(d1, id);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(.001, 0);
    vec3 r = vec3(
        scene(p+e.xyy).x-scene(p-e.xyy).x,
        scene(p+e.yxy).x-scene(p-e.yxy).x,
        scene(p+e.yyx).x-scene(p-e.yyx).x
    );
    return normalize(r);
}


vec3 getPrimColor(vec3 id) {
    float v = hash(id);
    vec3 red = vec3(.0,.9,.9);
    if (v<.5) return vec3(1.22,.0,.35);
    else if (v<.92) return vec3(.5,.0,1.2);
    else            return mix(red, vec3(.5,.0,1.2), pow(cos(iTime+dot(id,vec3(1)))*.5+.5,4.));
}

bool hit = false;
float d = 0.;
vec3 nor = vec3(0);

vec3 castRay(vec3 ro, vec3 rd) {
    vec3 id = vec3(0);
    float td = 0.;
    for (int i = 0; i < 128; i++) {
        vec4 res = scene(ro + td*rd);
        float d = res.x;
        id = res.yzw;
        td += d;
        if (d < .001) {
            hit = true;
            break;
        }
        if (td > MAX_DIST)
            break;
    }
    d = td;
    vec3 p = ro + rd*d;
    nor = calcNormal(p);
    vec3 tp = p-spc*round(p/spc);

    float stripes = asin(sin(dot(p.zz,vec2(46))));
    float dif = length(sin(abs(nor)*1.5)*.5+.5)/sqrt(3.);
    float fres = 1.-pow(1.-abs(dot(rd,nor)), 1.);
    float ao = hit ? smoothstep(-.15,.15,scene(p+nor*.3).x)
                   * smoothstep(-.3,.3,scene(p+nor*.1).x) : 1.;

    vec3 col  = smoothstep(-.05,.05,stripes) * vec3(.7);
    col += dif * getPrimColor(id);
    col *= fres;
    return vec3(.75-col);
}

mat3 rotz(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(
    c, 0.0, -s,
    0.0, 1.0, 0.0,
    s, 0.0, c
  );
}
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord-.5*iResolution.xy)/iResolution.y;
    float tm = iTime*.15;
#if 0
    vec3 ro = 2.5*vec3(cos(tm), sin(tm)*.5, sin(tm));
    vec3 ww = normalize(vec3(0) - ro);
    vec3 uu = normalize(cross(vec3(0,1,0), ww));
    vec3 vv = normalize(cross(ww, uu));
    vec3 rd = normalize(uv.x*uu + uv.y*vv + 1.5*ww);
#else
    vec3 ro = vec3(.5,3.25,1.2);
    vec3 rd = normalize(vec3(uv, -1.));
    //float a = 0.;
    //ro = ro*rotz(a);
    //rd = rd*rotz(a);
#endif

    vec3 col = castRay(ro, rd);
          vec3 p = ro + rd*d;
  if (hit) {
        vec3 nor0 = calcNormal(p);
        vec3 dir = reflect(rd, nor);
        vec3 ref = castRay(p+nor*.01, dir) - d*.2;
        float fres = 1.-pow(abs(dot(rd,nor0)), .4);
        col = mix(col, ref, smoothstep(.0, 1.5, fres));
    }
    float fog = clamp(exp2(.1*distance(ro,p)) - 1.,0.,1.);
    col = mix(col, vec3(0), fog);
    col = pow(col, vec3(1./2.2));
    fragColor.xyz = col;
}
