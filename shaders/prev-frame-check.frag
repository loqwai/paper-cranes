#version 300 es
precision highp float;

uniform sampler2D prevFrame;// The texture of the previous frame
uniform vec2 resolution;// The resolution of the canvas
uniform float time;
out vec4 fragColor;

vec4 getLastFrameColor(vec2 uv){
  return texture(prevFrame,vec2(uv.x,resolution.y-uv.y)/resolution.xy);
}

vec4 mainImage(){
  vec2 uv=gl_FragCoord.xy/resolution;
  vec4 prevColor=getLastFrameColor(uv);
  vec4 initialColor=vec4(0.,1.,0.,1.);
  if(time<5000.)return initialColor;
  vec4 currentColor=vec4(0.,0.,1.,1.);
  if(int(uv.x*200.)%20>10){
    currentColor=prevColor;
  }
  return currentColor;
}

void main(){
  fragColor=mainImage();
}
