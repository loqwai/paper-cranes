#pragma glslify:export(centerUv)
vec2 centerUv(vec2 res,vec2 coord){
  return(coord*2.-res)/res.y;
}

