import {
    createTexture,
    createFramebufferInfo,
    createProgramInfo,
    createBufferInfoFromArrays,
    resizeCanvasToDisplaySize,
    setBuffersAndAttributes,
    setUniforms,
    drawBufferInfo,
} from 'twgl.js'

import { shaderWrapper } from './shader-wrapper'
// Vertex shader
const vertexShader = `
    #version 300 es
    in vec4 position;
    void main() {
        gl_Position = position;
    }
`
const getTexture = async (gl, url) => {
    return new Promise((resolve) => {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true) // Flip the texture
        const texture = createTexture(
            gl,
            {
                src: url,
                crossOrigin: 'anonymous',
            },
            () => {
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false) // Reset the parameter
                resolve(texture)
            },
        )
    })
}

export const makeVisualizer = async ({ canvas, shader, initialImageUrl, fullscreen }) => {
    const gl = canvas.getContext('webgl2', { antialias: false })
    // get the window width and height

    if (fullscreen) {
        const width = window.innerWidth
        const height = window.innerHeight
        // set the canvas width and height to the window width and height
        canvas.width = width
        canvas.height = height
        // set the viewport to match
        gl.viewport(0, 0, width, height)
        canvas.classList.add('fullscreen')
    }
    const ext = gl.getExtension('GMAN_debug_helper')
    if (ext) {
        ext.setConfiguration({
            failUnsetUniforms: false,
        })
    }
    const res = await fetch(`/shaders/${shader}.frag`)
    const fragmentShader = shaderWrapper(await res.text())
    const initialTexture = await getTexture(gl, initialImageUrl)

    console.log({ fragmentShader, initialTexture, vertexShader })
    const programInfo = createProgramInfo(gl, [vertexShader, fragmentShader])
    const frameBuffers = [createFramebufferInfo(gl), createFramebufferInfo(gl)]

    const arrays = {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    }
    const bufferInfo = createBufferInfoFromArrays(gl, arrays)

    gl.useProgram(programInfo.program)

    let frameNumber = 0
    const render = ({ time, audioFeatures }) => {
        resizeCanvasToDisplaySize(gl.canvas)
        const frame = frameBuffers[frameNumber % 2]
        const prevFrame = frameBuffers[(frameNumber + 1) % 2]

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frame.framebuffer)
        const uniforms = {
            time,
            prevFrame: frameNumber === 0 ? initialTexture : prevFrame.attachments[0],
            resolution: [frame.width, frame.height],
            frame: frameNumber,
            iResolution: [frame.width, frame.height],
            iTime: time,
            iChannel0: initialTexture,
            iChannel1: initialTexture,
            iChannel2: initialTexture,
            iChannel3: initialTexture,
            ...audioFeatures,
        }

        const nonNullOrUndefinedOrNanUniforms = Object.fromEntries(
            Object.entries(uniforms).filter(([, value]) => {
                return value !== null && value !== undefined && !Number.isNaN(value)
            }),
        )

        setBuffersAndAttributes(gl, programInfo, bufferInfo)
        setUniforms(programInfo, nonNullOrUndefinedOrNanUniforms)
        drawBufferInfo(gl, bufferInfo)

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame.framebuffer)

        // Bind the default framebuffer (null) as the DRAW framebuffer
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)

        // Blit (copy) the framebuffer to the canvas
        gl.blitFramebuffer(
            0,
            0,
            frame.width,
            frame.height, // Source rectangle
            0,
            0,
            gl.canvas.width,
            gl.canvas.height, // Destination rectangle
            gl.COLOR_BUFFER_BIT, // Mask (color buffer only)
            gl.LINEAR, // Filter (linear for smooth scaling)
        )

        frameNumber++
    }

    return render
}
