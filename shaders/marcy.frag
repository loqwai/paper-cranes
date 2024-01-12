#version 300 es
precision mediump float;
// @include "colors-and-uniforms.include"
out vec4 fragColor;

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
  float horizontalMovement=sin(time*.5f)*.5f;// Reduced amplitude and oscillation
  uv.x+=horizontalMovement;
  
  // Adjusted rotation
  float rotationAngle=sin(time*.2f)*.1f;// Reduced and oscillating rotation angle
  vec2 pivot=vec2(.5f,.5f);// Center of the screen as pivot
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
  vec2 uv=(fragCoord-.5f*resolution.xy)/resolution.y;
  uv.x*=resolution.x/resolution.y;// Aspect ratio correction
  uv.y=(uv.y+1.f)*.5f;// Normalize uv.y to range from 0 to 1
  
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
  
  // Calculate beam influence on background color
  float beamInfluence=max(length(marcyBeam),length(bubbleBeam));
  
  // Determine the color to mix based on beam influence
  vec3 mixColor=(beamInfluence>.5)?marcyHairColor:bubblegumHairColor;
  mixColor=hslMix(mixColor,getLastFrameColor(fragCoord).rgb,.5);// Mix with previous frame for saturation persistence
  
  // Adjust mixing factor for background influence
  float mixFactor=beamInfluence;
  
  // Get last frame color and mix it with the beam color
  vec3 backgroundColor=mix(getLastFrameColor(fragCoord).rgb,mixColor,mixFactor);
  
  // Final color is a blend of beam color and evolving background color
  vec3 finalColor=mix(finalBeam,backgroundColor,.5);
  
  fragColor=vec4(finalColor,1.);
}

void main(void){
  vec4 color=vec4(0.f,0.f,0.f,1.f);
  mainImage(color,gl_FragCoord.xy);
  fragColor=color;
}
