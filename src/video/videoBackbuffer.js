import {
    createTexture,
    createFramebufferInfo,
    createProgramInfo,
    createBufferInfoFromArrays,
    resizeFramebufferInfo,
    setBuffersAndAttributes,
    setUniforms,
    drawBufferInfo,
} from 'twgl-base.js'

// One full-screen pass: cover-fit the live video into the canvas (flipped to GL's bottom-up rows),
// then mix it over the real previous frame by videoMix. Drawn once at videoMix=1 for the pure video
// (initialFrame / iChannel0) and a second time only when videoMix<1, into its own target.
const vertex = `#version 300 es
in vec4 position;
void main() { gl_Position = position; }`

const fragment = `#version 300 es
precision highp float;
uniform sampler2D video;
uniform sampler2D prev;
uniform vec2 scale;
uniform vec2 resolution;
uniform float videoMix;
out vec4 color;
void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 v = (uv - 0.5) * scale + 0.5;
    color = mix(texture(prev, uv), texture(video, vec2(v.x, 1.0 - v.y)), videoMix);
}`

const coverScale = (videoAspect, canvasAspect) => videoAspect > canvasAspect
    ? [canvasAspect / videoAspect, 1]
    : [1, videoAspect / canvasAspect]

export const makeVideoBackbuffer = (gl, video, positions) => {
    const programInfo = createProgramInfo(gl, [vertex, fragment])
    const bufferInfo = createBufferInfoFromArrays(gl, { position: positions })
    const texture = createTexture(gl, { min: gl.LINEAR, mag: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE, width: 1, height: 1 })
    const pure = createFramebufferInfo(gl)
    const mixed = createFramebufferInfo(gl)

    // Upload only when the decoder hands over a new frame; without rVFC, every render.
    let fresh = true
    const watch = () => video.requestVideoFrameCallback(() => {
        fresh = true
        watch()
    })
    if (video.requestVideoFrameCallback) watch()

    const upload = () => {
        if (!fresh || video.readyState < video.HAVE_CURRENT_DATA) return
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
        fresh = !video.requestVideoFrameCallback
    }

    const pass = (target, prev, videoMix) => {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, target.framebuffer)
        gl.viewport(0, 0, target.width, target.height)
        gl.useProgram(programInfo.program)
        setBuffersAndAttributes(gl, programInfo, bufferInfo)
        setUniforms(programInfo, {
            video: texture,
            prev,
            videoMix,
            resolution: [target.width, target.height],
            scale: coverScale(video.videoWidth / video.videoHeight, target.width / target.height),
        })
        drawBufferInfo(gl, bufferInfo)
        return target.attachments[0]
    }

    const resize = (width, height) => [pure, mixed].forEach(fb => resizeFramebufferInfo(gl, fb, undefined, width, height))

    // Returns { video, prev }: the cover-fit video, and what the shader should read as its last frame.
    const draw = (prev, videoMix) => {
        upload()
        const pureTexture = pass(pure, prev, 1)
        if (videoMix >= 1) return { video: pureTexture, prev: pureTexture }
        return { video: pureTexture, prev: pass(mixed, prev, videoMix) }
    }

    return { draw, resize }
}
