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
            for (const workerName of ['SpectralCentroid']) {
                const worker = new Worker(`/src/audio/analyzers/${workerName}.js?timestamp=${timestamp}`)
                worker.onmessage = (event) => {
                    if (event.data.type === 'computedValue') {
                        console.log(event.data)
                        rawFeatures[workerName] = event.data.value
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

            updateLegacyFeatures()
            requestAnimationFrame(pullFFTData)
        }

        const updateLegacyFeatures = () => {
            console.log(rawFeatures)
            this.features['spectralSpread'] = rawFeatures['SpectralSpread'] || 0
            this.features['spectralCentroid'] = (rawFeatures['SpectralCentroid'] || 0) / 4
            this.features['spectralFlux'] = rawFeatures['SpectralFlux'] || 0
            this.features['energy'] = rawFeatures['Energy'] || 0
        }

        this.start = start
    }
}
