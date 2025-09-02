export interface AudioFeatures {
  readonly [key: string]: number
}

export interface AudioStats {
  readonly current: number
  readonly mean: number
  readonly median: number
  readonly min: number
  readonly max: number
  readonly variance: number
  readonly standardDeviation: number
  readonly zScore: number
  readonly normalized: number
}

export interface ComputedValue {
  readonly type: 'computedValue'
  readonly workerName: string
  readonly value: number
  readonly stats: AudioStats
  readonly id?: number
}

export interface FFTData {
  readonly type: 'fftData'
  readonly id: number
  readonly data: {
    readonly fft: Float32Array
  }
}

export interface WorkerConfig {
  readonly type: 'config'
  readonly data: {
    readonly historySize: number
    readonly analyzerName?: string
  }
}

export type WorkerMessage = ComputedValue | FFTData | WorkerConfig

export interface AudioProcessorConfig {
  readonly sampleRate: number
  readonly bufferSize: number
  readonly smoothingTimeConstant: number
  readonly fftSize: number
  readonly minDecibels: number
  readonly maxDecibels: number
}

export interface AudioAnalysisResult {
  readonly features: AudioFeatures
  readonly beat: boolean
  readonly timestamp: number
}