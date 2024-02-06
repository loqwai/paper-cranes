#pragma glslify: hsl2rgb = require(./hsl2rgb)
#pragma glslify: rgb2hsl = require(./rgb2hsl)
#pragma glslify: export(hslmix)

vec3 hslmix(vec3 c1, vec3 c2, float t){
  vec3 hsl1 = rgb2hsl(c1);
  vec3 hsl2 = rgb2hsl(c2);
  vec3 hsl = mix(hsl1, hsl2, t);
  return hsl2rgb(hsl);
}
