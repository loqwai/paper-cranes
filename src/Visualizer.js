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
        const texture = twgl.createTexture(
            gl,
            {
                src: url,
                crossOrigin: 'anonymous',
            },
            () => resolve(texture),
        )
    })
}
export const makeVisualizer = async ({ canvas, shader, initialImageUrl }) => {
    const gl = canvas.getContext('webgl2')
    const ext = gl.getExtension('GMAN_debug_helper')
    // if (ext) {
    //     ext.setConfiguration({
    //         warnUndefinedUniforms: false,
    //     })
    // }
    const res = await fetch(`/shaders/${shader}.frag`)
    const fragmentShader = await res.text()
    const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader])
    let prevFrame = await getTexture(gl, initialImageUrl)

    const arrays = {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    }
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays)

    gl.useProgram(programInfo.program)

    let frame = 0
    const render = ({ time, audioFeatures }) => {
        twgl.resizeCanvasToDisplaySize(gl.canvas)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        const uniforms = {
            time,
            resolution: [gl.canvas.width, gl.canvas.height],
            prevFrame,
            frame,
            ...audioFeatures,
        }
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
        twgl.setUniforms(programInfo, uniforms)
        twgl.drawBufferInfo(gl, bufferInfo)
        prevFrame = twgl.createTexture(gl, {
            src: canvas,
            crossOrigin: 'anonymous',
            mag: gl.LINEAR,
            min: gl.LINEAR,

        })
        frame++
    }

    return render
}
