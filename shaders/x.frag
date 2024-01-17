// Shpaes distance func
float sdSphere(vec3 p,float s)
{
  return length(p)-s;
}
float sdTorus(vec3 p,vec2 t)
{
  vec2 q=vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}
float sdOctahedron(vec3 p,float s)
{
  p=abs(p);
  float m=p.x+p.y+p.z-s;
  vec3 q;
  if(3.*p.x<m)q=p.xyz;
  else if(3.*p.y<m)q=p.yzx;
  else if(3.*p.z<m)q=p.zxy;
  else return m*.57735027;

  float k=clamp(.5*(q.z-q.y+s),0.,s);
  return length(vec3(q.x,q.y-s+k,q.z-k));
}

float sdPyramid(vec3 p,float h)
{
  float m2=h*h+.25;

  p.xz=abs(p.xz);
  p.xz=(p.z>p.x)?p.zx:p.xz;
  p.xz-=.5;

  vec3 q=vec3(p.z,h*p.y-.5*p.x,h*p.x+.5*p.y);

  float s=max(-q.x,0.);
  float t=clamp((q.y-.5*p.z)/(m2+.25),0.,1.);

  float a=m2*(q.x+s)*(q.x+s)+q.y*q.y;
  float b=m2*(q.x+.5*t)*(q.x+.5*t)+(q.y-m2*t)*(q.y-m2*t);

  float d2=min(q.y,-q.x*m2-q.y*.5)>0.?0.:min(a,b);

  return sqrt((d2+q.z*q.z)/m2)*sign(max(q.z,-p.y));
}

float sdEllipsoid(vec3 p,vec3 r)
{
  float k0=length(p/r);
  float k1=length(p/(r*r));
  return k0*(k0-1.)/k1;
}

//Utils

float smin(float a,float b,float k)
{
  float h=max(k-abs(a-b),0.)/k;
  return min(a,b)-h*h*h*k*(1./6.);
}

vec3 rot3D(vec3 p,vec3 axis,float angle)
{
  return mix(dot(axis,p)*axis,p,cos(angle))+cross(axis,p)*sin(angle);
}

mat2 rot2D(float angle)
{
  float s=sin(angle);
  float c=cos(angle);

  return mat2(c,-s,s,c);
}

vec3 palette(float t){
  float t2=time*.05+energy;
  t2+=230.;// Time offset
  vec3 vector=vec3(
    clamp(smoothstep(.2,.8,.8+.5*sin(.6*t2)),.3,.7),
    clamp(smoothstep(.2,.8,.5+.5*cos(.8*t2+2.)),.5,.6),
    clamp(smoothstep(.2,.8,.5+.5*sin(1.5*t2+4.)),.2,.4)
  );

  return.5+.5*cos(6.28318*(t+vector));
}

float movementCurve(float x){
  return-2./(1.+exp(-10.*(.5*x-.5)))+1.;
}

float PI=3.1416;
float fovMult(float x,float a,float d)
{
  return a+d+sin(PI*x-sqrt(PI))*a;
}

//Render
float map(vec3 p)
{
  vec3 q=p;

  q.z+=time*.8;//smootherstep(0.,1.,sin(time));

  q.xy=fract(vec2(q.x,q.y))-.5;
  q.z=mod(q.z,spectralRoughnessNormalized)-.125;

  float oct=sdEllipsoid(q,vec3(fovMult(sin(time)*energyNormalized,spectralKurtosisNormalized,.01)*.3));
  oct+=sdOctahedron(q,fovMult(sin(time)*energyZScore,spectralKurtosisNormalized,.01)*.3);
  return oct;
}

vec2 getWarpedUV(vec2 uv){
  // Warping the UV coordinates based on spectral flux
  if(energyZScore>2.){
    uv.x+=sin(time*2.)*energyZScore*2.;
    uv.y+=cos(time*2.)*energyZScore*2.;
  }
  return fract(uv);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/resolution.y;
  uv*=rot2D(time/10.);

  vec3 ro=vec3(0.,0.,-5.);
  vec3 rd=normalize(vec3(uv/5.,1.));
  vec3 col=vec3(0.);

  float t=0.;
  for(int i=0;i<int(spectralRoughness/500.*(energyZScore+2.5))+100;i++){
    vec3 p=ro+rd*t;
    float d=map(p);
    t+=d;

    if(t>=10000.||d<=.003)break;
  }

  col=palette(t*.01);
  vec3 hsl=rgb2hsl(col);
  hsl.z+=energyMean/10.;
  hsl.x+=spectralCrestZScore/100.;
  if(beat)hsl.x+=.01;

  vec4 prevColor=getLastFrameColor(getWarpedUV(uv));
  fragColor=mix(prevColor,vec4(hsl2rgb(hsl),1.),beat?1.:.8);
}
