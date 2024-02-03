uniform sampler2D prevFrame;// Texture of the previous frame

vec4 getLastFrameColor(vec2 uv){
  return texture(prevFrame,uv);
}
