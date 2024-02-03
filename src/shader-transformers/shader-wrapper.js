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
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
`

export default shaderWrapper
