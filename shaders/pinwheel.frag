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
out vec4 fragColor;
// Function to create a 'pinwheel' with adjustable spin, colors, wing length, radius, and ripple effect

vec3 createPinwheel(vec2 uv,float radius,vec3 color1,vec3 color2,float wingLength,float spin,float ripple){
  float radialDist=length(uv)*2.;
  radialDist=radialDist/radius;
  
  // Ripple effect
  radialDist+=sin(radialDist*20.+ripple*2.*3.14159)*.05;
  
  float angle=atan(uv.y,uv.x)+spin*2.*3.14159;
  
  vec3 rainbow=mix(color1,color2,(cos(angle*6.+radialDist*wingLength)+1.)/2.);
  rainbow*=smoothstep(1.,.3,radialDist);
  
  return rainbow;
}

float spin=0.;
void mainImage(out vec4 fragColor,in vec2 fragCoord,float time){
  vec2 uv=(fragCoord-.5*resolution.xy)/min(resolution.y,resolution.x);
  
  vec3 baseColor=vec3(.1,.2,.3);// Adjust these values for different base colors
  float seed=1.61803398875;// Golden ratio for interesting fractal patterns
  
  vec3 finalColor=vec3(0.);
  
  // Define properties and movement for 10 pinwheels
  for(int i=0;i<1;i++){
    float t=time*.1+float(i);
    float x=0.;
    float y=float(i)/10.;
    float radius=1.;
    vec3 color1=vec3(.3,.1,1.);
    vec3 color2=vec3(0.,.9,.1);
    float wingLength=5.;
    
    float ripple=cos(spin);
    
    vec2 pinwheelPos=uv-vec2(x,y);
    vec3 pinwheelColor=createPinwheel(pinwheelPos,radius,color1,color2,wingLength,spin,ripple);
    finalColor=max(finalColor,pinwheelColor);
  }
  
  fragColor=vec4(finalColor,1.);
}

void main(void){
  mainImage(fragColor,gl_FragCoord.xy,time);
}
