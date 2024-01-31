import { applyHanningWindow } from './applyHanningWindow.js'
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
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
            const timestamp = Date.now()
            for (const workerName of [
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
                // 'SpectralFlatness',
            ]) {
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
            // for each feature in raw features
            for (const feature in rawFeatures) {
                // the key in features is the same as the key in rawFeatures, except the first letter is lowercased
                const featureKey = feature.charAt(0).toLowerCase() + feature.slice(1)
                this.features[featureKey] = rawFeatures[feature].value
                for (const propertyKey in rawFeatures[feature].stats) {
                    // the key in features is the same as the key in rawFeatures, except the first letter is lowercased
                    this.features[`${featureKey}${propertyKey.charAt(0).toUpperCase() + propertyKey.slice(1)}`] = rawFeatures[feature].stats[propertyKey]
                }
            }
            this.features['beat'] = isBeat()
            return this.features
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
