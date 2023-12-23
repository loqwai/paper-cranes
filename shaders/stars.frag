#version 300 es
precision mediump float;
uniform bool beat;
uniform vec2 resolution;
uniform float time;
uniform sampler2D prevFrame;// Image texture
uniform float spectralSpreadZScore;
uniform float spectralCentroid;
uniform float spectralCentroidZScore;
uniform float energyZScore;
uniform float energyNormalized;
uniform float energyMax;
uniform float spectralFluxMax;
uniform float spectralFluxNormalized;
out vec4 fragColor;

// Function to convert RGB to HSL
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
vec4 getLastFrameColor(vec2 uv){
  return texture(prevFrame,uv);
}

#define S(a,b,t)smoothstep(a,b,t)
#define NUM_LAYERS 4.

float N21(vec2 p){
  vec3 a=fract(vec3(p.xyx)*vec3(213.897,653.453,253.098));
  a+=dot(a,a.yzx+79.76);
  return fract((a.x+a.y)*a.z);
}

vec2 GetPos(vec2 id,vec2 offs,float t){
  float n=N21(id+offs);
  float n1=fract(n*10.);
  float n2=fract(n*100.);
  float a=t+n;
  return offs+vec2(sin(a*n1),cos(a*n2))*.4;
}

float GetT(vec2 ro,vec2 rd,vec2 p){
  return dot(p-ro,rd);
}

float LineDist(vec3 a,vec3 b,vec3 p){
  return length(cross(b-a,p-a))/length(p-a);
}

float df_line(in vec2 a,in vec2 b,in vec2 p)
{
  vec2 pa=p-a,ba=b-a;
  float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
  return length(pa-ba*h);
}

float line(vec2 a,vec2 b,vec2 uv){
  float r1=.04;
  float r2=.01;
  
  float d=df_line(a,b,uv);
  float d2=length(a-b);
  float fade=S(1.5,.5,d2);
  
  fade+=S(.05,.02,abs(d2-.75));
  return S(r1,r2,d)*fade;
}

float NetLayer(vec2 st,float n,float t){
  vec2 id=floor(st)+n;
  
  st=fract(st)-.5;
  
  vec2 p[9];
  int i=0;
  for(float y=-1.;y<=1.;y++){
    for(float x=-1.;x<=1.;x++){
      p[i++]=GetPos(id,vec2(x,y),t);
    }
  }
  
  float m=0.;
  float sparkle=energyNormalized;
  
  for(int i=0;i<9;i++){
    m+=line(p[4],p[i],st);
    
    float d=length(st-p[i]);
    
    float s=(.005/(d*d));
    s*=S(1.,.7,d);
    float pulse=sin((fract(p[i].x)+fract(p[i].y)+t)*5.)*.4+.6;
    pulse=pow(pulse,20.);
    
    s*=pulse;
    sparkle+=s;
  }
  
  m+=line(p[1],p[3],st);
  m+=line(p[1],p[5],st);
  m+=line(p[7],p[5],st);
  m+=line(p[7],p[3],st);
  
  float sPhase=(sin(t+n)+sin(t*.1))*.25+.5;
  sPhase+=pow(sin(t*.1)*.5+.5,50.)*5.;
  sPhase+=energyMax;
  m+=sparkle*sPhase;//(*.5+.5);
  
  return m;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord,float time)
{
  vec2 uv=(fragCoord*2.-resolution.xy)/resolution.y;
  vec2 M=uv*=(1.+(spectralSpreadZScore/100.)*.5);
  time+=(energyNormalized/10.);
  float t=time*.1;
  if(beat)t*=1.1;
  float s=sin(t);
  float c=cos(t);
  mat2 rot=mat2(c,-s,s,c);
  vec2 st=uv*rot;
  M*=rot*2.;
  
  float m=0.;
  for(float i=0.;i<1.;i+=1./NUM_LAYERS){
    float z=fract(t+i);
    float size=mix(15.,1.,z);
    float fade=S(0.,.6,z)*S(1.,.8,z);
    
    m+=fade*NetLayer(st*size-M*z,i,time);
  }
  
  float glow=-uv.y*energyZScore;
  
  vec3 baseCol=vec3(s,cos(t*.4),-sin(t*.24))*.4+.6;
  vec3 col=baseCol*m;
  col+=baseCol*glow;
  
  col*=1.-dot(uv,uv);
  t=mod(time,230.);
  col*=S(0.,20.,t)*S(224.,200.,t);
  //rotate col hue by spectralFluxNormalized
  vec3 hsl=rgb2hsl(col);
  hsl.x+=spectralFluxNormalized;
  col=hsl2rgb(hsl);
  fragColor=vec4(col,1);
}
void main(void){
  mainImage(fragColor,gl_FragCoord.xy,time);
  
}
