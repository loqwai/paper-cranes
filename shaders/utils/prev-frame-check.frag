#version 300 es
precision highp float;

uniform sampler2D prevFrame;// The texture of the previous frame
uniform vec2 resolution;// The resolution of the canvas
uniform float time;
uniform int frame;
out vec4 fragColor;

vec4 getLastFrameColor(vec2 uv){
  // I don't know why, but the texture is always flipped vertically
  return texture(prevFrame,uv);
}

vec4 mainImage(){
  vec2 uv=gl_FragCoord.xy/resolution.xy;
  // if(frame%2==0){
    return getLastFrameColor(uv);
  // }
  // if(uv.x<.2){
    //   return getLastFrameColor(uv);
  // }
  // return vec4(0.,1.,1.,1.);
}

void main(){
  fragColor=mainImage();
}
