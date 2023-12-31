#version 300 es
precision mediump float;

uniform bool beat;
uniform vec2 resolution;
uniform float time;
uniform sampler2D prevFrame;// Image texture
uniform float spectralSpreadZScore;
uniform float spectralCentroidZScore;
uniform float energyZScore;
uniform float energyNormalized;
uniform float spectralCentroidNormalized;
out vec4 fragColor;
uniform int frame;

vec4 getLastFrameColor(vec2 uv){
  // I don't know why, but the texture is always flipped vertically
  return texture(prevFrame,vec2(uv.x,1.-uv.y));
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

float getSaturation(vec3 color){
  vec3 hsl=rgb2hsl(color);
  return hsl.y;
}

vec3 increaseSaturation(vec3 color,float amount){
  vec3 hsl=rgb2hsl(color);
  hsl.y+=amount;
  return hsl2rgb(hsl);
}

vec3 rotateHue(vec3 color,float amount){
  vec3 hsl=rgb2hsl(color);
  hsl.x+=amount;
  return hsl2rgb(hsl);
}

vec3 hslMix(vec3 color1,vec3 color2,float m){
  vec3 hsl1=rgb2hsl(color1);
  vec3 hsl2=rgb2hsl(color2);
  // rotate color1 hue towards color2 hue by mix amount
  hsl1.x+=(hsl2.x-hsl1.x)*m;
  // mix saturation and lightness
  hsl1.y+=(hsl2.y-hsl1.y)*m;
  // hsl1.z += (hsl2.z - hsl1.z) * m;
  
  return hsl2rgb(hsl1);
}

vec2 rotateUV(vec2 uv,float angle,vec2 pivot){
  // Translate UV coordinates to pivot
  uv-=pivot;
  // Apply rotation
  float cosA=cos(angle);
  float sinA=sin(angle);
  vec2 rotatedUV=vec2(cosA*uv.x-sinA*uv.y,sinA*uv.x+cosA*uv.y);
  // Translate UV coordinates back
  return rotatedUV+pivot;
}

vec3 intertwinedBeams(vec3 color1,vec3 color2,vec3 color3,vec2 uv,float time,float offset,float centroidEffect){
  // Increased twist frequency and amplitude for more distinct intertwining
  float twistFrequency=3.f+6.f*centroidEffect;// Adjusted frequency
  float twistAmplitude=.1f;// Increased amplitude for more space between loops
  
  // Dynamic horizontal movement
  // Oscillating horizontal movement
  float horizontalMovement=sin(time)*.5f;// Reduced amplitude and oscillation
  uv.x+=horizontalMovement+(.3f-energyNormalized)/10.f;
  // Dynamic vertical movement
  // Oscillating vertical movement
  uv.y+=cos(time)*.1f;// Reduced vertical movement
  // Adjusted rotation
  float rotationAngle=sin(time*.2f)*.1f;// Reduced and oscillating rotation angle
  vec2 pivot=vec2(spectralSpreadZScore/3.f,spectralCentroidZScore/3.f);// Center of the screen as pivot
  uv=rotateUV(uv,rotationAngle,pivot);
  
  // Continuous wrap-around for the twist effect
  float yCoord=mod(uv.y+1.f,2.f)-1.f;
  float twist=sin(yCoord*twistFrequency+time+offset)*twistAmplitude;
  float twist2=sin(yCoord*twistFrequency+time+offset+3.1415f)*twistAmplitude;
  
  // Alternate twist direction for intertwined effect
  uv.x+=(yCoord>0.f?twist:twist2);
  
  // Further reduced beam width and edge softness for sharper edges
  float beamWidth=.05f+(energyNormalized/100.f);
  float edgeSoftness=abs(spectralSpreadZScore/3.f)*.1f;// Adjusted softness
  float beam=smoothstep(beamWidth,beamWidth-edgeSoftness,abs(uv.x));
  
  // Section division for equal color distribution
  float section=mod(yCoord*3.f+1.5f,2.f)-1.f;
  
  vec3 color;
  if(section<-1.f/2.f){
    color=color3;
  }else if(section<1.f/5.f){
    color=color2;
  }else{
    color=color1;
  }
  
  return color*beam;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=gl_FragCoord.xy/resolution.xy;
  vec3 lastBackground=getLastFrameColor(uv).rgb;
  float thresh=.2;
  if(getSaturation(lastBackground)>thresh){
    fragColor=vec4(lastBackground,thresh);
    return;
  }
  lastBackground/=2.f;
  // Marceline color variables
  vec3 marcyHairColor=vec3(.07451f,.043137f,.168627f);// Dark purple
  vec3 marcyBodyColor=vec3(.45098f,.458824f,.486275f);// Gray skin
  vec3 marcyLegsColor=vec3(.180392f,.109804f,.113725f);// Boots
  
  // Bubblegum color variables
  vec3 bubblegumHairColor=vec3(.988235f,.278431f,.756863f);// Pink hair
  vec3 bubblegumBodyColor=vec3(.992157f,.745098f,.996078f);// Light pink skin
  vec3 bubblegumLegsColor=vec3(.803922f,.286275f,.898039f);// Pink boots
  
  // Create intertwined beams
  float centroidEffect=abs(spectralCentroidZScore);
  vec3 marcyBeam=intertwinedBeams(marcyHairColor,marcyBodyColor,marcyLegsColor,uv,time,0.f,centroidEffect);
  vec3 bubbleBeam=intertwinedBeams(bubblegumHairColor,bubblegumBodyColor,bubblegumLegsColor,uv,time,3.1415f,centroidEffect);
  // Blend the beams based on energyNormalized
  vec3 finalBeam=mix(marcyBeam,bubbleBeam,spectralCentroidNormalized/2.f);
  // if our pixel isn't too gray, return it
  
  vec2 distortedUV=uv;
  distortedUV.x+=sin(time*.5f)*10.f+spectralSpreadZScore+energyZScore;
  distortedUV.y+=sin(time*.2f)*10.f+spectralSpreadZScore+energyZScore;
  
  vec3 distortedColor=getLastFrameColor(distortedUV).rgb;
  distortedColor=rotateHue(distortedColor,sin(time)*.1f);
  if(beat){
    distortedColor=rotateHue(distortedColor,sin(time)*.5f);
  }
  finalBeam=hslMix(finalBeam,distortedColor,.5f);
  float saturationThreshold=.5f;
  if(beat){
    saturationThreshold=.7f;
  }
  if(getSaturation(finalBeam)>saturationThreshold){
    fragColor=vec4(mix(finalBeam,lastBackground,.5f),1.f);
    return;
  }
  
  // Calculate beam influence on background color
  float beamInfluence=max(length(marcyBeam),length(bubbleBeam));
  
  // Determine the color to mix based on beam influence
  vec3 mixColor=(beamInfluence>.5f)?marcyHairColor:bubblegumHairColor;
  
  mixColor=mix(mixColor,distortedColor,.8f);// Mix with image texture for texture persistence
  // Adjust mixing factor for background influence
  float mixFactor=beamInfluence;
  // Get last frame color and mix it with the beam color
  vec3 backgroundColor=mix(lastBackground,mixColor,mixFactor);
  distortedUV.x+=cos(time*.5f);
  distortedUV.y+=cos(time*.2f);
  distortedColor=getLastFrameColor(distortedUV).rgb;
  if(getSaturation(backgroundColor)<.8f){
    float saturationStep=.02f;
    if(beat){
      saturationStep=.15f;
    }
    backgroundColor=increaseSaturation(backgroundColor,saturationStep);// Increase saturation for more vibrant colors
  }
  // Final color is a blend of beam color and evolving background color
  vec3 finalColor=mix(distortedColor,backgroundColor,.5f);
  
  fragColor=vec4(finalColor,.5f);
}

void main(void){
  vec4 color=vec4(0.f,0.f,0.f,1.f);
  mainImage(color,gl_FragCoord.xy);
  fragColor=color;
}
