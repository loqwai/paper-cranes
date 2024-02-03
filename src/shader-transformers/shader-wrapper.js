import { StatTypes } from '../utils/calculateStats'
import { AudioFeatures } from '../audio/AudioProcessor'

const generatePaperCranesShader = (shader) => {
    console.log('entering paperCranes renderer')
    throw new Error('Not implemented')
}
export const shaderWrapper = (shader) => {
    const firstLine = shader.split('\n')[0]
    console.log({ firstLine })
    if (firstLine.includes('#version 300 es')) {
        return shader
    }
    if (firstLine.includes('#paper-cranes')) {
        return generatePaperCranesShader(shader)
    }
    if (shader.includes('mainImage')) {
        return /* glsl */ `
#version 300 es
precision highp float;
// Included colors and uniforms!
${uniforms()}
${shaderToyCompatibilityUniforms()}


vec4 getLastFrameColor(vec2 uv){
return texture(prevFrame,uv);
}
struct Stats {
float current;
float normalized;
float zScore;
float standardDeviation;
float median;
float mean;
float min;
float max;
};
// const Stats energyStats = Stats(energy, energyZScore, energyStandardDeviation, energyMedian, energyMean, energyMin, energyMax);
${shader}

void main(void){
mainImage(fragColor, gl_FragCoord.xy);
}
`
    }
    throw new Error('Shader must have a mainImage function. It looks like this: \n void mainImage(out vec4 fragColor,in vec2 fragCoord){')
}

const rgb2hsl = () => /* glsl */ `
// Function to convert RGB to HSL
vec3 rgb2hsl(vec3 color){
  float maxColor=max(max(color.r,color.g),color.b);
  float minColor=min(min(color.r,color.g),color.b);
  float delta=maxColor-minColor;

  float h=0.f;
  float s=0.f;
  float l=(maxColor+minColor)/2.f;

  if(delta!=0.f){
    s=l<.5f?delta/(maxColor+minColor):delta/(2.f-maxColor-minColor);

    if(color.r==maxColor){
      h=(color.g-color.b)/delta+(color.g<color.b?6.f:0.f);
    }else if(color.g==maxColor){
      h=(color.b-color.r)/delta+2.f;
    }else{
      h=(color.r-color.g)/delta+4.f;
    }
    h/=6.f;
  }

  return vec3(h,s,l);
}
`

const uniforms = () => /* glsl */ `
out vec4 fragColor;

uniform float time;
uniform vec2 resolution;// iResolution equivalent
uniform sampler2D prevFrame;// Texture of the previous frame

//audio features
uniform bool beat;
uniform float spectralRolloff;
uniform float spectralRolloffNormalized;
uniform float spectralRolloffMean;
uniform float spectralRolloffStandardDeviation;
uniform float spectralRolloffMedian;
uniform float spectralRolloffZScore;
uniform float spectralRolloffMin;
uniform float spectralRolloffMax;
uniform float spectralCentroid;
uniform float spectralCentroidNormalized;
uniform float spectralCentroidMean;
uniform float spectralCentroidStandardDeviation;
uniform float spectralCentroidMedian;
uniform float spectralCentroidZScore;
uniform float spectralCentroidMin;
uniform float spectralCentroidMax;
uniform float spectralEntropy;
uniform float spectralEntropyNormalized;
uniform float spectralEntropyMean;
uniform float spectralEntropyStandardDeviation;
uniform float spectralEntropyMedian;
uniform float spectralEntropyZScore;
uniform float spectralEntropyMin;
uniform float spectralEntropyMax;
uniform float spectralSpread;
uniform float spectralSpreadNormalized;
uniform float spectralSpreadMean;
uniform float spectralSpreadStandardDeviation;
uniform float spectralSpreadMedian;
uniform float spectralSpreadZScore;
uniform float spectralSpreadMin;
uniform float spectralSpreadMax;
uniform float spectralRoughness;
uniform float spectralRoughnessNormalized;
uniform float spectralRoughnessMean;
uniform float spectralRoughnessStandardDeviation;
uniform float spectralRoughnessMedian;
uniform float spectralRoughnessZScore;
uniform float spectralRoughnessMin;
uniform float spectralRoughnessMax;
uniform float spectralKurtosis;
uniform float spectralKurtosisNormalized;
uniform float spectralKurtosisMean;
uniform float spectralKurtosisStandardDeviation;
uniform float spectralKurtosisMedian;
uniform float spectralKurtosisZScore;
uniform float spectralKurtosisMin;
uniform float spectralKurtosisMax;
uniform float spectralCrest;
uniform float spectralCrestNormalized;
uniform float spectralCrestMean;
uniform float spectralCrestStandardDeviation;
uniform float spectralCrestMedian;
uniform float spectralCrestZScore;
uniform float spectralCrestMin;
uniform float spectralCrestMax;
uniform float spectralSkew;
uniform float spectralSkewNormalized;
uniform float spectralSkewMean;
uniform float spectralSkewStandardDeviation;
uniform float spectralSkewMedian;
uniform float spectralSkewZScore;
uniform float spectralSkewMin;
uniform float spectralSkewMax;

uniform float energy;
uniform float energyNormalized;
uniform float energyMean;
uniform float energyStandardDeviation;
uniform float energyMedian;
uniform float energyZScore;
uniform float energyMin;
uniform float energyMax;
uniform float spectralFlux;
uniform float spectralFluxNormalized;
uniform float spectralFluxMean;
uniform float spectralFluxStandardDeviation;
uniform float spectralFluxMedian;
uniform float spectralFluxZScore;
uniform float spectralFluxMin;
uniform float spectralFluxMax;
uniform int frame;
`
const shaderToyCompatibilityUniforms = () => /* glsl */ `
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
`

export default shaderWrapper
