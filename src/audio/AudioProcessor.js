import { StatTypes } from '../utils/calculateStats.js'
import { applyHanningWindow } from './applyHanningWindow.js'
import { applyKaiserWindow } from './applyKaiserWindow.js'

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
]

const DEFAULT_FEATURE_VALUE = 0.00001

export const getFlatAudioFeatures = (audioFeatures = AudioFeatures, rawFeatures = {}) => {
    const features = {}
    for (const feature of audioFeatures) {
        const featureKey = feature.charAt(0).toLowerCase() + feature.slice(1)

        for (const propertyKey of StatTypes) {
            const key = `${featureKey}${propertyKey.charAt(0).toUpperCase() + propertyKey.slice(1)}`
            features[key] = rawFeatures[feature]?.stats[propertyKey]
            if (features[key] === 0) features[key] = DEFAULT_FEATURE_VALUE
        }
        features[featureKey] = rawFeatures[feature]?.stats?.current
    }
    return features
}

export class AudioProcessor {
    constructor(audioContext, sourceNode, historySize, fftSize = 32768) {
        this.features = {}
        const fftAnalyzer = audioContext.createAnalyser()
        fftAnalyzer.fftSize = fftSize
        let fftData = new Uint8Array(fftAnalyzer.frequencyBinCount)
        sourceNode.connect(fftAnalyzer)

        const rawFeatures = {}
        const workers = {}

        console.log('Constructing AudioProcessor SharedArrayBuffer...')
        this.sharedArrayBuffer = new SharedArrayBuffer(fftAnalyzer.frequencyBinCount * Uint8Array.BYTES_PER_ELEMENT)
        console.log('AudioProcessor SharedArrayBuffer constructed')
        const sharedArrayBuffer = this.sharedArrayBuffer
        const start = async () => {
            for (const workerName of AudioFeatures) {
                const workerUrl = new URL(`src/audio/analyzers/${workerName}.js`, import.meta.url).href
                fetch(workerUrl).then(async (response) => {
                    const code = await response.text()
                    const worker = new Worker(workerUrl)

                    // Post sharedArrayBuffer to worker
                    worker.postMessage({ type: 'sharedArrayBuffer', buffer: sharedArrayBuffer })

                    worker.onmessage = (event) => {
                        if (event.data.type === 'computedValue') {
                            rawFeatures[workerName] = event.data
                        }
                    }
                    worker.onerror = (event) => {
                        console.error(`Error in worker ${workerName}:`, event)
                    }
                    worker.postMessage({ type: 'config', config: { historySize } })
                    workers[workerName] = worker
                })
            }
            requestAnimationFrame(requestFeatures)
        }

        const requestFeatures = () => {
            requestAnimationFrame(requestFeatures)

            fftAnalyzer.getByteFrequencyData(fftData) // Store data in fftData array

            // Update sharedArrayBuffer with fftData
            const sharedArray = new Uint8Array(sharedArrayBuffer)
            const offset = 0 // Set the starting position
            sharedArray.set(fftData, offset)

            for (const worker in workers) {
                workers[worker].postMessage({ type: 'compute' }) // Notify workers of new data
            }
        }

        const getFeatures = () => {
            const features = getFlatAudioFeatures(AudioFeatures, rawFeatures)
            features['beat'] = isBeat()
            return features
        }

        const isBeat = () => {
            const spectralFlux = rawFeatures.SpectralFlux
            if (!spectralFlux) return false
            const { stats } = rawFeatures.SpectralFlux
            const { zScore } = stats
            return zScore > 0.9
        }

        this.start = start
        this.getFeatures = getFeatures
    }
}
