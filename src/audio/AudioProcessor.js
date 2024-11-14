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
    constructor(audioContext, sourceNode, historySize, fftSize = 4096) {
        this.audioContext = audioContext
        this.sourceNode = sourceNode
        this.historySize = historySize
        this.fftSize = fftSize
        this.fftAnalyzer = this.createAnalyzer()
        this.fftData = new Uint8Array(this.fftAnalyzer.frequencyBinCount)
        this.workers = new Map()
        this.rawFeatures = {}
        this.currentFeatures = getFlatAudioFeatures()
        this.currentFeatures.beat = false
    }

    createAnalyzer = () => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.9
        analyzer.minDecibels = -100
        analyzer.maxDecibels = -30
        analyzer.fftSize = this.fftSize
        return analyzer
    }

    initializeWorker = async (name) => {
        const worker = new WorkerRPC(name, this.historySize)
        await worker.initialize()
        this.workers.set(name, worker)
    }

    processFeatures = async () => {
        requestAnimationFrame(this.processFeatures)
        //if there are any resolved promises, skip
        this.fftAnalyzer.getByteFrequencyData(this.fftData)
        Array.from(this.workers.values()).map((worker) => {
            worker.processData(this.fftData).then((result) => {
                if (result) this.rawFeatures[result.workerName] = result
            })
        })

        this.currentFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
        this.currentFeatures.beat = this.isBeat()
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        return spectralFlux?.stats.zScore > 0.9 || false
    }

    start = async () => {
        this.sourceNode.connect(this.fftAnalyzer)
        await this.audioContext.audioWorklet.addModule('src/window-processor.js')
        const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')
        this.sourceNode.connect(windowNode)
        await Promise.all(AudioFeatures.map(this.initializeWorker))
        requestAnimationFrame(this.processFeatures)
    }

    getFeatures = () => this.currentFeatures

    cleanup = () => {
        this.workers.forEach((worker) => worker.terminate())
        this.workers.clear()
    }
}
