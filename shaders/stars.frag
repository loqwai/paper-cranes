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
uniform float spectralFluxMax;
out vec4 fragColor;

vec4 getLastFrameColor(vec2 uv){
  return texture(prevFrame,uv);
}

#define S(a,b,t)smoothstep(a,b,t)
#define NUM_LAYERS 4.

//#define SIMPLE

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
  float sparkle=0.;
  
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
  m+=sparkle*sPhase;//(*.5+.5);
  
  return m;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord,float time)
{
  vec2 uv=(fragCoord*2.-resolution.xy)/resolution.y;
  vec2 M=resolution.xy/resolution.y;
  
  float t=time*.1;
  
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
  
  float glow=-uv.y*spectralCentroid;
  
  vec3 baseCol=vec3(s,cos(t*.4),-sin(t*.24))*.4+.6;
  vec3 col=baseCol*m;
  col+=baseCol*glow;
  
  #ifdef SIMPLE
  uv*=10.;
  col=vec3(1)*NetLayer(uv,0.,time);
  uv=fract(uv);
  //if(uv.x>.98 || uv.y>.98) col += 1.;
  #else
  col*=1.-dot(uv,uv);
  t=mod(time,230.);
  col*=S(0.,20.,t)*S(224.,200.,t);
  #endif
  
  fragColor=vec4(col,1);
}
void main(void){
  mainImage(fragColor,gl_FragCoord.xy,time);
  
}
