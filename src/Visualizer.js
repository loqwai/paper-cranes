import * as twgl from 'twgl'

// Vertex shader
const vertexShader = `
    #version 300 es
    in vec4 position;
    void main() {
        gl_Position = position;
    }
`

export const makeVisualizer = async ({ canvas, shader, initialImageUrl }) => {
    const gl = canvas.getContext('webgl2')
    const res = await fetch(`/shaders/${shader}.frag`)
    const fragmentShader = await res.text()
    const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader])

    const arrays = {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    }
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays)

    // Create two textures for double buffering
    const textures = [twgl.createTexture(gl, { width: 1, height: 1 }), twgl.createTexture(gl, { width: 1, height: 1 })]
    let currentTextureIndex = 0
    let initialTextureLoaded = false

    // Load initial image as texture
    if (initialImageUrl) {
        const image = new Image()
        image.onload = () => {
            textures[0] = twgl.createTexture(gl, { src: image })
            initialTextureLoaded = true
        }
        image.src = initialImageUrl
    }

    const render = ({ time, audioFeatures }) => {
        if (!initialTextureLoaded && initialImageUrl) {
            requestAnimationFrame(() => render({ time, audioFeatures }))
            console.log('waiting to render')
            return
        }

        const prevFrameTexture = textures[currentTextureIndex]
        currentTextureIndex = (currentTextureIndex + 1) % textures.length
        const currentFrameTexture = textures[currentTextureIndex]

        twgl.resizeCanvasToDisplaySize(gl.canvas)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        // Copy the current frame to the current frame texture
        gl.bindTexture(gl.TEXTURE_2D, currentFrameTexture)
        gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, gl.canvas.width, gl.canvas.height, 0)

        const uniforms = {
            time,
            resolution: [gl.canvas.width, gl.canvas.height],
            prevFrame: prevFrameTexture,
            ...audioFeatures,
        }

        gl.useProgram(programInfo.program)
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
        twgl.setUniforms(programInfo, uniforms)
        twgl.drawBufferInfo(gl, bufferInfo)
    }
    return render
}
