import { getFlatAudioFeatures } from '../audio/AudioProcessor.js'

// All uniforms that can be referenced by string params
const getKnownUniforms = () => {
    const audioFeatures = Object.keys(getFlatAudioFeatures())
    const builtins = ['time', 'iTime', 'frame', 'iFrame', 'iRandom', 'beat']
    // Include knob_1 through knob_200
    const knobs = Array.from({ length: 200 }, (_, i) => `knob_${i + 1}`)
    return new Set([...audioFeatures, ...builtins, ...knobs])
}

// Generate uniform declarations for query params (excluding known params)
const getQueryParamUniforms = (shader, otherUniforms = '') => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    const knownParams = new Set(['shader', 'noaudio', 'embed', 'fullscreen', 'remote', 'fft_size', 'smoothing', 'history_size', 'controller', 'performance'])
    const knownUniforms = getKnownUniforms()

    // Combine shader and other uniform declarations, strip whitespace for matching
    const allCode = (shader + otherUniforms).replace(/\s+/g, ' ')

    const uniforms = []
    for (let [key, value] of params) {
        key = key.replace(/-/g, '_')
        if (knownParams.has(key)) continue
        if (key.startsWith('knob_')) continue  // Already handled
        if (key.includes('.')) continue  // Skip metadata params like param.min, param.max
        // Check if uniform is already declared
        const declaration = `uniform float ${key};`.replace(/\s+/g, ' ')
        if (allCode.includes(declaration)) continue
        // Create uniform if value is numeric OR references a known uniform
        if (!isNaN(parseFloat(value)) || knownUniforms.has(value)) {
            uniforms.push(`uniform float ${key};`)
        }
    }
    return uniforms.join('\n')
}

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
    if (shader.includes('mainImage')) {
        const compatUniforms = shaderToyCompatibilityUniforms()
        const audioUniforms = getAudioUniforms()
        const knobUniforms = getKnobUniforms(shader)
        const pcUniforms = paperCranes()
        const otherUniforms = compatUniforms + audioUniforms + knobUniforms + pcUniforms
        const queryUniforms = getQueryParamUniforms(shader, otherUniforms)
        return /* glsl */ `#version 300 es
precision highp float;

out vec4 fragColor;
${compatUniforms}
${audioUniforms}
${knobUniforms}
${queryUniforms}

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
    return [...Object.keys(getFlatAudioFeatures()), 'beat']
        .sort()
        .map(f => `uniform ${f === 'beat' ? 'bool' : 'float'} ${f};`)
        .join('\n')
}

const paperCranes = () => /* glsl */ `

uniform float time;
uniform vec2 resolution;// iResolution equivalent

uniform int frame;

uniform sampler2D prevFrame;// Texture of the previous frame
uniform sampler2D initialFrame;

uniform float iRandom;

uniform float seed;
uniform float seed2;
uniform float seed3;
uniform float seed4;

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
vec4 hsl2rgb(vec4 hsl) { return vec4(hsl2rgb(hsl.xyz), hsl.w); }
vec4 rgb2hsl(vec4 c) { return vec4(rgb2hsl(c.rgb), c.a); }

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

vec4 hslmix(vec4 c1, vec4 c2, float t){
    return vec4(hslmix(c1.rgb, c2.rgb, t), mix(c1.a, c2.a, t));
}

// Oklab color space conversions
// Oklab is a perceptual color space - mixing in Oklab produces more natural gradients than HSL or RGB
vec3 rgb2oklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    l = pow(l, 1.0/3.0); m = pow(m, 1.0/3.0); s = pow(s, 1.0/3.0);
    return vec3(
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    );
}

vec3 oklab2rgb(vec3 lab) {
    float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return vec3(
         4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

vec4 rgb2oklab(vec4 c) { return vec4(rgb2oklab(c.rgb), c.a); }
vec4 oklab2rgb(vec4 lab) { return vec4(oklab2rgb(lab.xyz), lab.w); }

vec3 oklabmix(vec3 c1, vec3 c2, float t) {
    return oklab2rgb(mix(rgb2oklab(c1), rgb2oklab(c2), t));
}

vec4 oklabmix(vec4 c1, vec4 c2, float t) {
    return vec4(oklabmix(c1.rgb, c2.rgb, t), mix(c1.a, c2.a, t));
}

// Oklch color space — polar form of Oklab
// vec3(L, C, h) where L=lightness(0-1), C=chroma(0-~0.37), h=hue angle(radians)
// Hue rotation is just adding to h — perceptually uniform color wheel
vec3 oklab2oklch(vec3 lab) {
    float C = length(lab.yz);
    float h = atan(lab.z, lab.y);
    return vec3(lab.x, C, h);
}

vec3 oklch2oklab(vec3 lch) {
    return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
}

vec3 rgb2oklch(vec3 c) {
    return oklab2oklch(rgb2oklab(c));
}

vec3 oklch2rgb(vec3 lch) {
    return oklab2rgb(oklch2oklab(lch));
}

vec4 rgb2oklch(vec4 c) { return vec4(rgb2oklch(c.rgb), c.a); }
vec4 oklch2rgb(vec4 lch) { return vec4(oklch2rgb(lch.xyz), lch.w); }

vec3 oklchmix(vec3 c1, vec3 c2, float t) {
    vec3 lch1 = rgb2oklch(c1);
    vec3 lch2 = rgb2oklch(c2);
    // Shortest-path hue interpolation
    float dh = lch2.z - lch1.z;
    if (dh > 3.14159265) dh -= 6.28318530;
    if (dh < -3.14159265) dh += 6.28318530;
    vec3 lch = vec3(
        mix(lch1.x, lch2.x, t),
        mix(lch1.y, lch2.y, t),
        lch1.z + dh * t
    );
    return oklch2rgb(lch);
}

vec4 oklchmix(vec4 c1, vec4 c2, float t) {
    return vec4(oklchmix(c1.rgb, c2.rgb, t), mix(c1.a, c2.a, t));
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
