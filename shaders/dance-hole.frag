#version 300 es
precision highp float;
// Assuming these uniforms are passed to the shader
uniform float time;                      // iTime equivalent        // Normalized energy

uniform sampler2D prevFrame;             // Texture of the previous frame
uniform vec2 resolution;                 // iResolution equivalent

uniform float spectralCentroidNormalized;
uniform float spectralCentroidZScore;
uniform float spectralCentroid;
uniform float spectralSkewMean;
uniform float spectralCrest;
uniform float energyNormalized;
uniform float spectralFluxNormalized;
uniform float spectralFluxMax;
uniform float spectralSpreadMax;
uniform float spectralSpreadZScore;
uniform float energyMax;
uniform float energyMin;
uniform float energyStandardDeviation;
uniform float energyMean;
uniform float energyZScore;
uniform float spectralEntropyMin;
uniform float spectralEntropyMax;
uniform float spectralRoughness;
uniform float spectralRoughnessNormalized;
uniform bool beat;

out vec4 fragColor;

#define l 120

void mainImage(out vec4 FragColor, vec2 FragCoord) {
  vec2 v = (FragCoord.xy - resolution.xy / 2.) / min(resolution.y, resolution.x) * 30.;

  vec2 vv = v;
  float ft = time + 360.1;
  float tm = ft * 0.1;
  float tm2 = ft * 0.3;

    // Modify the harmonics with spectralCentroidNormalized
  float spectralHarmonic = spectralCentroidNormalized * 0.5;

  vec2 mspt = (vec2(sin(tm) + cos(tm * 0.2) + sin(tm * 0.5) + cos(tm * -0.4) + sin(tm * 1.3), cos(tm) + sin(tm * 0.1) + cos(tm * 0.8) + sin(tm * -1.1) + cos(tm * 1.5)) + 1.0 + spectralHarmonic) * 0.35;

  float R = 0.0;
  float RR = 0.0;
  float RRR = 0.0;
  float a = (1. - mspt.x) * (energyZScore/3. + 0.5);
  float C = cos(tm2 * 0.03 + a * 0.01) * (spectralCentroidZScore/3. + 0.1);
  float S = sin(tm2 * 0.033 + a * 0.23) * spectralFluxNormalized;
  float C2 = cos(tm2 * 0.024 + a * 0.23) * 3.1;
  float S2 = sin(tm2 * 0.03 + a * 0.01) * 3.3;
  vec2 xa = vec2(C, -S);
  vec2 ya = vec2(S, C);
  vec2 xa2 = vec2(C2, -S2);
  vec2 ya2 = vec2(S2, C2);
  vec2 shift = vec2(0.033, 0.14);
  vec2 shift2 = vec2(-0.023, -0.22);
  float Z = 0.4 + mspt.y * 0.3;
  float m = 0.99 + sin(time * 0.03) * 0.003;

  for(int i = 0; i < l; i++) {
    float r = dot(v, v);
    float r2 = dot(vv, vv);
    if(r > 1.0) {
      r = (1.0) / r;
      v.x = v.x * r;
      v.y = v.y * r;
    }
    if(r2 > 1.0) {
      r2 = (1.0) / r2;
      vv.x = vv.x * r2;
      vv.y = vv.y * r2;
    }
    R *= m;
    R += r;
    R *= m;
    R += r2;
    if(i < l - 1) {
      RR *= m;
      RR += r;
      RR *= m;
      RR += r2;
      if(i < l - 2) {
        RRR *= m;
        RRR += r;
        RRR *= m;
        RRR += r2;
      }
    }

    v = vec2(dot(v, xa), dot(v, ya)) * Z + shift;
    vv = vec2(dot(vv, xa2), dot(vv, ya2)) * Z + shift2;
  }

  float c = ((mod(R, 2.0) > 1.0) ? 1.0 - fract(R) : fract(R));
  float cc = ((mod(RR, 2.0) > 1.0) ? 1.0 - fract(RR) : fract(RR));
  float ccc = ((mod(RRR, 2.0) > 1.0) ? 1.0 - fract(RRR) : fract(RRR));

    // Blend with previous frame for motion blur effect
  vec4 prevColor = texture(prevFrame, FragCoord / resolution);
  vec4 currentColor = vec4(ccc, cc, c, 1.0);

    // Adjust blending factor based on energyNormalized
  float blendFactor = mix(0.5, 0.9, energyNormalized)/5.;
  if(beat) blendFactor *=10.;
  FragColor = mix(prevColor, currentColor, blendFactor);
}
void main(void){
  mainImage(fragColor,gl_FragCoord.xy);
}
