#define PI 3.141592
#define orbs spectralFluxMax * 10.

vec2 kale(vec2 uv, vec2 offset, float sides) {
  float angle = atan(uv.y, uv.x);
  angle = ((angle / PI) + 1.0) * 0.5;
  angle = mod(angle, 1.0 / sides) * sides;
  angle = -abs(2.0 * angle - 1.0) + 1.0;
  angle = angle;
  float y = length(uv);
  angle = angle * (y);
  return vec2(angle, y) - offset;
}

vec4 orb(vec2 uv, float size, vec2 position, vec3 color, float contrast) {
  return pow(vec4(size / length(uv + position) * color, 1.), vec4(contrast));
}

mat2 rotate(float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = bassZScore+1. * 8. * (2. * fragCoord - iResolution.xy) / iResolution.y;
  float dist = length(uv);
  fragColor = vec4(0.);
  uv *= rotate(iTime / (orbs*20.));
  uv = kale(uv*animateEaseInSine(sin(iTime/10000.)), vec2(spectralFlux), 16.*spectralRoughnessNormalized);
  uv *= rotate(sin(iTime / 50.)) * .5;
  for (float i = 0.; i < orbs; i++) {
    uv.x += energyNormalized * sin(spectralRoughnessNormalized * uv.y + iTime);
    uv.y -= bassZScore * cos(spectralCrestNormalized * uv.x + iTime);
    float t = i * PI / orbs * 20.;
    float x = spectralCrest * tan(t + iTime / 100.);
    float y = spectralCrest * cos(t - iTime / 300.);
    vec2 position = vec2(x, y);
    vec3 color = cos(vec3(-spectralCrestNormalized, 0, -spectralRoughnessNormalized) * PI * 2. / 3. + PI * (float(i) / 5.37)) * 0.5 + 0.5;
    fragColor += orb(uv, energyZScore + 1., position, color, 4. + spectralCrestZScore)*0.1;
  }
};
