export interface CranesGlobalState {
  readonly error: ShaderCompileError | null
  readonly touchX: number
  readonly touchY: number
  readonly touched: boolean
}

export interface ShaderCompileError {
  readonly lineNumber: number
  readonly message: string
}

export interface FrameFeatures {
  readonly time: number
  readonly touchX: number
  readonly touchY: number
  readonly touched: boolean
  readonly beat: boolean
  readonly [key: string]: number | boolean
}

export class AudioProcessorError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'AudioProcessorError'
  }
}

export class ShaderError extends Error {
  constructor(message: string, public readonly lineNumber?: number, public readonly cause?: unknown) {
    super(message)
    this.name = 'ShaderError'
  }
}

export class WorkerRPCError extends Error {
  constructor(message: string, public readonly workerName: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'WorkerRPCError'
  }
}

export class FetchError extends Error {
  constructor(message: string, public readonly url: string, public readonly status?: number, public readonly cause?: unknown) {
    super(message)
    this.name = 'FetchError'
  }
}

declare global {
  interface Window {
    cranes: CranesGlobalState
  }
}