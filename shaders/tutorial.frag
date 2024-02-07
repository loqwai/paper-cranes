#pragma glslify:import(./includes/full.frag)
#pragma glslify:import(./includes/shadertoy-compat.frag)

uniform float k1;

vec3 palette(float t){
  vec3 a=vec3(.8392,.3373,.3373);
  vec3 b=vec3(.0353,.1412,.4157);
  vec3 c=vec3(1.,1.,1.);
  vec3 d=vec3(0.,.33,.67);
  
  return a+b*cos(6.28318*(c*t+d));
}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=centerUv(resolution,fragCoord);
  vec2 uv0=uv;
  vec3 finalColor=vec3(0.);
  float sc=map(spectralCentroidNormalized,0.,20.,-1.,1.);
  for(float i=0.;i<3.;i++){
    vec3 col=palette(length(uv*sc)+time+i*4.);
    uv=fract(uv*5.*sc)-.5;
    float d=length(uv);
    
    d=sin(d*8.+time)/8.;
    d=abs(d);
    d=.02/d;
    col*=d;
    finalColor+=col;
  }
  
  // if this color is too gray, use opposite of the pixel from the last frame;
  vec3 hsl=rgb2hsl(finalColor);
  if(hsl.z>.5){
    float distortion=map(spectralCentroidNormalized,0.,20.,-1.,1.);
    vec3 last=getLastFrameColor(uv*distortion).rgb;
    finalColor=last;
  }
  if(hsl.z<.3){
    fragColor/=15.;
  }
  fragColor=vec4(finalColor,1.);
}

#pragma glslify:import(./includes/shadertoy-compat-main)
