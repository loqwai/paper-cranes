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

const gridSize = 100

const getTexture = async (gl, url) => {
    return new Promise((resolve) => {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        const texture = createTexture(gl, { src: url, crossOrigin: 'anonymous' }, () => {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            resolve(texture)
        })
    })
}

const generateGridPositions = (gridSize) => {
    const positions = []
    const step = 2 / gridSize
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const x1 = -1 + x * step
            const x2 = x1 + step
            const y1 = -1 + y * step
            const y2 = y1 + step
            positions.push(x1, y1, 0, x2, y1, 0, x1, y2, 0, x1, y2, 0, x2, y1, 0, x2, y2, 0)
        }
    }
    return positions
}

const handleShaderError = (gl, wrappedFragmentShader, newFragmentShader) => {
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, wrappedFragmentShader);
    gl.compileShader(fragmentShader);
    const error = gl.getShaderInfoLog(fragmentShader);
    gl.deleteShader(fragmentShader);

    // Find the line with our marker
    const wrappedLines = wrappedFragmentShader.split('\n');
    const headerLines = wrappedLines.findIndex(line => line.includes('31CF3F64-9176-4686-9E52-E3CFEC21FE72'));

    if (error.match(/ERROR: \d+:(\d+):/)) {
        error.replace(/ERROR: \d+:(\d+):/, (match, line) =>{
            const lineNumber = parseInt(line) - headerLines - 1;
            window.cranes.error = { lineNumber, message: `ERROR: 0:${lineNumber}:` };
    });
        console.error(window.cranes.error, error);
    } else {
        window.cranes.error = {lineNumber:0, message: `there was something wrong with ur shader`}
    }
}


const askForWakeLock = async () => {
    if(!navigator.wakeLock) return
    return navigator.wakeLock.request('screen')
}

export const makeVisualizer = async ({ canvas, initialImageUrl, fullscreen }) => {
    await askForWakeLock().catch(e => console.log("Couldn't ask for a screen wake lock"));

    const gl = canvas.getContext('webgl2', {
        antialias: false,
        powerPreference: 'high-performance',
        desynchronized: true,  // Reduce latency
        // Request highest possible refresh rate
        attributes: {
            alpha: false,  // Optimize by disabling alpha if not needed
            depth: false,  // Disable depth buffer if not needed
            stencil: false,  // Disable stencil buffer if not needed
            preserveDrawingBuffer: false,
            pixelRatio: 1
        }
    })

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
    const bufferInfo = createBufferInfoFromArrays(gl, { position: generateGridPositions(gridSize) })

    let frameNumber = 0
    let slowFrames = 0
    let lastRender = performance.now()
    let programInfo
    let lastVertexShader, lastFragmentShader

    const render = ({ time, features, vertexShader: newVertexShader, fragmentShader: newFragmentShader }) => {
        if (newFragmentShader !== lastFragmentShader || newVertexShader !== lastVertexShader) {
            console.log('Shader updated')
            const wrappedFragmentShader = shaderWrapper(newFragmentShader)
            const wrappedVertexShader = shaderWrapper(newVertexShader)

            const newProgramInfo = createProgramInfo(gl, [wrappedVertexShader, wrappedFragmentShader])
            if (!newProgramInfo?.program) {
                handleShaderError(gl, wrappedFragmentShader, newFragmentShader);
                programInfo = null;
                lastVertexShader = newVertexShader;
                lastFragmentShader = newFragmentShader;
                return;
            }

            gl.useProgram(newProgramInfo.program)
            window.cranes.error = null;
            programInfo = newProgramInfo
            lastVertexShader = newVertexShader
            lastFragmentShader = newFragmentShader
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
            iTime: time,
            iFrame: frameNumber,
            time,
            prevFrame: frameNumber === 0 ? initialTexture : prevFrame.attachments[0],
            initialFrame: initialTexture,
            resolution: [frame.width, frame.height],
            frame: frameNumber,
            iRandom: Math.random(),
            iResolution: [frame.width, frame.height, 0],
            iMouse: [features.touchX, features.touchY, features.touched ? 1: 0, 0],
            iChannel0: initialTexture,
            iChannel1: prevFrame.attachments[0],
            iChannel2: initialTexture,
            iChannel3: prevFrame.attachments[0],
            gridSize,
            ...features,
        }

        const nonNullOrUndefinedOrNanUniforms = Object.fromEntries(
            Object.entries(uniforms).filter(([, value]) => value !== null && value !== undefined && !Number.isNaN(value))
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
