import { StatTypes } from '../utils/calculateStats'
import { AudioFeatures, getFlatAudioFeatures } from '../audio/AudioProcessor'

const generatePaperCranesShader = (shader) => {
    console.log('entering paperCranes renderer')
    throw new Error('Not implemented')
}

const getAudioUniforms = () => {
    const uniforms = []
    for (const f in getFlatAudioFeatures()) {
        uniforms.push(`uniform float ${f};`)
    }
    uniforms.push('uniform bool beat;') // yeah, this needs to go somewhere else
    return uniforms.join('\n')
}

export const shaderWrapper = (shader) => {
    if (shader.includes('#pragma paper-cranes: generate-audio-features')) {
        console.log('entering paperCranes renderer')
        return generatePaperCranesShader(shader)
    }
    const firstLine = shader.split('\n')[0]
    if (firstLine.includes('#version 300 es')) {
        return shader
    }
    if (shader.includes('mainImage')) {
        return /* glsl */ `
#version 300 es
precision highp float;
// Included colors and uniforms!
${getAudioUniforms()}
${shaderToyCompatibilityUniforms()}
${rgb2hsl()}


vec4 getLastFrameColor(vec2 uv){
return texture(prevFrame,uv);
}
// const Stats energyStats = Stats(energy, energyZScore, energyStandardDeviation, energyMedian, energyMean, energyMin, energyMax);


// Helper function for HSL to RGB conversion
float hue2rgb(float p,float q,float t){
if(t<0.f)
t+=1.f;
if(t>1.f)
t-=1.f;
if(t<1.f/6.f)
return p+(q-p)*6.f*t;
if(t<1.f/2.f)
return q;
if(t<2.f/3.f)
return p+(q-p)*(2.f/3.f-t)*6.f;
return p;
}

// Function to convert HSL to RGB
vec3 hsl2rgb(vec3 hsl){
float h=hsl.x;
float s=hsl.y;
float l=hsl.z;

float r,g,b;

if(s==0.f){
  r=g=b=l;// achromatic
}else{
  float q=l<.5f?l*(1.f+s):l+s-l*s;
  float p=2.f*l-q;
  r=hue2rgb(p,q,h+1.f/3.f);
  g=hue2rgb(p,q,h);
  b=hue2rgb(p,q,h-1.f/3.f);
}

return vec3(r,g,b);
}

float getGrayPercent(vec3 color){
return(color.r+color.g+color.b)/3.f;
}

vec3 hslMix(vec3 color1,vec3 color2,float m){
vec3 hsl1=rgb2hsl(color1);
vec3 hsl2=rgb2hsl(color2);
// rotate color1 hue towards color2 hue by mix amount
hsl1.x+=(hsl2.x-hsl1.x)*m;
// mix saturation and lightness
hsl1.y+=(hsl2.y-hsl1.y)*m;
// hsl1.z += (hsl2.z - hsl1.z) * m;

return hsl2rgb(hsl1);
}

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
const shaderToyCompatibilityUniforms = () => /* glsl */ `
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
`

export default shaderWrapper
