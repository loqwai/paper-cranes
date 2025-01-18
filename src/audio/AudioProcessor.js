import { StatTypes } from 'hypnosound'
import { WorkerRPC } from './WorkerRPC'

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
    constructor(audioContext, sourceNode, historySize=500,  fftSize = 32768/2) {
        this.audioContext = audioContext
        this.sourceNode = sourceNode
        this.fftSize = fftSize
        this.historySize = historySize
        this.fftAnalyzer = this.createAnalyzer()
        this.fftData = new Uint8Array(this.fftAnalyzer.frequencyBinCount)
        this.workers = new Map()
        this.rawFeatures = {}
        this.currentFeatures = getFlatAudioFeatures()
        this.currentFeatures.beat = false
        this.isRunning = false
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.25
        analyzer.minDecibels = -100
        analyzer.maxDecibels = -30
        analyzer.fftSize = this.fftSize
        return analyzer
    }

    initializeWorker = async (name) => {
        const worker = new WorkerRPC(name, this.historySize)
        await worker.initialize()
        this.workers.set(name, worker)
        this.runWorkerLoop(worker)
    }

    runWorkerLoop = async (worker) => {
        const result = await worker.processData(this.fftData)
        if (result) {
            this.rawFeatures[result.workerName] = result
        }
        requestAnimationFrame(() => this.runWorkerLoop(worker));
    }

    updateCurrentFeatures = () => {
        if (!this.isRunning) return
        if (Object.keys(this.rawFeatures).length > 0) {
            this.currentFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
            this.currentFeatures.beat = this.isBeat()
        }
        requestAnimationFrame(this.updateCurrentFeatures)
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures?.SpectralFlux
        if (!spectralFlux?.stats?.zScore) return false
        return spectralFlux.stats.zScore > 0.9
    }

    start = async () => {
        if (!this.sourceNode || !this.fftAnalyzer) return
        this.sourceNode.connect(this.fftAnalyzer)
        await this.audioContext.audioWorklet.addModule('/src/window-processor.js')
        const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')
        this.sourceNode.connect(windowNode)

        // Initialize all workers before starting the update loops
        await Promise.all(AudioFeatures.map(this.initializeWorker))

        // Start update loops only after workers are ready
        this.isRunning = true
        this.updateCurrentFeatures()
        this.updateFftData()
    }

    updateFftData = () => {
        if (!this.isRunning) return
        this.fftAnalyzer.getByteFrequencyData(this.fftData)
        requestAnimationFrame(this.updateFftData)
    }

    getFeatures = () => this.currentFeatures

    cleanup = () => {
        this.isRunning = false
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
        this.rawFeatures = {}
        this.currentFeatures = getFlatAudioFeatures()
        this.currentFeatures.beat = false
    }
}
