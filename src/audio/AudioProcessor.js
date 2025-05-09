import { StatTypes, AudioFeatures } from 'hypnosound'
import { WorkerRPC } from './WorkerRPC.js'

let noResultCount = 0
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
        analyzer.smoothingTimeConstant = 0.8
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
        worker.setHistorySize(this.historySize)
        const result = await worker.processData(this.fftData)
        if(!result) {
            noResultCount++
            console.error(`worker returned no result`)
            if(noResultCount > 150) {
                noResultCount = -Infinity
                window.location.reload()
                return
            }
            requestAnimationFrame(() => this.runWorkerLoop(worker))
            return
        }
        this.rawFeatures[result.workerName] = result
        requestAnimationFrame(() => this.runWorkerLoop(worker))
    }

    updateCurrentFeatures = () => {
        requestAnimationFrame(this.updateCurrentFeatures)
        this.currentFeatures = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
        this.historySize = window.cranes?.manualFeatures?.history_size ?? this.historySize
        this.currentFeatures.beat = this.isBeat()
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        return spectralFlux?.stats.zScore > 0.9 || false
    }

    start = async () => {
        await this.audioContext.audioWorklet.addModule('src/window-processor.js')
        const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')

        this.sourceNode.connect(windowNode)
        windowNode.connect(this.fftAnalyzer)
        AudioFeatures.map(this.initializeWorker)
        // await new Promise(resolve => setTimeout(resolve, 100))

        this.updateCurrentFeatures()
        this.updateFftData()
        if(navigator.userAgent.toLowerCase().includes('firefox')) this.enableMicDisconnectionMitigations()

    }

    enableMicDisconnectionMitigations = () => {
        setInterval(async () => {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            this.sourceNode = this.audioContext.createMediaStreamSource(newStream)
            this.sourceNode.connect(this.fftAnalyzer)

        }, 5000)
    }

    updateFftData = () => {
        requestAnimationFrame(this.updateFftData)
        this.fftAnalyzer.getByteFrequencyData(this.fftData)
    }

    getFeatures = () => this.currentFeatures

    cleanup = () => {
        this.workers.forEach(worker => worker.terminate())
        this.workers.clear()
    }
}
