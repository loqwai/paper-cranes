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

// Simple full-screen quad
const positions = [
    -1, -1, 0,
    1, -1, 0,
    -1, 1, 0,
    -1, 1, 0,
    1, -1, 0,
    1, 1, 0,
]

const getTexture = async (gl, url) => {
    return new Promise((resolve) => {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        const texture = createTexture(gl, { src: url, crossOrigin: 'anonymous' }, () => {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            resolve(texture)
        })
    })
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

const calculateResolutionRatio = (frameTime, renderTimes, lastResolutionRatio) => {
    renderTimes.push(frameTime)
    if (renderTimes.length > 20) renderTimes.shift()
    if(renderTimes.length < 20) return lastResolutionRatio

    // Calculate average frame time over last 20 frames
    const avgFrameTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length

    // Target 60fps (16.67ms per frame)
    let resolutionRatio = lastResolutionRatio
    if (avgFrameTime > 50) return Math.max(0.25, lastResolutionRatio - 0.25)
    if (avgFrameTime < 20 && lastResolutionRatio < 1) return Math.min(1, lastResolutionRatio + 0.1)
    return lastResolutionRatio
}

const askForWakeLock = async () => {
    if(!navigator.wakeLock) return
    return navigator.wakeLock.request('screen')
}

// Default vertex shader for full-screen quad
const defaultVertexShader = `#version 300 es
in vec4 position;
void main() {
    gl_Position = position;
}`

export const makeVisualizer = async ({ canvas, initialImageUrl, fullscreen }) => {
    await askForWakeLock().catch(e => console.log("Couldn't ask for a screen wake lock"));

    const gl = canvas.getContext('webgl2', {
        antialias: false,
        powerPreference: 'high-performance',
        desynchronized: true,
        attributes: {
            alpha: false,
            depth: false,
            stencil: false,
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
    const bufferInfo = createBufferInfoFromArrays(gl, { position: positions })

    let frameNumber = 0
    let lastRender = performance.now()
    let programInfo
    let lastFragmentShader
    let renderTimes = []
    let lastResolutionRatio = 1

    const render = ({ time, features, fragmentShader: newFragmentShader }) => {
        if (newFragmentShader !== lastFragmentShader) {
            console.log('Shader updated')
            const wrappedFragmentShader = shaderWrapper(newFragmentShader)

            const newProgramInfo = createProgramInfo(gl, [defaultVertexShader, wrappedFragmentShader])
            if (!newProgramInfo?.program) {
                handleShaderError(gl, wrappedFragmentShader, newFragmentShader);
                programInfo = null;
                lastFragmentShader = newFragmentShader;
                return;
            }

            gl.useProgram(newProgramInfo.program)
            window.cranes.error = null;
            programInfo = newProgramInfo
            lastFragmentShader = newFragmentShader
        }

        if (!programInfo) return

        const currentTime = performance.now()
        const frameTime = currentTime - lastRender

        const  resolutionRatio = calculateResolutionRatio(frameTime, renderTimes, lastResolutionRatio)

        if (resolutionRatio !== lastResolutionRatio) {
            console.log(`Adjusting resolution ratio to ${resolutionRatio.toFixed(2)}`)
            resizeCanvasToDisplaySize(gl.canvas, resolutionRatio)
            lastResolutionRatio = resolutionRatio
            renderTimes = []
        }

        lastRender = currentTime

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
