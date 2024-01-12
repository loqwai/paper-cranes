#version 300 es
precision highp float;
// @include "colors-and-uniforms.include"
// Function to generate basic plasma pattern
out vec4 fragColor;
float plasma(vec2 uv,float time){
  float value=0.;
  value+=sin((uv.x+time)*10.);
  value+=sin((uv.y+time)*10.);
  value/=2.;
  return value;
}

// Function to get the ripple effect based on distance from the plasma center
float getRipple(vec2 uv,vec2 center,float time){
  float dist=length(uv-center);
  return sin(time*5.+dist*20.)*exp(-dist*3.);
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*resolution.xy)/resolution.y;
  uv.x*=resolution.x/resolution.y;// Aspect ratio correction
  
  // Generate plasma pattern
  float plasmaValue=plasma(uv,time);
  vec3 color=vec3(plasmaValue,1.-plasmaValue,.5);// Example HSL color for plasma
  
  // Convert plasma color to HSL
  vec3 hslColor=rgb2hsl(color);
  
  // Get previous frame color in HSL
  vec3 prevColorHSL=rgb2hsl(texture(prevFrame,uv).rgb);
  
  // Calculate ripple effect
  vec3 rippleColor=hsl2rgb(vec3(hslColor.x,hslColor.y,hslColor.z+getRipple(uv,vec2(.5,.5),time)));
  
  // Blend plasma with ripples and previous frame
  vec3 finalColor=mix(rippleColor,prevColorHSL,.5);
  
  // Convert final color to RGB
  fragColor=vec4(hsl2rgb(finalColor),1.);
}
