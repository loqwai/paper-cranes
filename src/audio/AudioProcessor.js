import { applyHanningWindow } from './applyHanningWindow.js'

export class AudioProcessor {
    constructor(audioContext, sourceNode, fftSize = 2048) {
        this.features = {}

        const fftAnalyzer = audioContext.createAnalyser()
        fftAnalyzer.fftSize = fftSize
        let fftData = new Uint8Array(fftAnalyzer.frequencyBinCount)
        sourceNode.connect(fftAnalyzer)

        const rawFeatures = {}
        const workers = {}

        const start = async () => {
            const timestamp = Date.now()
            for (const processor of ['Energy']) {
                await audioContext.audioWorklet.addModule(`/src/audio/analyzers/${processor}.js?timestamp=${timestamp}`)
                const audioProcessor = new AudioWorkletNode(audioContext, `Audio-${processor}`)
                sourceNode.connect(audioProcessor)
                audioProcessor.port.onmessage = (event) => (rawFeatures[processor] = event.data)
            }
            for (const workerName of ['SpectralCentroid', 'SpectralFlux', 'SpectralSpread']) {
                const worker = new Worker(`/src/audio/analyzers/${workerName}.js?timestamp=${timestamp}`)
                worker.onmessage = (event) => {
                    if (event.data.type === 'computedValue') {
                        rawFeatures[workerName] = event.data
                    }
                }
                worker.postMessage({ config: { historySize: 500 } })
                workers[workerName] = worker
            }

            pullFFTData()
        }

        const pullFFTData = () => {
            fftAnalyzer.getByteFrequencyData(fftData)
            let windowedFftData = applyHanningWindow(fftData)

            for (const worker in workers) {
                workers[worker].postMessage({ type: 'fftData', data: { fft: windowedFftData } })
            }

            updateFeatures()
            requestAnimationFrame(pullFFTData)
        }

        const updateFeatures = () => {
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
            // console.log(this.features)
        }

        this.start = start
    }
}
