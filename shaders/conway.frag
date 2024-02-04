#pragma glslify: import(./includes/full.frag)
#pragma glslify: centerUv = require(./includes/center-uv)

void main(void){
  vec2 uv = centerUv(resolution, gl_FragCoord.xy);
  const float radius = 0.5;
    float dist = dot(uv, uv);
    if (dist > radius) {
        fragColor = vec4(0.);
        return;
    }
    vec3 color = vec3(1.0, 0.0, 0.0);
    fragColor = vec4(color, 1.0);
}
