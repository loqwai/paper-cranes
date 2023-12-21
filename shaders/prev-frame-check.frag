#version 300 es
precision highp float;

uniform sampler2D prevFrame;// The texture of the previous frame
uniform vec2 resolution;// The resolution of the canvas
uniform float time;
uniform int frame;
out vec4 fragColor;

vec4 getLastFrameColor(vec2 uv){
  // I don't know why, but the texture is always flipped vertically
  return texture(prevFrame,vec2(uv.x,1.-uv.y));
}

vec4 mainImage(){
  vec2 uv=gl_FragCoord.xy/resolution.xy;
  return getLastFrameColor(uv);
  
  if(frame==0){
    return vec4(.3529,.1882,.098,1.);
  }
  if(uv.x<.5){
    return getLastFrameColor(uv);
  }
  return vec4(0.,1.,1.,1.);
}

void main(){
  fragColor=mainImage();
}
