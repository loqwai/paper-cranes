
  vec4 setupMask(vec2 uv){
   vec4 mask = getLastFrameColor(uv);
   if(mask.r > 0.5) {
    mask.r = 1.;
    mask.g = 1.;
    mask.b = 1.;
    mask.a = 0.1;
   }
   return mask;
  }

  void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord.xy/resolution.xy;
    if(frame == 0) {
      fragColor = setupMask(uv);
      return;
    }
    vec4 last = getLastFrameColor(uv);
    if(last.a == 1.) {
      fragColor = last;
      return;
    }
    fragColor = vec4(vec3(spectralCentroid,0.5,energyNormalized), 0.1);
}
