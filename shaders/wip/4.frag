void mainImage(out vec4 fragColor,vec2 fragCoord){
  vec2 uv=fragCoord.xy/resolution.xy;
  fragColor = getLastFrameColor(uv);
}
