import { makeCalculateStats, spectralFlux } from 'hypnosound'

let calculateStats = makeCalculateStats()
let previousSignal = new Float32Array() // Initialize with zeros

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        const { fft } = e.data

        if (!previousSignal.length) {
            previousSignal = new Float32Array(fft.length)
            return
        }

        const value = spectralFlux(fft, previousSignal)
        self.postMessage({ type: 'computedValue', value, stats: calculateStats(value) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})
