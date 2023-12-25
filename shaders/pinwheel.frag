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
uniform float spectralFluxStandardDeviation;
uniform int frame;

out vec4 fragColor;

// Function to create a 'pinwheel' with adjustable spin, colors, wing length, radius, and ripple effect
vec3 createPinwheel(vec2 uv,float radius,vec3 color1,vec3 color2,float wingLength,float spin,float ripple,vec2 distort){
  float radialDist=length(uv-distort)*2.;
  radialDist=radialDist/radius;
  
  // Ripple effect
  radialDist+=sin(radialDist*20.+ripple*2.*3.14159)*.05;
  
  float angle=atan(uv.y,uv.x)+spin*2.*3.14159;
  
  vec3 rainbow=mix(color1,color2,(cos(angle*6.+radialDist*wingLength)+1.)/2.);
  rainbow*=smoothstep(1.,.3,radialDist);
  
  return rainbow;
}
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

vec2 getPosition(float time,int pinwheelCount,float radius){
  float angle=time*2.*3.14159/float(pinwheelCount);
  float x=cos(angle)*radius;
  float y=sin(angle)*radius;
  return vec2(x/2.,y/2.);
}
vec3 color1=vec3(.2,.1,.9);
vec3 color2=vec3(.9,.1,.2);
void mainImage(out vec4 fragColor,in vec2 fragCoord,float time){
  float spin=1.;
  vec2 uv=(fragCoord-.5*resolution.xy)/min(resolution.y,resolution.x);
  
  vec3 finalColor=vec3(0.);
  
  float orbitRadius=(energyZScore+2.5)/10.;
  int totalPinwheels=int(min(10.,energyMax*100.)+(energyZScore+2.5));
  
  for(int i=0;i<totalPinwheels;i++){
    // Calculate pinwheel position
    vec2 position=getPosition(float(i),totalPinwheels,orbitRadius);
    vec2 pinwheelCenter=(vec2(.5,.5)+position)*resolution.xy;// Adjust to screen coordinates
    vec2 pinwheelPos=(fragCoord-pinwheelCenter)/min(resolution.y,resolution.x);
    float j=float(i)*time*.1;
    vec3 hslColor1=rgb2hsl(color1);
    vec3 hslColor2=rgb2hsl(color2);
    hslColor1.x+=j+(spectralFluxStandardDeviation/100.);
    hslColor2.x-=j;
    color1=hsl2rgb(hslColor1);
    color2=hsl2rgb(hslColor2);
    float wingLength=energyNormalized*2.;
    
    float ripple=1.;
    vec2 distort=vec2(0.);
    vec3 pinwheelColor=createPinwheel(pinwheelPos,orbitRadius,color1,color2,wingLength,spin,ripple,distort);
    finalColor=max(finalColor,pinwheelColor);
  }
  
  fragColor=vec4(finalColor,1.);
}

void main(void){
  mainImage(fragColor,gl_FragCoord.xy,time);
}
