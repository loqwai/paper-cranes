import { AudioFeatures, getFlatAudioFeatures } from '../audio/AudioProcessor'

export const shaderWrapper = (shader) => {
    const [firstLine, ...lines] = shader.split('\n')
    if (firstLine.includes('#version')) {
        lines.unshift('#define PAPER_CRANES 1')
        lines.unshift(firstLine)
        return lines.join('\n')
    }
    if (shader.includes('mainImage')) {
        return /* glsl */ `
#version 300 es
precision mediump float;
// This is automatically added by paper-cranes
#define PAPER_CRANES 1
out vec4 fragColor;
${shaderToyCompatibilityUniforms()}
${getAudioUniforms()}

${paperCranes()}
vec4 getLastFrameColor(vec2 uv){
    return texture(prevFrame, uv);
}
${shader}

void main(void){
    mainImage(fragColor, gl_FragCoord.xy);
}
`
    }
    if (shader.includes('render')) {
        return /* glsl */ `
#version 300 es
precision mediump float;
// This is automatically added by paper-cranes
#define PAPER_CRANES 1
out vec4 fragColor;
${shaderToyCompatibilityUniforms()}
${getAudioUniforms()}

${paperCranes()}
vec4 getLastFrameColor(vec2 uv){
    // Assuming uv.x was previously multiplied by the aspect ratio, we'll divide it now.
    float aspectRatio = iResolution.x / iResolution.y;
    vec2 correctedUV = uv;
    correctedUV.x /= aspectRatio; // Undo the aspect ratio correction
    //move the uv to the center
    correctedUV -= 0.5;
    // Now, use correctedUV to sample from the previous frame
    return texture(prevFrame, correctedUV);
}
${shader}

void main(void){
    vec2 resolution = iResolution.xy;
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
    // This is the magic line, the one "they" don't want you to figure out.
    float aspectRatio = resolution.x / resolution.y;
    fragColor = render(uv);
}
`
    }
    throw new Error('Shader must have a render function. It looks like this: \n vec4 render(vec2 uv){')
}

const shaderToyCompatibilityUniforms = () => /* glsl */ `
#define PI 3.1415926535897932384626433832795
uniform vec4 iMouse;
uniform float iTime;
uniform vec3 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform int iFrame;
`
const getAudioUniforms = () => {
    const uniforms = []
    for (const f in getFlatAudioFeatures()) {
        uniforms.push(`uniform float ${f};`)
    }
    uniforms.push('uniform bool beat;') // yeah, this needs to go somewhere else
    return uniforms.join('\n')
}

const paperCranes = () => /* glsl */ `

uniform float time;
uniform vec2 resolution;// iResolution equivalent

uniform int frame;

uniform sampler2D prevFrame;// Texture of the previous frame

uniform float iRandom;

float random(vec2 st, float seed){
    st=vec2(st.x*cos(seed)-st.y*sin(seed),
    st.x*sin(seed)+st.y*cos(seed));
    return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 11118.5453123);
}

float random(vec2 st){
    return random(st, iRandom);
}

float staticRandom(vec2 st){
    return random(st, 0.);
}

float mapValue(float val, float inMin, float inMax, float outMin, float outMax) {
    float normalized =  outMin + (outMax - outMin) * (val - inMin) / (inMax - inMin);
    return clamp(normalized, outMin, outMax);
}


float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}

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

  vec2 centerUv(vec2 res, vec2 coord) {
    // step 1: normalize the coord to 0-1
    vec2 uv = coord.xy / res;
    // step 2: center the uv
    uv -= 0.5;
    // step 3: scale the uv to -1 to 1
    uv *= 2.0;
    uv += 0.5;
    return uv;
}

vec2 centerUv(vec2 coord) {
    return centerUv(resolution, coord);
}

vec3 hslmix(vec3 c1, vec3 c2, float t){
    vec3 hsl1 = rgb2hsl(c1);
    vec3 hsl2 = rgb2hsl(c2);
    vec3 hsl = mix(hsl1, hsl2, t);
    return hsl2rgb(hsl);
    }
`
export default shaderWrapper
