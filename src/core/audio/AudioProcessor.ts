import { AudioProcessorError } from '../../types/global.js'
import type { AudioFeatures, AudioProcessorConfig, AudioAnalysisResult } from '../../types/audio.js'

const DEFAULT_CONFIG: AudioProcessorConfig = {
  sampleRate: 44100,
  bufferSize: 4096,
  smoothingTimeConstant: 0.8,
  fftSize: 2048,
  minDecibels: -100,
  maxDecibels: -30
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private analyserNode: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private dataArray: Float32Array | null = null
  private isInitialized = false
  private readonly config: AudioProcessorConfig

  constructor(config: Partial<AudioProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new AudioProcessorError('AudioProcessor already initialized')
    }

    try {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive'
      })
    } catch (err) {
      throw new AudioProcessorError('Failed to create AudioContext', err)
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch (err) {
        throw new AudioProcessorError('Failed to resume AudioContext', err)
      }
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: this.config.sampleRate
        }
      })
    } catch (err) {
      throw new AudioProcessorError('Failed to access microphone', err)
    }

    try {
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = this.config.fftSize
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant
      this.analyserNode.minDecibels = this.config.minDecibels
      this.analyserNode.maxDecibels = this.config.maxDecibels

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.sourceNode.connect(this.analyserNode)

      this.dataArray = new Float32Array(this.analyserNode.frequencyBinCount)
    } catch (err) {
      this.cleanup()
      throw new AudioProcessorError('Failed to create audio analysis chain', err)
    }

    this.isInitialized = true
  }

  getAnalysisData(): AudioAnalysisResult {
    if (!this.isInitialized || !this.analyserNode || !this.dataArray) {
      throw new AudioProcessorError('AudioProcessor not properly initialized')
    }

    this.analyserNode.getFloatFrequencyData(this.dataArray)
    
    const features = this.extractFeatures(this.dataArray)
    const beat = this.detectBeat(features)

    return {
      features,
      beat,
      timestamp: performance.now()
    }
  }

  private extractFeatures(frequencyData: Float32Array): AudioFeatures {
    const features: Record<string, number> = {}
    
    const binCount = frequencyData.length
    const sampleRate = this.config.sampleRate
    const nyquist = sampleRate / 2
    
    let totalEnergy = 0
    let lowEnergy = 0
    let midEnergy = 0
    let highEnergy = 0
    
    for (let i = 0; i < binCount; i++) {
      const magnitude = Math.pow(10, frequencyData[i]! / 20)
      const frequency = (i / binCount) * nyquist
      
      totalEnergy += magnitude
      
      if (frequency < 250) {
        lowEnergy += magnitude
      } else if (frequency < 4000) {
        midEnergy += magnitude
      } else {
        highEnergy += magnitude
      }
    }
    
    if (!isFinite(totalEnergy) || totalEnergy === 0) {
      throw new AudioProcessorError('Invalid audio analysis data - no signal detected')
    }
    
    features.energy = totalEnergy
    features.lowEnergy = lowEnergy
    features.midEnergy = midEnergy
    features.highEnergy = highEnergy
    features.spectralCentroid = this.calculateSpectralCentroid(frequencyData)
    features.spectralRolloff = this.calculateSpectralRolloff(frequencyData)
    features.zeroCrossingRate = this.calculateZeroCrossingRate()
    
    return features
  }

  private calculateSpectralCentroid(frequencyData: Float32Array): number {
    let weightedSum = 0
    let magnitudeSum = 0
    
    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = Math.pow(10, frequencyData[i]! / 20)
      const frequency = (i / frequencyData.length) * (this.config.sampleRate / 2)
      
      weightedSum += frequency * magnitude
      magnitudeSum += magnitude
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
  }

  private calculateSpectralRolloff(frequencyData: Float32Array): number {
    const magnitudes = frequencyData.map(db => Math.pow(10, db / 20))
    const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag, 0)
    const threshold = totalEnergy * 0.85
    
    let runningSum = 0
    for (let i = 0; i < magnitudes.length; i++) {
      runningSum += magnitudes[i]!
      if (runningSum >= threshold) {
        return (i / magnitudes.length) * (this.config.sampleRate / 2)
      }
    }
    
    return this.config.sampleRate / 2
  }

  private calculateZeroCrossingRate(): number {
    return 0
  }

  private detectBeat(features: AudioFeatures): boolean {
    const energyThreshold = 1.5
    const currentEnergy = features.energy ?? 0
    const averageEnergy = this.getAverageEnergy()
    
    return currentEnergy > averageEnergy * energyThreshold
  }

  private getAverageEnergy(): number {
    return 1.0
  }

  cleanup(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop()
      }
      this.mediaStream = null
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => {
        console.error('Error closing AudioContext:', err)
      })
      this.audioContext = null
    }

    this.dataArray = null
    this.isInitialized = false
  }

  get isActive(): boolean {
    return this.isInitialized && this.audioContext?.state === 'running'
  }

  get sampleRate(): number {
    return this.audioContext?.sampleRate ?? this.config.sampleRate
  }
}

export const getFlatAudioFeatures = (): AudioFeatures => {
  return {
    energy: 0,
    lowEnergy: 0,
    midEnergy: 0,
    highEnergy: 0,
    spectralCentroid: 0,
    spectralRolloff: 0,
    zeroCrossingRate: 0
  }
}