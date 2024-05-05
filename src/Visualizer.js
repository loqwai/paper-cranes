import {
    createTexture,
    createFramebufferInfo,
    createProgramInfo,
    createBufferInfoFromArrays,
    resizeCanvasToDisplaySize,
    setBuffersAndAttributes,
    setUniforms,
    drawBufferInfo,
} from 'twgl-base.js'

import { shaderWrapper } from './shader-transformers/shader-wrapper'

const vertexShader = `
    #version 300 es
    in vec4 position;
    uniform float iTime; // Time uniform for animations

    void main() {
        float scale = abs(sin(iTime)) * 0.5 + 0.5; // Scale oscillates between 0.5 and 1.0
        float angle = iTime; // Rotate over time
        float move = sin(iTime * 2.0); // Move horizontally over time

        // Rotation matrix around the Z axis
        mat2 rotation = mat2(cos(angle), -sin(angle),
                             sin(angle),  cos(angle));

        // Apply rotation and scaling
        vec2 pos = rotation * position.xy * scale;

        // Apply translation
        pos.x += move;

        gl_Position = vec4(pos, position.z, 1.0);
    }
`

const getTexture = async (gl, url) => {
    return new Promise((resolve) => {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true) // Flip the texture
        const texture = createTexture(gl, { src: url, crossOrigin: 'anonymous' }, () => {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false) // Reset the parameter
            resolve(texture)
        })
    })
}

// Function to create and update the WebGL program with error handling
const updateWebGLProgram = (gl, vertexShader, wrappedShader) => {
    try {
        const programInfo = createProgramInfo(gl, [vertexShader, wrappedShader])
        if (!programInfo?.program) {
            throw new Error('Failed to create a program. The shader code might be bad.')
        }
        gl.useProgram(programInfo.program)
        return programInfo
    } catch (error) {
        console.error('Error creating WebGL program:', error.message)
        return
    }
}

// Helper function to generate positions for a grid of polygons
const generateGridPositions = (gridSize) => {
    const positions = []
    const step = 2 / gridSize // Divide the canvas into grid sections
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const x1 = -1 + x * step
            const x2 = x1 + step
            const y1 = -1 + y * step
            const y2 = y1 + step
            // Two triangles per square
            positions.push(x1, y1, 0, x2, y1, 0, x1, y2, 0, x1, y2, 0, x2, y1, 0, x2, y2, 0)
        }
    }
    return positions
}

export const makeVisualizer = async ({ canvas, initialImageUrl, fullscreen }) => {
    const gl = canvas.getContext('webgl2', { antialias: false })
    if (fullscreen) {
        const width = window.innerWidth
        const height = window.innerHeight
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
        canvas.classList.add('fullscreen')
    }
    const initialTexture = await getTexture(gl, initialImageUrl)
    const frameBuffers = [createFramebufferInfo(gl), createFramebufferInfo(gl)]
    const gridPositions = generateGridPositions(100)
    const arrays = { position: gridPositions }
    const bufferInfo = createBufferInfoFromArrays(gl, arrays)

    let frameNumber = 0
    let slowFrames = 0
    let lastRender = performance.now()
    let programInfo
    // Assuming the other parts of the code remain the same

    let lastVertexShader = vertexShader // Initial vertex shader
    let lastFragmentShader = null // Placeholder for initial fragment shader

    const render = ({ time, features, vertexShader: newVertexShader, fragmentShader: newFragmentShader }) => {
        if (newFragmentShader !== lastFragmentShader) {
            console.log('Shader updated')
            // Wrap the new fragment shader with any necessary transformations
            const wrappedFragmentShader = shaderWrapper(newFragmentShader)

            // Update program with new shaders
            const newProgramInfo = updateWebGLProgram(gl, vertexShader, wrappedFragmentShader)
            console.log('newProgramInfo', newProgramInfo)

            if (!newProgramInfo) {
                programInfo = null
                return
            }

            programInfo = newProgramInfo
            lastVertexShader = newVertexShader
            lastFragmentShader = newFragmentShader
            shaderUpdated = true
        }

        if (!programInfo) return

        const renderTime = performance.now()
        let resolutionRatio = 1
        if (renderTime - lastRender > 100) {
            slowFrames++
        }
        if (slowFrames > 30) {
            resolutionRatio = 0.5
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
            iChannel1: prevFrame.attachments[0],
            iChannel2: initialTexture,
            iChannel3: prevFrame.attachments[0],
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
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
        gl.blitFramebuffer(0, 0, frame.width, frame.height, 0, 0, gl.canvas.width, gl.canvas.height, gl.COLOR_BUFFER_BIT, gl.LINEAR)

        frameNumber++
    }

    return render
}
