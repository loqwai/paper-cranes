#pragma glslify: export(centerUv)
vec2 centerUv(vec2 res, vec2 coord) {
    // step 1: normalize the coord to 0-1
    vec2 uv = coord.xy / res;
    // step 2: center the uv
    uv -= 0.5;
    // step 3: scale the uv to -1 to 1
    uv *= 2.0;
    return uv;
}

#pragma glslify: export(uncenterUv)
vec2 uncenterUv(vec2 uv){
  uv /= 2.0;
  uv += 0.5;
  return uv;
}
