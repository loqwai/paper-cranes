float packColor(vec3 color){
  // store a byte for each color component
  return color.r/8. + color.g/2048. + color.b/524288.;
}

vec3 unpackColor(float all){
  return vec3(
    mod(all*8.,1.),
    mod(all*2048.,1.),
    mod(all*524288.,1.)
  );
}

void init(out vec4 fragColor, in vec2 uv){
  vec4 initial = getLastFrameColor(uv);
  float all = packColor(initial.rgb);
  initial.a = all;
  fragColor = initial;
}
void mainImage(out vec4 fragColor,vec2 fragCoord){

  vec2 uv=fragCoord.xy/resolution.xy;
    if(frame == 0){
    init(fragColor,uv);
    return;
  }

  vec4 last = getLastFrameColor(uv);
  if(step(spectralCentroid-0.01,uv.x) * step(uv.x,spectralCentroid+0.01) > 0.0){

    fragColor = getLastFrameColor(uv.yx);
    return;
  }

  if(step(spectralCentroidZScore-0.01,uv.x) * step(uv.x,spectralCentroidZScore+0.01) > 0.0){
    fragColor = getLastFrameColor(uv.yx);
    return;
  }

  if(step(spectralRoughness-0.01,uv.y) * step(uv.y,spectralRoughness+0.01) > 0.0){
      fragColor = getLastFrameColor(uv.yx);
    return;
  }


  vec3 all = unpackColor(last.a);
  vec3 hsl = rgb2hsl(all);
  hsl.x = fract(hsl.x + spectralCentroid);
  hsl.y = clamp(spectralFlux+hsl.y, 0.,1.0);


  all = hsl2rgb(hsl);
  fragColor =vec4(all,last.a);
}
