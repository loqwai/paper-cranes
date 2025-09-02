import { WorkerRPCError } from '../../types/global.js'
import type { ComputedValue, WorkerMessage, AudioStats } from '../../types/audio.js'

const DEFAULT_TIMEOUT = 50
const DEFAULT_HISTORY_SIZE = 100

export class WorkerRPC {
  private worker: Worker | null = null
  private readonly workerName: string
  private readonly historySize: number
  private readonly timeout: number
  private currentMessageId = 0
  private pendingResolvers = new Map<number, (value: ComputedValue) => void>()
  private lastMessage: ComputedValue
  private isInitialized = false

  constructor(workerName: string, historySize = DEFAULT_HISTORY_SIZE, timeout = DEFAULT_TIMEOUT) {
    this.workerName = workerName
    this.historySize = historySize
    this.timeout = timeout
    this.lastMessage = this.createDefaultMessage()
  }

  private createDefaultMessage(): ComputedValue {
    return {
      type: 'computedValue',
      workerName: this.workerName,
      value: 0,
      stats: {
        current: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        variance: 0,
        standardDeviation: 0,
        zScore: 0,
        normalized: 0,
      },
    }
  }

  private validateStats(stats: Partial<AudioStats> = {}): AudioStats {
    return {
      current: isFinite(stats.current ?? 0) ? stats.current! : 0,
      mean: isFinite(stats.mean ?? 0) ? stats.mean! : 0,
      median: isFinite(stats.median ?? 0) ? stats.median! : 0,
      min: isFinite(stats.min ?? 0) ? stats.min! : 0,
      max: isFinite(stats.max ?? 0) ? stats.max! : 0,
      variance: isFinite(stats.variance ?? 0) ? stats.variance! : 0,
      standardDeviation: isFinite(stats.standardDeviation ?? 0) ? stats.standardDeviation! : 0,
      zScore: isFinite(stats.zScore ?? 0) ? stats.zScore! : 0,
      normalized: isFinite(stats.normalized ?? 0) ? stats.normalized! : 0,
    }
  }

  private validateMessage(message: any): ComputedValue {
    if (!message || typeof message !== 'object') {
      throw new WorkerRPCError('Invalid message format', this.workerName)
    }

    return {
      ...message,
      workerName: this.workerName,
      value: isFinite(message.value) ? message.value : 0,
      stats: this.validateStats(message.stats),
    }
  }

  private handleMessage = (event: MessageEvent<WorkerMessage>): void => {
    if (event.data.type !== 'computedValue') return

    try {
      const validatedMessage = this.validateMessage(event.data)
      this.lastMessage = validatedMessage

      const messageId = event.data.id
      if (messageId !== undefined && this.pendingResolvers.has(messageId)) {
        const resolver = this.pendingResolvers.get(messageId)!
        this.pendingResolvers.delete(messageId)
        resolver(validatedMessage)
      }
    } catch (err) {
      throw new WorkerRPCError('Failed to handle worker message', this.workerName, err)
    }
  }

  private handleError = (error: ErrorEvent): void => {
    const errorMessage = `Worker error: ${error.message} at ${error.filename}:${error.lineno}`
    throw new WorkerRPCError(errorMessage, this.workerName, error.error)
  }

  async processData(fftData: Float32Array): Promise<ComputedValue> {
    if (!this.isInitialized || !this.worker) {
      throw new WorkerRPCError('WorkerRPC not initialized', this.workerName)
    }

    // Clear any existing pending resolver for this worker to prevent race conditions
    this.pendingResolvers.clear()

    const messageId = ++this.currentMessageId

    const messagePromise = new Promise<ComputedValue>((resolve, reject) => {
      this.pendingResolvers.set(messageId, resolve)

      // Set up timeout that will blow up loudly instead of falling back
      const timeoutId = setTimeout(() => {
        this.pendingResolvers.delete(messageId)
        reject(new WorkerRPCError(
          `Worker ${this.workerName} failed to respond within ${this.timeout}ms`,
          this.workerName
        ))
      }, this.timeout)

      // Clear timeout when resolved
      const originalResolver = this.pendingResolvers.get(messageId)!
      this.pendingResolvers.set(messageId, (value) => {
        clearTimeout(timeoutId)
        originalResolver(value)
      })
    })

    try {
      this.worker.postMessage({
        type: 'fftData',
        id: messageId,
        data: { fft: fftData },
      })
    } catch (err) {
      this.pendingResolvers.delete(messageId)
      throw new WorkerRPCError('Failed to send message to worker', this.workerName, err)
    }

    return messagePromise
  }

  setHistorySize(historySize: number): void {
    if (!this.isInitialized || !this.worker) {
      throw new WorkerRPCError('WorkerRPC not initialized', this.workerName)
    }

    if (historySize <= 0 || !isFinite(historySize)) {
      throw new WorkerRPCError(`Invalid history size: ${historySize}`, this.workerName)
    }

    if (this.historySize !== historySize) {
      try {
        this.worker.postMessage({
          type: 'config',
          data: { historySize },
        })
      } catch (err) {
        throw new WorkerRPCError('Failed to update worker history size', this.workerName, err)
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new WorkerRPCError('WorkerRPC already initialized', this.workerName)
    }

    try {
      this.worker = new Worker(`/src/audio/analyzer.js`, { type: "module" })
    } catch (err) {
      throw new WorkerRPCError('Failed to create worker', this.workerName, err)
    }

    this.worker.onmessage = this.handleMessage
    this.worker.onerror = this.handleError

    try {
      this.worker.postMessage({
        type: 'config',
        data: {
          historySize: this.historySize,
          analyzerName: this.workerName,
        },
      })
    } catch (err) {
      this.terminate()
      throw new WorkerRPCError('Failed to configure worker', this.workerName, err)
    }

    this.isInitialized = true
  }

  terminate(): void {
    // Clear all pending resolvers to prevent memory leaks
    for (const [messageId, resolver] of this.pendingResolvers) {
      try {
        resolver(this.lastMessage)
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.pendingResolvers.clear()

    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    this.isInitialized = false
  }

  get isActive(): boolean {
    return this.isInitialized && this.worker !== null
  }

  get lastValidMessage(): ComputedValue {
    return this.lastMessage
  }
}