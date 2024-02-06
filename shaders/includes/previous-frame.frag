uniform sampler2D prevFrame;// Texture of the previous frame

vec4 getLastFrameColor(vec2 uv){
  vec2 sampleUv = fract(uv);
  return texture(prevFrame, sampleUv);
}
