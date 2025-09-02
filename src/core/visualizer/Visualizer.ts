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

import { ShaderWrapper } from '../shaders/ShaderWrapper.js'
import { ShaderError } from '../../types/global.js'
import type { VisualizerConfig, RenderFunction, RenderContext, FrameBuffer, ShaderUniforms, WebGLContextConfig } from '../../types/webgl.js'

const FULL_SCREEN_QUAD_POSITIONS = [
  -1, -1, 0,
  1, -1, 0,
  -1, 1, 0,
  -1, 1, 0,
  1, -1, 0,
  1, 1, 0,
]

const DEFAULT_VERTEX_SHADER = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}`

const WEBGL_CONTEXT_CONFIG: WebGLContextConfig = {
  antialias: false,
  powerPreference: 'high-performance',
  attributes: {
    alpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    pixelRatio: 1
  }
}

const getWebGLTexture = async (gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> => {
  return new Promise((resolve, reject) => {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    const texture = createTexture(gl, {
      src: url,
      crossOrigin: 'anonymous',
      min: gl.NEAREST,
      mag: gl.NEAREST,
      wrap: gl.REPEAT
    }, (err) => {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      if (err) {
        reject(new ShaderError(`Failed to load texture from ${url}`, undefined, err))
        return
      }
      resolve(texture)
    })
  })
}

const handleShaderCompileError = (gl: WebGL2RenderingContext, wrappedFragmentShader: string): never => {
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
  if (!fragmentShader) {
    throw new ShaderError('Failed to create fragment shader')
  }
  
  gl.shaderSource(fragmentShader, wrappedFragmentShader)
  gl.compileShader(fragmentShader)

  const error = gl.getShaderInfoLog(fragmentShader)
  gl.deleteShader(fragmentShader)

  if (!error) {
    throw new ShaderError('Shader compilation failed with no error message')
  }

  const wrappedLines = wrappedFragmentShader.split('\n')
  const headerLines = wrappedLines.findIndex(line => line.includes('31CF3F64-9176-4686-9E52-E3CFEC21FE72'))

  let message = 'Unknown shader error'
  let lineNumber = 0
  
  for (const line of error.matchAll(/ERROR: \d+:(\d+):/g)) {
    lineNumber = parseInt(line[1]!, 10) - headerLines - 1
    message = error.split(':').slice(3).join(':').trim()
    break
  }

  const shaderError = new ShaderError(message, lineNumber)
  
  window.cranes = {
    ...window.cranes,
    error: { lineNumber, message }
  }

  throw shaderError
}

const calculateResolutionRatio = (frameTime: number, renderTimes: number[], lastRatio: number): number => {
  if (frameTime <= 0 || !isFinite(frameTime)) {
    throw new ShaderError(`Invalid frame time: ${frameTime}`)
  }
  
  renderTimes.push(frameTime)
  if (renderTimes.length > 20) renderTimes.shift()
  if (renderTimes.length < 20) return lastRatio

  const avgFrameTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length
  
  if (!isFinite(avgFrameTime)) {
    throw new ShaderError(`Invalid average frame time: ${avgFrameTime}`)
  }

  if (avgFrameTime > 50) {
    const newRatio = Math.max(0.1, lastRatio - 0.1)
    if (newRatio < 0.1) {
      throw new ShaderError('Performance too low - cannot render below 0.1 resolution ratio')
    }
    return newRatio
  }
  
  if (avgFrameTime < 20 && lastRatio < 1) {
    return Math.min(1, lastRatio + 0.1)
  }
  
  return lastRatio
}

const requestWakeLock = async (): Promise<WakeLockSentinel | null> => {
  if (!navigator.wakeLock) return null
  
  try {
    return await navigator.wakeLock.request('screen')
  } catch (err) {
    throw new ShaderError('Failed to acquire wake lock', undefined, err)
  }
}

export const makeVisualizer = async (config: VisualizerConfig): Promise<RenderFunction> => {
  const { canvas, initialImageUrl, fullscreen } = config
  
  await requestWakeLock()

  const gl = canvas.getContext('webgl2', WEBGL_CONTEXT_CONFIG)
  if (!gl) {
    throw new ShaderError('Failed to get WebGL2 context - WebGL2 is required')
  }

  if (fullscreen) {
    const width = window.innerWidth
    const height = window.innerHeight
    if (width <= 0 || height <= 0) {
      throw new ShaderError(`Invalid screen dimensions: ${width}x${height}`)
    }
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
    canvas.classList.add('fullscreen')
  }

  const initialTexture = await getWebGLTexture(gl, initialImageUrl)
  const frameBuffers: [FrameBuffer, FrameBuffer] = [
    createFramebufferInfo(gl) as FrameBuffer,
    createFramebufferInfo(gl) as FrameBuffer
  ]

  frameBuffers.forEach(fb => {
    const texture = fb.attachments[0]
    if (!texture) {
      throw new ShaderError('Failed to create framebuffer texture')
    }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  })

  const bufferInfo = createBufferInfoFromArrays(gl, { position: FULL_SCREEN_QUAD_POSITIONS })

  let frameNumber = 0
  let lastRender = performance.now()
  let programInfo: any = null
  let lastFragmentShader = ''
  let renderTimes: number[] = []
  let lastResolutionRatio = 1

  const render: RenderFunction = ({ time, features, fragmentShader: newFragmentShader }: RenderContext) => {
    if (newFragmentShader !== lastFragmentShader) {
      const wrappedFragmentShader = ShaderWrapper.transform(newFragmentShader)

      const newProgramInfo = createProgramInfo(gl, [DEFAULT_VERTEX_SHADER, wrappedFragmentShader])
      if (!newProgramInfo?.program) {
        handleShaderCompileError(gl, wrappedFragmentShader)
      }

      gl.useProgram(newProgramInfo.program)
      window.cranes = { ...window.cranes, error: null }
      programInfo = newProgramInfo
      lastFragmentShader = newFragmentShader
    }

    if (!programInfo) {
      throw new ShaderError('No valid shader program available')
    }

    const currentTime = performance.now()
    const frameTime = currentTime - lastRender

    const resolutionRatio = calculateResolutionRatio(frameTime, renderTimes, lastResolutionRatio)

    if (resolutionRatio !== lastResolutionRatio) {
      resizeCanvasToDisplaySize(gl.canvas, resolutionRatio)
      lastResolutionRatio = resolutionRatio
      renderTimes = []
    }

    lastRender = currentTime

    const frame = frameBuffers[frameNumber % 2]!
    const prevFrame = frameBuffers[(frameNumber + 1) % 2]!

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frame.framebuffer)

    const uniforms: ShaderUniforms = {
      iTime: time,
      iFrame: frameNumber,
      time,
      prevFrame: frameNumber === 0 ? initialTexture : prevFrame.attachments[0]!,
      initialFrame: initialTexture,
      resolution: [frame.width, frame.height] as const,
      frame: frameNumber,
      iRandom: Math.random(),
      iResolution: [frame.width, frame.height, 0] as const,
      iMouse: [features.touchX ?? 0, features.touchY ?? 0, features.touched ? 1 : 0, 0] as const,
      iChannel0: initialTexture,
      iChannel1: prevFrame.attachments[0]!,
      iChannel2: initialTexture,
      iChannel3: prevFrame.attachments[0]!,
      touched: Boolean(features.touched),
      touchX: Number(features.touchX) || 0,
      touchY: Number(features.touchY) || 0,
      beat: Boolean(features.beat),
      ...Object.fromEntries(
        Object.entries(features).filter(([, value]) => 
          value != null && !Number.isNaN(value as number)
        )
      )
    }

    const resolvedUniforms = resolveUniformReferences(uniforms)

    setBuffersAndAttributes(gl, programInfo, bufferInfo)
    setUniforms(programInfo, resolvedUniforms)
    drawBufferInfo(gl, bufferInfo)

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame.framebuffer)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
    gl.blitFramebuffer(0, 0, frame.width, frame.height, 0, 0, gl.canvas.width, gl.canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST)

    frameNumber++
  }

  return render
}

const resolveUniformReferences = (uniforms: ShaderUniforms): ShaderUniforms => {
  const resolved = { ...uniforms }
  
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string') {
      const resolvedValue = resolved[value]
      if (resolvedValue === undefined) {
        throw new ShaderError(`Uniform reference '${value}' for '${key}' not found`)
      }
      resolved[key] = resolvedValue
    }
  }
  
  return resolved
}