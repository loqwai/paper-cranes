import * as twgl from 'twgl'

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
        const texture = twgl.createTexture(
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

export const makeVisualizer = async ({ canvas, shader, initialImageUrl }) => {
    const gl = canvas.getContext('webgl2', { antialias: false })
    const res = await fetch(`/shaders/${shader}.frag`)
    const fragmentShader = await res.text()
    const initialTexture = await getTexture(gl, initialImageUrl)

    const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader])
    const frameBuffers = [twgl.createFramebufferInfo(gl), twgl.createFramebufferInfo(gl)]

    const arrays = {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    }
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays)

    gl.useProgram(programInfo.program)

    let frameNumber = 0
    const render = ({ time, audioFeatures }) => {
        twgl.resizeCanvasToDisplaySize(gl.canvas)
        const frame = frameBuffers[frameNumber % 2]
        const prevFrame = frameBuffers[(frameNumber + 1) % 2]

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frame.framebuffer)

        const uniforms = {
            time,
            prevFrame: frameNumber === 0 ? initialTexture : prevFrame.attachments[0],
            resolution: [frame.width, frame.height],
            frame: frameNumber,
            ...audioFeatures,
        }

        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
        twgl.setUniforms(programInfo, uniforms)
        twgl.drawBufferInfo(gl, bufferInfo)

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
