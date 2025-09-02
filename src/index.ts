import { PaperCranesApp } from './core/PaperCranesApp.js'
import { AudioProcessorError, ShaderError, FetchError, WorkerRPCError } from './types/global.js'

const DEFAULT_SHADER = 'default'
const DEFAULT_IMAGE = '/images/initial.png'

class AppErrorBoundary {
  private app: PaperCranesApp | null = null
  private canvas: HTMLCanvasElement | null = null
  private errorContainer: HTMLElement | null = null

  async initialize(): Promise<void> {
    // Set up global error handlers - blow up loudly
    this.setupGlobalErrorHandlers()

    // Get canvas element
    this.canvas = document.querySelector('canvas')
    if (!this.canvas) {
      throw new Error('Canvas element not found - required for WebGL rendering')
    }

    // Create error container for user feedback
    this.createErrorContainer()

    // Initialize the app
    this.app = new PaperCranesApp()
    
    try {
      await this.app.initialize(this.canvas, DEFAULT_IMAGE, true)
    } catch (err) {
      this.handleInitializationError(err)
      return
    }

    // Load shader from URL params or default
    const shaderName = this.getShaderFromURL()
    
    try {
      await this.app.loadShader(shaderName)
    } catch (err) {
      this.handleShaderLoadError(err, shaderName)
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Unhandled errors - blow up loudly
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, event.filename, event.lineno, event.colno)
    })

    // Unhandled promise rejections - blow up loudly
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, 'promise', 0, 0)
      event.preventDefault() // Prevent console spam, but we still handle it
    })

    // WebGL context lost - this is actually recoverable but we'll blow up anyway
    if (this.canvas) {
      this.canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault()
        this.handleGlobalError(new Error('WebGL context lost - hardware failure or driver issue'), 'webgl', 0, 0)
      })
    }
  }

  private createErrorContainer(): void {
    this.errorContainer = document.createElement('div')
    this.errorContainer.id = 'error-container'
    this.errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff1744;
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      max-width: 400px;
      z-index: 9999;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `
    document.body.appendChild(this.errorContainer)
  }

  private getShaderFromURL(): string {
    const params = new URLSearchParams(window.location.search)
    const shader = params.get('shader')
    
    if (shader && typeof shader === 'string' && shader.trim()) {
      return shader.trim()
    }
    
    return DEFAULT_SHADER
  }

  private handleInitializationError(err: unknown): never {
    const errorMessage = this.formatError(err, 'Initialization Failed')
    this.displayError(errorMessage)
    
    console.error('PaperCranes initialization failed:', err)
    
    // Blow up loudly - initialization failure is not recoverable
    throw new Error(`PaperCranes initialization failed: ${errorMessage}`)
  }

  private handleShaderLoadError(err: unknown, shaderName: string): void {
    const errorMessage = this.formatError(err, `Shader Load Failed: ${shaderName}`)
    this.displayError(errorMessage)
    
    console.error('Shader load failed:', err)
    
    // Try to load default shader as last resort
    if (shaderName !== DEFAULT_SHADER) {
      console.warn(`Attempting to load default shader after failure with: ${shaderName}`)
      this.app?.loadShader(DEFAULT_SHADER).catch((defaultErr) => {
        // If default shader also fails, blow up completely
        const defaultErrorMessage = this.formatError(defaultErr, 'Default Shader Load Failed')
        this.displayError(`${errorMessage}\\n\\nDefault shader also failed:\\n${defaultErrorMessage}`)
        throw new Error(`All shader loading failed: ${defaultErrorMessage}`)
      })
    } else {
      // Default shader failed - blow up completely
      throw new Error(`Default shader failed to load: ${errorMessage}`)
    }
  }

  private handleGlobalError(err: unknown, filename?: string, lineno?: number, colno?: number): void {
    const location = filename ? ` at ${filename}:${lineno}:${colno}` : ''
    const errorMessage = this.formatError(err, `Global Error${location}`)
    
    this.displayError(errorMessage)
    console.error('Global error:', err)
    
    // Clean up resources
    if (this.app) {
      try {
        this.app.destroy()
      } catch (cleanupErr) {
        console.error('Error during cleanup:', cleanupErr)
      }
    }
    
    // Blow up loudly - global errors are not recoverable
    throw new Error(`Unrecoverable error: ${errorMessage}`)
  }

  private formatError(err: unknown, prefix: string): string {
    if (err instanceof AudioProcessorError) {
      return `${prefix}\\nAudio: ${err.message}`
    }
    
    if (err instanceof ShaderError) {
      const lineInfo = err.lineNumber ? ` (line ${err.lineNumber})` : ''
      return `${prefix}\\nShader${lineInfo}: ${err.message}`
    }
    
    if (err instanceof FetchError) {
      const statusInfo = err.status ? ` (${err.status})` : ''
      return `${prefix}\\nNetwork${statusInfo}: ${err.message}\\nURL: ${err.url}`
    }
    
    if (err instanceof WorkerRPCError) {
      return `${prefix}\\nWorker (${err.workerName}): ${err.message}`
    }
    
    if (err instanceof Error) {
      return `${prefix}\\n${err.name}: ${err.message}`
    }
    
    return `${prefix}\\nUnknown error: ${String(err)}`
  }

  private displayError(message: string): void {
    if (!this.errorContainer) return
    
    this.errorContainer.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">💀 PAPER CRANES ERROR 💀</div>
      <div style="white-space: pre-wrap; font-size: 12px;">${message}</div>
      <div style="margin-top: 10px; font-size: 11px; opacity: 0.8;">
        Check console for full details. Refresh to retry.
      </div>
    `
    this.errorContainer.style.display = 'block'
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}

async function initializeApp(): Promise<void> {
  const errorBoundary = new AppErrorBoundary()
  
  try {
    await errorBoundary.initialize()
  } catch (err) {
    // Final catch - if even our error boundary fails, show basic error
    console.error('Critical failure - error boundary failed:', err)
    document.body.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff1744;
        color: white;
        padding: 40px;
        border-radius: 12px;
        font-family: 'Courier New', monospace;
        font-size: 16px;
        text-align: center;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">💀</div>
        <div style="font-weight: bold; margin-bottom: 20px;">CRITICAL FAILURE</div>
        <div style="margin-bottom: 20px;">PaperCranes failed to initialize</div>
        <div style="font-size: 12px; opacity: 0.8;">Check console and refresh</div>
      </div>
    `
    
    // Still throw to maintain ADD methodology
    throw err
  }
}