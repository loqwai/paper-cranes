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
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
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

const resizeCanvas = (canvas, gl, resolutionRatio = 1) => {
    const container = canvas.parentElement
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Calculate aspect ratio based on container
    const containerAspect = containerWidth / containerHeight

    // Set canvas dimensions to match container while maintaining aspect ratio
    canvas.width = containerWidth * resolutionRatio
    canvas.height = containerHeight * resolutionRatio

    // Update viewport
    gl.viewport(0, 0, canvas.width, canvas.height)

    return {
        width: canvas.width,
        height: canvas.height,
        aspect: containerAspect
    }
}

export const makeVisualizer = async ({ canvas, initialImageUrl, fullscreen }) => {
    await askForWakeLock().catch(e => console.log("Couldn't ask for a screen wake lock"));

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

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
        if (!fullscreen) {
            resizeCanvas(canvas, gl)
        }
    })
    resizeObserver.observe(canvas.parentElement)

    if (fullscreen) {
        const width = window.innerWidth
        const height = window.innerHeight
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
        canvas.classList.add('fullscreen')
    } else {
        resizeCanvas(canvas, gl)
    }

    const initialTexture = await getTexture(gl, initialImageUrl)
    const frameBuffers = [createFramebufferInfo(gl), createFramebufferInfo(gl)]

    // Set texture parameters for both framebuffers
    frameBuffers.forEach(fb => {
        const texture = fb.attachments[0]
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    })

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

        const resolutionRatio = calculateResolutionRatio(frameTime, renderTimes, lastResolutionRatio)

        if (resolutionRatio !== lastResolutionRatio) {
            console.log(`Adjusting resolution ratio to ${resolutionRatio.toFixed(2)}`)
            const dimensions = resizeCanvas(canvas, gl, resolutionRatio)
            lastResolutionRatio = resolutionRatio
            renderTimes = []
        }

        lastRender = currentTime

        const frame = frameBuffers[frameNumber % 2]
        const prevFrame = frameBuffers[(frameNumber + 1) % 2]

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frame.framebuffer)

        let uniforms = {
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
        // filter out null, undefined, and NaN values
        uniforms = Object.fromEntries(
            Object.entries(uniforms).filter(([, value]) => value !== null && value !== undefined && !Number.isNaN(value))
        )
        // resolve uniform references;
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

const resolveReferences = (uniforms) => {
    uniforms = { ...uniforms }
    // resolve references to other uniforms
    // if the value of a uniform is a string, find the value of that uniform and replace the string with the value
    for (const [key, value] of Object.entries(uniforms)) {
        if(typeof value !== 'string') continue

        const resolvedValue = uniforms[value]
        if(resolvedValue === undefined) continue
        uniforms[key] = resolvedValue
    }
    return uniforms
}
