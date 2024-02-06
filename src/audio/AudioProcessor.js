import { StatTypes } from '../utils/calculateStats.js'
import { applyHanningWindow } from './applyHanningWindow.js'
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
        // the key in features is the same as the key in rawFeatures, except the first letter is lowercased
        const featureKey = feature.charAt(0).toLowerCase() + feature.slice(1)

        for (const propertyKey of StatTypes) {
            // the key in features is the same as the key in rawFeatures, except the first letter is lowercased
            // NOTICE: In a desperate effort to avoid divisions by zero, I am adding a teeny tiny offset from zero here.
            // Fun fact: This is the same hack I made for the first time in my professional career, where I did this to avoid
            // division-by-zero on flight management systems when Airbus A320s would fly over the north pole.
            // It was a bad idea. I hope they deleted that code.
            // Anyway, here we go again! It doesn't seem to be helping things.
            const key = `${featureKey}${propertyKey.charAt(0).toUpperCase() + propertyKey.slice(1)}`
            features[key] = rawFeatures[feature]?.stats[propertyKey]
            if (features[key] === 0) features[key] = DEFAULT_FEATURE_VALUE
        }
        features[featureKey] = rawFeatures[feature]?.stats?.current
    }
    return features
}

export class AudioProcessor {
    constructor(audioContext, sourceNode, historySize, fftSize = 2048) {
        this.features = {}

        const fftAnalyzer = audioContext.createAnalyser()
        fftAnalyzer.fftSize = fftSize
        let fftData = new Uint8Array(fftAnalyzer.frequencyBinCount)
        sourceNode.connect(fftAnalyzer)

        const rawFeatures = {}
        const workers = {}

        const start = async () => {
            for (const workerName of AudioFeatures) {
                const workerUrl = new URL(`src/audio/analyzers/${workerName}.js`, import.meta.url).href
                fetch(workerUrl).then(async (response) => {
                    const code = await response.text()

                    const blob = new Blob([code], { type: 'application/javascript' })
                    const worker = new Worker(URL.createObjectURL(blob))
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
            fftAnalyzer.getByteFrequencyData(fftData)
            let windowedFftData = applyHanningWindow(fftData)
            // if the windowedFftData has a sum of 0, then don't send it to the workers
            if (windowedFftData.reduce((a, b) => a + b, 0) === 0) {
                requestAnimationFrame(requestFeatures)
                return
            }
            for (const worker in workers) {
                workers[worker].postMessage({ type: 'fftData', data: { fft: windowedFftData } })
            }

            requestAnimationFrame(requestFeatures)
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
