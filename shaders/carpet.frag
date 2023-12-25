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

vec2 triangle_wave(vec2 a){
  vec2 a2=
  vec2(1.,.5)
  ,
  a1=a+a2;
  return abs(fract((a1)*(a2.x+a2.y))-.5);
}

const float scale=1.5;

void transform(inout vec2 uv,inout vec2 t2){
  t2=triangle_wave(uv+.5);
  uv=
  t2-triangle_wave(uv.yx)-fract(t2/2.)
  ;
}

vec3 fractal(vec2 uv){
  vec3 col=vec3(0.);
  vec2 t2=vec2(0.);
  vec3 col1=col;
  float c1=0.;
  for(int k=0;k<12;k++){
    float warp_scale=16.+energyZScore;
    if(beat)warp_scale*=1.05;
    vec2 warp=
    vec2(sin((t2.x)*warp_scale),cos((t2.y)*warp_scale))
    ;
    uv.y-=1./4.;
    
    uv=(uv+t2)/scale;
    
    uv=(fract(vec2(uv+vec2(.5,1.5))*scale)-.5)/scale;
    col.x=
    max(length(uv-t2-c1)/3.,col.x);
    
    ;
    if(k>1)
    warp=warp*warp/warp_scale;
    else
    warp=vec2(0);
    
    vec2 uv_1=
    uv+warp.yx
    ,
    t2_1=
    t2+warp.yx
    ;
    vec3 col_1=col;
    transform(uv,t2);
    transform(uv_1,t2_1);
    
    c1=
    max(abs(uv_1.y+uv_1.x)/2.,c1)
    ;
    c1=
    max(1.-abs(2.*c1-1.),c1/4.)
    ;
    col.x=
    max(length(uv_1-t2_1-c1)/3.,col.x)
    
    ;
    col=
    abs(col-(1.-(c1*col.x)));
    col1=
    abs(col1*c1-col-1.).yzx;
  }
  return col1;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord,float time)
{
  fragColor=vec4(0.);
  float t1=4.;
  
  vec2 uv=(fragCoord)/resolution.y/t1/2.;
  uv.xy+=time/t1/12.+(spectralCentroid/100.)/2.;
  vec3 col1=fractal(uv);
  fragColor=vec4(col1/2.,1.);
}

void main(void){
  mainImage(fragColor,gl_FragCoord.xy,time);
  
}
