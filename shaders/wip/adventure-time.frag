#define PI 3.1415926535897932384626433832795

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

vec3 grassColor=vec3(.13,.55,.13);// Rich green color for the grass
vec3 skyColor=vec3(.53,.81,.92);// Bright blue color for the sky

// Function to mix two colors based on a gradient factor
vec3 mixColors(vec3 color1,vec3 color2,float mixFactor){
  return mix(color1,color2,mixFactor);
}

vec3 gradientBackground(vec2 uv){
  vec3 grassColor=vec3(.13,.55,.13);// Rich green color for the grass
  vec3 skyColor=vec3(.53,.81,.92);// Bright blue color for the sky

  // Adjust gradient factor for 75% sky and 25% grass
  // The transition point is at 25% from the bottom
  float transitionPoint=.25;
  float gradientFactor=smoothstep(0.,transitionPoint,uv.y);

  return mix(grassColor,skyColor,gradientFactor);
}
vec3 generateBeam(vec3 color1,vec3 color2,vec3 color3,vec2 uv,float time,float offset,float centroidEffect){
  // Transformations to UV coordinates
  float horizontalMovement=sin(time*.5)*.5;
  uv.x+=horizontalMovement;

  float rotationAngle=sin(time*.2)*.1;
  vec2 pivot=vec2(.5,.5);
  uv=rotateUV(uv,rotationAngle,pivot);

  // Twist effect
  float twistFrequency=3.+6.*centroidEffect;
  float twistAmplitude=.1+spectralRolloffZScore;
  float yCoord=uv.y;
  float twist=sin(yCoord*twistFrequency+time+offset)*twistAmplitude;
  float twist2=sin(yCoord*twistFrequency+time+offset+3.1415)*twistAmplitude;
  uv.x+=(yCoord>0.?twist:twist2);

  // Beam properties
  float beamWidth=.05+(energyNormalized/100.);
  float edgeSoftness=abs(spectralSpreadZScore)*.1;
  float beam=smoothstep(beamWidth,beamWidth-edgeSoftness,abs(uv.x));

  // Determine which color to use based on the y-coordinate
  vec3 color;
  if(yCoord<.1){// First 3/10ths
    color=color1;
  }else if(yCoord<.7){// Next 6/10ths
    color=color2;
  }else{// Final 1/10th
    color=color3;
  }

  return color*beam;
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  // Calculate the background gradient
  vec2 uv=(2.*fragCoord-resolution.xy)/resolution.y;
  vec3 backgroundColor=gradientBackground(uv);

  // Get last frame color and mix it with the beam color
  // vec3 backgroundColor=mix(getLastFrameColor(uv).rgb,mixColor,mixFactor);
  // Marceline color variables
  vec3 marcyHairColor=vec3(.07451f,.043137f,.168627f);// Dark purple
  vec3 marcyBodyColor=vec3(.45098f,.458824f,.486275f);// Gray skin
  vec3 marcyLegsColor=vec3(.180392f,.109804f,.113725f);// Boots

  // Bubblegum color variables
  vec3 bubblegumHairColor=vec3(.988235f,.278431f,.756863f);// Pink hair
  vec3 bubblegumBodyColor=vec3(.992157f,.745098f,.996078f);// Light pink skin
  vec3 bubblegumLegsColor=vec3(.803922f,.286275f,.898039f);// Pink boots

  float twistAmount=spectralFluxNormalized*.1;// Twist beams based on spectral flux
  vec2 pivot=vec2(.5,.5);
  if(beat){
    uv=rotateUV(uv,PI/16.,pivot);// Quick rotation on beat
  }
  uv.x+=sin(uv.y*10.+time)*twistAmount;

  // Generate beams
  vec3 beam1=generateBeam(marcyHairColor,marcyBodyColor,marcyLegsColor,uv,time,0.,spectralCentroidZScore);
  vec3 beam2=generateBeam(bubblegumHairColor,bubblegumBodyColor,bubblegumLegsColor,uv,time,3.14,spectralCentroidZScore);
  // vec3 beam2=generateBeam(color2,uv,time,3.14,spectralCentroidZScore);
  // vec3 beam3=generateBeam(color3,uv,time,1.57,spectralCentroidZScore);

  // Blend the beams
  vec3 characters=(beam1+beam2)/2.;
  vec3 finalColor=mix(backgroundColor,characters,length(characters));
  fragColor =  vec4(finalColor,1.);
  return;
}
