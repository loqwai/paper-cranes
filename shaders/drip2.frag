

// Fractal parameters
float iterations=8.;
float scale=2.;

// Color palette
vec3 palette[5]=vec3[5](
  vec3(0.,0.,.5),
  vec3(0.,.5,1.),
  vec3(.5,1.,0.),
  vec3(1.,.5,0.),
  vec3(1.,0.,.5)
);

// Plasma function adapted from GLSL Noise by Iñigo Quilez
vec2 plasma(vec2 p){
  vec2 z=vec2(0.);
  float value=0.;
  for(int i=0;i<int(spectralKurtosisMedian);i++){
    z=p-.5+fract(sin(dot(z,z))*43758.5453);
    value+=sin(z.x*z.y*spectralFluxMax)/pow(2.,float(i));
  }
  return vec2(value,smoothstep(0.,.3,value));
}

// Main image computation
void mainImage(out vec4 fragColor,in vec2 fragCoord){

  vec2 uv=fragCoord.xy/resolution.xy;
  float flowSpeed=spectralFluxNormalized;

  // Flow and ripple based on noise and time
  vec2 noise=texture(prevFrame,uv).xy;
  uv+=noise*flowSpeed*time;
  float waveFrequency=spectralCentroidNormalized*5.;
  float waveAmplitude=spectralRoughnessNormalized*.2;
  uv+=sin(uv*waveFrequency+time)*waveAmplitude;

  // Combine plasma and droplet noise for texture
  vec2 p=plasma(uv);
  vec2 dropletNoise=texture(prevFrame,uv).xy;
  vec2 f=mix(p,dropletNoise,smoothstep(0.,.2,length(dropletNoise-.5)));

  // Drip effect based on distance from noise center
  vec2 d=dropletNoise-.5;

  float dripSpeed=spectralSpreadNormalized*.5;
  float dripLength=spectralSkewNormalized*.8;
  float dripIntensity=.5;

  float drip=sin(length(d)*dripSpeed+time)*dripIntensity*smoothstep(0.,dripLength,length(d));

  // Combine noise and drip for offset
  vec2 offset=(f+dropletNoise)*scale+vec2(drip,drip);

  // Map audio features to color
  vec3 color=mix(palette[0],palette[4],p.x);
  color.r=spectralCentroidNormalized;
  color.g=spectralRolloffNormalized;
  color.b=energyNormalized;

  // Adjust color based on offset, brightness, and glow
  color=mix(color,rgb2hsl(color),offset.x);
  color=mix(color,hsl2rgb(vec3(color.r,color.g+offset.y,color.b)),offset.y);
  color=mix(color,vec3(1.),smoothstep(0.,.2,p.y));// Glowing effect

  // Set fragment color
  fragColor=vec4(color,1.);
}


