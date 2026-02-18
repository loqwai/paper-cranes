import {
    createTexture,
    createFramebufferInfo,
    createProgramInfo,
    createBufferInfoFromArrays,
    resizeCanvasToDisplaySize,
    resizeFramebufferInfo,
    setBuffersAndAttributes,
    setUniforms,
    drawBufferInfo,
} from 'twgl-base.js'

import { shaderWrapper } from './shader-transformers/shader-wrapper.js'

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
        const texture = createTexture(gl, {
            src: url,
            crossOrigin: 'anonymous',
            min: gl.NEAREST,
            mag: gl.NEAREST,
            wrap: gl.REPEAT
        }, () => {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            resolve(texture)
        })
    })
}

const handleShaderError = (gl, wrappedFragmentShader, newFragmentShader) => {
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, wrappedFragmentShader);
    gl.compileShader(fragmentShader);

    /**
     * @type {string | Error}
     */
    let error = gl.getShaderInfoLog(fragmentShader);
    if (error instanceof Error) error = error.message;

    gl.deleteShader(fragmentShader);

    // Find the line with our marker
    const wrappedLines = wrappedFragmentShader.split('\n');
    const headerLines = wrappedLines.findIndex(line => line.includes('31CF3F64-9176-4686-9E52-E3CFEC21FE72'));

    let message = `there was something wrong with ur shader`
    let lineNumber = 0
    for (const line of error.matchAll(/ERROR: \d+:(\d+):/g)) {
        lineNumber = parseInt(line[1]) - headerLines - 1;
        message = error.split(':').slice(3).join(':').trim();
    }

    window.cranes.error = {lineNumber, message}
    console.error(`Error information:`, window.cranes.error);
}

const calculateResolutionRatio = (frameTime, renderTimes, lastResolutionRatio) => {
    renderTimes.push(frameTime)
    if (renderTimes.length > 20) renderTimes.shift()
    if(renderTimes.length < 20) return lastResolutionRatio

    // Calculate average frame time over last 20 frames
    const avgFrameTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length

    if (avgFrameTime > 50) return Math.max(0.5, lastResolutionRatio - 0.5)
    if (avgFrameTime < 20 && lastResolutionRatio < 1) return Math.min(1, lastResolutionRatio + 0.25)
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
    await askForWakeLock().catch(e => {});

    const gl = canvas.getContext('webgl2', {
        antialias: false,
        powerPreference: 'high-performance',
        attributes: {
            alpha: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false,
            pixelRatio: 1
        }
    })

    if (!gl) {
        console.error('WebGL2 not available')
        return () => {}
    }

    // Recover from GPU context loss (common on mobile)
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault()
    })
    canvas.addEventListener('webglcontextrestored', () => {
        window.location.reload()
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
    // Transition framebuffer captures the last frame when switching shaders
    const transitionFramebuffer = createFramebufferInfo(gl)

    const setFramebufferTexParams = (fb) => {
        const texture = fb.attachments[0]
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    }

    // Set texture parameters for all framebuffers
    frameBuffers.forEach(setFramebufferTexParams)
    setFramebufferTexParams(transitionFramebuffer)

    const bufferInfo = createBufferInfoFromArrays(gl, { position: positions })

    // Resize canvas to display size before capturing initial dimensions
    // This prevents the first frame from triggering resize logic and causing a black flash
    resizeCanvasToDisplaySize(gl.canvas, 1)

    let frameNumber = 0
    let lastRender = performance.now()
    let programInfo
    let lastFragmentShader
    let renderTimes = []
    let lastResolutionRatio = 1
    let lastCanvasWidth = gl.canvas.width
    let lastCanvasHeight = gl.canvas.height
    let useInitialTextureAsPrev = false
    let currentInitialTexture = initialTexture

    const render = ({ time, features, fragmentShader: newFragmentShader }) => {
        if (newFragmentShader !== lastFragmentShader) {
            // Capture the previous shader's last frame as the transition/initial texture
            if (frameNumber > 0) {
                const prevFrame = frameBuffers[(frameNumber + 1) % 2]
                gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevFrame.framebuffer)
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, transitionFramebuffer.framebuffer)
                gl.blitFramebuffer(
                    0, 0, prevFrame.width, prevFrame.height,
                    0, 0, transitionFramebuffer.width, transitionFramebuffer.height,
                    gl.COLOR_BUFFER_BIT, gl.LINEAR
                )
                gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
                currentInitialTexture = transitionFramebuffer.attachments[0]
            }

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

        // Skip resolution scaling during warmup to avoid shader compilation skewing the average
        const resolutionRatio = frameNumber < 60
            ? lastResolutionRatio
            : calculateResolutionRatio(frameTime, renderTimes, lastResolutionRatio)

        // Check if canvas display size changed (window resize)
        resizeCanvasToDisplaySize(gl.canvas, lastResolutionRatio)

        if (resolutionRatio !== lastResolutionRatio) {
            resizeCanvasToDisplaySize(gl.canvas, resolutionRatio)
            lastResolutionRatio = resolutionRatio
            renderTimes = []
        }

        // Resize framebuffers if canvas size changed
        if (gl.canvas.width !== lastCanvasWidth || gl.canvas.height !== lastCanvasHeight) {
            // Unbind framebuffers before resizing
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)

            const newWidth = gl.canvas.width
            const newHeight = gl.canvas.height
            const allBuffers = [...frameBuffers, transitionFramebuffer]
            allBuffers.forEach(fb => {
                resizeFramebufferInfo(gl, fb, undefined, newWidth, newHeight)
                setFramebufferTexParams(fb)

                // Clear the framebuffer to prevent undefined content
                gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer)
                gl.clearColor(0, 0, 0, 1)
                gl.clear(gl.COLOR_BUFFER_BIT)
            })
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)

            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
            lastCanvasWidth = gl.canvas.width
            lastCanvasHeight = gl.canvas.height
        }

        lastRender = currentTime

        const frame = frameBuffers[frameNumber % 2]
        const prevFrame = frameBuffers[(frameNumber + 1) % 2]

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frame.framebuffer)
        gl.viewport(0, 0, frame.width, frame.height)

        const usePrevTexture = frameNumber === 0 || useInitialTextureAsPrev
        const prevTexture = usePrevTexture ? initialTexture : prevFrame.attachments[0]
        useInitialTextureAsPrev = false

        let uniforms = {
            iTime: time,
            iFrame: frameNumber,
            time,
            prevFrame: prevTexture,
            initialFrame: currentInitialTexture,
            resolution: [frame.width, frame.height],
            frame: frameNumber,
            iRandom: Math.random(),
            iResolution: [frame.width, frame.height, 0],
            iMouse: [features.touchX, features.touchY, features.touched ? 1: 0, 0],
            iChannel0: initialTexture,
            iChannel1: prevTexture,
            iChannel2: initialTexture,
            iChannel3: prevTexture,
            ...features,
        }
        // filter out null, undefined, and NaN values
        uniforms = Object.fromEntries(
            Object.entries(uniforms).filter(([, value]) => value !== null && value !== undefined && !Number.isNaN(value))
        )
        // resolve string references to other uniforms (e.g., time_val=time)
        uniforms = resolveReferences(uniforms)

        setBuffersAndAttributes(gl, programInfo, bufferInfo)
        setUniforms(programInfo, uniforms)
        drawBufferInfo(gl, bufferInfo)

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame.framebuffer)
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
        gl.blitFramebuffer(0, 0, frame.width, frame.height, 0, 0, gl.canvas.width, gl.canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST)

        frameNumber++
    }

    return render
}

// Resolve string references to other uniforms (e.g., ?time_val=time, ?knob_71=bassNormalized)
const resolveReferences = (uniforms) => {
    const result = { ...uniforms }
    for (const [key, value] of Object.entries(result)) {
        if (typeof value !== 'string') continue
        if (result[value] === undefined) continue
        result[key] = result[value]
    }
    return result
}

