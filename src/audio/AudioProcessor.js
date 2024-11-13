import { StatTypes } from 'hypnosound'
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
        const fftAnalyzer = audioContext.createAnalyser()
        fftAnalyzer.smoothingTimeConstant = 0.95
        fftAnalyzer.fftSize = fftSize
        const fftData = new Uint8Array(fftAnalyzer.frequencyBinCount)
        const rawFeatures = {}
        const workers = {}

        const start = async () => {
            await audioContext.audioWorklet.addModule('src/window-processor.js') // Path to your processor file
            const windowNode = new AudioWorkletNode(audioContext, 'window-processor')
            sourceNode.connect(windowNode)
            windowNode.connect(fftAnalyzer)

            for (const workerName of AudioFeatures) {
                const workerUrl = new URL(`src/audio/analyzers/${workerName}.js`, import.meta.url).href
                fetch(workerUrl)
                    .then(async (response) => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`)
                        }
                        return response.text()
                    })
                    .then((code) => {
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
                    .catch((error) => {
                        console.error(`Failed to initialize ${workerName} worker:`, error)
                    })
            }
            requestAnimationFrame(requestFeatures)
        }

        const requestFeatures = () => {
            requestAnimationFrame(requestFeatures)

            fftAnalyzer.getByteFrequencyData(fftData)

            // const windowedFftData = applyKaiserWindow(fftData)
            for (const worker in workers) {
                workers[worker].postMessage({ type: 'fftData', data: { fft: fftData } })
            }
        }

        const getFeatures = () => {
            if (Object.keys(workers).length !== AudioFeatures.length) {
                return {} // Return empty object if workers aren't ready
            }
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
