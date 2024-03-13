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

import { shaderWrapper } from './shader-transformers/shader-wrapper'
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

// Function to create and update the WebGL program with error handling
const updateWebGLProgram = (gl, vertexShader, wrappedShader) => {
    try {
        const programInfo = createProgramInfo(gl, [vertexShader, wrappedShader])
        if (!programInfo.program) {
            throw new Error('Failed to create a program. The shader code might be bad.')
        }
        gl.useProgram(programInfo.program)
        return programInfo
    } catch (error) {
        console.error('Error creating WebGL program:', error.message)
        // Consider fallback actions, like using a default shader program
        // to ensure the application continues to run, albeit with reduced functionality.
        // This section can be customized based on specific needs or recovery strategies.
        return null // Or return a default/previous valid programInfo if available
    }
}

export const makeVisualizer = async ({ canvas, shader, initialImageUrl, fullscreen }) => {
    const gl = canvas.getContext('webgl2', { antialias: false })
    // get the window width and height
    let wrappedShader = shaderWrapper(shader)
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
    const initialTexture = await getTexture(gl, initialImageUrl)

    let programInfo = createProgramInfo(gl, [vertexShader, wrappedShader])
    const frameBuffers = [createFramebufferInfo(gl), createFramebufferInfo(gl)]
    const arrays = {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    }
    const bufferInfo = createBufferInfoFromArrays(gl, arrays)

    gl.useProgram(programInfo.program)

    let frameNumber = 0
    let slowFrames = 0
    let lastRender = performance.now()
    const render = ({ time, features, shader: newShader }) => {
        if (newShader !== shader) {
            wrappedShader = shaderWrapper(newShader)
            shader = newShader
            const newProgramInfo = updateWebGLProgram(gl, vertexShader, wrappedShader) // Update the program with error handling
            if (newProgramInfo) {
                programInfo = newProgramInfo
            } else {
                console.warn('Using previous shader due to error in new shader code.')
            }
        }
        const renderTime = performance.now()
        // if the render time is less than 60fps, resize to 1/4 resolution. Otherwise, keep the same resolution
        let resolutionRatio = 1
        if (renderTime - lastRender > 50) {
            slowFrames += 10
        } else {
            slowFrames = Math.max(0, slowFrames - 1)
        }
        if (slowFrames > 50) {
            resolutionRatio = 0.5
        } else {
            resolutionRatio = 1
        }
        resizeCanvasToDisplaySize(gl.canvas, resolutionRatio)
        lastRender = renderTime
        const frame = frameBuffers[frameNumber % 2]
        const prevFrame = frameBuffers[(frameNumber + 1) % 2]

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frame.framebuffer)

        const uniforms = {
            time,
            prevFrame: frameNumber === 0 ? initialTexture : prevFrame.attachments[0],
            initialFrame: initialTexture,
            resolution: [frame.width, frame.height],
            frame: frameNumber,
            iRandom: Math.random(),
            iResolution: [frame.width, frame.height, 0],
            iMouse: [46, 19, 208, 0],
            iTime: time,
            iChannel0: initialTexture,
            iChannel1: initialTexture,
            iChannel2: initialTexture,
            iChannel3: initialTexture,
            ...features,
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
