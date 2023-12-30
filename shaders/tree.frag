#version 300 es
precision highp float;

uniform float time;// time equivalent
uniform float energyNormalized;// Normalized energy
uniform float energyMean;// Mean energy
uniform float energyZScore;
uniform float spectralCentroidNormalized;// Normalized spectral centroid
uniform float spectralCentroid;
uniform float spectralSpreadZScore;
uniform sampler2D prevFrame;// Texture of the previous frame
uniform vec2 resolution;// Screen resolution
out vec4 fragColor;
// Fixed and optimized version of sillsm's shader (https://www.shadertoy.com/view/XtyGzh)

// Copyright Max Sills 2016, licensed under the MIT license.
//
// Inspired by Knighty's using base n encodings to explore
// n-ary IFS. Bounding volumes are trash.

// iq: I fixed and optimized the original shader. The idea of recursing a tree without a stack
// is a really good one. In the context of raymarching, the pruning can be done also based on a
// screen space pixel coverage threshold, but it's still too slow (tried a few months ago for
// bushes). Still, I made this variation on sillsm's shader for bug fixing it and for further study.
//
// Enable the define below in order to see the true distance field (very slow).

//#define TRUE_DISTANCE

#define kDepth 4
#define kBranches 3
#define kMaxDepth 128// branches ^ depth

vec3 rgb2hsl(vec3 color){
  float maxColor=max(max(color.r,color.g),color.b);
  float minColor=min(min(color.r,color.g),color.b);
  float delta=maxColor-minColor;
  
  float h=0.f;
  float s=0.f;
  float l=(maxColor+minColor)/2.f;
  
  if(delta!=0.f){
    s=l<.5f?delta/(maxColor+minColor):delta/(2.f-maxColor-minColor);
    
    if(color.r==maxColor){
      h=(color.g-color.b)/delta+(color.g<color.b?6.f:0.f);
    }else if(color.g==maxColor){
      h=(color.b-color.r)/delta+2.f;
    }else{
      h=(color.r-color.g)/delta+4.f;
    }
    h/=6.f;
  }
  
  return vec3(h,s,l);
}

// Helper function for HSL to RGB conversion
float hue2rgb(float p,float q,float t){
  if(t<0.f)
  t+=1.f;
  if(t>1.f)
  t-=1.f;
  if(t<1.f/6.f)
  return p+(q-p)*6.f*t;
  if(t<1.f/2.f)
  return q;
  if(t<2.f/3.f)
  return p+(q-p)*(2.f/3.f-t)*6.f;
  return p;
}

// Function to convert HSL to RGB
vec3 hsl2rgb(vec3 hsl){
  float h=hsl.x;
  float s=hsl.y;
  float l=hsl.z;
  
  float r,g,b;
  
  if(s==0.f){
    r=g=b=l;// achromatic
  }else{
    float q=l<.5f?l*(1.f+s):l+s-l*s;
    float p=2.f*l-q;
    r=hue2rgb(p,q,h+1.f/3.f);
    g=hue2rgb(p,q,h);
    b=hue2rgb(p,q,h-1.f/3.f);
  }
  
  return vec3(r,g,b);
}

float getGrayPercent(vec4 color){
  vec3 hsl=rgb2hsl(color.rgb);
  return hsl.y;
}

//--------------------------------------------------------------------------

mat3 matRotate(float angle)
{
  float c=cos(angle);
  float s=sin(angle);
  return mat3(c,s,0,-s,c,0,0,0,1);
}

mat3 matTranslate(float x,float y)
{
  return mat3(1,0,0,0,1,0,-x,-y,1);
}

float sdBranch(vec2 p,float w1,float w2,float l)
{
  float h=clamp(p.y/l,0.,1.);
  float d=length(p-vec2(0.,l*h));
  return d-mix(w1,w2,h);
}

//--------------------------------------------------------------------------

float map(vec2 pos)
{
  const float len=3.2;
  const float wid=.3;
  const float lenf=.6;
  const float widf=.4;
  
  float d=sdBranch(pos,wid,wid*widf,len);
  
  int c=0;
  for(int count=0;count<kMaxDepth;count++)
  {
    int off=kMaxDepth;
    vec2 pt_n=pos;
    
    float l=len;
    float w=wid;
    
    for(int i=1;i<=kDepth;i++)
    {
      l*=lenf;
      w*=widf;
      
      off/=kBranches;
      int dec=c/off;
      int path=dec-kBranches*(dec/kBranches);//  dec % kBranches
      
      mat3 mx;
      if(path==0)
      {
        mx=matRotate(.75+.25*sin(time-1.))*matTranslate(0.,.4*l/lenf);
      }
      else if(path==1)
      {
        mx=matRotate(-.6+.21*sin(time))*matTranslate(0.,.6*l/lenf);
      }
      else
      {
        mx=matRotate(.23*sin(time+1.))*matTranslate(0.,1.*l/lenf);
      }
      pt_n=(mx*vec3(pt_n,1)).xy;
      
      // bounding sphere test
      float y=length(pt_n-vec2(0.,l));
      if(y-(energyZScore+2.5)*l>0.){c+=off-1;break;}
      
      d=min(d,sdBranch(pt_n,w,w*widf,l));
    }
    
    c++;
    if(c>kMaxDepth)break;
  }
  
  return d;
}

vec2 enhancedJulia(vec2 uv,float time,float spectralCentroid){
  float cRe=sin(time*spectralCentroid);
  float cIm=cos(time*spectralCentroid);
  
  int maxIter=4;// Adjusted for complexity
  for(int i=0;i<maxIter;i++){
    float x=uv.x*uv.x-uv.y*uv.y+cRe;
    float y=2.*uv.x*uv.y+cIm;
    uv.x=x;
    uv.y=y;
    
    if(length(uv)>2.)break;
  }
  
  return uv;
}

vec4 mainImage(in vec2 fragCoord)
{
  vec4 color=vec4(0.);
  vec2 uv=((fragCoord-.5*resolution.xy)/resolution.y)*(1.+energyMean);
  vec4 prevColor=vec4(rgb2hsl(texture(prevFrame,uv)),1.);
  vec2 uvJulia=enhancedJulia(uv,time,spectralCentroid)*(1.+energyZScore);
  vec4 prevColorJulia=rgb2hsl(texture(prevFrame,uvJulia));
  uv.x=(uv.x+(uvJulia.x/20.))/1.5;
  uv.x=sin(uv.x+time*spectralCentroid);
  uv.y=cos(uv.y+time*spectralCentroid);
  float px=2./resolution.y;
  // frame in screen
  uv=uv*4.+vec2(0.,3.5);
  px=px*4.;
  
  // compute
  float d=map(uv);
  
  // shape
  vec3 cola=vec3(smoothstep(0.,2.*px,d));
  
  // distance field
  vec3 colb=vec3(pow(abs(d),.4)*.5+.015*sin(40.*d));
  
  // derivatives
  
  float eps=.1/resolution.y;
  vec2 der=vec2(map(uv+vec2(eps,0.))-d,map(uv+vec2(0.,eps))-d)/eps;
  vec3 colc=vec3(.5+.5*der.x,.5+.5*der.y,0.)*clamp(abs(d)*8.+.2,0.,1.);
  
  // final color
  float t=fract(.2+time/11.);
  
  vec3 col=mix(colc,cola,smoothstep(0.,.05,t));
  col=mix(col,colb,smoothstep(.30,.35,t));
  col=mix(col,colc,smoothstep(.60,.65,t));
  
  color=vec4(col,1.);
  vec3 prevHsl=rgb2hsl(prevColor.rgb);
  vec3 hsl=rgb2hsl(color.rgb);
  if(hsl.z>prevHsl.z){
    return mix(color,prevColor,.7);
  }
  return mix(prevColor,color,.1);
}

void main(void){
  fragColor=mainImage(gl_FragCoord.xy);
}
