
vec4 setupMask(vec2 uv){
  vec4 mask=getInitialFrameColor(uv);
  if(mask.r>0.01){
    mask.a=.8;
  }else{
    mask.a=1.;
  }
  return mask;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=fragCoord.xy/resolution.xy;

  if(frame==0){
    fragColor=setupMask(uv);
    return;
  }
  vec4 last=getInitialFrameColor(uv);
  if(last.a<1.){
    vec3 hsl=rgb2hsl(last.rgb);

    hsl.y=clamp(.1,1.,energyNormalized);
    if(energyZScore>0.8){
      hsl.x=fract(hsl.x+pitchClass/3.);
    }
    fragColor=fract(vec4(hsl2rgb(hsl),last.a));

    return;
  }
  float pivot=energyZScore;
  if(beat) pivot *= 2.;
  // Translate UV to the center
  uv-=.5;

  // Rotate around the center
  uv*=mat2(cos(pivot),-sin(pivot),sin(pivot),cos(pivot));

  // Translate back
  uv+=.5;

  vec4 otherLast=getInitialFrameColor(uv);
  vec3 hsl=rgb2hsl(otherLast.rgb);
  hsl.x=fract(hsl.x+time*.1);
  hsl.y=clamp(.1,.8,hsl.y);
  if(hsl.y<.5){
    hsl.y=1.-hsl.y;
    hsl.x=fract(hsl.x+pitchClass);
  }
  fragColor=vec4(hsl2rgb(hsl),last.a);
}
