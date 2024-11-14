import { StatTypes } from 'hypnosound'
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
    constructor(audioContext, sourceNode, historySize, fftSize = 2048) {
        this.features = {}
        this.audioContext = audioContext
        this.sourceNode = sourceNode
        this.historySize = historySize
        this.fftAnalyzer = this.createAnalyzer(fftSize)
        this.fftData = new Uint8Array(this.fftAnalyzer.frequencyBinCount)
        this.rawFeatures = {}
        this.workers = {}
        this.featurePromises = new Map()
        this.PROMISE_TIMEOUT = 1000
    }

    createTimeoutPromise = (ms) => {
        return new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Feature computation timed out')), ms)
        )
    }

    createAnalyzer = (fftSize) => {
        const analyzer = this.audioContext.createAnalyser()
        analyzer.smoothingTimeConstant = 0.5
        analyzer.fftSize = fftSize
        return analyzer
    }

    setupAudioNodes = async () => {
        await this.audioContext.audioWorklet.addModule('src/window-processor.js')
        const windowNode = new AudioWorkletNode(this.audioContext, 'window-processor')
        this.sourceNode.connect(windowNode)
        windowNode.connect(this.fftAnalyzer)
    }

    initializeWorker = async (workerName) => {
        try {
            const workerUrl = new URL(`src/audio/analyzers/${workerName}.js`, import.meta.url).href
            const response = await fetch(workerUrl)
            if (!response.ok) {
                throw new Error(`Failed to fetch ${workerName} worker: ${response.statusText}`)
            }
            const code = await response.text()
            const blob = new Blob([code], { type: 'application/javascript' })
            const worker = new Worker(URL.createObjectURL(blob))

            this.setupWorkerHandlers(worker, workerName)
            worker.postMessage({ type: 'config', config: { historySize: this.historySize } })
            this.workers[workerName] = worker
        } catch (error) {
            console.error(`Failed to initialize ${workerName} worker:`, error)
        }
    }

    setupWorkerHandlers = (worker, workerName) => {
        worker.onmessage = (event) => {
            if (event.data.type === 'computedValue') {
                this.rawFeatures[workerName] = event.data
                const promiseData = this.featurePromises.get(workerName)
                if (promiseData) {
                    promiseData.resolve()
                    this.featurePromises.delete(workerName)
                }
            }
        }
        worker.onerror = (event) => {
            console.error(`Error in worker ${workerName}:`, event)
        }
    }

    start = async () => {
        await this.setupAudioNodes()
        await Promise.all(AudioFeatures.map(name => this.initializeWorker(name)))
        requestAnimationFrame(this.processFeatures)
    }

    processFeatures = () => {
        requestAnimationFrame(this.processFeatures)

        if (this.featurePromises.size > 0) {
            return
        }

        Object.keys(this.workers).forEach(workerName => {
            let resolve
            const promise = Promise.race([
                new Promise(r => { resolve = r }),
                this.createTimeoutPromise(this.PROMISE_TIMEOUT)
            ])
            this.featurePromises.set(workerName, { promise, resolve })
        })

        this.fftAnalyzer.getByteFrequencyData(this.fftData)
        Object.values(this.workers).forEach(worker => {
            worker.postMessage({ type: 'fftData', data: { fft: this.fftData } })
        })
    }

    isBeat = () => {
        const spectralFlux = this.rawFeatures.SpectralFlux
        if (!spectralFlux) return false
        const { stats } = spectralFlux
        return stats.zScore > 0.9
    }

    getFeatures = async () => {
        if (this.featurePromises.size > 0) {
            try {
                await Promise.all([...this.featurePromises.values()].map(p => p.promise))
            } catch (error) {
                console.warn('Some audio features timed out:', error)
                this.featurePromises.clear()
            }
        }

        const features = getFlatAudioFeatures(AudioFeatures, this.rawFeatures)
        features['beat'] = this.isBeat()
        return features
    }
}
