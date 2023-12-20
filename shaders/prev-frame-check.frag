#version 300 es
precision highp float;

uniform sampler2D prevFrame;// The texture of the previous frame
uniform vec2 resolution;// The resolution of the canvas

out vec4 fragColor;

vec4 mainImage(){
  vec2 uv=gl_FragCoord.xy/resolution;
  vec4 prevColor=texture(prevFrame,uv);// Fetch the color from the previous frame
  
  vec4 currentColor=vec4(0.,1.,0.,1.);
  
  // Blend the current color with the previous frame color
  // This will cause the scene to gradually darken over time
  float blendFactor=.95;// Adjust this factor to control the rate of darkening
  vec4 blendedColor=mix(currentColor,prevColor,blendFactor);
  
  return prevColor;
}

void main(){
  fragColor=mainImage();
}
