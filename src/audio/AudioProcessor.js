import { StatTypes } from 'hypnosound'
import { WorkerRPC } from './WorkerRPC'

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))
export const AudioFeatures = [
    'SpectralCentroid',
    'SpectralFlux',
    'SpectralSpread',
    'SpectralRolloff',
    'SpectralRoughness',
    'SpectralKurtosis',
    'Energy',
    'SpectralEntropy',
    'SpectralCrest',
    'SpectralSkew',
    'PitchClass',
    'Bass',
    'Mids',
    'Treble',
]

export const getFlatAudioFeatures = (audioFeatures = AudioFeatures, rawFeatures = {}) => {
    const features = {}
    for (const feature of audioFeatures) {
        // the key in features is the same as the key in rawFeatures, except the first letter is lowercased
        const featureKey = feature.charAt(0).toLowerCase() + feature.slice(1)

        for (const propertyKey of StatTypes) {
            const key = `${featureKey}${propertyKey.charAt(0).toUpperCase() + propertyKey.slice(1)}`
            features[key] = rawFeatures[feature]?.stats[propertyKey]
        }
        features[featureKey] = rawFeatures[feature]?.stats?.current
    }
    return features
}

export class AudioProcessor {
    constructor(audioContext, sourceNode, historySize, fftSize = 4096) {
        this.audioContext = audioContext
        this.sourceNode = sourceNode
        this.historySize = historySize
        this.fftSize = fftSize
        this.fftAnalyzer = null
        this.fftData = null
        this.windowNode = null
        this.workers = new Map()
        this.rawFeatures = {}
        this.currentFeatures = this.initializeFeatures()
        this.debugCount = 0
    }

    initializeFeatures = () => {
        const features = getFlatAudioFeatures()
        features.beat = false
        return features
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.5
        analyzer.fftSize = this.fftSize
        return analyzer
    }

    setupAudioNodes = async () => {
        // Create analyzer first
        this.fftAnalyzer = this.createAnalyzer()
        this.fftData = new Uint8Array(this.fftAnalyzer.frequencyBinCount)

        // Connect source directly to analyzer
        this.sourceNode.connect(this.fftAnalyzer)

        // Now set up worklet
        await this.audioContext.audioWorklet.addModule('src/window-processor.js')
        this.windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')

        // Only connect source to worklet, don't connect to destination
        // This is for analysis only, not playback
        this.sourceNode.connect(this.windowNode)

        console.log('Audio chain setup:', {
            contextState: this.audioContext.state,
            sampleRate: this.audioContext.sampleRate,
            fftSize: this.fftSize,
            binCount: this.fftAnalyzer.frequencyBinCount
        })
    }

    initializeWorker = async (name) => {
        const worker = new WorkerRPC(name, this.historySize)
        await worker.initialize()
        this.workers.set(name, worker)
    }

    initializeAllWorkers = async () => {
        await Promise.all(AudioFeatures.map(this.initializeWorker))
    }

    processFeatures = async () => {
        requestAnimationFrame(this.processFeatures)

        // Get FFT data
        this.fftAnalyzer.getByteFrequencyData(this.fftData)

        // Debug FFT data periodically
        if (this.debugCount++ % 60 === 0) {
            const sum = this.fftData.reduce((a, b) => a + b, 0)
            console.log('FFT Data:', {
                sum,
                contextState: this.audioContext.state,
                first10: Array.from(this.fftData.slice(0, 10))
            })
        }

        // Skip if no significant audio data
        const sum = this.fftData.reduce((a, b) => a + b, 0)
        if (sum < 1) {
            return
        }

        try {
            const workerPromises = Array.from(this.workers.values())
                .map(worker => worker.processData(this.fftData))

            const results = await Promise.all(workerPromises)

            // Update features atomically
            results.forEach(result => {
                if (result) {
                    this.rawFeatures[result.workerName] = result
                }
            })

            this.currentFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
            this.currentFeatures.beat = this.isBeat()

        } catch (error) {
            console.warn('Error processing features:', error)
        }
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        if (!spectralFlux) return false
        const { stats } = spectralFlux
        return stats.zScore > 0.9
    }

    getFeatures = () => {
        return this.currentFeatures
    }

    start = async () => {
        await this.setupAudioNodes()
        await this.initializeAllWorkers()
        requestAnimationFrame(this.processFeatures)
    }

    cleanup = () => {
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
    }
}
