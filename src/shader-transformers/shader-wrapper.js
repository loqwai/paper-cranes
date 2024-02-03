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

    for (const f of AudioFeatures) {
        const firstLower = f.charAt(0).toLowerCase() + f.slice(1)
        uniforms.push(`uniform float ${firstLower};`)
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
// This is automatically added by paper-cranes

out vec4 fragColor;

uniform float time;
uniform vec2 resolution;// iResolution equivalent
uniform sampler2D prevFrame;// Texture of the previous frame

uniform int frame;


${getAudioUniforms()}
${shaderToyCompatibilityUniforms()}

${shader}

void main(void){
mainImage(fragColor, gl_FragCoord.xy);
}
`
    }
    throw new Error('Shader must have a mainImage function. It looks like this: \n void mainImage(out vec4 fragColor,in vec2 fragCoord){')
}

const shaderToyCompatibilityUniforms = () => /* glsl */ `
uniform vec4 iMouse;
uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
`

export default shaderWrapper
