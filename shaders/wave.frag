#version 300 es
precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform bool beat;
out vec4 fragColor;
uniform float spectralCentroidNormalized;
uniform float spectralCentroidZScore;
uniform float energyNormalized;
uniform float spectralFluxNormalized;
uniform float spectralSpreadMax;
uniform float spectralSpreadZScore;
uniform sampler2D prevFrame;
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

// Function to apply Julia set distortion
vec2 julia(vec2 uv,float time){
  vec3 prevColor=texture(prevFrame,uv).rgb;
  // Julia set parameters
  float cRe=sin(time)*.7885;
  float cIm=cos(time)*.7885;
  
  // Apply the Julia set formula
  int maxIter=64;
  for(int i=0;i<maxIter;i++){
    float x=uv.x*uv.x-uv.y*uv.y+cRe;
    float y=2.*uv.x*uv.y+cIm;
    uv.x=x;
    uv.y=y;
    
    // Break if the point escapes to infinity
    if(length(uv)>2.)break;
  }
  
  return uv;
}

// Main image function
void mainImage(out vec4 fragColor,in vec2 fragCoord,float time){
  time/=10.;
  vec2 uv=fragCoord.xy/resolution.xy;
  
  // Adjusted UV transformations for a more even distribution
  uv=uv+vec2(spectralSpreadMax,spectralSpreadMax)/10.;
  uv=uv+vec2(sin(time*2.)*(spectralCentroidNormalized-.5)/10.,
  cos(time*2.)*(spectralCentroidNormalized-.5)/10.);
  
  // Apply Julia set distortion with dynamic parameters
  uv=julia(uv,time);
  
  if(beat){
    uv=julia(uv,time);
  }
  if(spectralCentroidZScore>2.5){
    uv=julia(uv.yx,time);
  }
  
  // Sample previous frame color
  vec3 prevColor=texture(prevFrame,uv*.5+.5).rgb;
  
  // Select this pixel based on frame and spectral data
  if(uv.x*100.>mod(time*100.,100.)){
    prevColor=vec3(spectralCentroidNormalized,energyNormalized,spectralFluxNormalized);
    vec3 hsl=rgb2hsl(prevColor);
    hsl.z*=2.5+sin(uv.x);
    hsl.y*=2.5+sin(uv.y);
    prevColor=hsl2rgb(hsl);
  }
  // Normalize coordinates to -1.0 to 1.0 range for ripple effect
  vec2 rippleUv=uv*2.-1.;
  if(beat)rippleUv*=2.1;
  
  // Calculate ripple effect
  float distanceToCenter=length(rippleUv);
  float ripple=sin(distanceToCenter*(energyNormalized*15.)-time*2.)*.5+.5;
  
  // Generate psychedelic color
  float hue=mod(time*30.+distanceToCenter*120.+(spectralCentroidNormalized*30.),360.);
  vec3 color=hsl2rgb(vec3(hue,1.,.5));
  
  // Apply ripple effect
  color*=ripple;
  
  color=mix(prevColor,color,.91);
  // on even frames, we keep whichever color is more saturated
  // if(frame%2==0){
    //   vec3 hsl1=rgb2hsl(color);
    //   vec3 hsl2=rgb2hsl(prevColor);
    //   if(hsl1.y>hsl2.y){
      //     color=prevColor;
    //   }
  // }
  if(spectralCentroidZScore>2.5){
    // dial the saturation up to 11
    vec3 hsl=rgb2hsl(color);
    hsl.y*=2.5;
    color=hsl2rgb(hsl);
  }
  // finally, if the color is *still* too dark, we transform the color via the julia set function and hsl
  if(getGrayPercent(vec4(color,1.))>.5){
    // vec3 hsl=rgb2hsl(color);
    // hsl.z*=2.5;
    // color=hsl2rgb(hsl);
    color=vec3(julia(color.xy,prevColor.b),uv.x);
  }
  fragColor=vec4(color,.5);
}

void main(void){
  mainImage(fragColor,gl_FragCoord.xy,time);
}
