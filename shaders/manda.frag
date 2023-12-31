#version 300 es
precision highp float;
// Assuming these uniforms are passed to the shader
uniform float time;// iTime equivalent        // Normalized energy

uniform sampler2D prevFrame;// Texture of the previous frame
uniform vec2 resolution;// iResolution equivalent

uniform float spectralCentroidNormalized;
uniform float spectralCentroidZScore;
uniform float spectralCentroid;
uniform float spectralSkewMean;
uniform float spectralCrest;
uniform float energyNormalized;
uniform float spectralFluxNormalized;
uniform float spectralFluxZScore;
uniform float spectralFluxMax;
uniform float spectralFluxMean;
uniform float spectralSpreadMax;
uniform float spectralSpreadZScore;
uniform float energyMax;
uniform float energyMin;
uniform float energyStandardDeviation;
uniform float energyMean;
uniform float energyZScore;
uniform float spectralEntropyMin;
uniform float spectralEntropyMax;
uniform float spectralRoughness;
uniform float spectralRoughnessNormalized;
uniform bool beat;
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
}vec3 palette(float t,float hueShift,float saturationFactor,float lightnessFactor){
  vec3 a=vec3(.5,.5,.5);
  vec3 b=vec3(.5,.5,.5);
  vec3 c=vec3(1.,1.,1.);
  vec3 d=vec3(.263,.416,.557);
  
  vec3 color=a+b*cos(6.28318*(c*t+d));
  vec3 hsl=rgb2hsl(color);
  hsl.x+=hueShift;// Adjust hue
  hsl.y*=saturationFactor;// Adjust saturation
  hsl.z*=lightnessFactor/1.1;// Adjust lightness
  return hsl2rgb(hsl);
}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=(fragCoord*2.-resolution.xy)/resolution.y;
  vec2 uv0=uv;
  
  // Audio-driven parameters for rotation, speed, and complexity
  float rotationFactor=spectralCentroidZScore;// Example rotation based on spectral centroid
  float speedFactor=energyNormalized/10.;// Example speed based on energy
  float complexity=4.+spectralFluxNormalized*3.;// Complexity based on spectral flux
  
  vec3 finalColor=vec3(0.);
  
  for(float i=0.;i<complexity;i++){
    uv=fract(uv*1.5)-.5;
    // rotate uv around center
    uv*=mat2(cos(rotationFactor),sin(rotationFactor),-sin(rotationFactor),cos(rotationFactor));
    
    float d=length(uv)*exp(-length(uv0));
    
    vec3 col=palette(length(uv0)+i*.4+time*speedFactor*.9,spectralCentroidZScore,1.+spectralFluxNormalized,1.+energyZScore);
    
    d=sin(d*8.+time*speedFactor)/8.;// Apply speed factor
    d=abs(d);
    
    d=pow(.01/d,1.2);
    
    finalColor+=col*d;
  }
  
  fragColor=normalize(vec4(finalColor,1.));
}

void main(){
  mainImage(fragColor,gl_FragCoord.xy);
}
