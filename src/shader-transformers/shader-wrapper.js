import { getFlatAudioFeatures } from '../audio/AudioProcessor.js'

const getKnobUniforms = (shader) => {
    const uniforms = []
    // Check which knobs are already defined in the shader
    const existingKnobs = new Set()
    const knobRegex = /uniform\s+float\s+knob_(\d+)/g
    let match
    while ((match = knobRegex.exec(shader)) !== null) {
        existingKnobs.add(parseInt(match[1]))
    }

    // Add knobs that don't already exist
    for (let i = 1; i <= 200; i++) {
        if (!existingKnobs.has(i)) {
            uniforms.push(`uniform float knob_${i};`)
        }
    }
    return uniforms.join('\n')
}

export const shaderWrapper = (shader) => {
    const [firstLine, ...lines] = shader.split('\n')
    if (firstLine.includes('#version')) {
        lines.unshift('#define PAPER_CRANES 1')
        lines.unshift(firstLine)
        return lines.join('\n')
    }
    if (shader.includes('mainImage')) {
        return /* glsl */ `#version 300 es
precision highp float;

out vec4 fragColor;
${shaderToyCompatibilityUniforms()}
${getAudioUniforms()}
${getKnobUniforms(shader)}

${paperCranes()}
vec4 getLastFrameColor(vec2 uv){
    return texture(prevFrame, uv);
}
vec4 getInitialFrameColor(vec2 uv){
    return texture(initialFrame, uv);
}
// 31CF3F64-9176-4686-9E52-E3CFEC21FE72
${shader}

void main(void){
    mainImage(fragColor, gl_FragCoord.xy);
}
`
    }
    throw new Error('Shader does not contain mainImage function. It should look like this: void mainImage( out vec4 fragColor, in vec2 fragCoord ) { ... }')
}

const shaderToyCompatibilityUniforms = () => /* glsl */ `
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
    uniforms.push('uniform bool beat;')
    uniforms.sort()

    return uniforms.join('\n')
}

const paperCranes = () => /* glsl */ `

uniform float time;
uniform vec2 resolution;// iResolution equivalent

uniform int frame;

uniform sampler2D prevFrame;// Texture of the previous frame
uniform sampler2D initialFrame;

uniform float iRandom;

uniform vec2 touch;
uniform bool touched;

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

// Utility to make any value pingpong (go forward then backward)
float pingpong(float t) {
    float tt = fract(t * 0.5);
    return tt < 0.5 ? tt * 2.0 : 2.0 - (tt * 2.0);
}

// Animation easing functions - handles any input value by reversing
float easeInQuad(float t) {
    t = pingpong(t);
    return t * t;
}

float easeOutQuad(float t) {
    t = pingpong(t);
    return t * (2.0 - t);
}

float easeInOutQuad(float t) {
    t = pingpong(t);
    return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

float easeInCubic(float t) {
    t = pingpong(t);
    return t * t * t;
}

float easeOutCubic(float t) {
    t = pingpong(t);
    float t1 = t - 1.0;
    return t1 * t1 * t1 + 1.0;
}

float easeInOutCubic(float t) {
    t = pingpong(t);
    return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
}

float easeInExpo(float t) {
    t = pingpong(t);
    return t == 0.0 ? 0.0 : pow(2.0, 10.0 * (t - 1.0));
}

float easeOutExpo(float t) {
    t = pingpong(t);
    return t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
}

float easeInOutExpo(float t) {
    t = pingpong(t);
    if (t == 0.0 || t == 1.0) return t;

    if (t < 0.5) {
        return 0.5 * pow(2.0, (20.0 * t) - 10.0);
    } else {
        return -0.5 * pow(2.0, (-20.0 * t) + 10.0) + 1.0;
    }
}

float easeInSine(float t) {
    t = pingpong(t);
    return -1.0 * cos(t * 1.57079632679) + 1.0;
}

float easeOutSine(float t) {
    t = pingpong(t);
    return sin(t * 1.57079632679);
}

float easeInOutSine(float t) {
    t = pingpong(t);
    return -0.5 * (cos(3.14159265359 * t) - 1.0);
}

float easeInElastic(float t) {
    t = pingpong(t);
    float t1 = t - 1.0;
    return -pow(2.0, 10.0 * t1) * sin((t1 - 0.075) * 20.943951023932);
}

float easeOutElastic(float t) {
    t = pingpong(t);
    return pow(2.0, -10.0 * t) * sin((t - 0.075) * 20.943951023932) + 1.0;
}

float easeInOutElastic(float t) {
    t = pingpong(t);
    float t1 = t * 2.0;
    float t2 = t1 - 1.0;

    if (t < 0.5) {
        return -0.5 * pow(2.0, 10.0 * t2) * sin((t2 - 0.1125) * 13.962634015955);
    } else {
        return 0.5 * pow(2.0, -10.0 * t2) * sin((t2 - 0.1125) * 13.962634015955) + 1.0;
    }
}

float bounce(float t) {
    t = pingpong(t);
    return abs(sin(6.28318530718 * (t + 1.0) * (t + 1.0)) * (1.0 - t));
}

float smoothBounce(float t) {
    t = pingpong(t);
    return 1.0 - pow(abs(sin(6.28318530718 * (t + 1.0) * (t + 1.0))), 0.6) * (1.0 - t);
}
`
export default shaderWrapper
