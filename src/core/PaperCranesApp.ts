import { makeVisualizer } from './visualizer/Visualizer.js'
import { AudioProcessor } from './audio/AudioProcessor.js'
import { getRelativeOrAbsoluteShaderUrl } from '../utils/loaders.js'
import { AudioProcessorError, ShaderError, FetchError } from '../types/global.js'
import type { RenderFunction, VisualizerConfig } from '../types/webgl.js'
import type { CranesGlobalState } from '../types/global.js'

export class PaperCranesApp {
  private render: RenderFunction | null = null
  private audioProcessor: AudioProcessor | null = null
  private canvas: HTMLCanvasElement | null = null
  private animationId: number | null = null
  private startTime = 0
  private isRunning = false

  async initialize(canvas: HTMLCanvasElement, initialImageUrl: string, fullscreen = false): Promise<void> {
    if (this.isRunning) {
      throw new Error('PaperCranesApp already initialized')
    }

    this.canvas = canvas
    
    // Initialize global state - blow up if window.cranes already exists incorrectly
    if (window.cranes && typeof window.cranes !== 'object') {
      throw new Error('window.cranes exists but is not an object - conflicting global state')
    }

    window.cranes = {
      error: null,
      touchX: 0,
      touchY: 0,
      touched: false
    }

    // Initialize visualizer
    const visualizerConfig: VisualizerConfig = {
      canvas,
      initialImageUrl,
      fullscreen
    }

    try {
      this.render = await makeVisualizer(visualizerConfig)
    } catch (err) {
      throw new ShaderError('Failed to initialize visualizer', undefined, err)
    }

    // Initialize audio processor
    try {
      this.audioProcessor = new AudioProcessor()
      await this.audioProcessor.initialize()
    } catch (err) {
      throw new AudioProcessorError('Failed to initialize audio processor', err)
    }

    // Set up touch/mouse events
    this.setupInputEvents()

    // Register service worker with proper error handling
    await this.registerServiceWorker()

    this.isRunning = true
  }

  async loadShader(shaderName: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('PaperCranesApp not initialized')
    }

    try {
      const shaderContent = await getRelativeOrAbsoluteShaderUrl(shaderName)
      
      if (!this.render || !this.audioProcessor) {
        throw new Error('App components not properly initialized')
      }

      this.startRenderLoop(shaderContent)
    } catch (err) {
      if (err instanceof FetchError) {
        throw err
      }
      throw new ShaderError(`Failed to load shader: ${shaderName}`, undefined, err)
    }
  }

  private startRenderLoop(fragmentShader: string): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
    }

    this.startTime = performance.now()

    const renderFrame = (): void => {
      if (!this.render || !this.audioProcessor || !this.isRunning) {
        return
      }

      try {
        const currentTime = (performance.now() - this.startTime) / 1000
        const analysisResult = this.audioProcessor.getAnalysisData()
        
        const features = {
          ...analysisResult.features,
          touchX: window.cranes.touchX,
          touchY: window.cranes.touchY,
          touched: window.cranes.touched,
          beat: analysisResult.beat
        }

        this.render({
          time: currentTime,
          features,
          fragmentShader
        })

        this.animationId = requestAnimationFrame(renderFrame)
      } catch (err) {
        this.handleRenderError(err)
      }
    }

    this.animationId = requestAnimationFrame(renderFrame)
  }

  private setupInputEvents(): void {
    if (!this.canvas) {
      throw new Error('Canvas not available for input setup')
    }

    const updateTouch = (clientX: number, clientY: number, touched: boolean): void => {
      if (!this.canvas) return

      const rect = this.canvas.getBoundingClientRect()
      window.cranes = {
        ...window.cranes,
        touchX: clientX - rect.left,
        touchY: clientY - rect.top,
        touched
      }
    }

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      updateTouch(e.clientX, e.clientY, true)
    })

    this.canvas.addEventListener('mousemove', (e) => {
      updateTouch(e.clientX, e.clientY, window.cranes.touched)
    })

    this.canvas.addEventListener('mouseup', () => {
      window.cranes = { ...window.cranes, touched: false }
    })

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) {
        updateTouch(touch.clientX, touch.clientY, true)
      }
    })

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) {
        updateTouch(touch.clientX, touch.clientY, true)
      }
    })

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      window.cranes = { ...window.cranes, touched: false }
    })
  }

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      // Don't blow up for missing service worker support - this is optional
      console.warn('Service Worker not supported')
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      
      // Only attempt to post messages if we have an active controller
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_CURRENT_PAGE'
        })
      } else {
        console.warn('No active service worker controller available')
      }

      registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found')
      })
    } catch (err) {
      // Service worker registration failure is not critical - log but don't blow up
      console.error('Service Worker registration failed:', err)
    }
  }

  private handleRenderError(err: unknown): void {
    console.error('Render error:', err)
    
    // Stop the render loop to prevent cascading errors
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    // Update global error state for user feedback
    const errorMessage = err instanceof Error ? err.message : 'Unknown render error'
    window.cranes = {
      ...window.cranes,
      error: {
        lineNumber: err instanceof ShaderError ? err.lineNumber ?? 0 : 0,
        message: errorMessage
      }
    }

    // Re-throw to let the global error handler catch it
    throw err
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    if (this.audioProcessor) {
      this.audioProcessor.cleanup()
      this.audioProcessor = null
    }

    this.render = null
    this.canvas = null
    this.isRunning = false
  }

  get isInitialized(): boolean {
    return this.isRunning
  }
}