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
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.25
        analyzer.minDecibels = -100
        analyzer.maxDecibels = -30
        return analyzer
    }

    initializeWorker = async (name) => {
        const worker = new WorkerRPC(name, this.historySize)
        await worker.initialize()
        this.workers.set(name, worker)
        this.runWorkerLoop(worker)
    }

    runWorkerLoop = async (worker) => {
        if(this.audioContext.state !== 'running') {
            console.log('audio context is not running, resuming')
            await this.audioContext.resume()
        }
        const result = await worker.processData(this.fftData)
        if (result) {
            this.rawFeatures[result.workerName] = result
        }
        requestAnimationFrame(() => this.runWorkerLoop(worker));
    }

    updateCurrentFeatures = () => {
        requestAnimationFrame(this.updateCurrentFeatures)
        this.currentFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
        this.currentFeatures.beat = this.isBeat()
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        return spectralFlux?.stats.zScore > 0.9 || false
    }

    start = async () => {
        // Ensure audio context is running
        if (this.audioContext.state !== 'running') {
            await this.audioContext.resume()
        }

        // Connect nodes in sequence
        this.sourceNode.disconnect()
        this.fftAnalyzer.disconnect()

        // Connect source -> analyzer
        this.sourceNode.connect(this.fftAnalyzer)

        // Load and connect window processor
        await this.audioContext.audioWorklet.addModule('src/window-processor.js')
        const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')
        this.sourceNode.connect(windowNode)

        // Initialize workers
        await Promise.all(AudioFeatures.map(this.initializeWorker))

        // Wait for audio pipeline to stabilize
        await new Promise(resolve => setTimeout(resolve, 500))

        // Start update loops
        this.updateCurrentFeatures()
        this.updateFftData()
    }

    updateFftData = () => {
        if (this.audioContext.state === 'running') {
            this.fftAnalyzer.getByteFrequencyData(this.fftData)
        }
        requestAnimationFrame(this.updateFftData)
    }

    getFeatures = () => this.currentFeatures

    cleanup = () => {
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
    }
}
