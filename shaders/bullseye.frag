#version 300 es
precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform bool beat;
out vec4 fragColor;
uniform float spectralCentroidNormalized;
uniform float spectralCentroidZScore;
uniform float spectralCentroid;
uniform float spectralCrest;
uniform float energyNormalized;
uniform float spectralFluxNormalized;
uniform float spectralFluxMax;
uniform float spectralSpreadMax;
uniform float spectralSpreadZScore;
uniform float energyMax;
uniform float energyMin;
uniform float energyStandardDeviation;
uniform float energyMean;
uniform float energyZScore;
uniform sampler2D prevFrame;
uniform float spectralRoughnessNormalized;
uniform int frame;
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

float getGrayPercent(vec4 color){
  vec3 hsl=rgb2hsl(color.rgb);
  return hsl.y;
}

// Enhanced Julia set distortion
vec2 enhancedJulia(vec2 uv,float time,float spectralFluxMax){
  float cRe=sin(time);
  float cIm=cos(time);

  int maxIter=100;// Adjusted for complexity
  for(int i=0;i<maxIter;i++){
    float x=uv.x*uv.x-uv.y*uv.y+cRe;
    float y=2.*uv.x*uv.y+cIm;
    uv.x=x;
    uv.y=y;

    if(length(uv)>2.)break;
  }

  return uv;
}

float drawCircle(vec2 uv, vec2 center, float radius) {
    // Calculate the distance from the current fragment to the center
    float distanceFromCenter = distance(uv, center);

    // Check if the distance is less than the radius
    if (distanceFromCenter < radius) {
        return distanceFromCenter / radius; // Inside the circle
    } else {
        return 0.0; // Outside the circle
    }
}

// Main image function
vec4 mainImage(in vec2 fragCoord,float time){
  vec2 uv=fragCoord.xy/resolution.xy;
  vec2 rotatedUV = (uv - vec2(0.5)) * mat2(cos(time+energyMean), -sin(time+energyMean), sin(time+energyMean), cos(time+energyMean)) + vec2(0.5);

  uv = rotatedUV;

  vec3 color=vec3(0.);//hsl
  vec3 prevColor = rgb2hsl(texture(prevFrame,uv).rgb);
  // Calculate dynamic color based on audio features
  float distanceFromCircle = drawCircle(uv,vec2(spectralRoughnessNormalized-0.25, spectralCentroidZScore+0.25),tanh(energyZScore)/10.);
  if(distanceFromCircle > 0.){
    color.x =sin(time);
    color.y = spectralCentroid;
    color.z = 1.-distanceFromCircle;
    if(beat){
      color.x = 1.;
    }
  }
  else {
    vec3 distortedPrev = rgb2hsl(texture(prevFrame,uv.yx*0.99).rgb);
    vec2 uvj = enhancedJulia(uv*0.99,time,spectralFluxNormalized);
    distortedPrev.x += (uvj.x/100.);
    distortedPrev.y += (uvj.y/100.);
    return vec4(hsl2rgb(distortedPrev),1.);
  }
  // Mix with the previous frame's color for smooth transitions
  // color=mix(prevColor.rgb,color,.51);// Adjust mixing factor as needed
  // color=normalize(color);
  return vec4(hsl2rgb(color),1.);
}

void main(void){
  fragColor = mainImage(gl_FragCoord.xy,time);
}
