export interface WebGLContextConfig {
  readonly antialias: false
  readonly powerPreference: 'high-performance'
  readonly attributes: {
    readonly alpha: false
    readonly depth: false
    readonly stencil: false
    readonly preserveDrawingBuffer: false
    readonly pixelRatio: 1
  }
}

export interface ShaderUniforms {
  readonly iTime: number
  readonly iFrame: number
  readonly time: number
  readonly prevFrame: WebGLTexture
  readonly initialFrame: WebGLTexture
  readonly resolution: readonly [number, number]
  readonly frame: number
  readonly iRandom: number
  readonly iResolution: readonly [number, number, number]
  readonly iMouse: readonly [number, number, number, number]
  readonly iChannel0: WebGLTexture
  readonly iChannel1: WebGLTexture
  readonly iChannel2: WebGLTexture
  readonly iChannel3: WebGLTexture
  readonly touched: boolean
  readonly touchX: number
  readonly touchY: number
  readonly beat: boolean
  readonly [key: string]: number | boolean | WebGLTexture | readonly number[]
}

export interface FrameBuffer {
  readonly framebuffer: WebGLFramebuffer | null
  readonly attachments: readonly WebGLTexture[]
  readonly width: number
  readonly height: number
}

export interface RenderContext {
  readonly time: number
  readonly features: Record<string, number | boolean>
  readonly fragmentShader: string
}

export interface VisualizerConfig {
  readonly canvas: HTMLCanvasElement
  readonly initialImageUrl: string
  readonly fullscreen: boolean
}

export type RenderFunction = (context: RenderContext) => void