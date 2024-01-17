vec3 palette(float t,float hueShift,float saturationFactor,float lightnessFactor){
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
