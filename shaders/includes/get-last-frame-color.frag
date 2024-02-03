#pragma glslify: export(getLastFrameColor)
vec4 getLastFrameColor(vec2 uv){
  return texture(prevFrame,uv);
}
