#pragma glslify: import(./includes/full)
uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
float plasma(vec2 uv,float time){
  float value=0.;
  value+=sin((uv.x+time)*10.) * (spectralCentroidZScore+0.2);
  value+=sin((uv.y+time)*10.) * spectralCentroidMean;
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
  uv -0.5;
  uv *= 1.5;
  uv += 0.5;

  // Generate plasma pattern
  float plasmaValue=plasma(uv,time);
  vec3 color=vec3(plasmaValue,1.-plasmaValue,.5);// Example HSL color for plasma

  // Convert plasma color to HSL
  vec3 hslColor=rgb2hsl(color);

  // Get previous frame color in HSL
  vec3 prevColor=texture(prevFrame,uv*sin(knob_1)).rgb;
  prevColor=rgb2hsl(prevColor);
  prevColor.x+=.01;// Change hue of previous frame
  prevColor = hsl2rgb(prevColor);

  // Calculate ripple effect
  vec3 rippleColor=hsl2rgb(vec3(hslColor.x,hslColor.y,hslColor.z+getRipple(uv,vec2(.5,.5),time)));

  // Blend plasma with ripples and previous frame
  //knob2 = -.13-.35
  float sc = map(sin(knob_3), 0., 1., -.20,.25);
  vec3 finalColor=mix(rippleColor,prevColor,sc);

  // Convert final color to RGB
  fragColor=vec4(hsl2rgb(finalColor),1.);
}
