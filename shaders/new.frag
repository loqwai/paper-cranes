#version 300 es
precision highp float;
// hi
// @include "colors-and-uniforms.include"
out vec4 fragColor;
void main(){
  vec2 uv=gl_FragCoord.xy/resolution.xy;
  
  // Get color from the previous frame
  vec4 lastFrameColor=getLastFrameColor(uv);
  
  // Simple warping effect
  float warpAmount=.01;// Control the intensity of the warp
  vec2 warp=warpAmount*vec2(sin(lastFrameColor.r*10.),cos(lastFrameColor.g*10.));
  vec2 warpedUV=uv+warp;
  
  // Ensure warped coordinates wrap around the edges
  warpedUV=fract(warpedUV);
  
  // Sample color again with the warped coordinates
  vec4 warpedColor=getLastFrameColor(warpedUV);
  
  // Convert RGB to HSL
  vec3 hslColor=rgb2hsl(warpedColor.rgb);
  
  // Spectral-based color transformations
  hslColor.x+=sin(time*.1+spectralCentroid)*.5;
  hslColor.y*=1.+spectralSpread*.5;
  hslColor.z+=spectralFlux*.2;
  hslColor.z=clamp(hslColor.z,0.,1.);
  
  // Convert back to RGB
  vec3 rgbColor=hsl2rgb(hslColor);
  
  // Mix with spectralRolloff and spectralEntropy influenced color
  vec3 rolloffColor=vec3(spectralRolloff,spectralEntropy,.5);
  rgbColor=mix(rgbColor,rolloffColor,.5);
  
  // Apply energy
  rgbColor*=energy;
  // Output the final color
  fragColor=vec4(hslMix(warpedColor.rgb,rgbColor,.02),1.);
}
