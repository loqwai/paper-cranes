import * as twgl from 'twgl'
// Vertex shader
const vertexShader = `
    #version 300 es
    in vec4 position;
    void main() {
        gl_Position = position;
    }
    `
export const makeVisualizer = async ({ canvas, shader }) => {
    const gl = canvas.getContext('webgl2')
    const res = await fetch(`/shaders/${shader}.frag`)
    const fragmentShader = await res.text()
    const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader])

    const arrays = {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    }
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays)

    const render = ({ time, audioFeatures }) => {
        twgl.resizeCanvasToDisplaySize(gl.canvas)
        console.log({ audioFeatures })
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        const uniforms = {
            time,
            resolution: [gl.canvas.width, gl.canvas.height],
            ...audioFeatures,
        }

        gl.useProgram(programInfo.program)
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
        twgl.setUniforms(programInfo, uniforms)
        twgl.drawBufferInfo(gl, bufferInfo)
    }
    return render
}
