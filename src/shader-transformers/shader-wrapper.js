import { getFlatAudioFeatures } from '../audio/AudioProcessor.js'

const getKnobUniforms = (shader) => {
    const existingKnobs = new Set(
        [...shader.matchAll(/uniform\s+float\s+knob_(\d+)/g)].map(m => parseInt(m[1]))
    )
    return Array.from({length: 200}, (_, i) => i + 1)
        .filter(i => !existingKnobs.has(i))
        .map(i => `uniform float knob_${i};`)
        .join('\n')
}

export const shaderWrapper = (shader) => {
    const [firstLine, ...lines] = shader.split('\n')
    if (firstLine.includes('#version')) {
        lines.unshift('#define PAPER_CRANES 1')
        lines.unshift(firstLine)
        return lines.join('\n')
    }

    // For debugging purposes - detect if this is a shader testing setTime
    const isTestingSetTime = shader.includes('setTime(0.');

    if (shader.includes('mainImage')) {
        return /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 timeColor;

${shaderToyCompatibilityUniforms()}
${getAudioUniforms()}
${getKnobUniforms(shader)}

${paperCranes()}

vec4 getLastFrameColor(vec2 uv) {
    return texture(prevFrame, uv);
}

vec4 getInitialFrameColor(vec2 uv) {
    return texture(initialFrame, uv);
}

#define getTimeColor(uv) 1. -texture(prevTimeFrame, uv)



float getTime(vec2 uv) {
    return getTimeColor(uv).x * 1000.;
}

float getTime() {
    // Simply return the time value from the previous frame's time texture
    // If the blue channel is set, use the stored time, otherwise use the global time
    // Do NOT add deltaTime here - it will lead to double-accumulation
    return getTime(vec2(0.5, 0.5));
}


void setTime(float t) {
    // Store the exact time value provided without adding deltaTime
    timeColor = vec4(t, 1., 1.0, 1.0);
}
// 31CF3F64-9176-4686-9E52-E3CFEC21FE72
${shader}

void main(void) {

    timeColor = getTimeColor(gl_FragCoord.xy);
    // Call the user's shader code first
    mainImage(fragColor, gl_FragCoord.xy);
    timeColor.x = _time/1000.;
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
uniform sampler2D prevTimeFrame;
uniform int iFrame;

`
const getAudioUniforms = () => {
    return [...Object.keys(getFlatAudioFeatures()), 'beat']
        .sort()
        .map(f => `uniform ${f === 'beat' ? 'bool' : 'float'} ${f};`)
        .join('\n')
}

const paperCranes = () => /* glsl */ `
uniform float deltaTime;
uniform float time;
uniform float _time;

uniform vec2 resolution;// iResolution equivalent

uniform int frame;

uniform sampler2D prevFrame;// Texture of the previous frame
uniform sampler2D initialFrame;
uniform sampler2D customTime;

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

vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x, s = hsl.y, l = hsl.z;
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    return vec3(
        hue2rgb(p, q, h + 1.0/3.0),
        hue2rgb(p, q, h),
        hue2rgb(p, q, h - 1.0/3.0)
    );
}

vec3 rgb2hsl(vec3 c) {
    float maxColor = max(max(c.r, c.g), c.b);
    float minColor = min(min(c.r, c.g), c.b);
    float delta = maxColor - minColor;

    float h = 0.0, s = 0.0, l = (maxColor + minColor) * 0.5;

    if (delta > 0.0) {
        s = l < 0.5 ? delta / (maxColor + minColor) : delta / (2.0 - maxColor - minColor);

        if (c.r == maxColor) {
            h = (c.g - c.b) / delta + (c.g < c.b ? 6.0 : 0.0);
        } else if (c.g == maxColor) {
            h = (c.b - c.r) / delta + 2.0;
        } else {
            h = (c.r - c.g) / delta + 4.0;
        }
        h /= 6.0;
    }

    return vec3(h, s, l);
}

vec2 centerUv(vec2 res, vec2 coord) {
    return (coord / res - 0.5) * 2.0 + 0.5;
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
    return 0.5 + 0.5 * sin(3.14159265359 * t);
}

// Simple animations
float animateSmooth(float t) {
    return t * t * (3.0 - 2.0 * t);
}

float animateBounce(float t) {
    t = pingpong(t);
    return abs(sin(6.28318530718 * (t + 1.0) * (t + 1.0)) * (1.0 - t));
}

float animatePulse(float t) {
    return 0.5 + 0.5 * sin(6.28318530718 * t);
}

// Easing functions
float animateEaseInQuad(float t) {
    t = pingpong(t);
    return t * t;
}

float animateEaseOutQuad(float t) {
    t = pingpong(t);
    return t * (2.0 - t);
}

float animateEaseInOutQuad(float t) {
    t = pingpong(t);
    return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

float animateEaseInCubic(float t) {
    t = pingpong(t);
    return t * t * t;
}

float animateEaseOutCubic(float t) {
    t = pingpong(t);
    float t1 = t - 1.0;
    return t1 * t1 * t1 + 1.0;
}

float animateEaseInOutCubic(float t) {
    t = pingpong(t);
    return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
}

float animateEaseInExpo(float t) {
    t = pingpong(t);
    return t == 0.0 ? 0.0 : pow(2.0, 10.0 * (t - 1.0));
}

float animateEaseOutExpo(float t) {
    t = pingpong(t);
    return t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
}

float animateEaseInOutExpo(float t) {
    t = pingpong(t);
    if (t == 0.0 || t == 1.0) return t;
    if (t < 0.5) {
        return 0.5 * pow(2.0, (20.0 * t) - 10.0);
    } else {
        return -0.5 * pow(2.0, (-20.0 * t) + 10.0) + 1.0;
    }
}

float animateEaseInSine(float t) {
    t = pingpong(t);
    return -1.0 * cos(t * 1.57079632679) + 1.0;
}

float animateEaseOutSine(float t) {
    t = pingpong(t);
    return sin(t * 1.57079632679);
}

float animateEaseInOutSine(float t) {
    t = pingpong(t);
    return -0.5 * (cos(3.14159265359 * t) - 1.0);
}

float animateEaseInElastic(float t) {
    t = pingpong(t);
    float t1 = t - 1.0;
    return -pow(2.0, 10.0 * t1) * sin((t1 - 0.075) * 20.943951023932);
}

float animateEaseOutElastic(float t) {
    t = pingpong(t);
    return pow(2.0, -10.0 * t) * sin((t - 0.075) * 20.943951023932) + 1.0;
}

float animateEaseInOutElastic(float t) {
    t = pingpong(t);
    float t1 = t * 2.0;
    float t2 = t1 - 1.0;
    if (t < 0.5) {
        return -0.5 * pow(2.0, 10.0 * t2) * sin((t2 - 0.1125) * 13.962634015955);
    } else {
        return 0.5 * pow(2.0, -10.0 * t2) * sin((t2 - 0.1125) * 13.962634015955) + 1.0;
    }
}

float animateSmoothBounce(float t) {
    t = pingpong(t);
    return 1.0 - pow(abs(sin(6.28318530718 * (t + 1.0) * (t + 1.0))), 0.6) * (1.0 - t);
}
`
export default shaderWrapper
