uniform sampler2D prevFrame;// Texture of the previous frame
#pragma glslify: uncenterUv = require(./center-uv)
vec4 getLastFrameColor(vec2 uv){
  vec2 sampleUv = fract(uncenterUv(uv));
  return texture(prevFrame, sampleUv);
}
